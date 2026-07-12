import sys
import json
import base64
import logging
import warnings

# Suppress HuggingFace and SentenceTransformer warnings from polluting stdout
warnings.filterwarnings('ignore')
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)
logging.getLogger("huggingface_hub").setLevel(logging.ERROR)

try:
    from sentence_transformers import SentenceTransformer, util
except ImportError:
    print(json.dumps({"error": "sentence-transformers not installed. Run: pip install sentence-transformers"}))
    sys.exit(0)

def calculate_score(student_answer, reference_answer, max_points=20):
    """
    Score a student's essay reasoning against a reference answer.
    Uses sentence-transformers with IndoBERT for semantic similarity.
    Returns a score from 0 to max_points.
    """
    model_name = "indobenchmark/indobert-base-p1"
    
    model = SentenceTransformer(model_name)
    
    student_emb = model.encode(student_answer, convert_to_tensor=True)
    ref_emb = model.encode(reference_answer, convert_to_tensor=True)
    
    sim = util.cos_sim(student_emb, ref_emb).item()
    sim_clamped = max(0.0, min(1.0, sim))
    
    # Apply threshold: similarity below this value is considered "irrelevant"
    # and scores 0. The range [threshold, 1.0] is rescaled to [0, max_points].
    SIMILARITY_THRESHOLD = 0.5
    if sim_clamped < SIMILARITY_THRESHOLD:
        return 0
    
    # Rescale: 0.5 -> 0 points, 1.0 -> max_points
    rescaled = (sim_clamped - SIMILARITY_THRESHOLD) / (1.0 - SIMILARITY_THRESHOLD)
    score = round(rescaled * max_points, 1)
    
    return min(max_points, max(0, score))

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            print(json.dumps({"score": 0, "matched_keywords": 0, "total_keywords": 0}))
            sys.exit(0)
            
        b64_str = sys.argv[1]
        data_str = base64.b64decode(b64_str).decode('utf-8')
        data = json.loads(data_str)
        
        student = data.get("student", "")
        reference = data.get("reference", "")
        max_points = data.get("max_points", 20)
        
        if not student or not reference:
            print(json.dumps({"score": 0, "matched_keywords": 0, "total_keywords": 0}))
            sys.exit(0)

        # Basic word match for transparency info (since IndoBERT works on embeddings)
        student_words = set(student.lower().split())
        reference_words = set(reference.lower().split())
        matched = len(student_words.intersection(reference_words))

        score = calculate_score(student, reference, max_points)
        print(json.dumps({
            "score": score,
            "matched_keywords": matched,
            "total_keywords": len(reference_words)
        }))
    except Exception as e:
        print(json.dumps({"error": str(e), "score": 0}))
