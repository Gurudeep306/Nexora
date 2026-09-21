#!/usr/bin/env node
/**
 * Set (or reset) a user's password — for accounts that have none, or when you
 * forget yours.
 *
 *   npm run user:set-password -- <username>            # local tracker.db
 *   npm run user:set-password -- <username> --cloud    # live site (Turso, uses .env)
 *
 * The password is typed at a hidden prompt, never passed on the command line.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env"), quiet: true });
const crypto = require("crypto");
const readline = require("readline");

const args = process.argv.slice(2);
const username = args.find((a) => !a.startsWith("--"));
const cloud = args.includes("--cloud");
if (!username) {
  console.error("Usage: npm run user:set-password -- <username> [--cloud]");
  process.exit(1);
}
if (cloud) {
  if (!process.env.TURSO_DATABASE_URL) {
    console.error("✗ TURSO_DATABASE_URL is not set in .env");
    process.exit(1);
  }
  process.env.USE_CLOUD_DB = "1";
}
const { get, run } = require("../src/db");

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(question)) rl.output.write(s);
      else rl.output.write("*");
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const hash = (pw) =>
  new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(pw, salt, 64, (err, key) => (err ? reject(err) : resolve(`${salt}:${key.toString("hex")}`)));
  });

(async () => {
  const user = await get("SELECT username FROM users WHERE username=?", [username]);
  if (!user) {
    console.error(`✗ No user named "${username}" in the ${cloud ? "cloud" : "local"} database`);
    process.exit(1);
  }
  const pw = await askHidden("New password (min 8 chars): ");
  if (pw.length < 8) {
    console.error("✗ Too short — use at least 8 characters");
    process.exit(1);
  }
  const again = await askHidden("Repeat password: ");
  if (pw !== again) {
    console.error("✗ Passwords don't match");
    process.exit(1);
  }
  await run("UPDATE users SET password_hash=? WHERE username=?", [await hash(pw), username]);
  console.log(`✓ Password set for @${username} (${cloud ? "live site" : "local"}). You can sign in with it now.`);
  process.exit(0);
})().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
