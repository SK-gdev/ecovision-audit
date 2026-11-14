# Problem Context and Goals

University campuses generate large amounts of plastic waste, and improper sorting can drastically reduce recycling efficacy.  Studies find **40–70% contamination** in campus recycling streams due to ambiguous bins and user error.  In India, the situation is especially acute: fewer than 14% of higher-education institutions track waste data digitally, and segregation compliance gaps are on the order of 27–34 percentage points.  Thus, the goal is to design an **AI/ML‐assisted audit system** that helps quantify and reduce mixed plastic waste on campus.  The system should be feasible for a first-year B.Tech team: practical, low-cost, and extensible. It must **measure** the composition of bin contents (by count and weight of plastic types) and **alert humans** to mis-sorted items.  Any solution will still rely on human oversight (especially since image classifiers can misjudge mixed or occluded waste), but AI can automate routine auditing and identify problem hotspots.

# Proposed Solution Overview

We propose a **camera+weight waste audit system** augmented with smartphone/QR-based logging.  In its simplest form, custodial staff or student volunteers scan a QR code on each bin (identifying the location), then use a smartphone or fixed camera to photograph that bin’s contents and record the bin’s weight (using a scale or load sensor).  These images are sent to an on-site or cloud server running a trained vision model which **detects and classifies common items** (e.g. PET bottles, HDPE containers, plastic films/wrappers, foam cups, and “other”/paper).  The model outputs counts (and an estimated weight fraction) of each category.  Low-confidence detections (e.g. <70% probability) are flagged for manual review. All data (counts, weights, images, bin ID) feed into a database and web dashboard, which displays trends and contamination metrics.  Figure 1 sketches this workflow. 

 

- **Data capture:** Use a standard camera (smartphone or Raspberry Pi camera).  A QR code on each bin links to a simple web form (or app) for inputting location, date, and weight.  The user snaps one or more photos of bin contents.  
- **AI processing:** A trained CNN-based object detector (e.g. a small YOLOv5 or SSD model) ingests the image and outputs bounding boxes and labels for items.  Alternatively, if objects are sorted before imaging, a classifier can label entire images.  The system counts items per category and flags any that don’t match the bin’s intended type (i.e. “contaminants”).  
- **Human-in-the-loop:** Items or bin photos with low-confidence labels are routed to a “check bin” for manual sorting. A simple red/green light or on-screen message can prompt the user to verify uncertain cases.  
- **Dashboard/KPIs:** All daily data feed an analytics dashboard. Key metrics include total weight by plastic category, bin fill levels, and **contamination rate** (e.g. non-PET items found in PET bins). Charts show monthly trends and identify hotspots (bins or locations with frequent contamination).  

Advanced options (future scope) include adding IoT sensors (ultrasonic fill-level sensors, Wi-Fi modules) for automated monitoring, and even robotic sorting.  However, for a first-year team we **start simple**: a proof‐of‐concept using off-the-shelf hardware and open-source software.  

# System Architecture

A practical architecture is illustrated below. A smartphone or Raspberry Pi camera captures images; a scale (digital or load-cell sensor) captures weight. These connect via Wi-Fi or USB to a local server (PC or Raspberry Pi 4) running the AI model and database. Data can optionally sync to cloud (e.g. Google Firebase) for storage and dashboarding. 

 

- **Edge components:** Each bin area has a **bin terminal** comprising a camera (e.g. Pi Camera Module or USB webcam) and a load cell under the bin. An ESP32 or Pi reads sensors and takes the photo.  
- **Network:** Terminals send data to a local server (e.g. school computer or cloud VM). If Wi-Fi is unavailable, data can be stored on SD cards and uploaded daily.  
- **Server/Processing:** A PC or Pi runs the vision model (TensorFlow/PyTorch) and a small database (e.g. SQLite or Firebase). Model inference happens here (batch or real-time).  
- **Dashboard:** A web dashboard (built with Python Flask/Dash or Google Data Studio) queries the database to display charts of **weight by type**, **item counts**, and **contamination percentage** by bin/location.  

This setup separates capture from processing, so the heavy ML runs on a single machine. In future, one could push inference to the edge (TensorFlow Lite on Pi), but initially we can simply transfer images and use a more capable CPU/GPU on the server.  

# Hardware and Software Stack

