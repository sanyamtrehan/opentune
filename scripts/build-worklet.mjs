/**
 * Generate public/pitch-worklet.js.
 *
 * An AudioWorklet is loaded from a URL by the browser, not imported by the
 * app bundle, so it cannot share modules with the rest of the code the normal
 * way. Rather than keep a second copy of the pitch detector — which would
 * drift from the tested one the first time either changed — this transpiles
 * the real detector and prepends it to the worklet shell.
 *
 * The detector's only import is type-only, so it compiles to a standalone
 * module with no runtime dependencies. That is a property worth preserving:
 * this script fails loudly if it stops being true.
 *
 *   node scripts/build-worklet.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DETECTOR = join(ROOT, "src", "core", "audio", "detect-pitch.ts");
const SHELL = join(ROOT, "src", "app", "_audio", "pitch-processor.js");
const OUT = join(ROOT, "public", "pitch-worklet.js");

const { outputText } = ts.transpileModule(readFileSync(DETECTOR, "utf8"), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
  fileName: "detect-pitch.ts",
});

const leftoverImport = /^\s*import\s/m.test(outputText);
if (leftoverImport) {
  throw new Error(
    "detect-pitch.ts has gained a runtime import. The worklet cannot resolve " +
      "modules, so either inline the dependency or bundle properly.",
  );
}

// `export` is meaningless inside an AudioWorkletGlobalScope, and illegal in a
// classic script, so strip the keyword and leave the declarations in scope.
const detector = outputText.replace(/^export /gm, "");

const shell = readFileSync(SHELL, "utf8");

writeFileSync(
  OUT,
  [
    "/*",
    " * GENERATED FILE — do not edit.",
    " *",
    " * Built by scripts/build-worklet.mjs from:",
    " *   src/core/audio/detect-pitch.ts   (the tested detector)",
    " *   src/app/_audio/pitch-processor.js (the worklet shell)",
    " *",
    " * Regenerate with `pnpm worklet`.",
    " */",
    "",
    detector,
    "",
    shell,
  ].join("\n"),
);

console.log(`wrote public/pitch-worklet.js (${detector.length + shell.length} bytes)`);
