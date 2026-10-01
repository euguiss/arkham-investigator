import { create } from "zustand";
import { sync } from "../sync/SyncProvider";
import { EMPTY_COMBAT, nextTurn } from "../domain/combat";
import type { CombatState, Token, CombatStroke } from "../domain/combat";

const KEY = "combat";

interface CombatStore extends CombatState {
  setState: (s: CombatState) => void;
  patch: (p: Partial<CombatState>) => void;
  upsertToken: (t: Token) => void;
  patchToken: (id: string, p: Partial<Token>) => void;
  removeToken: (id: string) => void;
  addStroke: (s: CombatStroke) => void;
  clearStrokes: () => void;
  advanceTurn: () => void;
  startCombat: () => void;
  endCombat: () => void;
}

function persist(partial: CombatState) {
  sync.save(KEY, partial);
  sync.broadcast("patch:combat", partial);
}

export const useCombat = create<CombatStore>((set, get) => {
  const snapshot = (): CombatState => {
    const { active, round, turnIndex, order, tokens, strokes } = get();
    return { active, round, turnIndex, order, tokens, strokes };
  };

  const commit = (next: Partial<CombatState>) => {
    set(next);
    persist({ ...snapshot(), ...next });
  };

  return {
    ...(sync.load<CombatState>(KEY) ?? EMPTY_COMBAT),

    setState: (s) => set(s),
    patch: (p) => commit(p),

    upsertToken: (t) => commit({ tokens: { ...get().tokens, [t.id]: t } }),
    patchToken: (id, p) => {
      const cur = get().tokens[id];
      if (!cur) return;
      commit({ tokens: { ...get().tokens, [id]: { ...cur, ...p } } });
    },
    removeToken: (id) => {
      const tokens = { ...get().tokens };
      delete tokens[id];
      commit({ tokens, order: get().order.filter((o) => o.tokenId !== id) });
    },

    addStroke: (s) => commit({ strokes: [...get().strokes, s] }),
    clearStrokes: () => commit({ strokes: [] }),

    advanceTurn: () => commit(nextTurn(snapshot())),
    startCombat: () => {
      const order = Object.values(get().tokens).map((t) => ({ tokenId: t.id, value: 0 }));
      commit({ active: true, round: 1, turnIndex: 0, order });
    },
    endCombat: () => commit({ active: false, order: [], round: 1, turnIndex: 0 }),
  };
});

// sincronização remota
sync.subscribe((msg) => {
  if (msg.type === "patch:combat") {
    useCombat.getState().setState(msg.payload as CombatState);
  }
});
