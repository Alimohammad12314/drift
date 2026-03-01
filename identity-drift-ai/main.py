from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY=os.getenv("GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-2.5-flash")
app = FastAPI()




app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Metric(BaseModel):
    sleep: float
    work_hours: float
    mood: float

class DataInput(BaseModel):
    metrics: List[Metric]



@app.post("/analyze")
def analyze(data: DataInput):

    # ---- Convert input to DataFrame ----
    df = pd.DataFrame([m.dict() for m in data.metrics])

    # ---- BASELINE (PAST) ----
    baseline_mean = df.mean()
    baseline_std = df.std().replace(0, 1)

    latest = df.iloc[-1]

    # ---- PRESENT DRIFT ----
    drift_scores = {}

    for col in df.columns:
        z_score = (latest[col] - baseline_mean[col]) / baseline_std[col]
        drift_scores[col] = round(float(z_score), 2)

    abs_drifts = [abs(v) for v in drift_scores.values()]
    identity_drift_index = round(sum(abs_drifts) / len(abs_drifts), 2)

    # ---- REFLECTIVE CLASSIFICATION ----
    if identity_drift_index < 0.5:
        status = "In Balance"
        message = "Your recent days look similar to your usual rhythm."
    elif identity_drift_index < 1.0:
        status = "Gentle Shift"
        message = "There are small changes compared to your usual pattern."
    elif identity_drift_index < 2.0:
        status = "Noticeable Shift"
        message = "Your recent behavior differs from what’s typical for you."
    else:
        status = "Strong Shift"
        message = "Your current pattern is quite different from your usual baseline."

    # ---- EXPLAINABILITY LAYER ----
    explanations = []

    for col in df.columns:
        current_value = latest[col]
        baseline_value = baseline_mean[col]
        drift_value = drift_scores[col]
        magnitude = abs(drift_value)

        if magnitude < 0.5:
            continue

        if drift_value > 0:
            direction = "higher"
        else:
            direction = "lower"

        # Magnitude description (easy for users)
        if magnitude < 1:
            intensity = "slightly different"
        elif magnitude < 2:
            intensity = "moderately different"
        else:
            intensity = "significantly different"

        explanation = (
            f"{col.replace('_', ' ').title()} is {direction} than your usual "
            f"average ({round(baseline_value,2)}). "
            f"This is {intensity} compared to your normal pattern."
        )

        explanations.append(explanation)

    # ---- FUTURE PROJECTION ----
    X = np.arange(len(abs_drifts)).reshape(-1, 1)
    y = np.array(abs_drifts)

    model = LinearRegression()
    model.fit(X, y)

    future_X = np.array([[len(abs_drifts) + 7]])
    future_prediction = model.predict(future_X)[0]
    future_projection = max(0, round(float(future_prediction), 2))

    if future_projection <= identity_drift_index:
        future_message = "Your pattern appears steady."
    else:
        future_message = "If this direction continues, your rhythm may drift further."

    # ---- FINAL STRUCTURED RESPONSE ----
    return {
        "past": {
            "baseline_mean": baseline_mean.to_dict()
        },
        "present": {
            "drift_scores": drift_scores,
            "identity_drift_index": identity_drift_index,
            "status": status,
            "reflection": message,
            "explanations": explanations
        },
        "future": {
            "projected_identity_index": future_projection,
            "direction_message": future_message
        }
    }
    
@app.post("/ai-insight")
def generate_ai_insight(payload: dict):

    drift_history = payload.get("drift_history")
    mood_history = payload.get("mood_history")
    top_contributor = payload.get("top_contributor")
    reflection = payload.get("reflection")

    system_context = """
    You are an AI behavioral reflection assistant integrated into a system called
    "Past • Present • Future". Tone should feel caring, grounded, and reflective — not technical.
Use natural language, not bullet-heavy formatting.

    SYSTEM EXPLANATION:
    - The Drift Score measures how different a user's recent behavior is
      compared to their personal baseline.
    - It is calculated from sleep hours, work hours, and end-of-day mood.
    - A lower Drift Score (0–1) means the user is aligned with their normal rhythm.
    - A higher Drift Score (>1.5) indicates noticeable deviation from routine.
    - This is NOT a stress score.
    - This is NOT a mental health diagnosis.
    - This is NOT a clinical assessment.

    MOOD SCALE:
    5 = Happy
    4 = Calm
    3 = Neutral
    2 = Sad
    1 = Frustrated

    Your role:
    - Explain behavioral patterns clearly.
    - Offer preventative, gentle, practical suggestions.
    - Avoid medical language.
    - Avoid diagnosing.
    - Do not mention therapy or clinical treatment.
    - Keep tone calm and supportive.
    - Encourage self-awareness.
    """

    user_data = f"""
    USER DATA:

    Drift history (recent days):
    {drift_history}

    Mood history (recent days):
    {mood_history}

    Largest contributor to drift:
    {top_contributor}

    User reflection (if provided):
    {reflection}
    """

    task_instruction = """
TASK:

Respond in a warm, human, supportive tone — like a thoughtful mentor.

Structure your response as:

1. A short, empathetic observation of the user's recent pattern.
2. A deeper interpretation of what might be happening behaviorally.
3. 3 practical but realistic suggestions (small, achievable changes).
4. 1 reflective question that encourages awareness.
5. End with one reassuring sentence.

Make it feel personal and conversational.
Avoid sounding clinical or robotic.
Avoid medical or diagnostic language.
Keep response under 220 words.
"""

    full_prompt = system_context + user_data + task_instruction

    response = model.generate_content(full_prompt)

    return {"insight": response.text}


@app.post("/explain-drift")
def explain_drift(payload: dict):

    current_drift = payload.get("current_drift")
    projected_drift = payload.get("projected_drift")
    status = payload.get("status")
    explanations = payload.get("explanations")

    prompt = f"""
You are a calm and thoughtful behavioral reflection assistant.

The user sees a Drift Score in a system called "Past • Present • Future".

Drift Score Explanation Context:
- Drift Score measures how different recent behavior is from personal baseline.
- It is calculated using sleep hours, work hours, and end-of-day mood.
- Lower values (0–1) = aligned with normal rhythm.
- Around 1–2 = noticeable change.
- Above 2 = strong deviation.
- This is NOT a stress score.
- This is NOT a mental health diagnosis.

User Data:
Current Drift Score: {current_drift}
Status Label: {status}
Projected Drift Score (7-day trend): {projected_drift}

Top Contributors:
{explanations}

Your task:
1. Explain clearly what this specific score means.
2. Explain whether it indicates small variation or meaningful shift.
3. Explain what the projected future value suggests.
4. Reassure the user that projection is directional, not destiny.
5. Keep tone warm, human, supportive.
6. Avoid medical or clinical language.
7. Keep under 200 words.
8. Do not use bullet-heavy formatting.

Make it feel like you're speaking to one person.
"""

    try:
        response = model.generate_content(prompt)
        return {"insight": response.text}

    except Exception:
        return {"insight": "Explanation temporarily unavailable due to API limits."}