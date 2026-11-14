import os
import io
import sys
import json
import tempfile
import sqlite3
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from PIL import Image, ImageDraw

# ── Page config (must be first Streamlit call) ─────────────────────────────
st.set_page_config(
    page_title="EcoVision Audit — AI Plastic Waste Monitoring",
    page_icon="♻️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Inject Gemini API key from Streamlit Cloud secrets BEFORE importing classifier ──
try:
    if hasattr(st, "secrets") and "GEMINI_API_KEY" in st.secrets:
        os.environ["GEMINI_API_KEY"] = st.secrets["GEMINI_API_KEY"]
except Exception:
    pass

# ── Import AI Classifier ───────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

_classifier_error = None
try:
    from ai_classifier import WasteClassifier, PLASTIC_CLASSES, RECYCLABLE_CLASSES
except Exception as e:
    _classifier_error = str(e)
    WasteClassifier = None
    PLASTIC_CLASSES = set()
    RECYCLABLE_CLASSES = set()

DB_PATH = os.path.join(BASE_DIR, "backend", "ecovision.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ── Auto-create tables if DB is missing (Streamlit Cloud ephemeral FS) ─────
def ensure_db():
    """Create tables if they don't exist (handles Streamlit Cloud cold start)."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS bins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            building TEXT,
            floor TEXT,
            description TEXT,
            accepted_waste_types TEXT,
            qr_code TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS audits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bin_id INTEGER,
            photo_path TEXT,
            measured_weight_kg REAL,
            notes TEXT,
            status TEXT DEFAULT 'pending',
            submitted_by TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            weight_human_confirmed INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS ai_predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            audit_id INTEGER,
            model_name TEXT,
            confidence_threshold REAL,
            is_demo_mode INTEGER,
            processing_time_ms REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            estimated_weight_kg REAL,
            weight_confidence REAL,
            weight_notes TEXT
        );
        CREATE TABLE IF NOT EXISTS detected_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id INTEGER,
            class_name TEXT,
            confidence REAL,
            bbox_x REAL,
            bbox_y REAL,
            bbox_w REAL,
            bbox_h REAL,
            is_contamination INTEGER DEFAULT 0,
            human_verified INTEGER DEFAULT 0,
            human_corrected_class TEXT,
            verified_by TEXT,
            verified_at TEXT,
            label TEXT
        );
        CREATE TABLE IF NOT EXISTS audit_summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            audit_id INTEGER,
            total_items_detected INTEGER,
            plastic_items INTEGER,
            recyclable_items INTEGER,
            contamination_count INTEGER,
            contamination_rate REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()

ensure_db()

# ── Sidebar ────────────────────────────────────────────────────────────────
st.sidebar.title("♻️ EcoVision Audit")
st.sidebar.caption("AI-Powered Campus Plastic Waste Monitoring")
page = st.sidebar.radio(
    "Navigation",
    ["📊 Dashboard", "📷 AI Waste Scanner", "📋 Review Queue", "🗂️ Audit History"],
)

st.sidebar.markdown("---")
if _classifier_error:
    st.sidebar.error(f"⚠️ Classifier load error:\n{_classifier_error}")
else:
    st.sidebar.info("💡 **Streamlit Cloud Ready**\n\nRuns 100% free with Gemini Vision AI.")

# ─────────────────────────────────────────────────────────────────────────────
# 1. DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────
if page == "📊 Dashboard":
    st.title("📊 Campus Plastic Waste & Contamination Dashboard")
    st.write("Real-time monitoring of campus recycling performance and contamination hotspots.")

    conn = get_db()
    c = conn.cursor()

    total_audits = c.execute("SELECT COUNT(*) FROM audits").fetchone()[0]
    total_weight = c.execute("SELECT COALESCE(SUM(measured_weight_kg), 0) FROM audits").fetchone()[0]
    total_items = c.execute("SELECT COUNT(*) FROM detected_items").fetchone()[0]
    contam_items = c.execute("SELECT COUNT(*) FROM detected_items WHERE is_contamination = 1").fetchone()[0]
    avg_contam = (contam_items / total_items * 100) if total_items > 0 else 0.0

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Audits", total_audits)
    col2.metric("Total Plastic Logged", f"{total_weight:.1f} kg")
    col3.metric("Total Items Detected", total_items)
    col4.metric("Avg Contamination Rate", f"{avg_contam:.1f}%")

    st.markdown("---")

    col_chart1, col_chart2 = st.columns(2)

    with col_chart1:
        st.subheader("Waste Composition by Material")
        df_comp = pd.read_sql_query(
            """
            SELECT class_name, COUNT(*) as count
            FROM detected_items
            GROUP BY class_name
            ORDER BY count DESC
            """, conn
        )
        if not df_comp.empty:
            fig_pie = px.pie(
                df_comp, values="count", names="class_name",
                color_discrete_sequence=px.colors.qualitative.Prism,
                hole=0.4
            )
            st.plotly_chart(fig_pie, use_container_width=True)
        else:
            st.info("No item data yet. Run an AI scan first.")

    with col_chart2:
        st.subheader("Top Contamination Hotspots (Bins)")
        df_hotspots = pd.read_sql_query(
            """
            SELECT b.name as bin_name, b.building,
                   COUNT(a.id) as audits,
                   COALESCE(AVG(s.contamination_rate), 0) * 100 as contam_rate
            FROM bins b
            LEFT JOIN audits a ON a.bin_id = b.id
            LEFT JOIN audit_summaries s ON s.audit_id = a.id
            GROUP BY b.id
            ORDER BY contam_rate DESC
            LIMIT 5
            """, conn
        )
        if not df_hotspots.empty and df_hotspots["contam_rate"].sum() > 0:
            fig_bar = px.bar(
                df_hotspots, x="bin_name", y="contam_rate",
                color="contam_rate",
                color_continuous_scale="Reds",
                labels={"contam_rate": "Contamination %", "bin_name": "Bin"},
                hover_data=["building", "audits"]
            )
            st.plotly_chart(fig_bar, use_container_width=True)
        else:
            st.info("No contamination data yet.")

    st.subheader("Recent Audits")
    df_recent = pd.read_sql_query(
        """
        SELECT a.id, b.name as bin, b.building, a.measured_weight_kg as weight_kg,
               a.status, a.created_at
        FROM audits a
        JOIN bins b ON a.bin_id = b.id
        ORDER BY a.created_at DESC
        LIMIT 10
        """, conn
    )
    if not df_recent.empty:
        st.dataframe(df_recent, use_container_width=True)
    else:
        st.info("No audits yet. Use the AI Waste Scanner to log your first scan.")
    conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# 2. AI WASTE SCANNER
# ─────────────────────────────────────────────────────────────────────────────
elif page == "📷 AI Waste Scanner":
    st.title("📷 AI Waste Scanner & Weight Estimation")
    st.write("Upload a photo of a waste bin. Gemini Vision detects individual items and estimates batch weight.")

    if WasteClassifier is None:
        st.error(f"❌ AI Classifier failed to load: {_classifier_error}\n\nCheck that the `backend/` folder is present.")
        st.stop()

    conn = get_db()
    bins_rows = conn.execute("SELECT id, name, building, floor FROM bins WHERE is_active = 1").fetchall()
    conn.close()

    if not bins_rows:
        st.warning("No active bins found in the database. Please add bins first.")
        # Allow scanning without a bin by using a placeholder
        selected_bin_id = None
        submitted_by = st.text_input("Auditor Name", value="Campus Auditor")
    else:
        bin_options = {f"{b['name']} ({b['building']} - {b['floor']})": b["id"] for b in bins_rows}
        col_input1, col_input2 = st.columns(2)
        with col_input1:
            selected_bin_label = st.selectbox("Select Bin Location", list(bin_options.keys()))
            selected_bin_id = bin_options[selected_bin_label]
            submitted_by = st.text_input("Auditor Name", value="Campus Auditor")
        with col_input2:
            weight_mode = st.radio("Weight Measurement Mode", ["AI Estimation (from Photo)", "Manual Scale Entry"])
            manual_weight = None
            if weight_mode == "Manual Scale Entry":
                manual_weight = st.number_input("Enter Scale Weight (kg)", min_value=0.01, step=0.1, value=1.2)

    if bins_rows:
        upload_source = st.radio("Photo Source", ["Upload File", "Take Live Photo"], horizontal=True)
        uploaded_file = None
        if upload_source == "Upload File":
            uploaded_file = st.file_uploader("Upload Bin Photo", type=["jpg", "jpeg", "png"])
        else:
            uploaded_file = st.camera_input("Take Live Bin Photo")

        if uploaded_file is not None:
            image = Image.open(uploaded_file).convert("RGB")
            st.image(image, caption="Uploaded Bin Photo", use_container_width=True)

            if st.button("🚀 Run AI Vision & Weight Estimation", type="primary"):
                with st.spinner("AI analyzing waste composition and estimating weight..."):
                    # Save temp image using tempfile (safe on Streamlit Cloud)
                    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                        temp_path = tmp.name
                        image.save(tmp, format="JPEG")

                    try:
                        classifier = WasteClassifier()
                        res = classifier.classify(temp_path)
                    finally:
                        try:
                            os.unlink(temp_path)
                        except Exception:
                            pass

                items = res.get("items", [])
                est_weight = res.get("estimated_weight_kg")
                weight_conf = res.get("weight_confidence")
                weight_notes = res.get("weight_notes")

                st.success(f"✅ Analysis Complete! Model: `{res.get('model_name')}` in {res.get('processing_time_ms', 0):.0f}ms")

                # ── Weight Estimate Card ──────────────────────────────────
                st.markdown("### ⚖️ Weight Estimation")
                w_col1, w_col2 = st.columns([1, 2])
                final_weight = est_weight if (weight_mode.startswith("AI") and est_weight) else manual_weight
                with w_col1:
                    if est_weight:
                        st.metric(
                            "AI Estimated Weight",
                            f"{est_weight:.2f} kg",
                            f"Confidence: {int((weight_conf or 0.8) * 100)}%"
                        )
                    elif final_weight:
                        st.metric("Scale Weight", f"{final_weight:.2f} kg")
                    else:
                        st.metric("Weight", "N/A")
                with w_col2:
                    if weight_notes:
                        st.info(f"**AI Reasoning:** {weight_notes}")

                # ── Draw Bounding Boxes ───────────────────────────────────
                draw_img = image.copy()
                draw = ImageDraw.Draw(draw_img)
                img_w, img_h = draw_img.size

                for idx, it in enumerate(items):
                    bx = it.get("bbox_x", 0)
                    by = it.get("bbox_y", 0)
                    bw = it.get("bbox_w", 50)
                    bh = it.get("bbox_h", 50)
                    is_contam = it.get("is_contamination", False)
                    color = "#EF4444" if is_contam else "#10B981"
                    # Clamp to image bounds
                    x1 = max(0, min(bx, img_w - 1))
                    y1 = max(0, min(by, img_h - 1))
                    x2 = max(0, min(bx + bw, img_w))
                    y2 = max(0, min(by + bh, img_h))
                    draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
                    label_text = f"#{idx+1} {it.get('class_name', '?')} ({int(it.get('confidence', 0)*100)}%)"
                    draw.text((x1 + 4, max(0, y1 - 14)), label_text, fill=color)

                st.markdown("### 🎯 Detection Map")
                st.image(draw_img, caption="AI Vision Detections (Green = Recyclable, Red = Contaminant)", use_container_width=True)

                # ── Breakdown Metrics ─────────────────────────────────────
                total = len(items)
                plastics = sum(1 for i in items if i.get("class_name") in PLASTIC_CLASSES)
                contams = sum(1 for i in items if i.get("is_contamination"))
                rate = (contams / total * 100) if total > 0 else 0

                m1, m2, m3, m4 = st.columns(4)
                m1.metric("Total Items Detected", total)
                m2.metric("Plastic Items", plastics)
                m3.metric("Contaminants", contams)
                m4.metric("Contamination Rate", f"{rate:.1f}%")

                # Items table
                st.markdown("### 📋 Detected Objects")
                if items:
                    df_items = pd.DataFrame(items)
                    # Show only columns that actually exist
                    show_cols = [c for c in ["class_name", "label", "confidence", "is_contamination"] if c in df_items.columns]
                    st.dataframe(df_items[show_cols], use_container_width=True)
                else:
                    st.info("No items detected. Try a clearer photo.")

                # ── Save to DB ────────────────────────────────────────────
                if selected_bin_id and total > 0:
                    conn2 = get_db()
                    c2 = conn2.cursor()
                    # Save photo bytes
                    upload_dir = os.path.join(BASE_DIR, "backend", "uploads")
                    os.makedirs(upload_dir, exist_ok=True)
                    import hashlib, time as _time
                    fname = f"scan_{int(_time.time())}.jpg"
                    photo_save = os.path.join(upload_dir, fname)
                    image.save(photo_save, "JPEG")
                    relative_photo = os.path.join("uploads", fname)

                    # Create audit record
                    c2.execute(
                        """INSERT INTO audits (bin_id, photo_path, measured_weight_kg, status, submitted_by)
                           VALUES (?, ?, ?, 'completed', ?)""",
                        (selected_bin_id, relative_photo, final_weight or est_weight, submitted_by)
                    )
                    audit_id = c2.lastrowid

                    # Create ai_predictions record
                    c2.execute(
                        """INSERT INTO ai_predictions
                           (audit_id, model_name, confidence_threshold, is_demo_mode,
                            processing_time_ms, estimated_weight_kg, weight_confidence, weight_notes)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                        (audit_id, res.get("model_name"), 0.7,
                         1 if res.get("is_demo_mode") else 0,
                         res.get("processing_time_ms", 0),
                         est_weight, weight_conf, weight_notes)
                    )
                    pred_id = c2.lastrowid

                    # Insert detected items
                    contam_count = 0
                    plastic_count = 0
                    recyc_count = 0
                    for it in items:
                        is_c = 1 if it.get("is_contamination") else 0
                        contam_count += is_c
                        if it.get("class_name") in PLASTIC_CLASSES:
                            plastic_count += 1
                        if it.get("class_name") in RECYCLABLE_CLASSES:
                            recyc_count += 1
                        c2.execute(
                            """INSERT INTO detected_items
                               (prediction_id, class_name, confidence, bbox_x, bbox_y, bbox_w, bbox_h,
                                is_contamination, human_verified, label)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)""",
                            (pred_id, it.get("class_name"), it.get("confidence", 0),
                             it.get("bbox_x", 0), it.get("bbox_y", 0),
                             it.get("bbox_w", 50), it.get("bbox_h", 50),
                             is_c, it.get("label", ""))
                        )

                    # Insert audit summary
                    contam_rate = contam_count / total if total > 0 else 0
                    c2.execute(
                        """INSERT INTO audit_summaries
                           (audit_id, total_items_detected, plastic_items, recyclable_items,
                            contamination_count, contamination_rate)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        (audit_id, total, plastic_count, recyc_count, contam_count, contam_rate)
                    )
                    conn2.commit()
                    conn2.close()
                    st.success(f"💾 Scan saved as Audit #{audit_id}")

# ─────────────────────────────────────────────────────────────────────────────
# 3. REVIEW QUEUE
# ─────────────────────────────────────────────────────────────────────────────
elif page == "📋 Review Queue":
    st.title("📋 Human-in-the-Loop Review Queue")
    st.write("Verify AI detections with confidence below threshold.")

    conn = get_db()
    c = conn.cursor()
    items = c.execute(
        """
        SELECT i.id, i.class_name, i.label, i.confidence, i.is_contamination,
               i.human_verified, a.id as audit_id, a.photo_path, b.name as bin_name
        FROM detected_items i
        JOIN ai_predictions p ON i.prediction_id = p.id
        JOIN audits a ON p.audit_id = a.id
        JOIN bins b ON a.bin_id = b.id
        WHERE i.human_verified = 0 AND i.confidence < 0.90
        ORDER BY i.confidence ASC
        LIMIT 20
        """
    ).fetchall()

    if not items:
        st.success("🎉 All detections are verified or above high-confidence threshold!")
    else:
        st.warning(f"Found {len(items)} items pending human review.")
        for it in items:
            conf_pct = int((it["confidence"] or 0) * 100)
            with st.expander(f"Item #{it['id']}: {it['class_name']} ({conf_pct}% conf) — Bin: {it['bin_name']}"):
                col_a, col_b = st.columns([1, 2])
                with col_a:
                    # Try to show the audit photo
                    if it["photo_path"]:
                        photo_file = os.path.join(BASE_DIR, "backend", it["photo_path"])
                        if not os.path.exists(photo_file):
                            # Try absolute path directly
                            photo_file = it["photo_path"]
                        if os.path.exists(photo_file):
                            st.image(photo_file, width=200)
                        else:
                            st.caption("📷 Photo not available")
                    else:
                        st.caption("📷 No photo")
                with col_b:
                    st.write(f"**Current Class:** {it['class_name']}")
                    st.write(f"**AI Label:** {it['label'] or 'N/A'}")
                    st.write(f"**Contamination:** {'Yes ⚠️' if it['is_contamination'] else 'No ✅'}")
                    new_class = st.selectbox(
                        "Correct Classification",
                        ["PET Bottle", "HDPE Container", "Plastic Wrapper", "Foam Cup", "Paper", "Other"],
                        index=0,
                        key=f"sel_{it['id']}"
                    )
                    if st.button(f"✅ Confirm Item #{it['id']}", key=f"btn_{it['id']}"):
                        c.execute(
                            """
                            UPDATE detected_items
                            SET human_verified = 1, human_corrected_class = ?, verified_by = 'Auditor'
                            WHERE id = ?
                            """,
                            (new_class, it["id"])
                        )
                        conn.commit()
                        st.success(f"Item #{it['id']} verified as {new_class}!")
                        st.rerun()

    conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# 4. AUDIT HISTORY & EXPORT
# ─────────────────────────────────────────────────────────────────────────────
elif page == "🗂️ Audit History":
    st.title("🗂️ Audit History & CSV Export")
    conn = get_db()
    df_all = pd.read_sql_query(
        """
        SELECT a.id, b.name as bin_name, b.building, b.floor,
               a.measured_weight_kg as weight_kg,
               a.weight_human_confirmed,
               a.status, a.submitted_by, a.created_at,
               s.total_items_detected as items,
               ROUND(COALESCE(s.contamination_rate, 0) * 100, 1) as contam_pct
        FROM audits a
        JOIN bins b ON a.bin_id = b.id
        LEFT JOIN audit_summaries s ON s.audit_id = a.id
        ORDER BY a.created_at DESC
        """, conn
    )
    conn.close()

    if df_all.empty:
        st.info("No audits yet. Use the AI Waste Scanner to log your first scan.")
    else:
        st.dataframe(df_all, use_container_width=True)
        csv = df_all.to_csv(index=False).encode("utf-8")
        st.download_button(
            label="📥 Download Audit Data (CSV)",
            data=csv,
            file_name="ecovision_audit_history.csv",
            mime="text/csv",
        )
