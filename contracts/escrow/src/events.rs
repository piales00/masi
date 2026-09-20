use soroban_sdk::{contractevent, Address};

#[contractevent]
pub struct Requested {
    #[topic]
    pub job_id: u64,
    #[topic]
    pub client: Address,
    #[topic]
    pub provider: Address,
    pub amount: i128,
    pub materials_bps: u32,
    pub fee_bps: u32,
    pub review_secs: u64,
}

#[contractevent]
pub struct Accepted {
    #[topic]
    pub job_id: u64,
    pub provider: Address,
}

#[contractevent]
pub struct Funded {
    #[topic]
    pub job_id: u64,
    pub client: Address,
    pub amount: i128,
    pub fee_amount: i128,
}

#[contractevent]
pub struct Started {
    #[topic]
    pub job_id: u64,
    pub provider: Address,
    pub materials_amount: i128,
    pub remaining_amount: i128,
}

#[contractevent]
pub struct Submitted {
    #[topic]
    pub job_id: u64,
    pub provider: Address,
    pub submitted_at: u64,
    pub release_at: u64,
}

#[contractevent]
pub struct Released {
    #[topic]
    pub job_id: u64,
    pub provider: Address,
    pub remaining_amount: i128,
    pub fee_amount: i128,
    pub automatic: bool,
}

#[contractevent]
pub struct Cancelled {
    #[topic]
    pub job_id: u64,
    pub caller: Address,
    pub refund_amount: i128,
}
