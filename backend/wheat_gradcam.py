from __future__ import annotations

import base64
import io
from typing import Any

import numpy as np
import torch
import torch.nn.functional as F
from matplotlib import colormaps
from PIL import Image
from torchvision import transforms
from torchvision.models import efficientnet_b0

CLASS_NAMES = ["Healthy", "septoria", "stripe_rust"]
IMAGE_SIZE = 224

PREPROCESS = transforms.Compose(
    [
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ]
)


def load_wheat_model(checkpoint_path: str) -> tuple[torch.nn.Module, list[str], int]:
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    class_names = checkpoint.get("class_names")
    if not isinstance(class_names, list) or not all(
        isinstance(name, str) for name in class_names
    ):
        raise ValueError("Checkpoint metadata must include a string class_names list.")
    if class_names != CLASS_NAMES:
        raise ValueError(
            f"Checkpoint class order {class_names!r} does not match the verified "
            f"wheat classes {CLASS_NAMES!r}."
        )

    image_size = checkpoint.get("image_size")
    if image_size != IMAGE_SIZE:
        raise ValueError(
            f"Checkpoint image_size is {image_size!r}; this backend is configured "
            f"for the verified size of {IMAGE_SIZE}."
        )

    model = efficientnet_b0(weights=None)
    model.classifier[1] = torch.nn.Linear(
        model.classifier[1].in_features,
        len(class_names),
    )
    state_dict = checkpoint.get("model_state_dict")
    if not isinstance(state_dict, dict):
        raise ValueError("Checkpoint does not contain model_state_dict.")
    model.load_state_dict(state_dict, strict=True)
    model.eval()
    return model, class_names, image_size


def _png_base64(image: Image.Image) -> str:
    output = io.BytesIO()
    image.save(output, format="PNG")
    return base64.b64encode(output.getvalue()).decode("ascii")


def predict_with_gradcam(
    model: torch.nn.Module,
    image: Image.Image,
    device: torch.device,
) -> dict[str, Any]:
    original = image.convert("RGB")
    input_tensor = PREPROCESS(original).unsqueeze(0).to(device)
    feature_layer = model.features[-1]
    activations: torch.Tensor | None = None
    gradients: torch.Tensor | None = None

    def capture_activations(
        _module: torch.nn.Module, _inputs: Any, output: torch.Tensor
    ) -> None:
        nonlocal activations
        activations = output

    def capture_gradients(
        _module: torch.nn.Module, _grad_input: Any, grad_output: Any
    ) -> None:
        nonlocal gradients
        gradients = grad_output[0]

    forward_hook = feature_layer.register_forward_hook(capture_activations)
    backward_hook = feature_layer.register_full_backward_hook(capture_gradients)
    try:
        model.zero_grad(set_to_none=True)
        with torch.enable_grad():
            logits = model(input_tensor)
            probabilities = torch.softmax(logits, dim=1)[0]
            class_index = int(torch.argmax(probabilities).item())
            logits[0, class_index].backward()

        if activations is None or gradients is None:
            raise RuntimeError("Grad-CAM hooks did not capture model activations and gradients.")

        weights = gradients.mean(dim=(2, 3), keepdim=True)
        cam = F.relu((weights * activations).sum(dim=1, keepdim=True))
        cam = F.interpolate(
            cam,
            size=(original.height, original.width),
            mode="bilinear",
            align_corners=False,
        )[0, 0]
        cam = cam.detach().cpu()
        cam_min, cam_max = cam.min(), cam.max()
        if float(cam_max - cam_min) > 0:
            cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam = torch.zeros_like(cam)

        heatmap_values = cam.numpy()
        heatmap_rgb = np.uint8(colormaps["jet"](heatmap_values)[..., :3] * 255)
        heatmap = Image.fromarray(heatmap_rgb, mode="RGB")
        overlay = Image.blend(original.convert("RGBA"), heatmap.convert("RGBA"), 0.45)

        return {
            "predicted_class": CLASS_NAMES[class_index],
            "confidence": float(probabilities[class_index].detach().cpu()),
            "probabilities": {
                class_name: float(probabilities[index].detach().cpu())
                for index, class_name in enumerate(CLASS_NAMES)
            },
            "heatmap_base64": _png_base64(heatmap),
            "overlay_base64": _png_base64(overlay),
        }
    finally:
        forward_hook.remove()
        backward_hook.remove()
        model.zero_grad(set_to_none=True)
