// Ollama provider: sends the conversation to the local Ollama server
// and returns the model's reply as plain text.
export async function chat(messages) {
  const res = await fetch(`${process.env.OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL,
      messages, // Ollama uses the same { role, content } format as we do
      stream: false, // get the whole answer in one response
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}`);
  }

  const data = await res.json();
  return data.message?.content ?? "";
}
