import json
import time
from search import search
from chat import chat

# Add your own questions and expected keywords here
EVAL_DATASET = [
    {
        "question": "What is data mining?",
        "expected_keywords": ["data", "mining", "patterns", "knowledge"]
    },
    {
        "question": "What is WEKA?",
        "expected_keywords": ["weka", "tool", "environment", "knowledge"]
    },
    {
        "question": "What is classification?",
        "expected_keywords": ["classification", "class", "predict", "label"]
    },
    {
        "question": "What is DBMiner?",
        "expected_keywords": ["dbminer", "mining", "system", "database"]
    },
    {
        "question": "What is clustering?",
        "expected_keywords": ["cluster", "group", "similar", "data"]
    },
]

def evaluate():
    results = []
    print("\n Running evaluation...\n")

    for item in EVAL_DATASET:
        question = item["question"]
        expected = [k.lower() for k in item["expected_keywords"]]

        start = time.time()
        result = chat(question)
        latency = round(time.time() - start, 2)

        answer = result["answer"].lower()
        sources = result["sources"]

        # Check how many expected keywords appear in the answer
        hits = sum(1 for k in expected if k in answer)
        keyword_score = round(hits / len(expected), 2)

        # Check if answer is not empty
        has_answer = len(answer) > 20

        # Count sources returned
        source_count = len(sources)

        results.append({
            "question": question,
            "keyword_score": keyword_score,
            "has_answer": has_answer,
            "source_count": source_count,
            "latency_seconds": latency,
            "answer_preview": result["answer"][:100]
        })

        print(f"Q: {question}")
        print(f"   keyword_score: {keyword_score} | sources: {source_count} | latency: {latency}s")
        print(f"   answer: {result['answer'][:80]}...")
        print()

    # Save results
    with open("eval_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    avg_score = round(sum(r["keyword_score"] for r in results) / len(results), 2)
    avg_latency = round(sum(r["latency_seconds"] for r in results) / len(results), 2)

    print(f"Average keyword score: {avg_score}")
    print(f"Average latency: {avg_latency}s")
    print(f"\nFull results saved to eval_results.json")

if __name__ == "__main__":
    evaluate()