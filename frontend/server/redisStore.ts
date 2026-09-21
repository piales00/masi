import { Redis } from '@upstash/redis';
import type { KeyValueStore } from './store';

export class RedisStore implements KeyValueStore {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<unknown | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.redis.set(key, value);
  }

  async list(prefix: string): Promise<string[]> {
    let cursor = '0';
    const keys: string[] = [];
    do {
      const [next, page] = await this.redis.scan(cursor, { match: `${prefix}*`, count: 100 });
      cursor = next;
      keys.push(...page);
    } while (cursor !== '0');
    return keys.sort();
  }
}

export const redisStore = new RedisStore(Redis.fromEnv());
