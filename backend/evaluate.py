import json
from backend.config import DATA_PATH, EHR_PATH, MODEL_PATH
from backend.model import train_and_save
import pandas as pd

def main():
    ehr, cgm = pd.read_csv(EHR_PATH), pd.read_csv(DATA_PATH, parse_dates=["timestamp"])
    bundle = train_and_save(ehr, cgm, MODEL_PATH)
    print(json.dumps(bundle["metrics"], indent=2))

if __name__ == "__main__":
    main()
