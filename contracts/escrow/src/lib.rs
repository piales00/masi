#![no_std]

mod events;
mod storage;
mod types;

pub use types::{ContractError, Job, JobState, RatingSummary};

use soroban_sdk::{contract, contractimpl, token::TokenClient, Address, BytesN, Env, String, Vec};
use storage::DataKey;
use types::Config;

const BPS_DENOMINATOR: i128 = 10_000;
const MAX_DESCRIPTION_BYTES: u32 = 1_024;

/// The materials advance is irreversible once `start` delivers it: it cannot be
/// disputed or refunded. Capping it at half the price keeps the scope's promise
/// that the client's worst case stays bounded by this percentage, and keeps a
/// balance in escrow that is worth approving.
const MAX_MATERIALS_BPS: u32 = 5_000;
/// The client pays the fee on top of the price, so an uncapped value could
/// silently double the charge.
const MAX_FEE_BPS: u32 = 1_000;

#[contract]
pub struct Escrow;

#[contractimpl]
impl Escrow {
    /// Binds the authorized deployment administrator atomically at creation.
    pub fn __constructor(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        storage::bump_instance(&env);
    }

    /// Retains the scope's init ABI, with authority fixed by the constructor.
    pub fn init(
        env: Env,
        arbiter: Address,
        platform: Address,
        token: Address,
    ) -> Result<(), ContractError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(ContractError::NotInitialized)?;
        admin.require_auth();
        if env.storage().instance().has(&DataKey::Config) {
            return Err(ContractError::AlreadyInitialized);
        }
        let contract = env.current_contract_address();
        if platform == contract || arbiter == contract || token == contract {
            return Err(ContractError::InvalidConfiguration);
        }
        env.storage().instance().set(
            &DataKey::Config,
            &Config {
                arbiter,
                platform,
                token,
            },
        );
        env.storage().instance().set(&DataKey::NextJobId, &1u64);
        storage::bump_instance(&env);
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_job(
        env: Env,
        client: Address,
        provider: Address,
        amount: i128,
        materials_bps: u32,
        fee_bps: u32,
        review_secs: u64,
        description: String,
    ) -> Result<u64, ContractError> {
        client.require_auth();
        storage::config(&env)?;
        let contract = env.current_contract_address();
        if client == provider || client == contract || provider == contract {
            return Err(ContractError::InvalidParties);
        }
        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }
        if materials_bps > MAX_MATERIALS_BPS || fee_bps > MAX_FEE_BPS {
            return Err(ContractError::InvalidBps);
        }
        if review_secs == 0 {
            return Err(ContractError::InvalidReviewPeriod);
        }
        if description.is_empty() || description.len() > MAX_DESCRIPTION_BYTES {
            return Err(ContractError::InvalidDescription);
        }
        let materials_amount = portion(amount, materials_bps)?;
        let fee_amount = portion(amount, fee_bps)?;
        amount
            .checked_add(fee_amount)
            .ok_or(ContractError::ArithmeticOverflow)?;
        env.ledger()
            .timestamp()
            .checked_add(review_secs)
            .ok_or(ContractError::ArithmeticOverflow)?;

        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextJobId)
            .ok_or(ContractError::NotInitialized)?;
        let next = id.checked_add(1).ok_or(ContractError::ArithmeticOverflow)?;
        let job = Job {
            id,
            client: client.clone(),
            provider: provider.clone(),
            amount,
            materials_bps,
            fee_bps,
            review_secs,
            description,
            state: JobState::Requested,
            materials_amount,
            fee_amount,
            remaining_amount: 0,
            created_at: env.ledger().timestamp(),
            submitted_at: None,
            released_at: None,
            rated: false,
            stars: 0,
            comment_hash: None,
        };
        env.storage().instance().set(&DataKey::NextJobId, &next);
        storage::append_job(&env, &job);
        events::Requested {
            job_id: id,
            client,
            provider,
            amount,
            materials_bps,
            fee_bps,
            review_secs,
        }
        .publish(&env);
        Ok(id)
    }

    pub fn accept(env: Env, job_id: u64) -> Result<(), ContractError> {
        let mut job = storage::job(&env, job_id)?;
        job.provider.require_auth();
        require_state(&job, JobState::Requested)?;
        job.state = JobState::Accepted;
        storage::save_job(&env, &job);
        events::Accepted {
            job_id,
            provider: job.provider,
        }
        .publish(&env);
        Ok(())
    }

    pub fn fund(env: Env, job_id: u64) -> Result<(), ContractError> {
        let mut job = storage::job(&env, job_id)?;
        job.client.require_auth();
        require_state(&job, JobState::Accepted)?;
        let config = storage::config(&env)?;
        let total = job
            .amount
            .checked_add(job.fee_amount)
            .ok_or(ContractError::ArithmeticOverflow)?;
        job.state = JobState::Funded;
        job.remaining_amount = job.amount;
        storage::save_job(&env, &job);
        TokenClient::new(&env, &config.token).transfer(
            &job.client,
            &env.current_contract_address(),
            &total,
        );
        events::Funded {
            job_id,
            client: job.client,
            amount: job.amount,
            fee_amount: job.fee_amount,
        }
        .publish(&env);
        Ok(())
    }

    pub fn start(env: Env, job_id: u64) -> Result<(), ContractError> {
        let mut job = storage::job(&env, job_id)?;
        job.provider.require_auth();
        require_state(&job, JobState::Funded)?;
        job.remaining_amount = job
            .remaining_amount
            .checked_sub(job.materials_amount)
            .ok_or(ContractError::ArithmeticOverflow)?;
        job.state = JobState::Started;
        storage::save_job(&env, &job);
        pay(&env, &job.provider, job.materials_amount)?;
        events::Started {
            job_id,
            provider: job.provider,
            materials_amount: job.materials_amount,
            remaining_amount: job.remaining_amount,
        }
        .publish(&env);
        Ok(())
    }

    pub fn submit(env: Env, job_id: u64) -> Result<(), ContractError> {
        let mut job = storage::job(&env, job_id)?;
        job.provider.require_auth();
        require_state(&job, JobState::Started)?;
        let submitted_at = env.ledger().timestamp();
        let release_at = submitted_at
            .checked_add(job.review_secs)
            .ok_or(ContractError::ArithmeticOverflow)?;
        job.submitted_at = Some(submitted_at);
        job.state = JobState::Submitted;
        storage::save_job(&env, &job);
        events::Submitted {
            job_id,
            provider: job.provider,
            submitted_at,
            release_at,
        }
        .publish(&env);
        Ok(())
    }

    pub fn approve(env: Env, job_id: u64) -> Result<(), ContractError> {
        let job = storage::job(&env, job_id)?;
        job.client.require_auth();
        require_state(&job, JobState::Submitted)?;
        release(&env, job, false)
    }

    /// Anyone may trigger this, but every writer must explicitly authorize.
    pub fn auto_release(env: Env, job_id: u64, caller: Address) -> Result<(), ContractError> {
        caller.require_auth();
        let job = storage::job(&env, job_id)?;
        require_state(&job, JobState::Submitted)?;
        let deadline = job
            .submitted_at
            .ok_or(ContractError::InvalidState)?
            .checked_add(job.review_secs)
            .ok_or(ContractError::ArithmeticOverflow)?;
        if env.ledger().timestamp() < deadline {
            return Err(ContractError::ReviewPeriodActive);
        }
        release(&env, job, true)
    }

    pub fn cancel(env: Env, job_id: u64, caller: Address) -> Result<(), ContractError> {
        let mut job = storage::job(&env, job_id)?;
        require_party(&job, &caller)?;
        let refund = match job.state {
            JobState::Requested | JobState::Accepted => 0,
            JobState::Funded => job
                .remaining_amount
                .checked_add(job.fee_amount)
                .ok_or(ContractError::ArithmeticOverflow)?,
            _ => return Err(ContractError::InvalidState),
        };
        job.state = JobState::Cancelled;
        job.remaining_amount = 0;
        storage::save_job(&env, &job);
        pay(&env, &job.client, refund)?;
        events::Cancelled {
            job_id,
            caller,
            refund_amount: refund,
        }
        .publish(&env);
        Ok(())
    }

    /// Freezes the balance while the arbiter decides. Only the parties, and only
    /// once the work started: the materials advance is already the provider's.
    /// `Disputed` blocks `approve` and `auto_release`, which both require `Submitted`.
    pub fn dispute(env: Env, job_id: u64, caller: Address) -> Result<(), ContractError> {
        let mut job = storage::job(&env, job_id)?;
        require_party(&job, &caller)?;
        if job.state != JobState::Started && job.state != JobState::Submitted {
            return Err(ContractError::InvalidState);
        }
        job.state = JobState::Disputed;
        storage::save_job(&env, &job);
        events::Disputed {
            job_id,
            caller,
            remaining_amount: job.remaining_amount,
        }
        .publish(&env);
        Ok(())
    }

    /// Splits ONLY the frozen balance; the materials advance is never touched and
    /// the fee still goes to the platform. Rounding dust goes to the client.
    /// Counts as a completed job, so rating it later keeps rating_count <= completed_jobs.
    pub fn resolve(env: Env, job_id: u64, provider_bps: u32) -> Result<(), ContractError> {
        let config = storage::config(&env)?;
        config.arbiter.require_auth();
        let mut job = storage::job(&env, job_id)?;
        require_state(&job, JobState::Disputed)?;
        if provider_bps > 10_000 {
            return Err(ContractError::InvalidBps);
        }
        let remaining_amount = job.remaining_amount;
        let provider_amount = portion(remaining_amount, provider_bps)?;
        let client_amount = remaining_amount
            .checked_sub(provider_amount)
            .ok_or(ContractError::ArithmeticOverflow)?;

        job.remaining_amount = 0;
        job.state = JobState::Resolved;
        job.released_at = Some(env.ledger().timestamp());
        let mut rating = storage::rating_of(&env, &job.provider);
        rating.completed_jobs = rating
            .completed_jobs
            .checked_add(1)
            .ok_or(ContractError::ArithmeticOverflow)?;
        rating.disputes = rating
            .disputes
            .checked_add(1)
            .ok_or(ContractError::ArithmeticOverflow)?;
        storage::save_rating(&env, &job.provider, &rating);
        storage::save_job(&env, &job);

        pay(&env, &job.provider, provider_amount)?;
        pay(&env, &job.client, client_amount)?;
        pay(&env, &config.platform, job.fee_amount)?;
        events::Resolved {
            job_id,
            provider: job.provider,
            provider_amount,
            client_amount,
            fee_amount: job.fee_amount,
        }
        .publish(&env);
        Ok(())
    }

    /// Only the client who paid for the job, once, and only after the money moved.
    pub fn rate(
        env: Env,
        job_id: u64,
        stars: u32,
        comment_hash: BytesN<32>,
    ) -> Result<(), ContractError> {
        let mut job = storage::job(&env, job_id)?;
        job.client.require_auth();
        if job.state != JobState::Released && job.state != JobState::Resolved {
            return Err(ContractError::InvalidState);
        }
        if job.rated {
            return Err(ContractError::AlreadyRated);
        }
        if !(1..=5).contains(&stars) {
            return Err(ContractError::InvalidStars);
        }

        let mut rating = storage::rating_of(&env, &job.provider);
        rating.stars_sum = rating
            .stars_sum
            .checked_add(stars)
            .ok_or(ContractError::ArithmeticOverflow)?;
        rating.rating_count = rating
            .rating_count
            .checked_add(1)
            .ok_or(ContractError::ArithmeticOverflow)?;

        job.rated = true;
        job.stars = stars;
        job.comment_hash = Some(comment_hash.clone());

        storage::save_rating(&env, &job.provider, &rating);
        storage::save_job(&env, &job);
        events::Rated {
            job_id,
            provider: job.provider,
            client: job.client,
            stars,
            comment_hash,
            stars_sum: rating.stars_sum,
            rating_count: rating.rating_count,
        }
        .publish(&env);
        Ok(())
    }

    pub fn get_job(env: Env, job_id: u64) -> Result<Job, ContractError> {
        storage::job(&env, job_id)
    }

    pub fn jobs_of(env: Env, provider: Address) -> Vec<u64> {
        storage::jobs_of(&env, &provider)
    }

    pub fn rating_of(env: Env, provider: Address) -> RatingSummary {
        storage::rating_of(&env, &provider)
    }
}

