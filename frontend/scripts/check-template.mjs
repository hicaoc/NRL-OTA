import { readFileSync } from "node:fs";
import { compile } from "vue/dist/vue.esm-bundler.js";

const src = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");

// 1. Extract the app template and compile it.
const startMarker = "template: `";
const start = src.indexOf(startMarker);
if (start === -1) throw new Error("app template not found");
const from = start + startMarker.length;
const end = src.indexOf("</div>`,", from);
if (end === -1) throw new Error("app template end not found");
const appTemplate = src.slice(from, end) + "</div>";

const iconTemplate =
  '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="path"></svg>';

let failed = false;
for (const [name, tpl] of [
  ["app", appTemplate],
  ["icon", iconTemplate],
]) {
  const errors = [];
  compile(tpl, { onError: (e) => errors.push(e) });
  if (errors.length) {
    failed = true;
    console.error(`${name}: ${errors.length} template error(s)`);
    for (const e of errors) console.error(" -", e.message || e);
  } else {
    console.log(`${name}: template compiles cleanly (${tpl.length} chars)`);
  }
}

// 2. Binding audit: with prefixIdentifiers every setup binding renders as
// _ctx.name while v-for aliases and globals stay bare. The esm-bundler compile
// only supports function mode, so recover the generated code via toString().
const returnMatch = src.match(/\n {4}return \{([\s\S]*?)\n {4}\};/);
if (!returnMatch) throw new Error("setup return object not found");
const returned = new Set(
  [...returnMatch[1].matchAll(/^ {6}([A-Za-z_$][\w$]*),?$/gm)].map((m) => m[1]),
);
// Template globals provided by Vue itself, not by setup().
for (const global of ["$refs", "$event", "$attrs", "$slots", "$emit"]) returned.add(global);
const render = compile(appTemplate, { prefixIdentifiers: true });
const code = String(render);
const used = new Set([...code.matchAll(/_ctx\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
const missing = [...used].filter((name) => !returned.has(name));
if (missing.length) {
  failed = true;
  console.error(`missing setup bindings used by template: ${missing.join(", ")}`);
} else {
  console.log(`bindings audit passed (${used.size} names, all returned from setup)`);
}
process.exit(failed ? 1 : 0);
