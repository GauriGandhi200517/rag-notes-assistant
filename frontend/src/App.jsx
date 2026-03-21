import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "https://gaurigandhi16-rag-notes-assistant.hf.space";

export default function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [indexed, setIndexed] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function uploadPDF() {
    if (!file) return alert("Please select a PDF first!");
    setLoading(true);
    setStatus("Uploading PDF...");
    const form = new FormData();
    form.append("file", file);
    try {
      await axios.post(`${API}/ingest`, form);
      setStatus("Building index...");
      await axios.post(`${API}/build-index`);
      setStatus("");
      setIndexed(true);
      setMessages(prev => [...prev, {
        role: "system",
        text: `✅ "${file.name}" uploaded and indexed! You can now ask questions.`
      }]);
    } catch (e) {
      setStatus("Error uploading PDF. Make sure the server is running.");
    }
    setLoading(false);
  }

  async function askQuestion() {
    if (!question.trim()) return;
    if (!indexed) return alert("Please upload a PDF first!");
    
    const userMsg = { role: "user", text: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await axios.post(`${API}/chat?question=${encodeURIComponent(userMsg.text)}`);
      const botMsg = {
        role: "assistant",
        text: res.data.answer,
        sources: res.data.sources
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Sorry, I couldn't get an answer. Please try again."
      }]);
    }
    setLoading(false);
  }

  function clearHistory() {
    setMessages([]);
    setIndexed(false);
    setFile(null);
    setStatus("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0f172a", color: "#e2e8f0", fontFamily: "sans-serif" }}>
      
      {/* Header */}
      <div style={{ background: "#1e293b", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #334155" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#60a5fa" }}>📄 RAG Notes Assistant</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Chat with your PDFs using AI</p>
        </div>
        <button onClick={clearHistory} style={{ background: "#ef4444", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
          Clear Chat
        </button>
      </div>

      {/* Upload Bar */}
      <div style={{ background: "#1e293b", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #334155" }}>
        <input
          type="file"
          accept=".pdf"
          onChange={e => setFile(e.target.files[0])}
          style={{ color: "#94a3b8", fontSize: 13 }}
        />
        <button
          onClick={uploadPDF}
          disabled={loading}
          style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" }}
        >
          {loading && !indexed ? "Processing..." : "Upload & Index"}
        </button>
        {status && <span style={{ color: "#34d399", fontSize: 13 }}>{status}</span>}
        {indexed && <span style={{ color: "#34d399", fontSize: 13 }}>✅ Ready</span>}
      </div>

      {/* Chat Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
        
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#475569", marginTop: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            <p style={{ fontSize: 18 }}>Upload a PDF to get started</p>
            <p style={{ fontSize: 14 }}>Ask any question about your document</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            
            {/* System message */}
            {msg.role === "system" && (
              <div style={{ background: "#164e63", color: "#67e8f9", padding: "10px 16px", borderRadius: 12, fontSize: 14, maxWidth: "80%" }}>
                {msg.text}
              </div>
            )}

            {/* User message */}
            {msg.role === "user" && (
              <div style={{ background: "#2563eb", color: "white", padding: "12px 16px", borderRadius: "18px 18px 4px 18px", maxWidth: "70%", fontSize: 15 }}>
                {msg.text}
              </div>
            )}

            {/* Assistant message */}
            {msg.role === "assistant" && (
              <div style={{ maxWidth: "80%" }}>
                <div style={{ background: "#1e293b", border: "1px solid #334155", padding: "14px 18px", borderRadius: "18px 18px 18px 4px", fontSize: 15, lineHeight: 1.7, color: "#e2e8f0" }}>
                  {msg.text}
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0" }}>Sources:</p>
                    {msg.sources.slice(0, 3).map((s, j) => (
                      <div key={j} style={{ background: "#0f172a", border: "1px solid #334155", borderLeft: "3px solid #7c3aed", padding: "8px 12px", borderRadius: 8, marginBottom: 6, fontSize: 12, color: "#94a3b8" }}>
                        <strong style={{ color: "#a78bfa" }}>{s.doc_name}</strong> — Page {s.page}
                        <p style={{ margin: "4px 0 0", color: "#64748b" }}>{s.snippet.slice(0, 120)}...</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && indexed && (
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ background: "#1e293b", border: "1px solid #334155", padding: "14px 18px", borderRadius: "18px 18px 18px 4px", color: "#64748b", fontSize: 15 }}>
              Thinking...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <div style={{ background: "#1e293b", padding: "16px 24px", borderTop: "1px solid #334155", display: "flex", gap: 12 }}>
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && askQuestion()}
          placeholder={indexed ? "Ask a question about your PDF..." : "Upload a PDF first..."}
          disabled={!indexed || loading}
          style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0", padding: "12px 16px", borderRadius: 12, fontSize: 15, outline: "none" }}
        />
        <button
          onClick={askQuestion}
          disabled={!indexed || loading}
          style={{ background: indexed ? "#2563eb" : "#334155", color: "white", border: "none", padding: "12px 24px", borderRadius: 12, cursor: indexed ? "pointer" : "not-allowed", fontSize: 15 }}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}