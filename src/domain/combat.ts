/* =============================================================
   Tipos e lógica do módulo de Combate.
   Grid: 1 célula = 1 metro.
   ============================================================= */

export interface Token {
  id: string;
  /** vínculo opcional a uma ficha (Character.id); se nulo, token avulso */
  characterId: string | null;
  name: string;
  /** posição em células do grid */
  cx: number;
  cy: number;
  color: string;
  /** espelhados da ficha ou editados manualmente para tokens avulsos */
  hp?: { current: number; max: number };
  san?: { current: number; max: number };
  status: string[];
  image?: string;
  isNPC: boolean;
  /** raio em células (tamanho visual) */
  size: number;
}

export interface InitiativeEntry {
  tokenId: string;
  value: number; // DES ou valor de iniciativa
}

export interface CombatStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
}

export interface CombatState {
  active: boolean;
  round: number;
  turnIndex: number;
  order: InitiativeEntry[];
  tokens: Record<string, Token>;
  strokes: CombatStroke[];
  /** alvo selecionado atualmente pelo usuário local não é compartilhado */
}

export const EMPTY_COMBAT: CombatState = {
  active: false,
  round: 1,
  turnIndex: 0,
  order: [],
  tokens: {},
  strokes: [],
};

/** Avança para o próximo turno, incrementando rodada ao dar a volta. */
export function nextTurn(state: CombatState): CombatState {
  if (state.order.length === 0) return state;
  const nextIndex = state.turnIndex + 1;
  if (nextIndex >= state.order.length) {
    return { ...state, turnIndex: 0, round: state.round + 1 };
  }
  return { ...state, turnIndex: nextIndex };
}

/** Ordena a iniciativa (maior primeiro) e reseta o turno. */
export function rollInitiativeOrder(tokens: Token[]): InitiativeEntry[] {
  return tokens
    .map((t) => ({ tokenId: t.id, value: 0 }))
    .sort((a, b) => b.value - a.value);
}

export const COMBAT_STATUSES = [
  "Ferido",
  "Atordoado",
  "Caído",
  "Agarrado",
  "Enlouquecido",
  "Fugindo",
  "Morrendo",
  "Morto",
  "Inconsciente",
];
