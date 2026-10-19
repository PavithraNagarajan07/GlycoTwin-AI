from datetime import datetime
from pathlib import Path
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from backend.config import DATA_PATH, EHR_PATH, MODEL_PATH, HIGH_THRESHOLD, PREDICTION_HORIZON_MIN
from backend.features import latest_feature_row, FEATURE_COLUMNS

app = FastAPI(title="GlycoTwin AI API", version="0.1.0",
              description="Synthetic-data research prototype; not for clinical use.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False,
                   allow_methods=["*"], allow_headers=["*"])

def load_data():
    if not DATA_PATH.exists() or not EHR_PATH.exists():
        raise RuntimeError("Demo data missing. Run: python -m backend.train")
    return pd.read_csv(EHR_PATH), pd.read_csv(DATA_PATH, parse_dates=["timestamp"])

def load_bundle():
    if not MODEL_PATH.exists():
        raise RuntimeError("Model missing. Run: python -m backend.train")
    return joblib.load(MODEL_PATH)

@app.get("/health")
def health():
    return {"status": "ok", "service": "GlycoTwin AI", "synthetic_data_only": True}


@app.get("/api/model/metrics")
def model_metrics():
    try:
        bundle = load_bundle()
        return {"metrics": bundle.get("metrics", {}), "model_type": type(bundle["model"]).__name__,
                "data_mode": "synthetic", "clinical_validation": False}
    except RuntimeError as e:
        raise HTTPException(503, str(e))

@app.get("/api/patients")
def patients():
    try:
        ehr, cgm = load_data()
        return {"patients": ehr.to_dict(orient="records"), "count": len(ehr)}
    except RuntimeError as e:
        raise HTTPException(503, str(e))

@app.get("/api/patient/{patient_id}/timeline")
def timeline(patient_id: str, limit: int = 192):
    ehr, cgm = load_data()
    subset = cgm[cgm.patient_id == patient_id].tail(max(1, min(limit, 1000)))
    if subset.empty:
        raise HTTPException(404, "Patient not found")
    return {"patient_id": patient_id, "readings": subset.assign(timestamp=subset.timestamp.astype(str)).to_dict(orient="records")}

@app.get("/api/patient/{patient_id}/predict")
def predict(patient_id: str):
    try:
        ehr, cgm = load_data()
        row = ehr[ehr.patient_id == patient_id]
        readings = cgm[cgm.patient_id == patient_id]
        if row.empty or readings.empty:
            raise HTTPException(404, "Patient not found")
        ehr_row = row.iloc[0].to_dict()
        bundle = load_bundle()
        X, latest = latest_feature_row(readings, ehr_row)
        probability = float(bundle["model"].predict_proba(X[FEATURE_COLUMNS])[0, 1])
        latest_time = pd.to_datetime(latest["timestamp"])
        risk = "HIGHER" if probability >= 0.65 else ("MODERATE" if probability >= 0.35 else "LOWER")
        importances = bundle["model"].feature_importances_
        top = sorted(zip(FEATURE_COLUMNS, importances), key=lambda x: x[1], reverse=True)[:5]
        return {
            "patient_id": patient_id, "as_of": str(latest_time),
            "current_glucose_mg_dl": float(latest["glucose_now"]),
            "predicted_probability": round(probability, 4), "risk_band": risk,
            "threshold_mg_dl": HIGH_THRESHOLD, "horizon_minutes": PREDICTION_HORIZON_MIN,
            "features": {k: round(float(X.iloc[0][k]), 3) for k in FEATURE_COLUMNS},
            "top_model_features": [{"feature": k, "importance": round(float(v), 4)} for k, v in top],
            "safety_note": "Experimental estimate from synthetic data; not a diagnosis or treatment recommendation."
        }
    except RuntimeError as e:
        raise HTTPException(503, str(e))

class ReplayRequest(BaseModel):
    patient_id: str
    offset_readings: int = Field(default=0, ge=0, le=500)

@app.post("/api/simulate")
def simulate(payload: ReplayRequest):
    """Replay a historical point in the synthetic stream as a simple what-if/time-travel demo."""
    ehr, cgm = load_data()
    row = ehr[ehr.patient_id == payload.patient_id]
    readings = cgm[cgm.patient_id == payload.patient_id].sort_values("timestamp")
    if row.empty or readings.empty:
        raise HTTPException(404, "Patient not found")
    end = max(12, len(readings) - payload.offset_readings)
    partial = readings.iloc[:end]
    try:
        bundle = load_bundle()
        X, latest = latest_feature_row(partial, row.iloc[0].to_dict())
        prob = float(bundle["model"].predict_proba(X[FEATURE_COLUMNS])[0, 1])
    except ValueError as e:
        raise HTTPException(422, str(e))
    return {"patient_id": payload.patient_id, "as_of": str(latest["timestamp"]),
            "current_glucose_mg_dl": float(latest["glucose_now"]),
            "predicted_probability": round(prob, 4),
            "risk_band": "HIGHER" if prob >= .65 else ("MODERATE" if prob >= .35 else "LOWER"),
            "readings_used": int(len(partial)),
            "note": "Replay uses an earlier point in synthetic data; not a clinical what-if simulation."}
