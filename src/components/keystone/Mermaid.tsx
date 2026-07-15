import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let initialized = false;
function ensureInit() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "strict",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
  });
  initialized = true;
}

let counter = 0;

/** Renders a Mermaid diagram from a code string. */
export function Mermaid({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [id] = useState(() => `mmd-${(counter += 1)}`);

  useEffect(() => {
    let cancelled = false;
    ensureInit();
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
        Mermaid error: {error}
      </pre>
    );
  }

  return (
    <div
      ref={ref}
      className="flex justify-center overflow-x-auto rounded-xl bg-card/60 p-4"
    />
  );
}
