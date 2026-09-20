extern crate std;

use soroban_sdk::{
    testutils::{
        storage::{Instance as _, Persistent as _},
        Address as _, AuthorizedFunction, AuthorizedInvocation, Events as _, Ledger as _, MockAuth,
        MockAuthInvoke,
    },
    token::{StellarAssetClient, TokenClient},
    Address, BytesN, Env, IntoVal, String, Symbol,
};

use super::*;

const AMOUNT: i128 = 12_000_000_000; // S/1,200 at the PEN-test token's 7 decimals.
const MATERIALS: i128 = 3_600_000_000;
const FEE: i128 = 600_000_000;
const REVIEW: u64 = 86_400;

struct Fixture {
    env: Env,
    contract: Address,
    admin: Address,
    client: Address,
    provider: Address,
    arbiter: Address,
    platform: Address,
    token: Address,
}

impl Fixture {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(1_000);
        let admin = Address::generate(&env);
        let client = Address::generate(&env);
        let provider = Address::generate(&env);
        let arbiter = Address::generate(&env);
        let platform = Address::generate(&env);
        let issuer = Address::generate(&env);
        let token = env.register_stellar_asset_contract_v2(issuer).address();
        let contract = env.register(Escrow, (admin.clone(),));
        EscrowClient::new(&env, &contract).init(&arbiter, &platform, &token);
        StellarAssetClient::new(&env, &token).mint(&client, &(AMOUNT + FEE));
        Self {
            env,
            contract,
            admin,
            client,
            provider,
            arbiter,
            platform,
            token,
        }
    }

    fn escrow(&self) -> EscrowClient<'_> {
        EscrowClient::new(&self.env, &self.contract)
    }

    fn token(&self) -> TokenClient<'_> {
        TokenClient::new(&self.env, &self.token)
    }

    fn create(&self) -> u64 {
        self.escrow().create_job(
            &self.client,
            &self.provider,
            &AMOUNT,
            &3_000,
            &500,
            &REVIEW,
            &String::from_str(&self.env, "Pintar departamento en Surco"),
        )
    }

    fn funded(&self) -> u64 {
        let id = self.create();
        self.escrow().accept(&id);
        self.escrow().fund(&id);
        id
    }

    fn submitted(&self) -> u64 {
        let id = self.funded();
        self.escrow().start(&id);
        self.escrow().submit(&id);
        id
    }

    fn assert_auth(&self, signer: &Address, function: &str, args: soroban_sdk::Vec<soroban_sdk::Val>) {
        assert_eq!(
            self.env.auths(),
            std::vec![(
                signer.clone(),
                AuthorizedInvocation {
                    function: AuthorizedFunction::Contract((
                        self.contract.clone(),
                        Symbol::new(&self.env, function),
                        args,
                    )),
                    sub_invocations: std::vec![],
                },
            )],
        );
    }
}

#[test]
fn demo_pays_materials_then_balance_and_fee_once() {
    let f = Fixture::new();
    let id = f.create();
    assert_eq!(id, 1);
    assert_eq!(f.escrow().get_job(&id).state, JobState::Requested);
    assert_eq!(f.escrow().jobs_of(&f.provider), soroban_sdk::vec![&f.env, id]);
    f.escrow().accept(&id);
    f.assert_auth(&f.provider, "accept", (id,).into_val(&f.env));
    f.escrow().fund(&id);
    assert_eq!(f.token().balance(&f.contract), AMOUNT + FEE);
    assert_eq!(f.token().balance(&f.client), 0);
    f.escrow().start(&id);
    f.assert_auth(&f.provider, "start", (id,).into_val(&f.env));
    assert_eq!(f.token().balance(&f.provider), MATERIALS);
    assert_eq!(f.token().balance(&f.platform), 0);
    assert_eq!(f.token().balance(&f.contract), AMOUNT - MATERIALS + FEE);
    assert_eq!(f.escrow().get_job(&id).remaining_amount, AMOUNT - MATERIALS);
    f.escrow().submit(&id);
    f.assert_auth(&f.provider, "submit", (id,).into_val(&f.env));
    f.escrow().approve(&id);
    f.assert_auth(&f.client, "approve", (id,).into_val(&f.env));
    assert_eq!(f.token().balance(&f.provider), AMOUNT);
    assert_eq!(f.token().balance(&f.platform), FEE);
    assert_eq!(f.token().balance(&f.contract), 0);
    let job = f.escrow().get_job(&id);
    assert_eq!(job.state, JobState::Released);
    assert_eq!(job.remaining_amount, 0);
    assert_eq!(job.released_at, Some(1_000));
    assert_eq!(f.escrow().rating_of(&f.provider), RatingSummary {
        completed_jobs: 1,
        ..RatingSummary::default()
    });
    assert_eq!(f.escrow().try_approve(&id), Err(Ok(ContractError::InvalidState)));
    assert_eq!(f.token().balance(&f.provider), AMOUNT);
}

