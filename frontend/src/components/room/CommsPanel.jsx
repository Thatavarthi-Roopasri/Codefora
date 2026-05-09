import { Bot, ImagePlus, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import sticker1 from "../../../assets/sticker1.jpeg";
import sticker2 from "../../../assets/sticker2.jpeg";
import bonfire from "../../../assets/bonfire.jpeg";

const STICKERS = [
  { id: "sticker1", label: "Sticker 1", src: sticker1 },
  { id: "sticker2", label: "Sticker 2", src: sticker2 },
  { id: "bonfire", label: "Bonfire", src: bonfire }
];

function stickerFor(id) {
  return STICKERS.find((sticker) => sticker.id === id);
}

export function CommsPanel({
  messages,
  aiMessages,
  me,
  permissions,
  aiThinking,
  onSendChat,
  onSendSticker,
  onAskAi,
  onClearNotifications,
  activeTab,
  onSelectTab,
  isOpen,
  onClose
}) {
  const [chatText, setChatText] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const chatScrollRef = useRef(null);
  const aiScrollRef = useRef(null);
  const showChat = activeTab === "chat";
  const showAi = activeTab === "ai";

  const scrollToBottom = () => {
    const container = chatScrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  };

  const scrollAiToBottom = () => {
    const container = aiScrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  };

  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages, showChat]);

  useLayoutEffect(() => {
    scrollAiToBottom();
  }, [aiMessages, aiThinking, showAi]);

  function sendChat() {
    if (!chatText.trim()) return;
    onSendChat(chatText);
    setChatText("");
    setShowStickers(false);
    requestAnimationFrame(scrollToBottom);
  }

  function sendSticker(stickerId) {
    onSendSticker?.(stickerId);
    setShowStickers(false);
    requestAnimationFrame(scrollToBottom);
  }

  function askAi() {
    if (!aiPrompt.trim()) return;
    onAskAi(aiPrompt);
    setAiPrompt("");
  }

  return (
    <aside className={`side-panel comms-panel floating-comms ${isOpen ? "open" : ""}`} aria-hidden={!isOpen}>
      <button type="button" className="comms-close" onClick={onClose} aria-label="Close chat">
        <X size={16} />
      </button>

      <div className="comms-tabs" role="tablist" aria-label="Chat and AI tabs">
        <button
          type="button"
          className={`comms-tab ${showChat ? "active" : ""}`}
          onClick={() => onSelectTab("chat")}
          aria-selected={showChat}
          role="tab"
        >
          <MessageSquare size={15} />
          <span>Room Chat</span>
        </button>
        <button
          type="button"
          className={`comms-tab ${showAi ? "active" : ""}`}
          onClick={() => onSelectTab("ai")}
          aria-selected={showAi}
          role="tab"
        >
          <Bot size={15} />
          <span>Chat with AI</span>
        </button>
      </div>

      {showChat && (
        <section className="room-chat">
          <div className="chat-messages" ref={chatScrollRef}>
            {messages.map((message, index) => {
              const isMe = message.user === me?.name;
              const isAi = String(message.text || "").startsWith("AI Assistant:");
              const sticker = stickerFor(message.stickerId);
              const prevMessage = messages[index - 1];
              const isGrouped = prevMessage && prevMessage.user === message.user;
              const senderName = isAi ? "AI Assistant" : message.user;

              return (
                <div
                  className={`chat-message ${isMe ? "user-message" : "other-message"} ${isGrouped ? "grouped" : ""} ${isAi ? "ai-msg" : ""} ${message.optimistic ? "optimistic" : ""}`}
                  key={message.id || `${message.user}-${message.createdAt}`}
                >
                  <div className="msg-bubble">
                    <strong className="chat-sender-name">{senderName}</strong>
                    {sticker ? (
                      <img className="chat-sticker-image" src={sticker.src} alt={sticker.label} />
                    ) : (
                      <p>{isAi ? String(message.text || "").replace("AI Assistant: ", "") : message.text}</p>
                    )}
                  </div>
                  <div className="chat-meta">
                    {message.optimistic && <small className="msg-status">Sending...</small>}
                    {!isGrouped && (
                      <small className="msg-time">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </small>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chat-input-area">
            <div className="sticker-picker-wrap">
              <button
                type="button"
                className="chat-tool-btn"
                disabled={!permissions.canChat}
                onClick={() => setShowStickers((current) => !current)}
                aria-label="Open stickers"
                title="Stickers"
              >
                <ImagePlus size={18} />
              </button>
              {showStickers && (
                <div className="sticker-picker" role="menu" aria-label="Choose sticker">
                  {STICKERS.map((sticker) => (
                    <button
                      type="button"
                      key={sticker.id}
                      className="sticker-choice"
                      onClick={() => sendSticker(sticker.id)}
                      role="menuitem"
                    >
                      <img src={sticker.src} alt={sticker.label} />
                      <span>{sticker.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              disabled={!permissions.canChat}
              value={chatText}
              onChange={(event) => setChatText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && sendChat()}
              onFocus={onClearNotifications}
              placeholder={permissions.canChat ? "Type a message..." : "Chat disabled"}
            />
            <button
              className="chat-send-btn"
              disabled={!permissions.canChat}
              onClick={sendChat}
              aria-label="Send message"
            >
              <Send size={17} />
            </button>
          </div>
        </section>
      )}

      {showAi && (
        <section className="ai-box">
          <div className="messages messages--assistant" ref={aiScrollRef}>
            {aiMessages.length === 0 && (
              <div className="assistant-empty">
                <Sparkles size={14} />
                <p>Ask the assistant anything about your code, logic, or errors.</p>
              </div>
            )}

            {aiMessages.map((message) => (
              <div key={message.id} className={`ai-message ${message.role === "user" ? "ai-message--user" : "ai-message--assistant"}`}>
                <strong>{message.role === "user" ? "You" : "AI Assistant"}</strong>
                <div className="msg-bubble">
                  <p>{message.text}</p>
                </div>
              </div>
            ))}

            {aiThinking && (
              <div className="ai-message ai-message--assistant">
                <strong>AI Assistant</strong>
                <div className="msg-bubble">
                  <p>Thinking...</p>
                </div>
              </div>
            )}
          </div>
          <div className="send-row">
            <input
              disabled={!permissions.canUseAi}
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && askAi()}
              placeholder={permissions.canUseAi ? "Ask AI a coding doubt..." : "Chat only"}
            />
            <button
              className="icon-button orange"
              disabled={!permissions.canUseAi}
              onClick={askAi}
              aria-label="Ask AI"
            >
              <Send size={16} />
            </button>
          </div>
        </section>
      )}
    </aside>
  );
}
