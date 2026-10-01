import { useMemo, useState } from "react";
import type { Skill } from "../../domain/types";
import { half, fifth } from "../../domain/cocRules";
import "./SkillList.css";

interface Props {
  skills: Skill[];
  editable: boolean;
  onRoll: (skill: Skill) => void;
  onEdit: (id: string, patch: Partial<Skill>) => void;
  onToggleFlag: (id: string) => void;
  onImprove: (skill: Skill) => void;
  improvementMode: boolean;
}

export function SkillList({ skills, editable, onRoll, onEdit, onToggleFlag, onImprove, improvementMode }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => skills.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
    [skills, query],
  );

  return (
    <div className="skills">
      <input
        className="skills__search"
        placeholder="Buscar perícia…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="skills__list">
        {filtered.map((s) => (
          <div key={s.id} className={`skill-row ${s.flaggedForImprovement ? "is-flagged" : ""}`}>
            <button
              className="skill-row__flag"
              title={improvementMode ? "Rolar evolução" : s.flaggedForImprovement ? "Marcada para evolução" : "Marcar p/ evolução"}
              onClick={() => (improvementMode && s.flaggedForImprovement ? onImprove(s) : onToggleFlag(s.id))}
            >
              {improvementMode && s.flaggedForImprovement ? "↑" : s.flaggedForImprovement ? "◆" : "◇"}
            </button>

            <button className="skill-row__name" onClick={() => onRoll(s)} title={`Testar ${s.name}`}>
              {s.name}
            </button>

            {editable ? (
              <input
                className="skill-row__value num"
                type="number"
                min={0}
                max={99}
                value={s.value}
                onChange={(e) => onEdit(s.id, { value: Math.max(0, Math.min(99, +e.target.value)) })}
              />
            ) : (
              <button className="skill-row__value num" onClick={() => onRoll(s)}>
                {s.value}
              </button>
            )}

            <span className="skill-row__sub num">{half(s.value)}</span>
            <span className="skill-row__sub num">{fifth(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