A minimal prototype might include:  
- **Camera:** Any fixed camera or phone camera (1080p recommended). For continuous use, a Raspberry Pi 4 with a PiCamera Module (≈₹800) is low-cost and Wi-Fi–enabled.  
- **Weight sensor:** A cheap digital scale (₹500–1000) or load cell + HX711 module (₹150) to measure bin weight. A microcontroller (Arduino/ESP32, ₹300) can read the HX711.  
- **Compute:** A Raspberry Pi 4 (8GB, ₹6000–₹8000) or a lab PC to host the model and database.  
- **QR codes:** Printed labels for each bin (negligible cost). A simple Google Form or custom web form (HTML/Flask) records bin ID, weight, and uploads images.  
- **Software:** Python 3 with libraries (TensorFlow or PyTorch, OpenCV for image processing, Flask/Django or Streamlit for dashboards). Mobile/Chrome browser app for scanning QR (e.g. Google Lens or built-in camera).  

We avoid specialized hardware (no robotic arms or expensive servers) at first. For on-device inference, TensorFlow Lite models can run on the Pi’s CPU. If students already have laptops, they can also use USB webcams and microcontrollers instead of buying new gear.

# Data Collection and Annotation

**Dataset:** We must collect images of campus-specific waste items.  We recommend combining an existing waste dataset with custom photos.  For example, Kunwar’s **Garbage Dataset (GD)** (2026) provides 12,259 labeled images across 10 waste categories.  Although its classes differ (metal, glass, plastic, etc.), it shows that large datasets are feasible.  Students can start with GD or similar open sets (e.g. **TACO**, **TrashNet**) to pretrain models.  Then **augment with campus photos**: take hundreds of pictures of bottles, wrappers, foam cups, etc., in realistic bin backgrounds.

**Annotation:** Label images with the target categories.  If using object detection, draw bounding boxes around items and tag classes (labels: PET, HDPE, film, foam, other).  If using image-level classification, ensure each training image has a dominant item.  Tools like LabelImg or VoTT can help.  Aim for at least a few hundred examples per class.  Balance the dataset as much as possible – [56] notes GD had heavy class imbalance (plastics and paper dominating).  Here, encourage students to gather underrepresented classes (e.g. foam cups).

**Validation/Test:** Reserve ~20% of images for validation. Since backgrounds vary (bins, desks, hands holding waste), include that variety in training so the model generalizes.  It’s crucial to test on *real bin photos* (mixtures of items) even if not part of training: measure how often the model misses objects or mislabels contaminants.  Use metrics like precision/recall per class and overall accuracy (or F1-score), as well as “contamination rate” (the fraction of non-target items a bin model would see).  

# Model and Training

For a first-year project, a reasonable choice is a **pretrained CNN** fine-tuned on waste images. Two main approaches:

- **Object Detection:** Models like **YOLOv5/nano** or **SSD MobileNet** detect and classify multiple items in one image. This handles mixed contents well but requires more annotation effort (bounding boxes). For example, Balasundaram *et al.* (2026) deployed a YOLOE-26 detector on a Raspberry Pi for campus waste, achieving ~74% accuracy on seven classes. We could use a smaller YOLOv5 (nano or s/m) model and train it on our labeled bins. Even a moderate model can run on Pi after quantization (Balasundaram et al. achieved a 41.8MB quantized model).

- **Image Classification:** Alternatively, train a multiclass classifier (e.g. MobileNetV2, EfficientNet-lite) on cropped item images. In deployment, the camera or app would capture one item at a time (e.g. manually hold each item near camera). This is simpler conceptually. For example, Kunwar’s GD work found **EfficientNetV2S** gave 95% accuracy on 10 waste categories. A lightweight version (MobileNetV2 or EfficientNet-lite) could achieve 80–90% on 4–5 plastic classes.

Given limited data, **transfer learning** is key. Start with a model pretrained on ImageNet, replace the final layer(s) with our classes, and fine-tune on our waste images. Augment data with rotations/brightness changes to simulate different lighting in bins.  Measure performance with cross-entropy loss and monitor per-class precision/recall.  Also track a **contamination metric**: e.g. if a “plastic bin” image is predicted with “other” category present, count as contamination.  

