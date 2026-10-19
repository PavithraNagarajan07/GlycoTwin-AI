# GlycoTwin AI: A Personalized Digital Twin for Predicting Glucose Excursions

**Institution:** Amrita Vishwa Vidyapeetham, Chennai Campus  
**Team members:** Pavithra N and Methra Renganathan

## 1. Project Overview

GlycoTwin AI is a healthcare AI prototype exploring a digital-twin-inspired approach to glucose monitoring. It demonstrates synthetic patient profiles, glucose timelines, a dashboard, and experimental glucose-risk predictions.

## 2. Problem Statement

Glucose levels can fluctuate over time, making patterns difficult to understand from individual readings alone. GlycoTwin AI explores a software workflow for visualizing glucose histories and investigating potential glucose excursions over time.

## 3. Healthcare Use Case

The prototype demonstrates how glucose timelines and patient-specific synthetic data could support exploration of glucose patterns. It is intended for research and demonstration, not for clinical decision-making.

## 4. Key Features

- Synthetic patient profiles and glucose readings
- Glucose timeline visualization
- Streamlit dashboard
- FastAPI backend and API documentation
- Experimental prediction endpoint
- Simulation endpoint
- System architecture and presentation materials

## 5. Technology Stack

- Python
- FastAPI and Uvicorn
- Streamlit
- Pandas and NumPy
- Plotly
- Scikit-learn and Joblib are listed as dependencies; their use in the active prediction pipeline must be verified.

## 6. AI/ML Model Details

The current demo API identifies its model status as `heuristic_baseline_not_trained`. Therefore, the working API must not be described as a trained or validated Random Forest model unless the actual source code and evaluation results establish that separately.

**Training approach:** A trained-model pipeline must be confirmed in the project source before claiming model training.

**Evaluation metrics:** Report accuracy, precision, recall, F1-score, ROC-AUC, or other metrics only when supported by actual evaluation results. No verified model metrics are claimed here.

**Limitations:** The current demo uses synthetic data and an experimental heuristic baseline. Its outputs do not establish real-world predictive performance.

## 7. System Architecture

The dashboard communicates with a FastAPI backend that exposes patient, timeline, prediction, and simulation functionality.

- [Architecture diagram — PDF](submission/architecture.pdf)
- [Architecture diagram — PNG](submission/architecture.png)
- [Architecture source — Mermaid](submission/architecture.mmd)

## 8. Project Presentation

- [Presentation — PDF](submission/presentation.pdf)
- [Presentation — PowerPoint](submission/presentation.pptx)

## 9. Demonstration Video

**Status:** Pending recording and upload.

The demonstration video will be added here after it is recorded and uploaded to YouTube as an unlisted video.

**Demo video link:** To be added.

## 10. Team

| Team member | Role |
|---|---|
| Pavithra N | To be confirmed by the team |
| Methra Renganathan | To be confirmed by the team |

Please update this table with the actual agreed responsibilities before final submission.

## 11. Institution

Amrita Vishwa Vidyapeetham, Chennai Campus.

## 12. Running the Project Locally

Install the dependencies from the project root:

```bash
pip install -r requirements.txt
```

Start the API:

```bash
uvicorn backend.main:app --reload
```

In a separate terminal, start the dashboard:

```bash
streamlit run dashboard/app.py
```

- Dashboard: http://localhost:8501
- API health: http://127.0.0.1:8000/health
- Interactive API documentation: http://127.0.0.1:8000/docs

## 13. Safety, Privacy, and Limitations

This prototype uses synthetic demonstration data and has not been clinically validated. The current heuristic baseline is not a substitute for a trained and evaluated clinical model. The software must not be used for diagnosis, treatment decisions, medication dosing, or medical emergencies.

Any future clinical use would require appropriate data governance, privacy safeguards, rigorous model evaluation, external validation, and clinical assessment.

## 14. License

The project includes an MIT License. See [LICENSE](LICENSE) for the license text.
