import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "./store/useStore";
import { usePopup } from "./store/usePopup";
import { LoginScreen } from "./components/auth/LoginScreen";
import { AppShell } from "./components/layout/AppShell";
import { RollPopup } from "./components/dice/RollPopup";
import { SheetPage } from "./pages/SheetPage";
import { DicePage } from "./pages/DicePage";
import { WhiteboardPage } from "./pages/WhiteboardPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

export default function App() {
  const user = useStore((s) => s.currentUser);
  const popupEntry = usePopup((s) => s.entry);
  const dismiss = usePopup((s) => s.dismiss);

  if (!user) return <LoginScreen />;

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/fichas" replace />} />
          <Route path="/fichas" element={<SheetPage />} />
          <Route path="/dados" element={<DicePage />} />
          <Route path="/quadro" element={<WhiteboardPage />} />
          <Route
            path="/notas"
            element={
              <PlaceholderPage
                title="Notas"
                icon="📓"
                description="Editor estilo Obsidian com pastas, markdown e links [[internos]]."
                features={[
                  "Pastas e organização por arrastar e soltar",
                  "Edição e visualização em Markdown",
                  "Links [[internos]] com backlinks automáticos",
                ]}
              />
            }
          />
          <Route
            path="/conexoes"
            element={
              <PlaceholderPage
                title="Conexões"
                icon="🕸️"
                description="Grafo força-dirigido clicável conectando notas, NPCs e pistas."
                features={["Grafo interativo", "Clique para navegar até a nota", "Reflete links [[internos]]"]}
              />
            }
          />
          <Route
            path="/mapas"
            element={
              <PlaceholderPage
                title="Mapas"
                icon="🗺️"
                description="Upload de imagens/PDFs com desenho por cima, alta qualidade no zoom e controle de visibilidade pelo Guardião."
                features={["Camada de desenho", "Zoom sem perda de qualidade", "Mapa ativo controlado pelo Guardião"]}
              />
            }
          />
          <Route
            path="/combate"
            element={
              <PlaceholderPage
                title="Combate"
                icon="⚔️"
                description="Grid infinito (1 célula = 1 m), tokens com Vida/Sanidade/Status, ordem de turno, seleção de alvo, consumo de munição, régua e log."
                features={[
                  "Grid infinito com zoom e pan",
                  "Tokens com barras de Vida/Sanidade",
                  "Ordem de turno e seleção de alvo",
                  "Régua em metros, desenho e estado 'morrendo'",
                ]}
              />
            }
          />
          <Route
            path="/loja"
            element={
              <PlaceholderPage
                title="NPCs & Loja"
                icon="🧰"
                description="Catálogo por categorias, compra com desconto por crédito, efeitos automáticos; NPCs com ficha completa e visibilidade controlada."
                features={[
                  "Catálogo com busca e filtro",
                  "Compra adiciona direto à ficha",
                  "Efeitos automáticos (cura/dano/munição)",
                  "NPCs controláveis pelo Guardião",
                ]}
              />
            }
          />
          <Route
            path="/mestre"
            element={
              <PlaceholderPage
                title="Área do Guardião"
                icon="🜨"
                description="Painel de comando central: visão geral, controle de personagens, visibilidade por drag & drop, mapas, combate, quadro e loja."
                features={[
                  "Visão geral (jogadores online, PV/SAN)",
                  "Aplicar dano/cura/efeitos",
                  "Controle de visibilidade (drag & drop)",
                  "Controle de combate, mapas e loja",
                ]}
              />
            }
          />
          <Route path="*" element={<Navigate to="/fichas" replace />} />
        </Route>
      </Routes>

      <RollPopup entry={popupEntry} onDismiss={dismiss} />
    </HashRouter>
  );
}
