# CozyQuiz — Café-Pitch (Spickzettel)

> Ziel-Kunde #1 lt. Markt-Strategie: **Pub / Bar / Café**. Der Pitch verkauft
> zwei Dinge: (1) das **Gäste-Erlebnis** am Screen, (2) dass es fürs Café
> **einfach + wiederkommer-treibend** ist.

## A) Vorab / zum Anteasern — 3 Links
| Route | Was | Wofür |
|---|---|---|
| `/` (Landing) | Auto-Play-Demo: Beamer + Handy synchron, echtes Quiz | 30-Sek-„was ist das" ohne Setup |
| `/about` | A4-One-Pager, **PDF-Download** | Zum Dalassen/Mailen — Café-Chef hat was in der Hand |
| `/trailer` | 9:16 Trailer (Instagram-Format) | Stimmung + „so bewerbt ihr den Abend" |

## B) Live-Demo — der eigentliche Verkäufer
Echtes Mini-Spiel auf dem Café-Screen, du moderierst, 2–3 Handys spielen mit:
1. `/moderator` → Setup: Draft **„✨ Pitch-Demo · Café (2 Runden)"** wählen → starten
2. `/beamer` → auf TV/Beamer des Cafés (sehen die Gäste)
3. `/team` → 2–3 Handys scannen QR, treten bei

**Fertige Pitch-Draft** (`qq-pitch-demo`): 2 kurze Runden, leicht + publikums-
freundlich, alle 5 Mechaniken einmal (Schätzen · Multiple-Choice · Reihum-
Aufzählen · Bilderraten · Top-5), Eiffelturm + Panda als Bild-Fragen. **Nichts
vorzubereiten — nur starten.** (CHEESE-Bilder im Builder gegen café-eigene Fotos
tauschbar.) ⚠️ Erscheint erst nach dem Coolify-Redeploy im Draft-Picker.

**Ablauf:** Lobby → paar Fragen (verschiedene Mechaniken) → Brett-Eroberung →
Auflösung → **Siegerehrung**. Der ganze Abend in 5 Minuten.

## Café-Argumente (unbedingt einbauen)
- **Skaliert für volle Läden:** Cozy Arena (Fraktions-Lobby, bis ~24 Teams) —
  „egal ob 4 Tische oder 20". Das Bar-Quiz-Argument.
- **Ihr Branding drauf:** Café-Logo + Location-Skin (z.B. Studio Mono edel) →
  „sieht aus wie euer Laden".
- **Nachher-Wert:** `/summary/:roomCode` bzw. `/recap` — was Gäste mitnehmen +
  was das Café auf Insta posten kann → Wiederkommer.
- **Aufwand ≈ null:** du moderierst (Streamdeck-Flow); Café braucht nur Screen + WLAN.

## Praktische Checkliste (mitbringen/klären)
- [ ] **Screen** im Café (TV/Beamer) für `/beamer`
- [ ] **Moderations-Gerät** (Laptop/Tablet) — dein Setup
- [ ] **Gäste-Handys** (haben sie eh) → QR-Beitritt
- [ ] **Stabiles WLAN** — der einzige echte Ask ans Café
- [ ] Optional: **Streamdeck** für flüssigen Flow

## NICHT zeigen
Editor-/Tool-Routen (`/builder`, `/library`, `/katalog`, `/admin`, `/stats`,
`/fragen`) — das ist Backstage-Küche, nicht der Pitch.

---

## ⚠️ Was für den Pitch noch fehlt / offen
1. ✅ **Fertige Pitch-Demo-Draft** — angelegt (`qq-pitch-demo`, „✨ Pitch-Demo ·
   Café"). Erscheint nach dem Coolify-Redeploy oben im Draft-Picker.
2. **Geschäftsangebot / Preis** (Wolfs Seite, kein Code): Ein-Satz-Ask — was
   kostet das Café / Modell (Pauschale pro Abend · Café zahlt · Eintritt/Rev-Share).
   Ohne das hat der Pitch keinen Abschluss.
3. **WLAN-Fallback:** wenn Café-WLAN schwach → mobiler Hotspot als Plan B (der
   Live-Moment darf nicht am Netz scheitern).
4. **Social Proof:** eine Referenz / „schon gespielt bei …" / kurzes Testimonial,
   falls vorhanden — stärkt den Pitch spürbar.
5. **Backend live halten:** vor dem Termin ⚠️ Coolify-Redeploy prüfen, damit die
   Live-Demo nicht auf halb-deploytem Stand läuft.
