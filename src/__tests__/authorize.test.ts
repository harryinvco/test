import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { verifyCredentials } from "@/auth";

const EMAIL = "harry@innovaco.cy";
const PASSWORD = "correct-password";

describe("verifyCredentials", () => {
  it("returns user on correct email + password", async () => {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const user = await verifyCredentials(
      { email: EMAIL, password: PASSWORD },
      { adminEmail: EMAIL, adminHash: hash },
    );
    expect(user).toMatchObject({ id: "admin", email: EMAIL });
  });

  it("returns null on wrong password", async () => {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const user = await verifyCredentials(
      { email: EMAIL, password: "wrong" },
      { adminEmail: EMAIL, adminHash: hash },
    );
    expect(user).toBeNull();
  });

  it("returns null on wrong email", async () => {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const user = await verifyCredentials(
      { email: "someone@else.com", password: PASSWORD },
      { adminEmail: EMAIL, adminHash: hash },
    );
    expect(user).toBeNull();
  });
});
