import type { ResourcePool } from "../../domain/types";
import "./ResourcePips.css";

interface Props {
  label: string;
  pool: ResourcePool;
  tone: "hp" | "san" | "mp" | "luck";
  editable: boolean;
  /** Altera APENAS este recurso — PM nunca toca PV. */
  onChange: (next: ResourcePool) => void;
}

const TONE_LABEL: Record<Props["tone"], string> = {
  hp: "Pontos de Vida",
  san: "Sanidade",
  mp: "Pontos de Magia",
  luck: "Sorte",
};

export function ResourcePips({ label, pool, tone, editable, onChange }: Props) {
  const clamp = (v: number) => Math.max(0, Math.min(pool.max, v));
  const set = (current: number) => onChange({ ...pool, current: clamp(current) });

  // pips só fazem sentido com max pequeno; acima disso mostramos barra
  const showPips = pool.max <= 24;

  return (
    <div className={`pips pips--${tone}`} title={TONE_LABEL[tone]}>
      <div className="pips__head">
        <span className="pips__label">{label}</span>
        <span className="pips__count num">
          {pool.current}
          <span className="pips__max">/{pool.max}</span>
        </span>
      </div>

      {showPips ? (
        <div className="pips__track">
          {Array.from({ length: pool.max }).map((_, i) => (
            <button
              key={i}
              type="button"
              disabled={!editable}
              className={`pips__pip ${i < pool.current ? "is-filled" : ""}`}
              onClick={() => editable && set(i + 1 === pool.current ? i : i + 1)}
              aria-label={`${label} ${i + 1}`}
            />
          ))}
        </div>
      ) : (
        <div className="pips__bar">
          <div className="pips__bar-fill" style={{ width: `${(pool.current / pool.max) * 100}%` }} />
        </div>
      )}

      {editable && (
        <div className="pips__controls">
          <button type="button" onClick={() => set(pool.current - 1)} className="pips__btn">−</button>
          <button type="button" onClick={() => set(pool.current + 1)} className="pips__btn">+</button>
        </div>
      )}
    </div>
  );
}
