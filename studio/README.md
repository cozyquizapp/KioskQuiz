# Cozy Quiz Studio (Editor)

Dieses Frontend ist nur für das Erstellen/Bearbeiten von Quizzes gedacht. Es soll später den bisherigen Creator/Wizard/Editor ersetzen, damit die Runtime (Moderator/Beamer/Team) schlank bleibt.

Aktueller Stand:
- Vite React + TS Grundgerüst (npm install bereits ausgeführt).
- Noch keine Seiten/Routes.

Plan:
1. Shared Types nutzen (`@shared/quizTypes` aus dem Hauptrepo einbinden).
2. Routen: `/` (Dashboard), `/creator` (Wizard), `/question-editor`, `/presentation-creator`, `/stats`.
3. API-Client: nur Admin/Editor-Endpunkte (Quizzes/Fragen/Layout speichern).
4. Schrittweiser Umzug der bestehenden Creator-UI aus `frontend/` in das Studio.

Entwicklung:
```
cd studio
npm run dev
```
