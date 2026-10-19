# GlycoTwin AI — Personalized Glucose Excursion Digital Twin

Proof-of-concept for the Happiest Health Digital Twin Challenge 2026. This prototype combines synthetic EHR profiles with timestamped CGM-like readings and estimates whether glucose crosses an illustrative 180 mg/dL threshold within the next 120 minutes.

## Features
- Reproducible synthetic EHR and CGM-like data generation
- Past-only rolling features and patient-level train/test split
- Random Forest model and baseline-aware evaluation metrics
- FastAPI endpoints for patients, timelines, predictions, replay, and model metrics
- React + Vite dashboard with responsive clinical UI, patient selector, glucose timeline, event-probability view, model context, evaluation lab, and sequential synthetic sensor replay
- Legacy Streamlit dashboard retained as a fallback
- Synthetic-data and medical-safety disclosures

## Setup (Windows)

### 1. Python API and model
```cmd
py -3.10 -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
python -m backend.train
```
Start the API in Terminal 1:
```cmd
uvicorn backend.main:app --reload --port 8000
```
API docs: http://127.0.0.1:8000/docs

### 2. React dashboard (recommended)
Install Node.js 20+ (Node.js 22 LTS recommended), then open Terminal 2:
```cmd
cd frontend
npm install
npm run dev
```
Open the local URL printed by Vite, usually http://127.0.0.1:5173.

The frontend defaults to `http://127.0.0.1:8000`. To change the API URL, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_BASE_URL` before running Vite.

### 3. Optional legacy Streamlit dashboard
```cmd
streamlit run dashboard/app.py
```
Legacy dashboard: http://localhost:8501

## Important interpretation
The label is 1 when any of the next eight 15-minute readings crosses 180 mg/dL. Training excludes incomplete future windows. Test data are separated by patient. Synthetic data and synthetic metrics are not evidence of clinical performance. Because positive events may be rare, accuracy must be interpreted alongside recall, precision, ROC-AUC, average precision, and the all-negative baseline.

## Safety
This is a software proof of concept, not a medical device. It must not be used for diagnosis, treatment, medication dosing, or emergency monitoring. Thresholds and risk bands are demonstration choices that require clinical validation.

## Submission checklist
- [ ] Replace team/institution placeholders
- [ ] Verify the actual generated metrics and document them accurately
- [ ] Test on a clean environment
- [ ] Include architecture PDF/PPT and presentation PDF/PPT
- [ ] Record a video of at least 20 minutes showing the actual prototype
- [ ] Ensure the GitHub repository is public and all assets are accessible
