import { useState } from "react";
import axios from "axios";

const API = "https://gaurigandhi16-rag-notes-assistant.hf.space";

export default function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

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
      setStatus("Ready! You can now ask questions.");
    } catch (e) {
      setStatus("Error uploading PDF. Make sure the server is running.");
    }
    setLoading(false);
  }

  async function askQuestion() {
    if (!question) return alert("Please enter a question!");
    setLoading(true);
    setStatus("Thinking...");
    setAnswer("");
    setSources([]);
    try {
      const res = await axios.post(`${API}/chat?question=${encodeURIComponent(question)}`);
      setAnswer(res.data.answer);
      setSources(res.data.sources);
      setStatus("");
    } catch (e) {
      setStatus("Error getting answer. Make sure the server is running.");
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#2563eb" }}>RAG Notes Assistant</h1>
      <p style={{ color: "#666" }}>Upload a PDF and chat with it!</p>

      {/* Upload Section */}
      <div style={{ background: "#f1f5f9", padding: 20, borderRadius: 12, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Step 1 — Upload PDF</h2>
        <input
          type="file"
          accept=".pdf"
          onChange={e => setFile(e.target.files[0])}
          style={{ marginBottom: 12, display: "block" }}
        />
        <button
          onClick={uploadPDF}
          disabled={loading}
          style={{ background: "#2563eb", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 16 }}
        >
          {loading ? "Processing..." : "Upload & Index"}
        </button>
        {status && <p style={{ color: "#16a34a", marginTop: 8 }}>{status}</p>}
      </div>

      {/* Chat Section */}
      <div style={{ background: "#f1f5f9", padding: 20, borderRadius: 12, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Step 2 — Ask a Question</h2>
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && askQuestion()}
          placeholder="e.g. What is data mining?"
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 16, marginBottom: 12, boxSizing: "border-box" }}
        />
        <button
          onClick={askQuestion}
          disabled={loading}
          style={{ background: "#16a34a", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 16 }}
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>

      {/* Answer Section */}
      {answer && (
        <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 24 }}>
          <h2 style={{ marginTop: 0, color: "#2563eb" }}>Answer</h2>
          <p style={{ lineHeight: 1.7 }}>{answer}</p>
        </div>
      )}

      {/* Sources Section */}
      {sources.length > 0 && (
        <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <h2 style={{ marginTop: 0, color: "#7c3aed" }}>Sources</h2>
          {sources.map((s, i) => (
            <div key={i} style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 12, borderLeft: "4px solid #7c3aed" }}>
              <strong>{s.doc_name}</strong> — Page {s.page}
              <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>{s.snippet}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
