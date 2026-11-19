import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, starter, type Lang } from "./db";
import { PY_BASE, run, type Out } from "./runner";
import { Editor } from "./Editor";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header><Link to="/"><b>QIMURO</b> Academy Pro</Link></header>
      <main>{children}</main>
      <footer>Your projects are saved on this device only. Accounts and sync are not built yet.</footer>
    </>
  );
}

function OfflineStatus() {
  const [state, setState] = useState<"checking" | "ready" | "missing" | "loading">("checking");
  const check = () =>
    ("caches" in window ? caches.match(PY_BASE + "pyodide.js") : Promise.resolve(undefined))
      .then((hit) => setState(hit ? "ready" : "missing"))
      .catch(() => setState("missing"));
  useEffect(() => { void check(); }, []);
  if (state === "checking") return null;
  if (state === "ready") return <p className="muted">Python is saved on this device and works offline.</p>;
  return (
    <p className="muted">
      Python is not saved for offline use yet (about 10 MB, downloaded once).{" "}
      <button className="ghost" disabled={state === "loading"} onClick={() => {
        setState("loading");
        run("python", "pass", () => {}, () => void check());
      }}>{state === "loading" ? "Downloading…" : "Download for offline use"}</button>
    </p>
  );
}

function Home() {
  const projects = useLiveQuery(() => db.projects.orderBy("updatedAt").reverse().toArray(), []);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [lang, setLang] = useState<Lang>("python");

  async function create(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const id = crypto.randomUUID();
    await db.projects.add({ id, name: n, language: lang, code: starter[lang], updatedAt: Date.now() });
    navigate(`/p/${id}`);
  }

  return (
    <Shell>
      <h1>My projects</h1>
      <OfflineStatus />
      <form onSubmit={create} className="row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" aria-label="Project name" />
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Language">
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
        </select>
        <button>Create</button>
      </form>
      {projects?.length === 0 && <p className="muted">No projects yet. Create your first one above.</p>}
      <ul className="list">
        {projects?.map((p) => (
          <li key={p.id}>
            <Link to={`/p/${p.id}`}>{p.name}</Link>
            <span className="muted">{p.language} · {new Date(p.updatedAt).toLocaleString()}</span>
            <button className="ghost" onClick={() => confirm(`Delete "${p.name}"?`) && db.projects.delete(p.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function Workspace() {
  const { id = "" } = useParams();
  const project = useLiveQuery(() => db.projects.get(id), [id]);
  const [output, setOutput] = useState<Out[]>([]);
  const [running, setRunning] = useState(false);
  const code = useRef<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const timer = useRef<number>(0);

  if (project === undefined) return <Shell><p className="muted">Loading…</p></Shell>;

  function onChange(v: string) {
    code.current = v;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => db.projects.update(id, { code: v, updatedAt: Date.now() }), 400);
  }

  function runCode() {
    if (!project) return;
    setOutput([]);
    setRunning(true);
    stopRef.current = run(project.language, code.current ?? project.code,
      (o) => setOutput((cur) => [...cur, o]), () => setRunning(false));
  }

  return (
    <Shell>
      <div className="row">
        <h1>{project.name}</h1>
        <span className="muted">{project.language}</span>
        {running
          ? <button onClick={() => stopRef.current?.()}>Stop</button>
          : <button onClick={runCode}>Run</button>}
      </div>
      <Editor key={project.id} value={project.code} language={project.language} onChange={onChange} />
      <pre className="output" aria-live="polite">
        {output.length === 0 ? <span className="muted">{running ? "Running…" : "Output appears here."}</span>
          : output.map((o, i) => <div key={i} className={o.kind}>{o.text}</div>)}
      </pre>
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/p/:id" element={<Workspace />} />
      <Route path="*" element={<Shell><h1>Page not found</h1><Link to="/">Back to projects</Link></Shell>} />
    </Routes>
  );
}
