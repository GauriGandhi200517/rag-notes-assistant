import fitz  # PyMuPDF
import json
import os
import uuid

CHUNKS_DIR = "data/chunks"
os.makedirs(CHUNKS_DIR, exist_ok=True)

def extract_text(pdf_path: str) -> list:
    doc = fitz.open(pdf_path)
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text()
        if text.strip():
            pages.append({"page": i + 1, "text": text})
    return pages

def chunk_text(pages: list, chunk_size=700, overlap=100):
    chunks = []
    doc_id = str(uuid.uuid4())[:8]
    chunk_id = 0
    for page in pages:
        text = page["text"]
        start = 0
        while start < len(text):
            end = start + chunk_size
            piece = text[start:end].strip()
            if piece:
                chunks.append({
                    "doc_id": doc_id,
                    "chunk_id": chunk_id,
                    "page": page["page"],
                    "text": piece
                })
                chunk_id += 1
            start += chunk_size - overlap
    return chunks, doc_id

def ingest_pdf(pdf_path: str, doc_name: str) -> dict:
    pages = extract_text(pdf_path)
    chunks, doc_id = chunk_text(pages)
    out_path = os.path.join(CHUNKS_DIR, f"{doc_id}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"doc_name": doc_name, "chunks": chunks}, f, indent=2)
    print(f"Saved {len(chunks)} chunks to {out_path}")
    return {"doc_id": doc_id, "chunks": len(chunks), "pages": len(pages)}