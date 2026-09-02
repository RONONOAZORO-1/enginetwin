"""
Generates the three demonstration CSVs. Behavior (healthy/degrading/faulty)
emerges purely from the synthetic sensor values themselves - the backend
model never looks at filenames.
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

RNG = np.random.default_rng(42)
N = 120
START = datetime(2026, 8, 1, 6, 0, 0)


def timestamps(n=N):
    return [START + timedelta(seconds=30 * i) for i in range(n)]


def healthy_engine():
    t = np.arange(N)
    rpm = 2400 + 80 * np.sin(t / 15) + RNG.normal(0, 20, N)
    temperature = 92 + 3 * np.sin(t / 20) + RNG.normal(0, 1.2, N)
    oil_pressure = 42 + RNG.normal(0, 1.0, N)
    vibration = 1.0 + 0.1 * np.sin(t / 10) + RNG.normal(0, 0.08, N)
    fuel_rate = 5.5 + 0.4 * np.sin(t / 18) + RNG.normal(0, 0.15, N)
    return _frame(rpm, temperature, oil_pressure, vibration, fuel_rate)


def degrading_engine():
    t = np.arange(N)
    rpm = 2500 + 60 * np.sin(t / 15) + RNG.normal(0, 20, N)
    # Progressive controlled trends - the model must derive NORMAL -> DEGRADING -> WARNING itself.
    vibration_trend = np.linspace(1.0, 4.6, N)
    temperature_trend = np.linspace(90, 138, N)
    oil_pressure_trend = np.linspace(43, 22, N)

    vibration = vibration_trend + RNG.normal(0, 0.1, N)
    temperature = temperature_trend + RNG.normal(0, 1.3, N)
    oil_pressure = oil_pressure_trend + RNG.normal(0, 1.0, N)
    fuel_rate = 5.6 + np.linspace(0, 1.4, N) + RNG.normal(0, 0.2, N)
    return _frame(rpm, temperature, oil_pressure, vibration, fuel_rate)


def sensor_fault_engine():
    t = np.arange(N)
    rpm = 2400 + 70 * np.sin(t / 15) + RNG.normal(0, 20, N)
    temperature = 92 + 3 * np.sin(t / 20) + RNG.normal(0, 1.2, N)
    oil_pressure = 42 + RNG.normal(0, 1.0, N)
    vibration = 1.0 + 0.1 * np.sin(t / 10) + RNG.normal(0, 0.08, N)
    fuel_rate = 5.5 + 0.4 * np.sin(t / 18) + RNG.normal(0, 0.15, N)

    df = _frame(rpm, temperature, oil_pressure, vibration, fuel_rate)

    # Introduce isolated data-quality problems on an otherwise healthy engine.
    df.loc[15, "temperature"] = 9999  # impossible spike -> INVALID
    df.loc[16:18, "oil_pressure"] = np.nan  # missing sensor stretch
    df.loc[40, "vibration"] = df.loc[39, "vibration"] + 15  # sudden implausible jump -> SUSPECT
    df.loc[70, "timestamp"] = df.loc[69, "timestamp"]  # duplicate timestamp
    df.loc[90, "rpm"] = -500  # physically meaningless negative RPM -> INVALID
    return df


def _frame(rpm, temperature, oil_pressure, vibration, fuel_rate):
    return pd.DataFrame({
        "timestamp": [ts.isoformat() for ts in timestamps()],
        "rpm": np.round(rpm, 1),
        "temperature": np.round(temperature, 2),
        "oil_pressure": np.round(oil_pressure, 2),
        "vibration": np.round(vibration, 3),
        "fuel_rate": np.round(fuel_rate, 2),
    })


if __name__ == "__main__":
    import os
    out_dir = os.path.join(os.path.dirname(__file__), "sample_data")
    os.makedirs(out_dir, exist_ok=True)
    healthy_engine().to_csv(os.path.join(out_dir, "healthy_engine.csv"), index=False)
    degrading_engine().to_csv(os.path.join(out_dir, "degrading_engine.csv"), index=False)
    sensor_fault_engine().to_csv(os.path.join(out_dir, "sensor_fault.csv"), index=False)
    print("Generated sample_data/healthy_engine.csv, degrading_engine.csv, sensor_fault.csv")
