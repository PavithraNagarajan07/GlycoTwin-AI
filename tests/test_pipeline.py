import pandas as pd
from backend.data import generate_synthetic_data
from backend.features import build_patient_features, FEATURE_COLUMNS

def test_synthetic_data_shapes_and_privacy_marker():
    ehr, cgm = generate_synthetic_data(n_patients=3, days=2, seed=7)
    assert len(ehr) == 3
    assert len(cgm) == 3 * 2 * 96
    assert ehr["synthetic_record"].all()
    assert {"patient_id", "timestamp", "glucose_mg_dl"}.issubset(cgm.columns)

def test_features_are_created():
    ehr, cgm = generate_synthetic_data(n_patients=1, days=2, seed=8)
    row = ehr.iloc[0].to_dict()
    features = build_patient_features(cgm, row)
    assert set(FEATURE_COLUMNS).issubset(features.columns)
    assert "target_high_within_2h" in features.columns
    assert len(features) > 10
