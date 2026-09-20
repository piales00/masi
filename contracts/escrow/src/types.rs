use soroban_sdk::{contracterror, contracttype, Address, BytesN, String};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum JobState {
    Requested,
    Accepted,
    Funded,
    Started,
    Submitted,
    Released,
    Disputed,
    Resolved,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Job {
    pub id: u64,
    pub client: Address,
    pub provider: Address,
    pub amount: i128,
    pub materials_bps: u32,
    pub fee_bps: u32,
    pub review_secs: u64,
    pub description: String,
    pub state: JobState,
    pub materials_amount: i128,
    pub fee_amount: i128,
    /// Principal currently held, excluding the platform fee and delivered materials.
    pub remaining_amount: i128,
    pub created_at: u64,
    pub submitted_at: Option<u64>,
    pub released_at: Option<u64>,
    pub rated: bool,
    /// 1..=5 once rated, 0 before. Kept on the job so the history survives:
    /// events expire from RPC, persistent storage does not.
    pub stars: u32,
    /// Hash of the off-chain comment, so it cannot be edited after the fact.
    pub comment_hash: Option<BytesN<32>>,
}

/// Exact rating_of ABI; all fields are u32 and therefore safe JS numbers.
#[contracttype]
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct RatingSummary {
    pub stars_sum: u32,
    pub rating_count: u32,
    pub completed_jobs: u32,
    pub disputes: u32,
}

#[contracttype]
#[derive(Clone)]
pub(crate) struct Config {
    pub arbiter: Address,
    pub platform: Address,
    pub token: Address,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    JobNotFound = 3,
    InvalidState = 4,
    Unauthorized = 5,
    InvalidAmount = 6,
    InvalidBps = 7,
    InvalidReviewPeriod = 8,
    InvalidDescription = 9,
    InvalidParties = 10,
    ArithmeticOverflow = 11,
    ReviewPeriodActive = 12,
    NotImplemented = 13,
    InvalidConfiguration = 14,
    AlreadyRated = 15,
    InvalidStars = 16,
}
