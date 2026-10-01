import { useState, useRef } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Panel } from "../components/ui/Panel";
import { ResourcePips } from "../components/sheet/ResourcePips";
import { CharacteristicGrid } from "../components/sheet/CharacteristicGrid";
import { SkillList } from "../components/sheet/SkillList";
import { WeaponTable } from "../components/sheet/WeaponTable";
import { useStore } from "../store/useStore";
import { usePopup } from "../store/usePopup";
import { useRoller } from "../hooks/useRoller";
import { nanoid } from "nanoid";
import {
  maxHP,
  maxSAN,
  maxMP,
  damageAndBuild,
  movementRate,
  improvementRoll,
  half,
  fifth,
} from "../domain/cocRules";
import { buildDefaultSkills } from "../domain/factory";
import { CHARACTERISTIC_LABELS } from "../domain/types";
import type { Character, Skill, Weapon, CharacteristicKey } from "../domain/types";
import "./SheetPage.css";

const BACKSTORY_FIELDS: { key: keyof Character["backstory"]; label: string }[] = [
  { key: "personalDescription", label: "Descrição pessoal" },
  { key: "ideologyBeliefs", label: "Ideologia e crenças" },
  { key: "significantPeople", label: "Pessoas significativas" },
  { key: "meaningfulLocations", label: "Locais importantes" },
  { key: "treasuredPossessions", label: "Posses preciosas" },
  { key: "traits", label: "Características" },
  { key: "injuriesScars", label: "Ferimentos e cicatrizes" },
  { key: "phobiasManias", label: "Fobias e manias" },
  { key: "arcaneTomesSpells", label: "Tomos arcanos e magias" },
  { key: "encountersWithEntities", label: "Encontros com entidades" },
];

