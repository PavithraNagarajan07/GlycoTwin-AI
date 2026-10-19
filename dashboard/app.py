import os
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

st.set_page_config(page_title="GlycoTwin AI | Patient Twin", page_icon="🧬", layout="wide")
API_BASE = os.getenv("GLYCOTWIN_API_URL", "http://127.0.0.1:8000").rstrip("/")

st.markdown("""
<style>
.block-container {padding-top: 1.15rem; padding-bottom: 2rem; max-width: 1500px;}
.gt-hero {padding: 1.45rem 1.65rem; border-radius: 18px; color: #fff; background: linear-gradient(115deg,#102a43 0%,#155e75 58%,#0f766e 100%); margin-bottom: 1rem;}
.gt-kicker {font-size: .78rem; letter-spacing: .13em; text-transform: uppercase; opacity: .82; font-weight: 700;}
.gt-hero h1 {margin: .25rem 0 .35rem 0; font-size: 2.2rem;}
.gt-hero p {margin: 0; opacity: .9;}
[data-testid="stMetric"] {background: #f5f8fb; border: 1px solid #e1e8ef; border-radius: 14px; padding: 14px 16px;}
[data-testid="stMetricLabel"] {color: #43566b;}
.gt-section {padding-top: .35rem;}
div[data-testid="stTabs"] button {font-weight: 650;}
</style>
<div class="gt-hero"><div class="gt-kicker">Personalized healthcare research prototype</div><h1>🧬 GlycoTwin AI</h1><p>Explore a virtual patient's evolving glucose state and an experimental two-hour forecast.</p></div>
""", unsafe_allow_html=True)
st.warning("SYNTHETIC DATA · EXPERIMENTAL ML · Not for diagnosis, treatment, medication dosing, or emergency monitoring.")

def api_get(path, params=None):
    try:
        r = requests.get(f"{API_BASE}{path}", params=params, timeout=8)
        r.raise_for_status()
        return r.json(), None
    except requests.RequestException as exc:
        return None, str(exc)
    except ValueError:
        return None, "The API returned invalid JSON."

def api_post(path, payload):
    try:
        r = requests.post(f"{API_BASE}{path}", json=payload, timeout=8)
        r.raise_for_status()
        return r.json(), None
    except requests.RequestException as exc:
        return None, str(exc)

health, err = api_get("/health")
if err:
    st.error(f"Backend unavailable at {API_BASE}. Start it with `uvicorn backend.main:app --reload --port 8000`.")
    st.code(err)
    st.stop()
patients_data, err = api_get("/api/patients")
if err:
    st.error(f"Could not load patient list: {err}"); st.stop()
patients = patients_data.get("patients", []) if isinstance(patients_data, dict) else []
if not patients:
    st.warning("No synthetic patient records returned. Run `python -m backend.train` first."); st.stop()

ids = [str(p.get("patient_id", f"Patient-{i+1}")) for i,p in enumerate(patients)]
selected_id = st.sidebar.selectbox("Virtual patient", ids)
patient = next((p for p in patients if str(p.get("patient_id")) == selected_id), patients[0])
st.sidebar.markdown("---")
st.sidebar.markdown("**Prediction target**")
st.sidebar.write("Threshold: 180 mg/dL")
st.sidebar.write("Horizon: next 120 minutes")
st.sidebar.caption("Prototype label definition, not an individualized clinical threshold.")

# Load timeline and current model estimate using the trained backend API.
timeline_data, timeline_err = api_get(f"/api/patient/{selected_id}/timeline", {"limit": 384})
prediction, pred_err = api_get(f"/api/patient/{selected_id}/predict")
metrics_response, metrics_err = api_get("/api/model/metrics")
if timeline_err: st.error(f"Timeline request failed: {timeline_err}")
if pred_err: st.error(f"Prediction request failed: {pred_err}")
if timeline_err or pred_err: st.stop()
readings = timeline_data.get("readings", [])
df = pd.DataFrame(readings)
if not df.empty:
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df["glucose_mg_dl"] = pd.to_numeric(df["glucose_mg_dl"], errors="coerce")
    df = df.dropna(subset=["timestamp", "glucose_mg_dl"]).sort_values("timestamp")
current = float(prediction.get("current_glucose_mg_dl", df.glucose_mg_dl.iloc[-1] if not df.empty else 0))
prob = float(prediction.get("predicted_probability", 0))
risk = str(prediction.get("risk_band", "Unavailable"))
as_of = str(prediction.get("as_of", "Unavailable"))

st.caption(f"Backend: connected · Model: {health.get('service','GlycoTwin API')} · Selected twin: {selected_id} · State timestamp: {as_of}")
col1,col2,col3,col4 = st.columns(4)
col1.metric("Latest glucose", f"{current:.1f} mg/dL")
col2.metric("Estimated 2-hour event probability", f"{prob:.1%}")
col3.metric("Experimental risk band", risk)
col4.metric("Readings displayed", f"{len(df):,}")
st.caption("Probability estimates come from a model trained on synthetic data; they are not clinically validated.")

