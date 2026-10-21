import { scrypt as scryptCallback, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { stdin, stdout } from "node:process";

const scrypt = promisify(scryptCallback);

if (!stdin.isTTY || !stdout.isTTY) {
  throw new Error("Run this script directly in a terminal.");
}

stdout.write("Enter a new admin password (12+ characters): ");
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

let password = "";

try {
  for await (const chunk of stdin) {
    for (const char of chunk) {
      if (char === "\u0003") throw new Error("Cancelled.");
      if (char === "\r" || char === "\n") {
        stdin.setRawMode(false);
        stdout.write("\n");
        break;
      }
      if (char === "\u007f" || char === "\b") {
        password = password.slice(0, -1);
      } else {
        password += char;
      }
    }
    if (!stdin.isRaw) break;
  }

  if (password.length < 12) {
    throw new Error("Password must contain at least 12 characters.");
  }

  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);

  console.log("\nYour ADMIN_PASSWORD_HASH value:\n");
  console.log(`scrypt$${salt}$${derived.toString("hex")}`);
  console.log("\nCopy the hash into your local .env file.");
} finally {
  password = "";
  if (stdin.isTTY && stdin.isRaw) stdin.setRawMode(false);
  stdin.pause();
}
