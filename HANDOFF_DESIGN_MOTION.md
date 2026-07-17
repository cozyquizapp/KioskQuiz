# Handoff: Design-/Motion-Wertigkeits-Pass (2026-07-17)

> Fuer die Weiterarbeit NACH einem Compact. Ziel: nahtlos auf gleichem Niveau weiter.
> Voller Kontext in Memory [[project-design-motion-elevation]] + [[reference-beamer-harness]].

## Wo wir stehen
- **Branch:** `design/material-pass-standings-bar` (NICHT main). `main` bleibt sauber bis
  Wolf einen Merge freigibt (er will Design vorab sehen; jeder Push auf main deployt live).
- **Nordstern (gelockt):** „Premium schlaegt fruehere Deko." Wertigkeit ist der Massstab.
  Kehrt ein Fix eine fruehere Entscheidung um → VORHER benennen, dann aendern.
- **✅ Fertig + abgenommen:** Gesamtstand-Balken-Reskin (weisser Slider-Punkt raus →
  Stein-Rille + Edelstein-Fuellung), Wolf „viel besser ohne". Auch die Score/Standings-
  Tafel (Ueberschriften weg, auf gemalte Tafel gesetzt) — Wolf „richtig gut geworden".

## Zwei Audits gelaufen (auf ECHTEN Beamer-Screenshots, adversarial gegengeprueft)
1. **Defekt-Audit:** 3 echte Bugs. Em-Dash in CrowdTopReveal ✅ gefixt (Branch). RULES-
   Lobby-Durchscheinung + leeres „Happy Hour"-Motto: Wolf glaubt = Foto-Timing, nicht
   verfolgt (er prueft selbst).
2. **Geschmacks-Audit (Material):** „UI billiger als deine Assets". Voller Text +
   Motion-Streifen in `Desktop/für claude/design-vorschau/`.

## Motion-Pass (Wolfs Hauptanliegen: „billig wie PowerPoint")
- **Diagnose:** Screens treffen nicht als Ganzes ein; Inhalte faden uniform (`contentReveal`
  = opacity+translateY20px) in feste Kaesten. Regel-Karte schiebt horizontal rein
  (`qqRulesSlideR`, CozyQuizRulesView.tsx:719) = PPT-Push (war Wolfs Juli-Wunsch, jetzt weg).
- **Motion-Landkarte halb fertig:** 6 Film-Streifen der Front-Uebergaenge in
  `Desktop/für claude/design-vorschau/motion-MAP-*.png`. Erst 2 beurteilt.

## Naechste Schritte (genau hier weiter)
1. Die 6 MAP-Streifen fertig beurteilen (premium/billig + Vorschlag je Moment).
2. Hinten filmen: Finale/Kroenung/GameOver (braucht Durchspielen bis Spielende).
3. Prototyp Regel-Auftritt: „Fade-up im toten Kasten + PPT-Schub" → „Ankunft als Einheit
   aus der Tiefe + Signatur je Moment". Vorher/Nachher-Streifen in den Ordner, dann Wolf
   fragen. Danach Screen fuer Screen ausrollen. `animate`-Skill als Massstab.
4. Wolf hat in `Desktop/für claude/` weiteres Material abgelegt (seine Screenshots/Kontext)
   → nach Compact mit frischem Kopf durchsehen.

## Bedienung (Details in [[reference-beamer-harness]])
- Server: Backend `env -u MONGODB_URI npm run dev` (4000, Raum vorher loeschen!), Frontend
  5173. Beamer fahren: `node scripts/beamer-shot.mjs` / `shot-placement.mjs` / `record-run.mjs`.
- ⚠️ Read-Bilder sieht nur die KI → immer nach `Desktop/für claude/design-vorschau/` kopieren.
- ⚠️ Zwei PINs (session `qq_admin_pin` + local `qq-admin-pin`, beide 2506), Raum persistiert,
  ts-node-dev ueberlebt npm-stop. Regeln: erst ROT dann GRUEN, echter Beamer, Asset ausmessen.
