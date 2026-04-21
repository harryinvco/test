import { useCallback, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatLogicalDate, getLogicalDate } from "@/lib/date";
import { listTabsForDate } from "@/notes/queries";
import { createLocalTab, deleteLocalTab, renameLocalTab } from "@/notes/mutations";
import { useSync } from "@/sync/SyncProvider";
import type { LocalTab } from "@/db/schema";
import { theme } from "@/ui/theme";
import { SyncPill } from "@/ui/SyncPill";

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const sync = useSync();
  const today = getLogicalDate();
  const date = dateParam ?? today;
  const readOnly = date !== today;

  const [tabs, setTabs] = useState<LocalTab[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  useLayoutEffect(() => {
    navigation.setOptions({
      title: readOnly ? "History" : "Notes",
      headerRight: () => (
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => void sync.syncNow()}
            disabled={sync.status === "syncing"}
            hitSlop={8}
          >
            <SyncPill status={sync.status} pending={sync.pending} />
          </Pressable>
          <Link href="/history" asChild>
            <Pressable hitSlop={8}>
              <Ionicons name="time-outline" size={22} color={theme.ink} />
            </Pressable>
          </Link>
          <Link href="/settings" asChild>
            <Pressable hitSlop={8}>
              <Ionicons name="settings-outline" size={22} color={theme.ink} />
            </Pressable>
          </Link>
        </View>
      ),
    });
  }, [navigation, readOnly, sync.status, sync.pending, sync.syncNow]);

  const refresh = useCallback(async () => {
    const rows = await listTabsForDate(date);
    setTabs(rows);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  // Re-fetch when a sync pulls new data.
  useFocusEffect(
    useCallback(() => {
      void refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sync.dataVersion]),
  );

  async function handleCreate() {
    const label = newLabel.trim();
    setCreating(false);
    setNewLabel("");
    if (!label) return;
    await createLocalTab({ date, label });
    await refresh();
  }

  async function handleDelete(tab: LocalTab) {
    Alert.alert("Delete tab?", `"${tab.label}" and all its notes will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteLocalTab(tab.id);
          await refresh();
        },
      },
    ]);
  }

  async function handleRename(tab: LocalTab) {
    Alert.prompt(
      "Rename tab",
      undefined,
      async (value) => {
        if (value && value.trim()) {
          await renameLocalTab(tab.id, value);
          await refresh();
        }
      },
      "plain-text",
      tab.label,
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{readOnly ? "ARCHIVED DAY" : "TODAY"}</Text>
        <Text style={styles.title}>{formatLogicalDate(date)}</Text>
      </View>

      {sync.status === "error" && sync.lastError && (
        <Pressable onPress={() => void sync.syncNow()} style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={14} color={theme.oxblood} />
          <Text style={styles.errorText} numberOfLines={2}>
            {sync.lastError}
          </Text>
          <Text style={styles.errorRetry}>Retry</Text>
        </Pressable>
      )}

      {tabs === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.ink} />
        </View>
      ) : tabs.length === 0 && !creating ? (
        <EmptyState readOnly={readOnly} onCreate={() => setCreating(true)} />
      ) : (
        <FlatList
          data={tabs}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <TabRow
              tab={item}
              readOnly={readOnly}
              onPress={() =>
                router.push({ pathname: "/tab/[tabId]", params: { tabId: item.id } })
              }
              onRename={() => handleRename(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListFooterComponent={
            !readOnly ? (
              creating ? (
                <View style={styles.newTabRow}>
                  <TextInput
                    autoFocus
                    value={newLabel}
                    onChangeText={setNewLabel}
                    onSubmitEditing={handleCreate}
                    onBlur={handleCreate}
                    placeholder="Tab name (e.g. Journal, Tasks)"
                    placeholderTextColor={theme.inkFaint}
                    style={styles.newTabInput}
                    returnKeyType="done"
                  />
                </View>
              ) : (
                <Pressable
                  onPress={() => setCreating(true)}
                  style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                >
                  <Ionicons name="add" size={18} color={theme.ink} />
                  <Text style={styles.addButtonText}>New tab</Text>
                </Pressable>
              )
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function TabRow({
  tab,
  readOnly,
  onPress,
  onRename,
  onDelete,
}: {
  tab: LocalTab;
  readOnly: boolean;
  onPress: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  function handleLongPress() {
    if (readOnly) return;
    Alert.alert(tab.label, undefined, [
      { text: "Rename", onPress: onRename },
      { text: "Delete", style: "destructive", onPress: onDelete },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={handleLongPress}
      style={({ pressed }) => [styles.tabRow, pressed && styles.pressed]}
    >
      <View style={styles.tabDot} />
      <Text style={styles.tabLabel} numberOfLines={1}>
        {tab.label}
      </Text>
      {tab.dirty === 1 && <View style={styles.dirtyDot} />}
      <Ionicons name="chevron-forward" size={18} color={theme.inkFaint} />
    </Pressable>
  );
}

function EmptyState({ readOnly, onCreate }: { readOnly: boolean; onCreate: () => void }) {
  if (readOnly) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No notes on this day.</Text>
      </View>
    );
  }
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>A fresh day.</Text>
      <Text style={styles.emptyText}>
        Create your first tab — Journal, Tasks, Ideas, whatever you&apos;re carrying today.
      </Text>
      <Pressable onPress={onCreate} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
        <Ionicons name="add" size={18} color={theme.primaryFg} />
        <Text style={styles.primaryText}>New tab</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.paper },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  eyebrow: { fontSize: 10, letterSpacing: 3, fontWeight: "600", color: theme.inkFaint },
  title: { fontSize: 28, fontWeight: "300", color: theme.ink, marginTop: 4 },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingRight: 4,
  },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
  separator: { height: 8 },

  tabRow: {
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
  tabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.ink },
  tabLabel: { flex: 1, fontSize: 16, fontWeight: "500", color: theme.ink },
  dirtyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.oxblood },

  newTabRow: {
    marginTop: 8,
    backgroundColor: theme.paperRaised,
    borderWidth: 1,
    borderColor: theme.rule,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  newTabInput: { fontSize: 16, color: theme.ink, padding: 0 },

  addButton: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: theme.rule,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
  },
  addButtonText: { fontSize: 14, fontWeight: "500", color: theme.ink },

  empty: { flex: 1, paddingHorizontal: 32, paddingTop: 80, alignItems: "center" },
  emptyTitle: { fontSize: 22, fontWeight: "300", color: theme.ink, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.inkMuted, textAlign: "center", lineHeight: 20 },

  primary: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  primaryText: { color: theme.primaryFg, fontSize: 15, fontWeight: "600" },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    backgroundColor: theme.oxbloodSoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8c1c1",
  },
  errorText: { color: theme.oxblood, fontSize: 12, flex: 1 },
  errorRetry: { color: theme.oxblood, fontSize: 12, fontWeight: "700" },

  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  pressed: { opacity: 0.7 },
});
