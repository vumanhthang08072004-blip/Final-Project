"""
FastAPI ML Service for Soil Moisture Prediction
Uses a trained LSTM model to predict soil moisture based on sensor data.

Input: 20 timesteps × 4 features (temp, humd, soil, lum)
Output: 1 predicted soil moisture value (%)
"""

import os
import numpy as np
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from contextlib import asynccontextmanager

# ─── Config ────────────────────────────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "modelv3.h5")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler_dao_v3.pkl")

TIME_STEPS = 20
NUM_FEATURES = 4  # temp, humd, soil, lum

# Index của cột soil_moisture trong scaler (dùng để inverse_transform output)
SOIL_MOISTURE_INDEX = 2

# ─── Global model references ──────────────────────────────────────────────────
model = None
scaler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model and scaler on startup."""
    global model, scaler

    # Lazy import tensorflow to speed up startup logging
    import tensorflow as tf

    print("[*] Loading LSTM model and scaler...")

    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"Model file not found: {MODEL_PATH}")
    if not os.path.exists(SCALER_PATH):
        raise RuntimeError(f"Scaler file not found: {SCALER_PATH}")

    model = tf.keras.models.load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    print(f"[OK] LSTM Model loaded successfully. Input shape: {model.input_shape}")
    print(f"[OK] Scaler features: {scaler.n_features_in_}")
    print(f"[OK] Scaler data_min: {scaler.data_min_}")
    print(f"[OK] Scaler data_max: {scaler.data_max_}")

    yield  # App is running

    # Cleanup
    print("[STOP] Shutting down ML service...")


app = FastAPI(
    title="Soil Moisture Prediction API",
    description="LSTM-based soil moisture prediction for peach tree monitoring",
    version="2.0.0",
    lifespan=lifespan,
)


# ─── Request / Response Models ─────────────────────────────────────────────────
class TimestepData(BaseModel):
    """A single timestep with 4 sensor features."""
    temp: float       # Air temperature (°C)
    humd: float       # Air humidity (%)
    soil: float       # Soil moisture (%)
    lum: float        # Light intensity (lux)


class PredictionRequest(BaseModel):
    """Request body for prediction: 20 timesteps of sensor data."""
    timesteps: List[TimestepData]


class PredictionResponse(BaseModel):
    """Response with the predicted soil moisture value."""
    predicted_soil_moisture: float
    input_timesteps: int
    status: str = "success"


# ─── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """Check if the service is running and model is loaded."""
    return {
        "status": "healthy",
        "model_type": "LSTM",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Predict soil moisture for the next timestep.

    Expects exactly 20 timesteps, each with 4 features:
    [temp, humd, soil, lum]
    """
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    if len(request.timesteps) != TIME_STEPS:
        raise HTTPException(
            status_code=400,
            detail=f"Expected {TIME_STEPS} timesteps, got {len(request.timesteps)}",
        )

    try:
        # Convert to numpy array: shape (20, 4)
        # Thứ tự cột phải khớp với lúc training: [temp, humd, soil, lum]
        raw_data = []
        for ts in request.timesteps:
            raw_data.append([ts.temp, ts.humd, ts.soil, max(0.0, ts.lum)])
            
        raw_data = np.array(raw_data)

        # Clip raw_data to the min/max bounds of the training data
        raw_data = np.clip(raw_data, scaler.data_min_, scaler.data_max_)

        # Scale input features using fitted scaler (MinMaxScaler)
        scaled_data = scaler.transform(raw_data)

        # Reshape for LSTM: (1, TIME_STEPS, NUM_FEATURES) = (1, 20, 4)
        model_input = scaled_data.reshape(1, TIME_STEPS, NUM_FEATURES)

        # Run prediction — output is scaled (0–1)
        scaled_prediction = model.predict(model_input, verbose=0)
        scaled_value = float(scaled_prediction[0][0])

        print(f"[*] Scaled prediction value: {scaled_value}")

        # Inverse transform: tạo mảng giả 4 cột, đặt giá trị dự đoán vào cột soil_moisture (index 2)
        dummy = np.zeros((1, NUM_FEATURES))
        dummy[0, SOIL_MOISTURE_INDEX] = scaled_value
        inversed = scaler.inverse_transform(dummy)
        result = float(inversed[0, SOIL_MOISTURE_INDEX])

        print(f"[*] Inverse transformed result: {result}%")

        # Clamp between 0 and 100 (soil moisture percentage)
        result = max(0.0, min(100.0, result))

        return PredictionResponse(
            predicted_soil_moisture=round(result, 2),
            input_timesteps=len(request.timesteps),
            status="success",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
