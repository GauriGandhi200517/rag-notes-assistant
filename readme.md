# 🤖 RAG Notes Assistant

> Chat with your PDFs using AI — get answers with page citations instantly.

![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-green)
![React](https://img.shields.io/badge/React-Vite-purple)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

- 📄 Upload any PDF document
- 💬 Ask questions in natural language
- 🔍 Get answers with exact page citations
- ⚡ Fast semantic search using FAISS
- 🧠 Powered by local AI (no API costs!)

---

## 🚀 How to Run Locally

### 🔧 Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 🎨 Frontend
```bash
cd frontend
npm install
npm run dev
```

### 🤖 AI Model
```bash
ollama pull qwen:0.5b
ollama serve
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| 🔙 Backend | FastAPI, PyMuPDF, FAISS |
| 🎨 Frontend | React, Vite, Axios |
| 🧠 Embeddings | sentence-transformers |
| 🤖 LLM | Ollama (qwen:0.5b) |
| 📦 Vector Store | FAISS (local) |

---

## 📁 Project Structure
```
rag-notes-assistant/
├── 🔧 backend/
│   ├── main.py        # FastAPI server
│   ├── ingest.py      # PDF ingestion
│   ├── search.py      # FAISS vector search
│   └── chat.py        # RAG chat with citations
├── 🎨 frontend/
│   └── src/
│       └── App.jsx    # React UI
└── 📊 eval.py         # Evaluation script
```

---

## 📊 Evaluation Results

| Metric | Score |
|---|---|
| Average keyword score | 0.85 |
| Average latency | 13.8s |
| Sources per answer | 5 |

---

## 👩‍💻 Built by Gauri Gandhi