import express from 'express';
import cors from 'cors';
import { chat } from "./llm/index.js";
import authRouter from "./routes/auth.js";
import { requireAuth, requireAdmin } from "./auth/middleware.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", app:"Andona" });
});

// /auth/register and /auth/login
app.use("/auth", authRouter);

// Admin-only test route, to check requireAdmin (real admin routes come in Step 8)
app.get("/admin/ping", requireAuth, requireAdmin, (req, res) => {
  res.json({ ok: true, admin: req.user.email });
});

// Needs a login. Body: { messages: [{ role, content }], provider?: "gemini" | "ollama" }
app.post("/chat", requireAuth, async (req, res) => {
  const { messages, provider } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Expected a non-empty messages array." });
  }

  try {
    const result = await chat(messages, provider); // { reply, provider }
    res.json(result);
  } catch (error) {
    console.error("All AI providers failed:", error.message);
    res.status(500).json({ error: "AI request failed" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});