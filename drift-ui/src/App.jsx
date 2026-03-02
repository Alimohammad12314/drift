import { useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const StatRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-6 border-b border-white/5 last:border-0">
    <span className="text-slate-400 text-lg font-semibold uppercase tracking-wider">
      {label.replace("_", " ")}
    </span>
    <span className="text-white font-mono text-3xl font-bold tracking-tighter">
      {value.toFixed(1)}
    </span>
  </div>
);

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(
    JSON.parse(localStorage.getItem("drift_history")) || [],
  );
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [driftExplanation, setDriftExplanation] = useState("");
  const [driftExplainLoading, setDriftExplainLoading] = useState(false);
  const [reflectionText, setReflectionText] = useState(
    localStorage.getItem("drift_reflection") || "",
  );

  // CRITICAL THRESHOLD LOGIC
  const isCritical = data?.present?.identity_drift_index >= 2.0;

  const moodMap = { Happy: 5, Calm: 4, Neutral: 3, Sad: 2, Frustrated: 1 };
  const moodLabels = {
    5: "Happy",
    4: "Calm",
    3: "Neutral",
    2: "Sad",
    1: "Frustrated",
  };
  const moodAverageToLabel = (value) => {
    if (value >= 4.5) return "😊 Happy";
    if (value >= 3.5) return "🙂 Calm";
    if (value >= 2.5) return "😐 Neutral";
    if (value >= 1.5) return "😞 Sad";
    return "😠 Frustrated";
  };
  const getMoodTrendData = () => {
    return history.map((entry, index) => ({
      day: index + 1,
      mood: entry.mood,
    }));
  };

  const getAIInsight = async () => {
    setAiLoading(true);
    const driftHistory = calculateDailyDrift().map((d) => d.drift);
    const moodHistory = history.map((h) => h.mood);
    const contributors = calculateContributorBreakdown();
    const topContributor = contributors[0]?.label || "None";

    try {
      const response = await axios.post(
        "https://drift-0q7u.onrender.com/ai-insight",
        {
          drift_history: driftHistory,
          mood_history: moodHistory,
          top_contributor: topContributor,
          reflection: reflectionText,
        },
      );
      setAiInsight(response.data.insight);
    } catch (e) {
      console.error(e);
    }
    setAiLoading(false);
  };

  const driftRanges = [
    { range: "0.0 – 0.8", label: "Aligned", color: "bg-emerald-500" },
    { range: "0.8 – 1.5", label: "Minor Shift", color: "bg-yellow-500" },
    { range: "1.5 – 3.0", label: "Noticeable Change", color: "bg-orange-500" },
    { range: "3.0+", label: "Strong Drift", color: "bg-red-500" },
  ];
  const explainDriftScore = async () => {
    if (!data) return;

    setDriftExplainLoading(true);

    try {
      const response = await axios.post(
        "https://drift-0q7u.onrender.com/explain-drift",
        {
          current_drift: data.present.identity_drift_index,
          projected_drift: data.future.projected_identity_index,
          status: data.present.status,
          explanations: data.present.explanations,
        },
      );

      setDriftExplanation(response.data.insight);
    } catch (e) {
      setDriftExplanation("Explanation unavailable.");
    }

    setDriftExplainLoading(false);
  };

  const saveReflection = () => {
    localStorage.setItem("drift_reflection", reflectionText);
  };

  const saveToday = () => {
    const sleep = parseFloat(document.getElementById("sleep").value);
    const work = parseFloat(document.getElementById("work").value);
    const moodLabel = document.getElementById("mood").value;
    if (isNaN(sleep) || isNaN(work) || !moodLabel) return;
    const newEntry = { sleep, work_hours: work, mood: moodMap[moodLabel] };
    const updatedHistory = [...history, newEntry];
    setHistory(updatedHistory);
    localStorage.setItem("drift_history", JSON.stringify(updatedHistory));
    document.getElementById("sleep").value = "";
    document.getElementById("work").value = "";
    document.getElementById("mood").value = "";
  };

  const analyzeData = async () => {
    if (history.length < 3) {
      alert("Please log at least 3 days of data.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        "https://drift-0q7u.onrender.com/analyze",
        {
          metrics: history,
        },
      );
      setData(response.data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const calculateDailyDrift = () => {
    if (history.length < 3) return [];
    const drifts = [];
    for (let i = 2; i < history.length; i++) {
      const subset = history.slice(0, i + 1);
      const means = {
        sleep: subset.reduce((a, b) => a + b.sleep, 0) / subset.length,
        work_hours:
          subset.reduce((a, b) => a + b.work_hours, 0) / subset.length,
        mood: subset.reduce((a, b) => a + b.mood, 0) / subset.length,
      };
      const latest = subset[subset.length - 1];
      const drift =
        (Math.abs(latest.sleep - means.sleep) +
          Math.abs(latest.work_hours - means.work_hours) +
          Math.abs(latest.mood - means.mood)) /
        3;
      drifts.push({ day: i + 1, drift: parseFloat(drift.toFixed(2)) });
    }
    return drifts;
  };

  const calculateContributorBreakdown = () => {
    if (!data || history.length < 2) return [];
    const latest = history[history.length - 1];
    const means = {
      sleep: history.reduce((a, b) => a + b.sleep, 0) / history.length,
      work_hours:
        history.reduce((a, b) => a + b.work_hours, 0) / history.length,
      mood: history.reduce((a, b) => a + b.mood, 0) / history.length,
    };
    const contributions = [
      { label: "Sleep", value: Math.abs(latest.sleep - means.sleep) },
      {
        label: "Work Hours",
        value: Math.abs(latest.work_hours - means.work_hours),
      },
      { label: "Mood", value: Math.abs(latest.mood - means.mood) },
    ];
    const maxVal = Math.max(...contributions.map((c) => c.value));
    return contributions
      .map((c) => ({
        ...c,
        percent: maxVal === 0 ? 0 : (c.value / maxVal) * 100,
      }))
      .sort((a, b) => b.value - a.value);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-1000 ${isCritical ? "bg-[#0f0404]" : "bg-[#020408]"} text-slate-200 font-sans antialiased`}
    >
      {/* BACKGROUND DECORATION */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div
          className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] transition-colors duration-1000 ${isCritical ? "bg-red-600/20" : "bg-indigo-600/20"}`}
        />
        <div
          className={`absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full blur-[140px] transition-colors duration-1000 ${isCritical ? "bg-orange-600/10" : "bg-blue-600/20"}`}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-20">
        {/* HERO */}
        <header className="max-w-5xl mx-auto text-center mb-32">
          <h1 className="text-9xl font-black tracking-tighter italic mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-600">
            DRIFT
          </h1>
          <p className="text-2xl text-slate-400 leading-relaxed font-medium">
            This system compares your recent behavior to your personal baseline.
            The Drift Score measures how different your current pattern is from
            your usual rhythm. Lower values mean you're aligned with yourself.
          </p>

          {/* DAILY INPUT */}
          <div className="mt-20 bg-white/[0.03] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-10">
              Log End-of-Day Reflection
            </h3>

            <div className="grid md:grid-cols-3 gap-6">
              <input
                id="sleep"
                type="number"
                placeholder="Sleep (hrs)"
                className="bg-black/40 border border-white/10 rounded-2xl p-6 text-xl text-white outline-none focus:border-indigo-500 transition"
              />
              <input
                id="work"
                type="number"
                placeholder="Work (hrs)"
                className="bg-black/40 border border-white/10 rounded-2xl p-6 text-xl text-white outline-none focus:border-indigo-500 transition"
              />
              <select
                id="mood"
                className="bg-black/40 border border-white/10 rounded-2xl p-6 text-xl text-slate-400 outline-none focus:border-indigo-500 transition appearance-none"
              >
                <option value="" className="text-black">
                  Select Mood State
                </option>
                <option value="Happy" className="text-black">
                  😊 Happy
                </option>
                <option value="Calm" className="text-black">
                  🙂 Calm
                </option>
                <option value="Neutral" className="text-black">
                  😐 Neutral
                </option>
                <option value="Sad" className="text-black">
                  😞 Sad
                </option>
                <option value="Frustrated" className="text-black">
                  😠 Frustrated
                </option>
              </select>
            </div>

            <p className="text-sm text-slate-500 mt-6 font-medium">
              Select how you felt at the end of the day. This reflects your
              overall emotional tone.
            </p>

            <div className="flex flex-col md:flex-row gap-6 mt-10">
              <button
                onClick={saveToday}
                className="flex-1 py-5 rounded-2xl bg-white text-black text-xl font-black hover:bg-slate-200 transition active:scale-95"
              >
                SAVE TELEMETRY
              </button>
              <button
                onClick={analyzeData}
                disabled={loading}
                className={`flex-1 py-5 rounded-2xl text-white text-xl font-black border border-white/20 transition-all ${isCritical ? "bg-red-600 animate-pulse" : "bg-indigo-600 hover:opacity-90"}`}
              >
                {loading ? "PROCESSING..." : "RUN ANALYSIS"}
              </button>
            </div>

            <p className="mt-6 text-base font-bold text-slate-500 italic">
              {history.length} database entries logged
            </p>
          </div>
        </header>

        {/* RESULTS */}
        {data && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            {/* DRIFT SCORE BOX */}
            <div
              className={`border rounded-[4rem] p-12 md:p-20 backdrop-blur-3xl transition-all duration-1000 ${isCritical ? "bg-red-600/5 border-red-500/40 shadow-[0_0_80px_rgba(239,68,68,0.15)]" : "bg-white/[0.03] border-white/10"}`}
            >
              <div className="grid lg:grid-cols-2 gap-20 items-center">
                <div className="relative flex justify-center">
                  <svg className="w-80 h-80 transform -rotate-90">
                    <circle
                      cx="160"
                      cy="160"
                      r="145"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className="text-white/5"
                    />
                    <circle
                      cx="160"
                      cy="160"
                      r="145"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={911}
                      strokeDashoffset={
                        911 -
                        (Math.min(data.present.identity_drift_index, 5) / 5) *
                          911
                      }
                      strokeLinecap="round"
                      className={`transition-all duration-[2s] ease-in-out ${isCritical ? "text-red-500" : "text-indigo-500"}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className={`text-9xl font-black leading-none transition-colors duration-1000 ${isCritical ? "text-red-500" : "text-white"}`}
                    >
                      {data.present.identity_drift_index}
                    </span>
                    <span className="text-xl font-black text-slate-500 uppercase tracking-[0.4em]">
                      Drift Index
                    </span>
                  </div>
                </div>
                <div className="text-center lg:text-left">
                  <h2 className="text-6xl font-bold text-white mb-6 leading-tight">
                    {data.present.status}
                  </h2>
                  <p className="text-2xl text-slate-400 leading-relaxed mb-10">
                    {data.present.reflection}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {driftRanges.map((range, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5"
                      >
                        <div
                          className={`h-3 w-3 rounded-full ${range.color}`}
                        />
                        <span className="font-bold text-slate-300 text-sm">
                          {range.label}
                        </span>
                        <span className="text-xs text-slate-500 ml-auto font-mono">
                          {range.range}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* BASELINE & FUTURE GRID */}
            <div className="grid lg:grid-cols-2 gap-10">
              {/* PAST */}
              <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-12 backdrop-blur-md">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-10">
                  Past Baseline (Your Normal Pattern)
                </h3>
                {Object.entries(data.past.baseline_mean).map(([key, value]) => {
                  if (key === "mood") {
                    const moodLabel = moodAverageToLabel(value);

                    return (
                      <div
                        key={key}
                        className="flex justify-between items-center py-6 border-b border-white/5 last:border-0"
                      >
                        <span className="text-slate-400 text-lg font-semibold uppercase tracking-wider">
                          Mood
                        </span>
                        <span className="text-white text-2xl font-bold">
                          {moodLabel}{" "}
                          <span className="text-slate-500 text-lg font-mono">
                            ({value.toFixed(1)} avg)
                          </span>
                        </span>
                      </div>
                    );
                  }

                  return <StatRow key={key} label={key} value={value} />;
                })}
              </div>

              {/* FUTURE */}
              <div
                className={`rounded-[3rem] p-12 border transition-all duration-1000 ${isCritical ? "bg-red-600/10 border-red-500/20" : "bg-white/[0.03] border-white/10"}`}
              >
                <h3 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em] mb-8">
                  Future Direction (7-Day Projection)
                </h3>
                <div className="text-9xl font-black mb-8 tracking-tighter text-white leading-none">
                  {Math.max(0, data.future.projected_identity_index).toFixed(2)}
                </div>
                <p className="text-2xl text-slate-300 mb-6 font-medium leading-relaxed">
                  If your recent behavior continues, your Drift Score may move
                  toward this value over the next week.
                </p>
                <p className="text-xl text-slate-400 italic">
                  "{data.future.direction_message}"
                </p>
                <div className="mt-8">
                  <button
                    onClick={explainDriftScore}
                    className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-slate-200 transition active:scale-95"
                  >
                    {aiLoading ? "Explaining..." : "What Does This Score Mean?"}
                  </button>
                </div>
                <p className="text-2xl text-slate-400 leading-relaxed mb-10">
                  {data.present.reflection}
                </p>
                {driftExplanation && (
                  <div className="mt-10 bg-indigo-600/20 border border-indigo-500/30 rounded-[3rem] p-10 backdrop-blur-md text-white text-xl leading-relaxed whitespace-pre-line">
                    {driftExplanation}
                  </div>
                )}
              </div>
            </div>

            {/* TREND CHART */}
            <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-12 backdrop-blur-md">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-12">
                Drift Trend Over Time
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={calculateDailyDrift()}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#ffffff05"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      stroke="#475569"
                      axisLine={false}
                      tickLine={false}
                      padding={{ left: 20, right: 20 }}
                    />
                    <YAxis stroke="#475569" axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020408",
                        border: "1px solid #ffffff10",
                        borderRadius: "16px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="drift"
                      stroke={isCritical ? "#ef4444" : "#6366f1"}
                      strokeWidth={5}
                      dot={{
                        r: 8,
                        fill: isCritical ? "#ef4444" : "#6366f1",
                        strokeWidth: 0,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-slate-500 text-lg mt-8 leading-relaxed italic">
                This chart shows how your Drift Score has evolved based on your
                daily logs. A stable line indicates alignment. Rising trends
                indicate increasing deviation.
              </p>
            </div>

            {/* MOOD TREND */}
            <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-12 backdrop-blur-md">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-12">
                Mood Pattern Over Time
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getMoodTrendData()}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#ffffff05"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      stroke="#475569"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#475569"
                      axisLine={false}
                      tickLine={false}
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tickFormatter={(value) => moodLabels[value]}
                    />
                    <Tooltip
                      formatter={(value) => moodLabels[value]}
                      contentStyle={{
                        backgroundColor: "#020408",
                        border: "1px solid #ffffff10",
                        borderRadius: "16px",
                      }}
                    />
                    <Line
                      type="stepAfter"
                      dataKey="mood"
                      stroke="#10b981"
                      strokeWidth={5}
                      dot={{ r: 8, fill: "#10b981" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-slate-500 text-lg mt-8 leading-relaxed italic">
                This shows your emotional tone at the end of each day. Stable or
                improving patterns suggest emotional alignment. Sharp drops may
                signal accumulating stress.
              </p>
            </div>

            {/* CONTRIBUTOR BREAKDOWN */}
            <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-12 backdrop-blur-md">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-12 text-center">
                What Contributed Most to Today’s Drift?
              </h3>
              <div className="max-w-4xl mx-auto space-y-12">
                {calculateContributorBreakdown().map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-2xl font-bold mb-4 uppercase tracking-tighter">
                      <span className="text-white">{item.label}</span>
                      <span
                        className={
                          isCritical ? "text-red-400" : "text-indigo-400"
                        }
                      >
                        {item.value.toFixed(2)} deviation
                      </span>
                    </div>
                    <div className="h-6 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 rounded-full ${index === 0 ? (isCritical ? "bg-red-500" : "bg-indigo-500") : "bg-white/40"}`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    {index === 0 && (
                      <p className="text-indigo-400 text-lg mt-4 font-bold tracking-wide italic">
                        Biggest contributor to current drift.
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-slate-500 text-lg mt-12 text-center italic leading-relaxed">
                This shows which factor deviated most from your personal
                baseline today.
              </p>
            </div>

            {/* AI INSIGHT BOX */}
            <div
              className={`rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden transition-colors duration-1000 ${isCritical ? "bg-red-900/60" : "bg-indigo-600"}`}
            >
              <div className="relative z-10 flex flex-col lg:flex-row gap-16 items-center">
                <div className="lg:w-1/3">
                  <h3 className="text-sm font-black uppercase tracking-[0.3em] mb-4 opacity-70">
                    Neural Analysis
                  </h3>
                  <h2 className="text-6xl font-black tracking-tighter italic mb-6 leading-none text-white">
                    AI ANALYST
                  </h2>
                  <p className="text-xl text-white/80 mb-10">
                    Neural interpretation of your behavioral entropy.
                  </p>
                  <button
                    onClick={getAIInsight}
                    className="w-full py-6 bg-white text-black text-2xl font-black rounded-[2rem] hover:bg-slate-100 transition shadow-xl"
                  >
                    {aiLoading ? "THINKING..." : "GENERATE INSIGHT"}
                  </button>
                </div>
                <div className="lg:w-2/3 bg-black/30 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/10 min-h-[300px] text-2xl leading-relaxed whitespace-pre-line">
                  {aiInsight || "System standing by for pattern generation..."}
                </div>
              </div>
            </div>

            {/* MICRO REFLECTION PROMPT */}
            {data.present.identity_drift_index > 1.2 && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-[3rem] p-12 backdrop-blur-md">
                <h3 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em] mb-10">
                  Reflection Prompt
                </h3>
                <p className="text-slate-300 text-2xl mb-10 font-medium leading-relaxed">
                  Your recent pattern shows noticeable drift. Would you like to
                  reflect on what may have changed this week?
                </p>
                <textarea
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  placeholder="What felt different recently? Increased workload? Sleep disruption? Emotional stress?"
                  className="w-full h-48 bg-black/40 border border-white/10 rounded-[2.5rem] p-8 text-2xl text-white outline-none focus:border-indigo-500 transition resize-none mb-10"
                />
                <button
                  onClick={saveReflection}
                  className="px-12 py-5 bg-indigo-500 rounded-2xl text-xl font-bold hover:bg-indigo-400 transition"
                >
                  SAVE REFLECTION
                </button>
                {reflectionText && (
                  <p className="text-slate-500 text-lg mt-6 italic font-medium">
                    Reflection saved locally to persistent storage.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-slow { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.4; } }
        .animate-pulse-slow { animation: pulse-slow 5s infinite ease-in-out; }
      `}</style>
    </div>
  );
}

export default App;
