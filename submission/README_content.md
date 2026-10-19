# GlycoTwin AI

**A Personalized Digital Twin for Predicting Glucose Excursions**

## Problem statement and use case
Historical clinical records alone do not represent a patient's changing glucose state. GlycoTwin AI combines a synthetic EHR profile with a timestamped CGM-like stream, updates the virtual patient state, and estimates whether a reading will cross an illustrative 180 mg/dL threshold within the next 120 minutes.

## Technical stack
Python, FastAPI, Pandas, NumPy, scikit-learn Random Forest, Joblib, Streamlit, Plotly, Pytest.

## Current implementation
- Synthetic EHR and time-series data generator
- Past-only rolling features and future-window target label
- Random Forest classifier with patient-level train/test separation
- Baseline-aware evaluation metrics
- FastAPI endpoints for patient list, timeline, prediction, replay, and metrics
- Streamlit dashboard for patient profile, timeline, prediction context, evaluation, and replay

## Prediction target
At a prediction timestamp, the target is positive if any of the next eight 15-minute readings reaches or exceeds 180 mg/dL. Incomplete two-hour future windows are excluded from model training. This is an experimental label definition, not a clinical diagnosis or universal treatment threshold.

## Run locally
```cmd
py -3.10 -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
python -m backend.train
```
Start the API: `uvicorn backend.main:app --reload --port 8000`
Start the dashboard: `streamlit run dashboard/app.py`

## Team information
Team: [ADD TEAM NAME]
Members: [ADD MEMBER NAMES]
Institution/incubator: [ADD DETAILS]

## Data, evaluation, and safety
All included data are synthetic. Report the actual metrics printed by the current training run, including class balance and the all-negative baseline. Synthetic performance is not evidence of clinical performance. The prototype is not for diagnosis, treatment, medication dosing, or emergency monitoring.
