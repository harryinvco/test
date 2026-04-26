import { useCallback, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getTabById, listNotesForTab } from "@/notes/queries";
import { createLocalNote, deleteLocalNote } from "@/notes/mutations";
import { getLogicalDate } from "@/lib/date";
import { useSync } from "@/sync/SyncProvider";
import type { LocalNote, LocalTab } from "@/db/schema";
import { theme } from "@/ui/theme";

export default function TabDetailScreen() {
  const { tabId } = useLocalSearchParams<{ tabId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const sync = useSync();
  const today = getLogicalDate();

  const [tab, setTab] = useState<LocalTab | null>(null);
  const [notes, setNotes] = useState<LocalNote[] | null>(null);

  const readOnly = tab ? tab.date !== today : false;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: tab?.label ?? "",
      headerRight: () =>
        !readOnly && tab ? (
          <Pressable hitSlop={8} onPress={() => void handleNewNote(tab)}>
            <Ionicons name="add" size={26} color={theme.ink} />
          </Pressable>
        ) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, tab, readOnly]);

  const refresh = useCallback(async () => {
    if (!tabId) return;
    const [t, ns] = await Promise.all([getTabById(tabId), listNotesForTab(tabId)]);
    setTab(t);
    setNotes(ns);
  }, [tabId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sync.dataVersion]),
  );

  async function handleNewNote(t: LocalTab) {
    const note = await createLocalNote({ tabId: t.id, date: t.date });
    router.push({ pathname: "/note/[noteId]", params: { noteId: note.id } });
  }

  async function handleDelete(note: LocalNote) {
    Alert.alert("Delete note?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteLocalNote(note.id);
          await refresh();
        },
      },
    ]);
  }

  if (!tab || notes === null) {
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
        <Text style={styles.eyebrow}>{readOnly ? "READ-ONLY" : "TAB"}</Text>
        <Text style={styles.title}>{tab.label}</Text>
      </View>

      {notes.length === 0 ? (
        <EmptyNotes readOnly={readOnly} onCreate={() => void handleNewNote(tab)} />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <NoteRow
              note={item}
              readOnly={readOnly}
              onPress={() =>
                router.push({ pathname: "/note/[noteId]", params: { noteId: item.id } })
              }
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function NoteRow({
  note,
  readOnly,
  onPress,
  onDelete,
}: {
  note: LocalNote;
  readOnly: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  function handleLongPress() {
    if (readOnly) return;
    Alert.alert(note.titlePreview || "New note", undefined, [
      { text: "Delete", style: "destructive", onPress: onDelete },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  const timestamp = new Date(note.updatedAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const preview = note.content.split("\n").filter((l) => l.trim().length > 0).slice(1, 3).join(" · ");

  return (
    <Pressable
      onPress={onPress}
      onLongPress={handleLongPress}
      style={({ pressed }) => [styles.noteRow, pressed && styles.pressed]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.noteTitle} numberOfLines={1}>
          {note.titlePreview || "New note"}
        </Text>
        <View style={styles.noteMeta}>
          <Text style={styles.noteTime}>{timestamp}</Text>
          {preview.length > 0 && (
            <Text style={styles.notePreview} numberOfLines={1}>
              {preview}
            </Text>
          )}
        </View>
      </View>
      {note.dirty === 1 && <View style={styles.dirtyDot} />}
      <Ionicons name="chevron-forward" size={18} color={theme.inkFaint} />
    </Pressable>
  );
}

function EmptyNotes({ readOnly, onCreate }: { readOnly: boolean; onCreate: () => void }) {
  if (readOnly) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No notes in this tab.</Text>
      </View>
    );
  }
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>Nothing here yet.</Text>
      <Pressable onPress={onCreate} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
        <Ionicons name="add" size={18} color={theme.primaryFg} />
        <Text style={styles.primaryText}>New note</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.paper },
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
  eyebrow: { fontSize: 10, letterSpacing: 3, fontWeight: "600", color: theme.inkFaint },
  title: { fontSize: 24, fontWeight: "400", color: theme.ink, marginTop: 4 },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
  separator: { height: 6 },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.paperRaised,
    borderWidth: 1,
    borderColor: theme.rule,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  noteTitle: { fontSize: 15, fontWeight: "500", color: theme.ink },
  noteMeta: { flexDirection: "row", gap: 10, marginTop: 3, alignItems: "baseline" },
  noteTime: { fontSize: 11, color: theme.inkFaint, fontFamily: "Menlo" },
  notePreview: { fontSize: 12, color: theme.inkMuted, flex: 1 },
  dirtyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.oxblood },

  empty: { flex: 1, paddingHorizontal: 32, paddingTop: 80, alignItems: "center" },
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

  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  pressed: { opacity: 0.7 },
});
