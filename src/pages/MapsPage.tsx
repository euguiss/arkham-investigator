import { useRef, useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import { useStore } from "../store/useStore";
import { sync } from "../sync/SyncProvider";
import { PageHeader } from "../components/layout/PageHeader";
import "./MapsPage.css";

interface GameMap {
  id: string;
  name: string;
  src: string;
  isPdf: boolean;
  visibleToPlayers: boolean;
}
interface MapStroke { id: string; mapId: string; points: { x: number; y: number }[]; color: string; }
interface MapsState { maps: GameMap[]; activeId: string | null; strokes: MapStroke[]; }

const KEY = "maps";
const COLORS = ["#d85f4e", "#d4a24c", "#6fa5c4", "#9bbf7a", "#f4ecdd"];

export function MapsPage() {
  const user = useStore((s) => s.currentUser)!;
  const isMaster = user.role === "master";

  const [state, setState] = useState<MapsState>(() => sync.load<MapsState>(KEY) ?? { maps: [], activeId: null, strokes: [] });
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [drawMode, setDrawMode] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [drawing, setDrawing] = useState<MapStroke | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const panRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  useEffect(() => {
    const unsub = sync.subscribe((m) => { if (m.type === "patch:maps") setState(m.payload as MapsState); });
    return unsub;
  }, []);

  const commit = useCallback((next: MapsState) => {
    setState(next); sync.save(KEY, next); sync.broadcast("patch:maps", next);
  }, []);

  const active = state.maps.find((m) => m.id === state.activeId);
  const visibleMap = active && (isMaster || active.visibleToPlayers) ? active : null;
  const mapStrokes = state.strokes.filter((s) => s.mapId === state.activeId);

  const toWorld = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (cx - r.left - view.x) / view.zoom, y: (cy - r.top - view.y) / view.zoom };
  };

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const m: GameMap = { id: nanoid(6), name: file.name.replace(/\.[^.]+$/, ""), src: reader.result as string, isPdf: file.type === "application/pdf", visibleToPlayers: false };
      commit({ ...state, maps: [...state.maps, m], activeId: m.id });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onDown = (e: React.PointerEvent) => {
    if (drawMode && isMaster) { const { x, y } = toWorld(e.clientX, e.clientY); setDrawing({ id: nanoid(6), mapId: state.activeId!, points: [{ x, y }], color }); return; }
    panRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  };
  const onMove = (e: React.PointerEvent) => {
    if (drawing) { const { x, y } = toWorld(e.clientX, e.clientY); setDrawing({ ...drawing, points: [...drawing.points, { x, y }] }); return; }
    if (panRef.current) setView((v) => ({ ...v, x: panRef.current!.vx + (e.clientX - panRef.current!.x), y: panRef.current!.vy + (e.clientY - panRef.current!.y) }));
  };
  const onUp = () => {
    if (drawing && drawing.points.length > 1) commit({ ...state, strokes: [...state.strokes, drawing] });
    setDrawing(null); panRef.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const r = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    setView((v) => { const zoom = Math.max(0.2, Math.min(6, v.zoom * factor)); return { zoom, x: mx - (mx - v.x) * (zoom / v.zoom), y: my - (my - v.y) * (zoom / v.zoom) }; });
  };

  return (
    <>
      <PageHeader
        title="Mapas"
        subtitle="Imagens e PDFs com alta qualidade no zoom. O Guardião controla o mapa ativo e a visibilidade."
        actions={isMaster && <button className="btn btn--primary btn--sm" onClick={() => fileRef.current?.click()}>+ Carregar mapa</button>}
      />
      <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={upload} />

      <div className="maps">
        {isMaster && (
          <aside className="maps-side">
            <h4 className="maps-side__title">Mapas</h4>
            {state.maps.length === 0 && <p className="dice-empty">Nenhum mapa.</p>}
            {state.maps.map((m) => (
              <div key={m.id} className={`maps-item ${state.activeId === m.id ? "is-active" : ""}`}>
                <button className="maps-item__name" onClick={() => { commit({ ...state, activeId: m.id }); setView({ x: 0, y: 0, zoom: 1 }); }}>
                  {m.isPdf ? "📄" : "🗺"} {m.name}
                </button>
                <button className={`maps-item__eye ${m.visibleToPlayers ? "is-on" : ""}`} title={m.visibleToPlayers ? "Visível" : "Oculto"} onClick={() => commit({ ...state, maps: state.maps.map((x) => x.id === m.id ? { ...x, visibleToPlayers: !x.visibleToPlayers } : x) })}>
                  {m.visibleToPlayers ? "👁" : "🚫"}
                </button>
                <button className="shop-inv__drop" onClick={() => commit({ ...state, maps: state.maps.filter((x) => x.id !== m.id), activeId: state.activeId === m.id ? null : state.activeId })}>×</button>
              </div>
            ))}

            <div className="maps-draw">
              <button className={`btn btn--sm ${drawMode ? "btn--primary" : "btn--ghost"}`} onClick={() => setDrawMode((v) => !v)}>✎ Desenhar</button>
              <div className="wb-colors maps-colors">
                {COLORS.map((c) => <button key={c} className={`wb-color ${color === c ? "is-active" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />)}
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => commit({ ...state, strokes: state.strokes.filter((s) => s.mapId !== state.activeId) })}>🧹 Limpar</button>
            </div>
          </aside>
        )}

        <div className="maps-canvas-wrap">
          <div className="maps-zoom num">{Math.round(view.zoom * 100)}%</div>
          <svg ref={svgRef} className={`maps-canvas ${drawMode ? "is-draw" : ""}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onWheel={onWheel}>
            <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
              {visibleMap && (
                visibleMap.isPdf ? (
                  <foreignObject x={0} y={0} width={900} height={1200}>
                    <object data={visibleMap.src} type="application/pdf" style={{ width: "900px", height: "1200px", border: "none" }}>
                      <div className="wb-pdf-fallback">📄 {visibleMap.name}</div>
                    </object>
                  </foreignObject>
                ) : (
                  <image href={visibleMap.src} x={0} y={0} style={{ imageRendering: "auto" }} />
                )
              )}
              {[...mapStrokes, ...(drawing ? [drawing] : [])].map((s) => (
                <polyline key={s.id} points={s.points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={s.color} strokeWidth={3 / view.zoom} strokeLinecap="round" />
              ))}
            </g>
          </svg>
          {!visibleMap && <div className="maps-empty">{isMaster ? "Carregue um mapa e selecione-o." : "O Guardião ainda não revelou nenhum mapa."}</div>}
        </div>
      </div>
    </>
  );
}
