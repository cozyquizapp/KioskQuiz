# cozywolf.de Landing-Page

Public-Marketing-Site, separates Repo, separate Deploy-Pipeline.

## Wo der Code liegt

**Lokal:** `c:/Users/hornu/Desktop/desktop/cozywolf-landing`

**Remote:** [github.com/cozyquizapp/cozywolf-landing](https://github.com/cozyquizapp/cozywolf-landing)

**Deploy:** Vercel (auto-deploy auf Push zu `master`-Branch — sofern der Vercel-Hook noch aktiv ist)

**Live-URL:** https://www.cozywolf.de/

## Stack

- **React 19** + **Vite 8** + **TypeScript**
- Single-File-App (`src/App.tsx`, ~400 Zeilen)
- Brand-Tokens als TS-Konstante (`BRAND` object) im selben File
- Font: Nunito (Google-Fonts CDN, in `index.html`)
- Keine Routing-Lib (Single-Pager)
- Keine externen Deps außer React

## Wie lokal entwickeln

```bash
cd c:/Users/hornu/Desktop/desktop/cozywolf-landing
npm run dev    # → http://localhost:5173
npm run build  # → dist/ (für Vercel-Deploy)
```

## Brand-Sync zur CozyQuiz-App

Die Landing-Page nutzt **dieselben Brand-Tokens** wie die App:

| Token       | Hex/RGB              | Verwendung                              |
|-------------|----------------------|-----------------------------------------|
| `pink`      | `#EC4899`            | Wordmark, CTA-Primary, Headlines        |
| `pinkRgb`   | `236,72,153`         | für rgba-Glows + Borders                |
| `pinkSoft`  | `#FBCFE8`            | Subtitle, By-Cozywolf-Tagline           |
| `magenta`   | `#A21247`            | CTA-Gradient zweite Stop-Color          |
| `bg`        | `#0A0814`            | Page-Background-Base                    |

Synchron zu `getBrandColors()` in `frontend/src/pages/QQBeamerPage.tsx` und `summaryBrand()` in `frontend/src/pages/QQSummaryPage.tsx`.

## Layout (Stand 2026-05-10, Commit `2dbbf9e`)

4 Sektionen + Footer:

1. **Hero** — Logo + „CozyQuiz" Wordmark + „by cozywolf" + Sub + 2 CTAs (Mail-Pulse + Insta-Outline)
2. **3-Card-Grid** — 📱 Bis zu 8 Teams · 🎯 5 Kategorien · 👑 Punkte wie noch nie
3. **Quote-Block** — „Für alle, die Lust auf spannende Quiz-Runden und interessante Fakten haben"
4. **Booking-Card** — „Lust auf einen Abend?" + Disclaimer + Mail-Row + Insta-Row
5. **Footer** — Made by cozywolf · 2026 + play.cozyquiz.app + Insta + Impressum/Datenschutz-Slots

**DE/EN-Switcher** top-right, Pink-Active-State, Persistenz via `localStorage['cw-lang']`.

## Offene TODOs für die Landing-Page

- **Impressum + Datenschutz-Pages** anlegen (Pflicht in DE bei kommerziellem Angebot — Footer-Links zeigen aktuell auf `#`)
- **`hallo@cozywolf.de`** Mail-Adresse einrichten und in `App.tsx` Konstante `EMAIL` updaten (aktuell noch `cozyquiz.app@gmail.com`)
- **Termine-Sektion**: kommt zurück sobald regelmäßige Quiz-Abende laufen
- **Pricing/Pakete**: bewusst weggelassen — Wolf will solo + verhandelbar bleiben

## Beziehung zur CozyQuiz-App

Die Landing-Page **leitet weiter** zu:
- `play.cozyquiz.app` (Vercel-Deploy der QQ-App, dieses Repo: `kioskquiz`)
- `instagram.com/cozywolf.events`

Spieler die nach einem Quiz-Abend den QR-Code scannen landen NICHT auf cozywolf.de, sondern direkt auf `play.cozyquiz.app/summary/:roomCode` — das ist der Summary-Endpunkt der App.
