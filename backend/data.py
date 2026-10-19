"""Generate reproducible synthetic EHR profiles and CGM-like time-series."""
import numpy as np
import pandas as pd
from backend.config import HIGH_THRESHOLD, RANDOM_SEED

def generate_synthetic_data(n_patients: int = 36, days: int = 8, seed: int = RANDOM_SEED):
    rng = np.random.default_rng(seed)
    ehr_rows, cgm_rows = [], []
    periods_per_day = 96  # 15-minute cadence
    total = days * periods_per_day
    times = pd.date_range("2026-01-01", periods=total, freq="15min")
    for p in range(n_patients):
        pid = f"GT-{p+1:03d}"
        age = int(rng.integers(25, 76))
        years = int(rng.integers(0, 19))
        hba1c = float(np.clip(rng.normal(7.3 + 0.035 * years, 1.25), 5.2, 12.5))
        baseline = float(np.clip(105 + (hba1c - 5.5) * 14 + rng.normal(0, 10), 85, 180))
        sensitivity = float(rng.uniform(0.65, 1.35))
        ehr_rows.append({
            "patient_id": pid, "age": age, "diagnosis": "Type 2 diabetes",
            "years_since_diagnosis": years, "hba1c_percent": round(hba1c, 1),
            "baseline_glucose_mg_dl": round(baseline, 1),
            "medication_group": str(rng.choice(["Lifestyle", "Oral therapy", "Combination therapy"])),
            "synthetic_record": True
        })
        glucose = baseline
        vals = []
        for i, ts in enumerate(times):
            hour = ts.hour + ts.minute / 60
            # Synthetic meal/activity pulses, deliberately not a clinical physiology simulator.
            meal = sum(1 for m in (8, 13, 19) if 0 <= (hour - m) % 24 < 2.25)
            pulse = meal * rng.uniform(7, 24) * sensitivity
            night_dip = 7 if hour < 6 else 0
            noise = rng.normal(0, 5.5)
            target = baseline + pulse - night_dip + noise
            glucose = 0.72 * glucose + 0.28 * target + rng.normal(0, 3.0)
            glucose = float(np.clip(glucose, 58, 330))
            # A few realistic-looking noisy readings, but still wholly synthetic.
            if rng.random() < 0.004:
                glucose = float(np.clip(glucose + rng.normal(0, 22), 55, 350))
            vals.append(glucose)
            cgm_rows.append({"patient_id": pid, "timestamp": ts, "glucose_mg_dl": round(glucose, 1)})
    ehr = pd.DataFrame(ehr_rows)
    cgm = pd.DataFrame(cgm_rows).sort_values(["patient_id", "timestamp"]).reset_index(drop=True)
    return ehr, cgm

def save_synthetic_data(ehr_path, cgm_path):
    ehr, cgm = generate_synthetic_data()
    ehr.to_csv(ehr_path, index=False)
    cgm.to_csv(cgm_path, index=False)
    return ehr, cgm
