from __future__ import annotations

import base64
import io
import os
from typing import Any

import numpy as np
import torch
import torch.nn.functional as F
from matplotlib import cm
from PIL import Image
from torchvision import transforms
from torchvision.models import efficientnet_b0

EXPECTED_MAIZE_CLASSES = ["Blight", "Common Rust", "Gray Leaf Spot", "Healthy"]
DEFAULT_MODEL_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "best_efficientnet_b0_agrisense (1).pth")
)


def load_model_from_checkpoint(model_path: str = DEFAULT_MODEL_PATH):
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Maize checkpoint not found at: {model_path}")

    checkpoint = torch.load(model_path, map_location="cpu")
    class_names = checkpoint.get("class_names")
    if not isinstance(class_names, list) or not class_names:
        raise ValueError(
            f"Checkpoint at {model_path} does not include a valid 'class_names' list. "
            "This metadata is required to determine the exact class map."
        )

    if class_names != EXPECTED_MAIZE_CLASSES:
        raise ValueError(
            "Model mismatch: the saved checkpoint is not a maize model. "
            f"Detected classes: {class_names}. Expected maize classes: {EXPECTED_MAIZE_CLASSES}. "
            f"The current project checkpoint is a different model and cannot be used for maize disease predictions."
        )

    model = efficientnet_b0(weights=None)
    model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, len(class_names))
    state_dict = checkpoint.get("model_state_dict") or checkpoint.get("state_dict")
    if not isinstance(state_dict, dict):
        raise ValueError(f"Checkpoint at {model_path} does not contain a usable state_dict.")

    model.load_state_dict(state_dict, strict=True)
    model.eval()
    return model, class_names


def preprocess_image(image: Image.Image) -> torch.Tensor:
    image = image.convert("RGB")
    preprocess = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ]
    )
    return preprocess(image)


def to_base64_png(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def gradcam_heatmap(model: torch.nn.Module, image: Image.Image, target_index: int | None = None):
    model.eval()
    tensor = preprocess_image(image).unsqueeze(0)
    device = next(model.parameters()).device
    tensor = tensor.to(device)

    feature_layer = model.features[-1]
    activations: torch.Tensor | None = None
    gradients: torch.Tensor | None = None

    def _forward_hook(module: torch.nn.Module, inputs: Any, output: Any):
        nonlocal activations
        activations = output

    def _backward_hook(module: torch.nn.Module, grad_input: Any, grad_output: Any):
        nonlocal gradients
        gradients = grad_output[0]

    forward_handle = feature_layer.register_forward_hook(_forward_hook)
    backward_handle = feature_layer.register_full_backward_hook(_backward_hook)

    try:
        model.zero_grad(set_to_none=True)
        logits = model(tensor)
        logits = logits.float()
        if target_index is None:
            target_index = int(logits.argmax(dim=1).item())
        logits[:, target_index].backward()
    finally:
        forward_handle.remove()
        backward_handle.remove()

    if activations is None or gradients is None:
        raise RuntimeError("Grad-CAM could not capture activations or gradients.")

    pooled_gradients = gradients.mean(dim=(2, 3), keepdim=True)
    heatmap = (pooled_gradients * activations).sum(dim=1, keepdim=True)
    heatmap = F.relu(heatmap)
    heatmap = heatmap[0, 0].detach().cpu()
    heatmap = heatmap - heatmap.min()
    heatmap = heatmap / (heatmap.max().clamp_min(1e-8) + 1e-8)
    heatmap_array = heatmap.numpy()
    heatmap_array = np.uint8(255 * heatmap_array)

    colored = cm.get_cmap("jet")(heatmap_array / 255.0)[:, :, :3]
    colored = (colored * 255).astype(np.uint8)
    heatmap_image = Image.fromarray(colored)
    heatmap_image = heatmap_image.resize(image.size, resample=Image.BILINEAR)

    original = image.convert("RGBA")
    overlay = Image.blend(
        original,
        heatmap_image.convert("RGBA"),
        alpha=0.45,
    )

    return {
        "heatmap_image": heatmap_image,
        "overlay_image": overlay,
        "heatmap_base64": to_base64_png(heatmap_image),
        "overlay_base64": to_base64_png(overlay),
    }
