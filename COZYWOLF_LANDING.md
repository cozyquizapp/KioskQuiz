# cozywolf.de Landing-Page

Public-Marketing-Site, separates Repo, separate Deploy-Pipeline.

## Wo der Code liegt

**Lokal:** `c:/Users/hornu/Desktop/desktop/cozywolf-landing`

**Remote:** [github.com/cozyquizapp/cozywolf-landing](https://github.com/cozyquizapp/cozywolf-landing)

**Deploy:** Vercel (auto-deploy auf Push zu `master`)

**Live-URL:** https://www.cozywolf.de/

## Stack

- **React 19** + **Vite 8** + **TypeScript**, keine Deps ausser React
- **Multipage mit SSG-Prerender:** `prerender.mjs` erzeugt pro Route statisches
  HTML mit eigenen Meta-Titeln, Open-Graph-Tags, Canonical, JSON-LD
  (LocalBusiness/FAQPage/Person) plus `sitemap.xml` und `dist/404.html`
- Routing pathname-basiert ohne Router-Lib (`src/routes.tsx`), Navigation
  ueber echte `<a>`-Links, Vercel-Rewrites je Route (`vercel.json`)
- Fonts selbst gehostet (Nunito + League Spartan via @fontsource, kein CDN)
- Analytics: GoatCounter (cookiefrei, Dashboard: cozywolf.goatcounter.com).
  Zaehlt auch Conversion-Events (`src/track.ts`): `cta-anfragen-*` (Hero/Ende
  je Seite, Sticky, Mini-Quiz), `form-kontakt-gesendet`, `form-testteam-gesendet`.
  Im Dashboard unter den Pfaden mit diesen Namen zu finden.
- Kontakt-/Test-Team-Formular via Formspree, Fallback auf Mailto

## Routen

| Route | Inhalt |
|---|---|
| `/` | Home: Hero, Zielgruppen, Modi, Warum, Stats, Mini-Quiz, Johannes, FAQ |
| `/firmen` | Teamevent-Quiz (Fraktionen, Race, Awards) |
| `/locations` | Kneipenquiz fuer Bars/Pubs (beide Modi im Split-Layout) |
| `/feiern` | Private Feiern (Erober-Grid) |
| `/ueber` | Ueber Johannes |
| `/kontakt` | Lead-Formular (Formspree) + Test-Team-Teaser |
| `/testen` | Test-Team-Kampagne (noindex, fuer Reels/Insta-Links) |
| `/impressum`, `/datenschutz` | echte Anbieterkennzeichnung, Stand 07/2026 |
| unbekannt | echte 404-Seite (`dist/404.html`, Status 404 via Vercel) |

## Wie lokal entwickeln

```bash
cd c:/Users/hornu/Desktop/desktop/cozywolf-landing
npm run dev    # → http://localhost:5173
npm run build  # tsc + vite build + SSR-Build + prerender.mjs → dist/
npm run lint   # Bestand: 4 bekannte Fehler (react-refresh-Exports, setState-in-Effect)
```

## Brand-Sync zur CozyQuiz-App

**Achtung:** Marketing-Pink ist `#FA4BA3` (per Logo-Pixel-Messung), NICHT das
App-UI-Pink `#EC4899`. Tokens zentral in `src/brand.ts` (`BRAND`, `EMAIL`,
`FORMSPREE_ID`, `PLAY_URL`). Kontakt: `hallo@cozywolf.de` (eingerichtet).

## Pflege-Punkte

- **Verfuegbarkeits-Hinweis** (`src/components/AvailabilityNote.tsx`):
  `AVAIL_DE/EN` + `AVAIL_UNTIL` pflegen. Nach `AVAIL_UNTIL` faellt der Hinweis
  automatisch auf eine neutrale Zeile zurueck, es kann also nichts veralten.
- **Stimmen/Social Proof** (`src/components/VoicesSection.tsx`): `QUOTES`
  fuellen, sobald echte Zitate aus Test-Abenden da sind. Solange leer, rendert
  die Sektion nichts. Fotos optional pro Zitat (`photo`).
- **FAQ aendern?** `FaqSection.tsx` UND das FAQ-JSON-LD in `prerender.mjs`
  mitpflegen (dort dupliziert fuer Rich Results).
- **Saison-Hinweis** (Weihnachten) erscheint automatisch Okt-Dez
  (`SeasonalHint.tsx`), nichts zu tun.

## Offene Ideen

- Echte Fotos von Quiz-Abenden sammeln (Raum, Beamer, Leute am Handy) fuer
  Zielgruppen-Seiten und Stimmen-Sektion. Einverstaendnis einholen.
- Google-Business-Profil anlegen (Local SEO fuer "Pubquiz Hamburg" u. ae.),
  JSON-LD-Grundlage ist schon da.
- **Pricing/Pakete**: bewusst nur "ab 350 Euro" (`PriceNote.tsx`), Wolf will
  solo + verhandelbar bleiben.

## Beziehung zur CozyQuiz-App

Die Landing-Page **leitet weiter** zu:
- `play.cozyquiz.app` (Vercel-Deploy der QQ-App, dieses Repo: `kioskquiz`)
- `instagram.com/cozywolf.events`

Spieler die nach einem Quiz-Abend den QR-Code scannen landen NICHT auf
cozywolf.de, sondern direkt auf `play.cozyquiz.app/summary/:roomCode`, dem
Summary-Endpunkt der App.
