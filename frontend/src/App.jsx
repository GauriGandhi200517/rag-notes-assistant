import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "https://gaurigandhi16-rag-notes-assistant.hf.space";

export default function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [indexed, setIndexed] = useState(false);
  const [docName, setDocName] = useState("");
  const [expandedSources, setExpandedSources] = useState({});
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function uploadPDF() {
    if (!file) return alert("Please select a PDF first!");
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      await axios.post(`${API}/ingest`, form);
      await axios.post(`${API}/build-index`);
      setIndexed(true);
      setDocName(file.name);
      setMessages([{
        role: "system",
        text: `Document ready! Ask me anything about "${file.name}".`
      }]);
    } catch (e) {
      alert("Error uploading PDF. Make sure the server is running.");
    }
    setUploading(false);
  }

  async function askQuestion() {
    if (!question.trim() || loading) return;
    if (!indexed) return alert("Please upload a PDF first!");
    const userMsg = { role: "user", text: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/chat?question=${encodeURIComponent(userMsg.text)}`);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: res.data.answer,
        sources: res.data.sources
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Something went wrong. Please try again.",
        sources: []
      }]);
    }
    setLoading(false);
  }

  function toggleSources(i) {
    setExpandedSources(prev => ({ ...prev, [i]: !prev[i] }));
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080c14; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }

        .app {
          display: flex;
          height: 100vh;
          font-family: 'DM Sans', sans-serif;
          background: #080c14;
          color: #e8edf5;
          overflow: hidden;
        }
        .sidebar {
          width: 300px;
          min-width: 300px;
          background: #0d1421;
          border-right: 1px solid #111d2e;
          display: flex;
          flex-direction: column;
          padding: 28px 20px;
          gap: 24px;
        }
        .logo {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 22px;
          color: #e8edf5;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }
        .logo span { color: #3b82f6; }
        .logo-sub {
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
          font-size: 12px;
          color: #4a6080;
          margin-top: 4px;
          letter-spacing: 0.5px;
        }
        .upload-zone {
          border: 1.5px dashed #1e3a5f;
          border-radius: 14px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: #0a1628;
        }
        .upload-zone:hover { border-color: #3b82f6; background: #0d1f3c; }
        .upload-icon { font-size: 28px; margin-bottom: 8px; }
        .upload-text { font-size: 13px; color: #4a6080; line-height: 1.5; }
        .upload-text strong { color: #3b82f6; font-weight: 500; }
        .file-selected {
          margin-top: 10px;
          background: #0d1f3c;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          color: #60a5fa;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .upload-btn {
          width: 100%;
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.3px;
        }
        .upload-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          transform: translateY(-1px);
        }
        .upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .doc-card {
          background: #0a1628;
          border: 1px solid #111d2e;
          border-radius: 12px;
          padding: 14px;
        }
        .doc-card-label {
          font-size: 10px;
          color: #4a6080;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .doc-card-name { font-size: 13px; color: #60a5fa; font-weight: 500; word-break: break-all; }
        .doc-card-status {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          font-size: 11px;
          color: #34d399;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #34d399;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .clear-btn {
          margin-top: auto;
          background: transparent;
          border: 1px solid #1e3a5f;
          color: #4a6080;
          padding: 10px;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .clear-btn:hover { border-color: #ef4444; color: #ef4444; background: #1a0a0a; }
        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .chat-header {
          padding: 20px 32px;
          border-bottom: 1px solid #111d2e;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .chat-title { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 600; color: #e8edf5; }
        .chat-subtitle { font-size: 12px; color: #4a6080; margin-top: 2px; }
        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 40px;
          text-align: center;
        }
        .empty-icon { font-size: 56px; }
        .empty-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #1e3a5f; }
        .empty-sub { font-size: 14px; color: #162032; max-width: 280px; line-height: 1.6; }
        .msg-row { display: flex; flex-direction: column; }
        .msg-row.user { align-items: flex-end; }
        .msg-row.assistant { align-items: flex-start; }
        .msg-row.system { align-items: center; }
        .msg-bubble {
          max-width: 68%;
          padding: 14px 18px;
          border-radius: 18px;
          font-size: 15px;
          line-height: 1.65;
        }
        .msg-bubble.user {
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: white;
          border-radius: 18px 18px 4px 18px;
        }
        .msg-bubble.assistant {
          background: #0d1421;
          border: 1px solid #111d2e;
          color: #d1d9e6;
          border-radius: 18px 18px 18px 4px;
        }
        .msg-bubble.system {
          background: #0a1f0f;
          border: 1px solid #14532d;
          color: #4ade80;
          font-size: 13px;
          padding: 10px 16px;
          border-radius: 20px;
          max-width: 100%;
        }
        .sources-toggle {
          margin-top: 10px;
          background: transparent;
          border: 1px solid #1e3a5f;
          color: #4a6080;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .sources-toggle:hover { border-color: #7c3aed; color: #a78bfa; }
        .sources-list { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; max-width: 68%; }
        .source-item {
          background: #0a1628;
          border: 1px solid #111d2e;
          border-left: 3px solid #7c3aed;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 12px;
        }
        .source-item-title { color: #a78bfa; font-weight: 500; margin-bottom: 4px; }
        .source-item-text { color: #4a6080; line-height: 1.5; }
        .typing {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 14px 18px;
          background: #0d1421;
          border: 1px solid #111d2e;
          border-radius: 18px 18px 18px 4px;
          width: fit-content;
        }
        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #3b82f6;
          animation: bounce 1.2s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .input-area {
          padding: 20px 32px;
          border-top: 1px solid #111d2e;
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }
        .input-wrap {
          flex: 1;
          background: #0d1421;
          border: 1px solid #1e3a5f;
          border-radius: 14px;
          display: flex;
          align-items: center;
          padding: 4px 4px 4px 16px;
          transition: border-color 0.2s;
        }
        .input-wrap:focus-within { border-color: #3b82f6; }
        .input-wrap input {
          flex: 1;
          background: transparent;
          border: none;
          color: #e8edf5;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          padding: 10px 0;
          outline: none;
        }
        .input-wrap input::placeholder { color: #2a4060; }
        .send-btn {
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          border: none;
          color: white;
          width: 42px;
          height: 42px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          font-size: 18px;
          flex-shrink: 0;
        }
        .send-btn:hover:not(:disabled) { background: linear-gradient(135deg, #2563eb, #3b82f6); transform: scale(1.05); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .uploading-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #0a1f3c;
          border-radius: 10px;
          font-size: 13px;
          color: #60a5fa;
        }
        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid #1e3a5f;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .app { flex-direction: column; height: 100dvh; }
          .sidebar {
            width: 100% !important;
            min-width: unset !important;
            padding: 12px 16px !important;
            gap: 10px !important;
            border-right: none !important;
            border-bottom: 1px solid #111d2e !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            align-items: center !important;
          }
          .logo { display: none; }
          .logo-sub { display: none; }
          .upload-zone { padding: 10px !important; flex: 1; min-width: 160px; }
          .upload-icon { font-size: 18px !important; margin-bottom: 4px !important; }
          .upload-text { font-size: 11px !important; }
          .upload-btn { width: auto !important; padding: 10px 16px !important; white-space: nowrap; }
          .doc-card { display: none !important; }
          .clear-btn { display: none !important; }
          .uploading-bar { font-size: 11px !important; }
          .messages { padding: 16px !important; gap: 14px !important; }
          .msg-bubble { max-width: 88% !important; font-size: 14px !important; }
          .sources-list { max-width: 88% !important; }
          .chat-header { padding: 14px 16px !important; }
          .input-area { padding: 12px 16px !important; }
          .input-wrap input { font-size: 14px !important; }
        }
      `}</style>

      <div className="app">
        <div className="sidebar">
          <div>
            <div className="logo">RAG<span>.</span>AI</div>
            <div className="logo-sub">Document Intelligence</div>
          </div>
          <div className="upload-zone" onClick={() => fileInputRef.current.click()}>
            <div className="upload-icon">📎</div>
            <div className="upload-text">
              <strong>Click to upload</strong> PDF
              {file && (
                <div className="file-selected">
                  📄 {file.name.slice(0, 20)}{file.name.length > 20 ? "..." : ""}
                </div>
              )}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} style={{ display: "none" }} />
          {uploading && (
            <div className="uploading-bar">
              <div className="spinner" /> Processing...
            </div>
          )}
          <button className="upload-btn" onClick={uploadPDF} disabled={!file || uploading}>
            {uploading ? "Indexing..." : "Upload & Index"}
          </button>
          {indexed && (
            <div className="doc-card">
              <div className="doc-card-label">Active Document</div>
              <div className="doc-card-name">{docName}</div>
              <div className="doc-card-status">
                <div className="status-dot" /> Ready
              </div>
            </div>
          )}
          <button className="clear-btn" onClick={() => { setMessages([]); setIndexed(false); setFile(null); setDocName(""); }}>
            Clear conversation
          </button>
        </div>

        <div className="main">
          <div className="chat-header">
            <div>
              <div className="chat-title">Chat with your document</div>
              <div className="chat-subtitle">{indexed ? `📄 ${docName}` : "Upload a PDF to begin"}</div>
            </div>
            {indexed && (
              <button className="clear-btn" style={{ marginTop: 0 }} onClick={() => { setMessages([]); setIndexed(false); setFile(null); setDocName(""); }}>
                New chat
              </button>
            )}
          </div>

          <div className="messages">
            {messages.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No document loaded</div>
                <div className="empty-sub">Upload a PDF and start asking questions about its content.</div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`msg-row ${msg.role}`}>
                <div className={`msg-bubble ${msg.role}`}>{msg.text}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <>
                    <button className="sources-toggle" onClick={() => toggleSources(i)}>
                      {expandedSources[i] ? "▲ Hide" : "▼ Show"} {msg.sources.length} sources
                    </button>
                    {expandedSources[i] && (
                      <div className="sources-list">
                        {msg.sources.slice(0, 3).map((s, j) => (
                          <div key={j} className="source-item">
                            <div className="source-item-title">📄 {s.doc_name} — Page {s.page}</div>
                            <div className="source-item-text">{s.snippet.slice(0, 150)}...</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            {loading && (
              <div className="msg-row assistant">
                <div className="typing">
                  <div className="dot" /><div className="dot" /><div className="dot" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="input-area">
            <div className="input-wrap">
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && askQuestion()}
                placeholder={indexed ? "Ask anything about your document..." : "Upload a PDF first..."}
                disabled={!indexed || loading}
              />
            </div>
            <button className="send-btn" onClick={askQuestion} disabled={!indexed || loading || !question.trim()}>
              ➤
            </button>
          </div>
        </div>
      </div>
    </>
  );
}