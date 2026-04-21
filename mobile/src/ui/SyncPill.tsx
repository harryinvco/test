import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SyncStatus } from "@/sync/SyncProvider";
import { theme } from "./theme";

type Props = {
  status: SyncStatus;
  pending: number;
};

export function SyncPill({ status, pending }: Props) {
  if (status === "syncing") {
    return (
      <View style={[styles.pill, styles.pillNeutral]}>
        <ActivityIndicator size="small" color={theme.inkMuted} />
        <Text style={[styles.text, styles.textNeutral]}>Syncing</Text>
      </View>
    );
  }
  if (status === "error") {
    return (
      <View style={[styles.pill, styles.pillError]}>
        <Ionicons name="alert-circle" size={12} color={theme.oxblood} />
        <Text style={[styles.text, styles.textError]}>Error</Text>
      </View>
    );
  }
  if (status === "offline") {
    return (
      <View style={[styles.pill, styles.pillNeutral]}>
        <Ionicons name="cloud-offline-outline" size={12} color={theme.inkMuted} />
        <Text style={[styles.text, styles.textNeutral]}>Offline</Text>
      </View>
    );
  }
  // idle
  if (pending > 0) {
    return (
      <View style={[styles.pill, styles.pillPending]}>
        <View style={styles.dot} />
        <Text style={[styles.text, styles.textPending]}>{pending} pending</Text>
      </View>
    );
  }
  return (
    <View style={[styles.pill, styles.pillNeutral]}>
      <Ionicons name="checkmark-circle-outline" size={12} color={theme.inkMuted} />
      <Text style={[styles.text, styles.textNeutral]}>Synced</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 72,
    justifyContent: "center",
  },
  pillNeutral: { backgroundColor: theme.paperRaised, borderColor: theme.rule },
  pillError: { backgroundColor: theme.oxbloodSoft, borderColor: "#e8c1c1" },
  pillPending: { backgroundColor: "#fdf6e3", borderColor: "#e8dfcb" },
  text: { fontSize: 11, fontWeight: "600" },
  textNeutral: { color: theme.inkMuted },
  textError: { color: theme.oxblood },
  textPending: { color: theme.ink },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.oxblood },
});
