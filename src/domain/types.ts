/* =============================================================
   Tipos de domínio — Call of Cthulhu 7ª Edição
   ============================================================= */

export type Role = "player" | "master";

export interface User {
  id: string;
  name: string;
  role: Role;
  color: string;
  online: boolean;
  lastSeen: number;
}

/** As 8 características do CoC 7e. */
export type CharacteristicKey =
  | "STR" // Força (FOR)
  | "CON" // Constituição (CON)
  | "DEX" // Destreza (DES)
  | "INT" // Inteligência (INT)
  | "POW" // Poder (POD)
  | "APP" // Aparência (APA)
  | "EDU" // Educação (EDU)
  | "SIZ"; // Tamanho (TAM)

export const CHARACTERISTIC_LABELS: Record<CharacteristicKey, { pt: string; abbr: string }> = {
  STR: { pt: "Força", abbr: "FOR" },
  CON: { pt: "Constituição", abbr: "CON" },
  DEX: { pt: "Destreza", abbr: "DES" },
  INT: { pt: "Inteligência", abbr: "INT" },
  POW: { pt: "Poder", abbr: "POD" },
  APP: { pt: "Aparência", abbr: "APA" },
  EDU: { pt: "Educação", abbr: "EDU" },
  SIZ: { pt: "Tamanho", abbr: "TAM" },
};

export type Characteristics = Record<CharacteristicKey, number>;

/** Recurso com pips (PV, SAN, PM, Sorte). */
export interface ResourcePool {
  current: number;
  max: number;
}

export interface Skill {
  id: string;
  name: string;
  /** valor base definido pelo livro (ex.: Esquivar = DES/2) */
  base: number;
  /** pontos investidos somados ao base */
  value: number;
  /** marcada para evolução (teve sucesso em jogo) */
  flaggedForImprovement: boolean;
  /** perícia específica/especialização, ex.: "Ciência (Biologia)" */
  specialization?: string;
  category?: string;
}

export type WeaponSkillRef = string; // id da perícia usada

export interface Weapon {
  id: string;
  name: string;
  skillId: WeaponSkillRef;
  damage: string; // ex.: "1D10", "1D8+1D4", "1D6+DB"
  addsDamageBonus: boolean;
  range: string; // ex.: "corpo-a-corpo", "15 m"
  attacksPerRound: number;
  ammoCapacity?: number;
  ammoCurrent?: number;
  malfunction?: number; // valor de defeito (fumble de arma de fogo)
  notes?: string;
}

export type ItemEffectType =
  | "heal" // cura PV
  | "damage" // dano PV
  | "sanRestore"
  | "sanLoss"
  | "mpRestore"
  | "mpLoss"
  | "buff"
  | "ammo"; // recarrega munição de uma arma

export interface ItemEffect {
  type: ItemEffectType;
  amount: string; // número fixo "5" ou expressão "1D6"
  targetWeaponId?: string; // para efeito de munição
  description?: string;
}

export interface Item {
  id: string;
  name: string;
  description?: string;
  category: string;
  price?: number;
  quantity: number;
  consumable: boolean;
  effects: ItemEffect[];
  icon?: string;
}

/** Nível de crédito → dinheiro em mãos / posses (CoC 7e). */
export interface Finances {
  creditRating: number;
  cash?: number;
  assets?: string;
}

export interface Backstory {
  personalDescription?: string;
  ideologyBeliefs?: string;
  significantPeople?: string;
  meaningfulLocations?: string;
  treasuredPossessions?: string;
  traits?: string;
  injuriesScars?: string;
  phobiasManias?: string;
  arcaneTomesSpells?: string;
  encountersWithEntities?: string;
}

export interface Character {
  id: string;
  ownerId: string | null; // jogador dono; null = NPC do mestre
  isNPC: boolean;
  visibleToPlayers: boolean;

  name: string;
  player?: string;
  occupation?: string;
  age?: number;
  pronouns?: string;
  residence?: string;
  birthplace?: string;
  portrait?: string; // dataURL

  characteristics: Characteristics;

  hp: ResourcePool;
  san: ResourcePool;
  mp: ResourcePool;
  luck: number;

  /** estados de combate */
  majorWound: boolean;
  dying: boolean;
  temporaryInsanity: boolean;
  indefiniteInsanity: boolean;

  skills: Skill[];
  weapons: Weapon[];
  inventory: Item[];
  finances: Finances;
  backstory: Backstory;

  conditions: string[]; // buffs/debuffs/efeitos ativos
  updatedAt: number;
}

/* ---------------- Dados / Rolagens ---------------- */

export type SuccessLevel =
  | "critical" // 01
  | "extreme" // ≤ per/5
  | "hard" // ≤ per/2
  | "regular" // ≤ per
  | "fail"
  | "fumble";

export interface SkillRollResult {
  roll: number;
  target: number;
  level: SuccessLevel;
  bonusDice: number; // >0 bônus, <0 penalidade
  tensDrawn: number[]; // dezenas roladas (para transparência)
  ones: number;
}

export interface DiceRollResult {
  expression: string;
  total: number;
  breakdown: string;
}

export type RollContext = "sheet" | "combat" | "standalone";

export interface RollLogEntry {
  id: string;
  authorId: string;
  authorName: string;
  context: RollContext;
  label: string;
  kind: "skill" | "dice" | "damage";
  skill?: SkillRollResult;
  dice?: DiceRollResult;
  timestamp: number;
}
