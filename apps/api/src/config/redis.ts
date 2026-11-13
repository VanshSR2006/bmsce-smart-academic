import Redis from 'ioredis';
import { config } from './env.js';

let redisClient: Redis | null = null;
let isConnected = false;

// In-memory fallback cache and job store when Redis is unavailable
const memoryFallbackStore = new Map<string, { value: any; expiresAt?: number }>();

/**
 * Initializes and manages Redis connection with non-blocking resilience.
 * If Redis is offline, the system continues uninterrupted using fallback in-memory state.
 */
export function initRedis(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    console.info('[Redis] REDIS_URL is not set. Using in-memory fallback.');
    return null;
  }

  try {
    // Secure TLS configuration: Render internal Key Value uses standard redis:// over the private network.
    // If an external rediss:// connection string is provided, full TLS validation with trusted CAs is enforced.
    const isTls = redisUrl.startsWith('rediss://');
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
      tls: isTls ? {} : undefined,
      retryStrategy(times) {
        if (times > 3) {
          // Cease retrying automatically to prevent log spam when Redis container isn't up
          return null;
        }
        return Math.min(times * 1000, 3000);
      },
    });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('[Redis] Connected successfully.');
    });

    redisClient.on('ready', () => {
      isConnected = true;
      console.log(`[Redis] Client ready for commands.`);
    });

    redisClient.on('error', (err) => {
      if (isConnected) {
        console.warn(`[Redis] Connection warning: ${err.message}`);
      }
      isConnected = false;
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    // Attempt non-blocking connection
    redisClient.connect().catch(() => {
      console.info('[Redis] Redis offline. Using resilient in-memory fallback.');
    });

    return redisClient;
  } catch (err: any) {
    console.warn(`[Redis] Failed to initialize Redis client: ${err.message}. Operating in fallback mode.`);
    return null;
  }
}

export function isRedisAvailable(): boolean {
  return isConnected && redisClient?.status === 'ready';
}

/**
 * Resilient Cache Get (Redis primary, memory fallback)
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  if (isRedisAvailable() && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      // Fall through to memory fallback
    }
  }

  const item = memoryFallbackStore.get(key);
  if (!item) return null;
  if (item.expiresAt && Date.now() > item.expiresAt) {
    memoryFallbackStore.delete(key);
    return null;
  }
  return item.value;
}

/**
 * Resilient Cache Set (Redis primary, memory fallback)
 */
export async function cacheSet(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  const serialized = JSON.stringify(value);

  if (isRedisAvailable() && redisClient) {
    try {
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
      return;
    } catch {
      // Fall through to memory
    }
  }

  memoryFallbackStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Publish job status for background optimizer runs
 */
export async function setJobStatus(jobId: string, statusPayload: any): Promise<void> {
  await cacheSet(`job:optimizer:${jobId}`, statusPayload, 7200);
}

export async function getJobStatus(jobId: string): Promise<any | null> {
  return await cacheGet(`job:optimizer:${jobId}`);
}

/**
 * Graceful shutdown for Redis connections
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      console.log('[Redis] Closing Redis connection...');
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    } finally {
      isConnected = false;
      redisClient = null;
    }
  }
}

