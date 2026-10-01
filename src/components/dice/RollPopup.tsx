import { useEffect, useState } from "react";
import type { RollLogEntry } from "../../domain/types";
import { SUCCESS_LABELS } from "../../domain/cocRules";
import "./RollPopup.css";

/**
 * Popup contextual no canto inferior direito.
 * Mostra a última rolagem de perícia/dado feita pelo usuário.
 */
export function RollPopup({ entry, onDismiss }: { entry: RollLogEntry | null; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 5200);
    const t2 = setTimeout(onDismiss, 5600);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [entry, onDismiss]);

  if (!entry) return null;

  const level = entry.skill?.level;
  const toneClass = level ? `roll-popup--${level}` : "roll-popup--neutral";

  return (
    <div className={`roll-popup ${toneClass} ${visible ? "is-in" : "is-out"}`} role="status">
      <button className="roll-popup__close" onClick={() => setVisible(false)} aria-label="Fechar">
        ×
      </button>
      <div className="roll-popup__label">{entry.label}</div>

      {entry.skill && (
        <>
          <div className="roll-popup__die num">{entry.skill.roll}</div>
          <div className="roll-popup__result">{SUCCESS_LABELS[entry.skill.level]}</div>
          <div className="roll-popup__meta num">
            alvo {entry.skill.target}
            {entry.skill.bonusDice !== 0 && (
              <span className="roll-popup__bonus">
                {" "}
                · {entry.skill.bonusDice > 0 ? "+" : ""}
                {entry.skill.bonusDice}d bônus
              </span>
            )}
          </div>
        </>
      )}

      {entry.dice && (
        <>
          <div className="roll-popup__die num">{entry.dice.total}</div>
          <div className="roll-popup__meta num">{entry.dice.breakdown}</div>
        </>
      )}

      <div className="roll-popup__author">{entry.authorName}</div>
    </div>
  );
}
