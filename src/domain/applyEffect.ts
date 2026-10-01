/* Aplica efeitos de item a um personagem, retornando patch + descrição. */
import type { Character, Item } from "./types";
import { rollExpression } from "./cocRules";

export interface EffectResult {
  patch: Partial<Character>;
  messages: string[];
}

export function applyItemEffects(char: Character, item: Item): EffectResult {
  const patch: Partial<Character> = {};
  const messages: string[] = [];
  let hp = { ...char.hp };
  let san = { ...char.san };
  let mp = { ...char.mp };
  let weapons = char.weapons;

  for (const eff of item.effects) {
    const amount = /D/i.test(eff.amount) ? rollExpression(eff.amount).total : parseInt(eff.amount, 10) || 0;
    switch (eff.type) {
      case "heal":
        hp.current = Math.min(hp.max, hp.current + amount);
        messages.push(`+${amount} PV`);
        break;
      case "damage":
        hp.current = Math.max(0, hp.current - amount);
        messages.push(`−${amount} PV`);
        break;
      case "sanRestore":
        san.current = Math.min(san.max, san.current + amount);
        messages.push(`+${amount} Sanidade`);
        break;
      case "sanLoss":
        san.current = Math.max(0, san.current - amount);
        messages.push(`−${amount} Sanidade`);
        break;
      case "mpRestore":
        mp.current = Math.min(mp.max, mp.current + amount);
        messages.push(`+${amount} PM`);
        break;
      case "mpLoss":
        mp.current = Math.max(0, mp.current - amount);
        messages.push(`−${amount} PM`);
        break;
      case "ammo": {
        const target = eff.targetWeaponId
          ? char.weapons.find((w) => w.id === eff.targetWeaponId)
          : char.weapons.find((w) => w.ammoCapacity != null);
        if (target) {
          weapons = char.weapons.map((w) =>
            w.id === target.id ? { ...w, ammoCurrent: Math.min(w.ammoCapacity ?? amount, (w.ammoCurrent ?? 0) + amount) } : w,
          );
          messages.push(`${target.name}: +${amount} munição`);
        }
        break;
      }
      case "buff":
        messages.push(eff.description ?? "Efeito aplicado");
        break;
    }
  }

  patch.hp = hp;
  patch.san = san;
  patch.mp = mp;
  patch.weapons = weapons;
  patch.dying = hp.current <= 0;
  return { patch, messages };
}
