from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil, tempfile, os
from ingest import ingest_pdf
from search import build_index, search

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/ingest")
async def ingest(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    result = ingest_pdf(tmp_path, file.filename)
    os.unlink(tmp_path)
    return result

@app.post("/build-index")
def build():
    count = build_index()
    return {"status": "ok", "chunks_indexed": count}

@app.post("/search")
def search_chunks(query: str, top_k: int = 5):
    results = search(query, top_k)
    return {"results": results}
