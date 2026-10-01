# ⬦ Arkham Investigator

Mesa de RPG online, imersiva e em tempo real, para **Call of Cthulhu 7ª Edição**
(campanha *Máscaras de Nyarlathotep*). Combina quadro investigativo, combate tático,
fichas fiéis ao sistema, notas interligadas e painel do Guardião.

> As mecânicas seguem o sistema CoC 7e. O conteúdo narrativo da campanha (NPCs,
> locais, pistas) é inserido por você nas ferramentas — nada do livro é reproduzido.

## Stack

- **React + TypeScript + Vite + Zustand**
- **Camada de sincronização abstraída** (`src/sync/SyncProvider.ts`): hoje usa
  `BroadcastChannel` + `localStorage` (sincroniza entre abas e persiste a campanha
  única). O ponto de troca para **Supabase Realtime / WebSocket** está isolado —
  basta implementar a interface `SyncBackend` e trocar a instância `sync`.
- **Motor de regras isolado e testável** (`src/domain/cocRules.ts`).

## Rodando

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # build de produção
npm run preview  # servir o build
```

## Login

- **Investigador**: só nome.
- **Guardião (Mestre)**: nome + senha (`nyarlathotep`, configurável em `src/store/useStore.ts`).

## Módulos

| Módulo | O que faz |
|--------|-----------|
| 🧾 **Fichas** | Características com metade/quinto, derivados pelo livro (PV, SAN, PM, Sorte, Bônus de Dano, Corpo, MOV), perícias clicáveis (rolam com popup), evolução de perícia, armas com Reg/Dif/Ext + munição, inventário, antecedentes, retrato, finanças por crédito. |
| 🎲 **Dados** | Teste percentual com classificação correta (crítico/extremo/difícil/regular/falha/fumble), dados de bônus/penalidade, rolagem livre e histórico. |
| 🧵 **Quadro** | Canvas infinito, notas/imagens/PDFs, setas que não duplicam, desenho multicor, visibilidade por elemento. |
| ⚔️ **Combate** | Grid (1 célula = 1 m), tokens com Vida/Sanidade/status, iniciativa por DES, turnos, seleção de alvo, consumo de munição, régua em metros, desenho, estado "morrendo". |
| 🧰 **NPCs & Loja** | Catálogo por categoria, busca, compra múltipla com desconto por crédito, efeitos automáticos (cura/dano/SAN/PM/munição), criação de itens pelo Guardião. |
| 📓 **Notas** | Markdown com `[[links]]` internos, pastas (drag & drop), backlinks automáticos. |
| 🕸️ **Conexões** | Grafo força-dirigido das notas conectadas. |
| 🗺️ **Mapas** | Upload de imagem/PDF, desenho por cima, zoom de alta qualidade, mapa ativo e visibilidade controlados pelo Guardião. |
| 🜨 **Área do Guardião** | Visão geral (online, PV/SAN), controle de personagens, **visibilidade por drag & drop**, controle de combate. |

## Arquitetura

```
src/
  domain/      # tipos + regras CoC 7e + fábricas (puro, testável)
  store/       # Zustand (estado compartilhado, sincronizado)
  sync/        # camada de sincronização plugável
  components/  # UI reutilizável (auth, layout, sheet, dice, ui)
  pages/       # um arquivo por módulo
  styles/      # design system (theme.css)
  hooks/       # useRoller (roteia rolagens por contexto)
```

## Conectando um backend real (tempo real online)

Implemente `SyncBackend` com Supabase Realtime (ou WebSocket) e troque a última
linha de `src/sync/SyncProvider.ts`:

```ts
export const sync: SyncBackend = new SupabaseSyncBackend();
```

Nenhum módulo precisa mudar — todos consomem a mesma interface.
