const STORAGE_KEY = "chunk-reload-state";
const MAX_ATTEMPTS = 2;
const COOLDOWN_MS = 10_000;

interface ChunkReloadState {
  count: number;
  ts: number;
}

// Recovers from stale-deploy chunk-load failures (an open tab requesting a
// hashed asset that a later deploy no longer serves). Cooldown collapses the
// vite:preloadError event and the ErrorBoundary catch firing for the same
// failure into a single reload; the attempt cap stops a permanently broken
// chunk from reload-looping forever.
export function attemptChunkReload(): boolean {
  let state: ChunkReloadState = { count: 0, ts: 0 };
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "");
    if (parsed) state = parsed;
  } catch {
    // use default state
  }

  const now = Date.now();
  if (now - state.ts < COOLDOWN_MS) return false;
  if (state.count >= MAX_ATTEMPTS) return false;

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ count: state.count + 1, ts: now }));
  window.location.reload();
  return true;
}
