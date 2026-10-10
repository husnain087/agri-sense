from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np

from maize_gradcam import DEFAULT_MODEL_PATH, EXPECTED_MAIZE_CLASSES, gradcam_heatmap, load_model_from_checkpoint

app = FastAPI(title="AgriSense AI Maize Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.getenv("MAIZE_MODEL_PATH", DEFAULT_MODEL_PATH)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_MODEL = None


@app.get("/health")
def health() -> dict[str, Any]:
    try:
        model, class_names = load_model_from_checkpoint(MODEL_PATH)
        loaded = model is not None and len(class_names) > 0
        return {
            "status": "healthy",
            "model_loaded": loaded,
            "device": str(DEVICE),
            "checkpoint_path": MODEL_PATH,
            "class_names": class_names,
            "expected_maize_classes": EXPECTED_MAIZE_CLASSES,
            "message": "Model loaded successfully.",
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:  # pragma: no cover - executed when no maize checkpoint is available
        return {
            "status": "degraded",
            "model_loaded": False,
            "device": str(DEVICE),
            "checkpoint_path": MODEL_PATH,
            "expected_maize_classes": EXPECTED_MAIZE_CLASSES,
            "message": str(exc),
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }


@app.post("/predict-maize")
async def predict_maize(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file was uploaded.")

    if not file.filename.lower().endswith((".jpg", ".jpeg", ".png")):
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, and PNG images are supported.")

    try:
        image_bytes = await file.read()
        image = Image.open(__import__("io").BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read the uploaded image: {exc}") from exc

    try:
        model, class_names = load_model_from_checkpoint(MODEL_PATH)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "The saved checkpoint in this project is not a maize model. "
                f"{exc}. "
                "Add a real maize checkpoint with the expected classes "
                f"{EXPECTED_MAIZE_CLASSES} to enable live predictions."
            ),
        ) from exc

    try:
        model = model.to(DEVICE)
        model.eval()
        tensor = __import__("torchvision").transforms.Compose(
            [
                __import__("torchvision").transforms.Resize((224, 224)),
                __import__("torchvision").transforms.ToTensor(),
                __import__("torchvision").transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ]
        )(image).unsqueeze(0).to(DEVICE)

        with torch.set_grad_enabled(True):
            logits = model(tensor)
            probs = torch.softmax(logits, dim=1).detach().cpu()[0]
            predicted_index = int(logits.argmax(dim=1).item())
            probability = float(probs[predicted_index])
            gradcam = gradcam_heatmap(model, image, target_index=predicted_index)

        payload = {
            "predicted_class": class_names[predicted_index],
            "confidence": float(probability),
            "confidence_percent": float(probability * 100.0),
            "probabilities": {label: float(probs[i]) for i, label in enumerate(class_names)},
            "heatmap_base64": gradcam["heatmap_base64"],
            "overlay_base64": gradcam["overlay_base64"],
            "heatmap_format": "image/png",
            "prediction_timestamp": datetime.now(timezone.utc).isoformat(),
        }
        return payload
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("maize_backend:app", host="127.0.0.1", port=8001, reload=False)
