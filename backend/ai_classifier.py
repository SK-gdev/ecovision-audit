"""
AI Waste Classifier — EcoVision Audit
======================================

Detection priority (auto-selected):

1. **YOLO mode**        — if models/best.pt exists and ultralytics is installed.
2. **Gemini Vision**    — if GEMINI_API_KEY env-var is set. Uses gemini-2.0-flash
                          to identify and COUNT every individual item in a messy
                          bin photo (bottles, cans, wrappers, foam cups, etc.)
                          with realistic bounding-box estimates.
3. **Heuristic vision** — PIL colour/edge analysis. Image-aware but not ML-based.
4. **Random fallback**  — last resort if PIL cannot open the image.

Set your Gemini API key (free at https://aistudio.google.com/apikey):
    Windows:  $env:GEMINI_API_KEY = "AIza..."
    .env file: GEMINI_API_KEY=AIza...
"""

import base64
import hashlib
import json
import os
import random
import re
import time
from typing import Any, Dict, List, Optional

try:
    from dotenv import load_dotenv
    # Load from the directory where this file lives (backend/.env), regardless of cwd
    _ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    load_dotenv(_ENV_FILE, override=True)
except ImportError:
    pass

try:
    from PIL import Image, ImageFilter, ImageStat
    _PIL_OK = True
except ImportError:
    _PIL_OK = False

# ── Class definitions ───────────────────────────────────────────────────────

CLASSES = [
    "PET Bottle",
    "HDPE Container",
    "Plastic Wrapper",
    "Foam Cup",
    "Paper",
    "Other",
]

PLASTIC_CLASSES     = {"PET Bottle", "HDPE Container", "Plastic Wrapper", "Foam Cup"}
RECYCLABLE_CLASSES  = {"PET Bottle", "HDPE Container", "Paper"}

