/* =============================================================
   Fábricas de entidades do domínio.
   ============================================================= */

import { nanoid } from "nanoid";
import type { Character, Characteristics, Skill } from "./types";
import { DEFAULT_SKILLS, maxHP, maxSAN, maxMP } from "./cocRules";

const DEFAULT_CHARACTERISTICS: Characteristics = {
  STR: 50,
  CON: 50,
  DEX: 50,
  INT: 50,
  POW: 50,
  APP: 50,
  EDU: 50,
  SIZ: 50,
};

export function buildDefaultSkills(c: Characteristics): Skill[] {
  return DEFAULT_SKILLS.map((def) => {
    const base = typeof def.base === "function" ? def.base(c) : def.base;
    return {
      id: nanoid(6),
      name: def.name,
      base,
      value: base,
      flaggedForImprovement: false,
      category: def.category,
    };
  });
}

export function createBlankCharacter(
  id: string,
  ownerId: string | null,
  isNPC: boolean,
  playerName?: string,
): Character {
  const c = { ...DEFAULT_CHARACTERISTICS };
  return {
    id,
    ownerId,
    isNPC,
    visibleToPlayers: !isNPC,
    name: isNPC ? "Novo NPC" : "Novo Investigador",
    player: playerName,
    occupation: "",
    age: 30,
    characteristics: c,
    hp: { current: maxHP(c), max: maxHP(c) },
    san: { current: maxSAN(c), max: maxSAN(c) },
    mp: { current: maxMP(c), max: maxMP(c) },
    luck: 50,
    majorWound: false,
    dying: false,
    temporaryInsanity: false,
    indefiniteInsanity: false,
    skills: buildDefaultSkills(c),
    weapons: [
      {
        id: nanoid(6),
        name: "Desarmado",
        skillId: "brawl",
        damage: "1D3",
        addsDamageBonus: true,
        range: "corpo-a-corpo",
        attacksPerRound: 1,
      },
    ],
    inventory: [],
    finances: { creditRating: 50 },
    backstory: {},
    conditions: [],
    updatedAt: Date.now(),
  };
}
