from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)
MODEL_PATH = ARTIFACTS / "glycotwin_model.joblib"
DATA_PATH = ARTIFACTS / "synthetic_cgm.csv"
EHR_PATH = ARTIFACTS / "synthetic_ehr.csv"
HIGH_THRESHOLD = 180.0
PREDICTION_HORIZON_MIN = 120
RANDOM_SEED = 42
