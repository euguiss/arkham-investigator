import { useRef, useState, useCallback, useEffect } from "react";
import { nanoid } from "nanoid";
import { useStore } from "../store/useStore";
import { sync } from "../sync/SyncProvider";
import "./WhiteboardPage.css";

type ElementType = "note" | "image" | "pdf";
type Tool = "select" | "note" | "arrow" | "draw" | "pan";

interface BoardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  src?: string;
  color?: string;
  visibleToPlayers: boolean;
}

interface Arrow {
  id: string;
  fromId: string;
  toId: string;
  color: string;
}

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface BoardState {
  elements: BoardElement[];
  arrows: Arrow[];
  strokes: Stroke[];
}

const COLORS = ["#d4a24c", "#d85f4e", "#6fa5c4", "#9bbf7a", "#a97fd6", "#f4ecdd"];
const BOARD_KEY = "whiteboard";

export function WhiteboardPage() {
  const user = useStore((s) => s.currentUser)!;
  const isMaster = user.role === "master";

  const [board, setBoard] = useState<BoardState>(
    () => sync.load<BoardState>(BOARD_KEY) ?? { elements: [], arrows: [], strokes: [] },
  );
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(COLORS[0]);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [arrowFrom, setArrowFrom] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<Stroke | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number; resize: boolean } | null>(null);
  const panRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // sync entre abas
  useEffect(() => {
    const unsub = sync.subscribe((msg) => {
      if (msg.type === "patch:whiteboard") setBoard(msg.payload as BoardState);
    });
    return unsub;
  }, []);

  const commit = useCallback((next: BoardState) => {
    setBoard(next);
    sync.save(BOARD_KEY, next);
    sync.broadcast("patch:whiteboard", next);
  }, []);

  // Atualiza só o estado local (sem persistir) — usado durante arrasto.
  const commitLocal = useCallback((next: BoardState) => setBoard(next), []);
  const dirtyRef = useRef(false);

  // converte coordenada de tela → mundo (considerando pan+zoom)
  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current!.getBoundingClientRect();
      return {
        x: (clientX - rect.left - view.x) / view.zoom,
        y: (clientY - rect.top - view.y) / view.zoom,
      };
    },
    [view],
  );

  const visibleElements = board.elements.filter((e) => isMaster || e.visibleToPlayers);

  /* ---------- interação no canvas (fundo) ---------- */
  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    // CORREÇÃO: clique no fundo só cria nota se a ferramenta "note" estiver ativa.
    if (tool === "note") {
      const { x, y } = toWorld(e.clientX, e.clientY);
      const el: BoardElement = {
        id: nanoid(6), type: "note", x: x - 90, y: y - 60, w: 180, h: 120,
        text: "Nova anotação", color, visibleToPlayers: !isMaster,
      };
      commit({ ...board, elements: [...board.elements, el] });
      setSelectedId(el.id);
      setTool("select");
      return;
    }
    if (tool === "draw") {
      const { x, y } = toWorld(e.clientX, e.clientY);
      setDrawing({ id: nanoid(6), points: [{ x, y }], color, width: 3 });
      return;
    }
    if (tool === "pan" || tool === "select") {
      panRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      setSelectedId(null);
      setArrowFrom(null);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (drawing) {
      const { x, y } = toWorld(e.clientX, e.clientY);
      setDrawing({ ...drawing, points: [...drawing.points, { x, y }] });
      return;
    }
    if (dragRef.current) {
      const { id, dx, dy, resize } = dragRef.current;
      const { x, y } = toWorld(e.clientX, e.clientY);
      dirtyRef.current = true;
      commitLocal({
        ...board,
        elements: board.elements.map((el) => {
          if (el.id !== id) return el;
          if (resize) return { ...el, w: Math.max(60, x - el.x), h: Math.max(40, y - el.y) };
          return { ...el, x: x - dx, y: y - dy };
        }),
      });
      return;
    }
    if (panRef.current) {
      setView((v) => ({
        ...v,
        x: panRef.current!.vx + (e.clientX - panRef.current!.x),
        y: panRef.current!.vy + (e.clientY - panRef.current!.y),
      }));
    }
  };

  const onPointerUp = () => {
    if (drawing) {
      if (drawing.points.length > 1) commit({ ...board, strokes: [...board.strokes, drawing] });
      setDrawing(null);
    }
    // persiste uma única vez ao fim do arrasto
    if (dragRef.current && dirtyRef.current) commit(board);
    dirtyRef.current = false;
    dragRef.current = null;
    panRef.current = null;
  };

  /* ---------- interação em elementos ---------- */
  const onElementPointerDown = (e: React.PointerEvent, el: BoardElement) => {
    e.stopPropagation();
    if (tool === "arrow") {
      // CORREÇÃO: setas em qualquer elemento (nota/imagem/PDF), sem duplicar.
      if (!arrowFrom) {
        setArrowFrom(el.id);
      } else if (arrowFrom !== el.id) {
        const exists = board.arrows.some(
          (a) => (a.fromId === arrowFrom && a.toId === el.id) || (a.fromId === el.id && a.toId === arrowFrom),
        );
        if (!exists) {
          commit({ ...board, arrows: [...board.arrows, { id: nanoid(6), fromId: arrowFrom, toId: el.id, color }] });
        }
        setArrowFrom(null);
      }
      return;
    }
    if (tool === "select") {
      setSelectedId(el.id);
      const { x, y } = toWorld(e.clientX, e.clientY);
      dragRef.current = { id: el.id, dx: x - el.x, dy: y - el.y, resize: false };
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setView((v) => {
      const zoom = Math.max(0.2, Math.min(4, v.zoom * factor));
      return {
        zoom,
        x: mx - (mx - v.x) * (zoom / v.zoom),
        y: my - (my - v.y) * (zoom / v.zoom),
      };
    });
  };

  const uploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const isPdf = file.type === "application/pdf";
      const center = toWorld(window.innerWidth / 2, window.innerHeight / 2);
      const el: BoardElement = {
        id: nanoid(6), type: isPdf ? "pdf" : "image",
        x: center.x - 150, y: center.y - 100, w: 300, h: 220,
        src: reader.result as string, visibleToPlayers: !isMaster,
      };
      commit({ ...board, elements: [...board.elements, el] });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const elementCenter = (id: string) => {
    const el = board.elements.find((x) => x.id === id);
    return el ? { x: el.x + el.w / 2, y: el.y + el.h / 2 } : { x: 0, y: 0 };
  };

  const updateEl = (id: string, patch: Partial<BoardElement>) =>
    commit({ ...board, elements: board.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const deleteSelected = () => {
    if (!selectedId) return;
    commit({
      ...board,
      elements: board.elements.filter((e) => e.id !== selectedId),
      arrows: board.arrows.filter((a) => a.fromId !== selectedId && a.toId !== selectedId),
    });
    setSelectedId(null);
  };

  const TOOLS: { id: Tool; icon: string; label: string }[] = [
    { id: "select", icon: "⤤", label: "Selecionar" },
    { id: "pan", icon: "✋", label: "Mover tela" },
    { id: "note", icon: "🗒", label: "Nota" },
    { id: "arrow", icon: "↗", label: "Conectar" },
    { id: "draw", icon: "✎", label: "Desenhar" },
  ];

  return (
    <div className="wb">
      {/* toolbar compacta */}
      <div className="wb-toolbar">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`wb-tool ${tool === t.id ? "is-active" : ""}`}
            onClick={() => { setTool(t.id); setArrowFrom(null); }}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}
        <div className="wb-divider" />
        <button className="wb-tool" title="Imagem / PDF" onClick={() => fileRef.current?.click()}>🖼</button>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={uploadFile} />
        <div className="wb-divider" />
        <div className="wb-colors">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`wb-color ${color === c ? "is-active" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="wb-divider" />
        <button className="wb-tool wb-tool--danger" title="Limpar desenhos" onClick={() => commit({ ...board, strokes: [] })}>🧹</button>
        {selectedId && <button className="wb-tool wb-tool--danger" title="Apagar selecionado" onClick={deleteSelected}>🗑</button>}
        <div className="wb-zoom num">{Math.round(view.zoom * 100)}%</div>
      </div>

      {arrowFrom && <div className="wb-hint">Clique em outro elemento para conectar · ESC para cancelar</div>}

      <svg
        ref={svgRef}
        className={`wb-canvas wb-canvas--${tool}`}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--amber-500)" />
          </marker>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x={0} y={0} width="100%" height="100%" fill="url(#grid)" />

        <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
          {/* setas */}
          {board.arrows.map((a) => {
            const from = elementCenter(a.fromId);
            const to = elementCenter(a.toId);
            return (
              <line
                key={a.id}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={a.color} strokeWidth={2 / view.zoom} markerEnd="url(#arrowhead)"
                className="wb-arrow"
                onClick={(e) => { e.stopPropagation(); commit({ ...board, arrows: board.arrows.filter((x) => x.id !== a.id) }); }}
              />
            );
          })}

          {/* strokes */}
          {[...board.strokes, ...(drawing ? [drawing] : [])].map((s) => (
            <polyline
              key={s.id}
              points={s.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round"
            />
          ))}

          {/* elementos */}
          {visibleElements.map((el) => (
            <foreignObject
              key={el.id}
              x={el.x} y={el.y} width={el.w} height={el.h}
              className={`wb-el ${selectedId === el.id ? "is-selected" : ""} ${arrowFrom === el.id ? "is-arrow-source" : ""}`}
              onPointerDown={(e) => onElementPointerDown(e, el)}
            >
              <div className={`wb-el-inner wb-el--${el.type}`} style={el.type === "note" ? { borderColor: el.color } : undefined}>
                {el.type === "note" && (
                  <textarea
                    className="wb-note-text"
                    value={el.text}
                    onPointerDown={(e) => tool === "select" && e.stopPropagation()}
                    onChange={(e) => updateEl(el.id, { text: e.target.value })}
                    disabled={tool !== "select"}
                  />
                )}
                {el.type === "image" && <img src={el.src} alt="" draggable={false} />}
                {el.type === "pdf" && (
                  <object data={el.src} type="application/pdf" className="wb-pdf">
                    <div className="wb-pdf-fallback">📄 PDF</div>
                  </object>
                )}
                {isMaster && (
                  <button
                    className={`wb-vis ${el.visibleToPlayers ? "is-visible" : ""}`}
                    title={el.visibleToPlayers ? "Visível aos jogadores" : "Oculto (só Guardião)"}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => updateEl(el.id, { visibleToPlayers: !el.visibleToPlayers })}
                  >
                    {el.visibleToPlayers ? "👁" : "🚫"}
                  </button>
                )}
                {selectedId === el.id && tool === "select" && (
                  <div
                    className="wb-resize"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      dragRef.current = { id: el.id, dx: 0, dy: 0, resize: true };
                    }}
                  />
                )}
              </div>
            </foreignObject>
          ))}
        </g>
      </svg>
    </div>
  );
}
