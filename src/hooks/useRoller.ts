import { useCallback } from "react";
import { useStore } from "../store/useStore";
import { rollSkill, rollExpression } from "../domain/cocRules";
import type { RollContext, RollLogEntry } from "../domain/types";

/**
 * Dispara rolagens roteando o resultado pelo contexto:
 *  - sheet → popup (canto inf. direito) + log
 *  - combat → log do combate
 *  - standalone → painel + histórico
 * O popup é mostrado por quem disparou (lógica na UI que consome o retorno).
 */
export function useRoller() {
  const pushRoll = useStore((s) => s.pushRoll);
  const user = useStore((s) => s.currentUser);

  const skill = useCallback(
    (label: string, target: number, bonusDice: number, context: RollContext): RollLogEntry => {
      const result = rollSkill(target, bonusDice);
      return pushRoll({
        authorId: user?.id ?? "?",
        authorName: user?.name ?? "?",
        context,
        label,
        kind: "skill",
        skill: result,
      });
    },
    [pushRoll, user],
  );

  const dice = useCallback(
    (label: string, expression: string, context: RollContext, kind: "dice" | "damage" = "dice"): RollLogEntry => {
      const result = rollExpression(expression);
      return pushRoll({
        authorId: user?.id ?? "?",
        authorName: user?.name ?? "?",
        context,
        label,
        kind,
        dice: result,
      });
    },
    [pushRoll, user],
  );

  return { skill, dice };
}
