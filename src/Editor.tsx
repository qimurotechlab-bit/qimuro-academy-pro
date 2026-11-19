import { useEffect, useRef } from "react";
import { basicSetup, EditorView } from "codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import type { Lang } from "./db";

// `value` is only the initial document; the editor owns the text afterwards.
export function Editor({ value, language, onChange }: { value: string; language: Lang; onChange: (v: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    const view = new EditorView({
      doc: value,
      parent: host.current!,
      extensions: [
        basicSetup,
        language === "python" ? python() : javascript(),
        EditorView.updateListener.of((u) => { if (u.docChanged) cb.current(u.state.doc.toString()); }),
      ],
    });
    return () => view.destroy();
  }, [language]);
  return <div ref={host} className="editor" />;
}
