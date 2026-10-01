import type { Characteristics, CharacteristicKey } from "../../domain/types";
import { CHARACTERISTIC_LABELS } from "../../domain/types";
import { half, fifth } from "../../domain/cocRules";
import "./CharacteristicGrid.css";

const ORDER: CharacteristicKey[] = ["STR", "CON", "SIZ", "DEX", "APP", "INT", "POW", "EDU"];

interface Props {
  characteristics: Characteristics;
  editable: boolean;
  onChange: (key: CharacteristicKey, value: number) => void;
  onRoll: (key: CharacteristicKey, value: number) => void;
}

export function CharacteristicGrid({ characteristics, editable, onChange, onRoll }: Props) {
  return (
    <div className="char-grid">
      {ORDER.map((key) => {
        const val = characteristics[key];
        const { pt, abbr } = CHARACTERISTIC_LABELS[key];
        return (
          <div key={key} className="char-cell" title={pt}>
            <div className="char-cell__abbr">{abbr}</div>
            <button
              className="char-cell__main num"
              onClick={() => onRoll(key, val)}
              title={`Testar ${pt}`}
            >
              {editable ? (
                <input
                  type="number"
                  value={val}
                  min={0}
                  max={99}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onChange(key, Math.max(0, Math.min(99, +e.target.value)))}
                  className="num"
                />
              ) : (
                val
              )}
            </button>
            <div className="char-cell__derived num">
              <span>{half(val)}</span>
              <span>{fifth(val)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
