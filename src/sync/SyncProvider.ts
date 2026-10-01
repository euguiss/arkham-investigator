/* =============================================================
   Camada de sincronização abstraída.

   Hoje: BroadcastChannel (entre abas) + localStorage (persistência).
   Amanhã: implemente a mesma interface com Supabase Realtime ou
   WebSocket sem tocar nos módulos. Troque a instância em `sync`.
   ============================================================= */

export interface SyncMessage {
  type: string;
  payload: unknown;
  senderId: string;
  timestamp: number;
}

export type SyncListener = (msg: SyncMessage) => void;

export interface SyncBackend {
  readonly id: string;
  broadcast(type: string, payload: unknown): void;
  subscribe(listener: SyncListener): () => void;
  load<T>(key: string): T | null;
  save<T>(key: string, value: T): void;
}

const CHANNEL = "arkham-investigator";
const STORAGE_PREFIX = "arkham:";

function makeId(): string {
  return `node_${Math.random().toString(36).slice(2, 10)}`;
}

/** Backend local: BroadcastChannel + localStorage. */
class LocalSyncBackend implements SyncBackend {
  readonly id = makeId();
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<SyncListener>();

  constructor() {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (ev: MessageEvent<SyncMessage>) => {
        if (ev.data?.senderId === this.id) return;
        this.listeners.forEach((l) => l(ev.data));
      };
    }
    // sincroniza também via evento de storage (fallback entre abas)
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key?.startsWith(STORAGE_PREFIX) && e.newValue) {
          this.listeners.forEach((l) =>
            l({
              type: "storage",
              payload: { key: e.key, value: e.newValue },
              senderId: "storage",
              timestamp: Date.now(),
            }),
          );
        }
      });
    }
  }

  broadcast(type: string, payload: unknown): void {
    const msg: SyncMessage = {
      type,
      payload,
      senderId: this.id,
      timestamp: Date.now(),
    };
    this.channel?.postMessage(msg);
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  load<T>(key: string): T | null {
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  save<T>(key: string, value: T): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (err) {
      console.warn("Falha ao persistir", key, err);
    }
  }
}

/** Instância ativa — substitua por SupabaseSyncBackend quando configurar o backend. */
export const sync: SyncBackend = new LocalSyncBackend();