tabs = st.tabs(["Patient twin", "Prediction context", "Model evaluation", "Historical replay"])
with tabs[0]:
    left,right = st.columns([1.65,1])
    with left:
        st.subheader("Glucose trajectory")
        if not df.empty:
            fig = px.line(df, x="timestamp", y="glucose_mg_dl", markers=False,
                          labels={"timestamp":"Timestamp", "glucose_mg_dl":"Glucose (mg/dL)"})
            fig.update_traces(line=dict(width=3), hovertemplate="%{x}<br>%{y:.1f} mg/dL<extra></extra>")
            fig.add_hline(y=180, line_dash="dash", line_color="#d97706", annotation_text="Illustrative threshold · 180 mg/dL")
            fig.update_layout(template="plotly_white", height=410, margin=dict(l=8,r=8,t=25,b=8), hovermode="x unified")
            st.plotly_chart(fig, use_container_width=True)
        else: st.info("No valid glucose readings returned.")
    with right:
        st.subheader("Historical EHR profile")
        fields = [
            ("Age", patient.get("age")), ("Diagnosis", patient.get("diagnosis")),
            ("Years since diagnosis", patient.get("years_since_diagnosis")),
            ("HbA1c", f"{patient.get('hba1c_percent','—')}%"),
            ("Baseline glucose", f"{patient.get('baseline_glucose_mg_dl','—')} mg/dL"),
            ("Medication category", patient.get("medication_group", "Not supplied")),
        ]
        for label,value in fields:
            st.markdown(f"**{label}**  ")
            st.write(value if value is not None else "Not supplied")
        st.info("The EHR profile is static historical context. Sensor readings update the current virtual state.")
with tabs[1]:
    st.subheader("What informed this estimate?")
    st.write("The model combines recent glucose patterns with selected historical patient characteristics. Feature importance describes overall model behavior, not causation or an individualized medical explanation.")
    features = prediction.get("features", {})
    if features:
        fdf = pd.DataFrame([{"Feature":k.replace("_"," ").title(), "Value":v} for k,v in features.items()])
        st.dataframe(fdf, use_container_width=True, hide_index=True)
    importance = prediction.get("top_model_features", [])
    if importance:
        idf = pd.DataFrame(importance).sort_values("importance")
        idf["feature"] = idf["feature"].str.replace("_"," ")
        figi = go.Figure(go.Bar(x=idf["importance"], y=idf["feature"], orientation="h"))
        figi.update_layout(template="plotly_white", height=330, margin=dict(l=8,r=8,t=20,b=8), xaxis_title="Global feature importance", yaxis_title="")
        st.plotly_chart(figi, use_container_width=True)
    st.json({"threshold_mg_dl":prediction.get("threshold_mg_dl"), "horizon_minutes":prediction.get("horizon_minutes"), "safety_note":prediction.get("safety_note")})
with tabs[2]:
    st.subheader("Held-out synthetic-data evaluation")
    if metrics_err or not metrics_response:
        st.info("Model metrics endpoint unavailable. Restart the updated API to view evaluation metrics.")
    else:
        m = metrics_response.get("metrics", {})
        st.caption(f"Model: {metrics_response.get('model_type','Unknown')} · Test patients: {m.get('test_patients','—')} · Test rows: {m.get('test_rows','—')}")
        a,b,c,d = st.columns(4)
        a.metric("ROC-AUC", str(m.get("roc_auc", "—")))
        b.metric("Average precision", str(m.get("average_precision", "—")))
        c.metric("Recall", str(m.get("recall", "—")))
        d.metric("Precision", str(m.get("precision", "—")))
        st.write(f"Positive event rate: **{m.get('positive_rate','—')}** · All-negative baseline accuracy: **{m.get('baseline_all_negative_accuracy','—')}** · Model accuracy: **{m.get('accuracy','—')}**")
        st.warning("These metrics describe only a synthetic-data experiment. They do not establish real-world or clinical performance. Rare positive events can make accuracy misleading.")
        st.json(m)
with tabs[3]:
    st.subheader("Time-travel replay")
    st.write("Choose an earlier point in the synthetic sensor history. The API recomputes the estimate using only readings available up to that point.")
    max_offset = min(500, max(0, 384-12))
    offset = st.slider("Replay earlier by number of readings", min_value=0, max_value=max_offset, value=0, step=12)
    st.caption("Each reading is 15 minutes apart in this synthetic dataset. Offset 0 means the latest point.")
    if st.button("Replay this patient state", type="primary"):
        replay, replay_err = api_post("/api/simulate", {"patient_id":selected_id, "offset_readings":offset})
        if replay_err: st.error(f"Replay failed: {replay_err}")
        elif replay:
            ra,rb,rc = st.columns(3)
            ra.metric("Replay glucose", f"{replay.get('current_glucose_mg_dl',0):.1f} mg/dL")
            rb.metric("Replay probability", f"{replay.get('predicted_probability',0):.1%}")
            rc.metric("Replay risk band", replay.get("risk_band","Unavailable"))
            st.caption(f"Replay timestamp: {replay.get('as_of','Unavailable')} · Readings used: {replay.get('readings_used','—')}")
            st.info(replay.get("note", "Historical replay only; not a treatment simulation."))

with st.expander("Safety, limitations and intended use"):
    st.markdown("""
    - All starter EHR and CGM-like data are synthetic.
    - The 180 mg/dL threshold and two-hour horizon define a demonstration label, not a universal clinical rule.
    - Model performance on synthetic data cannot establish clinical accuracy.
    - Risk bands are display categories, not medical classifications.
    - This prototype must not be used for diagnosis, treatment, medication dosing, or emergency monitoring.
    - Any real deployment would require suitable data permissions, independent validation, clinical review, privacy/security controls, and monitoring.
    """)
st.caption("GlycoTwin AI · Prototype · Synthetic data · Experimental model")
