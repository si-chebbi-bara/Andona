import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { ChatMessage, sendChat } from "../api";
import { colors } from "../theme";

// A message on screen: the text plus which AI answered (only for AI replies)
type Bubble = ChatMessage & { provider?: string };

const PROVIDER_NAMES: Record<string, string> = { gemini: "Gemini", ollama: "Ollama" };

export default function ChatScreen() {
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headerHeight = useHeaderHeight();

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Bubble = { role: "user", content: text };
    const history = [...messages, userMessage];
    setMessages(history); // show the user's message right away
    setInput("");
    setError(null);
    setLoading(true);

    try {
      // Send only role + content: the server doesn't need our provider labels
      const { reply, provider } = await sendChat(
        history.map(({ role, content }) => ({ role, content }))
      );
      setMessages([...history, { role: "assistant", content: reply, provider }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function renderBubble({ item }: { item: Bubble }) {
    const isUser = item.role === "user";
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={isUser ? styles.userText : styles.aiText}>{item.content}</Text>
        {item.provider && (
          <Text style={styles.providerLabel}>
            answered by {PROVIDER_NAMES[item.provider] ?? item.provider}
          </Text>
        )}
      </View>
    );
  }

  const canSend = input.trim().length > 0 && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <FlatList
        data={messages}
        renderItem={renderBubble}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Ask Andona anything.</Text>}
        ListFooterComponent={
          loading ? (
            <View style={[styles.bubble, styles.aiBubble, styles.thinking]}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.aiText}>Thinking…</Text>
            </View>
          ) : undefined
        }
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message"
          placeholderTextColor={colors.muted}
          multiline
        />
        <Pressable
          style={[styles.sendButton, !canSend && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 40 },
  bubble: { maxWidth: "80%", padding: 12, borderRadius: 16 },
  userBubble: { alignSelf: "flex-end", backgroundColor: colors.accent },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userText: { color: colors.onAccent, fontSize: 16 },
  aiText: { color: colors.text, fontSize: 16 },
  providerLabel: { color: colors.muted, fontSize: 12, marginTop: 6 },
  thinking: { flexDirection: "row", alignItems: "center", gap: 8 },
  error: { color: colors.error, paddingHorizontal: 16, paddingVertical: 8 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: colors.onAccent, fontWeight: "600" },
});
