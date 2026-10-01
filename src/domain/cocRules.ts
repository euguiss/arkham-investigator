/* =============================================================
   Motor de regras — Call of Cthulhu 7ª Edição
   Fórmulas de derivados, níveis de sucesso e rolagens.
   Baseado nas MECÂNICAS do sistema CoC 7e (regra pública).
   ============================================================= */

import type {
  Characteristics,
  SuccessLevel,
  SkillRollResult,
  DiceRollResult,
} from "./types";

/** metade (arredondada para baixo) */
export const half = (n: number): number => Math.floor(n / 2);
/** quinto (arredondado para baixo) */
export const fifth = (n: number): number => Math.floor(n / 5);

/* ----------------------- Derivados ----------------------- */

/** Pontos de Vida = (CON + TAM) / 10, arredondado para baixo. */
export function maxHP(c: Characteristics): number {
  return Math.floor((c.CON + c.SIZ) / 10);
}

/** Sanidade inicial / máxima = POD (máx. absoluto 99, reduzido por Mitos). */
export function maxSAN(c: Characteristics): number {
  return c.POW;
}

/** Pontos de Magia = POD / 5. */
export function maxMP(c: Characteristics): number {
  return Math.floor(c.POW / 5);
}

export interface DamageBuild {
  /** Bônus de dano, ex.: "0", "+1D4", "-2", "+2D6" */
  damageBonus: string;
  /** Corpo (Build) */
  build: number;
}

/** Bônus de Dano e Corpo pela soma FOR+TAM (CoC 7e). */
export function damageAndBuild(c: Characteristics): DamageBuild {
  const sum = c.STR + c.SIZ;
  if (sum <= 64) return { damageBonus: "-2", build: -2 };
  if (sum <= 84) return { damageBonus: "-1", build: -1 };
  if (sum <= 124) return { damageBonus: "0", build: 0 };
  if (sum <= 164) return { damageBonus: "+1D4", build: 1 };
  if (sum <= 204) return { damageBonus: "+1D6", build: 2 };
  // 205+: +1D6 adicional a cada 80 pontos (2D6 em 205–284, etc.)
  const extra = Math.floor((sum - 205) / 80);
  const dice = 2 + extra;
  return { damageBonus: `+${dice}D6`, build: 3 + extra };
}

/** Movimento (MOV) conforme FOR/DES vs TAM e idade. */
export function movementRate(c: Characteristics, age = 30): number {
  let mov: number;
  if (c.DEX < c.SIZ && c.STR < c.SIZ) mov = 7;
  else if (c.STR >= c.SIZ && c.DEX >= c.SIZ) mov = 9;
  else mov = 8;
  // penalidade por idade
  if (age >= 80) mov -= 5;
  else if (age >= 70) mov -= 4;
  else if (age >= 60) mov -= 3;
  else if (age >= 50) mov -= 2;
  else if (age >= 40) mov -= 1;
  return Math.max(1, mov);
}

/* --------------- Classificação de sucesso --------------- */
/**
 * Regras CoC 7e (corrigidas):
 *  - 01            → crítico (sempre)
 *  - ≤ alvo/5      → sucesso extremo
 *  - ≤ alvo/2      → sucesso difícil
 *  - ≤ alvo        → sucesso regular
 *  - falha         → acima do alvo
 *  - fumble        → 100 sempre; ou 96–99 quando o alvo (perícia) < 50
 */
export function classifyRoll(roll: number, target: number): SuccessLevel {
  if (roll === 1) return "critical";

  const isFumble = roll === 100 || (target < 50 && roll >= 96);
  if (isFumble) return "fumble";

  if (roll <= fifth(target)) return "extreme";
  if (roll <= half(target)) return "hard";
  if (roll <= target) return "regular";
  return "fail";
}

/* --------------- Rolagem de d100 com bônus/penalidade --------------- */
const d10 = () => Math.floor(Math.random() * 10); // 0..9
const d100 = () => Math.floor(Math.random() * 100) + 1;

/**
 * Rola d100 aplicando dados de bônus/penalidade.
 * bonusDice > 0 → rola dezenas extras e usa a MAIS BAIXA.
 * bonusDice < 0 → rola dezenas extras e usa a MAIS ALTA.
 * A dezena 0 com unidade 0 = 100.
 */
export function rollPercentile(bonusDice = 0): {
  roll: number;
  tensDrawn: number[];
  ones: number;
} {
  const ones = d10(); // unidade 0..9
  const count = Math.abs(bonusDice) + 1;
  const tens: number[] = [];
  for (let i = 0; i < count; i++) tens.push(d10()); // dezenas 0..9

  // compõe cada resultado candidato
  const candidates = tens.map((t) => {
    const value = t * 10 + ones;
    return value === 0 ? 100 : value;
  });

  let roll: number;
  if (bonusDice > 0) roll = Math.min(...candidates);
  else if (bonusDice < 0) roll = Math.max(...candidates);
  else roll = candidates[0];

  return { roll, tensDrawn: tens, ones };
}

export function rollSkill(target: number, bonusDice = 0): SkillRollResult {
  const { roll, tensDrawn, ones } = rollPercentile(bonusDice);
  return {
    roll,
    target,
    level: classifyRoll(roll, target),
    bonusDice,
    tensDrawn,
    ones,
  };
}

