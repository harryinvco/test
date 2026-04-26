import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";

export default function Index() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (status === "authenticated") return <Redirect href="/home" />;
  return <Redirect href="/login" />;
}
