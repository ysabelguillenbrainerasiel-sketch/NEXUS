import { useState, useRef, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const MODEL = "claude-sonnet-4-20250514";
const AI_NAME = "NEXUS";
const AI_TAGLINE = "Advanced Intelligence System";

const SYSTEM_PROMPT = `You are NEXUS, an elite AI assistant. You are:
- Brilliant, precise, and deeply knowledgeable across all domains
- Capable of coding, analysis, creative writing, math, research, and conversation
- You have a sharp, confident personality — direct but never cold
- You format responses beautifully: use markdown naturally (bold, lists, code blocks)
- For code, always use fenced code blocks with the language specified
- You are NOT ChatGPT, NOT Claude, NOT Gemini. You are NEXUS. If asked, say you are NEXUS, a next-generation AI.
- Keep responses focused and high-quality. No fluff, no excessive disclaimers.
- When doing math or logic, think step by step.`;

// ─── PERSONAS / MODES ─────────────────────────────────────────────────────────
const MODES = [
  { id: "default", label: "⚡ General",    color: "#6366f1", desc: "All-purpose intelligence" },
  { id: "code",    label: "⟨/⟩ Coder",    color: "#10b981", desc: "Code generation & review" },
  { id: "think",   label: "◎ Analyst",    color: "#f59e0b", desc: "Deep reasoning & analysis" },
  { id: "create",  label: "✦ Creative",   color: "#ec4899", desc: "Writing & creative tasks" },
];

const MODE_EXTRAS = {
  default: "",
  code: "\nMODE: You are in CODER mode. Prioritize clean, production-ready code. Always include language in code fences. Explain what the code does briefly after.",
  think: "\nMODE: You are in ANALYST mode. Think step by step. Break down problems. Show your reasoning clearly before giving conclusions.",
  create: "\nMODE: You are in CREATIVE mode. Be imaginative, vivid, and original. Write with style and personality.",
};

// ─── API ──────────────────────────────────────────────────────────────────────
async function callNexus(messages, mode) {
  const system = SYSTEM_PROMPT + (MODE_EXTRAS[mode] || "");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `Error ${res.status}`);
  }
  const data = await res.json();
  return data.content?.map(b => b.text || "").join("") || "No response.";
}

// ─── MARKDOWN RENDERER ────────────────────────────────────────────────────────
function renderMarkdown(text) {
  const parts = [];
  const codeRe = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
  let last = 0, m, key = 0;

  while ((m = codeRe.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(<InlineText key={key++} text={text.slice(last, m.index)} />);
    }
    parts.push(<CodeFence key={key++} lang={m[1] || "text"} code={m[2].trimEnd()} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<InlineText key={key++} text={text.slice(last)} />);
  return parts;
}

function InlineText({ text }) {
  // Process bold, inline code, line breaks
  const lines = text.split("\n");
  return (
    <span style={{ display: "block" }}>
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return (
          <span key={li}>
            {parts.map((p, pi) => {
              if (p.startsWith("**") && p.endsWith("**"))
                return <strong key={pi} style={{ color: "#f1f5f9", fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
              if (p.startsWith("`") && p.endsWith("`"))
                return (
                  <code key={pi} style={{
                    background: "#1e1e2e", color: "#a78bfa",
                    padding: "1px 6px", borderRadius: 4, fontSize: "0.88em",
                    fontFamily: "monospace", border: "1px solid #2d2d3f",
                  }}>{p.slice(1, -1)}</code>
                );
              // Handle bullet points
              if (p.trimStart().startsWith("- ") || p.trimStart().startsWith("• ")) {
                return <span key={pi} style={{ display: "block", paddingLeft: 14, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: "#6366f1" }}>›</span>
                  {p.replace(/^[\s]*[-•]\s/, "")}
                </span>;
              }
              return p;
            })}
            {li < lines.length - 1 && <br />}
          </span>
        );
      })}
    </span>
  );
}

