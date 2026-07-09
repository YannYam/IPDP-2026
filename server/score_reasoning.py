import sys
import json
import base64

try:
    from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
except ImportError:
    print(json.dumps({"error": "PySastrawi not installed. Run: pip install PySastrawi"}))
    sys.exit(0)

def calculate_score(student_answer, reference_answer, max_points=20):
    """
    Score a student's essay reasoning against a reference answer.
    Uses PySastrawi stemmer for Indonesian text normalization.
    Returns a score from 0 to max_points.
    """
    factory = StemmerFactory()
    stemmer = factory.create_stemmer()
    
    # Stem both answers to normalize Indonesian words
    student_stemmed = stemmer.stem(student_answer.lower()).split()
    reference_stemmed = stemmer.stem(reference_answer.lower()).split()
    
    if not reference_stemmed or not student_stemmed:
        return 0
    
    # Calculate overlap using set intersection
    student_set = set(student_stemmed)
    reference_set = set(reference_stemmed)
    
    match_count = len(student_set.intersection(reference_set))
    
    if len(reference_set) == 0:
        return 0
    
    # Calculate percentage match then scale to max_points
    percentage = match_count / len(reference_set)
    score = round(percentage * max_points, 1)
    
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

        # Also return keyword match info for transparency
        factory = StemmerFactory()
        stemmer = factory.create_stemmer()
        student_set = set(stemmer.stem(student.lower()).split())
        reference_set = set(stemmer.stem(reference.lower()).split())
        matched = len(student_set.intersection(reference_set))

        score = calculate_score(student, reference, max_points)
        print(json.dumps({
            "score": score,
            "matched_keywords": matched,
            "total_keywords": len(reference_set)
        }))
    except Exception as e:
        print(json.dumps({"error": str(e), "score": 0}))