/** Teste de evolução de perícia: rola d100, melhora se > valor atual (ou 95+). */
export function improvementRoll(current: number): { roll: number; improved: boolean; gain: number } {
  const roll = d100();
  const improved = roll > current || roll >= 95;
  const gain = improved ? Math.floor(Math.random() * 10) + 1 : 0; // 1D10
  return { roll, improved, gain };
}

/* --------------- Avaliador de expressões de dados --------------- */
/**
 * Suporta: "1D10", "2d6+3", "1D8+1D4", "3", "1D100", "1D6-1".
 * Também aceita o token "DB" substituído previamente pelo chamador.
 */
export function rollExpression(expr: string): DiceRollResult {
  const clean = expr.replace(/\s+/g, "").toUpperCase();
  if (!clean) return { expression: expr, total: 0, breakdown: "0" };

  // separa em termos com sinal
  const terms = clean.match(/[+-]?[^+-]+/g) ?? [];
  let total = 0;
  const parts: string[] = [];

  for (const raw of terms) {
    const sign = raw.startsWith("-") ? -1 : 1;
    const term = raw.replace(/^[+-]/, "");
    const dice = term.match(/^(\d*)D(\d+)$/);
    if (dice) {
      const n = dice[1] ? parseInt(dice[1], 10) : 1;
      const faces = parseInt(dice[2], 10);
      const rolls: number[] = [];
      let sub = 0;
      for (let i = 0; i < n; i++) {
        const r = Math.floor(Math.random() * faces) + 1;
        rolls.push(r);
        sub += r;
      }
      total += sign * sub;
      parts.push(`${sign < 0 ? "-" : ""}${term}[${rolls.join(",")}]`);
    } else {
      const flat = parseInt(term, 10);
      if (!Number.isNaN(flat)) {
        total += sign * flat;
        parts.push(`${sign < 0 ? "-" : ""}${flat}`);
      }
    }
  }

  return { expression: expr, total, breakdown: parts.join(" + ").replace(/\+ -/g, "- ") };
}

/* --------------- Perícias padrão CoC 7e --------------- */
export interface SkillDef {
  name: string;
  base: number | ((c: Characteristics) => number);
  category: string;
}

export const DEFAULT_SKILLS: SkillDef[] = [
  { name: "Antropologia", base: 1, category: "Conhecimento" },
  { name: "Arqueologia", base: 1, category: "Conhecimento" },
  { name: "Arremessar", base: 20, category: "Física" },
  { name: "Arte/Ofício", base: 5, category: "Prática" },
  { name: "Avaliação", base: 5, category: "Percepção" },
  { name: "Charme", base: 15, category: "Social" },
  { name: "Chaveiro", base: 1, category: "Prática" },
  { name: "Ciência", base: 1, category: "Conhecimento" },
  { name: "Combate (Brigar)", base: 25, category: "Combate" },
  { name: "Conduzir Automóvel", base: 20, category: "Prática" },
  { name: "Contabilidade", base: 5, category: "Conhecimento" },
  { name: "Direito", base: 5, category: "Conhecimento" },
  { name: "Disfarce", base: 5, category: "Social" },
  { name: "Encontrar", base: 25, category: "Percepção" },
  { name: "Equitação", base: 5, category: "Física" },
  { name: "Escutar", base: 20, category: "Percepção" },
  { name: "Esquivar", base: (c) => half(c.DEX), category: "Combate" },
  { name: "Furtividade", base: 20, category: "Física" },
  { name: "História", base: 5, category: "Conhecimento" },
  { name: "Intimidação", base: 15, category: "Social" },
  { name: "Lábia", base: 5, category: "Social" },
  { name: "Línguas (Outra)", base: 1, category: "Conhecimento" },
  { name: "Língua Materna", base: (c) => c.EDU, category: "Conhecimento" },
  { name: "Mecânica", base: 10, category: "Prática" },
  { name: "Medicina", base: 1, category: "Conhecimento" },
  { name: "Mitos de Cthulhu", base: 0, category: "Conhecimento" },
  { name: "Mergulho", base: 1, category: "Física" },
  { name: "Natação", base: 20, category: "Física" },
  { name: "Navegação", base: 10, category: "Prática" },
  { name: "Ocultismo", base: 5, category: "Conhecimento" },
  { name: "Operar Maquinário Pesado", base: 1, category: "Prática" },
  { name: "Persuasão", base: 10, category: "Social" },
  { name: "Primeiros Socorros", base: 30, category: "Prática" },
  { name: "Prestidigitação", base: 10, category: "Prática" },
  { name: "Psicanálise", base: 1, category: "Conhecimento" },
  { name: "Psicologia", base: 10, category: "Percepção" },
  { name: "Rastrear", base: 10, category: "Percepção" },
  { name: "Saltar", base: 20, category: "Física" },
  { name: "Sobrevivência", base: 10, category: "Prática" },
  { name: "Usar Bibliotecas", base: 20, category: "Conhecimento" },
  { name: "Armas de Fogo (Pistola)", base: 20, category: "Combate" },
  { name: "Armas de Fogo (Rifle/Espingarda)", base: 25, category: "Combate" },
];

export const SUCCESS_LABELS: Record<SuccessLevel, string> = {
  critical: "Crítico",
  extreme: "Sucesso Extremo",
  hard: "Sucesso Difícil",
  regular: "Sucesso Regular",
  fail: "Falha",
  fumble: "Falha Crítica",
};
