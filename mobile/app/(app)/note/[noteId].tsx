import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getNoteById } from "@/notes/queries";
import { updateLocalNote } from "@/notes/mutations";
import { getLogicalDate } from "@/lib/date";
import { deriveTitle } from "@/lib/title";
import type { LocalNote } from "@/db/schema";
import { theme } from "@/ui/theme";

type SaveStatus = "idle" | "saving" | "saved";

const AUTOSAVE_DEBOUNCE_MS = 600;

export default function NoteEditorScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const navigation = useNavigation();
  const today = getLogicalDate();

  const [note, setNote] = useState<LocalNote | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | null>(null);
  const savingIdRef = useRef<string | null>(null);

  const readOnly = note ? note.date !== today : false;
  const derivedTitle =
    (note && note.titlePreview) || deriveTitle(draft) || "New note";

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "",
      headerRight: () => <SaveIndicator status={status} readOnly={readOnly} />,
    });
  }, [navigation, status, readOnly]);

  const load = useCallback(async () => {
    if (!noteId) return;
    const row = await getNoteById(noteId);
    if (!row) {
      setNote(null);
      return;
    }
    setNote(row);
    setDraft(row.content);
    savingIdRef.current = row.id;
    setStatus("idle");
  }, [noteId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Flush any pending save on unmount.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const id = savingIdRef.current;
      const pending = pendingRef.current;
      if (id && pending !== null) {
        void updateLocalNote(id, pending);
      }
    };
  }, []);

  function scheduleSave(content: string) {
    if (!note) return;
    pendingRef.current = content;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        await updateLocalNote(note.id, content);
        pendingRef.current = null;
        setStatus("saved");
      } catch {
        // Intentional: silent local save failure is extremely unlikely; Phase 4
        // will surface sync errors separately.
        setStatus("idle");
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  function handleChange(text: string) {
    setDraft(text);
    scheduleSave(text);
  }

  if (!note) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.ink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.kav}
    >
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {derivedTitle}
          </Text>
        </View>
        <TextInput
          value={draft}
          onChangeText={handleChange}
          editable={!readOnly}
          placeholder={readOnly ? "" : "Start typing…"}
          placeholderTextColor={theme.inkFaint}
          multiline
          autoFocus={!readOnly && draft.length === 0}
          textAlignVertical="top"
          scrollEnabled
          spellCheck
          autoCorrect
          style={[styles.editor, readOnly && styles.editorReadOnly]}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function SaveIndicator({ status, readOnly }: { status: SaveStatus; readOnly: boolean }) {
  if (readOnly) {
    return <Text style={styles.headerText}>Read-only</Text>;
  }
  if (status === "saving") {
    return (
      <View style={styles.headerIndicator}>
        <Ionicons name="cloud-outline" size={16} color={theme.inkMuted} />
        <Text style={styles.headerText}>Saving…</Text>
      </View>
    );
  }
  if (status === "saved") {
    return (
      <View style={styles.headerIndicator}>
        <Ionicons name="checkmark-circle-outline" size={16} color={theme.inkMuted} />
        <Text style={styles.headerText}>Saved</Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: theme.paper },
  safe: { flex: 1, backgroundColor: theme.paper },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  titleRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: "500", color: theme.ink },

  editor: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
    fontSize: 16,
    lineHeight: 24,
    color: theme.ink,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  editorReadOnly: { color: theme.inkMuted },

  headerIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 4,
  },
  headerText: { fontSize: 12, color: theme.inkMuted, paddingRight: 4 },
});
