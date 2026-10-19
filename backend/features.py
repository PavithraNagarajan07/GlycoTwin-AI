"""Past-only rolling features and future-horizon labels for offline training."""
import pandas as pd
from backend.config import HIGH_THRESHOLD

FEATURE_COLUMNS = [
    "glucose_now", "change_15m", "change_60m", "mean_1h", "mean_3h",
    "std_3h", "max_1h", "above_160_count_1h", "age",
    "hba1c_percent", "years_since_diagnosis", "baseline_glucose_mg_dl"
]

def build_patient_features(cgm: pd.DataFrame, ehr_row: dict, threshold: float = HIGH_THRESHOLD):
    cgm = cgm.sort_values("timestamp").copy()
    g = cgm["glucose_mg_dl"].astype(float)
    cgm["glucose_now"] = g
    cgm["change_15m"] = g.diff(1)
    cgm["change_60m"] = g.diff(4)
    cgm["mean_1h"] = g.rolling(4, min_periods=1).mean()
    cgm["mean_3h"] = g.rolling(12, min_periods=1).mean()
    cgm["std_3h"] = g.rolling(12, min_periods=2).std().fillna(0)
    cgm["max_1h"] = g.rolling(4, min_periods=1).max()
    cgm["above_160_count_1h"] = (g > 160).rolling(4, min_periods=1).sum()
    for col in ["age", "hba1c_percent", "years_since_diagnosis", "baseline_glucose_mg_dl"]:
        cgm[col] = float(ehr_row[col])
    # 8 future readings = 120 minutes at a 15-minute cadence.
    future = pd.concat([g.shift(-i) for i in range(1, 9)], axis=1)
    complete_window = future.notna().all(axis=1)
    future_max = future.max(axis=1)
    labels = pd.Series(float("nan"), index=cgm.index)
    labels.loc[complete_window] = (future_max.loc[complete_window] >= threshold).astype(int)
    cgm["target_high_within_2h"] = labels
    # Retain incomplete target rows for inference; training removes them in model.py.
    return cgm.dropna(subset=["change_60m"]).reset_index(drop=True)

def latest_feature_row(cgm: pd.DataFrame, ehr_row: dict):
    features = build_patient_features(cgm, ehr_row)
    if features.empty:
        raise ValueError("Not enough sensor readings to compute features.")
    return features.iloc[[-1]][FEATURE_COLUMNS], features.iloc[-1].to_dict()
