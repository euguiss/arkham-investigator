import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { useNotes } from "../store/useNotes";
import { extractLinks } from "../domain/notes";
import "./ConnectionsPage.css";

interface GNode { id: string; title: string; x: number; y: number; vx: number; vy: number; degree: number; }
interface GEdge { from: string; to: string; }

export function ConnectionsPage() {
  const notes = useNotes((s) => s.notes);
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<GNode[]>([]);
  const edgesRef = useRef<GEdge[]>([]);
  const nodesRef = useRef<GNode[]>([]);
  const rafRef = useRef<number>(0);
  const dragRef = useRef<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<string | null>(null);

  // monta grafo a partir das notas
  useEffect(() => {
    const list = Object.values(notes);
    const byTitle = new Map(list.map((n) => [n.title.toLowerCase(), n.id]));
    const edges: GEdge[] = [];
    const degree: Record<string, number> = {};
    for (const n of list) {
      for (const link of extractLinks(n.content)) {
        const toId = byTitle.get(link.toLowerCase());
        if (toId && toId !== n.id) {
          edges.push({ from: n.id, to: toId });
          degree[n.id] = (degree[n.id] ?? 0) + 1;
          degree[toId] = (degree[toId] ?? 0) + 1;
        }
      }
    }
    const w = 800, h = 500;
    const built = list.map((n, i) => {
      const angle = (i / Math.max(1, list.length)) * Math.PI * 2;
      return {
        id: n.id, title: n.title,
        x: w / 2 + Math.cos(angle) * 180, y: h / 2 + Math.sin(angle) * 180,
        vx: 0, vy: 0, degree: degree[n.id] ?? 0,
      };
    });
    edgesRef.current = edges;
    nodesRef.current = built;
    setNodes(built);
  }, [notes]);

  // simulação força-dirigida
  useEffect(() => {
    const w = 800, h = 500;
    const tick = () => {
      const ns = nodesRef.current;
      const es = edgesRef.current;
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i], b = ns[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let dist = Math.hypot(dx, dy) || 1;
          const rep = 4000 / (dist * dist);
          dx /= dist; dy /= dist;
          a.vx += dx * rep; a.vy += dy * rep;
          b.vx -= dx * rep; b.vy -= dy * rep;
        }
      }
      for (const e of es) {
        const a = ns.find((n) => n.id === e.from), b = ns.find((n) => n.id === e.to);
        if (!a || !b) continue;
        let dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const spring = (dist - 120) * 0.01;
        dx /= dist; dy /= dist;
        a.vx += dx * spring; a.vy += dy * spring;
        b.vx -= dx * spring; b.vy -= dy * spring;
      }
      for (const n of ns) {
        if (dragRef.current === n.id) { n.vx = 0; n.vy = 0; continue; }
        // atração ao centro
        n.vx += (w / 2 - n.x) * 0.002;
        n.vy += (h / 2 - n.y) * 0.002;
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += n.vx; n.y += n.vy;
      }
      setNodes([...ns]);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const toSvg = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * 800, y: ((clientY - r.top) / r.height) * 500 };
  };

  return (
    <>
      <PageHeader title="Conexões" subtitle="Grafo das notas conectadas por links [[internos]]. Clique para abrir, arraste para reorganizar." />
      <div className="connections">
        {nodes.length === 0 ? (
          <div className="connections-empty">Crie notas com links [[internos]] para ver o grafo de conexões.</div>
        ) : (
          <svg
            ref={svgRef}
            viewBox="0 0 800 500"
            className="connections-svg"
            onPointerMove={(e) => {
              if (dragRef.current) {
                const p = toSvg(e.clientX, e.clientY);
                const n = nodesRef.current.find((x) => x.id === dragRef.current);
                if (n) { n.x = p.x; n.y = p.y; }
              }
            }}
            onPointerUp={() => (dragRef.current = null)}
            onPointerLeave={() => (dragRef.current = null)}
          >
            {edgesRef.current.map((e, i) => {
              const a = nodes.find((n) => n.id === e.from), b = nodes.find((n) => n.id === e.to);
              if (!a || !b) return null;
              const active = hover === e.from || hover === e.to;
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active ? "var(--amber-500)" : "var(--border-strong)"} strokeWidth={active ? 2 : 1} />;
            })}
            {nodes.map((n) => {
              const r = 10 + n.degree * 3;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x} ${n.y})`}
                  className="connections-node"
                  onPointerDown={() => (dragRef.current = n.id)}
                  onClick={() => navigate("/notas")}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                >
                  <circle r={r} fill={hover === n.id ? "var(--amber-500)" : "var(--arcane-500)"} stroke="var(--ink-900)" strokeWidth={2} />
                  <text y={r + 14} textAnchor="middle" fontSize="12" fill="var(--text-200)" fontFamily="var(--font-serif)">{n.title}</text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </>
  );
}
