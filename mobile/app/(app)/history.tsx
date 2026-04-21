import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { listDatesWithContent, type DateRollup } from "@/notes/queries";
import { formatLogicalDate, getLogicalDate } from "@/lib/date";
import { theme } from "@/ui/theme";

export default function HistoryScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<DateRollup[] | null>(null);
  const today = getLogicalDate();

  const refresh = useCallback(async () => {
    const data = await listDatesWithContent(today);
    setRows(data);
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (rows === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.ink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>HISTORY</Text>
        <Text style={styles.title}>Every day you&apos;ve written.</Text>
        <Text style={styles.sub}>
          Past days are read-only. A fresh slate starts each morning at 07:00.
        </Text>
      </View>
      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No past days yet. Come back tomorrow.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.date}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: "/home", params: { date: item.date } })
              }
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{formatLogicalDate(item.date)}</Text>
                <Text style={styles.rowMeta}>{item.date}</Text>
              </View>
              <View style={styles.counts}>
                <View style={styles.count}>
                  <Ionicons name="folder-outline" size={14} color={theme.inkMuted} />
                  <Text style={styles.countText}>{item.tabCount}</Text>
                </View>
                <View style={styles.count}>
                  <Ionicons name="document-text-outline" size={14} color={theme.inkMuted} />
                  <Text style={styles.countText}>{item.noteCount}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.inkFaint} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.paper },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  eyebrow: { fontSize: 10, letterSpacing: 3, fontWeight: "600", color: theme.inkFaint },
  title: { fontSize: 24, fontWeight: "300", color: theme.ink, marginTop: 4 },
  sub: { fontSize: 13, color: theme.inkMuted, marginTop: 6, lineHeight: 18 },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
  separator: { height: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.paperRaised,
    borderWidth: 1,
    borderColor: theme.rule,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowTitle: { fontSize: 15, fontWeight: "500", color: theme.ink },
  rowMeta: { fontSize: 11, color: theme.inkFaint, fontFamily: "Menlo", marginTop: 2 },
  counts: { flexDirection: "row", gap: 10 },
  count: { flexDirection: "row", alignItems: "center", gap: 3 },
  countText: { fontSize: 12, color: theme.inkMuted, fontFamily: "Menlo" },

  empty: { flex: 1, paddingHorizontal: 32, paddingTop: 80, alignItems: "center" },
  emptyText: { fontSize: 14, color: theme.inkMuted, textAlign: "center", lineHeight: 20 },

  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  pressed: { opacity: 0.7 },
});
