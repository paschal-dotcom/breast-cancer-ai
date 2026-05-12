"""
================================================================
predict.py — Model Inference + Grad-CAM Generation
================================================================
"""
import numpy as np
import cv2
import os
import joblib
import tensorflow as tf
from tensorflow.keras.models import load_model
import warnings
warnings.filterwarnings('ignore')

# ── Paths ─────────────────────────────────────────────────────
MODEL_DIR      = "models"
EXTRACTOR_PATH = os.path.join(MODEL_DIR, "efficientnetb3_extractor.h5")
FULL_MODEL_PATH= os.path.join(MODEL_DIR, "efficientnetb3_full.h5")
SVM_PATH       = os.path.join(MODEL_DIR, "svm_model.pkl")
SCALER_PATH    = os.path.join(MODEL_DIR, "scaler.pkl")

IMG_SIZE = 224

# ── Load Models Once At Startup ───────────────────────────────
print("Loading models...")
try:
    feature_extractor = load_model(EXTRACTOR_PATH)
    full_model        = load_model(FULL_MODEL_PATH)
    svm_model         = joblib.load(SVM_PATH)
    scaler            = joblib.load(SCALER_PATH)
    print("✅ All models loaded successfully")
    MODELS_LOADED = True
except Exception as e:
    print(f"⚠ Model loading failed: {e}")
    print("  Place your trained model files in the 'models/' folder")
    MODELS_LOADED = False

# ── Risk Labels & Recommendations ────────────────────────────
RISK_LABELS = {0: "Normal", 1: "Suspicious", 2: "Malignant"}

RECOMMENDATIONS = {
    "Normal": (
        "No abnormalities detected in this thermal scan. "
        "Continue regular annual screenings. Maintain a healthy lifestyle "
        "and consult your doctor if you notice any physical changes."
    ),
    "Suspicious": (
        "Thermal patterns suggest possible early-stage abnormality. "
        "We recommend a follow-up clinical examination within 2-4 weeks. "
        "Additional imaging (ultrasound or mammography) is advised."
    ),
    "Malignant": (
        "Thermal patterns are strongly associated with malignant tissue. "
        "URGENT: Please consult an oncologist or breast specialist immediately. "
        "Do not delay — early treatment significantly improves outcomes."
    )
}

RISK_COLORS = {
    "Normal":     "#02C39A",   # green
    "Suspicious": "#F4A62A",   # amber
    "Malignant":  "#D64F6E"    # red
}

# ── CLAHE Preprocessing ───────────────────────────────────────
def apply_clahe(image):
    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_clahe = clahe.apply(l)
    lab_clahe = cv2.merge((l_clahe, a, b))
    return cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2RGB)

def preprocess_image(image_path):
    """Load, CLAHE-enhance, resize, and normalise an image."""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = apply_clahe(img)
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    img_normalised = img.astype(np.float32) / 255.0
    return img_normalised, img   # return both normalised and original

# ── Main Prediction Function ──────────────────────────────────
def predict_image(image_path: str) -> dict:
    """
    Run full hybrid CNN-SVM prediction on a thermal image.
    Returns risk level, confidence, probabilities, and recommendation.
    """
    if not MODELS_LOADED:
        # Demo mode when models are not yet trained
        return _demo_prediction()

    # Preprocess
    img_normalised, _ = preprocess_image(image_path)
    img_batch = np.expand_dims(img_normalised, axis=0)   # (1, 224, 224, 3)

    # Extract features with EfficientNetB3
    features = feature_extractor.predict(img_batch, verbose=0)   # (1, 1280)

    # Scale features
    features_scaled = scaler.transform(features)

    # SVM prediction
    pred_class = svm_model.predict(features_scaled)[0]
    pred_proba = svm_model.predict_proba(features_scaled)[0]

    # Handle 2-class model (DMR-IR binary: 0=normal, 1=abnormal)
    if len(pred_proba) == 2:
        normal_prob     = float(pred_proba[0])
        abnormal_prob   = float(pred_proba[1])
        # Split abnormal into suspicious/malignant based on confidence
        if abnormal_prob > 0.85:
            risk_level       = "Malignant"
            suspicious_prob  = round(abnormal_prob * 0.3, 4)
            malignant_prob   = round(abnormal_prob * 0.7, 4)
        elif abnormal_prob > 0.5:
            risk_level       = "Suspicious"
            suspicious_prob  = round(abnormal_prob * 0.7, 4)
            malignant_prob   = round(abnormal_prob * 0.3, 4)
        else:
            risk_level       = "Normal"
            suspicious_prob  = round(abnormal_prob * 0.5, 4)
            malignant_prob   = round(abnormal_prob * 0.5, 4)
        confidence = round(max(normal_prob, abnormal_prob) * 100, 2)
        probabilities = {
            "Normal":     round(normal_prob * 100, 2),
            "Suspicious": round(suspicious_prob * 100, 2),
            "Malignant":  round(malignant_prob * 100, 2)
        }
    else:
        # 3-class model
        risk_level    = RISK_LABELS[pred_class]
        confidence    = round(float(max(pred_proba)) * 100, 2)
        probabilities = {
            "Normal":     round(float(pred_proba[0]) * 100, 2),
            "Suspicious": round(float(pred_proba[1]) * 100, 2),
            "Malignant":  round(float(pred_proba[2]) * 100, 2)
        }

    return {
        "risk_level":     risk_level,
        "confidence":     confidence,
        "probabilities":  probabilities,
        "recommendation": RECOMMENDATIONS[risk_level],
        "risk_color":     RISK_COLORS[risk_level]
    }

