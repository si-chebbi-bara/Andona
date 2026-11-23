import { prisma } from "../db.js";
import { verifyToken } from "./tokens.js";

// Lets a request through only if it carries a valid login token.
// The app sends it as the header:  Authorization: Bearer <token>
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Login required." });
  }

  let payload;
  try {
    payload = verifyToken(token); // throws if fake, changed or expired
  } catch {
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }

  try {
    // Read the user from the database on every request (not only from the token),
    // so a ban or a role change takes effect immediately.
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      return res.status(401).json({ error: "Account not found. Please log in again." });
    }
    if (user.status === "BANNED") {
      return res.status(403).json({ error: "This account has been banned." });
    }

    req.user = user; // the next handlers know who is calling
    next();
  } catch (error) {
    console.error("Auth check failed:", error.message);
    res.status(500).json({ error: "Auth check failed" });
  }
}

// Use after requireAuth: lets the request through only for admins.
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Admins only." });
  }
  next();
}
