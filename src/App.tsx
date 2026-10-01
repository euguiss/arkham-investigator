import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "./store/useStore";
import { usePopup } from "./store/usePopup";
import { LoginScreen } from "./components/auth/LoginScreen";
import { AppShell } from "./components/layout/AppShell";
import { RollPopup } from "./components/dice/RollPopup";
import { SheetPage } from "./pages/SheetPage";
import { DicePage } from "./pages/DicePage";
import { WhiteboardPage } from "./pages/WhiteboardPage";
import { CombatPage } from "./pages/CombatPage";
import { ShopPage } from "./pages/ShopPage";
import { MasterPage } from "./pages/MasterPage";
import { NotesPage } from "./pages/NotesPage";
import { ConnectionsPage } from "./pages/ConnectionsPage";
import { MapsPage } from "./pages/MapsPage";

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
          <Route path="/notas" element={<NotesPage />} />
          <Route path="/conexoes" element={<ConnectionsPage />} />
          <Route path="/mapas" element={<MapsPage />} />
          <Route path="/combate" element={<CombatPage />} />
          <Route path="/loja" element={<ShopPage />} />
          <Route path="/mestre" element={<MasterPage />} />
          <Route path="*" element={<Navigate to="/fichas" replace />} />
        </Route>
      </Routes>

      <RollPopup entry={popupEntry} onDismiss={dismiss} />
    </HashRouter>
  );
}
