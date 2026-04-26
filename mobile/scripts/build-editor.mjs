// Builds the WebView editor bundle from mobile/src/editor/web/main.ts
// into mobile/assets/editor/{editor.js,index.html}. Commit the outputs.

import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "assets/editor");
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [resolve(root, "src/editor/web/main.ts")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  outfile: resolve(outDir, "editor.js"),
  logLevel: "info",
});

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    body { font: 16px -apple-system, system-ui, sans-serif; }
    #root, .cm-editor { height: 100%; }
    .cm-editor { outline: none; }
    .cm-scroller { padding: 12px 14px 160px; }
    /* Checkbox widget */
    .md-checkbox {
      display: inline-block; width: 1.1em; height: 1.1em;
      border: 1.5px solid currentColor; border-radius: 4px;
      vertical-align: -2px; margin-right: 6px;
      position: relative; cursor: pointer; user-select: none;
    }
    .md-checkbox[data-checked="true"]::after {
      content: ""; position: absolute;
      left: 20%; top: 5%; width: 40%; height: 70%;
      border: solid currentColor; border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="./editor.js"></script>
</body>
</html>`;
writeFileSync(resolve(outDir, "index.html"), html, "utf8");
console.log("wrote", resolve(outDir, "index.html"));
