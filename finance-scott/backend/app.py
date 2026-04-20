from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import os
import sys

app = Flask(__name__)
CORS(app)  # allow the HTML file to call this API

# ── Load model ────────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'tfidf_pipeline.pkl')
model_loaded = False
pipe = None

def load_model():
    global pipe, model_loaded
    if not os.path.exists(MODEL_PATH):
        print(f"[WARNING] Model not found at {MODEL_PATH}")
        print("[WARNING] Running without ML — /classify will return null.")
        return
    try:
        from scipy.sparse import hstack
        with open(MODEL_PATH, 'rb') as f:
            pipe = pickle.load(f)
        model_loaded = True
        print(f"[OK] Model loaded from {MODEL_PATH}")
    except Exception as e:
        print(f"[ERROR] Failed to load model: {e}")

load_model()

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model_loaded': model_loaded})


@app.route('/classify', methods=['POST'])
def classify():
    """
    POST /classify
    Body: { "description": "Salary January TCS" }
    Returns: {
        "is_income": true,
        "confidence": 0.9871,
        "label": "income"
    }
    """
    data = request.get_json()
    if not data or 'description' not in data:
        return jsonify({'error': 'Missing description field'}), 400

    description = str(data['description']).strip()
    if not description:
        return jsonify({'error': 'Empty description'}), 400

    if not model_loaded:
        return jsonify({
            'is_income': None,
            'confidence': None,
            'label': None,
            'error': 'Model not loaded'
        })

    try:
        from scipy.sparse import hstack
        xw = pipe['tfidf_word'].transform([description])
        xc = pipe['tfidf_char'].transform([description])
        x  = hstack([xw, xc])
        prob = float(pipe['model'].predict_proba(x)[0, 1])
        threshold = data.get('threshold', 0.5)
        is_income = prob >= threshold

        return jsonify({
            'is_income': is_income,
            'confidence': round(prob, 4),
            'label': 'income' if is_income else 'non-income'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/classify/batch', methods=['POST'])
def classify_batch():
    """
    POST /classify/batch
    Body: { "descriptions": ["Salary TCS", "Netflix bill", ...] }
    Returns: { "results": [ { is_income, confidence, label }, ... ] }
    """
    data = request.get_json()
    if not data or 'descriptions' not in data:
        return jsonify({'error': 'Missing descriptions field'}), 400

    descriptions = [str(d).strip() for d in data['descriptions']]

    if not model_loaded:
        return jsonify({'results': [{'is_income': None, 'confidence': None, 'label': None}] * len(descriptions)})

    try:
        from scipy.sparse import hstack
        xw = pipe['tfidf_word'].transform(descriptions)
        xc = pipe['tfidf_char'].transform(descriptions)
        x  = hstack([xw, xc])
        probs = pipe['model'].predict_proba(x)[:, 1].tolist()
        threshold = data.get('threshold', 0.5)
        results = [
            {
                'description': d,
                'is_income': p >= threshold,
                'confidence': round(p, 4),
                'label': 'income' if p >= threshold else 'non-income'
            }
            for d, p in zip(descriptions, probs)
        ]
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("\n Finance Scott - ML Backend")
    print(" ─────────────────────────────")
    print(f" Model loaded : {model_loaded}")
    print(f" Running on   : http://localhost:5000")
    print(" Press Ctrl+C to stop\n")
    app.run(host='127.0.0.1', port=5000, debug=False)
