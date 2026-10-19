# GlycoTwin AI — 20-minute demonstration script

## 0:00–2:00 — Introduction
Introduce GlycoTwin AI as a proof-of-concept digital twin for a narrow healthcare outcome: estimating whether a synthetic CGM-like series crosses an illustrative 180 mg/dL threshold within the next 120 minutes. State clearly that this is not clinically validated.

## 2:00–4:00 — What makes it a Digital Twin prototype?
Explain the two inputs: static synthetic EHR context and a timestamped dynamic sensor stream. Describe how the current virtual state is updated from the latest available readings and how a prediction is generated from that state.

## 4:00–7:00 — Architecture
Walk through the data generator, timestamp alignment, past-only rolling features, Random Forest model, patient-level evaluation, FastAPI service, and Streamlit dashboard. Distinguish model training from prediction serving.

## 7:00–10:00 — Data and target
Show the synthetic EHR and sensor timeline. Explain that readings are spaced 15 minutes apart and that the target is any crossing in the next eight readings. Incomplete future windows are excluded from training. These are controlled synthetic data, not patient observations.

## 10:00–13:00 — Model and evaluation
Show the actual current metrics from the Model Evaluation tab. Explain the patient-level split and compare model accuracy with the all-negative baseline. Discuss positive-event prevalence, precision, recall, ROC-AUC and average precision. Do not present synthetic metrics as clinical accuracy.

## 13:00–16:00 — Dashboard walkthrough
Select a virtual patient. Explain the profile, latest glucose, two-hour estimated probability, timeline, feature context, and safety notice. Explain that risk bands are interface categories and feature importance is not causality.

## 16:00–18:00 — Historical replay
Use the replay slider and run the replay. Explain that the system recomputes the model estimate using the earlier available sensor history. This is historical replay, not a treatment simulation.

## 18:00–20:00+ — Impact, limitations, and next steps
Discuss the potential workflow as a research decision-support concept. State that real deployment would require appropriate data permissions, independent validation on suitable datasets, clinical review, security and governance controls, and ongoing monitoring. Close with the project's technical contribution and future validation plan.

## Recording checklist
- Start API and dashboard before recording.
- Verify the patient selector, timeline, prediction, metrics and replay all work.
- Show the actual API documentation and architecture diagram.
- Do not display private information or invent metrics.
- If a feature fails, disclose it rather than implying it works.
