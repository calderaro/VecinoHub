import { createClient, type RedisClientType } from "redis";

type SecondaryStorage = {
  get: (key: string) => Promise<string | null | undefined>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

type ActiveSessionRecord = {
  token: string;
  expiresAt: number;
};

const redisUrl = process.env.REDIS_URL;

if (!redisUrl && process.env.NODE_ENV !== "test") {
  throw new Error("REDIS_URL is not set");
}

let redisClient: RedisClientType | null = null;
let redisConnectPromise: Promise<RedisClientType> | null = null;

const memoryStorage = new Map<string, { value: string; expiresAt: number | null }>();

function now() {
  return Date.now();
}

function getActiveSessionsKey(userId: string) {
  return `active-sessions-${userId}`;
}

function parseActiveSessions(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ActiveSessionRecord[]) : [];
  } catch {
    return [];
  }
}

async function getRedisClient() {
  if (!redisUrl) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (error) => {
      console.error("[redis] Failed to use secondary storage", error);
    });
  }

  if (!redisConnectPromise) {
    redisConnectPromise = redisClient.connect().then(() => redisClient as RedisClientType);
  }

  return redisConnectPromise;
}

const inMemorySecondaryStorage: SecondaryStorage = {
  async get(key) {
    const entry = memoryStorage.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== null && entry.expiresAt <= now()) {
      memoryStorage.delete(key);
      return null;
    }

    return entry.value;
  },
  async set(key, value, ttl) {
    const expiresAt = ttl && ttl > 0 ? now() + ttl * 1000 : null;
    memoryStorage.set(key, { value, expiresAt });
  },
  async delete(key) {
    memoryStorage.delete(key);
  },
};

const redisSecondaryStorage: SecondaryStorage = {
  async get(key) {
    const client = await getRedisClient();
    return client?.get(key);
  },
  async set(key, value, ttl) {
    const client = await getRedisClient();

    if (!client) {
      return;
    }

    if (ttl && ttl > 0) {
      await client.set(key, value, { EX: ttl });
      return;
    }

    await client.set(key, value);
  },
  async delete(key) {
    const client = await getRedisClient();
    await client?.del(key);
  },
};

export const secondaryStorage =
  redisUrl && process.env.NODE_ENV !== "test"
    ? redisSecondaryStorage
    : inMemorySecondaryStorage;

export async function deleteUserSecondarySessions(userId: string) {
  const activeSessions = parseActiveSessions(
    await secondaryStorage.get(getActiveSessionsKey(userId))
  );

  for (const session of activeSessions) {
    await secondaryStorage.delete(session.token);
  }

  await secondaryStorage.delete(getActiveSessionsKey(userId));
}

export async function resetSecondaryStorage() {
  memoryStorage.clear();
}
