import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "https://gaurigandhi16-rag-notes-assistant.hf.space";

function Confetti({ active }) {
  const colors = ["#3b82f6", "#34d399", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random() * 1,
    size: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
  }));
  if (!active) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.left}%`, top: "-20px",
          width: p.size, height: p.size, background: p.color,
          borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          animation: `fall ${p.duration}s ${p.delay}s ease-in forwards`,
          transform: `rotate(${p.rotate}deg)`, opacity: 0.9,
        }} />
      ))}
      <style>{`@keyframes fall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }`}</style>
    </div>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [indexed, setIndexed] = useState(false);
  const [docName, setDocName] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const [activeTab, setActiveTab] = useState("chat");
  const [quiz, setQuiz] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizProgress, setQuizProgress] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [correctFlash, setCorrectFlash] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function uploadFile() {
    if (!file) return alert("Please select a file first!");
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      await axios.post(`${API}/ingest`, form);
      await axios.post(`${API}/build-index`);
      setIndexed(true);
      setDocName(file.name);
      setMessages([{ role: "system", text: `Document ready! Ask me anything about "${file.name}". 📄` }]);
      setQuiz([]); setAnswers({}); setSubmitted(false);
    } catch (e) { alert("Error uploading file."); }
    setUploading(false);
  }

  async function askQuestion() {
    if (!question.trim() || loading) return;
    if (!indexed) return alert("Please upload a file first!");
    const userMsg = { role: "user", text: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/chat?question=${encodeURIComponent(userMsg.text)}`);
      setMessages(prev => [...prev, { role: "assistant", text: res.data.answer, sources: res.data.sources }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong. Please try again.", sources: [] }]);
    }
    setLoading(false);
  }

  async function generateQuiz() {
    if (!indexed) return alert("Please upload a document first!");
    setQuizLoading(true);
    setQuizProgress(0);
    setQuiz([]); setAnswers({}); setSubmitted(false); setScore(0);

    try {
      setQuizProgress(20);
      const res = await axios.post(`${API}/quiz?topic=main concepts definitions types applications`);
      setQuizProgress(80);
      const rawQuestions = res.data.questions || [];
      const generatedQuiz = rawQuestions.map((q, i) => parseQuizQuestion(q, i)).filter(Boolean);
      setQuizProgress(100);

      if (generatedQuiz.length === 0) {
        const searchRes = await axios.post(`${API}/search?query=definition concept introduction&top_k=5`);
        const chunks = (searchRes.data.results || []).slice(0, 4);
        const fallbackQuiz = chunks.map((chunk, i) => {
          const text = chunk.text.replace(/\n/g, " ").trim();
          return {
            id: i,
            question: `What does this passage from page ${chunk.page} describe? "${text.slice(0, 60)}..."`,
            options: [
              { label: "A", text: text.slice(0, 100) },
              { label: "B", text: "This describes a mathematical formula" },
              { label: "C", text: "This describes a cooking recipe" },
              { label: "D", text: "This describes a sports event" }
            ],
            correct: "A"
          };
        });
        setQuiz(fallbackQuiz.length > 0 ? fallbackQuiz : [{
          id: 0,
          question: "What is the main subject of this document?",
          options: [
            { label: "A", text: "The topic covered in this uploaded document" },
            { label: "B", text: "A completely unrelated subject" },
            { label: "C", text: "A cooking recipe book" },
            { label: "D", text: "A travel guide" }
          ],
          correct: "A"
        }]);
      } else {
        setQuiz(generatedQuiz);
      }
    } catch (e) { console.error(e); }
    setQuizLoading(false);
  }

  function parseQuizQuestion(text, id) {
    try {
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      let question = "", options = [], correct = "";
      lines.forEach(line => {
        if (line.startsWith("Q:")) question = line.replace("Q:", "").trim();
        else if (line.match(/^A[\)\.]/)) options.push({ label: "A", text: line.replace(/^A[\)\.]\s*/, "").trim() });
        else if (line.match(/^B[\)\.]/)) options.push({ label: "B", text: line.replace(/^B[\)\.]\s*/, "").trim() });
        else if (line.match(/^C[\)\.]/)) options.push({ label: "C", text: line.replace(/^C[\)\.]\s*/, "").trim() });
        else if (line.match(/^D[\)\.]/)) options.push({ label: "D", text: line.replace(/^D[\)\.]\s*/, "").trim() });
        else if (line.toLowerCase().startsWith("answer:")) correct = line.replace(/answer:/i, "").trim().charAt(0).toUpperCase();
      });
      if (!question || options.length < 2 || !correct) return null;
      return { id, question, options, correct };
    } catch (e) { return null; }
  }

  function selectAnswer(qId, label, correct) {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qId]: label }));
    if (label === correct) {
      setCorrectFlash(qId);
      setShowConfetti(true);
      setShowToast(true);
      setTimeout(() => { setShowConfetti(false); setCorrectFlash(null); setShowToast(false); }, 2500);
    }
  }

  function submitQuiz() {
    let correct = 0;
    quiz.forEach(q => { if (answers[q.id] === q.correct) correct++; });
    setScore(correct);
    setSubmitted(true);
    if (correct === quiz.length) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
  }

  function toggleSources(i) {
    setExpandedSources(prev => ({ ...prev, [i]: !prev[i] }));
  }

  const isImage = file && ["jpg", "jpeg", "png", "webp"].includes(file.name.split(".").pop().toLowerCase());

  return (
    <>
      <Confetti active={showConfetti} />
      {showToast && <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#059669,#34d399)", color: "white", padding: "12px 28px", borderRadius: 50, fontSize: 15, fontWeight: 600, zIndex: 9998, boxShadow: "0 8px 32px rgba(52,211,153,0.4)", fontFamily: "'Syne',sans-serif", animation: "toastIn 0.3s ease" }}>🎉 Correct! Well done!</div>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080c14; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
        @keyframes toastIn { 0%{transform:translateX(-50%) translateY(-20px);opacity:0} 100%{transform:translateX(-50%) translateY(0);opacity:1} }
        .app { display: flex; height: 100vh; font-family: 'DM Sans', sans-serif; background: #080c14; color: #e8edf5; overflow: hidden; }
        .sidebar { width: 280px; min-width: 280px; background: #0d1421; border-right: 1px solid #111d2e; display: flex; flex-direction: column; padding: 24px 18px; gap: 20px; }
        .logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 22px; color: #e8edf5; letter-spacing: -0.5px; }
        .logo span { color: #3b82f6; }
        .logo-sub { font-size: 11px; color: #4a6080; margin-top: 3px; }
        .upload-zone { border: 1.5px dashed #1e3a5f; border-radius: 14px; padding: 18px; text-align: center; cursor: pointer; transition: all 0.2s; background: #0a1628; }
        .upload-zone:hover { border-color: #3b82f6; background: #0d1f3c; }
        .upload-icon { font-size: 26px; margin-bottom: 6px; }
        .upload-text { font-size: 12px; color: #4a6080; line-height: 1.5; }
        .upload-text strong { color: #3b82f6; }
        .file-selected { margin-top: 8px; background: #0d1f3c; border-radius: 8px; padding: 6px 10px; font-size: 11px; color: #60a5fa; }
        .upload-btn { width: 100%; background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; border: none; padding: 11px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .upload-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
        .upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .doc-card { background: #0a1628; border: 1px solid #111d2e; border-radius: 12px; padding: 12px; }
        .doc-card-label { font-size: 10px; color: #4a6080; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
        .doc-card-name { font-size: 12px; color: #60a5fa; font-weight: 500; word-break: break-all; }
        .doc-card-status { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 11px; color: #34d399; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .clear-btn { margin-top: auto; background: transparent; border: 1px solid #1e3a5f; color: #4a6080; padding: 9px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.2s; }
        .clear-btn:hover { border-color: #ef4444; color: #ef4444; }
        .uploading-bar { display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: #0a1f3c; border-radius: 10px; font-size: 12px; color: #60a5fa; }
        .spinner { width: 13px; height: 13px; border: 2px solid #1e3a5f; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .chat-header { padding: 18px 28px; border-bottom: 1px solid #111d2e; display: flex; align-items: center; justify-content: space-between; }
        .chat-title { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 600; color: #e8edf5; }
        .chat-subtitle { font-size: 11px; color: #4a6080; margin-top: 2px; }
        .tabs { display: flex; gap: 8px; }
        .tab { background: transparent; border: 1px solid #1e3a5f; color: #4a6080; padding: 7px 16px; border-radius: 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .tab.active { background: #1e3a5f; color: #60a5fa; border-color: #3b82f6; }
        .tab:hover:not(.active) { border-color: #3b82f6; color: #60a5fa; }
        .messages { flex: 1; overflow-y: auto; padding: 28px; display: flex; flex-direction: column; gap: 18px; }
        .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 40px; text-align: center; }
        .empty-icon { font-size: 52px; }
        .empty-title { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: #1e3a5f; }
        .empty-sub { font-size: 13px; color: #162032; max-width: 280px; line-height: 1.6; }
        .empty-features { display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap; justify-content: center; }
        .empty-feature { background: #0d1421; border: 1px solid #111d2e; padding: 6px 12px; border-radius: 20px; font-size: 12px; color: #2a4060; }
        .msg-row { display: flex; flex-direction: column; }
        .msg-row.user { align-items: flex-end; }
        .msg-row.assistant { align-items: flex-start; }
        .msg-row.system { align-items: center; }
        .msg-bubble { max-width: 68%; padding: 13px 17px; border-radius: 18px; font-size: 14px; line-height: 1.65; }
        .msg-bubble.user { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; border-radius: 18px 18px 4px 18px; }
        .msg-bubble.assistant { background: #0d1421; border: 1px solid #111d2e; color: #d1d9e6; border-radius: 18px 18px 18px 4px; }
        .msg-bubble.system { background: #0a1f0f; border: 1px solid #14532d; color: #4ade80; font-size: 12px; padding: 9px 14px; border-radius: 20px; max-width: 100%; }
        .sources-toggle { margin-top: 8px; background: transparent; border: 1px solid #1e3a5f; color: #4a6080; padding: 5px 11px; border-radius: 20px; font-size: 11px; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
        .sources-toggle:hover { border-color: #7c3aed; color: #a78bfa; }
        .sources-list { margin-top: 6px; display: flex; flex-direction: column; gap: 5px; max-width: 68%; }
        .source-item { background: #0a1628; border: 1px solid #111d2e; border-left: 3px solid #7c3aed; padding: 9px 12px; border-radius: 8px; font-size: 11px; }
        .source-item-title { color: #a78bfa; font-weight: 500; margin-bottom: 3px; }
        .source-item-text { color: #4a6080; line-height: 1.5; }
        .typing { display: flex; align-items: center; gap: 5px; padding: 13px 17px; background: #0d1421; border: 1px solid #111d2e; border-radius: 18px 18px 18px 4px; width: fit-content; }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; animation: bounce 1.2s infinite; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:0.4} 30%{transform:translateY(-6px);opacity:1} }
        .input-area { padding: 18px 28px; border-top: 1px solid #111d2e; display: flex; gap: 10px; align-items: center; }
        .input-wrap { flex: 1; background: #0d1421; border: 1px solid #1e3a5f; border-radius: 14px; display: flex; align-items: center; padding: 4px 4px 4px 16px; transition: border-color 0.2s; }
        .input-wrap:focus-within { border-color: #3b82f6; }
        .input-wrap input { flex: 1; background: transparent; border: none; color: #e8edf5; font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 9px 0; outline: none; }
        .input-wrap input::placeholder { color: #2a4060; }
        .send-btn { background: linear-gradient(135deg, #1d4ed8, #2563eb); border: none; color: white; width: 40px; height: 40px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 16px; flex-shrink: 0; }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .quiz-area { flex: 1; overflow-y: auto; padding: 28px; display: flex; flex-direction: column; gap: 20px; }
        .quiz-header { display: flex; align-items: center; justify-content: space-between; }
        .quiz-title { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: #e8edf5; }
        .quiz-sub { font-size: 13px; color: #4a6080; margin-top: 4px; }
        .generate-btn { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; border: none; padding: 10px 20px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .generate-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
        .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .progress-bar { height: 4px; background: #111d2e; border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #3b82f6); border-radius: 2px; transition: width 0.5s ease; }
        .quiz-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 60px 40px; text-align: center; }
        .quiz-empty-icon { font-size: 52px; }
        .quiz-empty-title { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: #1e3a5f; }
        .quiz-empty-sub { font-size: 13px; color: #162032; max-width: 260px; line-height: 1.6; }
        .question-card { background: #0d1421; border: 1px solid #111d2e; border-radius: 16px; padding: 20px; transition: all 0.3s; }
        .question-card.flash { border-color: #34d399; box-shadow: 0 0 20px rgba(52,211,153,0.3); }
        .question-num { font-size: 11px; color: #4a6080; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
        .question-text { font-size: 15px; color: #e8edf5; line-height: 1.6; margin-bottom: 16px; font-weight: 500; }
        .options { display: flex; flex-direction: column; gap: 8px; }
        .option { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-radius: 10px; border: 1px solid #1e3a5f; cursor: pointer; transition: all 0.2s; background: #080c14; }
        .option:hover:not(.disabled) { border-color: #3b82f6; background: #0d1f3c; }
        .option.selected { border-color: #3b82f6; background: #0d1f3c; }
        .option.correct { border-color: #34d399 !important; background: #0a1f0f !important; animation: correctPop 0.4s ease; }
        .option.wrong { border-color: #ef4444 !important; background: #1a0a0a !important; animation: wrongShake 0.4s ease; }
        .option.disabled { cursor: default; }
        @keyframes correctPop { 0%{transform:scale(1)} 50%{transform:scale(1.03)} 100%{transform:scale(1)} }
        @keyframes wrongShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        .option-label { width: 28px; height: 28px; border-radius: 8px; background: #1e3a5f; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #60a5fa; flex-shrink: 0; transition: all 0.2s; }
        .option.correct .option-label { background: #14532d; color: #34d399; }
        .option.wrong .option-label { background: #450a0a; color: #ef4444; }
        .option-text { font-size: 13px; color: #d1d9e6; }
        .score-card { background: linear-gradient(135deg, #0a1f3c, #0d1421); border: 1px solid #1e3a5f; border-radius: 16px; padding: 24px; text-align: center; }
        .score-emoji { font-size: 48px; margin-bottom: 12px; }
        .score-text { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: #e8edf5; }
        .score-sub { font-size: 14px; color: #4a6080; margin-top: 6px; }
        .score-bar { height: 6px; background: #111d2e; border-radius: 3px; margin: 16px 0; overflow: hidden; }
        .score-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #3b82f6, #34d399); transition: width 1s ease; }
        .retry-btn { background: transparent; border: 1px solid #3b82f6; color: #60a5fa; padding: 9px 20px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
        .retry-btn:hover { background: #0d1f3c; }
        .submit-btn { width: 100%; background: linear-gradient(135deg, #059669, #10b981); color: white; border: none; padding: 13px; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 768px) {
          .app { flex-direction: column; height: 100dvh; }
          .sidebar { width: 100% !important; min-width: unset !important; padding: 10px 14px !important; gap: 8px !important; border-right: none !important; border-bottom: 1px solid #111d2e !important; flex-direction: row !important; flex-wrap: wrap !important; align-items: center !important; }
          .logo { display: none; } .logo-sub { display: none; }
          .upload-zone { padding: 8px !important; flex: 1; min-width: 130px; }
          .upload-icon { font-size: 16px !important; margin-bottom: 2px !important; }
          .upload-text { font-size: 10px !important; }
          .upload-btn { width: auto !important; padding: 9px 14px !important; font-size: 12px !important; white-space: nowrap; }
          .doc-card { display: none !important; } .clear-btn { display: none !important; }
          .messages { padding: 14px !important; gap: 12px !important; }
          .quiz-area { padding: 14px !important; }
          .msg-bubble { max-width: 90% !important; font-size: 13px !important; }
          .sources-list { max-width: 90% !important; }
          .chat-header { padding: 12px 14px !important; flex-wrap: wrap; gap: 8px; }
          .input-area { padding: 10px 14px !important; }
          .input-wrap input { font-size: 13px !important; }
          .empty-features { display: none; }
          .tabs { width: 100%; }
          .tab { flex: 1; text-align: center; font-size: 12px !important; padding: 6px 10px !important; }
        }
      `}</style>

      <div className="app">
        <div className="sidebar">
          <div>
            <div className="logo">RAG<span>.</span>AI</div>
            <div className="logo-sub">Document Intelligence</div>
          </div>
          <div className="upload-zone" onClick={() => fileInputRef.current.click()}>
            <div className="upload-icon">{isImage ? "🖼️" : "📎"}</div>
            <div className="upload-text">
              <strong>Click to upload</strong><br />
              PDF or photo of notes 📸
              {file && <div className="file-selected">📄 {file.name.slice(0, 22)}{file.name.length > 22 ? "..." : ""}</div>}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setFile(e.target.files[0])} style={{ display: "none" }} />
          {uploading && <div className="uploading-bar"><div className="spinner" />{isImage ? "Reading notes..." : "Processing..."}</div>}
          <button className="upload-btn" onClick={uploadFile} disabled={!file || uploading}>
            {uploading ? "Indexing..." : "Upload & Index"}
          </button>
          {indexed && (
            <div className="doc-card">
              <div className="doc-card-label">Active Document</div>
              <div className="doc-card-name">{docName}</div>
              <div className="doc-card-status"><div className="status-dot" /> Ready</div>
            </div>
          )}
          <button className="clear-btn" onClick={() => { setMessages([]); setIndexed(false); setFile(null); setDocName(""); setQuiz([]); setAnswers({}); setSubmitted(false); }}>
            Clear conversation
          </button>
        </div>

        <div className="main">
          <div className="chat-header">
            <div>
              <div className="chat-title">RAG.AI Assistant</div>
              <div className="chat-subtitle">{indexed ? `📄 ${docName}` : "Upload a PDF or photo to begin"}</div>
            </div>
            <div className="tabs">
              <button className={`tab ${activeTab === "chat" ? "active" : ""}`} onClick={() => setActiveTab("chat")}>💬 Chat</button>
              <button className={`tab ${activeTab === "quiz" ? "active" : ""}`} onClick={() => setActiveTab("quiz")}>🧠 Quiz</button>
            </div>
          </div>

          {activeTab === "chat" && (
            <>
              <div className="messages">
                {messages.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <div className="empty-title">No document loaded</div>
                    <div className="empty-sub">Upload a PDF or photo of your handwritten notes!</div>
                    <div className="empty-features">
                      <span className="empty-feature">📄 PDF documents</span>
                      <span className="empty-feature">📸 Handwritten notes</span>
                      <span className="empty-feature">🧠 Auto Quiz</span>
                      <span className="empty-feature">📌 Page citations</span>
                    </div>
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
                    <div className="typing"><div className="dot" /><div className="dot" /><div className="dot" /></div>
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
                    placeholder={indexed ? "Ask anything about your document..." : "Upload a file first..."}
                    disabled={!indexed || loading}
                  />
                </div>
                <button className="send-btn" onClick={askQuestion} disabled={!indexed || loading || !question.trim()}>➤</button>
              </div>
            </>
          )}

          {activeTab === "quiz" && (
            <div className="quiz-area">
              <div className="quiz-header">
                <div>
                  <div className="quiz-title">🧠 Quiz yourself</div>
                  <div className="quiz-sub">Auto-generated from your document</div>
                </div>
                <button className="generate-btn" onClick={generateQuiz} disabled={!indexed || quizLoading}>
                  {quizLoading ? "Generating..." : "Generate Quiz ✨"}
                </button>
              </div>

              {quizLoading && (
                <>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${quizProgress}%` }} />
                  </div>
                  <div className="quiz-empty">
                    <div className="quiz-empty-icon">⏳</div>
                    <div className="quiz-empty-title">Generating quiz...</div>
                    <div className="quiz-empty-sub">Creating questions from your document!</div>
                  </div>
                </>
              )}

              {!quizLoading && quiz.length === 0 && (
                <div className="quiz-empty">
                  <div className="quiz-empty-icon">🧠</div>
                  <div className="quiz-empty-title">No quiz yet</div>
                  <div className="quiz-empty-sub">{indexed ? "Click Generate Quiz to create questions!" : "Upload a document first!"}</div>
                </div>
              )}

              {!quizLoading && submitted && (
                <div className="score-card">
                  <div className="score-emoji">{score === quiz.length ? "🏆" : score >= quiz.length / 2 ? "🎉" : "📚"}</div>
                  <div className="score-text">{score} / {quiz.length} correct</div>
                  <div className="score-sub">
                    {score === quiz.length ? "Perfect score! You nailed it! 🏆" : score >= quiz.length / 2 ? "Good job! Keep studying! 💪" : "Keep studying, you'll get there! 📚"}
                  </div>
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: `${(score / quiz.length) * 100}%` }} />
                  </div>
                  <button className="retry-btn" onClick={() => { setAnswers({}); setSubmitted(false); setScore(0); }}>Try Again 🔄</button>
                </div>
              )}

              {!quizLoading && quiz.map((q, i) => (
                <div key={q.id} className={`question-card ${correctFlash === q.id ? "flash" : ""}`}>
                  <div className="question-num">Question {i + 1} of {quiz.length}</div>
                  <div className="question-text">{q.question}</div>
                  <div className="options">
                    {q.options.map(opt => {
                      let cls = "option";
                      if (submitted) {
                        cls += " disabled";
                        if (opt.label === q.correct) cls += " correct";
                        else if (answers[q.id] === opt.label) cls += " wrong";
                      } else if (answers[q.id] === opt.label) cls += " selected";
                      return (
                        <div key={opt.label} className={cls} onClick={() => selectAnswer(q.id, opt.label, q.correct)}>
                          <div className="option-label">{opt.label}</div>
                          <div className="option-text">{opt.text}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {!quizLoading && quiz.length > 0 && !submitted && (
                <button className="submit-btn" onClick={submitQuiz} disabled={Object.keys(answers).length < quiz.length}>
                  Submit Quiz ({Object.keys(answers).length}/{quiz.length} answered)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}