function CodeFence({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n").length;

  function copy() {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const langColors = {
    javascript: "#f7df1e", typescript: "#3178c6", python: "#3776ab",
    html: "#e34f26", css: "#1572b6", rust: "#f74c00", go: "#00add8",
    bash: "#4eaa25", sql: "#336791", json: "#000", default: "#6366f1",
  };
  const lc = (langColors[lang.toLowerCase()] || langColors.default);

  return (
    <div style={{
      background: "#0d0d14", border: "1px solid #1e1e2e",
      borderRadius: 10, overflow: "hidden", margin: "10px 0",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "7px 14px", background: "#111120",
        borderBottom: "1px solid #1e1e2e",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: lc }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#4a4a6a", letterSpacing: 1.2, textTransform: "uppercase" }}>
            {lang || "code"}
          </span>
          <span style={{ fontSize: 9, color: "#2a2a3a" }}>{lines}L</span>
        </div>
        <button onClick={copy} style={{
          background: copied ? "#052e16" : "transparent",
          border: `1px solid ${copied ? "#14532d" : "#1e1e2e"}`,
          color: copied ? "#4ade80" : "#3a3a5a",
          fontSize: 10, padding: "3px 10px", borderRadius: 5,
          cursor: "pointer", fontFamily: "monospace", transition: "all 0.2s",
          fontWeight: 700,
        }}>
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      {/* Code */}
      <pre style={{ overflowX: "auto", padding: "14px 16px", margin: 0, maxHeight: 380 }}>
        <code style={{
          fontSize: 12.5, color: "#c9d1d9", fontFamily: "monospace",
          display: "block", whiteSpace: "pre", lineHeight: 1.65,
        }}>{code}</code>
      </pre>
    </div>
  );
}

// ─── SUGGESTION CHIPS ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "Explain quantum entanglement simply",
  "Write a Python web scraper",
  "Review my code for bugs",
  "Create a short sci-fi story",
  "Solve: if 2x + 5 = 13, find x",
  "What's the best way to learn fast?",
];

// ─── TYPING DOTS ──────────────────────────────────────────────────────────────
function TypingDots({ color }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: color,
          animation: "nexusBounce 1.2s infinite",
          animationDelay: `${i * 0.18}s`,
          opacity: 0.8,
        }} />
      ))}
    </div>
  );
}

