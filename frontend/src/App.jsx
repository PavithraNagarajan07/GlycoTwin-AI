import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Check, ChevronDown, CircleHelp,
  Clock3, Cloud, Database, Download, FlaskConical, Gauge, HeartPulse, LayoutDashboard,
  LoaderCircle, Pause, Play, Radio, RefreshCw, ShieldCheck, Sparkles, Users, Waves,
  X, Zap, BrainCircuit, CalendarClock, CircleDot, AlertTriangle
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Cell
} from 'recharts';

const API = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const HISTORY_POINTS = 384;
const FULL_SERIES_POINTS = 768; // Starter data: 8 days × 96 readings/day.
const fmtTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const fmtShortTime = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const pct = (v) => `${(Number(v || 0) * 100).toFixed(1)}%`;
const riskColor = (risk) => String(risk).toUpperCase() === 'HIGHER' ? 'rose' : String(risk).toUpperCase() === 'MODERATE' ? 'amber' : 'mint';

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try { const body = await response.json(); detail = body.detail || detail; } catch { /* keep fallback */ }
    throw new Error(detail);
  }
  return response.json();
}

function BrandMark() {
  return <div className="brand-mark"><Waves size={22} strokeWidth={2.5} /><span className="brand-orbit" /></div>;
}
function StatusDot({ tone = 'green' }) { return <span className={`status-dot ${tone}`} />; }
function MetricCard({ label, value, unit, icon: Icon, accent, note, trend }) {
  return <article className={`metric-card ${accent || ''}`}>
    <div className="metric-top"><span className="metric-label">{label}</span><span className="metric-icon"><Icon size={17} /></span></div>
    <div className="metric-value">{value}<span>{unit || ''}</span></div>
    <div className="metric-bottom">{trend && <span className={`trend ${trend.direction}`}>
      {trend.direction === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{trend.text}
    </span>}<span className="metric-note">{note}</span></div>
  </article>;
}
function SectionHeading({ eyebrow, title, right }) {
  return <div className="section-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{right}</div>;
}
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><div className="tooltip-time">{fmtTime(label)}</div>{payload.map((p) => <div className="tooltip-row" key={p.dataKey}><span className="tooltip-dot" style={{ background: p.color || p.stroke }} />{p.name || p.dataKey}<strong>{Number(p.value).toFixed(1)} mg/dL</strong></div>)}</div>;
}
function ProbabilityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><div className="tooltip-time">{label}</div><div className="tooltip-row"><span className="tooltip-dot" style={{ background: '#7568f6' }} />Estimated event probability<strong>{pct(payload[0].value)}</strong></div></div>;
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [timeline, setTimeline] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [activePage, setActivePage] = useState('overview');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const [replayPrediction, setReplayPrediction] = useState(null);
  const [replayBusy, setReplayBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const timerRef = useRef(null);

  const patient = useMemo(() => patients.find((p) => p.patient_id === patientId) || patients[0] || null, [patients, patientId]);
  const cleanedTimeline = useMemo(() => timeline.map((r, i) => ({
    ...r,
    timestamp: r.timestamp,
    glucose: Number(r.glucose_mg_dl),
    timeLabel: fmtShortTime(r.timestamp),
    index: i,
  })).filter((r) => Number.isFinite(r.glucose) && r.timestamp), [timeline]);
  const currentFrame = cursor >= 0 && cleanedTimeline[cursor] ? cleanedTimeline[cursor] : cleanedTimeline.at(-1);
  const currentGlucose = cursor >= 0 && currentFrame ? currentFrame.glucose : Number(prediction?.current_glucose_mg_dl || 0);
  const currentProbability = cursor >= 0 && replayPrediction ? Number(replayPrediction.predicted_probability) : Number(prediction?.predicted_probability || 0);
  const currentRisk = cursor >= 0 && replayPrediction ? replayPrediction.risk_band : (prediction?.risk_band || '—');
  const patientName = patient ? `Twin ${String(patient.patient_id || '').replace('GT-', '')}` : 'Patient twin';
  const riskTone = riskColor(currentRisk);

  const loadPatient = useCallback(async (id, keepPage = true) => {
    if (!id) return;
    setBusy(true); setError(''); setPlaying(false); setCursor(-1); setReplayPrediction(null);
    try {
      const [timelineResult, predictionResult] = await Promise.all([
        request(`/api/patient/${encodeURIComponent(id)}/timeline?limit=${HISTORY_POINTS}`),
        request(`/api/patient/${encodeURIComponent(id)}/predict`),
      ]);
      setTimeline(timelineResult.readings || []);
      setPrediction(predictionResult);
      setLastUpdated(new Date());
    } catch (e) { setError(e.message || 'Could not load this patient.'); }
    finally { setBusy(false); }
  }, []);

  const boot = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [h, p, m] = await Promise.all([
        request('/health'), request('/api/patients'), request('/api/model/metrics').catch(() => null),
      ]);
      setHealth(h); setPatients(p.patients || []); setMetrics(m?.metrics || null);
      const id = patientId && (p.patients || []).some((x) => x.patient_id === patientId) ? patientId : p.patients?.[0]?.patient_id;
      if (!id) throw new Error('No patient records returned. Run `python -m backend.train` first.');
      setPatientId(id);
      const [t, pred] = await Promise.all([
        request(`/api/patient/${encodeURIComponent(id)}/timeline?limit=${HISTORY_POINTS}`),
        request(`/api/patient/${encodeURIComponent(id)}/predict`),
      ]);
      setTimeline(t.readings || []); setPrediction(pred); setLastUpdated(new Date());
    } catch (e) { setError(e.message || 'Unable to connect to the GlycoTwin API.'); }
    finally { setBusy(false); }
  }, [patientId]);

  useEffect(() => { boot(); }, []); // intentionally load once at mount
  useEffect(() => { if (patientId && !busy) loadPatient(patientId); }, [patientId]);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const runReplayAt = useCallback(async (index) => {
    if (!patientId || !cleanedTimeline.length) return;
    setReplayBusy(true);
    try {
      // Current demo generator creates 768 readings per patient; timeline shows its latest 384.
      const offset = Math.max(0, FULL_SERIES_POINTS - (FULL_SERIES_POINTS - HISTORY_POINTS + index + 1));
      const result = await request('/api/simulate', { method: 'POST', body: JSON.stringify({ patient_id: patientId, offset_readings: offset }) });
      setReplayPrediction(result);
    } catch (e) { setError(`Replay unavailable: ${e.message}`); }
    finally { setReplayBusy(false); }
  }, [patientId, cleanedTimeline.length]);

  const startReplay = () => {
    if (cleanedTimeline.length < 2) return;
    setPlaying(true);
    setCursor((old) => old < 0 || old >= cleanedTimeline.length - 1 ? 0 : old);
  };
  useEffect(() => {
    if (!playing) { if (timerRef.current) clearInterval(timerRef.current); return undefined; }
    timerRef.current = setInterval(() => {
      setCursor((old) => {
        const next = old < 0 ? 0 : old + 1;
        if (next >= cleanedTimeline.length) { setPlaying(false); return cleanedTimeline.length - 1; }
        return next;
      });
    }, 950);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, cleanedTimeline.length]);
  useEffect(() => {
    if (cursor >= 0 && cleanedTimeline[cursor] && cursor % 4 === 0) runReplayAt(cursor);
  }, [cursor, runReplayAt, cleanedTimeline]);

  const chartData = useMemo(() => cleanedTimeline.map((r) => ({ ...r, glucose: r.glucose })), [cleanedTimeline]);
  const recent = cleanedTimeline.slice(-16);
  const avgRecent = recent.length ? recent.reduce((a, r) => a + r.glucose, 0) / recent.length : 0;
  const firstRecent = recent[0]?.glucose || avgRecent;
  const delta = avgRecent - firstRecent;
  const featureData = (prediction?.top_model_features || []).map((f) => ({ name: String(f.feature).replaceAll('_', ' '), value: Number(f.importance) * 100 })).sort((a, b) => a.value - b.value);
  const metricRows = metrics ? [
    { label: 'ROC-AUC', value: metrics.roc_auc == null ? '—' : Number(metrics.roc_auc).toFixed(3), note: 'Ranking metric' },
    { label: 'Precision', value: pct(metrics.precision), note: 'Positive predictions correct' },
    { label: 'Recall', value: pct(metrics.recall), note: 'Positive events detected' },
    { label: 'Accuracy', value: pct(metrics.accuracy), note: 'Can mislead on rare events' },
  ] : [];

  const exportSnapshot = () => {
    const payload = { project: 'GlycoTwin AI', generated_at: new Date().toISOString(), synthetic_data: true, patient, prediction, visible_readings: cleanedTimeline.length, model_metrics: metrics, disclaimer: 'Experimental synthetic-data prototype; not for clinical use.' };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `glycotwin-${patient?.patient_id || 'snapshot'}.json`; a.click(); URL.revokeObjectURL(url);
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><BrandMark /><div><div className="brand-name">glycotwin<span>•</span></div><div className="brand-sub">DIGITAL HEALTH LAB</div></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav">
        <button className={activePage === 'overview' ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage('overview')}><LayoutDashboard size={18}/><span>Twin overview</span><span className="nav-count">01</span></button>
        <button className={activePage === 'simulation' ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage('simulation')}><Radio size={18}/><span>Live simulator</span><span className="nav-live"><i /></span></button>
        <button className={activePage === 'evaluation' ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage('evaluation')}><BrainCircuit size={18}/><span>Model evaluation</span></button>
      </nav>
      <div className="sidebar-rule" />
      <div className="workspace-label">DATA SOURCES</div>
      <div className="source-row"><span className="source-icon ehr"><Database size={15}/></span><div><strong>Clinical profile</strong><small>Synthetic EHR</small></div><StatusDot /></div>
      <div className="source-row"><span className="source-icon cgm"><Waves size={15}/></span><div><strong>Glucose stream</strong><small>CGM-like series</small></div><StatusDot /></div>
      <div className="sidebar-bottom">
        <div className="security-card"><ShieldCheck size={17}/><div><strong>Privacy-first sandbox</strong><p>No real patient records are used in this demo.</p></div></div>
        <div className="user-row"><div className="avatar">GT</div><div><strong>Research workspace</strong><small>Prototype v1.0</small></div><ChevronDown size={15} /></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activePage === 'overview' ? 'Twin overview' : activePage === 'simulation' ? 'Live simulator' : 'Model evaluation'}</strong></div><div className="topbar-actions"><span className="connected-pill"><StatusDot />{health ? 'API connected' : 'Connecting'}</span><button className="icon-button" title="Refresh data" onClick={boot}><RefreshCw size={17}/></button><button className="icon-button" title="About this prototype" onClick={() => window.alert('GlycoTwin AI is a synthetic-data research prototype, not a clinical decision system.')}><CircleHelp size={17}/></button><div className="top-avatar">GT</div></div></header>

      <div className="page-content">
        <div className="page-title-row"><div><div className="eyebrow"><Sparkles size={13}/> PERSONALIZED HEALTH INTELLIGENCE</div><h1>{activePage === 'overview' ? 'Patient digital twin' : activePage === 'simulation' ? 'Sensor stream simulator' : 'Model evaluation lab'}</h1><p className="page-subtitle">{activePage === 'overview' ? 'A living view of historical context, incoming signals, and experimental risk forecasts.' : activePage === 'simulation' ? 'Replay a synthetic sensor stream and observe the virtual patient state evolve.' : 'Understand how the event prediction model performs on held-out synthetic patients.'}</p></div><div className="title-actions"><div className="updated-label"><span>LAST REFRESHED</span><strong>{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div><button className="button secondary" onClick={exportSnapshot}><Download size={16}/> Export snapshot</button></div></div>

        <div className="sandbox-banner"><div className="banner-icon"><FlaskConical size={17}/></div><div><strong>Research sandbox · Synthetic data</strong><span>Experimental estimates only. Not for diagnosis, treatment, medication dosing, or emergency monitoring.</span></div><span className="banner-tag">NON-CLINICAL</span></div>

        {error && <div className="error-banner"><AlertTriangle size={18}/><div><strong>Something needs attention</strong><span>{error}</span><small>Start the API with <code>uvicorn backend.main:app --reload --port 8000</code> and ensure model/data artifacts exist.</small></div><button onClick={() => setError('')}><X size={16}/></button></div>}

        {busy && !patient ? <div className="loading-panel"><LoaderCircle className="spin" size={28}/><strong>Connecting to your virtual patients…</strong><span>Loading synthetic EHR, sensor history and model output.</span></div> : <>
          <section className="patient-toolbar"><div className="patient-identity"><div className="patient-symbol"><HeartPulse size={23}/><span /></div><div><div className="patient-overline">ACTIVE VIRTUAL PATIENT</div><div className="patient-title">{patientName}<span className="patient-id">{patient?.patient_id || '—'}</span></div><div className="patient-meta"><span><Users size={13}/> {patient?.age || '—'} years</span><span className="meta-dot"/><span>{patient?.diagnosis || 'Type 2 diabetes'}</span><span className="meta-dot"/><span><CalendarClock size={13}/> {patient?.years_since_diagnosis ?? '—'} yrs since diagnosis</span></div></div></div><div className="patient-controls"><label htmlFor="patient-select">Switch twin</label><select id="patient-select" value={patientId} onChange={(e) => setPatientId(e.target.value)}>{patients.map((p) => <option value={p.patient_id} key={p.patient_id}>{p.patient_id} · Age {p.age}</option>)}</select><button className="button primary" onClick={() => { setActivePage('simulation'); if (cursor < 0) setCursor(0); }}><Zap size={16}/> Open simulator</button></div></section>

          {activePage === 'overview' && <>
            <section className="metric-grid">
              <MetricCard label="Latest glucose" value={currentGlucose ? currentGlucose.toFixed(1) : '—'} unit=" mg/dL" icon={Activity} accent="blue" note="Most recent available reading" />
              <MetricCard label="2-hour event probability" value={pct(currentProbability)} icon={Gauge} accent="purple" note="Threshold-crossing estimate" trend={{ direction: delta >= 0 ? 'up' : 'down', text: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} mg/dL trend` }} />
              <MetricCard label="Twin state" value={cursor >= 0 ? 'REPLAY' : 'SYNCED'} icon={CircleDot} accent="mint" note={cursor >= 0 ? `At ${fmtTime(currentFrame?.timestamp)}` : `As of ${fmtTime(prediction?.as_of)}`} />
              <MetricCard label="History window" value={`${cleanedTimeline.length}`} unit=" points" icon={Clock3} accent="amber" note="15-minute synthetic cadence" />
            </section>

            <section className="content-grid primary-grid">
              <article className="panel glucose-panel"><SectionHeading eyebrow="DYNAMIC SENSOR STREAM" title="Glucose trajectory" right={<div className="chart-legend"><span><i className="legend-line teal"/> CGM-like readings</span><span><i className="legend-dash"/> Illustrative threshold</span></div>} /><div className="chart-summary"><div><span className="summary-label">Current level</span><strong>{currentGlucose.toFixed(1)} <small>mg/dL</small></strong></div><div className="summary-right"><span className={`status-chip ${riskTone}`}><i/> {currentRisk} estimated risk</span><span className="summary-timestamp">{fmtTime(currentFrame?.timestamp || prediction?.as_of)}</span></div></div>
                <div className="main-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 12, right: 14, bottom: 2, left: -12 }}><defs><linearGradient id="glucoseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#21b6a8" stopOpacity={0.22}/><stop offset="100%" stopColor="#21b6a8" stopOpacity={0.015}/></linearGradient></defs><CartesianGrid stroke="#edf1f7" vertical={false}/><XAxis dataKey="timestamp" tickFormatter={fmtShortTime} minTickGap={35} tick={{ fill: '#8b96aa', fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis domain={['dataMin - 15', 'dataMax + 15']} tick={{ fill: '#8b96aa', fontSize: 11 }} axisLine={false} tickLine={false} width={52}/><Tooltip content={<ChartTooltip/>}/><ReferenceLine y={180} stroke="#e5a54d" strokeDasharray="5 5" label={{ value: '180 threshold', fill: '#b77b27', fontSize: 10, position: 'insideTopRight' }}/><Area type="monotone" dataKey="glucose" name="Glucose" stroke="#20ad9f" strokeWidth={2.4} fill="url(#glucoseFill)" dot={false} activeDot={{ r: 4, fill: '#20ad9f', stroke: '#fff', strokeWidth: 2 }}/>{cursor >= 0 && currentFrame && <ReferenceLine x={currentFrame.timestamp} stroke="#7568f6" strokeDasharray="3 3"/>}</ComposedChart></ResponsiveContainer></div><div className="chart-footer"><span><span className="footer-dot teal"/> Updated from timestamped readings</span><span>15-minute synthetic intervals <span className="footer-sep">·</span> Not a clinical CGM feed</span></div>
              </article>
              <article className="panel forecast-panel"><SectionHeading eyebrow="PREDICTIVE INTELLIGENCE" title="Event outlook" right={<span className="model-pill"><BrainCircuit size={13}/> Random Forest</span>}/><div className={`risk-orb ${riskTone}`}><div className="orb-ring ring-one"/><div className="orb-ring ring-two"/><div className="orb-center"><span>EST. PROBABILITY</span><strong>{pct(currentProbability)}</strong><small>within 120 minutes</small></div></div><div className={`risk-label ${riskTone}`}><span className="risk-label-dot"/>{currentRisk} probability band</div><p className="forecast-description">Estimated probability that a reading crosses the configured <strong>180 mg/dL</strong> threshold within the next two hours.</p><div className="forecast-scale"><div className="scale-labels"><span>Lower</span><span>Moderate</span><span>Higher</span></div><div className="scale-track"><i className="scale-mint"/><i className="scale-amber"/><i className="scale-rose"/><span className="scale-marker" style={{ left: `${Math.max(2, Math.min(98, currentProbability * 100))}%` }}/></div><div className="scale-foot"><span>0%</span><span>100%</span></div></div><div className="forecast-footnote"><ShieldCheck size={15}/><span>Experimental model output, not a diagnosis or a prediction of exact glucose values.</span></div></article>
            </section>

            <section className="content-grid secondary-grid"><article className="panel profile-panel"><SectionHeading eyebrow="STATIC + HISTORICAL DATA" title="Patient context" right={<span className="source-badge"><Database size={13}/> Synthetic EHR</span>}/><div className="profile-stats"><div><span>HbA1c</span><strong>{patient?.hba1c_percent ?? '—'}<small>%</small></strong><em>Historical lab</em></div><div><span>Baseline glucose</span><strong>{patient?.baseline_glucose_mg_dl ?? '—'}<small> mg/dL</small></strong><em>Synthetic profile</em></div><div><span>Diabetes history</span><strong>{patient?.years_since_diagnosis ?? '—'}<small> yrs</small></strong><em>Self-contained demo data</em></div></div><div className="profile-row"><div className="profile-avatar"><Users size={20}/></div><div className="profile-detail"><strong>{patient?.diagnosis || 'Type 2 diabetes'}</strong><span>Medication group: {patient?.medication_group || 'Not supplied'}</span></div><span className="record-status"><Check size={13}/> Profile loaded</span></div></article>
              <article className="panel features-panel"><SectionHeading eyebrow="MODEL CONTEXT" title="Signals influencing the model" right={<span className="source-badge">Global importance</span>}/>{featureData.length ? <div className="feature-bars">{featureData.slice(-5).reverse().map((f, i) => <div className="feature-row" key={f.name}><div className="feature-label"><span>{String(i + 1).padStart(2, '0')}</span>{f.name}</div><div className="feature-bar-track"><i style={{ width: `${Math.max(3, Math.min(100, f.value / Math.max(...featureData.map((x) => x.value), 1) * 100))}%` }}/></div><strong>{f.value.toFixed(1)}%</strong></div>)}</div> : <div className="empty-inline">Feature importance is not available from the current model.</div>}<div className="feature-disclaimer"><AlertTriangle size={14}/><span>Global importance describes model behavior overall; it does not establish causation for this patient.</span></div></article></section>
          </>}

          {activePage === 'simulation' && <section className="simulation-layout"><article className="panel simulation-main"><SectionHeading eyebrow="SEQUENTIAL SENSOR REPLAY" title="Watch the twin evolve" right={<span className="sim-status"><i className={playing ? 'pulse-dot' : ''}/>{playing ? 'STREAM PLAYING' : cursor >= 0 ? 'REPLAY PAUSED' : 'READY TO REPLAY'}</span>}/><p className="panel-intro">This demo replays timestamped synthetic readings in sequence. It is not connected to a physical wearable or live patient.</p><div className="sim-controls"><button className="button primary" onClick={playing ? () => setPlaying(false) : startReplay}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? 'Pause stream' : 'Start replay'}</button><button className="button secondary" onClick={() => { setPlaying(false); setCursor(-1); setReplayPrediction(null); }}><RefreshCw size={15}/> Reset</button><div className="sim-speed"><span>Playback</span><strong>15 min / tick</strong></div></div><div className="simulation-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 15, right: 12, bottom: 2, left: -10 }}><defs><linearGradient id="simFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#23b5a6" stopOpacity={0.22}/><stop offset="100%" stopColor="#23b5a6" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#edf1f7" vertical={false}/><XAxis dataKey="timestamp" tickFormatter={fmtShortTime} minTickGap={35} tick={{ fill: '#8b96aa', fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis tick={{ fill: '#8b96aa', fontSize: 11 }} axisLine={false} tickLine={false} width={48}/><Tooltip content={<ChartTooltip/>}/><ReferenceLine y={180} stroke="#e5a54d" strokeDasharray="5 5"/><Area dataKey="glucose" name="Glucose" stroke="#20ad9f" strokeWidth={2.2} fill="url(#simFill)" dot={false}/>{cursor >= 0 && <ReferenceLine x={cleanedTimeline[cursor]?.timestamp} stroke="#7568f6" strokeWidth={2} label={{ value: 'TWIN NOW', fill: '#7568f6', fontSize: 10, position: 'insideTopRight' }}/>}</ComposedChart></ResponsiveContainer></div><div className="replay-scrubber"><div className="scrubber-label"><span>Historical replay position</span><strong>{cursor < 0 ? 'Latest state' : `${cursor + 1} / ${cleanedTimeline.length}`}</strong></div><input type="range" min="0" max={Math.max(1, cleanedTimeline.length - 1)} value={cursor < 0 ? Math.max(0, cleanedTimeline.length - 1) : cursor} onChange={(e) => { setPlaying(false); setCursor(Number(e.target.value)); }} style={{ '--range-progress': `${(Math.max(0, cursor) / Math.max(1, cleanedTimeline.length - 1)) * 100}%` }}/><div className="scrubber-label muted"><span>{fmtTime(cleanedTimeline[0]?.timestamp)}</span><span>{fmtTime(cleanedTimeline.at(-1)?.timestamp)}</span></div></div></article><aside className="simulation-aside"><article className="panel sim-state"><SectionHeading eyebrow="VIRTUAL PATIENT STATE" title="At this moment"/><div className="sim-current"><span>Glucose reading</span><strong>{currentGlucose.toFixed(1)} <small>mg/dL</small></strong><span className={`status-chip ${riskTone}`}><i/>{currentRisk} estimated risk</span></div><div className="state-list"><div><span><Clock3 size={14}/> State timestamp</span><strong>{fmtTime(currentFrame?.timestamp || prediction?.as_of)}</strong></div><div><span><Activity size={14}/> Readings available</span><strong>{cursor < 0 ? cleanedTimeline.length : cursor + 1}</strong></div><div><span><Gauge size={14}/> Event probability</span><strong>{pct(currentProbability)}</strong></div></div><div className="state-note"><Sparkles size={15}/><span>Historical replay recomputes the model estimate using the available prefix of the synthetic stream.</span></div></article><article className="panel sim-next"><div className="next-icon"><BrainCircuit size={18}/></div><strong>What the twin is doing</strong><p>Combining historical profile features with sensor readings available up to the selected timestamp, then estimating the two-hour event label probability.</p><div className="pipeline-mini"><span>01 · EHR context</span><i/><span>02 · Sensor history</span><i/><span>03 · ML estimate</span></div></article></aside></section>}

          {activePage === 'evaluation' && <section className="evaluation-layout"><div className="eval-banner"><div className="eval-banner-icon"><FlaskConical size={22}/></div><div><strong>Evaluation on held-out synthetic patients</strong><p>These metrics describe the generated demo dataset only. They do not establish real-world or clinical performance.</p></div><span className="eval-model-tag">{metrics?.note ? 'SYNTHETIC ONLY' : 'MODEL METRICS'}</span></div><div className="eval-metrics-grid">{metricRows.map((m) => <article className="panel eval-metric" key={m.label}><span>{m.label}</span><strong>{m.value}</strong><small>{m.note}</small></article>)}</div><div className="content-grid eval-content"><article className="panel"><SectionHeading eyebrow="CLASS BALANCE" title="Rare-event context"/><div className="prevalence-number">{pct(metrics?.positive_rate || 0)}<span>positive labels in the test set</span></div><div className="prevalence-track"><i style={{ width: `${Math.max(0.5, (metrics?.positive_rate || 0) * 100)}%` }}/></div><p className="eval-copy">When positive events are rare, accuracy can look excellent even when the model misses many positive cases. Read precision and recall together and compare against a baseline.</p><div className="baseline-callout"><AlertTriangle size={17}/><div><strong>Baseline reminder</strong><p>An all-negative classifier's accuracy is approximately 1 − positive prevalence. The model must be evaluated beyond accuracy alone.</p></div></div></article><article className="panel"><SectionHeading eyebrow="INTERPRETATION" title="What to report honestly"/><div className="eval-checks"><div><span className="check-icon"><Check size={15}/></span><div><strong>Patient-level holdout</strong><p>Keep all readings from each test patient out of training.</p></div></div><div><span className="check-icon"><Check size={15}/></span><div><strong>Future-window labels</strong><p>Do not train on incomplete future windows or use future values as features.</p></div></div><div><span className="check-icon"><Check size={15}/></span><div><strong>Clinical validation pending</strong><p>Synthetic performance cannot be described as clinical accuracy.</p></div></div></div></article></div></section>}
        </>}
        <footer className="app-footer"><div><BrandMark/><span><strong>GlycoTwin AI</strong><small>Digital Twin proof of concept</small></span></div><span className="footer-disclaimer"><ShieldCheck size={14}/> Synthetic data · Experimental ML · Not a medical device</span><span>Prototype build 1.0</span></footer>
      </div>
    </main>
  </div>;
}
