import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/ui/theme";
import type { ToolbarAction } from "./bridge";

type Props = {
  onAction: (action: ToolbarAction) => void;
};

type Button = {
  action: ToolbarAction;
  render: () => ReactNode;
  label: string;
};

const BUTTONS: Button[] = [
  { action: "checkbox", label: "Checkbox", render: () => <Ionicons name="checkbox-outline" size={22} color={theme.ink} /> },
  { action: "bullet",   label: "Bullet",   render: () => <Ionicons name="list" size={22} color={theme.ink} /> },
  { action: "heading",  label: "Heading",  render: () => <Text style={styles.textIcon}>H</Text> },
  { action: "bold",     label: "Bold",     render: () => <Text style={[styles.textIcon, styles.bold]}>B</Text> },
  { action: "italic",   label: "Italic",   render: () => <Text style={[styles.textIcon, styles.italic]}>I</Text> },
  { action: "link",     label: "Link",     render: () => <Ionicons name="link" size={20} color={theme.ink} /> },
];

export function EditorToolbar({ onAction }: Props) {
  return (
    <View style={styles.bar}>
      {BUTTONS.map((b) => (
        <Pressable
          key={b.action}
          accessibilityRole="button"
          accessibilityLabel={b.label}
          onPress={() => onAction(b.action)}
          hitSlop={8}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        >
          {b.render()}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 44,
    backgroundColor: theme.paperRaised,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.rule,
  },
  btn: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  textIcon: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.ink,
  },
  bold: { fontWeight: "900" },
  italic: { fontStyle: "italic" },
});
