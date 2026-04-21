import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/auth/AuthContext";

export default function AppLayout() {
  const { status } = useAuth();

  if (status === "loading") return null;
  if (status !== "authenticated") return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#f5f1e8" },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "600" },
        headerTintColor: "#2d2620",
        contentStyle: { backgroundColor: "#f5f1e8" },
      }}
    >
      <Stack.Screen name="home" options={{ title: "Notes" }} />
      <Stack.Screen name="tab/[tabId]" options={{ title: "" }} />
      <Stack.Screen name="note/[noteId]" options={{ title: "" }} />
      <Stack.Screen name="history" options={{ title: "History" }} />
      <Stack.Screen name="settings" options={{ title: "Settings", presentation: "modal" }} />
    </Stack>
  );
}
