import { PageHeader } from "../components/layout/PageHeader";
import "./PlaceholderPage.css";

export function PlaceholderPage({ title, icon, description, features }: {
  title: string;
  icon: string;
  description: string;
  features: string[];
}) {
  return (
    <>
      <PageHeader title={title} subtitle="Módulo em construção — fundação pronta." />
      <div className="page-scroll">
        <div className="placeholder">
          <div className="placeholder__icon">{icon}</div>
          <p className="placeholder__desc">{description}</p>
          <ul className="placeholder__list">
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
