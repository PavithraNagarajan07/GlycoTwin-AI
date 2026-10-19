# GlycoTwin AI architecture

```mermaid
flowchart TD
  A[Synthetic EHR profile] --> C[Data alignment and validation]
  B[Timestamped synthetic CGM stream] --> C
  C --> D[Past-only rolling feature builder]
  D --> E[Random Forest training and patient-level evaluation]
  D --> F[Current virtual patient state]
  F --> G[FastAPI prediction service]
  E --> G
  G --> H[Streamlit doctor-facing dashboard]
  H --> I[Glucose timeline and EHR profile]
  H --> J[Two-hour event probability and model context]
  H --> K[Historical replay]
```

The training pipeline builds labels from the following eight 15-minute readings. Incomplete future windows are excluded from training. Evaluation is performed on held-out patients. All data are synthetic and model metrics are not clinical performance claims.