# Map common Gemini-detected labels → our canonical classes
_LABEL_MAP: Dict[str, str] = {
    # PET Bottle — clear, translucent, colored plastic bottles
    "pet bottle": "PET Bottle", "plastic bottle": "PET Bottle",
    "water bottle": "PET Bottle", "soda bottle": "PET Bottle",
    "beverage bottle": "PET Bottle", "bottle": "PET Bottle",
    "mineral water bottle": "PET Bottle", "juice bottle": "PET Bottle",
    "crushed bottle": "PET Bottle", "empty bottle": "PET Bottle",
    "clear bottle": "PET Bottle", "clear plastic bottle": "PET Bottle",
    "clear pet bottle": "PET Bottle", "transparent bottle": "PET Bottle",
    # Colored PET bottles (all colors are still PET unless opaque/HDPE)
    "green bottle": "PET Bottle", "green plastic bottle": "PET Bottle",
    "green soda bottle": "PET Bottle", "sprite bottle": "PET Bottle",
    "blue bottle": "PET Bottle", "blue plastic bottle": "PET Bottle",
    "red bottle": "PET Bottle", "red plastic bottle": "PET Bottle",
    "red-label bottle": "PET Bottle", "red label soda bottle": "PET Bottle",
    "red-labeled bottle": "PET Bottle", "red-labeled soda bottle": "PET Bottle",
    "yellow bottle": "PET Bottle", "orange bottle": "PET Bottle",
    "brown bottle": "PET Bottle", "colored bottle": "PET Bottle",
    "small bottle": "PET Bottle", "large bottle": "PET Bottle",
    "crushed clear bottle": "PET Bottle", "crushed pet bottle": "PET Bottle",
    "small crushed red-label bottle": "PET Bottle",
    "small clear pet bottle": "PET Bottle", "small clear bottle": "PET Bottle",
    "clear plastic bottle top": "PET Bottle", "pet bottle base": "PET Bottle",
    "bottle base": "PET Bottle", "plastic bottle base": "PET Bottle",
    "small bottle base": "PET Bottle", "blue-cap water bottle": "PET Bottle",
    "partially hidden bottle": "PET Bottle", "underlying bottle": "PET Bottle",
    "aqua water bottle": "PET Bottle", "aqua bottle": "PET Bottle",
    "vit bottle": "PET Bottle", "vit water bottle": "PET Bottle",
    "fit bottle": "PET Bottle", "coca-cola bottle": "PET Bottle",
    "drink bottle": "PET Bottle", "plastic drink bottle": "PET Bottle",
    "red-capped small bottle": "PET Bottle",
    # HDPE Container — opaque plastic containers/jugs
    "hdpe container": "HDPE Container", "plastic container": "HDPE Container",
    "plastic jug": "HDPE Container", "detergent bottle": "HDPE Container",
    "shampoo bottle": "HDPE Container", "milk jug": "HDPE Container",
    "container": "HDPE Container", "canister": "HDPE Container",
    "plastic can": "HDPE Container",
    "large 5-gallon jug": "HDPE Container", "5-gallon jug": "HDPE Container",
    "large water jug": "HDPE Container", "water gallon jug": "HDPE Container",
    "water gallon": "HDPE Container", "gallon jug": "HDPE Container",
    "gallon container": "HDPE Container", "large jug": "HDPE Container",
    "squeeze tube": "HDPE Container", "cosmetic tube": "HDPE Container",
    "lotion tube": "HDPE Container", "pink tube": "HDPE Container",
    "pink cosmetic tube": "HDPE Container", "pink squeeze tube": "HDPE Container",
    "pink cosmetic squeeze tube": "HDPE Container",
    "cosmetic squeeze tube": "HDPE Container", "lotion bottle": "HDPE Container",
    "opaque bottle": "HDPE Container",
    # Plastic Wrapper — bags, films, sachets
    "plastic wrapper": "Plastic Wrapper", "plastic bag": "Plastic Wrapper",
    "plastic film": "Plastic Wrapper", "wrapper": "Plastic Wrapper",
    "packaging": "Plastic Wrapper", "plastic packaging": "Plastic Wrapper",
    "chip bag": "Plastic Wrapper", "snack wrapper": "Plastic Wrapper",
    "candy wrapper": "Plastic Wrapper", "cling wrap": "Plastic Wrapper",
    "polybag": "Plastic Wrapper", "sachet": "Plastic Wrapper",
    # Foam Cup — styrofoam
    "foam cup": "Foam Cup", "styrofoam cup": "Foam Cup",
    "polystyrene cup": "Foam Cup", "disposable cup": "Foam Cup",
    "foam container": "Foam Cup", "styrofoam": "Foam Cup",
    "foam box": "Foam Cup", "takeaway container": "Foam Cup",
    # Paper
    "paper": "Paper", "cardboard": "Paper", "carton": "Paper",
    "paper cup": "Paper", "newspaper": "Paper", "magazine": "Paper",
    "tissue": "Paper", "napkin": "Paper", "paper bag": "Paper",
    "box": "Paper", "paperboard": "Paper",
    # Other — non-plastic contaminants
    "light bulb": "Other", "bulb": "Other", "electric bulb": "Other",
    "led bulb": "Other", "white led bulb": "Other", "white light bulb": "Other",
    "can": "Other", "tin can": "Other",
    "metal can": "Other", "aluminum can": "Other", "aluminium can": "Other",
    "metal/aluminum can": "Other", "aluminum beverage can": "Other",
    "beverage can": "Other", "soda can": "Other",
    "glass bottle": "Other", "glass": "Other", "ceramic": "Other",
    "metal": "Other", "electronic": "Other", "electronics": "Other",
}

# Colour heuristics (HSV) for the PIL fallback
_COLOUR_HINTS = [
    {"hue": (180, 240), "sat": (0.05, 0.60), "val": (0.50, 1.0),  "cls": "PET Bottle",      "boost": 0.15},
    {"hue": (0,   360), "sat": (0.0,  0.10), "val": (0.85, 1.0),  "cls": "Foam Cup",         "boost": 0.12},
    {"hue": (20,   45), "sat": (0.15, 0.70), "val": (0.25, 0.75), "cls": "Paper",             "boost": 0.14},
    {"hue": (0,    20), "sat": (0.50, 1.0),  "val": (0.40, 1.0),  "cls": "Plastic Wrapper",  "boost": 0.13},
    {"hue": (45,   70), "sat": (0.40, 1.0),  "val": (0.40, 1.0),  "cls": "Plastic Wrapper",  "boost": 0.11},
    {"hue": (80,  160), "sat": (0.15, 0.80), "val": (0.20, 0.80), "cls": "HDPE Container",   "boost": 0.13},
    {"hue": (0,   360), "sat": (0.0,  0.15), "val": (0.0,  0.35), "cls": "Other",             "boost": 0.10},
]


