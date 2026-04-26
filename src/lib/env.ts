import { z } from "zod";

const EnvSchema = z.object({
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD_HASH: z.string().min(1, "ADMIN_PASSWORD_HASH is required"),
  TURSO_DATABASE_URL: z.string().url("TURSO_DATABASE_URL must be a URL"),
  TURSO_AUTH_TOKEN: z.string().min(1, "TURSO_AUTH_TOKEN is required"),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  AGENT_MODEL: z.string().default("claude-sonnet-4-6"),
  AGENT_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(50),
});

export type Env = z.infer<typeof EnvSchema>;

// ADMIN_PASSWORD_HASH can contain `$` which Next's dotenv-expand interprets as
// variable references, silently stripping chunks of bcrypt output. To sidestep
// this, the hash is stored base64-encoded in ADMIN_PASSWORD_HASH_B64 and
// decoded here before Zod parsing.
function resolvePasswordHash(
  source: Record<string, string | undefined>,
): string | undefined {
  if (source.ADMIN_PASSWORD_HASH && source.ADMIN_PASSWORD_HASH.startsWith("$2")) {
    return source.ADMIN_PASSWORD_HASH;
  }
  if (source.ADMIN_PASSWORD_HASH_B64) {
    try {
      return Buffer.from(source.ADMIN_PASSWORD_HASH_B64, "base64").toString("utf-8");
    } catch {
      return source.ADMIN_PASSWORD_HASH;
    }
  }
  return source.ADMIN_PASSWORD_HASH;
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  // eslint-disable-next-line no-console
  console.log("[env debug]", {
    has_b64: !!source.ADMIN_PASSWORD_HASH_B64,
    b64_len: (source.ADMIN_PASSWORD_HASH_B64 ?? "").length,
    has_raw: !!source.ADMIN_PASSWORD_HASH,
    raw_len: (source.ADMIN_PASSWORD_HASH ?? "").length,
    admin_email: source.ADMIN_EMAIL,
    auth_secret_len: (source.AUTH_SECRET ?? "").length,
  });
  const normalized = { ...source, ADMIN_PASSWORD_HASH: resolvePasswordHash(source) };
  const result = EnvSchema.safeParse(normalized);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