#[test]
fn fund_requires_client_and_exact_nested_token_transfer() {
    let f = Fixture::new();
    let id = f.create();
    f.escrow().accept(&id);
    f.env.mock_auths(&[MockAuth {
        address: &f.client,
        invoke: &MockAuthInvoke {
            contract: &f.contract,
            fn_name: "fund",
            args: (id,).into_val(&f.env),
            sub_invokes: &[MockAuthInvoke {
                contract: &f.token,
                fn_name: "transfer",
                args: (&f.client, &f.contract, AMOUNT + FEE).into_val(&f.env),
                sub_invokes: &[],
            }],
        },
    }]);
    f.escrow().fund(&id);
    let authorizations = f.env.auths();
    assert_eq!(authorizations.len(), 1);
    assert_eq!(authorizations[0].0, f.client);
    assert_eq!(authorizations[0].1.sub_invocations.len(), 1);
    assert_eq!(f.token().balance(&f.contract), AMOUNT + FEE);
}

#[test]
fn missing_and_wrong_role_auth_cannot_change_jobs() {
    let f = Fixture::new();
    let id = f.create();
    f.env.mock_auths(&[]);
    assert!(f.escrow().try_accept(&id).is_err());
    assert_eq!(f.escrow().get_job(&id).state, JobState::Requested);
    f.env.mock_auths(&[MockAuth {
        address: &f.client,
        invoke: &MockAuthInvoke {
            contract: &f.contract,
            fn_name: "accept",
            args: (id,).into_val(&f.env),
            sub_invokes: &[],
        },
    }]);
    assert!(f.escrow().try_accept(&id).is_err());
    assert_eq!(f.escrow().get_job(&id).state, JobState::Requested);
    f.env.mock_all_auths();
    let stranger = Address::generate(&f.env);
    assert_eq!(f.escrow().try_cancel(&id, &stranger), Err(Ok(ContractError::Unauthorized)));
}

#[test]
fn init_requires_bound_admin_and_cannot_be_repeated() {
    let f = Fixture::new();
    f.env.mock_auths(&[]);
    assert!(f.escrow().try_init(&f.arbiter, &f.platform, &f.token).is_err());
    f.env.mock_all_auths();
    assert_eq!(f.escrow().try_init(&f.arbiter, &f.platform, &f.token), Err(Ok(ContractError::AlreadyInitialized)));
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract = env.register(Escrow, (&admin,));
    let escrow = EscrowClient::new(&env, &contract);
    env.mock_auths(&[]);
    assert!(escrow.try_init(&f.arbiter, &f.platform, &f.token).is_err());
    env.mock_all_auths();
    escrow.init(&f.arbiter, &f.platform, &f.token);
    assert_eq!(env.auths()[0].0, admin);
    assert_ne!(f.admin, f.client);
}

#[test]
fn auto_release_uses_submission_time_and_exact_deadline() {
    let f = Fixture::new();
    let id = f.funded();
    f.escrow().start(&id);
    f.env.ledger().set_timestamp(1_000 + REVIEW * 10);
    let anyone = Address::generate(&f.env);
    assert_eq!(f.escrow().try_auto_release(&id, &anyone), Err(Ok(ContractError::InvalidState)));
    f.escrow().submit(&id);
    let submitted_at = f.env.ledger().timestamp();
    f.env.ledger().set_timestamp(submitted_at + REVIEW - 1);
    assert_eq!(f.escrow().try_auto_release(&id, &anyone), Err(Ok(ContractError::ReviewPeriodActive)));
    assert_eq!(f.token().balance(&f.provider), MATERIALS);
    f.env.ledger().set_timestamp(submitted_at + REVIEW);
    f.env.mock_auths(&[]);
    assert!(f.escrow().try_auto_release(&id, &anyone).is_err());
    f.env.mock_all_auths();
    f.escrow().auto_release(&id, &anyone);
    f.assert_auth(&anyone, "auto_release", (id, &anyone).into_val(&f.env));
    assert_eq!(f.token().balance(&f.provider), AMOUNT);
    assert_eq!(f.token().balance(&f.platform), FEE);
    assert_eq!(f.escrow().try_auto_release(&id, &anyone), Err(Ok(ContractError::InvalidState)));
}

