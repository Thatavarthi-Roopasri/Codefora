import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquare, X as XIcon, Bot, Sparkles, Send, User } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

export default function GlobalAiChat() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [greetingText, setGreetingText] = useState("");
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleToggle = () => setOpen((prev) => !prev);
    window.addEventListener("toggleGlobalAiChat", handleToggle);
    return () => window.removeEventListener("toggleGlobalAiChat", handleToggle);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (!user) return;
    const isHome = location.pathname === "/" || location.pathname === "/home";
    
    if (isHome) {
      const hasGreeted = sessionStorage.getItem(`greeted_${user.uid || user.id}`);
      if (!hasGreeted) {
        sessionStorage.setItem(`greeted_${user.uid || user.id}`, "true");
        
        const name = user.displayName || user.username || "friend";
        const greetings = [
          `Hi ${name}! 👋 How can I help you today?`,
          `Hello ${name}! ✨ How was your day? Need help with any problems?`,
          `Welcome back ${name}! 🚀 Ready to code? Let me know if you have any questions!`,
          `Hey ${name}! 🤩 Ask me anything about Codefora!`
        ];
        
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        
        setMessages([{
          id: `a-${Date.now()}`,
          role: "assistant",
          text: randomGreeting
        }]);
        setGreetingText(randomGreeting);
        
        // Auto-hide the floating greeting after 8 seconds
        setTimeout(() => setGreetingText(""), 8000);
      }
    }
  }, [user, location.pathname]);



  const getPageName = () => {
    const path = location.pathname;
    if (path === "/" || path === "/home") return "Home";
    if (path.startsWith("/admin")) return "Admin Dashboard";
    if (path.startsWith("/profile")) return "Profile";
    if (path.startsWith("/rooms")) return "Rooms Library";
    return "Codefora Platform";
  };

  async function handleAskAi() {
    if (!prompt.trim() || thinking) return;
    const input = prompt.trim();
    setPrompt("");
    setThinking(true);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: input }]);

    try {
      const result = await api.request("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          prompt: input,
          context: {
            page: getPageName(),
            code: localStorage.getItem("current_code") || "",
            language: localStorage.getItem("current_language") || "",
            problemTitle: localStorage.getItem("current_problem_title") || "",
          }
        })
      });
      setMessages((prev) => [
        ...prev,
        { 
          id: `a-${Date.now()}`, 
          role: "assistant", 
          text: result.suggestion || "No answer returned.",
          feedbackNote: result.feedbackNote
        }
      ]);

      if (result.action === "highlight" && result.targetSelector) {
        const el = document.querySelector(result.targetSelector);
        if (el) {
          // Scroll to element smoothly
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add glowing highlight
          el.classList.add('ai-dom-highlight');
          // Remove highlight after 5 seconds
          setTimeout(() => el.classList.remove('ai-dom-highlight'), 5000);
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: "assistant", text: error.message || "AI request failed." }
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <>
      {/* Floating Glassmorphic Greeting */}
      {!open && greetingText && (
        <div className="ai-floating-greeting" onClick={() => { setOpen(true); setGreetingText(""); }}>
          <div className="greeting-content">
            <Sparkles size={16} className="greeting-icon" />
            <p>{greetingText}</p>
          </div>
          <button className="greeting-close" onClick={(e) => { e.stopPropagation(); setGreetingText(""); }}>
            <XIcon size={12} />
          </button>
        </div>
      )}

      {!location.pathname.startsWith("/code") && (
        <button
          type="button"
          className="problem-ai-fab"
          onClick={() => { setOpen(!open); setGreetingText(""); }}
          aria-label={open ? "Close AI assistant" : "Open AI assistant"}
          style={{ zIndex: 9999 }}
        >
          {open ? <XIcon size={22} /> : <img src="/ai-icon.png" alt="AI" className="ai-fab-img" />}
        </button>
      )}

      <aside className={`problem-ai-panel ${open ? "open" : ""}`} aria-hidden={!open} style={{ zIndex: 9999 }}>
        <div className="problem-ai-header">
          <div>
            <span><Bot size={15} /> AI Assistant</span>
            <strong>{getPageName()}</strong>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close AI">
            <XIcon size={16} />
          </button>
        </div>

        <div className="problem-ai-messages">
          {messages.length === 0 && (
            <div className="assistant-empty">
              <Sparkles size={15} />
              <p>Ask me anything about Codefora, features, or how to navigate the platform!</p>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className={`ai-message ${message.role === "user" ? "ai-message--user" : "ai-message--assistant"}`}>
              <div className="avatar">
                {message.role === "user" ? <User size={14} /> : <img src="/ai-icon.png" alt="AI" className="ai-avatar-img" />}
              </div>
              <div className="msg-bubble">
                <p>{message.text}</p>
                {message.feedbackNote && <p className="feedback-note">{message.feedbackNote}</p>}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="ai-message ai-message--assistant">
              <div className="avatar">
                <img src="/ai-icon.png" alt="AI" className="ai-avatar-img" />
              </div>
              <div className="msg-bubble"><p>Thinking...</p></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="problem-ai-input">
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleAskAi()}
            placeholder="Ask AI about Codefora..."
          />
          <button type="button" onClick={handleAskAi} disabled={thinking || !prompt.trim()} aria-label="Ask AI">
            <Send size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
