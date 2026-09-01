/**
 * api — nur noch die Basis-Adresse des Backends.
 *
 * 2026-09-01. Hier standen 55 Exporte auf 581 Zeilen: der REST-Client der
 * Engine VOR CozyQuiz (joinRoom, startQuestion, resolveEstimate, fetchQuizzes,
 * die Studio- und Blitz-Aufrufe). Gemessen: aus dieser Datei wurde an allen
 * vier Stellen, die sie ueberhaupt importieren, NUR `API_BASE` geholt
 * (main.tsx, QQModeratorPage, QQSummaryPage, QQFeedbackDashboard). Alles
 * andere war toter Code INNERHALB einer lebenden Datei, den
 * `scripts/toter-code.mjs` nicht sieht, weil es auf Dateiebene misst.
 *
 * CozyQuiz spricht ueber Sockets (`useQQSocket`) und ueber die `/api/qq/*`-
 * Adressen, die die Seiten direkt mit `fetch` rufen. Dieser Client lag
 * dazwischen und wurde nie benutzt.
 */
export const API_BASE = (() => {
  const envBase = import.meta.env.VITE_API_BASE as string | undefined;
  if (envBase) return envBase;
  const { protocol, hostname, port, origin } = window.location;
  // Dev: localhost/127.* mit Port 5173 -> backend auf 4000
  const isLocal = hostname === 'localhost' || hostname.startsWith('127.');
  if (isLocal) return `${protocol}//${hostname}:4000/api`;
  // Prod: gleicher Origin + /api
  return `${origin}/api`;
})();
