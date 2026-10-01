/* =============================================================
   Fábrica de slices sincronizados.
   Cada "coleção" persiste em localStorage e propaga mudanças
   para outras abas/clientes via a camada de sync.
   ============================================================= */

import { sync } from "../sync/SyncProvider";

export function broadcastPatch(collection: string, data: unknown): void {
  sync.save(collection, data);
  sync.broadcast(`patch:${collection}`, data);
}
