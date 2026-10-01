export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  updatedAt: number;
}

/** Extrai títulos referenciados em [[links]]. */
export function extractLinks(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(2, -2).trim()))];
}

/** Renderiza markdown básico + [[links]] para HTML seguro. */
export function renderMarkdown(content: string, resolve: (title: string) => boolean): string {
  // escape
  let html = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_, c) => `<pre class="md-pre">${c}</pre>`);
  // headers
  html = html.replace(/^### (.*)$/gm, "<h3 class='md-h3'>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2 class='md-h2'>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1 class='md-h1'>$1</h1>");
  // bold / italic
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // inline code
  html = html.replace(/`([^`]+)`/g, "<code class='md-code'>$1</code>");
  // lists
  html = html.replace(/^[-*] (.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul class='md-ul'>$1</ul>");
  // wiki links
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_, title: string) => {
    const t = title.trim();
    const exists = resolve(t);
    return `<a class="md-link ${exists ? "" : "md-link--missing"}" data-link="${t}">${t}</a>`;
  });
  // paragraphs
  html = html
    .split(/\n{2,}/)
    .map((block) => (/^<(h\d|ul|pre)/.test(block.trim()) ? block : `<p>${block.replace(/\n/g, "<br/>")}</p>`))
    .join("");

  return html;
}