#[test]
fn both_parties_can_cancel_before_start_with_full_funded_refund() {
    for provider_cancels in [false, true] {
        for state in [JobState::Requested, JobState::Accepted, JobState::Funded] {
            let f = Fixture::new();
            let id = f.create();
            if state != JobState::Requested {
                f.escrow().accept(&id);
            }
            if state == JobState::Funded {
                f.escrow().fund(&id);
            }
            let caller = if provider_cancels { &f.provider } else { &f.client };
            f.escrow().cancel(&id, caller);
            f.assert_auth(caller, "cancel", (id, caller).into_val(&f.env));
            assert_eq!(f.token().balance(&f.client), AMOUNT + FEE);
            assert_eq!(f.token().balance(&f.contract), 0);
            assert_eq!(f.token().balance(&f.platform), 0);
            assert_eq!(f.escrow().get_job(&id).state, JobState::Cancelled);
            assert_eq!(f.escrow().rating_of(&f.provider).completed_jobs, 0);
            assert_eq!(f.escrow().try_cancel(&id, caller), Err(Ok(ContractError::InvalidState)));
        }
    }
}

#[test]
fn delivered_materials_cannot_be_cancelled_or_repaid() {
    let f = Fixture::new();
    let id = f.funded();
    f.escrow().start(&id);
    assert_eq!(f.escrow().try_cancel(&id, &f.client), Err(Ok(ContractError::InvalidState)));
    assert_eq!(f.escrow().try_start(&id), Err(Ok(ContractError::InvalidState)));
    assert_eq!(f.token().balance(&f.provider), MATERIALS);
    assert_eq!(f.token().balance(&f.contract), AMOUNT - MATERIALS + FEE);
}

#[test]
fn failed_token_transfer_rolls_back_state_and_balances() {
    let f = Fixture::new();
    let id = f.create();
    f.escrow().accept(&id);
    f.token().transfer(&f.client, &f.provider, &(AMOUNT + FEE));
    assert!(f.escrow().try_fund(&id).is_err());
    let job = f.escrow().get_job(&id);
    assert_eq!(job.state, JobState::Accepted);
    assert_eq!(job.remaining_amount, 0);
    assert_eq!(f.token().balance(&f.contract), 0);
}

#[test]
fn job_index_summary_and_instance_ttl_refresh_on_later_writes() {
    let f = Fixture::new();
    let id = f.create();
    let initial_sequence = f.env.ledger().sequence();
    let initial_ttl = f.env.as_contract(&f.contract, || {
        assert!(f.env.storage().persistent().has(&DataKey::Job(id)));
        assert!(!f.env.storage().instance().has(&DataKey::Job(id)));
        f.env.storage().persistent().get_ttl(&DataKey::Job(id))
    });
    assert!(initial_ttl >= storage::TTL_EXTEND_TO);
    f.env.ledger().set_sequence_number(initial_sequence + initial_ttl - storage::TTL_THRESHOLD + 1);
    f.escrow().accept(&id);
    f.env.as_contract(&f.contract, || {
        for key in [DataKey::Job(id), DataKey::JobsOf(f.provider.clone()), DataKey::Rating(f.provider.clone())] {
            assert!(f.env.storage().persistent().get_ttl(&key) >= storage::TTL_EXTEND_TO);
        }
        assert!(f.env.storage().instance().get_ttl() >= storage::TTL_EXTEND_TO);
    });
}

