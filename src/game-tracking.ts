import { callable } from '@decky/api';

const setActiveGame = callable<[appId: string | null, name: string], void>('set_active_game');
type Game = { id: string; name: string };
type App = { appid?: number | string; display_name?: string };
type SteamGlobals = {
  SteamUIStore?: { MainRunningApp?: App; MainRunningAppID?: number | string; RunningApps?: App[] };
  appStore?: { GetAppOverviewByAppID?: (id: number) => App | null };
};
const idOf = (value: unknown): string | null => {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') return null;
  let n = Number(value);
  if (Number.isInteger(n) && n < 0 && n >= -0x80000000) n = n >>> 0;
  return Number.isInteger(n) && n > 0 && n <= 0xffffffff ? String(n) : null;
};

// Installed once per plugin load, outside the panel's React lifecycle.
export function startGameTracking(): () => void {
  const instances = new Map<string, Set<number>>();
  const stopped = new Map<string, number>();
  let disposed = false;
  let emptyReads = 0;
  let desired: Game | null = null;
  let sent: string | undefined;
  let busy = false;
  let dirty = false;
  let subscription: { unregister: () => void } | undefined;
  const globals = () => window as unknown as SteamGlobals;
  const game = (id: string, name?: string): Game => {
    if (!name) {
      try { name = globals().appStore?.GetAppOverviewByAppID?.(Number(id))?.display_name; } catch { /* Use ID. */ }
    }
    return { id, name: name || `Game ${id}` };
  };
  const drain = async () => {
    if (busy || disposed) return;
    busy = true;
    try {
      while (dirty && !disposed) {
        dirty = false;
        const target = desired;
        const key = JSON.stringify(target);
        if (sent === key) continue;
        try {
          await setActiveGame(target?.id ?? null, target?.name ?? '');
          sent = key;
        } catch(e) { console.warn('Ally Impulse game profile selection failed', e); }
      }
    } finally { busy = false; }
  };
  const publish = (target: Game | null) => { desired = target; dirty = true; void drain(); };
  const reconcile = (explicitStop = false) => {
    if (disposed) return;
    let available = false;
    try {
      const store = globals().SteamUIStore;
      if (store) {
        const apps = store.RunningApps;
        available = Array.isArray(apps);
        const candidates = [store.MainRunningApp, ...(Array.isArray(apps) ? apps : [])];
        const mainId = idOf(store.MainRunningAppID);
        if (mainId) candidates.unshift({ appid: mainId });
        for (const app of candidates) {
          const id = idOf(app?.appid);
          if (!id || Date.now() - (stopped.get(id) ?? 0) < 3000) continue;
          emptyReads = 0; publish(game(id, app?.display_name)); return;
        }
      }
    } catch { /* Lifetime notifications remain the fallback. */ }
    const ids = [...instances.keys()];
    if (ids.length) { emptyReads = 0; publish(game(ids[ids.length - 1])); return; }
    // Briefly empty running-app lists can occur during SteamUI transitions.
    if (explicitStop || (available && ++emptyReads >= 3)) publish(null);
  };
  try {
    subscription = SteamClient.GameSessions.RegisterForAppLifetimeNotifications(event => {
      const id = idOf(event.unAppID);
      if (!id) return;
      if (event.bRunning) {
        stopped.delete(id);
        const set = instances.get(id) ?? new Set<number>();
        set.add(event.nInstanceID); instances.delete(id); instances.set(id, set);
        emptyReads = 0; publish(game(id));
      } else {
        const set = instances.get(id);
        if (set) { set.delete(event.nInstanceID); if (!set.size) instances.delete(id); }
        if (!instances.has(id)) stopped.set(id, Date.now());
        reconcile(desired?.id === id && !instances.has(id));
      }
    });
  } catch(e) { console.warn('Ally Impulse game events unavailable; using running-app polling', e); }
  reconcile();
  const interval = setInterval(() => reconcile(), 1000);
  return () => {
    disposed = true; clearInterval(interval);
    try { subscription?.unregister(); } catch { /* Steam may be shutting down. */ }
  };
}
