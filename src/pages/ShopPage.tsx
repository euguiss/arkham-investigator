import { useState, useMemo, useEffect } from "react";
import { nanoid } from "nanoid";
import { PageHeader } from "../components/layout/PageHeader";
import { Panel } from "../components/ui/Panel";
import { useStore } from "../store/useStore";
import { usePopup } from "../store/usePopup";
import { ITEM_CATEGORIES, seedCatalog } from "../domain/catalog";
import { applyItemEffects } from "../domain/applyEffect";
import type { Item, ItemEffect, ItemEffectType } from "../domain/types";
import "./ShopPage.css";

const EFFECT_LABELS: Record<ItemEffectType, string> = {
  heal: "Cura PV", damage: "Dano PV", sanRestore: "Restaura SAN", sanLoss: "Perde SAN",
  mpRestore: "Restaura PM", mpLoss: "Perde PM", buff: "Buff", ammo: "Munição",
};

export function ShopPage() {
  const user = useStore((s) => s.currentUser)!;
  const isMaster = user.role === "master";
  const shopItems = useStore((s) => s.shopItems);
  const setShopItems = useStore((s) => s.setShopItems);
  const myChar = useStore((s) => s.getMyCharacter());
  const patchCharacter = useStore((s) => s.patchCharacter);
  const showPopup = usePopup((s) => s.show);

  const [category, setCategory] = useState<string>("Todos");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);

  // semeia catálogo na primeira vez
  useEffect(() => {
    if (shopItems.length === 0) setShopItems(seedCatalog(() => nanoid(8)));
  }, [shopItems.length, setShopItems]);

  const creditRating = myChar?.finances.creditRating ?? 0;
  // desconto por nível de crédito: até 20% para crédito alto
  const discount = Math.min(0.2, creditRating / 500);

  const filtered = useMemo(
    () =>
      shopItems.filter(
        (i) =>
          (category === "Todos" || i.category === category) &&
          i.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [shopItems, category, query],
  );

  const [cart, setCart] = useState<Record<string, number>>({});
  const setQty = (id: string, qty: number) => setCart((c) => ({ ...c, [id]: Math.max(0, qty) }));

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = shopItems.find((i) => i.id === id);
    return sum + (item?.price ?? 0) * qty * (1 - discount);
  }, 0);

  const checkout = () => {
    if (!myChar) return;
    const toAdd: Item[] = [];
    for (const [id, qty] of Object.entries(cart)) {
      if (qty <= 0) continue;
      const base = shopItems.find((i) => i.id === id);
      if (base) toAdd.push({ ...base, id: nanoid(8), quantity: qty });
    }
    if (toAdd.length === 0) return;
    patchCharacter(myChar.id, { inventory: [...myChar.inventory, ...toAdd] });
    setCart({});
    showPopup({
      id: nanoid(), authorId: user.id, authorName: user.name, context: "standalone",
      label: "Compra realizada", kind: "dice", timestamp: Date.now(),
      dice: { expression: "loja", total: Math.round(cartTotal), breakdown: `${toAdd.length} itens adicionados` },
    });
  };

  /* ---- uso de item do inventário ---- */
  const useItem = (item: Item) => {
    if (!myChar) return;
    const { patch, messages } = applyItemEffects(myChar, item);
    const nextInventory = item.consumable
      ? myChar.inventory
          .map((i) => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i))
          .filter((i) => i.quantity > 0)
      : myChar.inventory;
    patchCharacter(myChar.id, { ...patch, inventory: nextInventory });
    showPopup({
      id: nanoid(), authorId: user.id, authorName: user.name, context: "sheet",
      label: `Usou ${item.name}`, kind: "dice", timestamp: Date.now(),
      dice: { expression: "item", total: 0, breakdown: messages.join(" · ") || "sem efeito" },
    });
  };

  /* ---- edição de item (mestre) ---- */
  const saveItem = (item: Item) => {
    const exists = shopItems.some((i) => i.id === item.id);
    setShopItems(exists ? shopItems.map((i) => (i.id === item.id ? item : i)) : [...shopItems, item]);
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="NPCs & Loja"
        subtitle={myChar ? `Nível de Crédito ${creditRating} · desconto de ${Math.round(discount * 100)}%` : "Catálogo de itens da ambientação."}
        actions={isMaster && <button className="btn btn--primary btn--sm" onClick={() => setEditing({ id: nanoid(8), name: "Novo item", category: "Equipamento", price: 1, quantity: 1, consumable: false, effects: [] })}>+ Criar item</button>}
      />

      <div className="page-scroll shop">
        <div className="shop__main">
          <div className="shop-filters">
            <input className="shop-search" placeholder="Buscar item…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="shop-cats">
              <button className={`shop-cat ${category === "Todos" ? "is-active" : ""}`} onClick={() => setCategory("Todos")}>Todos</button>
              {ITEM_CATEGORIES.map((c) => (
                <button key={c} className={`shop-cat ${category === c ? "is-active" : ""}`} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>
          </div>

          <div className="shop-grid">
            {filtered.map((item) => {
              const final = Math.round((item.price ?? 0) * (1 - discount) * 100) / 100;
              return (
                <div key={item.id} className="shop-card">
                  <div className="shop-card__head">
                    <h4>{item.name}</h4>
                    {isMaster && <button className="shop-card__edit" onClick={() => setEditing(item)}>✎</button>}
                  </div>
                  <span className="shop-card__cat">{item.category}</span>
                  {item.description && <p className="shop-card__desc">{item.description}</p>}
                  {item.effects.length > 0 && (
                    <div className="shop-card__effects">
                      {item.effects.map((e, i) => (
                        <span key={i} className="shop-effect">{e.description ?? `${EFFECT_LABELS[e.type]} ${e.amount}`}</span>
                      ))}
                    </div>
                  )}
                  <div className="shop-card__foot">
                    <span className="shop-card__price num">
                      ${final}
                      {discount > 0 && <s className="shop-card__old num">${item.price}</s>}
                    </span>
                    {myChar && (
                      <div className="shop-card__buy">
                        <button className="shop-step" onClick={() => setQty(item.id, (cart[item.id] ?? 0) - 1)}>−</button>
                        <span className="num">{cart[item.id] ?? 0}</span>
                        <button className="shop-step" onClick={() => setQty(item.id, (cart[item.id] ?? 0) + 1)}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="shop__side">
          <Panel title="Carrinho">
            {Object.entries(cart).filter(([, q]) => q > 0).length === 0 ? (
              <p className="dice-empty">Nada selecionado.</p>
            ) : (
              <div className="shop-cart">
                {Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => {
                  const item = shopItems.find((i) => i.id === id)!;
                  return (
                    <div key={id} className="shop-cart__row">
                      <span>{item.name} ×{qty}</span>
                      <span className="num">${Math.round((item.price ?? 0) * qty * (1 - discount))}</span>
                    </div>
                  );
                })}
                <div className="shop-cart__total num">
                  <span>Total</span><strong>${Math.round(cartTotal)}</strong>
                </div>
                <button className="btn btn--primary" style={{ width: "100%" }} onClick={checkout}>Comprar e adicionar à ficha</button>
              </div>
            )}
          </Panel>

          {myChar && (
            <Panel title="Meu inventário">
              {myChar.inventory.length === 0 ? (
                <p className="dice-empty">Inventário vazio.</p>
              ) : (
                <div className="shop-inv">
                  {myChar.inventory.map((item) => (
                    <div key={item.id} className="shop-inv__row">
                      <span className="shop-inv__name">{item.name} <span className="num">×{item.quantity}</span></span>
                      {item.effects.length > 0 && (
                        <button className="btn btn--sm" onClick={() => useItem(item)}>Usar</button>
                      )}
                      <button className="shop-inv__drop" title="Descartar" onClick={() => patchCharacter(myChar.id, { inventory: myChar.inventory.filter((i) => i.id !== item.id) })}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}
        </aside>
      </div>

      {editing && isMaster && (
        <ItemEditor item={editing} onSave={saveItem} onCancel={() => setEditing(null)} onDelete={() => { setShopItems(shopItems.filter((i) => i.id !== editing.id)); setEditing(null); }} />
      )}
    </>
  );
}

/* --------- editor de item (modal) --------- */
function ItemEditor({ item, onSave, onCancel, onDelete }: { item: Item; onSave: (i: Item) => void; onCancel: () => void; onDelete: () => void }) {
  const [draft, setDraft] = useState<Item>(item);
  const set = (p: Partial<Item>) => setDraft((d) => ({ ...d, ...p }));

  const addEffect = () => set({ effects: [...draft.effects, { type: "heal", amount: "1D4" }] });
  const setEffect = (idx: number, p: Partial<ItemEffect>) =>
    set({ effects: draft.effects.map((e, i) => (i === idx ? { ...e, ...p } : e)) });

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">Editar item</h3>
        <label className="modal-field"><span>Nome</span><input value={draft.name} onChange={(e) => set({ name: e.target.value })} /></label>
        <div className="modal-row">
          <label className="modal-field"><span>Categoria</span>
            <select value={draft.category} onChange={(e) => set({ category: e.target.value })}>
              {ITEM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="modal-field"><span>Preço ($)</span><input type="number" className="num" value={draft.price ?? 0} onChange={(e) => set({ price: +e.target.value })} /></label>
          <label className="modal-field modal-field--check"><input type="checkbox" checked={draft.consumable} onChange={(e) => set({ consumable: e.target.checked })} /><span>Consumível</span></label>
        </div>
        <label className="modal-field"><span>Descrição</span><textarea value={draft.description ?? ""} onChange={(e) => set({ description: e.target.value })} rows={2} /></label>

        <div className="modal-effects">
          <div className="modal-effects__head"><span>Efeitos automáticos</span><button className="btn btn--ghost btn--sm" onClick={addEffect}>+ efeito</button></div>
          {draft.effects.map((eff, i) => (
            <div key={i} className="modal-effect">
              <select value={eff.type} onChange={(e) => setEffect(i, { type: e.target.value as ItemEffectType })}>
                {Object.entries(EFFECT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input className="num" value={eff.amount} placeholder="1D4 ou 5" onChange={(e) => setEffect(i, { amount: e.target.value })} />
              <button className="shop-inv__drop" onClick={() => set({ effects: draft.effects.filter((_, x) => x !== i) })}>×</button>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn--danger btn--sm" onClick={onDelete}>Excluir</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn--ghost btn--sm" onClick={onCancel}>Cancelar</button>
          <button className="btn btn--primary btn--sm" onClick={() => onSave(draft)}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
