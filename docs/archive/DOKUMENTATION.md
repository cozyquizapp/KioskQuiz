# KioskQuiz Dokumentation

## Übersicht
- Monorepo: backend (Node.js/Express), frontend (React/Vite), studio (Quiz-Editor)
- Gemeinsame Logik: /shared
- Datenhaltung: JSON/TS-Dateien im backend/src/data
- Deployment: Vercel (Frontend/CDN), Render (Backend/API)

## Backend
- Express-Server mit Socket.IO
- Endpunkte: Healthcheck, Fragen, Quizzes, Statistiken, Layouts, Uploads
- Caching: node-cache & Redis
- Bild-Uploads: Multer
- OpenAPI-Dokumentation: api_docs.yaml
- Monitoring: Sentry integriert

## Frontend
- React mit Vite
- Lazy Loading, Code-Splitting, CSS-Bereinigung, Bildoptimierung
- Responsive Design, Mobile-Optimierungen
- Asset-Verwaltung: Avatars (SVG), Kategorien/Decorations (WebP/PNG)
- Build: Erfolgreich, Bundle-Größe minimiert
- Monitoring: Sentry integriert

## Studio
- Quiz- und Fragen-Editor
- Bulk-Upload, Export, KI-Struktur-Export

## Tests
- Playwright: mobile-smoke.spec.ts, quiz-flow.spec.ts, accessibility-team.spec.ts
- End-to-End, Accessibility, Smoke-Tests

## Optimierungen
- Redis für distributed caching
- CDN-Auslieferung über Vercel
- Monitoring/Logging (Sentry)
- Accessibility-Checks (axe-core)
- Testabdeckung erweitert

## ToDos
- API-Tests (Backend)
- Weitere Accessibility-Tests
- Developer Onboarding Guide

## Deployment
- Vercel: vercel.json, public/ als CDN, dist/ als statisches Frontend
- Render: backend als Webservice

## Kontakt & Support
- Für Fragen/Feedback: README oder STRUKTUR.md konsultieren