class WasteClassifier:
    """
    Waste classifier — Gemini Vision → YOLO → Heuristic → Random fallback.
    """

    MODEL_PATH = os.path.join("models", "best.pt")

    # Gemini prompt — counts items AND estimates weight
    _GEMINI_PROMPT = """You are an ultra-precise waste auditing AI for a campus recycling program.
Analyse this bin photo and perform TWO tasks:

── TASK 1: ITEM DETECTION ──
Count EVERY SINGLE individual piece of waste. Scan systematically: top-left, top-right, center, bottom-left, bottom-center, bottom-right.
Count items even if crushed, partially buried, overlapping, or barely visible.

CRITICAL classification rules:
- PET Bottle: ANY plastic bottle regardless of colour — clear, green, blue, red, yellow, Aqua, Sprite, Vit, Fit, Coca-Cola, crushed, partial, bottle base. ALL coloured plastic bottles = PET Bottle.
- HDPE Container: opaque/solid plastic jug, canister, 5-gallon water jug, shampoo/lotion bottle, squeeze tube
- Plastic Wrapper: plastic bags, film, sachet, chip bag, candy wrapper, flexible packaging
- Foam Cup: styrofoam cup, foam box, polystyrene container
- Paper: cardboard, newspaper, paper cup, paper bag, carton
- Other: glass bottle, metal/aluminum can, light bulb, electronics, ceramic

── TASK 2: WEIGHT ESTIMATION ──
Based on the visible items and bin fullness, estimate the total waste weight in kilograms.
Consider: average PET bottle = 25g, HDPE jug = 150-500g, aluminum can = 15g, light bulb = 50g.
Give a realistic range (e.g. a bin with 15 PET bottles + 1 jug + 2 cans ≈ 1.1 kg).

Return ONLY valid JSON:
{
  "items": [
    {"class": "PET Bottle", "label": "green soda bottle", "confidence": 0.96, "approx_bbox": [20, 20, 30, 40]},
    {"class": "Other", "label": "white LED bulb", "confidence": 0.98, "approx_bbox": [60, 50, 10, 15]}
  ],
  "weight_estimate": {
    "estimated_kg": 1.2,
    "confidence": 0.70,
    "reasoning": "15 PET bottles (375g) + 1 large HDPE jug (500g) + 2 aluminum cans (30g) + 1 bulb (50g) ≈ 1.0kg, bin ~60% full"
  }
}"""

    def __init__(self) -> None:
        self._yolo_model = None
        self._gemini_client = None
        self._mode = "heuristic"

        # Try YOLO first
        if os.path.exists(self.MODEL_PATH):
            try:
                from ultralytics import YOLO  # type: ignore
                self._yolo_model = YOLO(self.MODEL_PATH)
                self._mode = "yolo"
                return
            except ImportError:
                pass

        # Try Gemini Vision — uses direct REST API (no SDK needed for AQ. key type)
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if api_key:
            self._mode = "gemini"
            print(f"[Gemini] Mode enabled with key: {api_key[:8]}...")
            return

        self._mode = "heuristic"

    # ── Properties ──────────────────────────────────────────────────────────

    @property
    def is_demo_mode(self) -> bool:
        return self._mode not in ("yolo", "gemini")

    @property
    def model_name(self) -> str:
        names = {
            "yolo": "yolov8n-waste",
            "gemini": "gemini-3.5-flash-vision",
            "heuristic": "heuristic-vision-v2",
            "random": "random-fallback",
        }
        return names.get(self._mode, "unknown")

    # ── Public API ───────────────────────────────────────────────────────────

    def classify(self, image_path: str, confidence_threshold: float = 0.7) -> Dict[str, Any]:
        start = time.perf_counter()

        weight_estimate: Optional[Dict[str, Any]] = None

        if self._mode == "yolo":
            items = self._real_classify(image_path, confidence_threshold)
        elif self._mode == "gemini":
            items, weight_estimate = self._gemini_classify(image_path)
        else:
            items = self._heuristic_classify(image_path, confidence_threshold)

        elapsed_ms = (time.perf_counter() - start) * 1000.0

        result: Dict[str, Any] = {
            "model_name": self.model_name,
            "confidence_threshold": confidence_threshold,
            "is_demo_mode": self.is_demo_mode,
            "processing_time_ms": round(elapsed_ms, 2),
            "items": items,
            "estimated_weight_kg": None,
            "weight_confidence": None,
            "weight_notes": None,
        }
        if weight_estimate:
            result["estimated_weight_kg"] = weight_estimate.get("estimated_kg")
            result["weight_confidence"] = weight_estimate.get("confidence")
            result["weight_notes"] = weight_estimate.get("reasoning")

        return result

    # ── Gemini Vision ────────────────────────────────────────────────────────

    def _gemini_classify(self, image_path: str):  # returns (items, weight_estimate)
        """Send image to Gemini Vision via REST API with image resizing for reliability."""
        import io
        import urllib.request

        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            print("[Gemini] No API key — falling back to heuristic")
            return self._heuristic_classify(image_path, 0.7)

        try:
            # ── 1. Load & resize image (max 1024px) for fast reliable upload ──
            img_w_orig, img_h_orig = 640, 480
            if _PIL_OK:
                try:
                    pil_img = Image.open(image_path).convert("RGB")
                    img_w_orig, img_h_orig = pil_img.size
                    max_dim = 1024
                    if max(img_w_orig, img_h_orig) > max_dim:
                        ratio = max_dim / float(max(img_w_orig, img_h_orig))
                        pil_img = pil_img.resize(
                            (int(img_w_orig * ratio), int(img_h_orig * ratio)),
                            Image.Resampling.LANCZOS,
                        )
                    buf = io.BytesIO()
                    pil_img.save(buf, format="JPEG", quality=85)
                    image_b64 = base64.b64encode(buf.getvalue()).decode()
                except Exception:
                    with open(image_path, "rb") as f:
                        image_b64 = base64.b64encode(f.read()).decode()
            else:
                with open(image_path, "rb") as f:
                    image_b64 = base64.b64encode(f.read()).decode()

            img_w, img_h = img_w_orig, img_h_orig

            # ── 2. Call Gemini REST API (bypasses SDK model-name issues) ──
            models_to_try = [
                "gemini-3.5-flash",
                "gemini-3.8-flash",
                "gemini-3.5-flash-lite",
                "gemini-3.1-flash-lite",
            ]
            raw_text = None
            last_err = None
            for model in models_to_try:
                url = (
                    f"https://generativelanguage.googleapis.com/v1beta/models/"
                    f"{model}:generateContent?key={api_key}"
                )
                payload = json.dumps({
                    "contents": [{
                        "parts": [
                            {"inlineData": {"mimeType": "image/jpeg", "data": image_b64}},
                            {"text": self._GEMINI_PROMPT},
                        ]
                    }],
                    "generationConfig": {
                        "temperature": 0.1,
                        "responseMimeType": "application/json",
                    },
                }).encode()
                req = urllib.request.Request(
                    url, data=payload,
                    headers={"Content-Type": "application/json"},
                )
                try:
                    with urllib.request.urlopen(req, timeout=45) as resp:
                        body = json.loads(resp.read().decode())
                        raw_text = body["candidates"][0]["content"]["parts"][0]["text"]
                        if raw_text:
                            print(f"[Gemini] Success with model: {model}")
                            break
                except urllib.error.HTTPError as e:
                    last_err = e
                    err_body = e.read().decode()[:200]
                    print(f"[Gemini] HTTP {e.code} for {model}: {err_body}")
                    continue
                except Exception as e:
                    last_err = e
                    print(f"[Gemini] Error for {model}: {e}")
                    continue

            if not raw_text:
                raise last_err or RuntimeError("All Gemini models failed")

            # ── 3. Parse JSON response ──
            raw_text = raw_text.strip()
            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)
            parsed = json.loads(raw_text)
            gemini_items = parsed.get("items", [])
            print(f"[Gemini] Detected {len(gemini_items)} items")

            # ── 4. Map items → canonical format ──
            result_items = []
            for idx, item in enumerate(gemini_items):
                raw_label = str(item.get("label", "")).lower().strip()
                raw_class = str(item.get("class", "")).strip()
                confidence = float(item.get("confidence", 0.80))

                # Resolve canonical class
                canonical = _LABEL_MAP.get(raw_label)
                if canonical is None:
                    canonical = raw_class if raw_class in CLASSES else None
                if canonical is None:
                    for key, val in _LABEL_MAP.items():
                        if key in raw_label or raw_label in key:
                            canonical = val
                            break
                if canonical is None:
                    canonical = "Other"

                # bbox (percentage → pixels)
                bbox = item.get("approx_bbox", [])
                if len(bbox) == 4:
                    bx = max(0.0, bbox[0] / 100.0 * img_w)
                    by = max(0.0, bbox[1] / 100.0 * img_h)
                    bw = max(10.0, min(bbox[2] / 100.0 * img_w, img_w - bx))
                    bh = max(10.0, min(bbox[3] / 100.0 * img_h, img_h - by))
                else:
                    cols = 4
                    bw, bh = img_w * 0.18, img_h * 0.22
                    bx = (idx % cols) * (img_w / cols) + 5
                    by = (idx // cols) * (img_h / 4) + 5

                result_items.append({
                    "class_name": canonical,
                    "label": item.get("label", canonical),
                    "confidence": round(min(0.99, max(0.10, confidence)), 4),
                    "bbox_x": round(bx, 2),
                    "bbox_y": round(by, 2),
                    "bbox_w": round(bw, 2),
                    "bbox_h": round(bh, 2),
                    "is_contamination": canonical not in PLASTIC_CLASSES,
                })

            if not result_items:
                print("[Gemini] Empty response — using heuristic fallback")
                return self._heuristic_classify(image_path, 0.7), None

            weight_estimate = parsed.get("weight_estimate")
            return result_items, weight_estimate

        except json.JSONDecodeError as e:
            print(f"[Gemini] JSON parse error: {e} — using heuristic")
            return self._heuristic_classify(image_path, 0.7), None
        except Exception as e:
            print(f"[Gemini] Fatal error: {e} — using heuristic")
            return self._heuristic_classify(image_path, 0.7), None

    def _parse_text_response(self, text: str, image_path: str) -> List[Dict[str, Any]]:
        """Best-effort parse when Gemini returns plain text instead of JSON."""
        items = []
        img_w, img_h = 640, 480
        rng = random.Random(self._file_hash(image_path))

        for line in text.split("\n"):
            line = line.strip().lower()
            for key, cls in _LABEL_MAP.items():
                if key in line:
                    bw = rng.uniform(0.1, 0.25) * img_w
                    bh = rng.uniform(0.1, 0.25) * img_h
                    bx = rng.uniform(0, img_w - bw)
                    by = rng.uniform(0, img_h - bh)
                    items.append({
                        "class_name": cls,
                        "label": key,
                        "confidence": round(rng.uniform(0.60, 0.88), 4),
                        "bbox_x": round(bx, 2), "bbox_y": round(by, 2),
                        "bbox_w": round(bw, 2), "bbox_h": round(bh, 2),
                        "is_contamination": cls not in PLASTIC_CLASSES,
                    })
                    break

        return items if items else self._heuristic_classify(image_path, 0.7)

    # ── YOLO ─────────────────────────────────────────────────────────────────

    def _real_classify(self, image_path: str, threshold: float) -> List[Dict[str, Any]]:
        results = self._yolo_model(image_path, conf=threshold)  # type: ignore
        items = []
        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                cls_name = CLASSES[cls_id] if cls_id < len(CLASSES) else "Other"
                conf = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                items.append({
                    "class_name": cls_name,
                    "label": cls_name,
                    "confidence": round(conf, 4),
                    "bbox_x": round(x1, 2), "bbox_y": round(y1, 2),
                    "bbox_w": round(x2 - x1, 2), "bbox_h": round(y2 - y1, 2),
                    "is_contamination": cls_name not in PLASTIC_CLASSES,
                })
        return items

    # ── Heuristic (PIL) ───────────────────────────────────────────────────────

    def _heuristic_classify(self, image_path: str, threshold: float) -> List[Dict[str, Any]]:
        if not _PIL_OK:
            return self._random_fallback(640, 480, image_path)
        try:
            img = Image.open(image_path).convert("RGB")
            img_w, img_h = img.size
        except Exception:
            return self._random_fallback(640, 480, image_path)

        file_hash = self._file_hash(image_path)
        rng = random.Random(file_hash)

        thumb = img.copy()
        thumb.thumbnail((320, 240))
        tw, th = thumb.size
        scale_x, scale_y = img_w / tw, img_h / th

        try:
            edges = thumb.convert("L").filter(ImageFilter.FIND_EDGES)
        except Exception:
            edges = None

        cols, rows = 4, 3
        cell_w, cell_h = tw // cols, th // rows
        proposals = []

        for r in range(rows):
            for c in range(cols):
                x0, y0 = c * cell_w, r * cell_h
                x1, y1 = min(x0 + cell_w, tw), min(y0 + cell_h, th)
                cell = thumb.crop((x0, y0, x1, y1))
                stat = ImageStat.Stat(cell)
                mean_rgb = stat.mean
                stddev_rgb = stat.stddev
                if sum(stddev_rgb) / 3.0 < 12:
                    continue

                h, s, v = self._rgb_to_hsv(mean_rgb[0], mean_rgb[1], mean_rgb[2])
                edge_density = 0.0
                if edges:
                    ec = ImageStat.Stat(edges.crop((x0, y0, x1, y1)))
                    edge_density = ec.mean[0] / 255.0

                best_cls, best_boost = "Other", 0.0
                for hint in _COLOUR_HINTS:
                    if (hint["hue"][0] <= h <= hint["hue"][1] and
                            hint["sat"][0] <= s <= hint["sat"][1] and
                            hint["val"][0] <= v <= hint["val"][1]):
                        if hint["boost"] > best_boost:
                            best_cls, best_boost = hint["cls"], hint["boost"]

                confidence = min(0.98, max(0.30, 0.45 + best_boost + edge_density * 0.25 + rng.uniform(-0.05, 0.05)))
                jx = rng.uniform(-0.1, 0.1) * cell_w * scale_x
                jy = rng.uniform(-0.1, 0.1) * cell_h * scale_y
                bx = max(0, x0 * scale_x + jx)
                by = max(0, y0 * scale_y + jy)
                bw = min(cell_w * scale_x * rng.uniform(0.7, 1.2), img_w - bx)
                bh = min(cell_h * scale_y * rng.uniform(0.7, 1.2), img_h - by)
                proposals.append({
                    "class_name": best_cls, "label": best_cls,
                    "confidence": round(confidence, 4),
                    "bbox_x": round(bx, 2), "bbox_y": round(by, 2),
                    "bbox_w": round(bw, 2), "bbox_h": round(bh, 2),
                    "is_contamination": best_cls not in PLASTIC_CLASSES,
                    "_edge": edge_density,
                })

        proposals = [p for p in proposals if p["_edge"] > 0.03]
        proposals.sort(key=lambda p: p["confidence"], reverse=True)
        for p in proposals:
            p.pop("_edge", None)
        selected = proposals[:min(8, max(3, len(proposals)))]

        while len(selected) < 3:
            cls = rng.choice(CLASSES)
            bw = rng.uniform(0.08, 0.20) * img_w
            bh = rng.uniform(0.08, 0.25) * img_h
            selected.append({
                "class_name": cls, "label": cls,
                "confidence": round(rng.uniform(0.30, 0.55), 4),
                "bbox_x": round(rng.uniform(0, max(1, img_w - bw)), 2),
                "bbox_y": round(rng.uniform(0, max(1, img_h - bh)), 2),
                "bbox_w": round(bw, 2), "bbox_h": round(bh, 2),
                "is_contamination": cls not in PLASTIC_CLASSES,
            })
        return selected

    def _random_fallback(self, img_w: int, img_h: int, image_path: str) -> List[Dict[str, Any]]:
        rng = random.Random(self._file_hash(image_path))
        items = []
        for _ in range(rng.randint(3, 7)):
            cls = rng.choice(CLASSES)
            bw = rng.uniform(0.05, 0.25) * img_w
            bh = rng.uniform(0.05, 0.30) * img_h
            items.append({
                "class_name": cls, "label": cls,
                "confidence": round(rng.uniform(0.35, 0.92), 4),
                "bbox_x": round(rng.uniform(0, max(1, img_w - bw)), 2),
                "bbox_y": round(rng.uniform(0, max(1, img_h - bh)), 2),
                "bbox_w": round(bw, 2), "bbox_h": round(bh, 2),
                "is_contamination": cls not in PLASTIC_CLASSES,
            })
        return items

    # ── Utilities ─────────────────────────────────────────────────────────────

    @staticmethod
    def _file_hash(path: str) -> int:
        try:
            with open(path, "rb") as f:
                data = f.read(65536)
            return int(hashlib.md5(data).hexdigest(), 16) % (2**31)
        except Exception:
            return 42

    @staticmethod
    def _rgb_to_hsv(r: float, g: float, b: float) -> tuple:
        r, g, b = r / 255.0, g / 255.0, b / 255.0
        mx, mn = max(r, g, b), min(r, g, b)
        diff = mx - mn
        if diff == 0:
            h = 0.0
        elif mx == r:
            h = (60 * ((g - b) / diff) + 360) % 360
        elif mx == g:
            h = (60 * ((b - r) / diff) + 120) % 360
        else:
            h = (60 * ((r - g) / diff) + 240) % 360
        s = 0.0 if mx == 0 else diff / mx
        return h, s, mx
