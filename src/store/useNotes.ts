import { create } from "zustand";
import { nanoid } from "nanoid";
import { sync } from "../sync/SyncProvider";
import type { Note } from "../domain/notes";

const KEY = "notes";

interface NotesStore {
  notes: Record<string, Note>;
  setAll: (n: Record<string, Note>) => void;
  create: (folder?: string) => Note;
  update: (id: string, patch: Partial<Note>) => void;
  remove: (id: string) => void;
}

function persist(notes: Record<string, Note>) {
  sync.save(KEY, notes);
  sync.broadcast("patch:notes", notes);
}

export const useNotes = create<NotesStore>((set, get) => ({
  notes: sync.load<Record<string, Note>>(KEY) ?? {},

  setAll: (notes) => set({ notes }),

  create: (folder = "Geral") => {
    const note: Note = { id: nanoid(8), title: "Nova nota", content: "", folder, updatedAt: Date.now() };
    const notes = { ...get().notes, [note.id]: note };
    set({ notes });
    persist(notes);
    return note;
  },

  update: (id, patch) => {
    const cur = get().notes[id];
    if (!cur) return;
    const notes = { ...get().notes, [id]: { ...cur, ...patch, updatedAt: Date.now() } };
    set({ notes });
    persist(notes);
  },

  remove: (id) => {
    const notes = { ...get().notes };
    delete notes[id];
    set({ notes });
    persist(notes);
  },
}));

sync.subscribe((msg) => {
  if (msg.type === "patch:notes") useNotes.getState().setAll(msg.payload as Record<string, Note>);
});