export function SheetPage() {
  const user = useStore((s) => s.currentUser)!;
  const myChar = useStore((s) => s.getMyCharacter());
  const characters = useStore((s) => s.characters);
  const patchCharacter = useStore((s) => s.patchCharacter);
  const showPopup = usePopup((s) => s.show);
  const { skill, dice } = useRoller();

  // Mestre pode escolher qualquer ficha; jogador vê a sua
  const editableIds = Object.values(characters).filter(
    (c) => c.ownerId === user.id || user.role === "master",
  );
  const [selectedId, setSelectedId] = useState<string | null>(myChar?.id ?? editableIds[0]?.id ?? null);
  const char = selectedId ? characters[selectedId] : myChar;

  const [improvementMode, setImprovementMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!char) {
    return (
      <>
        <PageHeader title="Fichas" />
        <div className="page-scroll"><p className="sheet-empty">Nenhuma ficha disponível.</p></div>
      </>
    );
  }

  const canEdit = char.ownerId === user.id || user.role === "master";
  const patch = (p: Partial<Character>) => patchCharacter(char.id, p);

  // --- derivados recalculados ao mudar característica ---
  const applyCharacteristic = (key: CharacteristicKey, value: number) => {
    const characteristics = { ...char.characteristics, [key]: value };
    const next: Partial<Character> = { characteristics };
    // recalcula máximos mantendo proporção do atual (clamp)
    if (key === "CON" || key === "SIZ") {
      const m = maxHP(characteristics);
      next.hp = { max: m, current: Math.min(char.hp.current, m) };
    }
    if (key === "POW") {
      const sMax = maxSAN(characteristics);
      const mMax = maxMP(characteristics);
      next.san = { max: sMax, current: Math.min(char.san.current, sMax) };
      next.mp = { max: mMax, current: Math.min(char.mp.current, mMax) };
    }
    patch(next);
  };

  const rollCharacteristic = (key: CharacteristicKey, value: number) => {
    const entry = skill(`${CHARACTERISTIC_LABELS[key].pt} (${value}%)`, value, 0, "sheet");
    showPopup(entry);
  };

  const rollSkillNow = (s: Skill) => {
    const entry = skill(`${s.name} (${s.value}%)`, s.value, 0, "sheet");
    showPopup(entry);
    // marca para evolução em sucesso (regra: pode evoluir se passou)
    if (entry.skill && entry.skill.level !== "fail" && entry.skill.level !== "fumble") {
      patch({ skills: char.skills.map((x) => (x.id === s.id ? { ...x, flaggedForImprovement: true } : x)) });
    }
  };

  const improveSkill = (s: Skill) => {
    const { roll, improved, gain } = improvementRoll(s.value);
    const label = improved ? `${s.name}: evoluiu +${gain}! (d100=${roll})` : `${s.name}: sem evolução (d100=${roll})`;
    patch({
      skills: char.skills.map((x) =>
        x.id === s.id ? { ...x, value: Math.min(99, x.value + gain), flaggedForImprovement: false } : x,
      ),
    });
    showPopup({
      id: nanoid(), authorId: user.id, authorName: user.name, context: "sheet",
      label, kind: "dice", timestamp: Date.now(),
      dice: { expression: "evolução", total: s.value + gain, breakdown: `${s.value} → ${s.value + gain}` },
    });
  };

  const attack = (w: Weapon, difficulty: "regular" | "hard" | "extreme") => {
    const sv = char.skills.find((s) => s.id === w.skillId)?.value ?? 25;
    const target = difficulty === "regular" ? sv : difficulty === "hard" ? half(sv) : fifth(sv);
    // consome munição
    if (w.ammoCapacity != null) {
      if ((w.ammoCurrent ?? 0) <= 0) return;
      patch({ weapons: char.weapons.map((x) => (x.id === w.id ? { ...x, ammoCurrent: (x.ammoCurrent ?? 0) - 1 } : x)) });
    }
    const diffLabel = difficulty === "regular" ? "" : difficulty === "hard" ? " Difícil" : " Extremo";
    const entry = skill(`Ataque: ${w.name}${diffLabel}`, target, 0, "sheet");
    showPopup(entry);
  };

  const rollDamage = (w: Weapon) => {
    const db = damageAndBuild(char.characteristics).damageBonus;
    const expr = w.addsDamageBonus && db !== "0" ? `${w.damage}${db}` : w.damage;
    const entry = dice(`Dano: ${w.name}`, expr, "sheet", "damage");
    showPopup(entry);
  };

  const addWeapon = () => {
    const brawl = char.skills.find((s) => s.name.includes("Brigar"))?.id ?? char.skills[0]?.id ?? "";
    const w: Weapon = {
      id: nanoid(6), name: "Nova arma", skillId: brawl, damage: "1D6",
      addsDamageBonus: false, range: "corpo-a-corpo", attacksPerRound: 1,
    };
    patch({ weapons: [...char.weapons, w] });
  };

  const onPortrait = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch({ portrait: reader.result as string });
    reader.readAsDataURL(file);
  };

  const db = damageAndBuild(char.characteristics);
  const mov = movementRate(char.characteristics, char.age ?? 30);

  return (
    <>
      <PageHeader
        title="Ficha de Investigador"
        subtitle="Clique em características, perícias e armas para rolar automaticamente."
        actions={
          <>
            {editableIds.length > 1 && (
              <select
                className="sheet-select"
                value={char.id}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {editableIds.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isNPC ? "(NPC)" : ""}
                  </option>
                ))}
              </select>
            )}
            <button
              className={`btn btn--sm ${improvementMode ? "btn--primary" : "btn--ghost"}`}
              onClick={() => setImprovementMode((v) => !v)}
              title="Modo evolução: clique nas perícias marcadas (◆) para rolar ganho"
            >
              {improvementMode ? "Evolução ativa ↑" : "Evoluir perícias"}
            </button>
          </>
        }
      />

      <div className="page-scroll sheet">
        {/* Coluna identidade */}
        <div className="sheet__col sheet__col--identity">
          <Panel title="Investigador">
            <div className="sheet-portrait" onClick={() => canEdit && fileRef.current?.click()}>
              {char.portrait ? (
                <img src={char.portrait} alt={char.name} />
              ) : (
                <div className="sheet-portrait__placeholder">{canEdit ? "+ retrato" : "sem retrato"}</div>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPortrait} />
            </div>

            <div className="sheet-identity">
              {([
                ["name", "Nome"],
                ["occupation", "Ocupação"],
                ["age", "Idade"],
                ["residence", "Residência"],
                ["birthplace", "Local de nascimento"],
              ] as const).map(([field, label]) => (
                <label key={field} className="sheet-id-field">
                  <span>{label}</span>
                  <input
                    disabled={!canEdit}
                    value={(char as any)[field] ?? ""}
                    onChange={(e) =>
                      patch({ [field]: field === "age" ? +e.target.value || 0 : e.target.value } as Partial<Character>)
                    }
                  />
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="Recursos">
            <div className="sheet-resources">
              <ResourcePips label="PV" pool={char.hp} tone="hp" editable={canEdit} onChange={(hp) => patch({ hp })} />
              <ResourcePips label="SAN" pool={char.san} tone="san" editable={canEdit} onChange={(san) => patch({ san })} />
              <ResourcePips label="PM" pool={char.mp} tone="mp" editable={canEdit} onChange={(mp) => patch({ mp })} />
              <ResourcePips
                label="Sorte"
                pool={{ current: char.luck, max: 99 }}
                tone="luck"
                editable={canEdit}
                onChange={(p) => patch({ luck: p.current })}
              />
            </div>
            <div className="sheet-derived num">
              <div><span>Bônus de Dano</span><strong>{db.damageBonus}</strong></div>
              <div><span>Corpo</span><strong>{db.build > 0 ? `+${db.build}` : db.build}</strong></div>
              <div><span>MOV</span><strong>{mov}</strong></div>
            </div>
          </Panel>
        </div>

        {/* Coluna central: características + armas */}
        <div className="sheet__col">
          <Panel title="Características">
            <CharacteristicGrid
              characteristics={char.characteristics}
              editable={canEdit}
              onChange={applyCharacteristic}
              onRoll={rollCharacteristic}
            />
          </Panel>

          <Panel title="Armas & Combate" accent="blood">
            <WeaponTable
              weapons={char.weapons}
              skills={char.skills}
              characteristics={char.characteristics}
              editable={canEdit}
              onAttack={attack}
              onDamage={rollDamage}
              onEdit={(id, p) => patch({ weapons: char.weapons.map((w) => (w.id === id ? { ...w, ...p } : w)) })}
              onRemove={(id) => patch({ weapons: char.weapons.filter((w) => w.id !== id) })}
              onAdd={addWeapon}
            />
          </Panel>

          <Panel title="Finanças">
            <div className="sheet-finance">
              <label className="sheet-id-field">
                <span>Nível de Crédito</span>
                <input
                  type="number"
                  className="num"
                  disabled={!canEdit}
                  value={char.finances.creditRating}
                  onChange={(e) => patch({ finances: { ...char.finances, creditRating: +e.target.value } })}
                />
              </label>
              <label className="sheet-id-field">
                <span>Dinheiro em mãos</span>
                <input
                  type="number"
                  className="num"
                  disabled={!canEdit}
                  value={char.finances.cash ?? 0}
                  onChange={(e) => patch({ finances: { ...char.finances, cash: +e.target.value } })}
                />
              </label>
            </div>
          </Panel>
        </div>

        {/* Coluna perícias */}
        <div className="sheet__col">
          <Panel title="Perícias" accent="amber">
            <SkillList
              skills={char.skills}
              editable={canEdit}
              improvementMode={improvementMode}
              onRoll={rollSkillNow}
              onEdit={(id, p) => patch({ skills: char.skills.map((s) => (s.id === id ? { ...s, ...p } : s)) })}
              onToggleFlag={(id) =>
                patch({
                  skills: char.skills.map((s) =>
                    s.id === id ? { ...s, flaggedForImprovement: !s.flaggedForImprovement } : s,
                  ),
                })
              }
              onImprove={improveSkill}
            />
            {canEdit && (
              <button
                className="btn btn--ghost btn--sm sheet-reset-skills"
                onClick={() => patch({ skills: buildDefaultSkills(char.characteristics) })}
              >
                ↺ Restaurar perícias padrão
              </button>
            )}
          </Panel>
        </div>

        {/* Antecedentes (largura total) */}
        <div className="sheet__col sheet__col--full">
          <Panel title="Antecedentes">
            <div className="sheet-backstory">
              {BACKSTORY_FIELDS.map(({ key, label }) => (
                <label key={key} className="sheet-backstory__field">
                  <span>{label}</span>
                  <textarea
                    disabled={!canEdit}
                    value={char.backstory[key] ?? ""}
                    onChange={(e) => patch({ backstory: { ...char.backstory, [key]: e.target.value } })}
                    rows={2}
                  />
                </label>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
