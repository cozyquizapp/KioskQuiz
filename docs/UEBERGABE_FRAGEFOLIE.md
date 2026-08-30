# Übergabe: die 29 bedingten Hooks in der Fragefolie

Geschrieben 2026-08-29 am Ende der /team-Sitzung, für die Sitzung, die den
Umbau macht. Wolf: „schau dir die 29 in der fragefolie an" — hier steht das
Ergebnis, damit ein neuer Chat nicht von vorn anfängt.

Alles hier ist gemessen oder aus dem Code gelesen, nicht aus dem Gedächtnis.

---

## 1. Der Befund in einem Satz

`react-hooks/rules-of-hooks` meldet 29 Warnungen in
`frontend/src/components/CozyQuizQuestionView.tsx`. Sie stammen **alle von
einer einzigen Zeile**.

```ts
export function QuestionView({ state: s, revealed, hideCutouts }) {   // Zeile 168
  const q = s.currentQuestion;
  if (!q) return null;                                                // Zeile 170
  …
  const lang = useLangFlip(s.language);                               // Zeile 199
```

Danach folgen 29 Hooks bis Zeile 567, alle hinter diesem `return`. Die Datei
ist 4243 Zeilen lang, deshalb sieht es nach viel mehr aus, als es ist.

Aufteilung: 22 `useEffect`, 18 `useState`, 9 `useMemo`, 4 `useRef` über die
ganze Datei; die 29 hier sind der Teil, der hinter dem Ausstieg liegt.

## 2. Warum es heute NICHT gefährlich ist

Der Fehler, den die Regel abfängt, braucht **dieselbe gemountete Instanz**, bei
der `q` zwischen null und gesetzt kippt. Genau das verhindern beide
Live-Aufrufstellen mit einem Key:

```
frontend/src/pages/QQBeamerPage.tsx:2372
  <QuestionView key={renderState.currentQuestion?.id} … />
frontend/src/components/QQBuiltinSlide.tsx:204
  <QuestionView key={s.currentQuestion?.id ?? 'preview'} … />
```

Ändert sich `currentQuestion`, ändert sich der Key, React montiert neu — und
eine frische Instanz, die sofort `null` zurückgibt, ist in sich schlüssig. Ein
Wechsel von „Frage da" nach „Frage weg" kann den Key nicht unverändert lassen,
weil `null` keine Id hat.

⚠️ **Die Sicherheit hängt damit an der Aufrufstelle, nicht an der Komponente.**
Wer sie einmal ohne Key einbaut, hat den Absturz („Rendered fewer hooks than
expected"), und die Lint-Regel kann diesen Zusammenhang nicht sehen. Zwei
weitere Aufrufstellen stehen schon ohne Key da:

```
frontend/src/pages/QQShowroomPage.tsx:101, :105   (feste MOCK_QUESTION, folgenlos)
frontend/src/pages/QQQuestionTestPage.tsx:70      (hat einen Key)
```

## 3. Der vorgeschlagene Umbau

Standardmuster: außen die Wache, innen die Arbeit.

```ts
export function QuestionView(props: { state: QQStateUpdate; revealed: boolean; hideCutouts?: boolean }) {
  const q = props.state.currentQuestion;
  if (!q) return null;
  return <FrageFolie {...props} frage={q} />;
}

function FrageFolie({ state: s, revealed, hideCutouts, frage: q }: { … frage: QQQuestion }) {
  // die 29 Hooks, unverändert
}
```

`currentQuestion` ist `QQQuestion | null` (shared/quarterQuizTypes.ts:1331);
die innere Komponente bekommt es als garantiert gesetzte Eigenschaft.

**Was sich NICHT ändert:** keine Hook-Logik, keine Reihenfolge, kein Verhalten.
Der Rumpf wandert unverändert in die innere Funktion, `q` kommt als Prop statt
aus `s`. Aus 29 Warnungen werden 0, und die Sicherheit wandert von der
Aufrufstelle in die Komponente.

## 4. Wie man es absichert

Die Fragefolie ist die meistgesehene Ansicht des Abends. Nach dem Umbau:

```bash
npm run gate                                    # 0 Fehler, 95 Tests, Warnungen 496 → 467
node scripts/handy-gleichlauf.mjs --frisch      # CozyQuiz, 7 Stationen
node scripts/handy-gleichlauf.mjs --mega --frisch --secs=260   # CrowdQuiz, 7 Stationen
```

`handy-gleichlauf.mjs` vergleicht Bühne und Handy im selben Moment (Frage,
Kategorie, Timer, Teamname, Sprache, Phase, Bedienung) und hat einen
Selbsttest: `node scripts/handy-gleichlauf.mjs --selbsttest` muss 9/9 sagen,
BEVOR ein leerer Bericht etwas bedeutet.

Dazu ein Blick auf die Bühne selbst — die Folie hat Kategorie-Sonderfälle
(SCHAETZCHEN-Zahlenstrahl, MUCHO-Optionen, 10v10-Verteilung, CHEESE-Bild), und
die Hooks ab Zeile 351 hängen genau daran. Mindestens eine Frage je Kategorie
durchspielen.

## 5. Was der Umbau NICHT ist

Kein Design. Die Bühne ist eingefroren (CLAUDE.md). Hier wird eine Funktion
geteilt, kein Pixel bewegt. Wer beim Umbau eine Gestaltungsfrage findet:
notieren, nicht mitmachen.

## 6. Stand des Repos

Branch `claude/cozyquiz-crowdquiz-team-design-n8sazy`, 17 Commits vom
2026-08-29, alles gepusht, Gate grün (0 Fehler, 95 Tests, 496 Warnungen).

Die Warnungen im Überblick, damit klar ist, was der Umbau erledigt und was
nicht:

| Regel | Anzahl |
|---|---:|
| `@typescript-eslint/no-unused-vars` | 330 (meist `catch (e)` ohne `_`) |
| `react-hooks/exhaustive-deps` | 73 (meist bewusst, mit Kommentar) |
| `react-hooks/rules-of-hooks` | 60 — **29 davon hier** |
| Unused eslint-disable directive | 33 (`eslint --fix` entfernt sie) |

Die übrigen 31 `rules-of-hooks` sitzen in QQBeamerPage (15), QQProgressTree
(6), CozyQuizFinalRevealView (4) und sechs weiteren — vermutlich dasselbe
Muster, aber ungeprüft.
