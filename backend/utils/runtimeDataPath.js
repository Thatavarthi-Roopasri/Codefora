import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDataDir = path.join(__dirname, "../data");

export function runtimeDataPath(fileName) {
  const configuredDir = String(process.env.CODEFORA_DATA_DIR || "").trim();
  const dataDir = configuredDir ? path.resolve(configuredDir) : defaultDataDir;
  return path.join(dataDir, fileName);
}
