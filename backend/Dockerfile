FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/data/chunks /app/index

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

Create **`backend/requirements.txt`**:
```
fastapi
uvicorn
pymupdf
python-multipart
sentence-transformers
faiss-cpu
numpy
requests