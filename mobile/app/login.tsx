import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { API_BASE_URL } from "@/config";

export default function LoginScreen() {
  const { status, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authenticated") return <Redirect href="/home" />;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.status === 401 ? "Invalid email or password." : `Error: ${e.message}`);
      } else {
        setError(e instanceof Error ? e.message : "Network error.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || !email.trim() || !password;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.kav}
      >
        <View style={styles.container}>
          <Text style={styles.brand}>INNOVACO</Text>
          <Text style={styles.title}>Notes</Text>
          <Text style={styles.subtitle}>Sign in to sync with your command center.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              style={styles.input}
              editable={!submitting}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              textContentType="password"
              style={styles.input}
              editable={!submitting}
              onSubmitEditing={handleSubmit}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              onPress={handleSubmit}
              disabled={disabled}
              style={({ pressed }) => [
                styles.button,
                disabled && styles.buttonDisabled,
                pressed && !disabled && styles.buttonPressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.footer}>API: {API_BASE_URL}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f1e8" },
  kav: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 48 },
  brand: { fontSize: 10, letterSpacing: 4, color: "#9b8b6e", fontWeight: "600" },
  title: { fontSize: 40, fontWeight: "300", color: "#2d2620", marginTop: 4 },
  subtitle: { fontSize: 14, color: "#6e6255", marginTop: 6 },
  form: { marginTop: 36 },
  label: { fontSize: 11, letterSpacing: 1.5, color: "#6e6255", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#d9cfbc",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#2d2620",
    marginTop: 6,
  },
  error: { marginTop: 14, color: "#8a1f1f", fontSize: 13 },
  button: {
    marginTop: 24,
    backgroundColor: "#2d2620",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  footer: {
    marginTop: "auto",
    marginBottom: 8,
    fontSize: 11,
    color: "#9b8b6e",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
