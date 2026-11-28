import { prisma } from "./db.js";

const DEFAULT_LIMIT = 50;

// The `day` column is a DATE (no time of day), so we build "today" at midnight UTC.
// Side effect: the counter resets at 00:00 UTC (1 am in Tunisia), which is fine here.
export function todayDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// The limit comes from the single AppConfig row (id = 1) that the admin edits.
// If that row doesn't exist yet (the seed step creates it later), fall back to 50.
export async function getDailyLimit() {
  const config = await prisma.appConfig.findUnique({ where: { id: 1 } });
  return config?.dailyAiLimit ?? DEFAULT_LIMIT;
}

// Gatekeeper for AI routes. Use it AFTER requireAuth (it needs req.user).
// If the user already used up today's messages, answer 429 and stop here.
export async function checkDailyLimit(req, res, next) {
  try {
    // Two independent queries, so run them at the same time.
    const [limit, log] = await Promise.all([
      getDailyLimit(),
      prisma.usageLog.findUnique({
        where: { userId_day: { userId: req.user.id, day: todayDate() } },
      }),
    ]);

    const used = log?.aiRequests ?? 0; // no row yet today = 0 used

    if (used >= limit) {
      return res
        .status(429)
        .json({ error: `Daily AI limit reached (${limit} messages). Try again tomorrow.` });
    }

    next();
  } catch (error) {
    console.error("Limit check failed:", error.message);
    res.status(500).json({ error: "Limit check failed" });
  }
}

// Call this AFTER a successful AI reply: adds 1 to today's counter for this user.
// If the counting itself fails we only log it, so the user still gets their reply.
export async function recordUsage(userId) {
  try {
    const day = todayDate();
    await prisma.usageLog.upsert({
      where: { userId_day: { userId, day } },
      update: { aiRequests: { increment: 1 } },
      create: { userId, day, aiRequests: 1 },
    });
  } catch (error) {
    console.error("Could not record usage:", error.message);
  }
}