export interface KeyValueStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

/** Deterministic store for the API's unit tests and local core development. */
export class MemoryStore implements KeyValueStore {
  readonly values = new Map<string, unknown>();

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
