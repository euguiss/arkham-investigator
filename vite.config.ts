import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// O `base` é definido pelo workflow do GitHub Pages (nome do repositório).
// Em dev/local fica "/". Em produção no Pages vira "/<repo>/".
const base = process.env.VITE_BASE ?? "/";

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
});
