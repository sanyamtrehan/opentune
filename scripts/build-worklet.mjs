/**
 * Generate public/pitch-worklet.js.
 *
 * An AudioWorklet is loaded from a URL by the browser, not imported by the
 * app bundle, so it cannot share modules with the rest of the code the normal
 * way. Rather than keep a second copy of the pitch detector — which would
 * drift from the tested one the first time either changed — this transpiles
 * the real modules and concatenates them with the worklet shell.
 *
 * `MODULES` is in dependency order. Imports between them are stripped, since
 * concatenation puts everything in one scope; an import of anything *else*
 * fails the build, because the worklet has no module resolver to fall back on.
 *
 *   node scripts/build-worklet.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CORE = join(ROOT, "src", "core", "audio");
const SHELL = join(ROOT, "src", "app", "_audio", "pitch-processor.js");
const OUT = join(ROOT, "public", "pitch-worklet.js");

/** Dependency order: each may import only the ones before it. */
const MODULES = ["decimate.ts", "detect-pitch.ts"];

const localImport = new RegExp(
  `^\\s*import\\s[^;]*?from\\s*["']\\./(${MODULES.join("|")})["'];?\\s*$`,
  "gm",
);

const pieces = MODULES.map((name) => {
  const { outputText } = ts.transpileModule(readFileSync(join(CORE, name), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: name,
  });

  // Drop imports of sibling modules: concatenation already puts them in scope.
  const body = outputText.replace(localImport, "");

  if (/^\s*import\s/m.test(body)) {
    throw new Error(
      `${name} imports something outside the worklet bundle. Add it to ` +
        `MODULES if it belongs there, or inline the dependency — the worklet ` +
        `has no module resolver.`,
    );
  }

  // `export` is meaningless inside an AudioWorkletGlobalScope and illegal in
  // a classic script, so strip the keyword and leave the declarations.
  return `// ---- core/audio/${name} ----\n${body.replace(/^export /gm, "")}`;
});

const shell = readFileSync(SHELL, "utf8");

writeFileSync(
  OUT,
  [
    "/*",
    " * GENERATED FILE — do not edit.",
    " *",
    " * Built by scripts/build-worklet.mjs from:",
    ...MODULES.map((name) => ` *   src/core/audio/${name}`),
    " *   src/app/_audio/pitch-processor.js (the worklet shell)",
    " *",
    " * Regenerate with `pnpm worklet`.",
    " */",
    "",
    ...pieces,
    "",
    "// ---- app/_audio/pitch-processor.js ----",
    shell,
  ].join("\n"),
);

console.log(`wrote public/pitch-worklet.js (${MODULES.length + 1} modules)`);
