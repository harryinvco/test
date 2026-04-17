import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const password = await rl.question("Password: ");
  rl.close();
  if (!password) {
    console.error("No password provided");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  console.log("\nADMIN_PASSWORD_HASH=" + hash);
}

main();
