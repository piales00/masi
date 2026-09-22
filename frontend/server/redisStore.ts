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

  async compareAndSet(key: string, revision: number | null, value: { revision: number }): Promise<boolean> {
    const result = await this.redis.eval(`
      local raw = redis.call('GET', KEYS[1])
      if ARGV[1] == 'new' then
        if raw then return 0 end
      else
        if not raw or cjson.decode(raw).revision ~= tonumber(ARGV[1]) then return 0 end
      end
      redis.call('SET', KEYS[1], ARGV[2])
      return 1
    `, [key], [revision === null ? 'new' : String(revision), JSON.stringify(value)]);
    return result === 1;
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
