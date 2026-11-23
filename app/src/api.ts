// All calls from the app to the Andona server go through this file.

// Set in app/.env (see .env.example). Expo copies EXPO_PUBLIC_ variables into the app.
export const API_URL = process.env.EXPO_PUBLIC_API_URL;

const TIMEOUT_MS = 60000; // the server may try Gemini (up to 20 s) and then Ollama

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResult = {
  reply: string;
  provider: string; // "gemini" or "ollama"
};

// Sends the whole conversation to POST /chat and returns the AI's answer.
export async function sendChat(messages: ChatMessage[]): Promise<ChatResult> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not set. Create app/.env from .env.example.");
  }

  // Cancel the request if the server takes too long
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });
  } catch {
    // fetch only throws when there is no answer at all (wrong IP, server off, timeout)
    throw new Error(`Can't reach the server at ${API_URL}. Check Wi-Fi and that the server is running.`);
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // The server answered with an error (400, 500...): show its message
    throw new Error(data.error ?? `Server error ${res.status}`);
  }

  return data as ChatResult;
}
