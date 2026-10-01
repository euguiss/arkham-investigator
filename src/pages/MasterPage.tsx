import { useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Panel } from "../components/ui/Panel";
import { useStore } from "../store/useStore";
import { useCombat } from "../store/useCombat";
import type { Character } from "../domain/types";
import "./MasterPage.css";

type Tab = "overview" | "characters" | "visibility" | "combat";

export function MasterPage() {
  const characters = useStore((s) => s.characters);
  const users = useStore((s) => s.users);
  const patchCharacter = useStore((s) => s.patchCharacter);
  const createCharacterFor = useStore((s) => s.createCharacterFor);
  const deleteCharacter = useStore((s) => s.deleteCharacter);
  const combat = useCombat();

  const [tab, setTab] = useState<Tab>("overview");
  const [dragId, setDragId] = useState<string | null>(null);

  const online = Object.values(users).filter((u) => u.online);
  const pcs = Object.values(characters).filter((c) => !c.isNPC);
  const npcs = Object.values(characters).filter((c) => c.isNPC);

  const setVisible = (id: string, visible: boolean) => patchCharacter(id, { visibleToPlayers: visible });

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Visão Geral", icon: "👁" },
    { id: "characters", label: "Personagens", icon: "🧾" },
    { id: "visibility", label: "Visibilidade", icon: "🎭" },
    { id: "combat", label: "Combate", icon: "⚔️" },
  ];

  return (
    <>
      <PageHeader title="Área do Guardião" subtitle="Painel de comando da campanha." />
      <div className="master">
        <nav className="master-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`master-tab ${tab === t.id ? "is-active" : ""}`} onClick={() => setTab(t.id)}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>

        <div className="master-content">
          {tab === "overview" && (
            <div className="master-grid">
              <Panel title="Na mesa agora" accent="arcane">
                {online.length === 0 ? <p className="dice-empty">Ninguém online.</p> : (
                  <div className="master-online">
                    {online.map((u) => (
                      <div key={u.id} className="master-online__row">
                        <span className="shell__presence-dot" style={{ background: u.color }} />
                        <span>{u.name}</span>
                        {u.role === "master" && <span className="shell__presence-tag">#guardião</span>}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Estado dos investigadores" accent="arcane">
                <div className="master-vitals">
                  {pcs.map((c) => (
                    <div key={c.id} className="master-vital">
                      <span className="master-vital__name">{c.name}</span>
                      <Bar label="PV" cur={c.hp.current} max={c.hp.max} tone="hp" />
                      <Bar label="SAN" cur={c.san.current} max={c.san.max} tone="san" />
                      {c.dying && <span className="master-tag-dying">MORRENDO</span>}
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {tab === "characters" && (
            <CharacterControl
              pcs={pcs}
              npcs={npcs}
              onPatch={patchCharacter}
              onCreateNPC={() => createCharacterFor(null, true)}
              onDelete={deleteCharacter}
            />
          )}

          {tab === "visibility" && (
            <div className="master-visibility">
              <p className="master-hint">Arraste NPCs/personagens entre as colunas para revelar ou ocultar dos jogadores.</p>
              <div className="vis-cols">
                <VisColumn
                  title="🔒 Oculto (só Guardião)"
                  items={Object.values(characters).filter((c) => !c.visibleToPlayers)}
                  tone="hidden"
                  onDrop={(id) => setVisible(id, false)}
                  dragId={dragId}
                  setDragId={setDragId}
                />
                <VisColumn
                  title="👁 Revelado aos jogadores"
                  items={Object.values(characters).filter((c) => c.visibleToPlayers)}
                  tone="shown"
                  onDrop={(id) => setVisible(id, true)}
                  dragId={dragId}
                  setDragId={setDragId}
                />
              </div>
            </div>
          )}

          {tab === "combat" && (
            <Panel title="Controle de Combate" accent="blood">
              <div className="master-combat">
                <div className="master-combat__status">
                  Estado: <strong>{combat.active ? `Rodada ${combat.round}` : "inativo"}</strong> · {Object.keys(combat.tokens).length} tokens
                </div>
                <div className="master-combat__btns">
                  {combat.active ? (
                    <>
                      <button className="btn btn--sm" onClick={() => combat.advanceTurn()}>Próximo turno →</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => combat.endCombat()}>Encerrar combate</button>
                    </>
                  ) : (
                    <button className="btn btn--primary btn--sm" onClick={() => combat.startCombat()} disabled={Object.keys(combat.tokens).length === 0}>Iniciar combate</button>
                  )}
                  <button className="btn btn--ghost btn--sm" onClick={() => combat.clearStrokes()}>Limpar desenhos</button>
                </div>
                <p className="master-hint">Monte a cena e gerencie tokens na aba Combate; aqui você orquestra turnos e rodadas.</p>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Bar({ label, cur, max, tone }: { label: string; cur: number; max: number; tone: "hp" | "san" }) {
  return (
    <div className="master-bar">
      <span className="master-bar__label">{label}</span>
      <div className="master-bar__track">
        <div className={`master-bar__fill master-bar__fill--${tone}`} style={{ width: `${max ? (cur / max) * 100 : 0}%` }} />
      </div>
      <span className="master-bar__num num">{cur}/{max}</span>
    </div>
  );
}

function VisColumn({ title, items, tone, onDrop, dragId, setDragId }: {
  title: string; items: Character[]; tone: "hidden" | "shown";
  onDrop: (id: string) => void; dragId: string | null; setDragId: (id: string | null) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`vis-col vis-col--${tone} ${over ? "is-over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (dragId) onDrop(dragId); setDragId(null); }}
    >
      <h4 className="vis-col__title">{title}</h4>
      <div className="vis-col__list">
        {items.map((c) => (
          <div
            key={c.id}
            className="vis-card"
            draggable
            onDragStart={() => setDragId(c.id)}
            onDragEnd={() => setDragId(null)}
          >
            {c.portrait ? <img src={c.portrait} alt="" className="vis-card__img" /> : <span className="vis-card__dot" style={{ background: c.isNPC ? "#d85f4e" : "#6fa5c4" }} />}
            <span>{c.name}</span>
            {c.isNPC && <span className="vis-card__npc">NPC</span>}
          </div>
        ))}
        {items.length === 0 && <p className="dice-empty">—</p>}
      </div>
    </div>
  );
}

function CharacterControl({ pcs, npcs, onPatch, onCreateNPC, onDelete }: {
  pcs: Character[]; npcs: Character[];
  onPatch: (id: string, p: Partial<Character>) => void;
  onCreateNPC: () => void; onDelete: (id: string) => void;
}) {
  const adjust = (c: Character, field: "hp" | "san" | "mp", delta: number) => {
    const pool = c[field];
    onPatch(c.id, { [field]: { ...pool, current: Math.max(0, Math.min(pool.max, pool.current + delta)) }, ...(field === "hp" ? { dying: pool.current + delta <= 0 } : {}) } as Partial<Character>);
  };

  const row = (c: Character) => (
    <div key={c.id} className="ctl-row">
      <span className="ctl-row__name">{c.name}</span>
      {(["hp", "san", "mp"] as const).map((f) => (
        <div key={f} className="ctl-res">
          <span className="ctl-res__label">{f.toUpperCase()}</span>
          <button className="ctl-mini" onClick={() => adjust(c, f, -1)}>−</button>
          <span className="num ctl-res__val">{c[f].current}</span>
          <button className="ctl-mini" onClick={() => adjust(c, f, +1)}>+</button>
        </div>
      ))}
      {c.isNPC && <button className="shop-inv__drop" title="Excluir NPC" onClick={() => onDelete(c.id)}>×</button>}
    </div>
  );

  return (
    <div className="master-grid">
      <Panel title="Investigadores" accent="arcane">
        <div className="ctl-list">{pcs.map(row)}{pcs.length === 0 && <p className="dice-empty">Nenhum investigador.</p>}</div>
      </Panel>
      <Panel title="NPCs" accent="arcane" actions={<button className="btn btn--ghost btn--sm" onClick={onCreateNPC}>+ NPC</button>}>
        <div className="ctl-list">{npcs.map(row)}{npcs.length === 0 && <p className="dice-empty">Nenhum NPC. Crie um e edite na aba Fichas.</p>}</div>
      </Panel>
    </div>
  );
}
