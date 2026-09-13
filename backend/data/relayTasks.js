export function relayTasks(mode) {
  const definitions = mode === 'dsa' ? [
    ['sum', 'calculateTotal', 'Return the sum of all numbers. An empty array returns 0.', 'return 0;'],
    ['even', 'countEven', 'Count even numbers, including zero and negative even numbers.', 'return 0;'],
    ['maximum', 'findMaximum', 'Return the largest number, or null for an empty array.', 'return null;'],
    ['positive', 'countPositive', 'Count numbers strictly greater than zero.', 'return 0;']
  ] : mode === 'backend' ? [
    ['auth', 'Authentication', 'Add authenticated access checks and return a safe unauthorized response.', 'export function handler(req, res) {\n  if (!req.user) return res.status(401).json({ error: "Unauthorized" });\n  return res.json({ ok: true });\n}'],
    ['validation', 'Validation', 'Validate required input and return a clear client error for invalid data.', 'export function handler(req, res) {\n  if (!req.body?.value) return res.status(400).json({ error: "Value is required" });\n  return res.json({ ok: true });\n}'],
    ['errors', 'Error handling', 'Handle failures without exposing stack traces or internal details.', 'export function handler(req, res) {\n  try { return res.json({ ok: true }); } catch { return res.status(500).json({ error: "Request failed" }); }\n}'],
    ['response', 'API response', 'Return a stable JSON response with the expected status and shape.', 'export function handler(req, res) {\n  return res.status(200).json({ data: [], ok: true });\n}'],
    ['integration', 'Integration', 'Connect the handler to the shared service contract and keep the response predictable.', 'export function handler(req, res) {\n  const result = { ok: true, source: "service" };\n  return res.json(result);\n}']
  ] : [
    ['navigation', 'Navigation', 'Build a compact navigation bar with a brand and three links.'],
    ['hero', 'Hero', 'Build a headline, supporting description, and primary call to action.'],
    ['features', 'Features', 'Build three feature cards that stack at mobile widths.'],
    ['pricing', 'Pricing', 'Build a pricing section with clear plan names and features.'],
    ['footer', 'Footer', 'Build contact links, a short brand description, and copyright text.']
  ];
  return definitions.map(([id, title, description, starter]) => ({
    id, title, description, fileName: `${id}.${mode === 'frontend' ? 'html' : 'js'}`, language: mode === 'frontend' ? 'html' : 'javascript',
    signature: mode === 'dsa' ? `function ${title}(values)` : null,
    code: mode === 'dsa' || mode === 'backend' ? starter : `<style>body{margin:0;padding:24px;background:#101827;color:#eef6ff;font:16px system-ui}h2{color:#5eead4}</style>\n<section>\n  <h2>${title}</h2>\n  <p>Build this section here.</p>\n</section>`,
    ownerId: null, ownerName: null, revision: 0, done: false
  }));
}

export const relayTestInputs = [[1, 2, 3, 4], [-5, -2, 0, 7], [], [5], [2, 2, 2]];
export const relayExpected = {
  sum: values => values.reduce((sum, n) => sum + n, 0),
  even: values => values.filter(n => n % 2 === 0).length,
  maximum: values => values.length ? Math.max(...values) : null,
  positive: values => values.filter(n => n > 0).length,
  average: values => values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : 0
};
