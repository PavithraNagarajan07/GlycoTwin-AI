import json
from backend.config import ARTIFACTS, DATA_PATH, EHR_PATH, MODEL_PATH
from backend.data import save_synthetic_data
from backend.model import train_and_save

def main():
    ehr, cgm = save_synthetic_data(EHR_PATH, DATA_PATH)
    bundle = train_and_save(ehr, cgm, MODEL_PATH)
    print(f"Generated {len(ehr)} synthetic patients and {len(cgm)} CGM-like readings.")
    print("Model evaluation (synthetic data only):")
    print(json.dumps(bundle["metrics"], indent=2))
    print(f"Saved model: {MODEL_PATH}")

if __name__ == "__main__":
    main()
