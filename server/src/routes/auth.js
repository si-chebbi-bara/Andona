import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { createToken, publicUser } from "../auth/tokens.js";

const router = Router();

const SALT_ROUNDS = 10; // bcrypt cost: 2^10 rounds, about 50-100 ms per hash
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // "something@something.something"

// A real bcrypt hash of a random password. Used when the email is unknown,
// so a failed login always takes the same time (see /login).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", SALT_ROUNDS);

// Trim spaces and lowercase the email, so " Bara@X.com " and "bara@x.com" match.
function cleanEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

// POST /auth/register  { name, email, password }
router.post("/register", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = cleanEmail(req.body?.email);
  const password = req.body?.password;

  if (!name || !EMAIL_PATTERN.test(email) || typeof password !== "string") {
    return res.status(400).json({ error: "Name, a valid email and a password are required." });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the user and their default settings together.
    // The role is never read from the request: everyone registers as USER.
    const user = await prisma.user.create({
      data: { name, email, passwordHash, settings: { create: {} } },
    });

    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === "P2002") {
      // P2002 = unique constraint failed: this email is already used
      return res.status(409).json({ error: "This email is already registered." });
    }
    console.error("Register failed:", error.message);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /auth/login  { email, password }
router.post("/login", async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== "string" || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always run one bcrypt compare, even for an unknown email, so the response
    // time doesn't reveal which emails have an account.
    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    // Same message for "no such email" and "wrong password"
    if (!user || !passwordOk) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    // Checked only after the password, so it can't be used to probe emails
    if (user.status === "BANNED") {
      return res.status(403).json({ error: "This account has been banned." });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    console.error("Login failed:", error.message);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
