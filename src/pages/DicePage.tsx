import { useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Panel } from "../components/ui/Panel";
import { useRoller } from "../hooks/useRoller";
import { usePopup } from "../store/usePopup";
import { useStore } from "../store/useStore";
import { SUCCESS_LABELS } from "../domain/cocRules";
import "./DicePage.css";

const QUICK = ["1D100", "1D20", "1D10", "1D8", "1D6", "1D4", "2D6", "3D6", "1D3", "1D100+10"];

export function DicePage() {
  const { skill, dice } = useRoller();
  const showPopup = usePopup((s) => s.show);
  const log = useStore((s) => s.rollLog.filter((e) => e.context === "standalone"));

  const [expr, setExpr] = useState("1D100");
  const [skillTarget, setSkillTarget] = useState(50);
  const [bonus, setBonus] = useState(0);

  const rollExprNow = (e: string) => {
    const entry = dice("Rolagem livre", e, "standalone");
    showPopup(entry);
  };

  const rollSkillNow = () => {
    const label = `Teste (${skillTarget}%)${bonus ? ` ${bonus > 0 ? "+" : ""}${bonus}d` : ""}`;
    const entry = skill(label, skillTarget, bonus, "standalone");
    showPopup(entry);
  };

  return (
    <>
      <PageHeader title="Dados" subtitle="Rolagens livres e testes percentuais do sistema CoC 7ª Edição." />
      <div className="page-scroll dice-grid">
        <Panel title="Teste de Perícia (d100)">
          <div className="dice-skill">
            <label className="dice-field">
              <span>Valor-alvo da perícia</span>
              <input
                type="number"
                min={1}
                max={99}
                value={skillTarget}
                onChange={(e) => setSkillTarget(Math.max(1, Math.min(99, +e.target.value)))}
                className="num"
              />
            </label>

            <div className="dice-bonus">
              <span>Dados de bônus / penalidade</span>
              <div className="dice-bonus__row">
                <button onClick={() => setBonus((b) => b - 1)} className="dice-step">−</button>
                <span className={`dice-bonus__val num ${bonus > 0 ? "is-bonus" : bonus < 0 ? "is-penalty" : ""}`}>
                  {bonus > 0 ? `+${bonus}` : bonus}
                </span>
                <button onClick={() => setBonus((b) => b + 1)} className="dice-step">+</button>
              </div>
              <small>
                {bonus > 0 && "Usa a dezena mais baixa (vantagem)"}
                {bonus < 0 && "Usa a dezena mais alta (desvantagem)"}
                {bonus === 0 && "Rolagem normal"}
              </small>
            </div>

            <button className="btn btn--primary dice-roll-btn" onClick={rollSkillNow}>
              Testar
            </button>

            <div className="dice-thresholds num">
              <span>Extremo ≤ {Math.floor(skillTarget / 5)}</span>
              <span>Difícil ≤ {Math.floor(skillTarget / 2)}</span>
              <span>Regular ≤ {skillTarget}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Rolagem Livre">
          <div className="dice-free">
            <div className="dice-free__input">
              <input
                value={expr}
                onChange={(e) => setExpr(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && rollExprNow(expr)}
                placeholder="ex.: 2D6+3, 1D8+1D4"
                className="num"
              />
              <button className="btn btn--primary" onClick={() => rollExprNow(expr)}>Rolar</button>
            </div>
            <div className="dice-quick">
              {QUICK.map((q) => (
                <button key={q} className="dice-chip num" onClick={() => rollExprNow(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Histórico" className="dice-history-panel">
          <div className="dice-history">
            {log.length === 0 && <p className="dice-empty">Nenhuma rolagem ainda. Que os dados decidam seu destino.</p>}
            {log.map((e) => (
              <div key={e.id} className="dice-row">
                <span className="dice-row__author" style={{ color: "var(--text-400)" }}>{e.authorName}</span>
                <span className="dice-row__label">{e.label}</span>
                {e.skill ? (
                  <>
                    <span className="num dice-row__value">{e.skill.roll}</span>
                    <span className={`dice-row__level dice-row__level--${e.skill.level}`}>
                      {SUCCESS_LABELS[e.skill.level]}
                    </span>
                  </>
                ) : (
                  <span className="num dice-row__value" title={e.dice?.breakdown}>
                    {e.dice?.total}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
