// main.ts — the hand-in program for this make.fun frontend entry.
// Node 22+, standard library only, no network, no build step.
//
// An entry is the static app under app/ plus three screenshots under
// screenshots/. This program prepares the hand-in in the output
// directory (MAKEFUN_OUTPUT_DIR, or /output where the grader runs):
//
//   1. the output directory is created if missing, and emptied entry
//      by entry — the directory itself is NEVER removed, because in
//      the grading sandbox it is a mount point on a read-only
//      filesystem and removing it fails the whole run;
//   2. app/ and screenshots/ are mirrored into it file by file;
//   3. the screenshots are checked against the gate's caps from their
//      own bytes (count, size, whole JPEG or PNG, dimensions);
//   4. dossier.json is built with the kit library in vendor/, and the
//      build is proven byte-stable by building a second time from the
//      output exactly as written and comparing the two byte strings;
//   5. the Totals line from the dossier is printed for the log.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The gate's caps, restated so a bad hand-in stops here with a plain
// reason instead of failing silently at the gate.
const GATE = {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
  app_path_max_bytes: 1000,
};

// Files the app cannot boot without; all must survive the mirror.
const MUST_ARRIVE = ['index.html', 'boot.js', 'core.js', 'fmt.js', 'theme.css'];

function halt(reason) {
  throw new Error(`hand-in halted: ${reason}`);
}

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Mirror a directory tree one file at a time, returning how many
// files were copied. The walk is deliberate: anything in the source
// that is neither a plain file nor a directory (a symlink, a socket,
// a device) stops the hand-in instead of being silently carried along.
function mirrorTree(fromDir, toDir) {
  mkdirSync(toDir, { recursive: true });
  let copied = 0;
  for (const name of readdirSync(fromDir)) {
    const src = join(fromDir, name);
    const dst = join(toDir, name);
    const info = statSync(src);
    if (info.isDirectory()) copied += mirrorTree(src, dst);
    else if (info.isFile()) {
      copyFileSync(src, dst);
      copied += 1;
    } else halt(`${src} is neither a file nor a directory`);
  }
  return copied;
}

// Image dimensions read from the image bytes alone. A PNG stores its
// size in the IHDR chunk, big-endian at bytes 16..24. A JPEG stores it
// in a start-of-frame segment, found by walking the marker segments.
function pngDims(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { w: view.getUint32(16), h: view.getUint32(20) };
}

function jpegDims(bytes) {
  let at = 2; // skip the SOI marker
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) halt('malformed JPEG: a marker was expected');
    const code = bytes[at + 1];
    const segLen = bytes[at + 2] * 256 + bytes[at + 3];
    if (code === 0xc0 || code === 0xc1 || code === 0xc2) {
      return { w: bytes[at + 7] * 256 + bytes[at + 8], h: bytes[at + 5] * 256 + bytes[at + 6] };
    }
    at += 2 + segLen;
  }
  halt('malformed JPEG: no frame header found');
}

function auditScreenshots(dir) {
  const names = readdirSync(dir)
    .filter((n) => !n.startsWith('.'))
    .sort();
  if (names.length === 0) halt('screenshots/ holds no image at all');
  if (names.length > GATE.screenshots.max) halt(`${names.length} screenshots, the cap is ${GATE.screenshots.max}`);
  return names.map((name) => {
    const bytes = readFileSync(join(dir, name));
    if (bytes.length > GATE.screenshots.max_bytes) halt(`${name} is ${bytes.length} bytes, over the ${GATE.screenshots.max_bytes} cap`);
    const head = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let dims;
    if (head.getUint16(0) === 0xffd8) dims = jpegDims(bytes);
    else if (head.getUint32(0) === 0x89504e47) dims = pngDims(bytes);
    else halt(`${name} is neither a JPEG nor a PNG`);
    const longSide = Math.max(dims.w, dims.h);
    const shortSide = Math.min(dims.w, dims.h);
    if (longSide > 1280 || shortSide < 360) halt(`${name} is ${dims.w}x${dims.h}, outside the allowed bounds`);
    return `${name} ${dims.w}x${dims.h} ${bytes.length} B`;
  });
}

function prepare() {
  const repoRoot = fileURLToPath(new URL('.', import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  if (outDir === repoRoot) halt('the output directory must not be the repository itself');
  console.log(`Preparing hand-in: ${repoRoot} -> ${outDir}`);

  const appSource = join(repoRoot, 'app');
  const shotsSource = join(repoRoot, 'screenshots');
  if (!existsSync(appSource)) halt('app/ is missing from the repository');
  if (!existsSync(shotsSource)) halt('screenshots/ is missing from the repository');

  // Empty the output directory entry by entry. The directory itself
  // stays: in the grading sandbox it is a mount point, and removing
  // it is exactly the failure this ordering avoids.
  mkdirSync(outDir, { recursive: true });
  for (const name of readdirSync(outDir)) {
    rmSync(join(outDir, name), { recursive: true, force: true });
  }

  const mirrored = mirrorTree(appSource, join(outDir, 'app')) + mirrorTree(shotsSource, join(outDir, 'screenshots'));
  console.log(`Mirrored ${mirrored} files into the output`);

  for (const name of MUST_ARRIVE) {
    if (!existsSync(join(outDir, 'app', name))) halt(`app/${name} did not arrive in the output`);
  }
  console.log(`All ${MUST_ARRIVE.length} entry files are in the output`);

  const shots = auditScreenshots(join(outDir, 'screenshots'));
  console.log(`Screenshots inside their caps: ${shots.join('; ')}`);

  const dossier = buildDossier(outDir, GATE);
  if (dossier.length === 0) halt('buildDossier returned no bytes');
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  if (!sameBytes(readFileSync(join(outDir, 'dossier.json')), dossier)) {
    halt('dossier.json on disk differs from the bytes that were built');
  }
  if (!sameBytes(buildDossier(outDir, GATE), dossier)) {
    halt('rebuilding the dossier from the written output gave different bytes');
  }

  const parsed = JSON.parse(new TextDecoder().decode(dossier));
  const totalsLine = String(parsed.text ?? '')
    .split('\n')
    .find((line) => line.startsWith('Totals:'));
  if (!totalsLine) halt('the dossier text holds no Totals line');
  console.log(`dossier.json: ${dossier.length} bytes`);
  console.log(totalsLine);
}

prepare();
