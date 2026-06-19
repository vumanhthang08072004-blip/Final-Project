"""
Convert Keras LSTM model (.h5) to TensorFlow Lite (.tflite)
Bypasses TensorFlow 2.16 + Keras 3 conversion bugs by:
1. Loading the model in Keras 3 to extract raw weights as numpy arrays.
2. Rebuilding the architecture in Keras 2, setting weights, and converting to TFLite.
"""
import os
import sys
import subprocess
import joblib

# Set encoding
sys.stdout.reconfigure(encoding='utf-8')

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
H5_PATH = os.path.join(MODEL_DIR, "modelv3.h5")
TFLITE_PATH = os.path.join(MODEL_DIR, "modelv3.tflite")
WEIGHTS_PKL_PATH = os.path.join(MODEL_DIR, "temp_weights.pkl")

def run_keras3_extract():
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    import tensorflow as tf
    
    print(f"[*] (Keras 3) Loading model: {H5_PATH}")
    model = tf.keras.models.load_model(H5_PATH)
    
    print("[*] (Keras 3) Extracting raw weights...")
    # Extract weights from each layer
    weights = [layer.get_weights() for layer in model.layers]
    
    print(f"[*] (Keras 3) Saving raw weights to: {WEIGHTS_PKL_PATH}")
    joblib.dump(weights, WEIGHTS_PKL_PATH)
    print("[OK] Weights saved successfully.")

def run_keras2_convert():
    # Enable legacy Keras
    os.environ["TF_USE_LEGACY_KERAS"] = "1"
    os.environ["WRAPT_DISABLE_EXTENSIONS"] = "true"
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    
    import tensorflow as tf
    import joblib
    
    print(f"[*] (Keras 2) Building identical LSTM model architecture...")
    model = tf.keras.Sequential([
        tf.keras.layers.LSTM(128, return_sequences=True, batch_input_shape=(1, 20, 4)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.LSTM(64, return_sequences=False),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(1)
    ])
    
    # We must build/call the model once to initialize weights shapes before setting them
    # Call with dummy data of input shape (1, 20, 4)
    import numpy as np
    dummy_input = np.zeros((1, 20, 4), dtype=np.float32)
    model(dummy_input)
    
    print(f"[*] (Keras 2) Loading raw weights from: {WEIGHTS_PKL_PATH}")
    weights = joblib.load(WEIGHTS_PKL_PATH)
    
    print("[*] (Keras 2) Setting weights layer-by-layer...")
    for layer, layer_weights in zip(model.layers, weights):
        if layer_weights:
            layer.set_weights(layer_weights)
            print(f"  - Loaded weights for layer: {layer.name}")
            
    print("[*] (Keras 2) Converting to TFLite...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()
    
    with open(TFLITE_PATH, 'wb') as f:
        f.write(tflite_model)
    
    size_kb = os.path.getsize(TFLITE_PATH) / 1024
    print(f"[OK] Saved TFLite model to: {TFLITE_PATH} ({size_kb:.1f} KB)")
    print("[DONE] Conversion complete!")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--keras2":
        run_keras2_convert()
    else:
        try:
            # 1. Extract weights under Keras 3
            run_keras3_extract()
            
            # 2. Run the subprocess with legacy Keras enabled
            print("[*] Spawning Keras 2 subprocess for TFLite conversion...")
            env = os.environ.copy()
            env["TF_USE_LEGACY_KERAS"] = "1"
            env["WRAPT_DISABLE_EXTENSIONS"] = "true"
            
            # Call this script again with --keras2 flag using the current python executable
            result = subprocess.run(
                [sys.executable, __file__, "--keras2"],
                env=env,
                capture_output=True,
                text=True,
                encoding='utf-8'
            )
            
            # Print subprocess output
            print(result.stdout)
            if result.returncode != 0:
                print(f"[ERROR] Subprocess failed with code {result.returncode}")
                print(result.stderr)
                sys.exit(result.returncode)
                
        finally:
            # Clean up temp weights file
            if os.path.exists(WEIGHTS_PKL_PATH):
                print("[*] Cleaning up temporary weights file...")
                os.remove(WEIGHTS_PKL_PATH)
