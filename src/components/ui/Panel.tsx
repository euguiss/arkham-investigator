import type { ReactNode } from "react";
import "./Panel.css";

interface PanelProps {
  title?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  accent?: "amber" | "arcane" | "blood";
  className?: string;
  children: ReactNode;
}

export function Panel({ title, icon, actions, accent = "amber", className = "", children }: PanelProps) {
  return (
    <section className={`panel panel--${accent} ${className}`}>
      {title && (
        <header className="panel__head">
          <h3 className="panel__title">
            {icon && <span className="panel__icon">{icon}</span>}
            {title}
          </h3>
          {actions && <div className="panel__actions">{actions}</div>}
        </header>
      )}
      <div className="panel__body">{children}</div>
    </section>
  );
}
