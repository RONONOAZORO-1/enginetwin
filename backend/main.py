from __future__ import annotations
from typing import Optional
import uuid

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import MODEL_CONFIG
from validation import ValidationError
from simulation import load_csv, run_simulation, apply_what_if
from models import WhatIfRequest, WhatIfResponse

app = FastAPI(title="EngineTwin API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory session store keyed by session_id (no DB required per spec).
_SESSIONS: dict[str, dict] = {}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "EngineTwin API", "mode": MODEL_CONFIG["mode"]}


@app.get("/api/model-config")
def get_model_config():
    return MODEL_CONFIG


class SimulateResponseEnvelope(BaseModel):
    session_id: str


@app.post("/api/simulate")
async def simulate(file: UploadFile = File(...), engine_id: str = Query(default="PX-001")):
    content = await file.read()
    try:
        df = load_csv(content)
        result = run_simulation(df, engine_id=engine_id)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {e}")

    session_id = str(uuid.uuid4())
    _SESSIONS[session_id] = result

    public = {k: v for k, v in result.items() if k != "_internal"}
    public["session_id"] = session_id
    return public


@app.post("/api/what-if", response_model=WhatIfResponse)
def what_if(payload: WhatIfRequest, session_id: str = Query(...)):
    sim = _SESSIONS.get(session_id)
    if sim is None:
        raise HTTPException(status_code=404, detail="Unknown session_id. Run /api/simulate first.")
    try:
        result = apply_what_if(
            sim,
            payload.row_index,
            {
                "rpm_delta": payload.rpm_delta,
                "temperature_delta": payload.temperature_delta,
                "oil_pressure_delta": payload.oil_pressure_delta,
                "vibration_delta": payload.vibration_delta,
                "fuel_rate_delta": payload.fuel_rate_delta,
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
