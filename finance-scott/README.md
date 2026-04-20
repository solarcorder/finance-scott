# Finance Scott

Personal finance tracker with ML-powered income classification.

## Setup

### 1. Clone the repo
```
git clone https://github.com/YOUR_USERNAME/finance-scott.git
cd finance-scott
```

### 2. Add your trained model
Unzip `income_classifier_export.zip` (from Colab) into `backend/models/`:
```
backend/
  models/
    tfidf_pipeline.pkl     ← from the zip
    best_model/            ← from the zip (optional, BERT)
    labels.json            ← from the zip
```

### 3. Run
Double-click `start.bat`

That's it. The script will:
- Install Python dependencies on first run (takes ~1 min)
- Start the Flask backend
- Open the app in your browser automatically

### Requirements
- Python 3.9+ installed and added to PATH
- Windows 10/11

---

## Structure
```
finance-scott/
├── start.bat              ← double-click to run
├── frontend/
│   └── finance.html       ← the app
├── backend/
│   ├── app.py             ← Flask ML API
│   ├── requirements.txt
│   └── models/            ← put your zip contents here
└── README.md
```

## How ML works
- You type a description like "Salary January TCS"
- After a short pause, the app calls the local Flask API
- The TF-IDF model classifies it (trained on 500k+ samples)
- A badge appears suggesting "Looks like income" with confidence %
- You can apply it (auto-selects Income type) or ignore it
