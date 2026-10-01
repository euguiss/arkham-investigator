import type { Weapon, Skill, Characteristics } from "../../domain/types";
import { half, fifth, damageAndBuild } from "../../domain/cocRules";
import "./WeaponTable.css";

interface Props {
  weapons: Weapon[];
  skills: Skill[];
  characteristics: Characteristics;
  editable: boolean;
  onAttack: (weapon: Weapon, difficulty: "regular" | "hard" | "extreme") => void;
  onDamage: (weapon: Weapon) => void;
  onEdit: (id: string, patch: Partial<Weapon>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

export function WeaponTable({
  weapons,
  skills,
  characteristics,
  editable,
  onAttack,
  onDamage,
  onEdit,
  onRemove,
  onAdd,
}: Props) {
  const db = damageAndBuild(characteristics).damageBonus;
  const skillValue = (id: string) => skills.find((s) => s.id === id)?.value ?? 25;

  return (
    <div className="weapons">
      <div className="weapons__header">
        <span>Arma</span>
        <span className="num">Reg</span>
        <span className="num">Dif</span>
        <span className="num">Ext</span>
        <span>Dano</span>
        <span>Mun.</span>
        <span />
      </div>

      {weapons.map((w) => {
        const sv = skillValue(w.skillId);
        const noAmmo = w.ammoCapacity != null && (w.ammoCurrent ?? 0) <= 0;
        return (
          <div key={w.id} className={`weapon-row ${noAmmo ? "is-empty" : ""}`}>
            {editable ? (
              <input className="weapon-name-input" value={w.name} onChange={(e) => onEdit(w.id, { name: e.target.value })} />
            ) : (
              <span className="weapon-name">{w.name}</span>
            )}

            <button className="weapon-hit num" disabled={noAmmo} onClick={() => onAttack(w, "regular")}>{sv}</button>
            <button className="weapon-hit num" disabled={noAmmo} onClick={() => onAttack(w, "hard")}>{half(sv)}</button>
            <button className="weapon-hit num" disabled={noAmmo} onClick={() => onAttack(w, "extreme")}>{fifth(sv)}</button>

            <button className="weapon-dmg num" onClick={() => onDamage(w)} title="Rolar dano">
              {w.damage}
              {w.addsDamageBonus && db !== "0" ? db : ""}
            </button>

            <span className="weapon-ammo num">
              {w.ammoCapacity != null ? (
                <>
                  <span className={noAmmo ? "is-empty-text" : ""}>{w.ammoCurrent ?? 0}</span>
                  <span className="weapon-ammo__sep">/{w.ammoCapacity}</span>
                  {editable && (
                    <button
                      className="weapon-reload"
                      title="Recarregar"
                      onClick={() => onEdit(w.id, { ammoCurrent: w.ammoCapacity })}
                    >
                      ↻
                    </button>
                  )}
                </>
              ) : (
                <span className="weapon-ammo__melee">—</span>
              )}
            </span>

            {editable && (
              <button className="weapon-remove" onClick={() => onRemove(w.id)} title="Remover">×</button>
            )}
          </div>
        );
      })}

      {editable && (
        <button className="btn btn--ghost btn--sm weapons__add" onClick={onAdd}>+ Adicionar arma</button>
      )}

      {weapons.some((w) => w.ammoCapacity != null && (w.ammoCurrent ?? 0) <= 0) && (
        <p className="weapons__warn">⚠ Arma sem munição não pode atacar — recarregue (↻).</p>
      )}
    </div>
  );
}
