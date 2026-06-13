"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLE_PROMPTS = [
  "I ran a half marathon in 1:24:31. Predict my marathon time.",
  "Build a 16-week marathon training plan for a sub-3:30 goal.",
  "What are my pace zones based on a 5K PR of 18:15?",
  "I'm racing in Denver at 5,280 ft. How should I adjust my pace?",
  "It's 88°F and humid. How much slower should I run?",
  "Build a race strategy for a half marathon — negative split.",
];

const QUICK_TOOLS = [
  { label: "🏃 Race Predictor", prompt: "I ran a half marathon in 1:24:31. Predict my marathon, 10K, and 5K times using the Riegel formula." },
  { label: "📊 Pace Zones", prompt: "Calculate my training pace zones based on a half marathon PR of 1:24:31." },
  { label: "🗺️ Race Strategy", prompt: "Build a race strategy for a half marathon with a goal of sub-1:25." },
  { label: "⛰️ Altitude Adjust", prompt: "I'm running a marathon in Denver at 5,280 ft elevation. How should I adjust my target pace?" },
  { label: "🌡️ Heat Adjust", prompt: "It's 88°F with 70% humidity. How much should I slow my marathon pace?" },
  { label: "📅 Training Plan", prompt: "Generate a 12-week weekly training plan for a runner targeting a sub-1:25 half marathon." },
];

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7, height: 7,
            borderRadius: "50%",
            background: "var(--text-muted)",
            display: "inline-block",
            animation: `typingDot 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </span>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        animation: "fadeIn 0.2s ease",
        marginBottom: 2,
      }}
    >
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--green-dark), var(--green))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0, marginRight: 8, marginTop: 2,
        }}>🏃</div>
      )}
      <div
        style={{
          maxWidth: "78%",
          padding: "10px 14px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser
            ? "linear-gradient(135deg, var(--green-dark), var(--green))"
            : "var(--bg-elevated)",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.06)",
          color: isUser ? "#fff" : "var(--text)",
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.content}
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0, marginLeft: 8, marginTop: 2,
        }}>👤</div>
      )}
    </div>
  );
}

export default function RacePlannerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `web-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ Error: ${data.error || "Something went wrong."}\n\nCheck that your GCP credentials are configured and the agent is running.`,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Network error — make sure the server is running and try again.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading, sessionId]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const showWelcome = messages.length === 0;

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      maxWidth: 900,
      margin: "0 auto",
      padding: "0 16px",
    }}>
      {/* Header */}
      <header style={{
        padding: "20px 0 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: "linear-gradient(135deg, #1a4a1d, var(--green))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
          boxShadow: "0 0 20px rgba(76,175,80,0.3)",
        }}>🏃</div>
        <div>
          <h1 style={{
            fontFamily: "'Space Mono', 'Courier New', monospace",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--green)",
            letterSpacing: "0.02em",
          }}>
            HoodaRunners Race Planner
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
            AI-powered · Pace zones · Race predictions · Training plans
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--green)",
            animation: "pulse 2s infinite",
            display: "inline-block",
          }} />
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
            AGENT LIVE
          </span>
        </div>
      </header>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px 0",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        {showWelcome && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {/* Welcome card */}
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "28px 28px 24px",
              marginBottom: 24,
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: "linear-gradient(90deg, var(--green-dark), var(--green))",
              }} />
              <h2 style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 8,
                background: "linear-gradient(135deg, #fff 30%, var(--green-light))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Your AI Race Planning Coach
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
                Powered by Google ADK + Gemini 2.5 Flash. Ask me anything about race pacing,
                training plans, performance predictions, and strategy.
              </p>

              {/* Quick tool buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {QUICK_TOOLS.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => send(t.prompt)}
                    style={{
                      background: "rgba(76,175,80,0.08)",
                      border: "1px solid rgba(76,175,80,0.25)",
                      color: "var(--green-light)",
                      padding: "7px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(76,175,80,0.18)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--green)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(76,175,80,0.08)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(76,175,80,0.25)";
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Capabilities grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
              }}>
                {[
                  { icon: "📈", title: "Race Predictions", desc: "Riegel formula across all distances" },
                  { icon: "🎯", title: "Pace Zones", desc: "Easy, tempo, threshold & race paces" },
                  { icon: "🗺️", title: "Race Strategy", desc: "Negative splits, even effort plans" },
                  { icon: "⛰️", title: "Altitude Adjust", desc: "Elevation-based pace corrections" },
                  { icon: "🌡️", title: "Heat Adjust", desc: "Temperature & humidity corrections" },
                  { icon: "📅", title: "Weekly Plans", desc: "Structured training by goal race" },
                ].map((cap) => (
                  <div key={cap.title} style={{
                    background: "var(--bg-elevated)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{cap.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{cap.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{cap.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Example prompts */}
            <div style={{ marginBottom: 8 }}>
              <p style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "monospace",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}>
                Try asking…
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 10,
                      padding: "10px 14px",
                      textAlign: "left",
                      color: "var(--text-muted)",
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(76,175,80,0.3)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                    }}
                  >
                    <span style={{ color: "var(--green)", marginRight: 8 }}>▸</span>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", animation: "fadeIn 0.2s ease" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--green-dark), var(--green))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0, marginRight: 8, marginTop: 2,
            }}>🏃</div>
            <div style={{
              padding: "10px 14px",
              borderRadius: "18px 18px 18px 4px",
              background: "var(--bg-elevated)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div style={{
        borderTop: "1px solid var(--border)",
        padding: "14px 0 20px",
        flexShrink: 0,
      }}>
        {messages.length > 0 && !loading && (
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 10,
          }}>
            {QUICK_TOOLS.slice(0, 3).map((t) => (
              <button
                key={t.label}
                onClick={() => send(t.prompt)}
                style={{
                  background: "rgba(76,175,80,0.06)",
                  border: "1px solid rgba(76,175,80,0.18)",
                  color: "var(--text-muted)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--green-light)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(76,175,80,0.35)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(76,175,80,0.18)";
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "6px 6px 6px 16px",
          transition: "border-color 0.2s",
        }}
          onFocus={() => {}}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about pacing, race predictions, training plans…"
            disabled={loading}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text)",
              fontSize: 14,
              fontFamily: "inherit",
            }}
            autoFocus
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 38, height: 38,
              borderRadius: 10,
              background: loading || !input.trim()
                ? "rgba(76,175,80,0.15)"
                : "var(--green)",
              border: "none",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
              transition: "all 0.2s",
              color: "#000",
              flexShrink: 0,
            }}
          >
            {loading ? (
              <span style={{
                width: 16, height: 16, borderRadius: "50%",
                border: "2px solid rgba(76,175,80,0.3)",
                borderTopColor: "var(--green)",
                animation: "spin 0.8s linear infinite",
                display: "inline-block",
              }} />
            ) : "➤"}
          </button>
        </div>

        <p style={{
          fontSize: 11,
          color: "var(--text-muted)",
          textAlign: "center",
          marginTop: 8,
          opacity: 0.6,
        }}>
          Powered by Google ADK 2.2.0 · Gemini 2.5 Flash · Vertex AI Agent Engine
        </p>
      </div>
    </div>
  );
}
