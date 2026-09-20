use soroban_sdk::{contracttype, Address, Env, Vec};

use crate::{types::Config, ContractError, Job, RatingSummary};

pub(crate) const DAY_IN_LEDGERS: u32 = 17_280;
pub(crate) const TTL_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
pub(crate) const TTL_EXTEND_TO: u32 = 120 * DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Admin,
    Config,
    NextJobId,
    Job(u64),
    JobsOf(Address),
    Rating(Address),
}

pub(crate) fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

fn bump_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

pub(crate) fn config(env: &Env) -> Result<Config, ContractError> {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .ok_or(ContractError::NotInitialized)
}

pub(crate) fn job(env: &Env, id: u64) -> Result<Job, ContractError> {
    env.storage()
        .persistent()
        .get(&DataKey::Job(id))
        .ok_or(ContractError::JobNotFound)
}

pub(crate) fn jobs_of(env: &Env, provider: &Address) -> Vec<u64> {
    env.storage()
        .persistent()
        .get(&DataKey::JobsOf(provider.clone()))
        .unwrap_or_else(|| Vec::new(env))
}

pub(crate) fn rating_of(env: &Env, provider: &Address) -> RatingSummary {
    env.storage()
        .persistent()
        .get(&DataKey::Rating(provider.clone()))
        .unwrap_or_default()
}

pub(crate) fn save_rating(env: &Env, provider: &Address, rating: &RatingSummary) {
    let key = DataKey::Rating(provider.clone());
    env.storage().persistent().set(&key, rating);
    bump_persistent(env, &key);
}

pub(crate) fn append_job(env: &Env, job: &Job) {
    let key = DataKey::JobsOf(job.provider.clone());
    let mut ids = jobs_of(env, &job.provider);
    ids.push_back(job.id);
    env.storage().persistent().set(&key, &ids);
    bump_persistent(env, &key);
    let summary = rating_of(env, &job.provider);
    save_rating(env, &job.provider, &summary);
    save_job(env, job);
}

/// Keep the job, provider index, summary and global config alive on every mutation.
pub(crate) fn save_job(env: &Env, job: &Job) {
    let key = DataKey::Job(job.id);
    env.storage().persistent().set(&key, job);
    bump_persistent(env, &key);
    bump_persistent(env, &DataKey::JobsOf(job.provider.clone()));
    bump_persistent(env, &DataKey::Rating(job.provider.clone()));
    bump_instance(env);
}
