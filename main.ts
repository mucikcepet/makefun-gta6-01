// Costa Verde — entrypoint make.fun (Node 22, standard library only).
// Menyalin game/ dan screenshots/ dari repositori ini ke /output
// (atau $MAKEFUN_OUTPUT_DIR di luar grader) lalu menulis /output/dossier.json
// dengan buildDossier dari ./vendor/makefun-game.ts. Deterministik: dua run
// menulis byte yang sama.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(new URL('./main.ts', import.meta.url)));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(name) {
  const src = join(repoRoot, name);
  const dst = join(outDir, name);
  if (!existsSync(src)) throw new Error(`main.ts: ${name}/ tidak ditemukan di ${repoRoot}`);
  cpSync(src, dst, { recursive: true });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
copyTree('game');
copyTree('screenshots');

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`dossier.json written: ${dossier.length} bytes -> ${outDir}`);
