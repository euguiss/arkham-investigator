/* =============================================================
   Store global (Zustand) — estado compartilhado da campanha única.
   Sincronizado em tempo real via SyncProvider.
   ============================================================= */

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Character, RollLogEntry, User, Item } from "../domain/types";
import { sync } from "../sync/SyncProvider";
import { broadcastPatch } from "./factory";
import { createBlankCharacter } from "../domain/factory";

interface AppState {
  // sessão local
  currentUser: User | null;
  // coleções compartilhadas
  users: Record<string, User>;
  characters: Record<string, Character>;
  rollLog: RollLogEntry[];
  shopItems: Item[];
  activeMapId: string | null;

  // --- auth ---
  login: (name: string, role: "player" | "master") => User;
  logout: () => void;

  // --- personagens ---
  upsertCharacter: (c: Character) => void;
  patchCharacter: (id: string, patch: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  getMyCharacter: () => Character | undefined;
  createCharacterFor: (userId: string | null, isNPC: boolean) => Character;

  // --- rolagens ---
  pushRoll: (entry: Omit<RollLogEntry, "id" | "timestamp">) => RollLogEntry;

  // --- loja ---
  setShopItems: (items: Item[]) => void;

  // internos
  _applyRemote: (collection: string, data: unknown) => void;
  _hydrate: () => void;
}

const MASTER_PASSWORD = "nyarlathotep"; // senha do Mestre (configurável)

const PLAYER_COLORS = [
  "#d4a24c", "#6fa5c4", "#9bbf7a", "#d85f4e", "#a97fd6", "#e3bd76",
];

function pickColor(existing: User[]): string {
  const used = new Set(existing.map((u) => u.color));
  return PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0];
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  users: {},
  characters: {},
  rollLog: [],
  shopItems: [],
  activeMapId: null,

  login: (name, role) => {
    const existing = Object.values(get().users);
    const prior = existing.find((u) => u.name.toLowerCase() === name.toLowerCase());
    const user: User = prior
      ? { ...prior, online: true, lastSeen: Date.now(), role }
      : {
          id: nanoid(8),
          name,
          role,
          color: pickColor(existing),
          online: true,
          lastSeen: Date.now(),
        };
    const users = { ...get().users, [user.id]: user };
    set({ users, currentUser: user });
    broadcastPatch("users", users);

    // jogador sem ficha → cria uma em branco
    if (role === "player") {
      const mine = Object.values(get().characters).find((c) => c.ownerId === user.id);
      if (!mine) get().createCharacterFor(user.id, false);
    }
    return user;
  },

  logout: () => {
    const u = get().currentUser;
    if (u) {
      const users = { ...get().users, [u.id]: { ...u, online: false, lastSeen: Date.now() } };
      set({ users });
      broadcastPatch("users", users);
    }
    set({ currentUser: null });
  },

  upsertCharacter: (c) => {
    const characters = { ...get().characters, [c.id]: { ...c, updatedAt: Date.now() } };
    set({ characters });
    broadcastPatch("characters", characters);
  },

  patchCharacter: (id, patch) => {
    const cur = get().characters[id];
    if (!cur) return;
    const next = { ...cur, ...patch, updatedAt: Date.now() };
    const characters = { ...get().characters, [id]: next };
    set({ characters });
    broadcastPatch("characters", characters);
  },

  deleteCharacter: (id) => {
    const characters = { ...get().characters };
    delete characters[id];
    set({ characters });
    broadcastPatch("characters", characters);
  },

  getMyCharacter: () => {
    const u = get().currentUser;
    if (!u) return undefined;
    return Object.values(get().characters).find((c) => c.ownerId === u.id);
  },

  createCharacterFor: (userId, isNPC) => {
    const user = userId ? get().users[userId] : null;
    const c = createBlankCharacter(nanoid(8), userId, isNPC, user?.name);
    get().upsertCharacter(c);
    return c;
  },

  pushRoll: (entry) => {
    const full: RollLogEntry = { ...entry, id: nanoid(10), timestamp: Date.now() };
    const rollLog = [full, ...get().rollLog].slice(0, 200);
    set({ rollLog });
    broadcastPatch("rollLog", rollLog);
    return full;
  },

  setShopItems: (items) => {
    set({ shopItems: items });
    broadcastPatch("shopItems", items);
  },

  _applyRemote: (collection, data) => {
    switch (collection) {
      case "users":
        set({ users: data as Record<string, User> });
        break;
      case "characters":
        set({ characters: data as Record<string, Character> });
        break;
      case "rollLog":
        set({ rollLog: data as RollLogEntry[] });
        break;
      case "shopItems":
        set({ shopItems: data as Item[] });
        break;
      default:
        break;
    }
  },

  _hydrate: () => {
    const users = sync.load<Record<string, User>>("users") ?? {};
    const characters = sync.load<Record<string, Character>>("characters") ?? {};
    const rollLog = sync.load<RollLogEntry[]>("rollLog") ?? [];
    const shopItems = sync.load<Item[]>("shopItems") ?? [];
    set({ users, characters, rollLog, shopItems });
  },
}));

export { MASTER_PASSWORD };

/* ---- wiring de sincronização entre abas/clientes ---- */
useStore.getState()._hydrate();

sync.subscribe((msg) => {
  if (msg.type.startsWith("patch:")) {
    const collection = msg.type.slice("patch:".length);
    useStore.getState()._applyRemote(collection, msg.payload);
  } else if (msg.type === "storage") {
    const { key } = msg.payload as { key: string; value: string };
    const collection = key.replace(/^arkham:/, "");
    const data = sync.load(collection);
    if (data) useStore.getState()._applyRemote(collection, data);
  }
});
