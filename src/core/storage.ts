// Async-aware session storage. Backed by @react-native-async-storage/async-storage
// when available; falls back to an in-memory map so apps that don't install the
// peer dep still work (session won't persist across cold starts, but the widget
// stays functional during a single run).

const PROJECT_SESSION_PREFIX = "quipier:session:";

export interface ProjectSession {
  projectId: string;
  projectTokenId: string;
  nickname: string;
  sessionToken: string;
  expiresAt: number; // ms epoch
}

interface AsyncKV {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

let cachedKV: AsyncKV | null = null;
const memoryStore = new Map<string, string>();
const memoryKV: AsyncKV = {
  async getItem(key) {
    return memoryStore.get(key) ?? null;
  },
  async setItem(key, value) {
    memoryStore.set(key, value);
  },
  async removeItem(key) {
    memoryStore.delete(key);
  },
};

function resolveKV(): AsyncKV {
  if (cachedKV) return cachedKV;
  try {
    // Lazy require so apps without the peer dep don't crash at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@react-native-async-storage/async-storage");
    const candidate = (mod?.default ?? mod) as AsyncKV | undefined;
    if (candidate && typeof candidate.getItem === "function") {
      cachedKV = candidate;
      return candidate;
    }
  } catch {
    // peer dep not installed — fall through
  }
  cachedKV = memoryKV;
  return memoryKV;
}

/** Inject a custom storage backend. Useful for tests or non-RN runtimes. */
export function setSessionStorage(kv: AsyncKV | null): void {
  cachedKV = kv;
}

export async function loadProjectSession(
  projectId: string,
): Promise<ProjectSession | null> {
  try {
    const raw = await resolveKV().getItem(PROJECT_SESSION_PREFIX + projectId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProjectSession;
    if (parsed.expiresAt > Date.now() + 10_000) return parsed;
    await resolveKV().removeItem(PROJECT_SESSION_PREFIX + projectId);
    return null;
  } catch {
    return null;
  }
}

export async function saveProjectSession(session: ProjectSession): Promise<void> {
  try {
    await resolveKV().setItem(
      PROJECT_SESSION_PREFIX + session.projectId,
      JSON.stringify(session),
    );
  } catch {
    // ignore (quota, no backend)
  }
}

export async function clearProjectSession(projectId: string): Promise<void> {
  try {
    await resolveKV().removeItem(PROJECT_SESSION_PREFIX + projectId);
  } catch {
    // ignore
  }
}
