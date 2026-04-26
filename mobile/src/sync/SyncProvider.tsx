import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { countLocal, getServerCursor, setLastSyncAt as persistLastSyncAt } from "@/db/local";
import { runSync, type SyncSummary } from "@/sync/engine";
import { onDirtyChange } from "@/sync/bus";

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

type SyncContextValue = {
  status: SyncStatus;
  lastSyncAt: number | null;
  lastError: string | null;
  pending: number;
  cursor: number;
  dataVersion: number;
  lastSummary: SyncSummary | null;
  syncNow: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

const DEBOUNCE_AFTER_MUTATION_MS = 2500;
const PERIODIC_INTERVAL_MS = 60_000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, token, signOut } = useAuth();

  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const [lastSummary, setLastSummary] = useState<SyncSummary | null>(null);

  const inFlightRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const refreshMeta = useCallback(async () => {
    const [counts, cur] = await Promise.all([countLocal(), getServerCursor()]);
    setPending(counts.dirtyTabs + counts.dirtyNotes);
    setCursor(cur);
  }, []);

  const syncNow = useCallback(async () => {
    const t = tokenRef.current;
    if (!t || inFlightRef.current) return;
    inFlightRef.current = true;
    setStatus("syncing");
    setLastError(null);
    try {
      const summary = await runSync(t);
      setLastSummary(summary);
      setLastSyncAt(summary.at);
      await persistLastSyncAt(summary.at);
      if (summary.pulledTabs + summary.pulledNotes > 0) {
        setDataVersion((v) => v + 1);
      }
      await refreshMeta();
      setStatus("idle");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // Token expired or revoked — sign the user out cleanly.
        await signOut();
        inFlightRef.current = false;
        return;
      }
      const msg = e instanceof Error ? e.message : String(e);
      // Heuristic: network-ish failures get an "offline" label so the pill
      // conveys intent rather than a scary error.
      const isNetwork =
        /network|fetch|timeout|connect/i.test(msg) && !(e instanceof ApiError);
      setStatus(isNetwork ? "offline" : "error");
      setLastError(msg);
    } finally {
      inFlightRef.current = false;
    }
  }, [refreshMeta, signOut]);

  const scheduleDebounced = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void syncNow();
    }, DEBOUNCE_AFTER_MUTATION_MS);
  }, [syncNow]);

  // Initial + auth-change sync
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    void refreshMeta();
    void syncNow();
  }, [authStatus, refreshMeta, syncNow]);

  // Foreground trigger (AppState → active) + periodic poll while active
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    let appStateNow: AppStateStatus = AppState.currentState;

    const sub = AppState.addEventListener("change", (next) => {
      if (appStateNow !== "active" && next === "active") {
        void syncNow();
      }
      appStateNow = next;
    });

    const id = setInterval(() => {
      if (appStateNow === "active") void syncNow();
    }, PERIODIC_INTERVAL_MS);

    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [authStatus, syncNow]);

  // Mutation → update pending count immediately + debounced sync
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    return onDirtyChange(() => {
      void refreshMeta();
      scheduleDebounced();
    });
  }, [authStatus, refreshMeta, scheduleDebounced]);

  const value = useMemo<SyncContextValue>(
    () => ({
      status,
      lastSyncAt,
      lastError,
      pending,
      cursor,
      dataVersion,
      lastSummary,
      syncNow,
    }),
    [status, lastSyncAt, lastError, pending, cursor, dataVersion, lastSummary, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used inside <SyncProvider>");
  return ctx;
}
