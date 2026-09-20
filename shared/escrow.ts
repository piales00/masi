/**
 * Masi escrow ABI shared with P3/P4.
 * u32 values decode as number; u64/i128 values decode as bigint.
 * Keep this interface aligned with contracts/escrow/src/types.rs.
 */
export interface RatingSummary {
  stars_sum: number;
  rating_count: number;
  completed_jobs: number;
  disputes: number;
}

/** Both the fixture and future RPC adapter expose this exact contract read. */
export interface RatingSource {
  rating_of(provider: string): Promise<RatingSummary>;
}

export const JOB_STATES = [
  'Requested',
  'Accepted',
  'Funded',
  'Started',
  'Submitted',
  'Released',
  'Disputed',
  'Resolved',
  'Cancelled',
] as const;

/** Raw contract enum after decoding through generated Stellar JS bindings. */
export type JobState = { tag: (typeof JOB_STATES)[number]; values: void };

export type Address = string;
export type JobId = bigint;

/** Native values decoded by Stellar bindings; do not JSON.stringify bigint. */
export interface Job {
  id: JobId;
  client: Address;
  provider: Address;
  amount: bigint;
  materials_bps: number;
  fee_bps: number;
  review_secs: bigint;
  description: string;
  state: JobState;
  materials_amount: bigint;
  fee_amount: bigint;
  remaining_amount: bigint;
  created_at: bigint;
  submitted_at: bigint | undefined;
  released_at: bigint | undefined;
  rated: boolean;
}

/** Arguments only: signing and transaction submission belong to the P4 adapter. */
export interface EscrowArguments {
  init: { arbiter: Address; platform: Address; token: Address };
  create_job: {
    client: Address;
    provider: Address;
    amount: bigint;
    materials_bps: number;
    fee_bps: number;
    review_secs: bigint;
    description: string;
  };
  accept: { job_id: JobId };
  fund: { job_id: JobId };
  start: { job_id: JobId };
  submit: { job_id: JobId };
  approve: { job_id: JobId };
  auto_release: { job_id: JobId; caller: Address };
  cancel: { job_id: JobId; caller: Address };
  dispute: { job_id: JobId; caller: Address };
  resolve: { job_id: JobId; provider_bps: number };
  rate: { job_id: JobId; stars: number; comment_hash: Uint8Array };
  get_job: { job_id: JobId };
  jobs_of: { provider: Address };
  rating_of: { provider: Address };
}

/** Successful decoded return values, after the adapter handles contract errors. */
export interface EscrowReturnValues {
  init: void;
  create_job: JobId;
  accept: void;
  fund: void;
  start: void;
  submit: void;
  approve: void;
  auto_release: void;
  cancel: void;
  dispute: void;
  resolve: void;
  rate: void;
  get_job: Job;
  jobs_of: JobId[];
  rating_of: RatingSummary;
}
