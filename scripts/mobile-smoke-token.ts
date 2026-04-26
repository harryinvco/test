import { signMobileToken } from "@/lib/mobile/auth";
import { env } from "@/lib/env";

const token = signMobileToken({
  sub: "admin",
  email: env.ADMIN_EMAIL,
  secret: env.AUTH_SECRET,
});
process.stdout.write(token);
