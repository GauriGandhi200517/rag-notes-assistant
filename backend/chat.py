import requests
import os
from search import search

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen:0.5b"

def build_prompt(question: str, chunks: list) -> str:
    context = ""
    for i, chunk in enumerate(chunks):
        context += f"[Source {i+1} - {chunk['doc_name']} page {chunk['page']}]\n{chunk['text']}\n\n"
    
    prompt = f"""You are a helpful assistant. Answer the question using ONLY the context below.
If the answer is not in the context, say "I could not find this in the provided documents."
Always mention which source and page number you used.

Context:
{context}

Question: {question}

Answer:"""
    return prompt

def chat(question: str, top_k: int = 5) -> dict:
    chunks = search(question, top_k)
    prompt = build_prompt(question, chunks)

    # Try Ollama first (local), fall back to simple extraction
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False
        }, timeout=30)
        answer = response.json().get("response", "")
        if not answer:
            raise Exception("Empty response")
    except:
        # Fallback: return best chunk text as answer
        if chunks:
            answer = f"Based on the documents: {chunks[0]['text'][:300]}"
        else:
            answer = "I could not find this in the provided documents."

    sources = [
        {
            "doc_name": c["doc_name"],
            "page": c["page"],
            "chunk_id": c["chunk_id"],
            "snippet": c["text"][:200]
        }
        for c in chunks
    ]

    return {"answer": answer, "sources": sources}