// ─── TOKEN COUNTER ────────────────────────────────────────────────────────────
function estimateTokens(msgs) {
  return msgs.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function NexusAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("default");
  const [showModes, setShowModes] = useState(false);
  const [error, setError] = useState(null);

  const feedRef = useRef(null);
  const inputRef = useRef(null);
  const currentMode = MODES.find(m => m.id === mode);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setError(null);

    const userMsg = { role: "user", content: text, id: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const reply = await callNexus(next, mode);
      setMessages([...next, { role: "assistant", content: reply, id: Date.now() + 1 }]);
    } catch (e) {
      setError(e.message);
      setMessages([...next, {
        role: "assistant",
        content: `**Error:** ${e.message}\n\nPlease try again.`,
        id: Date.now() + 1,
        isError: true,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, messages, loading, mode]);

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  const tokens = estimateTokens(messages);
  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #07070f;
          font-family: 'Outfit', sans-serif;
          min-height: 100dvh;
          display: flex;
          justify-content: center;
          align-items: stretch;
        }
        @keyframes nexusBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.8; }
          30% { transform: translateY(-7px); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.15); }
          50% { box-shadow: 0 0 40px rgba(99,102,241,0.35); }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-enter { animation: fadeUp 0.25s ease; }
        .mode-panel { animation: slideIn 0.18s ease; }
        textarea { resize: none; }
        textarea:focus { outline: none; }
        button { cursor: pointer; }
        button:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e1e35; border-radius: 3px; }
        .suggestion:hover { background: #12121f !important; border-color: #6366f1 !important; color: #a5b4fc !important; }
        .send-btn:hover { background: #4f46e5 !important; }
        .send-btn:active { transform: scale(0.95); }
        .mode-chip:hover { opacity: 0.85; }
        .clear-btn:hover { color: #f87171 !important; border-color: #7f1d1d !important; }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 780,
        display: "flex", flexDirection: "column",
        background: "#09090f",
        borderLeft: "1px solid #12121f",
        borderRight: "1px solid #12121f",
        position: "relative",
      }}>

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div style={{
          padding: "14px 20px",
          borderBottom: "1px solid #12121f",
          background: "#09090f",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 20,
          backdropFilter: "blur(20px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Logo */}
            <div style={{
              width: 38, height: 38,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800,
              boxShadow: "0 0 20px rgba(99,102,241,0.3)",
              animation: "glowPulse 3s infinite",
            }}>⬡</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", letterSpacing: 2 }}>
                {AI_NAME}
              </div>
              <div style={{ fontSize: 10, color: "#3a3a5a", letterSpacing: 1, fontFamily: "monospace" }}>
                {AI_TAGLINE}
              </div>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Token count */}
            {tokens > 0 && (
              <div style={{
                fontSize: 10, color: "#2a2a4a", fontFamily: "monospace",
                background: "#0d0d1a", border: "1px solid #12121f",
                borderRadius: 5, padding: "3px 8px",
              }}>
                ~{tokens.toLocaleString()} tokens
              </div>
            )}
            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: loading ? "#f59e0b" : "#22c55e",
                animation: "statusPulse 2s infinite",
                boxShadow: `0 0 8px ${loading ? "#f59e0b" : "#22c55e"}`,
              }} />
              <span style={{ fontSize: 10, color: "#2a3a2a", fontFamily: "monospace", fontWeight: 700 }}>
                {loading ? "THINKING" : "ONLINE"}
              </span>
            </div>
            {/* Clear */}
            {messages.length > 0 && (
              <button onClick={clearChat} className="clear-btn" style={{
                fontSize: 10, color: "#2a2a4a", fontFamily: "monospace",
                background: "transparent", border: "1px solid #12121f",
                borderRadius: 5, padding: "3px 8px",
                transition: "all 0.15s",
              }}>clear</button>
            )}
          </div>
        </div>

        {/* ── MODE BAR ────────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 6, padding: "10px 20px",
          borderBottom: "1px solid #12121f",
          overflowX: "auto", background: "#08080e",
        }}>
          {MODES.map(m => (
            <button
              key={m.id}
              className="mode-chip"
              onClick={() => setMode(m.id)}
              title={m.desc}
              style={{
                flexShrink: 0,
                fontSize: 11, fontWeight: 700,
                padding: "5px 12px", borderRadius: 20,
                border: `1px solid ${mode === m.id ? m.color + "60" : "#12121f"}`,
                background: mode === m.id ? m.color + "18" : "transparent",
                color: mode === m.id ? m.color : "#2a2a4a",
                fontFamily: "monospace", letterSpacing: 0.5,
                transition: "all 0.15s",
              }}
            >{m.label}</button>
          ))}
        </div>

        {/* ── CHAT FEED ────────────────────────────────────────────── */}
        <div
          ref={feedRef}
          style={{
            flex: 1, overflowY: "auto",
            padding: isEmpty ? "0" : "20px 20px 8px",
            display: "flex", flexDirection: "column", gap: 2,
          }}
        >
          {/* Empty state */}
          {isEmpty && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "40px 24px", gap: 32,
            }}>
              {/* Hero */}
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 52, fontWeight: 800,
                  background: "linear-gradient(135deg, #6366f1, #a78bfa, #ec4899)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  letterSpacing: 4, marginBottom: 8,
                }}>NEXUS</div>
                <div style={{ fontSize: 14, color: "#2a2a4a", fontFamily: "monospace", letterSpacing: 2 }}>
                  ADVANCED INTELLIGENCE SYSTEM
                </div>
                <div style={{ fontSize: 13, color: "#1a1a2e", marginTop: 6 }}>
                  Ask anything. Build anything. Know anything.
                </div>
              </div>

              {/* Capability pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 460 }}>
                {["Code", "Analysis", "Writing", "Math", "Research", "Translation", "Debugging", "Planning"].map(cap => (
                  <span key={cap} style={{
                    fontSize: 11, color: "#2a2a4a", fontFamily: "monospace",
                    background: "#0d0d1a", border: "1px solid #12121f",
                    borderRadius: 20, padding: "4px 12px",
                  }}>{cap}</span>
                ))}
              </div>

              {/* Suggestion chips */}
              <div style={{ width: "100%", maxWidth: 560 }}>
                <div style={{ fontSize: 10, color: "#1a1a2e", fontFamily: "monospace", marginBottom: 10, textAlign: "center", letterSpacing: 1 }}>
                  TRY ASKING
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      className="suggestion"
                      onClick={() => send(s)}
                      style={{
                        background: "#0a0a12", border: "1px solid #12121f",
                        borderRadius: 8, padding: "10px 14px",
                        color: "#2a2a4a", fontSize: 12.5,
                        textAlign: "left", fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ color: "#6366f1", marginRight: 8 }}>›</span>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className="msg-enter" style={{
                display: "flex",
                flexDirection: isUser ? "row-reverse" : "row",
                gap: 10, alignItems: "flex-start",
                marginBottom: 16,
              }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800,
                  background: isUser
                    ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                    : "#0d0d1a",
                  border: isUser ? "none" : "1px solid #1e1e2e",
                  color: isUser ? "#fff" : currentMode.color,
                  marginTop: 2,
                  boxShadow: isUser ? "0 0 16px rgba(99,102,241,0.3)" : "none",
                }}>
                  {isUser ? "U" : "⬡"}
                </div>

                {/* Bubble */}
                <div style={{
                  maxWidth: "78%",
                  background: isUser ? "#0e0e20" : "#0a0a12",
                  border: `1px solid ${isUser ? "#1e1e35" : "#111120"}`,
                  borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                  padding: "11px 15px",
                  fontSize: 13.5, lineHeight: 1.72,
                  color: "#c8d4e8",
                }}>
                  {/* Name tag */}
                  <div style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                    color: isUser ? "#4f46e5" : currentMode.color,
                    marginBottom: 6, fontFamily: "monospace",
                  }}>
                    {isUser ? "YOU" : AI_NAME}
                    {!isUser && (
                      <span style={{ color: "#1a1a2e", marginLeft: 6, fontWeight: 400 }}>
                        {currentMode.label}
                      </span>
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ color: msg.isError ? "#f87171" : "#c8d4e8" }}>
                    {isUser
                      ? <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                      : renderMarkdown(msg.content)
                    }
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <div className="msg-enter" style={{
              display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800,
                background: "#0d0d1a", border: "1px solid #1e1e2e",
                color: currentMode.color,
              }}>⬡</div>
              <div style={{
                background: "#0a0a12", border: "1px solid #111120",
                borderRadius: "4px 16px 16px 16px",
                padding: "11px 15px",
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: currentMode.color, marginBottom: 8, fontFamily: "monospace" }}>
                  {AI_NAME}
                </div>
                <TypingDots color={currentMode.color} />
              </div>
            </div>
          )}

          <div style={{ height: 8 }} />
        </div>

        {/* ── INPUT AREA ───────────────────────────────────────────── */}
        <div style={{
          padding: "12px 20px 20px",
          borderTop: "1px solid #12121f",
          background: "#09090f",
        }}>
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            background: "#0c0c16",
            border: `1px solid ${input ? "#6366f1" + "40" : "#12121f"}`,
            borderRadius: 14, padding: "10px 14px",
            transition: "border-color 0.2s",
            boxShadow: input ? "0 0 0 3px rgba(99,102,241,0.06)" : "none",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={`Message ${AI_NAME}… (Enter to send, Shift+Enter for newline)`}
              rows={1}
              style={{
                flex: 1, background: "transparent", border: "none",
                color: "#e2e8f0", fontSize: 13.5,
                fontFamily: "'Outfit', sans-serif",
                lineHeight: 1.6, maxHeight: 140, overflowY: "auto",
              }}
              onInput={e => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
              }}
            />
            <button
              className="send-btn"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: (loading || !input.trim()) ? "#0d0d1a" : "#6366f1",
                border: `1px solid ${(loading || !input.trim()) ? "#12121f" : "#6366f1"}`,
                color: (loading || !input.trim()) ? "#1e1e35" : "#fff",
                fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.15s",
                fontWeight: 700,
              }}
            >
              {loading ? "·" : "↑"}
            </button>
          </div>
          <div style={{
            textAlign: "center", marginTop: 8,
            fontSize: 10, color: "#12121f", fontFamily: "monospace",
          }}>
            NEXUS · {currentMode.label} · {messages.length} messages
          </div>
        </div>
      </div>
    </>
  );
}