#[test]
fn all_seven_events_have_stable_topics_and_payloads() {
    use soroban_sdk::Event as _;
    let f = Fixture::new();
    let id = f.create();
    assert_eq!(f.env.events().all(), std::vec![events::Requested {
        job_id: id, client: f.client.clone(), provider: f.provider.clone(), amount: AMOUNT,
        materials_bps: 3_000, fee_bps: 500, review_secs: REVIEW,
    }.to_xdr(&f.env, &f.contract)]);
    f.escrow().accept(&id);
    assert_eq!(f.env.events().all(), std::vec![events::Accepted {
        job_id: id, provider: f.provider.clone(),
    }.to_xdr(&f.env, &f.contract)]);
    f.escrow().fund(&id);
    assert!(f.env.events().all().iter().any(|e| e == &events::Funded {
        job_id: id, client: f.client.clone(), amount: AMOUNT, fee_amount: FEE,
    }.to_xdr(&f.env, &f.contract)));
    f.escrow().start(&id);
    assert!(f.env.events().all().iter().any(|e| e == &events::Started {
        job_id: id, provider: f.provider.clone(), materials_amount: MATERIALS, remaining_amount: AMOUNT - MATERIALS,
    }.to_xdr(&f.env, &f.contract)));
    f.escrow().submit(&id);
    assert_eq!(f.env.events().all(), std::vec![events::Submitted {
        job_id: id, provider: f.provider.clone(), submitted_at: 1_000, release_at: 1_000 + REVIEW,
    }.to_xdr(&f.env, &f.contract)]);
    f.escrow().approve(&id);
    assert!(f.env.events().all().iter().any(|e| e == &events::Released {
        job_id: id, provider: f.provider.clone(), remaining_amount: AMOUNT - MATERIALS, fee_amount: FEE, automatic: false,
    }.to_xdr(&f.env, &f.contract)));
    let cancelled = f.create();
    f.escrow().cancel(&cancelled, &f.client);
    assert_eq!(f.env.events().all(), std::vec![events::Cancelled {
        job_id: cancelled, caller: f.client.clone(), refund_amount: 0,
    }.to_xdr(&f.env, &f.contract)]);
}

#[test]
fn stubs_are_in_abi_and_never_report_success_or_move_funds() {
    let f = Fixture::new();
    let id = f.submitted();
    assert_eq!(f.escrow().try_dispute(&id, &f.client), Err(Ok(ContractError::NotImplemented)));
    assert_eq!(f.escrow().try_resolve(&id, &5_000), Err(Ok(ContractError::NotImplemented)));
    assert_eq!(f.escrow().try_rate(&id, &5, &BytesN::from_array(&f.env, &[0; 32])), Err(Ok(ContractError::NotImplemented)));
    assert_eq!(f.escrow().get_job(&id).state, JobState::Submitted);
    assert_eq!(f.token().balance(&f.provider), MATERIALS);
    assert_eq!(f.token().balance(&f.contract), AMOUNT - MATERIALS + FEE);
    assert_eq!(f.escrow().rating_of(&f.provider), RatingSummary::default());
}

#[test]
fn inputs_and_i128_arithmetic_are_checked() {
    let f = Fixture::new();
    let description = String::from_str(&f.env, "Pintura");
    let create = |amount, materials, fee, review| f.escrow().try_create_job(
        &f.client, &f.provider, &amount, &materials, &fee, &review, &description,
    );
    for amount in [0, -1, i128::MIN] {
        assert_eq!(create(amount, 3_000, 500, REVIEW), Err(Ok(ContractError::InvalidAmount)));
    }
    assert_eq!(create(AMOUNT, 10_001, 500, REVIEW), Err(Ok(ContractError::InvalidBps)));
    assert_eq!(create(AMOUNT, 3_000, 10_001, REVIEW), Err(Ok(ContractError::InvalidBps)));
    assert_eq!(create(AMOUNT, 3_000, 500, 0), Err(Ok(ContractError::InvalidReviewPeriod)));
    assert_eq!(create(i128::MAX, 3_000, 500, REVIEW), Err(Ok(ContractError::ArithmeticOverflow)));
    assert_eq!(create(AMOUNT, 3_000, 500, u64::MAX), Err(Ok(ContractError::ArithmeticOverflow)));
    assert_eq!(portion(i128::MAX, 10_000), Ok(i128::MAX));
    assert_eq!(portion(101, 3_000), Ok(30));
    let id = create(i128::MAX, 10_000, 0, REVIEW).unwrap().unwrap();
    assert_eq!(f.escrow().get_job(&id).materials_amount, i128::MAX);
}

#[test]
fn rounding_dust_goes_to_final_provider_payment() {
    let f = Fixture::new();
    let id = f.escrow().create_job(&f.client, &f.provider, &101, &3_000, &500, &REVIEW, &String::from_str(&f.env, "Reparacion"));
    f.escrow().accept(&id);
    f.escrow().fund(&id);
    f.escrow().start(&id);
    assert_eq!(f.token().balance(&f.provider), 30);
    f.escrow().submit(&id);
    f.escrow().approve(&id);
    assert_eq!(f.token().balance(&f.provider), 101);
    assert_eq!(f.token().balance(&f.platform), 5);
    assert_eq!(f.token().balance(&f.contract), 0);
}
