import os
import io
import json
import sqlite3
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from PIL import Image, ImageDraw, ImageFont

# Set page config
st.set_page_config(
    page_title="EcoVision Audit — AI Plastic Waste Monitoring",
    page_icon="♻️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Import AI Classifier ──
import sys
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

try:
    from ai_classifier import WasteClassifier, PLASTIC_CLASSES, RECYCLABLE_CLASSES
except Exception as e:
    st.error(f"Error loading classifier: {e}")

DB_PATH = os.path.join(BASE_DIR, "backend", "ecovision.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ── Sidebar ──
st.sidebar.title("♻️ EcoVision Audit")
st.sidebar.caption("AI-Powered Campus Plastic Waste Monitoring")
page = st.sidebar.radio(
    "Navigation",
    ["📊 Dashboard", "📷 AI Waste Scanner", "📋 Review Queue", "🗂️ Audit History"],
)

st.sidebar.markdown("---")
st.sidebar.info("💡 **Streamlit Cloud Ready**\n\nRuns 100% free with Gemini Vision AI.")

# ─────────────────────────────────────────────────────────────────────────────
# 1. DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────
if page == "📊 Dashboard":
    st.title("📊 Campus Plastic Waste & Contamination Dashboard")
    st.write("Real-time monitoring of campus recycling performance and contamination hotspots.")

    conn = get_db()
    c = conn.cursor()

    # KPI counts
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
            st.write("No item data yet.")

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
        if not df_hotspots.empty:
            fig_bar = px.bar(
                df_hotspots, x="bin_name", y="contam_rate",
                color="contam_rate",
                color_continuous_scale="Reds",
                labels={"contam_rate": "Contamination %", "bin_name": "Bin"},
                hover_data=["building", "audits"]
            )
            st.plotly_chart(fig_bar, use_container_width=True)

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
    st.dataframe(df_recent, use_container_width=True)
    conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# 2. AI WASTE SCANNER
# ─────────────────────────────────────────────────────────────────────────────
elif page == "📷 AI Waste Scanner":
    st.title("📷 AI Waste Scanner & Weight Estimation")
    st.write("Upload a photo of a waste bin. Gemini Vision detects individual items and estimates batch weight.")

    conn = get_db()
    bins = conn.execute("SELECT id, name, building, floor FROM bins WHERE is_active = 1").fetchall()
    bin_options = {f"{b['name']} ({b['building']} - {b['floor']})": b["id"] for b in bins}

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

    upload_source = st.radio("Photo Source", ["Upload File", "Take Live Photo"], horizontal=True)
    uploaded_file = None
    if upload_source == "Upload File":
        uploaded_file = st.file_uploader("Upload Bin Photo", type=["jpg", "jpeg", "png"])
    else:
        uploaded_file = st.camera_input("Take Live Bin Photo")

    if uploaded_file is not None:
        image = Image.open(uploaded_file).convert("RGB")
        st.image(image, caption="Uploaded Bin Photo", use_column_width=True)

        if st.button("🚀 Run AI Vision & Weight Estimation", type="primary"):
            with st.spinner("AI analyzing waste composition and estimating weight..."):
                # Save temp image for classifier
                temp_path = os.path.join(BASE_DIR, "backend", "uploads", "temp_scan.jpg")
                os.makedirs(os.path.dirname(temp_path), exist_ok=True)
                image.save(temp_path, "JPEG")

                classifier = WasteClassifier()
                res = classifier.classify(temp_path)

                items = res.get("items", [])
                est_weight = res.get("estimated_weight_kg")
                weight_conf = res.get("weight_confidence")
                weight_notes = res.get("weight_notes")

                st.success(f"Analysis Complete! Model: `{res.get('model_name')}` in {res.get('processing_time_ms', 0):.0f}ms")

                # ── Weight Estimate Card ──
                st.markdown("### ⚖️ Weight Estimation")
                w_col1, w_col2 = st.columns([1, 2])
                final_weight = est_weight if weight_mode.startswith("AI") else manual_weight
                with w_col1:
                    if est_weight:
                        st.metric("AI Estimated Weight", f"{est_weight:.2f} kg", f"Confidence: {int((weight_conf or 0.8)*100)}%")
                    else:
                        st.metric("Scale Weight", f"{final_weight:.2f} kg")
                with w_col2:
                    if weight_notes:
                        st.info(f"**AI Reasoning:** {weight_notes}")

                # ── Draw Bounding Boxes ──
                draw_img = image.copy()
                draw = ImageDraw.Draw(draw_img)
                w, h = draw_img.size

                for idx, it in enumerate(items):
                    bx, by, bw, bh = it["bbox_x"], it["bbox_y"], it["bbox_w"], it["bbox_h"]
                    is_contam = it.get("is_contamination", False)
                    color = "#EF4444" if is_contam else "#10B981"
                    draw.rectangle([bx, by, bx + bw, by + bh], outline=color, width=4)
                    label_text = f"#{idx+1} {it['class_name']} ({int(it['confidence']*100)}%)"
                    draw.text((bx + 4, max(0, by - 14)), label_text, fill=color)

                st.markdown("### 🎯 Detection Map")
                st.image(draw_img, caption="AI Vision Detections (Green = Recyclable, Red = Contaminant)", use_column_width=True)

                # ── Breakdown Metrics ──
                total = len(items)
                plastics = sum(1 for i in items if i["class_name"] in PLASTIC_CLASSES)
                contams = sum(1 for i in items if i["is_contamination"])
                rate = (contams / total * 100) if total > 0 else 0

                m1, m2, m3, m4 = st.columns(4)
                m1.metric("Total Items Detected", total)
                m2.metric("Plastic Items", plastics)
                m3.metric("Contaminants", contams)
                m4.metric("Contamination Rate", f"{rate:.1f}%")

                # Items table
                st.markdown("### 📋 Detected Objects")
                df_items = pd.DataFrame(items)
                if not df_items.empty:
                    st.dataframe(df_items[["class_name", "label", "confidence", "is_contamination"]], use_container_width=True)

    conn.close()

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
        LIMIT 20
        """
    ).fetchall()

    if not items:
        st.success("🎉 All detections are verified or above high-confidence threshold!")
    else:
        st.warning(f"Found {len(items)} items pending human review.")
        for it in items:
            with st.expander(f"Item #{it['id']}: {it['class_name']} ({int(it['confidence']*100)}% conf) — Audit #{it['audit_id']}"):
                col_a, col_b = st.columns([1, 2])
                with col_a:
                    photo_file = os.path.join(BASE_DIR, "backend", it["photo_path"])
                    if os.path.exists(photo_file):
                        st.image(photo_file, width=200)
                with col_b:
                    st.write(f"**Current Class:** {it['class_name']}")
                    st.write(f"**AI Label:** {it['label']}")
                    st.write(f"**Contamination:** {'Yes' if it['is_contamination'] else 'No'}")
                    new_class = st.selectbox(
                        "Correct Classification",
                        ["PET Bottle", "HDPE Container", "Plastic Wrapper", "Foam Cup", "Paper", "Other"],
                        index=0, key=f"sel_{it['id']}"
                    )
                    if st.button(f"Confirm Item #{it['id']}", key=f"btn_{it['id']}"):
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
               a.measured_weight_kg as weight_kg, a.weight_human_confirmed,
               a.status, a.submitted_by, a.created_at,
               s.total_items_detected as items,
               s.contamination_rate * 100 as contam_pct
        FROM audits a
        JOIN bins b ON a.bin_id = b.id
        LEFT JOIN audit_summaries s ON s.audit_id = a.id
        ORDER BY a.created_at DESC
        """, conn
    )
    st.dataframe(df_all, use_container_width=True)

    csv = df_all.to_csv(index=False).encode("utf-8")
    st.download_button(
        label="📥 Download Audit Data (CSV)",
        data=csv,
        file_name="ecovision_audit_history.csv",
        mime="text/csv",
    )
    conn.close()
