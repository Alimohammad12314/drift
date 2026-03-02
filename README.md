# 🌊 DRIFT
### Past • Present • Future — A Behavioral Alignment System

> Drift detects when your daily rhythm begins to shift — before burnout, breakdown, or imbalance fully manifests.

---

## 🧠 What Is Drift?

Drift measures how different your recent behavior is from your **own personal baseline**.

It analyzes:

| Metric | Description |
|--------|-------------|
| 💤 Sleep Duration | Hours of sleep per night |
| 💼 Work Hours | Daily hours worked |
| 🙂 Emotional Tone | End-of-day mood score (1–5) |

Using **statistical deviation modeling**, Drift computes a **Drift Index** — a standardized measure of how far today's behavior deviates from your typical rhythm.

> This is not a stress score.  
> This is not a diagnosis.  
> **This is behavioral alignment modeling.**

---

## 📊 How It Works

### 1️⃣ Personal Baseline Modeling

We compute the user's historical **mean** and **standard deviation** for:
- Sleep
- Work hours
- Mood

This creates a **personal behavioral fingerprint**.

---

### 2️⃣ Drift Index Calculation

For the latest day, we compute a **z-score** for each metric:

$$z = \frac{(current - baseline\ mean)}{baseline\ std}$$

The final **Drift Index** is the average magnitude of standardized deviations across all metrics:

| Status | Range | Visual Indicator |
| :--- | :--- | :--- |
| **Aligned** | 0.0 – 0.8 | 🟢 |
| **Minor Shift** | 0.8 – 1.5 | 🟡 |
| **Noticeable Change** | 1.5 – 3.0 | 🟠 |
| **Strong Drift** | 3.0+ | 🔴 |

> **"How different am I from myself?"**

---

### 3️⃣ Future Projection

We apply **linear regression** to recent deviation patterns to estimate where drift may trend in the **next 7 days** if behavior continues unchanged.

This projection is:
- **Directional** — shows the likely trajectory
- **Preventative** — surfaces trends before they compound
- **Non-diagnostic** — models trajectory, not destiny

---

### 4️⃣ AI Interpretation Layer

We integrate **Claude (claude-sonnet-4-6)** to:

- Explain drift in human language
- Interpret trend direction
- Suggest small, realistic adjustments
- Encourage reflective awareness

| Endpoint | Purpose |
|----------|---------|
| `POST /ai-insight` | Deep behavioral interpretation |
| `POST /explain-drift` | Clear explanation of drift score |

**AI tone is:** Supportive · Non-clinical · Preventative · Reflective

---

## 🖥️ Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-FF6384?style=for-the-badge)

### Backend
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)

### Deployment
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

---

## 🧩 Architecture

```
User Input
    ↓
FastAPI Statistical Engine
    ↓
Drift Index + Projection
    ↓
AI Contextual Layer (GEMINI)
    ↓
Behavioral Insight
```

---

## 🚀 Installation (Local Development)

### Backend

```bash
git clone <repo>
cd identity-drift-ai
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Create a `.env` file:

```env
GEMINI_API_KEY=your_key_here
```

### Frontend

```bash
cd drift-ui
npm install
npm run dev
```

---

## 📌 Core Endpoints

### `POST /analyze`
Returns:
- Baseline metrics (mean + std per variable)
- Drift Index
- Per-metric z-score contributors
- 7-day projection




### `POST /ai-insight`
Returns:
- Deep behavioral interpretation
- Personalized adjustment suggestions
- Reflective prompt

---

### `POST /explain-drift`
Returns:
- Clear explanation of current drift score
- Interpretation of projected trend

---

## 🎯 Why This Matters

Most systems detect burnout **after** it happens.

Drift detects:
- Early pattern misalignment
- Gradual behavioral entropy
- Subtle routine shifts

**Before they compound.**

It is:
- **Personalized** — you are compared only to yourself
- **Statistical** — grounded in deviation modeling
- **Preventative** — surfaces signals early
- **Human-centered** — designed with care and transparency

---

## 🛡️ Ethical Design

- ❌ No clinical claims
- ❌ No mental health diagnosis
- ❌ No therapy replacement
- ✅ User compared only to themselves
- ✅ Fully transparent metric logic
- ✅ AI tone is supportive, not prescriptive

---

## 🌟 Roadmap

- [ ] Confidence intervals on projection
- [ ] Volatility scoring
- [ ] Behavioral acceleration detection
- [ ] Weekly AI summaries
- [ ] What-if simulation modeling

---


---

<p align="center">
  <em>Drift is not a diagnosis. It is a mirror — held up to your own rhythm.</em>
</p>
