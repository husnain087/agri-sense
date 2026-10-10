from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

from backend.wheat_gradcam import (
    CLASS_NAMES,
    load_wheat_model,
    predict_with_gradcam,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CHECKPOINT_PATH = Path(
    os.environ.get(
        "WHEAT_MODEL_PATH",
        str(PROJECT_ROOT / "best_efficientnet_b0_agrisense (1).pth"),
    )
).expanduser().resolve()
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
FRONTEND_ORIGIN = os.environ.get("AGRI_FRONTEND_ORIGIN", "").strip()
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if FRONTEND_ORIGIN:
    ALLOWED_ORIGINS.append(FRONTEND_ORIGIN)


@asynccontextmanager
async def lifespan(app: FastAPI):
    model, class_names, image_size = load_wheat_model(str(CHECKPOINT_PATH))
    app.state.model = model.to(DEVICE).eval()
    app.state.class_names = class_names
    app.state.image_size = image_size
    yield


app = FastAPI(title="AgriSense AI Local Wheat Model", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    loaded = hasattr(app.state, "model")
    return {
        "status": "healthy" if loaded else "offline",
        "model_loaded": loaded,
        "model": "EfficientNet-B0",
        "class_names": app.state.class_names if loaded else CLASS_NAMES,
        "image_size": app.state.image_size if loaded else 224,
        "device": str(DEVICE),
        "checkpoint": str(CHECKPOINT_PATH),
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No image file was uploaded.")
    if Path(file.filename).suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format. Upload a JPG, JPEG, PNG, or WEBP image.",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be 8 MB or smaller.")

    try:
        from io import BytesIO

        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.") from exc

    try:
        result = predict_with_gradcam(app.state.model, image, DEVICE)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Local model inference failed: {exc}") from exc

    return {
        "success": True,
        "predicted_class": result["predicted_class"],
        "confidence": result["confidence"],
        "confidence_percent": result["confidence"] * 100,
        "probabilities": result["probabilities"],
        "heatmap_base64": result["heatmap_base64"],
        "overlay_base64": result["overlay_base64"],
        "heatmap_format": "image/png",
        "model": "EfficientNet-B0",
        "explanation": (
            "Grad-CAM highlights image regions that contributed to the model score; "
            "it does not prove disease presence or pinpoint disease in the field."
        ),
        "prediction_timestamp": datetime.now(timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("wheat_backend:app", host="127.0.0.1", port=8000, reload=False)
