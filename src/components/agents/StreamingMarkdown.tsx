"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TRAILER = "\u0000__AGENT_TRAILER__";
const ERRMARK = "\u0000__AGENT_ERROR__";

// If acc ends with a partial sentinel prefix (e.g. "\u0000__"), the trailing
// bytes of the sentinel-to-be must not be rendered as body. Strip them.
function stripSentinelPrefix(s: string): string {
  const nulAt = s.lastIndexOf("\u0000");
  if (nulAt < 0) return s;
  const tail = s.slice(nulAt);
  if (TRAILER.startsWith(tail) || ERRMARK.startsWith(tail)) return s.slice(0, nulAt);
  return s;
}

type Result = { proposalId: string; runId: string };

type Props = {
  endpoint: string;
  requestBody: unknown;
  initialBody?: string;
  onComplete?: (body: string, result: Result) => void;
  onError?: (message: string, partialBody: string) => void;
};

export function StreamingMarkdown({ endpoint, requestBody, initialBody = "", onComplete, onError }: Props) {
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    abortRef.current = ac;
    (async () => {
      setStatus("streaming");
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: ac.signal,
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({ error: res.statusText }));
          setErrorMsg(payload.error ?? res.statusText);
          setStatus("error");
          onError?.(payload.error ?? res.statusText, "");
          return;
        }
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        let acc = "";
        let visible = "";

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });

          const trailerAt = acc.indexOf(TRAILER);
          const errorAt = acc.indexOf(ERRMARK);
          const markerAt = [trailerAt, errorAt].filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? -1;

          if (markerAt === -1) {
            visible = stripSentinelPrefix(acc);
            setBody(visible);
          } else {
            visible = acc.slice(0, markerAt).replace(/\n$/, "");
            setBody(visible);
          }
        }

        // Final parse after reader.done.
        const trailerAt = acc.indexOf(TRAILER);
        const errorAt = acc.indexOf(ERRMARK);

        if (trailerAt >= 0) {
          const jsonStr = acc.slice(trailerAt + TRAILER.length);
          let result: Result | null = null;
          try { result = JSON.parse(jsonStr); } catch { /* ignore */ }
          const finalBody = acc.slice(0, trailerAt).replace(/\n$/, "");
          setBody(finalBody);
          setStatus("done");
          if (result) onComplete?.(finalBody, result);
        } else if (errorAt >= 0) {
          const jsonStr = acc.slice(errorAt + ERRMARK.length);
          let payload: { error?: string } = {};
          try { payload = JSON.parse(jsonStr); } catch { /* ignore */ }
          const partial = acc.slice(0, errorAt).replace(/\n$/, "");
          setBody(partial);
          setErrorMsg(payload.error ?? "stream error");
          setStatus("error");
          onError?.(payload.error ?? "stream error", partial);
        } else {
          setStatus("done");
          onComplete?.(acc, { proposalId: "", runId: "" });
        }
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "network error";
        setErrorMsg(msg);
        setStatus("error");
        onError?.(msg, body);
      }
    })();
    return () => ac.abort();
    // Body deliberately NOT in deps — we only want a single stream per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  return (
    <div className="space-y-3">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body || "_streaming…_"}</ReactMarkdown>
      </div>
      {status === "streaming" && <div className="text-xs text-muted-foreground">Generating…</div>}
      {status === "error" && <div className="text-xs text-red-600">Error: {errorMsg}</div>}
    </div>
  );
}
