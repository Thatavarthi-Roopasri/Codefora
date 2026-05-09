const PISTON_EXECUTE_URL = "https://emkc.org/api/v2/piston/execute";

async function run() {
  const response = await fetch(PISTON_EXECUTE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: "javascript",
      version: "18.15.0",
      files: [{ name: "main.js", content: "console.log('hello piston');" }]
    })
  });
  const data = await response.json();
  console.log(response.status, data);
}
run();
