import json, os, faiss, numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME = "paraphrase-MiniLM-L3-v2"
INDEX_PATH = "index/faiss.index"
META_PATH  = "index/metadata.json"
CHUNKS_DIR = "data/chunks"

os.makedirs("index", exist_ok=True)

model = SentenceTransformer(MODEL_NAME)

def load_all_chunks() -> list:
    all_chunks = []
    for fname in os.listdir(CHUNKS_DIR):
        if fname.endswith(".json"):
            with open(os.path.join(CHUNKS_DIR, fname), encoding="utf-8") as f:
                data = json.load(f)
                for chunk in data["chunks"]:
                    chunk["doc_name"] = data["doc_name"]
                    all_chunks.append(chunk)
    return all_chunks

def build_index():
    chunks = load_all_chunks()
    texts = [c["text"] for c in chunks]
    print(f"Building index for {len(texts)} chunks...")
    embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(np.array(embeddings, dtype="float32"))
    faiss.write_index(index, INDEX_PATH)
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2)
    print(f"Index saved with {len(chunks)} chunks!")
    return len(chunks)

def load_index():
    index = faiss.read_index(INDEX_PATH)
    with open(META_PATH, encoding="utf-8") as f:
        chunks = json.load(f)
    return index, chunks

def search(query: str, top_k: int = 5) -> list:
    index, chunks = load_index()
    query_vec = model.encode([query], normalize_embeddings=True)
    scores, indices = index.search(np.array(query_vec, dtype="float32"), top_k)
    results = []
    for score, idx in zip(scores[0], indices[0]):
        chunk = chunks[idx].copy()
        chunk["score"] = float(score)
        results.append(chunk)
    return results