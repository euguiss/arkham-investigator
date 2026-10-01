import { useState, useMemo } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { useNotes } from "../store/useNotes";
import { renderMarkdown, extractLinks } from "../domain/notes";
import type { Note } from "../domain/notes";
import "./NotesPage.css";

export function NotesPage() {
  const notes = useNotes((s) => s.notes);
  const create = useNotes((s) => s.create);
  const update = useNotes((s) => s.update);
  const remove = useNotes((s) => s.remove);

  const list = Object.values(notes).sort((a, b) => b.updatedAt - a.updatedAt);
  const [selectedId, setSelectedId] = useState<string | null>(list[0]?.id ?? null);
  const [mode, setMode] = useState<"edit" | "view">("view");
  const [dragId, setDragId] = useState<string | null>(null);

  const current = selectedId ? notes[selectedId] : undefined;

  const folders = useMemo(() => {
    const map: Record<string, Note[]> = {};
    for (const n of list) (map[n.folder] ??= []).push(n);
    return map;
  }, [list]);

  const resolveTitle = (title: string) => list.some((n) => n.title.toLowerCase() === title.toLowerCase());
  const openByTitle = (title: string) => {
    const found = list.find((n) => n.title.toLowerCase() === title.toLowerCase());
    if (found) { setSelectedId(found.id); setMode("view"); }
    else { const n = create(current?.folder ?? "Geral"); update(n.id, { title }); setSelectedId(n.id); setMode("edit"); }
  };

  const backlinks = useMemo(() => {
    if (!current) return [];
    return list.filter((n) => n.id !== current.id && extractLinks(n.content).some((l) => l.toLowerCase() === current.title.toLowerCase()));
  }, [current, list]);

  const html = current ? renderMarkdown(current.content, resolveTitle) : "";

  return (
    <>
      <PageHeader
        title="Notas"
        subtitle="Markdown com links [[internos]] e backlinks automáticos."
        actions={<button className="btn btn--primary btn--sm" onClick={() => { const n = create(); setSelectedId(n.id); setMode("edit"); }}>+ Nova nota</button>}
      />
      <div className="notes">
        {/* explorador */}
        <aside className="notes-tree">
          {Object.entries(folders).map(([folder, items]) => (
            <div key={folder} className="notes-folder" onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragId) update(dragId, { folder }); setDragId(null); }}>
              <div className="notes-folder__name">📁 {folder}</div>
              {items.map((n) => (
                <button
                  key={n.id}
                  className={`notes-item ${selectedId === n.id ? "is-active" : ""}`}
                  draggable
                  onDragStart={() => setDragId(n.id)}
                  onClick={() => { setSelectedId(n.id); setMode("view"); }}
                >
                  📄 {n.title}
                </button>
              ))}
            </div>
          ))}
          {list.length === 0 && <p className="dice-empty">Nenhuma nota ainda.</p>}
        </aside>

        {/* editor / visualizador */}
        <div className="notes-main">
          {current ? (
            <>
              <div className="notes-toolbar">
                <input className="notes-title" value={current.title} onChange={(e) => update(current.id, { title: e.target.value })} />
                <input className="notes-folder-input" value={current.folder} onChange={(e) => update(current.id, { folder: e.target.value })} title="Pasta" />
                <div className="notes-mode">
                  <button className={mode === "edit" ? "is-active" : ""} onClick={() => setMode("edit")}>Editar</button>
                  <button className={mode === "view" ? "is-active" : ""} onClick={() => setMode("view")}>Ver</button>
                </div>
                <button className="shop-inv__drop" onClick={() => { remove(current.id); setSelectedId(null); }}>🗑</button>
              </div>

              {mode === "edit" ? (
                <textarea
                  className="notes-editor"
                  value={current.content}
                  onChange={(e) => update(current.id, { content: e.target.value })}
                  placeholder={"# Título\n\nEscreva em **markdown**.\n\nUse [[Outra nota]] para conectar ideias."}
                />
              ) : (
                <div
                  className="notes-render md"
                  dangerouslySetInnerHTML={{ __html: html }}
                  onClick={(e) => {
                    const t = (e.target as HTMLElement).dataset.link;
                    if (t) openByTitle(t);
                  }}
                />
              )}

              {backlinks.length > 0 && (
                <div className="notes-backlinks">
                  <h4>↩ Backlinks</h4>
                  {backlinks.map((b) => (
                    <button key={b.id} className="notes-backlink" onClick={() => { setSelectedId(b.id); setMode("view"); }}>{b.title}</button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="notes-empty-state">Selecione ou crie uma nota.</div>
          )}
        </div>
      </div>
    </>
  );
}