**Evaluation:** We should report metrics on a held-out test set. Standard metrics: accuracy, precision, recall and F1 per class. Since some classes (like “film wrappers”) may be visually challenging, also measure the model’s confidence distribution. A useful KPI is the **percentage of items flagged as low-confidence**, which estimate how often a human must intervene.  

# Dashboard and KPIs

The system’s analytics should focus on **weight and type trends** plus contamination. For each bin or location and time period, track: 
- Total weight collected 
- Weight by material category (e.g. PET vs. HDPE vs. film vs. other) 
- Item counts by category 
- **Contamination rate** = (weight or count of non-target items / total).  

These can be shown as time series (daily/weekly/monthly) and heatmaps by bin location. For example, a dashboard pane might show “Weekly trend of PET bottles (kg)” and “Top 5 bins by contamination rate this month.”  Filters allow selecting specific bins or building zones. Student teams can build a simple web dashboard (e.g. using Plotly Dash or Google Data Studio) that connects to the collected data (in Google Sheets or a small SQL database).  

Key performance indicators include: **segregation accuracy** (fraction of correctly sorted items), **recycling yield** (kg of clean recyclables vs. contaminated), and **engagement metrics** (e.g. number of audits logged).  Over time, success is measured by reduction in contamination (target: <20% contaminants), and by increased total recyclable plastic collected (as mis-sorted waste is re-directed).  

# Human‐in‐the‐Loop and Safety Design

Because image models are imperfect, human oversight is built in. In practice, the workflow might be: an assistant photographs a bin, the AI “suggests” classifications, then a staffer quickly scans the AI’s output on a tablet or printout. Any item with low model confidence or ambiguous label goes into a “check bin” for manual sorting (as in the original proposal). This **HIL loop** ensures bad predictions don’t ruin a recycling load. Safety is also considered: any sharp or hazardous items found are handled according to campus rules (e.g. puncture-proof gloves).  We assume the team will not implement any heavy machinery (like actual robotic arms) without extensive safety shielding.  

# Pilot Implementation Steps

1. **Define scope:** Start with a small pilot – e.g. one building or a few plastic bins. Get permission and clean out these bins to empty initial content.
2. **QR/Logging setup:** Attach QR codes to bins and configure a simple Google Form that asks for Bin-ID, date, weight, and photo upload. Test that scanning and uploading works reliably.  
3. **Data collection:** For 1–2 weeks, have a volunteer weigh and photo each target bin once per day (or every collection). This produces an initial dataset of images+weights.  
4. **Annotation & model training:** Team members label the collected images by item (this itself can be the first ML task using e.g. LabelImg). Use these plus public data to train the model, iterating until performance is acceptable on held-out images.  
5. **Deployment:** Set up the model inference (initially on laptop or Pi) so that when a new photo is taken it is automatically classified. Integrate this with the logging system – e.g. a script that reads new entries from the form, runs classification, and updates a Google Sheet.  
6. **Dashboard:** Develop the dashboard in parallel. Populate it with historical data and begin displaying live results.  
7. **Evaluate:** After 1–2 months of piloting, review metrics. Have contamination rates dropped? Are some bins much worse? Use findings to refine (e.g. retrain model on new images, improve signage at high-error bins).

# Budget Estimate (Low-Cost Prototype, India)

For an Indian campus pilot, costs can be very modest (₹). Estimated components: 
- Raspberry Pi 4 (8GB): ₹6,000 
- Pi Camera Module: ₹800 
- Load cell + HX711 (or simple scale): ₹500 
- ESP32 or Arduino (if using separate weight sensor): ₹200 
- Misc (SD card, cables): ₹500 
- Wi-Fi Dongle (if needed): ₹200 
- *Alternate:* Use an existing smartphone (no cost) + portable scale (₹1000).  
- Software: all open-source or free (TensorFlow, Python, Google Forms/Sheets).  

**Total:** ~₹10,000–15,000 (≈$120–180). Even cheaper if students use personal devices. This fits a typical student project budget.  For comparison, Kumar *et al.*’s smart-bin project used ESP32 cameras and sensors on a budget, and Mahalik *et al.* integrated ML on existing university computers.  

# Risks and Limitations

