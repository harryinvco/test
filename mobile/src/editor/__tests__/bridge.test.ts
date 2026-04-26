import { describe, expect, test } from "vitest";
import { HostMessage, WebMessage } from "../bridge";

describe("HostMessage", () => {
  test("parses init", () => {
    const m = HostMessage.parse({
      kind: "init",
      content: "hello",
      readOnly: false,
      theme: { bg: "#fff", fg: "#000", accent: "#07f" },
    });
    expect(m.kind).toBe("init");
  });

  test("parses insertMarkdown for each kind", () => {
    for (const kind of ["checkbox", "bullet", "heading", "bold", "italic", "link"] as const) {
      const m = HostMessage.parse({ kind: "insertMarkdown", action: kind });
      expect(m.kind).toBe("insertMarkdown");
    }
  });

  test("rejects unknown kind", () => {
    expect(() => HostMessage.parse({ kind: "nope" })).toThrow();
  });
});

describe("WebMessage", () => {
  test("parses ready", () => {
    expect(WebMessage.parse({ kind: "ready" }).kind).toBe("ready");
  });

  test("parses change", () => {
    const m = WebMessage.parse({ kind: "change", content: "x" });
    expect(m.kind).toBe("change");
  });

  test("parses log", () => {
    const m = WebMessage.parse({ kind: "log", level: "info", msg: "hi" });
    expect(m.kind).toBe("log");
  });
});
