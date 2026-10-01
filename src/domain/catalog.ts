/* =============================================================
   Catálogo padrão de itens (ambientação 1920).
   Preços em dólares da época (referência de valor).
   ============================================================= */

import type { Item } from "./types";

export const ITEM_CATEGORIES = [
  "Armas",
  "Munição",
  "Cura & Medicina",
  "Equipamento",
  "Ocultismo",
  "Vestuário",
  "Consumíveis",
] as const;

type SeedItem = Omit<Item, "id">;

export const DEFAULT_CATALOG: SeedItem[] = [
  // Cura & Medicina
  {
    name: "Kit de Primeiros Socorros", category: "Cura & Medicina", price: 10, quantity: 1,
    consumable: true, description: "Restaura alguns pontos de vida fora de combate.",
    effects: [{ type: "heal", amount: "1D3", description: "Cura 1D3 PV" }],
  },
  {
    name: "Frasco de Laudâno", category: "Cura & Medicina", price: 2, quantity: 1,
    consumable: true, description: "Opiáceo calmante; alivia a sanidade abalada, mas vicia.",
    effects: [{ type: "sanRestore", amount: "1D4", description: "Restaura 1D4 Sanidade" }],
  },
  {
    name: "Dose de Morfina", category: "Cura & Medicina", price: 5, quantity: 1,
    consumable: true, description: "Analgésico potente.",
    effects: [{ type: "heal", amount: "1D4", description: "Cura 1D4 PV" }],
  },
  // Ocultismo
  {
    name: "Elixir Arcano", category: "Ocultismo", price: 50, quantity: 1,
    consumable: true, description: "Poção de origem incerta que restaura energia mística.",
    effects: [{ type: "mpRestore", amount: "1D6", description: "Restaura 1D6 Pontos de Magia" }],
  },
  {
    name: "Amuleto de Proteção", category: "Ocultismo", price: 25, quantity: 1,
    consumable: false, description: "Talismã que acalma a mente diante do indizível.",
    effects: [{ type: "buff", amount: "0", description: "+5% em testes de Sanidade (narrativo)" }],
  },
  // Consumíveis
  {
    name: "Cantil de Uísque", category: "Consumíveis", price: 3, quantity: 1,
    consumable: true, description: "Coragem líquida.",
    effects: [{ type: "sanRestore", amount: "1", description: "Restaura 1 Sanidade" }],
  },
  // Munição
  {
    name: "Caixa de Munição .38", category: "Munição", price: 2, quantity: 1,
    consumable: true, description: "50 cartuchos para revólver.",
    effects: [{ type: "ammo", amount: "6", description: "Recarrega a arma selecionada" }],
  },
  {
    name: "Cartuchos de Espingarda", category: "Munição", price: 4, quantity: 1,
    consumable: true, description: "Caixa de cartuchos calibre 12.",
    effects: [{ type: "ammo", amount: "2", description: "Recarrega a arma selecionada" }],
  },
  // Equipamento
  { name: "Lanterna", category: "Equipamento", price: 2, quantity: 1, consumable: false, description: "Ilumina ambientes escuros.", effects: [] },
  { name: "Corda (15 m)", category: "Equipamento", price: 1, quantity: 1, consumable: false, description: "Corda resistente.", effects: [] },
  { name: "Câmera Fotográfica", category: "Equipamento", price: 20, quantity: 1, consumable: false, description: "Registra evidências.", effects: [] },
  { name: "Pé de Cabra", category: "Equipamento", price: 1, quantity: 1, consumable: false, description: "Útil para arrombar e como arma improvisada.", effects: [] },
  // Armas (adicionam à ficha como item; a arma em si é configurada na ficha)
  { name: "Revólver .38", category: "Armas", price: 11, quantity: 1, consumable: false, description: "Arma de fogo leve e confiável.", effects: [] },
  { name: "Faca de Caça", category: "Armas", price: 2, quantity: 1, consumable: false, description: "Lâmina robusta.", effects: [] },
];

export function seedCatalog(makeId: () => string): Item[] {
  return DEFAULT_CATALOG.map((i) => ({ ...i, id: makeId() }));
}
