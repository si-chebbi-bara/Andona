import {chat } from "./llm/ollama.js";

app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Invalid format. Expected a non-empty messages array." });
    }

    const reply = await chat(messages);
    res.json({ reply });
  } catch (error) {
    console.error("Error in /chat route:", error);
    res.status(500).json({ error: "AI request failed" });
  }
});