fn require_state(job: &Job, expected: JobState) -> Result<(), ContractError> {
    if job.state != expected {
        return Err(ContractError::InvalidState);
    }
    Ok(())
}

fn require_party(job: &Job, caller: &Address) -> Result<(), ContractError> {
    caller.require_auth();
    if *caller != job.client && *caller != job.provider {
        return Err(ContractError::Unauthorized);
    }
    Ok(())
}

/// floor(amount * bps / 10_000), avoiding intermediate overflow for large i128 amounts.
fn portion(amount: i128, bps: u32) -> Result<i128, ContractError> {
    let bps = i128::from(bps);
    let whole = (amount / BPS_DENOMINATOR)
        .checked_mul(bps)
        .ok_or(ContractError::ArithmeticOverflow)?;
    let fractional = (amount % BPS_DENOMINATOR)
        .checked_mul(bps)
        .ok_or(ContractError::ArithmeticOverflow)?
        / BPS_DENOMINATOR;
    whole
        .checked_add(fractional)
        .ok_or(ContractError::ArithmeticOverflow)
}

fn pay(env: &Env, recipient: &Address, amount: i128) -> Result<(), ContractError> {
    if amount < 0 {
        return Err(ContractError::InvalidAmount);
    }
    if amount > 0 {
        let config = storage::config(env)?;
        TokenClient::new(env, &config.token).transfer(
            &env.current_contract_address(),
            recipient,
            &amount,
        );
    }
    Ok(())
}

fn release(env: &Env, mut job: Job, automatic: bool) -> Result<(), ContractError> {
    let config = storage::config(env)?;
    let remaining_amount = job.remaining_amount;
    job.remaining_amount = 0;
    job.state = JobState::Released;
    job.released_at = Some(env.ledger().timestamp());
    let mut rating = storage::rating_of(env, &job.provider);
    rating.completed_jobs = rating
        .completed_jobs
        .checked_add(1)
        .ok_or(ContractError::ArithmeticOverflow)?;
    storage::save_rating(env, &job.provider, &rating);
    storage::save_job(env, &job);
    pay(env, &job.provider, remaining_amount)?;
    pay(env, &config.platform, job.fee_amount)?;
    events::Released {
        job_id: job.id,
        provider: job.provider,
        remaining_amount,
        fee_amount: job.fee_amount,
        automatic,
    }
    .publish(env);
    Ok(())
}

#[cfg(test)]
mod test;
