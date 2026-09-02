# EngineTwin

### Explainable Piston Engine Digital-Twin-Style Monitoring Platform

> **EngineTwin is a prototype demonstrating an explainable digital-twin-style operational
> state model using synthetic/sample telemetry.** The Simulated Engine Health Index is a
> relative, illustrative indicator and **is not** a certified measurement of aircraft or
> engine safety. Production deployment would require validated telemetry, manufacturer
> specifications, calibrated parameters, historical failure data, domain-expert review, and
> engineering verification.

Problem statement addressed: *"Aero Engine Digital Twin (Mini): Feed a sample sensor-log CSV
for a piston engine into a simplified state model and visualize the engine's simulated
health trend over time."*

---

## What it does

CSV telemetry → validation → operating-condition context → subsystem scoring → simulated
health index → trend analysis → anomaly detection → explainable alerts → dashboard → 3D
digital-twin visualization → scenario ("what-if") analysis.

Five questions the dashboard answers immediately:
1. What is the current simulated engine condition?
2. Is the condition stable or deteriorating?
3. What is contributing most to deterioration?
4. Are the observations trustworthy, or are there sensor/data problems?
5. How would the simulated state change under a user-defined scenario?

---

## Architecture

```
                         CORE ENGINE (backend/)
CSV --> validation --> preprocessing --> health_model --> state_model
                                      --> trend --> anomaly --> simulation --> FastAPI

                       VISUALIZATION LAYER (frontend/)
FastAPI --> React dashboard
              +-- Overview        (summary, health trend, alerts, contributors)
              +-- Telemetry       (raw table + per-sensor charts)
              +-- Digital Twin    (3D engine + time-scrub + live readings)
              +-- Analysis        (subsystem decomposition + explainability + anomalies)
              +-- Scenario        (what-if sliders + baseline/scenario comparison)
```

**Hard rule preserved:** the 3D view (`Engine3D.tsx`) is wrapped in its own error boundary
and consumes only `rpm` + `state`. If WebGL/Three.js fails, `Engine3DErrorBoundary` renders
a plain-text fallback and the rest of the app (simulation, charts, alerts, scenario
analysis) keeps working untouched.

See `backend/config.py` for every weight and threshold used by the model — all centralized,
validated at startup, and exposed via `GET /api/model-config`.

---

## Repository layout

```
enginetwin/
├── backend/
│   ├── main.py            FastAPI app (4 endpoints)
│   ├── config.py          Centralized, validated model configuration
│   ├── validation.py      Structural + per-cell data validation
│   ├── preprocessing.py   RPM -> operating regime -> expected sensor envelope
│   ├── health_model.py    Subsystem scoring + Simulated Engine Health Index
│   ├── state_model.py     State machine with hysteresis/persistence
│   ├── trend.py           Rolling mean/slope -> trend direction
│   ├── anomaly.py         Explainable anomaly detection (no ML)
│   ├── simulation.py      Orchestrates the full pipeline + what-if engine
│   ├── models.py          Pydantic response/request schemas
│   ├── generate_sample_data.py
│   ├── sample_data/       healthy_engine.csv, degrading_engine.csv, sensor_fault.csv
│   ├── tests/             pytest suite for validation/health/trend/state/quality/scenario
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx                 Shell, navigation, upload, error handling
    │   ├── types/engine.ts         TypeScript contracts matching the API
    │   ├── services/api.ts         Fetch wrapper for /api/*
    │   └── components/
    │       ├── Overview.tsx, Telemetry.tsx, DigitalTwin.tsx,
    │       │   Analysis.tsx, ScenarioAnalysis.tsx      (page-level views)
    │       ├── HealthSummary.tsx, HealthTrend.tsx, SensorCharts.tsx,
    │       │   Alerts.tsx, Contributions.tsx, StateTimeline.tsx,
    │       │   DataQuality.tsx, StatusChip.tsx          (building blocks)
    │       └── Engine3D.tsx, Engine3DErrorBoundary.tsx  (3D digital twin)
    ├── public/sample_data/  (copies of the 3 sample CSVs for in-app quick-load)
    └── package.json / vite.config.ts / tsconfig.json
```

---

