import Constants from "expo-constants";

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Fallback: infer the LAN IP of the Metro dev server for physical-device dev.
  // When connecting from Expo Go / dev build to the host machine, the server IP
  // is in `expoGoConfig.debuggerHost` (or legacy `hostUri`), e.g. "192.168.1.5:8081".
  // We assume the Next.js API is running on the same host at port 3000.
  const dbg =
    (Constants.expoConfig?.hostUri as string | undefined) ??
    (Constants.expoGoConfig?.debuggerHost as string | undefined);
  if (dbg) {
    const host = dbg.split(":")[0];
    return `http://${host}:3000`;
  }

  // Last resort — simulator on the same machine as the Next dev server.
  return "http://localhost:3000";
}

export const API_BASE_URL = resolveApiBaseUrl();
