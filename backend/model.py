import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, roc_auc_score,
    average_precision_score, balanced_accuracy_score,
)
from sklearn.model_selection import GroupShuffleSplit
from backend.features import FEATURE_COLUMNS, build_patient_features

def make_training_frame(ehr: pd.DataFrame, cgm: pd.DataFrame):
    frames = []
    for _, row in ehr.iterrows():
        one = cgm[cgm.patient_id == row.patient_id]
        feat = build_patient_features(one, row.to_dict())
        feat["patient_id"] = row.patient_id
        frames.append(feat)
    frame = pd.concat(frames, ignore_index=True)
    # Incomplete future windows must not be treated as negative examples.
    return frame.dropna(subset=["target_high_within_2h"]).reset_index(drop=True)

def train_and_save(ehr, cgm, model_path):
    frame = make_training_frame(ehr, cgm)
    X, y, groups = frame[FEATURE_COLUMNS], frame["target_high_within_2h"].astype(int), frame["patient_id"]
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    train_idx, test_idx = next(splitter.split(X, y, groups))
    model = RandomForestClassifier(
        n_estimators=180, max_depth=9, min_samples_leaf=4,
        class_weight="balanced", random_state=42, n_jobs=-1
    )
    model.fit(X.iloc[train_idx], y.iloc[train_idx])
    probs = model.predict_proba(X.iloc[test_idx])[:, 1]
    preds = (probs >= 0.5).astype(int)
    y_test = y.iloc[test_idx]
    baseline_preds = [0] * len(y_test)
    metrics = {
        "test_rows": int(len(test_idx)),
        "test_patients": int(groups.iloc[test_idx].nunique()),
        "positive_rate": round(float(y_test.mean()), 4),
        "accuracy": round(float(accuracy_score(y_test, preds)), 4),
        "balanced_accuracy": round(float(balanced_accuracy_score(y_test, preds)), 4),
        "precision": round(float(precision_score(y_test, preds, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, preds, zero_division=0)), 4),
        "baseline_all_negative_accuracy": round(float(accuracy_score(y_test, baseline_preds)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, probs)), 4) if y_test.nunique() > 1 else None,
        "average_precision": round(float(average_precision_score(y_test, probs)), 4) if y_test.nunique() > 1 else None,
        "note": "Synthetic-data demonstration only; not clinical performance.",
    }
    bundle = {"model": model, "features": FEATURE_COLUMNS, "metrics": metrics, "threshold": 180.0}
    joblib.dump(bundle, model_path)
    return bundle
