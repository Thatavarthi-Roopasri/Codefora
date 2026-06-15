export function buildPreview(files, preferredHtmlFile = null) {
  let htmlFile = null;
  if (preferredHtmlFile) {
    htmlFile = files.find(file => file.name === preferredHtmlFile && file.name.endsWith(".html"));
  }
  if (!htmlFile) {
    htmlFile = files.find((file) => file.name.endsWith(".html"));
  }
  let html = htmlFile?.code || "";
  
  let unlinkedCss = [];
  let unlinkedJs = [];

  // Escape string for regex
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Replace CSS links: <link ... href="filename.css" ... >
  files.filter(f => f.name.endsWith(".css")).forEach(file => {
    const regex = new RegExp(`<link[^>]*href=["'](?:\\.\\/)?${escapeRegExp(file.name)}["'][^>]*>`, 'gi');
    if (regex.test(html)) {
      html = html.replace(regex, `<style>${file.code}</style>`);
    } else {
      unlinkedCss.push(file.code);
    }
  });

  // Replace JS scripts: <script ... src="filename.js" ...></script>
  files.filter(f => f.name.endsWith(".js")).forEach(file => {
    const regex = new RegExp(`<script[^>]*src=["'](?:\\.\\/)?${escapeRegExp(file.name)}["'][^>]*>\\s*<\\/script>`, 'gi');
    if (regex.test(html)) {
      html = html.replace(regex, `<script>${file.code}</script>`);
    } else {
      unlinkedJs.push(file.code);
    }
  });

  const css = unlinkedCss.join("\n");
  const js = unlinkedJs.join("\n");

  if (html.toLowerCase().includes("<html")) {
     if (css) {
       if (html.toLowerCase().includes("</head>")) {
         html = html.replace(/<\/head>/i, `<style>${css}</style></head>`);
       } else {
         html = html.replace(/<html[^>]*>/i, `$&<head><style>${css}</style></head>`);
       }
     }
     if (js) {
       if (html.toLowerCase().includes("</body>")) {
         html = html.replace(/<\/body>/i, `<script>${js}</script></body>`);
       } else {
         html += `<script>${js}</script>`;
       }
     }
     return html;
  }

  return `<!doctype html><html><head><style>${css}</style></head><body>${html}<script>${js}</script></body></html>`;
}
