import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { API_BASE_URL } from "@/config";
import { countLocal, wipeLocal } from "@/db/local";
import { useSync } from "@/sync/SyncProvider";
import { theme } from "@/ui/theme";
import { SyncPill } from "@/ui/SyncPill";

export default function SettingsScreen() {
  const router = useRouter();
  const { email, expiresAt, signOut } = useAuth();
  const sync = useSync();
  const [counts, setCounts] = useState<{
    tabs: number;
    notes: number;
    dirtyTabs: number;
    dirtyNotes: number;
  } | null>(null);

  const refresh = useCallback(async () => {
    const c = await countLocal();
    setCounts(c);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  function handleWipe() {
    Alert.alert(
      "Wipe local cache?",
      "Removes all notes/tabs from this device. Anything already synced stays on the server and will pull back on next sync.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Wipe",
          style: "destructive",
          onPress: async () => {
            await wipeLocal();
            await refresh();
          },
        },
      ],
    );
  }

  function handleSignOut() {
    Alert.alert("Sign out?", "You'll need to enter your password again to sync.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  }

  const lastSyncDisplay = sync.lastSyncAt
    ? new Date(sync.lastSyncAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "never";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>SYNC</Text>
          <View style={styles.pillRow}>
            <SyncPill status={sync.status} pending={sync.pending} />
            <Text style={styles.pillMeta}>Last sync {lastSyncDisplay}</Text>
          </View>
          <Text style={styles.sub}>
            Auto-syncs on app open, after every edit, and every 60 seconds in the foreground.
          </Text>
        </View>

        {sync.lastError && sync.status === "error" && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{sync.lastError}</Text>
          </View>
        )}

        <Section title="Account">
          <Row label="Signed in" value={email ?? "—"} />
          <Row
            label="Token expires"
            value={
              expiresAt
                ? new Date(expiresAt * 1000).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"
            }
          />
        </Section>

        <Section title="Sync status">
          <Row label="API" value={API_BASE_URL} mono />
          <Row label="Server cursor" value={sync.cursor ? String(sync.cursor) : "0"} mono />
          <Row label="Local tabs" value={counts ? String(counts.tabs) : "—"} />
          <Row label="Local notes" value={counts ? String(counts.notes) : "—"} />
          <Row
            label="Pending changes"
            value={
              counts
                ? `${counts.dirtyTabs + counts.dirtyNotes} (${counts.dirtyTabs}t / ${counts.dirtyNotes}n)`
                : "—"
            }
            emphasize={(counts?.dirtyTabs ?? 0) + (counts?.dirtyNotes ?? 0) > 0}
          />
        </Section>

        {sync.lastSummary && (
          <Section title="Last sync detail">
            <Row
              label="At"
              value={new Date(sync.lastSummary.at).toLocaleTimeString("en-GB")}
            />
            <Row
              label="Pushed"
              value={`${sync.lastSummary.pushed.tabs}t / ${sync.lastSummary.pushed.notes}n`}
            />
            <Row
              label="Applied"
              value={`${sync.lastSummary.applied.tabs}t / ${sync.lastSummary.applied.notes}n`}
            />
            <Row
              label="Rejected (LWW)"
              value={`${sync.lastSummary.rejected.tabs}t / ${sync.lastSummary.rejected.notes}n`}
            />
            <Row
              label="Pulled"
              value={`${sync.lastSummary.pulledTabs}t / ${sync.lastSummary.pulledNotes}n`}
            />
          </Section>
        )}

        <Pressable
          onPress={() => void sync.syncNow()}
          disabled={sync.status === "syncing"}
          style={({ pressed }) => [
            styles.primary,
            sync.status === "syncing" && styles.disabled,
            pressed && sync.status !== "syncing" && styles.pressed,
          ]}
        >
          {sync.status === "syncing" ? (
            <ActivityIndicator color={theme.primaryFg} />
          ) : (
            <>
              <Ionicons name="sync" size={18} color={theme.primaryFg} />
              <Text style={styles.primaryText}>Sync now</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={handleWipe}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Ionicons name="trash-outline" size={16} color={theme.ink} />
          <Text style={styles.secondaryText}>Wipe local cache</Text>
        </Pressable>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
        >
          <Text style={styles.ghostText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  mono,
  emphasize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          mono && styles.mono,
          emphasize && { color: theme.oxblood, fontWeight: "600" },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.paper },
  container: { padding: 20, paddingBottom: 40 },

  hero: { marginBottom: 18 },
  eyebrow: { fontSize: 10, letterSpacing: 3, fontWeight: "600", color: theme.inkFaint },
  pillRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  pillMeta: { fontSize: 12, color: theme.inkMuted },
  sub: { fontSize: 12, color: theme.inkMuted, marginTop: 8, lineHeight: 18 },

  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "600",
    color: theme.inkFaint,
    marginBottom: 8,
    marginLeft: 2,
  },
  card: {
    backgroundColor: theme.paperRaised,
    borderWidth: 1,
    borderColor: theme.rule,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  rowLabel: { fontSize: 13, color: theme.inkMuted },
  rowValue: { fontSize: 14, color: theme.ink, fontWeight: "500", maxWidth: 200, textAlign: "right" },
  mono: { fontFamily: "Menlo", fontSize: 11 },

  primary: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryText: { color: theme.primaryFg, fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.5 },

  secondary: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: theme.rule,
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryText: { fontSize: 14, color: theme.ink, fontWeight: "500" },

  ghost: { marginTop: 18, paddingVertical: 12, alignItems: "center" },
  ghostText: { color: theme.oxblood, fontSize: 14 },

  errorBanner: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: theme.oxbloodSoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8c1c1",
  },
  errorText: { color: theme.oxblood, fontSize: 13 },

  pressed: { opacity: 0.7 },
});
