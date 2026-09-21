import { Redis } from '@upstash/redis';
import type { KeyValueStore } from './store.js';

export class RedisStore implements KeyValueStore {
  constructor(private client?: Redis) {}

  private get redis(): Redis {
    if (!this.client) {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        throw new Error('Falta configurar Upstash Redis en el servidor.');
      }
      this.client = Redis.fromEnv();
    }
    return this.client;
  }

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

// La ruta de salud no requiere una conexión a la base de datos.
export const redisStore = new RedisStore();
