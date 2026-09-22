export interface KeyValueStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
  list(prefix: string): Promise<string[]>;
  compareAndSet?(key: string, revision: number | null, value: { revision: number }): Promise<boolean>;
}

/** Deterministic store for the API's unit tests and local core development. */
export class MemoryStore implements KeyValueStore {
  readonly values = new Map<string, unknown>();

  async compareAndSet(key: string, revision: number | null, value: { revision: number }): Promise<boolean> {
    const current = this.values.get(key) as { revision: number } | undefined;
    if ((current?.revision ?? null) !== revision) return false;
    this.values.set(key, structuredClone(value));
    return true;
  }

  async get(key: string): Promise<unknown | null> {
    const value = this.values.get(key);
    return value === undefined ? null : structuredClone(value);
  }

  async set(key: string, value: unknown): Promise<void> {
    this.values.set(key, structuredClone(value));
  }

  async list(prefix: string): Promise<string[]> {
    return [...this.values.keys()].filter(key => key.startsWith(prefix)).sort();
  }
}