## Running it

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 generate_sample_data.py     # (re)generate the 3 sample CSVs
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173, proxies /api -> localhost:8000
```

### Tests
```bash
cd backend
pytest tests/ -v
```

> Note: this repository was built and syntax-verified in a sandboxed environment without
> outbound network access, so `pip install`/`npm install` could not be executed here. All
> backend logic (validation, health model, trend, state machine, anomaly detection, data
> quality, scenario analysis — 14 checks) was verified directly against `pandas`/`numpy`
> (already present) with a manual test runner equivalent to the `pytest` suite included.
> All frontend files were verified for syntactic validity with `esbuild`. Both `pip install
> -r requirements.txt` and `npm install` followed by `npm run dev` / `uvicorn main:app` are
> expected to run cleanly in a networked environment.

---

## API

```
GET  /api/health          service liveness + model mode
GET  /api/model-config     full transparent model configuration
POST /api/simulate         multipart CSV upload -> full SimulationResponse (+ session_id)
POST /api/what-if          ?session_id=... body: sensor deltas -> baseline/scenario comparison
```

---

## Demo script (matches `demo` walkthrough used to build this)

1. Open EngineTwin, upload `healthy_engine.csv` (or click the sidebar sample button) →
   **Healthy**, stable trend, zero alerts.
2. Upload `degrading_engine.csv` → health index declines; state timeline shows
   `HEALTHY → NORMAL → DEGRADING → WARNING`, produced entirely by the model — no dataset
   is special-cased by filename.
3. Open **Analysis** → primary contributor: Mechanical (vibration), secondary: Thermal
   (temperature).
4. Open **Digital Twin** → scrub the time slider; RPM drives piston speed via a
   crank-slider kinematic model, and the state indicator light on the valve cover follows
   the confirmed engine state.
5. Upload `sensor_fault.csv` → **Data Quality Warning**, without the engine being marked
   critical — the system explicitly separates a suspicious/missing sensor reading from an
   actual engine-condition degradation.
6. Open **Scenario Analysis**, increase vibration → baseline `NORMAL` vs. scenario
   `WARNING`, with health delta and primary affected subsystem shown.

---

## Judge questions

**Why isn't this machine learning?**
The problem statement calls for a simplified state model, and there is no validated
labeled engine-failure dataset available. A deterministic, weighted model is more
explainable and appropriate for demonstrating the requested concept.

**Where did your thresholds come from?**
They are configurable prototype assumptions, centralized in `backend/config.py` and
exposed via `/api/model-config`. Production values would be calibrated using manufacturer
specifications and validated telemetry.

**Can it predict engine failure?**
No. This prototype detects simulated degradation and abnormal telemetry patterns.
Predictive failure modeling would require validated historical failure data and
engineering verification.

**Is this a real digital twin?**
It's a lightweight digital-twin-style prototype that maintains a virtual operational state
from telemetry. A production digital twin would incorporate richer physical and
component-level models.

**Why CSV instead of real-time sensors?**
CSV is the telemetry source specified for the prototype. The same validation → health →
state pipeline can consume streaming telemetry with no architectural change.

---

## Limitations (explicit, by design)

- No real thermodynamic/physics simulation — `preprocessing.py`'s regime envelopes are
  prototype assumptions, not manufacturer specs.
- No ML, no trained failure classifier, and no claimed prediction accuracy.
- Anomaly detection uses simple explainable statistics (range check, rolling z-score with
  2-row persistence, rate-of-change) — not a validated fault-detection system.
- 3D animation uses a simplified crank-slider kinematic formula for visual realism only —
  it is not a mechanical/structural simulation.
- No persistence layer/database — sessions for `/api/what-if` are held in memory and are
  lost on backend restart, by design (CSV in, results out).

## Future production architecture

```
Real sensors -> IoT gateway -> telemetry streaming -> data validation
  -> operating-context model -> calibrated digital twin
  -> validated anomaly detection -> fleet analytics -> maintenance integration
```
Future scope: real-time MQTT/streaming ingestion, manufacturer calibration, physics-informed
models, validated ML, fleet monitoring, Remaining Useful Life (RUL) estimation, edge
processing, maintenance-system integration.
