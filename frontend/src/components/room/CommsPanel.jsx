import { Bot, ImagePlus, MessageSquare, Send, Sparkles, X as XIcon, Paperclip, ChevronsRight, CheckCheck } from "lucide-react";
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
  onClose,
  participantsCount
}) {
  const [chatText, setChatText] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const chatScrollRef = useRef(null);

  const scrollToBottom = () => {
    const container = chatScrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  };

  useLayoutEffect(() => {
    setTimeout(scrollToBottom, 10);
  }, [messages]);

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


  return (
    <aside className={`side-panel comms-panel floating-comms ${isOpen ? "open" : ""}`} aria-hidden={!isOpen}>
      <div className="comms-header-cyber">
        <div className="comms-header-left">
          <div className="comms-icon-glowing">
            <MessageSquare size={20} className="glow-icon-svg" />
          </div>
          <div className="comms-title-wrap">
            <h2>Room Chat</h2>
            <span className="comms-subtitle">
              <span className="green-dot" /> {participantsCount || 1} participants online
            </span>
          </div>
        </div>

        <div className="comms-header-right">
          {permissions?.canUseAi && (
            <button
              type="button"
              className="ai-toggle-pill tour-chat-ai"
              onClick={() => window.dispatchEvent(new Event("toggleGlobalAiChat"))}
            >
              <span>Chat with AI</span>
              <Sparkles size={11} className="orange-sparkle" />
            </button>
          )}
          <button type="button" className="comms-close-cyber" onClick={onClose} aria-label="Close chat">
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>

      <section className="room-chat">
          <div className="chat-messages" ref={chatScrollRef}>
            {messages.map((message, index) => {
              const isMe = message.user === me?.name;
              const isAi = String(message.text || "").startsWith("AI Assistant:");
              const sticker = stickerFor(message.stickerId);
              const prevMessage = messages[index - 1];
              const isGrouped = prevMessage && prevMessage.user === message.user;
              const senderName = isAi ? "AI Assistant" : message.user;
              const formattedTime = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

              if (isMe) {
                return (
                  <div
                    className={`chat-message user-message ${isGrouped ? "grouped" : ""} ${message.optimistic ? "optimistic" : ""}`}
                    key={message.id || `${message.user}-${message.createdAt}`}
                  >
                    {!isGrouped && <span className="chat-time-above">{formattedTime}</span>}
                    <div className="msg-bubble">
                      <strong className="chat-sender-name-me">{senderName}</strong>
                      {sticker ? (
                        <img className="chat-sticker-image" src={sticker.src} alt={sticker.label} />
                      ) : (
                        <p>{message.text}</p>
                      )}
                      <span className="chat-status-check">
                        <CheckCheck size={12} />
                      </span>
                    </div>
                  </div>
                );
              }

              // Others' messages
              const initials = (senderName || "").slice(0, 1).toUpperCase();
              return (
                <div
                  className={`chat-message other-message ${isGrouped ? "grouped" : ""} ${isAi ? "ai-msg" : ""} ${message.optimistic ? "optimistic" : ""}`}
                  key={message.id || `${message.user}-${message.createdAt}`}
                >
                  {!isGrouped && (
                    <div className="chat-sender-row">
                      <div className="chat-avatar">{initials}</div>
                      <div className="chat-sender-info">
                        <span className="chat-sender-name-other">{senderName}</span>
                        <span className="chat-time-other">{formattedTime}</span>
                      </div>
                    </div>
                  )}
                  <div className="msg-bubble">
                    {sticker ? (
                      <img className="chat-sticker-image" src={sticker.src} alt={sticker.label} />
                    ) : (
                      <p>{isAi ? String(message.text || "").replace("AI Assistant: ", "") : message.text}</p>
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
                className="chat-tool-btn-cyber tour-chat-attachment"
                disabled={!permissions.canChat}
                onClick={() => setShowStickers((current) => !current)}
                aria-label="Open stickers"
                title="Stickers"
              >
                <Paperclip size={18} />
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
            <textarea
              disabled={!permissions.canChat}
              value={chatText}
              onChange={(event) => setChatText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendChat();
                }
              }}
              onFocus={onClearNotifications}
              placeholder={permissions.canChat ? "Type a message..." : "Chat disabled"}
              rows={1}
              style={{ resize: "none", overflowY: "auto" }}
            />
            <button
              className="chat-send-btn-cyber"
              disabled={!permissions.canChat}
              onClick={sendChat}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </section>
    </aside>
  );
}
