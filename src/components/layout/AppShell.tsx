import { NavLink, Outlet } from "react-router-dom";
import { useStore } from "../../store/useStore";
import "./AppShell.css";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  masterOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: "/notas", label: "Notas", icon: "📓" },
  { to: "/quadro", label: "Quadro", icon: "🧵" },
  { to: "/fichas", label: "Fichas", icon: "🧾" },
  { to: "/dados", label: "Dados", icon: "🎲" },
  { to: "/conexoes", label: "Conexões", icon: "🕸️" },
  { to: "/mapas", label: "Mapas", icon: "🗺️" },
  { to: "/combate", label: "Combate", icon: "⚔️" },
  { to: "/loja", label: "NPCs & Loja", icon: "🧰" },
  { to: "/mestre", label: "Área do Guardião", icon: "🜨", masterOnly: true },
];

export function AppShell() {
  const user = useStore((s) => s.currentUser)!;
  const users = useStore((s) => s.users);
  const logout = useStore((s) => s.logout);
  const online = Object.values(users).filter((u) => u.online);

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__brand">
          <span className="shell__brand-crest">⬦</span>
          <div>
            <div className="shell__brand-title">Arkham</div>
            <div className="shell__brand-sub">Investigator</div>
          </div>
        </div>

        <nav className="shell__nav">
          {NAV.filter((n) => !n.masterOnly || user.role === "master").map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `shell__nav-item ${isActive ? "is-active" : ""} ${n.masterOnly ? "shell__nav-item--master" : ""}`
              }
            >
              <span className="shell__nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shell__presence">
          <div className="shell__presence-title">Na mesa ({online.length})</div>
          {online.map((u) => (
            <div key={u.id} className="shell__presence-user">
              <span className="shell__presence-dot" style={{ background: u.color }} />
              <span>{u.name}</span>
              {u.role === "master" && <span className="shell__presence-tag">#guardião</span>}
            </div>
          ))}
        </div>

        <div className="shell__account">
          <span className="shell__presence-dot" style={{ background: user.color }} />
          <span className="shell__account-name">{user.name}</span>
          <button className="shell__logout" onClick={logout} title="Sair">
            ⏻
          </button>
        </div>
      </aside>

      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  );
}