# ── Grad-CAM Generation ───────────────────────────────────────
def generate_gradcam(image_path: str, file_id: str) -> str:
    """
    Generate Grad-CAM heatmap overlay for explainability.
    Returns path to saved heatmap image.
    """
    output_path = os.path.join("uploads", f"{file_id}_gradcam.png")

    if not MODELS_LOADED:
        # Save a copy of original if no model
        img = cv2.imread(image_path)
        cv2.imwrite(output_path, img)
        return output_path

    try:
        img_normalised, img_original = preprocess_image(image_path)
        img_batch = np.expand_dims(img_normalised, axis=0)

        # Get last conv layer name
        last_conv_layer = None
        for layer in reversed(full_model.layers):
            if hasattr(layer, 'filters'):
                last_conv_layer = layer.name
                break

        if last_conv_layer is None:
            # Fallback — just save original
            cv2.imwrite(output_path, cv2.cvtColor(img_original, cv2.COLOR_RGB2BGR))
            return output_path

        # Build Grad-CAM model
        grad_model = tf.keras.models.Model(
            inputs=full_model.input,
            outputs=[full_model.get_layer(last_conv_layer).output,
                     full_model.output]
        )

        with tf.GradientTape() as tape:
            inputs = tf.cast(img_batch, tf.float32)
            conv_outputs, predictions = grad_model(inputs)
            pred_index = tf.argmax(predictions[0])
            class_channel = predictions[:, pred_index]

        grads      = tape.gradient(class_channel, conv_outputs)
        pooled     = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_out   = conv_outputs[0]
        heatmap    = conv_out @ pooled[..., tf.newaxis]
        heatmap    = tf.squeeze(heatmap)
        heatmap    = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
        heatmap    = heatmap.numpy()

        # Resize heatmap to image size
        heatmap_resized = cv2.resize(heatmap, (IMG_SIZE, IMG_SIZE))
        heatmap_uint8   = np.uint8(255 * heatmap_resized)
        heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

        # Overlay on original image
        original_bgr = cv2.cvtColor(img_original, cv2.COLOR_RGB2BGR)
        superimposed  = cv2.addWeighted(original_bgr, 0.6, heatmap_colored, 0.4, 0)

        cv2.imwrite(output_path, superimposed)
        return output_path

    except Exception as e:
        print(f"Grad-CAM generation error: {e}")
        img = cv2.imread(image_path)
        cv2.imwrite(output_path, img)
        return output_path

# ── Demo Mode (before model is trained) ──────────────────────
def _demo_prediction():
    """Returns a demo result when models are not loaded yet."""
    import random
    risk_levels = ["Normal", "Suspicious", "Malignant"]
    risk_level  = random.choice(risk_levels)
    confidence  = round(random.uniform(75, 98), 2)
    return {
        "risk_level":     risk_level,
        "confidence":     confidence,
        "probabilities":  {"Normal": 60.0, "Suspicious": 25.0, "Malignant": 15.0},
        "recommendation": RECOMMENDATIONS[risk_level],
        "risk_color":     RISK_COLORS[risk_level],
        "demo_mode":      True
    }