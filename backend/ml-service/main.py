"""
FastAPI ML Service for Soil Moisture Prediction
Uses a trained CNN model to predict soil moisture based on sensor data.

Input: 10 timesteps × 4 features (temp, humd, lum, pres)
Output: 1 predicted soil moisture value
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
MODEL_PATH = os.path.join(MODEL_DIR, "soil_moisture_cnn_model.keras")
SCALER_X_PATH = os.path.join(MODEL_DIR, "scaler_X.pkl")
SCALER_Y_PATH = os.path.join(MODEL_DIR, "scaler_y.pkl")

TIME_STEPS = 10
NUM_FEATURES = 4  # temp, humd, lum, pres

# ─── Global model references ──────────────────────────────────────────────────
model = None
scaler_X = None
scaler_y = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model and scalers on startup."""
    global model, scaler_X, scaler_y

    # Lazy import tensorflow to speed up startup logging
    import tensorflow as tf

    print("[*] Loading CNN model and scalers...")

    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"Model file not found: {MODEL_PATH}")
    if not os.path.exists(SCALER_X_PATH):
        raise RuntimeError(f"Scaler X file not found: {SCALER_X_PATH}")
    if not os.path.exists(SCALER_Y_PATH):
        raise RuntimeError(f"Scaler Y file not found: {SCALER_Y_PATH}")

    model = tf.keras.models.load_model(MODEL_PATH)
    scaler_X = joblib.load(SCALER_X_PATH)
    scaler_y = joblib.load(SCALER_Y_PATH)

    print(f"[OK] Model loaded successfully. Input shape: {model.input_shape}")
    print(f"[OK] Scaler X features: {scaler_X.n_features_in_}")
    print(f"[OK] Scaler Y features: {scaler_y.n_features_in_}")

    yield  # App is running

    # Cleanup
    print("[STOP] Shutting down ML service...")


app = FastAPI(
    title="Soil Moisture Prediction API",
    description="CNN-based soil moisture prediction for peach tree monitoring",
    version="1.0.0",
    lifespan=lifespan,
)


# ─── Request / Response Models ─────────────────────────────────────────────────
class TimestepData(BaseModel):
    """A single timestep with 4 sensor features."""
    temp: float       # Air temperature (°C)
    humd: float       # Air humidity (%)
    lum: float        # Light intensity (lux)
    pres: float       # Atmospheric pressure (hPa)


class PredictionRequest(BaseModel):
    """Request body for prediction: 10 timesteps of sensor data."""
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
        "model_loaded": model is not None,
        "scaler_loaded": scaler_X is not None and scaler_y is not None,
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Predict soil moisture for the next timestep.

    Expects exactly 10 timesteps, each with 4 features:
    [temp, humd, lum, pres]
    """
    if model is None or scaler_X is None or scaler_y is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    if len(request.timesteps) != TIME_STEPS:
        raise HTTPException(
            status_code=400,
            detail=f"Expected {TIME_STEPS} timesteps, got {len(request.timesteps)}",
        )

    try:
        # Convert to numpy array: shape (10, 4)
        raw_data = []
        for ts in request.timesteps:
            # The model was trained on pressure in Pa (e.g., 92352 - 94042), 
            # and may have seen different lux ranges. We convert hPa to Pa if needed.
            p = ts.pres * 100.0 if ts.pres < 2000 else ts.pres
            # Clamp lux if it's negative (sensor error)
            l = max(0.0, ts.lum)
            raw_data.append([ts.temp, ts.humd, l, p])
            
        raw_data = np.array(raw_data)

        # Clip raw_data to the min/max bounds of the training data to prevent
        # the CNN from generating massive outliers due to out-of-distribution inputs
        # (e.g. pressure at sea level is 101300 but training data was max 94042)
        raw_data = np.clip(raw_data, scaler_X.data_min_, scaler_X.data_max_)

        # Scale input features using fitted scaler_X
        # scaler_X expects shape (n_samples, 4), we have (10, 4) which is correct
        scaled_data = scaler_X.transform(raw_data)

        # Reshape for CNN: (1, TIME_STEPS, NUM_FEATURES) = (1, 10, 4)
        model_input = scaled_data.reshape(1, TIME_STEPS, NUM_FEATURES)

        # Run prediction
        scaled_prediction = model.predict(model_input, verbose=0)

        # Inverse scale the output to get actual soil moisture value
        predicted_value = scaler_y.inverse_transform(scaled_prediction)

        # Extract the single predicted value (this seems to be raw ADC based on scaler_y data_max = 7937)
        result = float(predicted_value[0][0])
        print(f"[*] Raw data: {raw_data}")
        print(f"[*] Scaled data: {scaled_data}")
        print(f"[*] Raw predicted value: {result}")
        
        # If the result is a raw ADC value (e.g., > 100), map it to a percentage 0-100%
        # Assuming scaler_y.data_max_[0] represents the maximum possible value.
        max_y = float(scaler_y.data_max_[0]) if scaler_y.data_max_[0] > 100 else 100.0
        if result > 100.0:
            result = (result / max_y) * 100.0
        elif max_y > 100 and result <= 100.0:
            # If the max is e.g. 7937 but result is 50, it means the raw ADC predicted 50. 
            # 50 / 7937 * 100 is almost 0!
            result = (result / max_y) * 100.0

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
