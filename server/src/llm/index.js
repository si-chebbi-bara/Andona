import * as gemini from "./gemini.js";
import * as ollama from "./ollama.js";

const providers = { gemini, ollama };

export async function chat(messages, preferred) {
  const first = preferred || process.env.DEFAULT_PROVIDER || "gemini";

  if (!providers[first]) {
    throw new Error(`Unknown provider: ${first}`);
  }

  const order = [first, ...Object.keys(providers).filter((name) => name !== first)];

  let lastError;
  for (const name of order) {
    try {
      const reply = await providers[name].chat(messages);
      return { reply, provider: name };
    } catch (err) {
      console.error(`Provider ${name} failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError;
}