- **Model accuracy:** Lighting, occlusion, and mixed items make real-world images harder than textbook datasets. Our model may misclassify crumpled wrappers or dark bottles.  We mitigate by including varied training images and retaining human review.  
- **Scale vs. weight mismatch:** The model infers item count/volume, but true mass varies (a light plastic film vs. a heavy container). We **do not rely on vision to measure weight**, only counts; the scale provides actual mass.  
- **Privacy:** Cameras should only face bins, not people. Limit data collection to objects and bin interiors.  
- **Adoption:** The system needs someone to operate it daily. Getting campus staff or volunteers to do extra tasks can be challenging.  Early engagement and demonstrating impact can help.  
- **Generalization:** A model trained on one campus may not work elsewhere due to different waste types or backgrounds. For robustness, retrain on each campus’s own images.  
- **Hardware faults:** Sensors and cameras can fail or miscalibrate. Plan regular checks.  

# Expected Outcomes

If successful, even the simple system will yield measurable benefits.  We expect to be able to **quantify** the campus plastic stream: e.g. “Campus generated X kg PET bottles, Y kg HDPE containers last month, with Z% non-plastics in the recycling bin.”  The dashboard makes this visible to administrators and students, encouraging behavior change.  Metrics to report include:
- **Segregation accuracy:** Fraction of items the AI got right (with and without human fix). 
- **Contamination rate:** % of wrong-type items found in bins (tracked over time).  
- **Recyclables collected:** Increase in clean plastic weight collected (goal: +10–20% vs. baseline). 
- **Usage:** Number of audits/logs performed (engagement).  

Over a semester pilot, we might see contamination drop (people learn from feedback), and provide hard data (“last month we captured 50 kg of usable plastic that otherwise would’ve been lost”).  

# Future Scope (Beyond the Pilot)

Once the basics work, the project can be extended:  
- **Edge AI:** Move inference onto Raspberry Pi or even a microcontroller (Edge TPU or similar) so that classification happens in real time at the bin, without manual uploads.  For example, Pi 4 can run a quantized model like Balasundaram’s 42MB YOLO.  
- **Smart bins:** Integrate ultrasonic fill sensors and GPS/LoRa modules, as in smart-city bins, to report fullness and location. This would allow automatic alerts (“Bin 5 is 90% full”) and feed into scheduling.  
- **Route optimization:** If bins report fill levels, use ML to forecast waste generation (e.g. LSTM time-series) and optimize collection routes. This is advanced but noted in literature.  
- **Robotic sorting:** A campus lab project could build a simple sorter: e.g. an Arduino-driven conveyor or servo that directs sorted items into compartments, as a demo (Mahalik *et al.* envisioned multi-chute sorting).  
- **Education/Feedback:** Use the collected data to drive nudges – e.g. digital signage near bins showing “this bin’s contamination was 15% last week – can you help make it zero?”  

Each of these adds complexity. For now, focusing on the audit+dashboard will already yield valuable insight and a solid student learning experience.  

# Evidence and Context

Our approach is grounded in recent research.  For example, Kumar *et al.* (2026) built an **IoT smart bin**: an ESP32 camera + sensors that classifies waste as wet/dry/plastic/metal using a VGG-19 model, and plans collection routes.  Mahalik *et al.* (IJNRD 2026) proposed an integrated campus system using ML to classify waste streams (recyclable/organic/non) and optimize routing.  These show that even simple ML models can improve waste tracking and planning.  On the vision side, Kunwar (2026) achieved ~95% accuracy on a 10-class waste dataset, demonstrating the feasibility of deep learning for garbage classification, although real-world bin imagery remains challenging.  Balasundaram’s EcoSortBin (2026) shows a Raspberry Pi can run an object detector on campus trash, albeit with only ~74% accuracy after compression.  In practice, we will tailor the solution to campus scale: simpler “waste audit” capture with human checking, rather than expecting perfect automation.  

By combining these insights—camera-based classification, weight logging, QR-based location tagging, and a visualization dashboard—we arrive at a practical pilot design.  It leverages low-cost hardware (Pi/camera/sensor) and open ML models, yet directly addresses the campus waste problem highlighted in your presentation. Properly implemented, it will strengthen your project narrative with concrete methods, cite current research evidence, and prepare a roadmap from prototype to advanced smart-waste solutions. 

**Sources:** Contemporary studies in AI-enabled waste management and Indian campus waste audits. (In-text citations give lines from these sources.)