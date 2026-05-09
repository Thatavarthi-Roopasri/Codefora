export function buildPreview(files) {
  const html = files.find((file) => file.name.endsWith(".html"))?.code || "";
  const css = files.filter((file) => file.name.endsWith(".css")).map((file) => file.code).join("\n");
  const js = files.filter((file) => file.name.endsWith(".js")).map((file) => file.code).join("\n");
  return `<!doctype html><html><head><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
}
