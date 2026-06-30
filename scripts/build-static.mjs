import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

rmSync(dist, { force: true, recursive: true });
mkdirSync(dist, { recursive: true });

for (const entry of ["index.html", "src", "assets"]) {
  cpSync(join(root, entry), join(dist, entry), { recursive: true });
}
