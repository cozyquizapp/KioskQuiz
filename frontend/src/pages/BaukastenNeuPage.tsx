import { useEffect, useMemo, useRef, useState } from "react";
import { AnyQuestion } from "@shared/quizTypes";
import { fetchQuestions } from "../api";
import { loadPlayDraft, savePlayDraft } from "../utils/draft";

const card = {
  background: "rgba(12,16,26,0.9)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 14,
  padding: 16,
  color: "#e2e8f0",
  boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
} as const;

const input = () => ({
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.25)",
  color: "#f8fafc",
});

const pill = (label: string, active = false) => ({
  padding: "8px 12px",
  borderRadius: 999,
  border: `1px solid ${active ? "#7a5bff" : "rgba(255,255,255,0.2)"}`,
  background: active ? "rgba(122,91,255,0.15)" : "rgba(255,255,255,0.05)",
  color: "#e2e8f0",
  fontWeight: 700,
});

type ElementKey = "question" | "answer" | "timer" | "points";

export default function BaukastenNeuPage() {
  const draft = loadPlayDraft();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState(draft?.name || "Neues Quiz");
  const [rounds, setRounds] = useState((draft as any)?.structure?.rounds || 5);
  const [categories, setCategories] = useState<string[]>(
    (draft as any)?.structure?.categories?.map((c: any) => c.name) || ["Schaetzchen", "Mu-Cho", "Stimmts", "Cheese", "Mixed Bag"]
  );
  const [language, setLanguage] = useState<"de" | "en" | "both">(((draft as any)?.structure?.language as any) || "both");

  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [selected, setSelected] = useState<string[]>(draft?.selectedQuestionIds || []);
  const [mixedMechanic, setMixedMechanic] = useState((draft as any)?.structure?.mixedMechanic || "Connect Five");
  const [katalogName, setKatalogName] = useState("Standard-Katalog");

  const [themePreset, setThemePreset] = useState<"CozyBeamer" | "Custom">("CozyBeamer");
  const [bg, setBg] = useState((draft?.theme as any)?.background || "radial-gradient(circle at 20% 20%, #1a1f39 0%, #0d0f14 55%)");
  const [accent, setAccent] = useState((draft?.theme as any)?.color || "#fbbf24");
  const [themeName, setThemeName] = useState((draft?.theme as any)?.name || "Cozy Beamer");
  const [savedThemes, setSavedThemes] = useState<{ name: string; bg: string; accent: string }[]>(() => (draft as any)?.savedThemes || []);

  const [slotSpinMs, setSlotSpinMs] = useState((draft?.theme as any)?.slotSpinMs || 2400);
  const [slotHoldMs, setSlotHoldMs] = useState((draft?.theme as any)?.slotHoldMs || 1200);
  const [slotIntervalMs, setSlotIntervalMs] = useState((draft?.theme as any)?.slotIntervalMs || 260);
  const [slotScale, setSlotScale] = useState((draft?.theme as any)?.slotScale || 1);

  const [layoutX, setLayoutX] = useState((draft as any)?.layout?.layoutX || 10);
  const [layoutY, setLayoutY] = useState((draft as any)?.layout?.layoutY || 10);
  const [layoutSize, setLayoutSize] = useState((draft as any)?.layout?.layoutSize || 22);
  const [answerX, setAnswerX] = useState((draft as any)?.layout?.answerX || 10);
  const [answerY, setAnswerY] = useState((draft as any)?.layout?.answerY || 52);
  const [answerSize, setAnswerSize] = useState((draft as any)?.layout?.answerSize || 18);
  const [timerX, setTimerX] = useState((draft as any)?.layout?.timerX || 82);
  const [timerY, setTimerY] = useState((draft as any)?.layout?.timerY || 6);
  const [pointsX, setPointsX] = useState((draft as any)?.layout?.pointsX || 82);
  const [pointsY, setPointsY] = useState((draft as any)?.layout?.pointsY || 16);
  const [showTimer, setShowTimer] = useState((draft as any)?.layout?.showTimer ?? true);
  const [showPoints, setShowPoints] = useState((draft as any)?.layout?.showPoints ?? false);
  const [timerSize, setTimerSize] = useState((draft as any)?.layout?.timerSize || 12);
  const [pointsSize, setPointsSize] = useState((draft as any)?.layout?.pointsSize || 12);
  const [showAnswer, setShowAnswer] = useState(true);
  const [editTarget, setEditTarget] = useState<ElementKey>("question");
  const [dragging, setDragging] = useState<null | ElementKey>(null);
  const [resizing, setResizing] = useState<null | ElementKey>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeOriginRef = useRef<{ y: number; size: number }>({ y: 0, size: 0 });

  const persist = () => {
    savePlayDraft({
      id: draft?.id || "draft-baukasten-neu",
      name,
      structure: {
        rounds,
        categories: categories.map((c) => ({ name: c, questions: 5 })),
        language,
        mixedMechanic,
      },
      selectedQuestionIds: selected,
      theme: { name: themeName, color: accent, background: bg, slotSpinMs, slotHoldMs, slotIntervalMs, slotScale },
      savedThemes,
      layout: {
        layoutX,
        layoutY,
        layoutSize,
        answerX,
        answerY,
        answerSize,
        timerX,
        timerY,
        pointsX,
        pointsY,
        showTimer,
        showPoints,
        timerSize,
        pointsSize,
      },
      updatedAt: Date.now(),
    });
  };

  useEffect(() => {
    persist();
  }, [
    name,
    rounds,
    categories,
    language,
    mixedMechanic,
    selected,
    themeName,
    accent,
    bg,
    slotSpinMs,
    slotHoldMs,
    slotIntervalMs,
    slotScale,
    layoutX,
    layoutY,
    layoutSize,
    answerX,
    answerY,
    answerSize,
    timerX,
    timerY,
    pointsX,
    pointsY,
    showTimer,
    showPoints,
    timerSize,
    pointsSize,
    savedThemes,
  ]);

  const loadQuestions = async () => {
    const res = await fetchQuestions();
    setQuestions(res.questions);
  };

  const selectedQuestions = useMemo(() => questions.filter((q) => selected.includes(q.id)), [questions, selected]);

  const toggleSelect = (id: string) => {
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const isMixedAllowed = (q: AnyQuestion) => {
    if (q.category !== "Mixed Bag") return true;
    const mech = (q as any).mixedMechanic || (q as any).mechanic || "";
    return mech.toLowerCase() === mixedMechanic.toLowerCase();
  };

  const getCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    return {
      xPct: ((e.clientX - rect.left) / rect.width) * 100,
      yPct: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const getPos = (key: ElementKey) => {
    if (key === "question") return { x: layoutX, y: layoutY };
    if (key === "answer") return { x: answerX, y: answerY };
    if (key === "timer") return { x: timerX, y: timerY };
    return { x: pointsX, y: pointsY };
  };

  const setPos = (key: ElementKey, x: number, y: number) => {
    if (key === "question") {
      setLayoutX(x);
      setLayoutY(y);
    }
    if (key === "answer") {
      setAnswerX(x);
      setAnswerY(y);
    }
    if (key === "timer") {
      setTimerX(x);
      setTimerY(y);
    }
    if (key === "points") {
      setPointsX(x);
      setPointsY(y);
    }
  };

  const getSize = (key: ElementKey) => {
    if (key === "question") return layoutSize;
    if (key === "answer") return answerSize;
    if (key === "timer") return timerSize;
    return pointsSize;
  };

  const setSize = (key: ElementKey, size: number) => {
    if (key === "question") setLayoutSize(size);
    if (key === "answer") setAnswerSize(size);
    if (key === "timer") setTimerSize(size);
    if (key === "points") setPointsSize(size);
  };

  const startDrag = (target: ElementKey, e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const coords = getCoords(e);
    if (!coords) return;
    const { xPct, yPct } = coords;
    const pos = getPos(target);
    dragOffsetRef.current = { x: xPct - pos.x, y: yPct - pos.y };
    setEditTarget(target);
    setDragging(target);
  };

  const startResize = (target: ElementKey, e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const coords = getCoords(e);
    if (!coords) return;
    const { yPct } = coords;
    resizeOriginRef.current = { y: yPct, size: getSize(target) };
    setEditTarget(target);
    setResizing(target);
  };

  const handleStageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getCoords(e);
    if (!coords) return;
    const snap = (v: number) => Math.max(0, Math.min(90, Math.round(v * 10) / 10));
    setPos(editTarget, snap(coords.xPct), snap(coords.yPct));
    setDragging(editTarget);
    dragOffsetRef.current = { x: 0, y: 0 };
  };

  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging && !resizing) return;
    const coords = getCoords(e);
    if (!coords) return;
    const { xPct, yPct } = coords;
    const snap = (v: number) => Math.max(0, Math.min(90, Math.round(v * 10) / 10));

    if (dragging) {
      const offset = dragOffsetRef.current;
      setPos(dragging, snap(xPct - offset.x), snap(yPct - offset.y));
    }
    if (resizing) {
      const origin = resizeOriginRef.current;
      const delta = yPct - origin.y;
      const base = origin.size;
      const next = Math.max(10, Math.min(64, Math.round((base + delta) * 10) / 10));
      setSize(resizing, next);
    }
  };

  const handleStageMouseUp = () => {
    setDragging(null);
    setResizing(null);
  };

  const slidesData = useMemo(() => selectedQuestions.map((q, idx) => ({ id: q.id, title: `Slide ${idx + 1}`, questionId: q.id })), [selectedQuestions]);
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(slidesData[0]?.id || null);
  const currentSlide = useMemo(() => slidesData.find((s) => s.id === currentSlideId), [slidesData, currentSlideId]);
  const currentQuestion = useMemo(
    () => questions.find((q) => q.id === currentSlide?.questionId) || selectedQuestions[0] || null,
    [questions, currentSlide, selectedQuestions]
  );

  useEffect(() => {
    if (slidesData.length && !currentSlideId) {
      setCurrentSlideId(slidesData[0].id);
    }
  }, [slidesData, currentSlideId]);

  const beamerLink = `${window.location.origin}/beamer`;
  const teamLink = `${window.location.origin}/team`;
  const moderatorLink = `${window.location.origin}/moderator`;
  const qr = (url: string) => `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f1a", color: "#e2e8f0", padding: 16 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 12, gridTemplateColumns: "240px 1fr" }}>
        <div style={{ ...card, position: "sticky", top: 10, alignSelf: "start" }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Baukasten Neu</div>
          {[1, 2, 3, 4].map((i) => (
            <button key={i} style={{ ...pill(`Step ${i}`, step === (i as any)), width: "100%", textAlign: "left", marginBottom: 6 }} onClick={() => setStep(i as any)}>
              {i === 1 && "1. Struktur"}
              {i === 2 && "2. Fragen"}
              {i === 3 && "3. Theme"}
              {i === 4 && "4. Slides"}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {step === 1 && (
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Struktur</div>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <label>Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} style={input()} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
                  <div>
                    <label>Runden</label>
                    <input type="number" value={rounds} onChange={(e) => setRounds(Number(e.target.value))} style={input()} />
                  </div>
                  <div>
                    <label>Sprache</label>
                    <select value={language} onChange={(e) => setLanguage(e.target.value as any)} style={input()}>
                      <option value="de">Deutsch</option>
                      <option value="en">Englisch</option>
                      <option value="both">Beides</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label>Kategorien</label>
                  <input value={categories.join(", ")} onChange={(e) => setCategories(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} style={input()} />
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Komma-getrennt</div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Fragen waehlen</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ ...pill(katalogName), display: "flex", alignItems: "center", gap: 6 }}>
                  <span>Katalog:</span>
                  <select value={katalogName} onChange={(e) => setKatalogName(e.target.value)} style={input()}>
                    <option>Standard-Katalog</option>
                    <option>Bilder-Katalog</option>
                    <option>Audio/Video-Katalog</option>
                    <option>Custom (Import)</option>
                  </select>
                </div>
                <button onClick={loadQuestions} style={pill("Katalog laden")}>Katalog laden</button>
                <button style={pill("Frageneditor")} onClick={() => (window.location.href = "/question-editor")}>Fragenkatalog öffnen</button>
                <div style={{ ...pill("Mixed Bag Mechanik"), display: "flex", gap: 6 }}>
                  <span>Mechanik:</span>
                  <select value={mixedMechanic} onChange={(e) => setMixedMechanic(e.target.value)} style={input()}>
                    <option>Connect Five</option>
                    <option>Bilder-Raetsel</option>
                    <option>Schnellraten</option>
                    <option>Audio/Clip</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
                {questions.filter(isMixedAllowed).slice(0, 60).map((q) => (
                  <div key={q.id} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 10, background: selected.includes(q.id) ? "rgba(122,91,255,0.12)" : "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                      <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(q as any).text || (q as any).question}</div>
                      <input type="checkbox" checked={selected.includes(q.id)} onChange={() => toggleSelect(q.id)} />
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{q.category}</div>
                    {q.category === "Mixed Bag" && <div style={{ fontSize: 11, color: "#22c55e" }}>Mechanik: {(q as any).mixedMechanic || (q as any).mechanic || "keine"}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Theme</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <button style={pill("Cozy Beamer", themePreset === "CozyBeamer")} onClick={() => setThemePreset("CozyBeamer")}>
                  Cozy Beamer (Default)
                </button>
                <button style={pill("Custom", themePreset === "Custom")} onClick={() => setThemePreset("Custom")}>
                  Custom
                </button>
              </div>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", marginBottom: 10 }}>
                <div style={{ ...pill("Theme-Name"), display: "grid", gap: 6, borderRadius: 12 }}>
                  <label>Name</label>
                  <input value={themeName} onChange={(e) => setThemeName(e.target.value)} style={input()} />
                  <button
                    style={pill("Theme speichern")}
                    onClick={() => {
                      if (!themeName.trim()) return;
                      setSavedThemes((prev) => [{ name: themeName.trim(), bg, accent }, ...prev.filter((t) => t.name !== themeName.trim())]);
                    }}
                  >
                    Speichern
                  </button>
                </div>
                <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10, background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Gespeicherte Themes</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {savedThemes.length === 0 && <div style={{ color: "#94a3b8", fontSize: 13 }}>Noch keine Themes gespeichert.</div>}
                    {savedThemes.map((t) => (
                      <button
                        key={t.name}
                        style={{ ...pill(t.name), justifyContent: "flex-start", width: "100%" }}
                        onClick={() => {
                          setThemeName(t.name);
                          setBg(t.bg);
                          setAccent(t.accent);
                          setThemePreset("Custom");
                        }}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {themePreset === "Custom" && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div>
                    <label>Background</label>
                    <input value={bg} onChange={(e) => setBg(e.target.value)} style={input()} />
                  </div>
                  <div>
                    <label>Akzentfarbe</label>
                    <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: "100%" }} />
                  </div>
                </div>
              )}
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 700 }}>Slotmachine (Beamer)</div>
                <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
                  <label>
                    Spin (ms)
                    <input type="number" value={slotSpinMs} onChange={(e) => setSlotSpinMs(Number(e.target.value) || 0)} style={input()} />
                  </label>
                  <label>
                    Hold (ms)
                    <input type="number" value={slotHoldMs} onChange={(e) => setSlotHoldMs(Number(e.target.value) || 0)} style={input()} />
                  </label>
                  <label>
                    Intervall (ms)
                    <input type="number" value={slotIntervalMs} onChange={(e) => setSlotIntervalMs(Number(e.target.value) || 0)} style={input()} />
                  </label>
                  <label>
                    Scale
                    <input type="range" min={0.7} max={1.3} step={0.05} value={slotScale} onChange={(e) => setSlotScale(Number(e.target.value))} style={{ width: "100%" }} />
                  </label>
                </div>
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
                <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10, background: "#0d0f14" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Preview Beamer</div>
                  <div
                    style={{
                      background: bg,
                      borderRadius: 16,
                      padding: 16,
                      minHeight: 140,
                      border: `1px solid ${accent}55`,
                      boxShadow: `0 18px 40px ${accent}33`,
                    }}
                  >
                    <div style={{ fontSize: 12, color: accent, fontWeight: 800, textTransform: "uppercase" }}>{selectedQuestions[0]?.category || "Kategorie"}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, margin: "6px 0", color: "#f8fafc" }}>{(selectedQuestions[0] as any)?.text || (selectedQuestions[0] as any)?.question || "Frage-Text"}</div>
                    <div style={{ height: 8, borderRadius: 999, background: "#111827", overflow: "hidden" }}>
                      <div style={{ width: "60%", height: "100%", background: accent }} />
                    </div>
                  </div>
                </div>
                <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10, background: "#0d0f14" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Preview Team</div>
                  <div style={{ borderRadius: 12, padding: 14, background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 700 }}>{(selectedQuestions[0] as any)?.text || (selectedQuestions[0] as any)?.question || "Frage"}</div>
                    <div style={{ fontSize: 12, color: "#cbd5e1", margin: "4px 0 10px" }}>{(selectedQuestions[0] as any)?.answer || "Antwort eingeben..."}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <div style={{ padding: "6px 10px", borderRadius: 10, background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 12 }}>Option A</div>
                      <div style={{ padding: "6px 10px", borderRadius: 10, background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 12 }}>Option B</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Slides (Design)</div>
              <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 8 }}>Hier nur Layout/Design anpassen. Inhalte kommen aus den gewaehlt en Fragen.</div>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Canvas Preview</div>
                  <div
                    ref={previewRef}
                    onMouseDown={handleStageMouseDown}
                    onMouseMove={handleStageMouseMove}
                    onMouseUp={handleStageMouseUp}
                    onMouseLeave={handleStageMouseUp}
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "16 / 9",
                      borderRadius: 14,
                      padding: 12,
                      background: bg,
                      border: `1px solid ${accent}55`,
                      boxShadow: `0 14px 36px ${accent}33`,
                      overflow: "hidden",
                      cursor: dragging || resizing ? "grabbing" : "crosshair",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: `${layoutX}%`,
                        top: `${layoutY}%`,
                        color: "#f8fafc",
                        fontWeight: 800,
                        fontSize: layoutSize,
                        border: editTarget === "question" ? "1px dashed #7a5bff" : "none",
                        padding: 4,
                      }}
                      onMouseDown={(e) => startDrag("question", e)}
                    >
                      {(currentQuestion as any)?.text || (currentQuestion as any)?.question || "Frage-Text"}
                      <div
                        style={{
                          position: "absolute",
                          right: -8,
                          bottom: -8,
                          width: 12,
                          height: 12,
                          borderRadius: 4,
                          background: "#7a5bff",
                          cursor: "nwse-resize",
                        }}
                        onMouseDown={(e) => startResize("question", e)}
                      />
                    </div>
                    {showAnswer && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${answerX}%`,
                          top: `${answerY}%`,
                          color: "#a5f3fc",
                          fontWeight: 700,
                          fontSize: answerSize,
                          border: editTarget === "answer" ? "1px dashed #7a5bff" : "none",
                          padding: 4,
                        }}
                        onMouseDown={(e) => startDrag("answer", e)}
                      >
                        {(currentQuestion as any)?.answer || "Antwort-Text"}
                        <div
                          style={{
                            position: "absolute",
                            right: -8,
                            bottom: -8,
                            width: 12,
                            height: 12,
                            borderRadius: 4,
                            background: "#7a5bff",
                            cursor: "nwse-resize",
                          }}
                          onMouseDown={(e) => startResize("answer", e)}
                        />
                      </div>
                    )}
                    {showTimer && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${timerX}%`,
                          top: `${timerY}%`,
                          padding: "6px 10px",
                          borderRadius: 10,
                          background: "rgba(0,0,0,0.4)",
                          color: "#e2e8f0",
                          fontSize: timerSize,
                          border: editTarget === "timer" ? "1px dashed #7a5bff" : "none",
                        }}
                        onMouseDown={(e) => startDrag("timer", e)}
                      >
                        11s
                        <div
                          style={{
                            position: "absolute",
                            right: -8,
                            bottom: -8,
                            width: 12,
                            height: 12,
                            borderRadius: 4,
                            background: "#7a5bff",
                            cursor: "nwse-resize",
                          }}
                          onMouseDown={(e) => startResize("timer", e)}
                        />
                      </div>
                    )}
                    {showPoints && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${pointsX}%`,
                          top: `${pointsY}%`,
                          padding: "6px 10px",
                          borderRadius: 10,
                          background: "rgba(0,0,0,0.4)",
                          color: "#e2e8f0",
                          fontSize: pointsSize,
                          border: editTarget === "points" ? "1px dashed #7a5bff" : "none",
                        }}
                        onMouseDown={(e) => startDrag("points", e)}
                      >
                        Punkte
                        <div
                          style={{
                            position: "absolute",
                            right: -8,
                            bottom: -8,
                            width: 12,
                            height: 12,
                            borderRadius: 4,
                            background: "#7a5bff",
                            cursor: "nwse-resize",
                          }}
                          onMouseDown={(e) => startResize("points", e)}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label>Frage X (%)<input type="range" min={0} max={80} value={layoutX} onChange={(e) => setLayoutX(Number(e.target.value))} style={{ width: "100%" }} /></label>
                  <label>Frage Y (%)<input type="range" min={0} max={80} value={layoutY} onChange={(e) => setLayoutY(Number(e.target.value))} style={{ width: "100%" }} /></label>
                  <label>Frage Groesse<input type="range" min={14} max={64} value={layoutSize} onChange={(e) => setLayoutSize(Number(e.target.value))} style={{ width: "100%" }} /></label>
                  <label>Antwort X (%)<input type="range" min={0} max={80} value={answerX} onChange={(e) => setAnswerX(Number(e.target.value))} style={{ width: "100%" }} /></label>
                  <label>Antwort Y (%)<input type="range" min={0} max={80} value={answerY} onChange={(e) => setAnswerY(Number(e.target.value))} style={{ width: "100%" }} /></label>
                  <label>Antwort Groesse<input type="range" min={14} max={64} value={answerSize} onChange={(e) => setAnswerSize(Number(e.target.value))} style={{ width: "100%" }} /></label>
                  <label><input type="checkbox" checked={showAnswer} onChange={(e) => setShowAnswer(e.target.checked)} /> Antwort anzeigen</label>
                  <label>Timer X (%)<input type="range" min={0} max={90} value={timerX} onChange={(e) => setTimerX(Number(e.target.value))} style={{ width: "100%" }} /></label>
                  <label>Timer Y (%)<input type="range" min={0} max={90} value={timerY} onChange={(e) => setTimerY(Number(e.target.value))} style={{ width: "100%" }} /></label>
                  <label>Timer Groesse<input type="range" min={10} max={32} value={timerSize} onChange={(e) => setTimerSize(Number(e.target.value))} style={{ width: "100%" }} /></label>
                  <label>Punkte X (%)<input type="range" min={0} max={90} value={pointsX} onChange={(e) => setPointsX(Number(e.target.value))} style={{ width: "100%" }} /></label>
                  <label>Punkte Y (%)<input type="range" min={0} max={90} value={pointsY} onChange={(e) => setPointsY(Number(e.target.value))} style={{ width: "100%" }} /></label>
                  <label>Punkte Groesse<input type="range" min={10} max={32} value={pointsSize} onChange={(e) => setPointsSize(Number(e.target.value))} style={{ width: "100%" }} /></label>
                  <label><input type="checkbox" checked={showTimer} onChange={(e) => setShowTimer(e.target.checked)} /> Timer anzeigen</label>
                  <label><input type="checkbox" checked={showPoints} onChange={(e) => setShowPoints(e.target.checked)} /> Punkte anzeigen</label>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <button style={pill("Speichern") } onClick={persist}>Speichern</button>
                    <button
                      style={pill("Export JSON")}
                      onClick={() => {
                        const data = {
                          name,
                          rounds,
                          categories,
                          language,
                          mixedMechanic,
                          theme: { name: themeName, color: accent, background: bg, slotSpinMs, slotHoldMs, slotIntervalMs, slotScale },
                          savedThemes,
                          layout: {
                            layoutX,
                            layoutY,
                            layoutSize,
                            answerX,
                            answerY,
                            answerSize,
                            timerX,
                            timerY,
                            pointsX,
                            pointsY,
                            showTimer,
                            showPoints,
                            timerSize,
                            pointsSize,
                          },
                          selectedQuestionIds: selected,
                        };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${name.replace(/\s+/g, "-").toLowerCase() || "quiz"}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Export JSON
                    </button>
                    <a href={beamerLink} style={pill("Beamer-Link")}>Beamer</a>
                    <a href={teamLink} style={pill("Team-Link")}>Team</a>
                    <a href={moderatorLink} style={pill("Moderator-Link")}>Moderator</a>
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", marginTop: 10 }}>
                {slidesData.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentSlideId(s.id)}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                      padding: 10,
                      background: currentSlideId === s.id ? "rgba(122,91,255,0.15)" : "rgba(255,255,255,0.02)",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
                      {(questions.find((q) => q.id === s.questionId) as any)?.text || (questions.find((q) => q.id === s.questionId) as any)?.question || "Frage"}
                    </div>
                    <div style={{ fontSize: 12, color: "#cbd5e1" }}>Layout: Cozy Beamer Card</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
                <div style={{ ...card, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Beamer-Preview live</div>
                  <div style={{ background: bg, borderRadius: 16, padding: 14, border: `1px solid ${accent}55`, boxShadow: `0 16px 32px ${accent}22` }}>
                    <div style={{ fontSize: 12, textTransform: "uppercase", color: accent, fontWeight: 800 }}>{currentQuestion?.category || "Kategorie"}</div>
                    <div style={{ fontSize: layoutSize, fontWeight: 800, color: "#f8fafc", margin: "6px 0" }}>
                      {(currentQuestion as any)?.text || (currentQuestion as any)?.question || "Frage-Text"}
                    </div>
                    {showAnswer && <div style={{ fontSize: answerSize, color: "#a5f3fc", fontWeight: 700 }}>{(currentQuestion as any)?.answer || "Antwort"}</div>}
                    {showTimer && <div style={{ marginTop: 8, fontSize: timerSize, color: "#e2e8f0" }}>Timer: 11s</div>}
                  </div>
                </div>
                <div style={{ ...card, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Team-Preview live</div>
                  <div style={{ background: "#0f172a", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.12)" }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{(currentQuestion as any)?.text || (currentQuestion as any)?.question || "Frage"}</div>
                    <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 4 }}>{(currentQuestion as any)?.answer || "Antwort"}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                      <span style={{ padding: "6px 10px", borderRadius: 10, background: "rgba(255,255,255,0.05)" }}>Option A</span>
                      <span style={{ padding: "6px 10px", borderRadius: 10, background: "rgba(255,255,255,0.05)" }}>Option B</span>
                    </div>
                  </div>
                </div>
                <div style={{ ...card, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Publish / Links</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <button style={pill("Draft speichern")} onClick={persist}>Speichern</button>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>Beamer</div>
                        <img alt="Beamer QR" src={qr(beamerLink)} style={{ width: 120, height: 120, borderRadius: 10 }} />
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>Team</div>
                        <img alt="Team QR" src={qr(teamLink)} style={{ width: 120, height: 120, borderRadius: 10 }} />
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>Moderator</div>
                        <img alt="Moderator QR" src={qr(moderatorLink)} style={{ width: 120, height: 120, borderRadius: 10 }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a href={beamerLink} style={pill("Beamer")}>Beamer</a>
                      <a href={teamLink} style={pill("Team")}>Team</a>
                      <a href={moderatorLink} style={pill("Moderator")}>Moderator</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
