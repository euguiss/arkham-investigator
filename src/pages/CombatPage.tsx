import { useRef, useState, useCallback } from "react";
import { nanoid } from "nanoid";
import { useStore } from "../store/useStore";
import { useCombat } from "../store/useCombat";
import { usePopup } from "../store/usePopup";
import { useRoller } from "../hooks/useRoller";
import { COMBAT_STATUSES } from "../domain/combat";
import type { Token } from "../domain/combat";
import { SUCCESS_LABELS, damageAndBuild } from "../domain/cocRules";
import "./CombatPage.css";

const CELL = 48; // px por metro em zoom 1
const COLORS = ["#d4a24c", "#d85f4e", "#6fa5c4", "#9bbf7a", "#a97fd6", "#f4ecdd"];
type Tool = "select" | "pan" | "draw" | "ruler";

export function CombatPage() {
  const user = useStore((s) => s.currentUser)!;
  const isMaster = user.role === "master";
  const characters = useStore((s) => s.characters);
  const patchCharacter = useStore((s) => s.patchCharacter);

  const combat = useCombat();
  const { skill, dice } = useRoller();
  const showPopup = usePopup((s) => s.show);
  const combatLog = useStore((s) => s.rollLog.filter((e) => e.context === "combat").slice(0, 40));

  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(COLORS[0]);
  const [view, setView] = useState({ x: 300, y: 160, zoom: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<{ points: { x: number; y: number }[] } | null>(null);
  const [ruler, setRuler] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; cx?: number; cy?: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const toWorld = useCallback(
    (cx: number, cy: number) => {
      const r = svgRef.current!.getBoundingClientRect();
      return { x: (cx - r.left - view.x) / view.zoom, y: (cy - r.top - view.y) / view.zoom };
    },
    [view],
  );

  // token espelha a ficha vinculada
  const tokenHP = (t: Token) => (t.characterId ? characters[t.characterId]?.hp : t.hp);
  const tokenSAN = (t: Token) => (t.characterId ? characters[t.characterId]?.san : t.san);

  const tokens = Object.values(combat.tokens);
  const activeTokenId = combat.active ? combat.order[combat.turnIndex]?.tokenId : null;

  /* ---------------- adicionar tokens ---------------- */
  const addTokenFromCharacter = (characterId: string) => {
    const c = characters[characterId];
    if (!c) return;
    const t: Token = {
      id: nanoid(6), characterId, name: c.name,
      cx: Math.round(-view.x / (CELL * view.zoom)) + 4, cy: Math.round(-view.y / (CELL * view.zoom)) + 3,
      color: c.isNPC ? "#d85f4e" : "#6fa5c4", status: [...c.conditions], image: c.portrait,
      isNPC: c.isNPC, size: 1,
    };
    combat.upsertToken(t);
  };

  const addBlankToken = () => {
    const t: Token = {
      id: nanoid(6), characterId: null, name: "Inimigo",
      cx: 4, cy: 3, color: "#d85f4e",
      hp: { current: 10, max: 10 }, status: [], isNPC: true, size: 1,
    };
    combat.upsertToken(t);
    setSelectedId(t.id);
  };

  /* ---------------- grid interaction ---------------- */
  const onBgDown = (e: React.PointerEvent) => {
    const { x, y } = toWorld(e.clientX, e.clientY);
    if (tool === "draw") { setDrawing({ points: [{ x, y }] }); return; }
    if (tool === "ruler") { setRuler({ x1: x, y1: y, x2: x, y2: y }); return; }
    panRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    setSelectedId(null);
  };

  const onMove = (e: React.PointerEvent) => {
    const { x, y } = toWorld(e.clientX, e.clientY);
    if (drawing) { setDrawing({ points: [...drawing.points, { x, y }] }); return; }
    if (ruler) { setRuler({ ...ruler, x2: x, y2: y }); return; }
    if (dragRef.current) {
      // atualiza posição localmente; persiste no pointer-up
      const id = dragRef.current.id;
      const cx = Math.round(x / CELL), cy = Math.round(y / CELL);
      const t = combat.tokens[id];
      if (t && (t.cx !== cx || t.cy !== cy)) {
        dragRef.current.cx = cx;
        dragRef.current.cy = cy;
        useCombat.setState({ tokens: { ...combat.tokens, [id]: { ...t, cx, cy } } });
      }
      return;
    }
    if (panRef.current) {
      setView((v) => ({ ...v, x: panRef.current!.vx + (e.clientX - panRef.current!.x), y: panRef.current!.vy + (e.clientY - panRef.current!.y) }));
    }
  };

  const onUp = () => {
    if (drawing && drawing.points.length > 1) combat.addStroke({ id: nanoid(6), points: drawing.points, color });
    setDrawing(null);
    if (ruler) setTimeout(() => setRuler(null), 1200); // some após medir
    // persiste a posição final do token uma única vez
    if (dragRef.current?.cx != null) {
      combat.patchToken(dragRef.current.id, { cx: dragRef.current.cx, cy: dragRef.current.cy });
    }
    dragRef.current = null;
    panRef.current = null;
  };

  const onTokenDown = (e: React.PointerEvent, t: Token) => {
    e.stopPropagation();
    if (tool === "select") {
      setSelectedId(t.id);
      if (isMaster || t.characterId === useStore.getState().getMyCharacter()?.id) dragRef.current = { id: t.id };
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const r = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    setView((v) => {
      const zoom = Math.max(0.3, Math.min(3, v.zoom * factor));
      return { zoom, x: mx - (mx - v.x) * (zoom / v.zoom), y: my - (my - v.y) * (zoom / v.zoom) };
    });
  };

  /* ---------------- ações de combate ---------------- */
  const attacker = selectedId ? combat.tokens[selectedId] : null;
  const target = targetId ? combat.tokens[targetId] : null;

  const applyDamageToToken = (tid: string, delta: number) => {
    const t = combat.tokens[tid];
    if (!t) return;
    if (t.characterId) {
      const c = characters[t.characterId];
      if (c) {
        const cur = Math.max(0, Math.min(c.hp.max, c.hp.current + delta));
        patchCharacter(c.id, { hp: { ...c.hp, current: cur }, dying: cur <= 0 });
      }
    } else if (t.hp) {
      const cur = Math.max(0, Math.min(t.hp.max, t.hp.current + delta));
      combat.patchToken(tid, { hp: { ...t.hp, current: cur } });
    }
  };

  const doAttack = () => {
    if (!attacker) return;
    if (!target) { alert("Selecione um alvo primeiro (clique com o botão de alvo em um token)."); return; }
    const c = attacker.characterId ? characters[attacker.characterId] : null;
    const weapon = c?.weapons[0];
    const base = c ? (c.skills.find((s) => s.id === weapon?.skillId)?.value ?? 25) : 50;

    // consumo de munição
    if (c && weapon?.ammoCapacity != null) {
      if ((weapon.ammoCurrent ?? 0) <= 0) { alert("Sem munição! Recarregue na ficha."); return; }
      patchCharacter(c.id, { weapons: c.weapons.map((w) => w.id === weapon.id ? { ...w, ammoCurrent: (w.ammoCurrent ?? 0) - 1 } : w) });
    }

    const entry = skill(`${attacker.name} ataca ${target.name}`, base, 0, "combat");
    showPopup(entry);

    if (entry.skill && entry.skill.level !== "fail" && entry.skill.level !== "fumble") {
      // acerto → rola dano automaticamente
      const db = c ? damageAndBuild(c.characteristics).damageBonus : "0";
      const dmgExpr = weapon ? (weapon.addsDamageBonus && db !== "0" ? `${weapon.damage}${db}` : weapon.damage) : "1D6";
      const dmg = dice(`Dano em ${target.name}`, dmgExpr, "combat", "damage");
      applyDamageToToken(target.id, -Math.abs(dmg.dice!.total));
    } else if (entry.skill?.level === "fumble") {
      // fumble pode quebrar arma de fogo
      if (c && weapon?.ammoCapacity != null) {
        dice(`${attacker.name}: FALHA CRÍTICA — a arma emperrou!`, "0", "combat");
      }
    }
  };

  const rollInitiative = () => {
    // iniciativa por DES (CoC 7e): maior DES age primeiro
    const order = tokens.map((t) => {
      const c = t.characterId ? characters[t.characterId] : null;
      return { tokenId: t.id, value: c?.characteristics.DEX ?? 50 };
    }).sort((a, b) => b.value - a.value);
    combat.patch({ order, turnIndex: 0, round: 1, active: true });
  };

  const myCharId = useStore.getState().getMyCharacter()?.id;
  const canControlSelected = isMaster || (attacker?.characterId === myCharId);

  const TOOLS: { id: Tool; icon: string; label: string }[] = [
    { id: "select", icon: "⤤", label: "Selecionar" },
    { id: "pan", icon: "✋", label: "Mover" },
    { id: "ruler", icon: "📏", label: "Régua" },
    { id: "draw", icon: "✎", label: "Desenhar" },
  ];

  const rulerDist = ruler ? Math.hypot(ruler.x2 - ruler.x1, ruler.y2 - ruler.y1) / CELL : 0;

  return (
    <div className="combat">
      {/* trilha de iniciativa */}
      <div className="combat-track">
        <div className="combat-track__round">
          <span className="combat-track__round-label">Rodada</span>
          <span className="num combat-track__round-num">{combat.active ? combat.round : "—"}</span>
        </div>
        <div className="combat-track__order">
          {combat.active && combat.order.length > 0 ? (
            combat.order.map((o, i) => {
              const t = combat.tokens[o.tokenId];
              if (!t) return null;
              return (
                <button
                  key={o.tokenId}
                  className={`combat-chip ${i === combat.turnIndex ? "is-active" : ""}`}
                  style={{ borderColor: t.color }}
                  onClick={() => setSelectedId(t.id)}
                >
                  <span className="combat-chip__init num">{o.value}</span>
                  {t.name}
                </button>
              );
            })
          ) : (
            <span className="combat-track__empty">Sem combate ativo</span>
          )}
        </div>
        {isMaster && (
          <div className="combat-track__ctl">
            {!combat.active ? (
              <button className="btn btn--primary btn--sm" onClick={rollInitiative} disabled={tokens.length === 0}>▶ Iniciar</button>
            ) : (
              <>
                <button className="btn btn--sm" onClick={() => combat.advanceTurn()}>Próximo turno →</button>
                <button className="btn btn--ghost btn--sm" onClick={() => combat.endCombat()}>Encerrar</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="combat-body">
        {/* grid */}
        <div className="combat-grid-wrap">
          <div className="combat-tools">
            {TOOLS.map((t) => (
              <button key={t.id} className={`wb-tool ${tool === t.id ? "is-active" : ""}`} onClick={() => setTool(t.id)} title={t.label}>{t.icon}</button>
            ))}
            <div className="wb-divider" />
            <div className="wb-colors">
              {COLORS.map((c) => <button key={c} className={`wb-color ${color === c ? "is-active" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />)}
            </div>
            <div className="wb-divider" />
            <button className="wb-tool wb-tool--danger" title="Limpar desenhos" onClick={() => combat.clearStrokes()}>🧹</button>
            <div className="wb-zoom num">{Math.round(view.zoom * 100)}%</div>
          </div>

          <svg
            ref={svgRef}
            className={`combat-grid combat-grid--${tool}`}
            onPointerDown={onBgDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            onWheel={onWheel}
          >
            <defs>
              <pattern id="cgrid" width={CELL} height={CELL} patternUnits="userSpaceOnUse" patternTransform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
                <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="rgba(212,162,76,0.07)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cgrid)" />

            <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
              {/* strokes */}
              {[...combat.strokes, ...(drawing ? [{ id: "tmp", points: drawing.points, color }] : [])].map((s) => (
                <polyline key={s.id} points={s.points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={s.color} strokeWidth={3} strokeLinecap="round" />
              ))}

              {/* régua */}
              {ruler && (
                <g>
                  <line x1={ruler.x1} y1={ruler.y1} x2={ruler.x2} y2={ruler.y2} stroke="var(--amber-400)" strokeWidth={2} strokeDasharray="6 4" />
                  <rect x={(ruler.x1 + ruler.x2) / 2 - 24} y={(ruler.y1 + ruler.y2) / 2 - 24} width={48} height={20} rx={4} fill="var(--ink-900)" stroke="var(--amber-600)" />
                  <text x={(ruler.x1 + ruler.x2) / 2} y={(ruler.y1 + ruler.y2) / 2 - 9} textAnchor="middle" fill="var(--amber-300)" fontSize="13" fontFamily="var(--font-mono)">{rulerDist.toFixed(1)} m</text>
                </g>
              )}

              {/* tokens */}
              {tokens.map((t) => {
                const hp = tokenHP(t); const san = tokenSAN(t);
                const dead = hp && hp.current <= 0;
                const px = t.cx * CELL, py = t.cy * CELL;
                const r = CELL * t.size * 0.42;
                return (
                  <g key={t.id} transform={`translate(${px + CELL / 2} ${py + CELL / 2})`} className="combat-token" onPointerDown={(e) => onTokenDown(e, t)}>
                    {activeTokenId === t.id && <circle r={r + 6} fill="none" stroke="var(--amber-400)" strokeWidth={2} className="combat-token__active" />}
                    {targetId === t.id && <circle r={r + 10} fill="none" stroke="var(--blood-400)" strokeWidth={2} strokeDasharray="4 3" />}
                    <circle r={r} fill={dead ? "var(--ink-600)" : t.color} stroke={selectedId === t.id ? "var(--text-100)" : "rgba(0,0,0,0.5)"} strokeWidth={selectedId === t.id ? 3 : 2} opacity={dead ? 0.5 : 1} />
                    {t.image && (
                      <>
                        <clipPath id={`clip-${t.id}`}><circle r={r - 2} /></clipPath>
                        <image href={t.image} x={-r} y={-r} width={r * 2} height={r * 2} clipPath={`url(#clip-${t.id})`} preserveAspectRatio="xMidYMid slice" opacity={dead ? 0.4 : 1} />
                      </>
                    )}
                    {!t.image && <text textAnchor="middle" dy="0.35em" fontSize={r * 0.8} fill="var(--ink-900)" fontWeight="700">{t.name[0]}</text>}

                    {/* nome */}
                    <text y={r + 14} textAnchor="middle" fontSize="11" fill="var(--text-200)" fontFamily="var(--font-serif)">{t.name}</text>

                    {/* barras HP / SAN */}
                    {hp && (
                      <g transform={`translate(${-r} ${-r - 12})`}>
                        <rect width={r * 2} height={5} rx={2} fill="var(--ink-900)" />
                        <rect width={Math.max(0, hp.max > 0 ? (hp.current / hp.max) * r * 2 : 0)} height={5} rx={2} fill="var(--blood-500)" />
                      </g>
                    )}
                    {san && (
                      <g transform={`translate(${-r} ${-r - 5})`}>
                        <rect width={r * 2} height={4} rx={2} fill="var(--ink-900)" />
                        <rect width={Math.max(0, san.max > 0 ? (san.current / san.max) * r * 2 : 0)} height={4} rx={2} fill="var(--cerulean-500)" />
                      </g>
                    )}

                    {/* status */}
                    {t.status.length > 0 && <text y={r + 28} textAnchor="middle" fontSize="9" fill="var(--amber-400)">{t.status.join(" · ")}</text>}

                    {/* botão de alvo */}
                    {tool === "select" && selectedId !== t.id && (
                      <g className="combat-token__target-btn" transform={`translate(${r - 4} ${-r + 4})`} onPointerDown={(e) => { e.stopPropagation(); setTargetId(targetId === t.id ? null : t.id); }}>
                        <circle r={9} fill={targetId === t.id ? "var(--blood-500)" : "var(--ink-700)"} stroke="var(--blood-400)" />
                        <text textAnchor="middle" dy="0.35em" fontSize="11" fill="var(--text-100)">◎</text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* painel lateral */}
        <aside className="combat-side">
          <div className="combat-panel">
            <h4 className="combat-panel__title">Adicionar à cena</h4>
            <div className="combat-add">
              {Object.values(characters).filter((c) => isMaster || c.visibleToPlayers || c.ownerId === user.id).map((c) => (
                <button key={c.id} className="combat-add__btn" onClick={() => addTokenFromCharacter(c.id)}>
                  <span className="combat-add__dot" style={{ background: c.isNPC ? "#d85f4e" : "#6fa5c4" }} />
                  {c.name}
                </button>
              ))}
              {isMaster && <button className="btn btn--ghost btn--sm" onClick={addBlankToken}>+ Token avulso</button>}
            </div>
          </div>

          {attacker && (
            <div className="combat-panel">
              <h4 className="combat-panel__title">Selecionado: {attacker.name}</h4>
              <div className="combat-target-row">
                <span>Alvo:</span>
                <strong style={{ color: target ? "var(--blood-300)" : "var(--text-500)" }}>{target?.name ?? "nenhum"}</strong>
              </div>
              {canControlSelected && (
                <button className="btn btn--danger combat-attack-btn" onClick={doAttack} disabled={!target}>⚔ Atacar</button>
              )}

              {(isMaster || attacker.characterId === myCharId) && (
                <div className="combat-hp-ctl">
                  <span>Vida:</span>
                  <button className="btn btn--sm" onClick={() => applyDamageToToken(attacker.id, -1)}>−1</button>
                  <button className="btn btn--sm" onClick={() => applyDamageToToken(attacker.id, -5)}>−5</button>
                  <button className="btn btn--sm" onClick={() => applyDamageToToken(attacker.id, +1)}>+1</button>
                  <button className="btn btn--sm" onClick={() => applyDamageToToken(attacker.id, +5)}>+5</button>
                </div>
              )}

              {isMaster && (
                <div className="combat-status-ctl">
                  {COMBAT_STATUSES.map((st) => (
                    <button
                      key={st}
                      className={`combat-status-chip ${attacker.status.includes(st) ? "is-on" : ""}`}
                      onClick={() => combat.patchToken(attacker.id, { status: attacker.status.includes(st) ? attacker.status.filter((x) => x !== st) : [...attacker.status, st] })}
                    >
                      {st}
                    </button>
                  ))}
                  <button className="btn btn--ghost btn--sm" onClick={() => { combat.removeToken(attacker.id); setSelectedId(null); }}>Remover token</button>
                </div>
              )}
            </div>
          )}

          <div className="combat-panel combat-panel--log">
            <h4 className="combat-panel__title">Registro de combate</h4>
            <div className="combat-log">
              {combatLog.length === 0 && <p className="dice-empty">Nenhuma ação registrada.</p>}
              {combatLog.map((e) => (
                <div key={e.id} className="combat-log__row">
                  <span className="combat-log__label">{e.label}</span>
                  {e.skill ? (
                    <span className={`dice-row__level dice-row__level--${e.skill.level}`}>{e.skill.roll} · {SUCCESS_LABELS[e.skill.level]}</span>
                  ) : (
                    <span className="num combat-log__dmg">{e.dice?.total}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
