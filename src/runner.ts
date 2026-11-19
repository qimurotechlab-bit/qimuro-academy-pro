import type { Lang } from "./db";

export type Out = { kind: "out" | "err"; text: string };

// Code runs in a Web Worker on the learner's own device. Stop = terminate the worker,
// which also ends infinite loops.
const jsWorker = `
const fmt = (v) => typeof v === "object" ? JSON.stringify(v) : String(v);
console.log = (...a) => postMessage({ kind: "out", text: a.map(fmt).join(" ") });
console.error = (...a) => postMessage({ kind: "err", text: a.map(fmt).join(" ") });
onmessage = async (e) => {
  try { await (0, eval)("(async () => {" + e.data + "\\n})()"); }
  catch (x) { postMessage({ kind: "err", text: String(x) }); }
  postMessage({ kind: "done" });
};`;

export const PY_BASE = "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/";

const pyWorker = `
importScripts("${PY_BASE}pyodide.js");
let py;
const ready = loadPyodide().then((p) => {
  py = p;
  p.setStdout({ batched: (t) => postMessage({ kind: "out", text: t }) });
  p.setStderr({ batched: (t) => postMessage({ kind: "err", text: t }) });
});
onmessage = async (e) => {
  await ready;
  try { await py.runPythonAsync(e.data); }
  catch (x) { postMessage({ kind: "err", text: String((x && x.message) || x) }); }
  postMessage({ kind: "done" });
};`;

export function run(lang: Lang, code: string, onOut: (o: Out) => void, onDone: () => void) {
  const url = URL.createObjectURL(new Blob([lang === "python" ? pyWorker : jsWorker], { type: "text/javascript" }));
  const worker = new Worker(url);
  const stop = () => { worker.terminate(); URL.revokeObjectURL(url); };
  worker.onmessage = (e) => {
    if (e.data.kind === "done") { stop(); onDone(); } else onOut(e.data);
  };
  worker.onerror = (e) => {
    onOut({ kind: "err", text: lang === "python"
      ? "Could not load the Python runtime. Connect to the internet once to download it."
      : e.message });
    stop(); onDone();
  };
  worker.postMessage(code);
  return () => { stop(); onDone(); };
}
