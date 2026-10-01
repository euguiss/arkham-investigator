import { useState } from "react";
import { useStore, MASTER_PASSWORD } from "../../store/useStore";
import "./LoginScreen.css";

export function LoginScreen() {
  const login = useStore((s) => s.login);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"player" | "master">("player");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Informe seu nome, investigador.");
      return;
    }
    if (role === "master" && password !== MASTER_PASSWORD) {
      setError("Senha do Guardião incorreta.");
      return;
    }
    login(trimmed, role);
  };

  return (
    <div className="login">
      <div className="login__vignette" />
      <form className="login__card" onSubmit={submit}>
        <div className="login__crest">⬦</div>
        <h1 className="login__title">Arkham Investigator</h1>
        <p className="login__subtitle">Máscaras de Nyarlathotep · Call of Cthulhu 7ª Ed.</p>

        <label className="login__field">
          <span>Nome</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex.: Harvey Walters"
          />
        </label>

        <div className="login__roles">
          <button
            type="button"
            className={`login__role ${role === "player" ? "is-active" : ""}`}
            onClick={() => setRole("player")}
          >
            <span className="login__role-icon">👁</span>
            Investigador
          </button>
          <button
            type="button"
            className={`login__role login__role--master ${role === "master" ? "is-active" : ""}`}
            onClick={() => setRole("master")}
          >
            <span className="login__role-icon">🜨</span>
            Guardião
          </button>
        </div>

        {role === "master" && (
          <label className="login__field login__field--master">
            <span>Senha do Guardião</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>
        )}

        {error && <div className="login__error">{error}</div>}

        <button type="submit" className={`login__submit ${role === "master" ? "login__submit--master" : ""}`}>
          Entrar na mesa
        </button>
      </form>
      <footer className="login__footer">Uma mesa persistente. Entre e os véus se abrirão.</footer>
    </div>
  );
}
