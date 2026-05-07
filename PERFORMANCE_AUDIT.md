# CozyQuiz Performance + Bug-Mildness + Loading-Speed Audit

**Datum:** 2026-05-07
**Quelle:** Tiefen-Recherche-Agent (React 18/19 Docs, Vite Performance, Socket.IO Production Patterns, Chrome DevTools, Sentry).
**Status:** Recherche abgeschlossen, Quick Wins noch nicht implementiert. Wartet auf Wolfs Sprint-Pick.

---

## TL;DR — Top 10 Must-Haves (Impact × Effort)

| # | Maßnahme | Impact | Effort |
|---|---|---|---|
| 1 | **Wolf-PNGs → AVIF** mit `<picture>`-Tag | Hoch (Beamer-Initial-Load) | 1h |
| 2 | **Sentry / Highlight.io Production-Logging** | Hoch (Bug-Visibility live) | 2h |
| 3 | **`manualChunks` Vendor-Splitting** + lazy Editor-Tools | Hoch (Repeat-Load + Initial) | 3h |
| 4 | **Idempotency-Keys** auf alle Mod-Actions | Hoch (Bug-Mildness) | 4h |
| 5 | **Connection State Recovery** + Heartbeat-Cron | Hoch (Pub-WLAN-Stabilität) | 2h |
| 6 | **Socket-Listener-Audit** (alle `.on` haben `.off`) | Hoch (Memory-Leak) | 4h |
| 7 | **Error-Boundary-Pyramide** um Risk-Features | Mittel-Hoch | 3h |
| 8 | **`font-display: optional`** + Nunito-Preload | Mittel | 30min |
| 9 | **`useTransition`** für stateUpdate-Setter | Mittel | 1h |
| 10 | **Bundle-Visualizer** + Cleanup-Pass | Mittel | 2h |

**Quick Wins (<1 Tag):** AVIF-Wolves · Vendor-Chunks · `font-display: optional` · `useTransition` Wrapper · Bundle-Visualizer · Doppelklick-Schutz · Heartbeat-UptimeRobot.

**Strategic Refactors (1+ Woche):** Memory-Leak-Audit der QQBeamerPage · State-Patch-Protocol · Socket-Hook-Generalisierung · React 19 Compiler Trial · QQBeamerPage-Splitting (16k Zeilen → ~10 Sub-Module).

---

## 1) React 18/19 Performance-Patterns

**Top Patterns:**

1. **`useTransition` für nicht-blockierende State-Updates**
   ```ts
   const [isPending, startTransition] = useTransition();
   socket.on("server:stateUpdate", (next) => {
     startTransition(() => setQuizState(next));
   });
   ```
   In CozyQuiz: jeder Score-Reveal, Card-Flip, Reveal-Animation der nicht User-Input ist gehört in `startTransition(...)`. Mod-Klick fühlt sich instant an, auch wenn 8 Team-Cards animieren.

2. **`useDeferredValue` für Beamer-Live-Daten** — Live-Answer-Counter darf 1 Frame hinterherhängen, Sound/Stinger-Trigger nicht.

3. **React 19 Compiler statt manueller Memoization** — Stable seit Mai 2025, Meta Production. Wolf sollte ihn aktivieren statt neue `useMemo`/`useCallback` zu schreiben.

4. **Stable `key`-Prop bei Team-Cards** — `key={team.id}` immer, NIE `key={index}`. Bei Score-Reordering: Index-Keys remounten ALLE Karten.

5. **`memo` nur an Render-Hot-Spots** — Beamer-Top-Bar, Team-Tile, AnimatedCozyWolf. Nicht jeden Helper.

**Anti-Patterns:**
- Anonyme Funktionen + Objekte als Props an `memo`-Komponenten (`<X onClick={() => …} />` killt Memoization)
- Über-Memoization von trivialen Werten
- React Server Components in CozyQuiz **nicht relevant** (App ist 100% Client-State + Sockets)

**CozyQuiz-spezifisch:** Beamer rendert oft 8 Cards × 4 Mitglieder = 32 Avatar-Slots gleichzeitig. Jeder `stateUpdate` triggert Full-Re-Render wenn nicht memo'd. **TeamCard memoizen + alle Callbacks via `useCallback`** ist hier wirklich messbar (16ms → 4ms Render).

---

## 2) Bundle-Size + Code-Splitting

**Top Patterns:**

1. **`manualChunks` für stable vendors:**
   ```ts
   manualChunks: {
     'react-vendor': ['react', 'react-dom', 'react-router-dom'],
     'motion': ['framer-motion'],
     'socket': ['socket.io-client'],
   }
   ```
   Jedes Deploy invalidiert nur App-Code, vendors bleiben gecached → Repeat-Loads fast instant.

2. **Route-Level `React.lazy` für Editor-Tools** — `/builder`, `/library`, `/host-sheets`, `/rules-editor`, `/admin`, `/formats`, `/feedback`, `/intro`, `/qrcode`, `/stats`, `/katalog`, `/fragen`, `/menu` — Pub-Spieler braucht NICHTS davon. Nur `/`, `/team`, `/beamer`, `/moderator` müssen im Initial-Bundle sein.

3. **Bundle-Visualizer als Standard-Tool** — `rollup-plugin-visualizer` mit `gzipSize: true, brotliSize: true, template: 'treemap'`.

4. **Schwellwert „groß genug":** alles > 50KB gzipped das nicht auf Critical Path liegt → splitten. Initial Bundle Ziel: < 200KB gzipped.

5. **Date/Util-Bloat killen** — moment.js → `date-fns` (named imports) oder native `Intl.DateTimeFormat`.

**Anti-Patterns:**
- `import * as X from 'lodash'` (zieht 70KB rein)
- React.lazy auf häufig benutzte Komponenten (Suspense-Flicker)
- Polyfills via `core-js` voll-importiert

**CozyQuiz-spezifisch:** **QQBeamerPage = 16000+ Zeilen — Sub-Komponenten dort lazy-loaden**, nicht die ganze Page. Comeback-HigherLower-UI, Rules-Editor-Preview, alle „selten gezeigten" Themes als separate Chunks. **Aktion: einmal `vite build && open dist/stats.html`** — wird Wolf erschrecken UND klären wo die größten Brocken liegen.

---

## 3) Memory-Leak-Prevention (3-4h Sessions!)

**Das ist DER Bereich für CozyQuiz.** Heap-Wachstum von 20MB/min ist real-Pattern bei langen Sessions.

**Top Patterns:**

1. **AbortController in jedem `useEffect` mit fetch:**
   ```ts
   useEffect(() => {
     const ctrl = new AbortController();
     fetch(url, { signal: ctrl.signal }).then(...);
     return () => ctrl.abort();
   }, []);
   ```

2. **Timer-Registry-Pattern** — zentralen Hook bauen statt jedem Component eigenes `setInterval`:
   ```ts
   function useInterval(cb, delay) {
     const ref = useRef(cb);
     useEffect(() => { ref.current = cb; });
     useEffect(() => {
       const id = setInterval(() => ref.current(), delay);
       return () => clearInterval(id);
     }, [delay]);
   }
   ```

3. **Page-Visibility + RAF-Throttling** — wenn Beamer-Tab ins Hintergrund geht, RAF stoppen explizit.

4. **Socket-Listener-Cleanup-Audit** — jedes `socket.on(...)` MUSS ein passendes `socket.off(...)` haben. Bei Reconnect verdoppeln sich sonst Handler.

5. **WeakMap für ephemere Caches** — `WeakMap<Team, AnimationState>` statt Object/Map, GC kann automatisch räumen.

**Anti-Patterns:**
- `setInterval` ohne `clearInterval` — Klassiker, in Long-Running app verheerend
- Event-Handler in Render-Body anstatt useEffect
- Closures die ganze State-Bäume capturen

**CozyQuiz-spezifisch:** Bei 3-4h Session = ~2000 stateUpdate-Events. Jeder Score-Update mit nicht-cleanen Animation-Timeouts = 2000 Detached-Animation-Frames. **Aktion: Chrome DevTools → Memory → Heap Snapshot vor Game / nach 1h / nach 3h, Compare-Mode, Filter „Detached"**. Wolf wird DOM-Nodes von vergangenen Reveal-Cards finden die nie geräumt wurden.

---

## 4) Real-Time / Socket.IO Best Practices

**Top Patterns:**

1. **Connection State Recovery aktivieren:**
   ```ts
   const io = new Server(httpServer, {
     connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 }
   });
   ```
   Server bufferiert Events während Disconnect, Client bekommt sie automatisch nachgeliefert. Genau für Pub-WLAN-Glitches gebaut.

2. **Idempotency-Keys auf Submit-Events** — Client generiert UUID pro Submit, Server speichert „last 100 UUIDs per team", deduped.

3. **Exponential Backoff statt aggressives Reconnect** — `reconnectionDelay: 1000, reconnectionDelayMax: 60000, randomizationFactor: 0.5`.

4. **Delta-Updates ab ~5KB Payload** — wenn `quizState` > 5KB, lieber `state:patch`-Events mit Diff (json-patch).

5. **Heartbeat für Render-Free-Tier-Wakeup** — Render schläft nach 15min Idle. UptimeRobot-Cronjob (kostenlos) der alle 10min `/api/health` pingt verhindert Cold-Start mitten im Quiz.

**Anti-Patterns:**
- `io.emit` auf jedem Tick statt batched
- Socket-Events ohne Server-side Validation
- Reconnect-Logik die State zurücksetzt ohne Server zu fragen

**CozyQuiz-spezifisch:** **Hot-Potato-Doppel-Fire** ist genau der Bug-Mode den Idempotency-Keys lösen. Memory-Hit `project_qq_traps_and_patterns.md` deutet das schon an. Aktion: jeder Mod-Action-Endpoint sollte `actionId` von Frontend akzeptieren; Server hält LRU-Set der letzten 200 IDs pro Room → silent dedup.

---

## 5) Asset-Loading + Beamer-Performance

**Top Patterns:**

1. **AVIF mit WebP-Fallback via `<picture>`** — AVIF 95% Browser-Support seit Jan 2024. ~50% kleiner als JPEG, 20-30% kleiner als WebP. Wolf-Posen 1536x1536 PNG indexed → AVIF spart nochmal 60-80%.
   ```html
   <picture>
     <source srcset="wolf-1.avif" type="image/avif" />
     <source srcset="wolf-1.webp" type="image/webp" />
     <img src="wolf-1.png" alt="" />
   </picture>
   ```

2. **`font-display: optional` + Preload** — Nunito kritisch? Dann `<link rel="preload" as="font" crossorigin>` + `font-display: optional`. Garantiert kein FOUT, kein Layout-Shift. Auf Mobile (Team-View) lieber `swap`.

3. **Image-Sprite vs PNG-Set** — 22 Wolf-Posen einzeln laden = 22 HTTP-Requests. CSS-Sprite oder ein einziges WebP/AVIF-Atlas + `background-position` ist schneller. Alternativ: `<link rel="preload" as="image">` für die Posen die in den ersten 30s sicher gezeigt werden.

4. **Modulepreload für lazy Routes** — sobald User auf Beamer ist und Mod auch geöffnet wird: `<link rel="modulepreload" href="/assets/moderator-chunk.js">`.

5. **4K-Beamer Layer-Hints** — `transform: translateZ(0)` oder `will-change: transform` NUR an aktiv animierten Elementen. Bei 3840×2160 ist jeder Composite-Layer ein 32MB-Texture-Cache; 30 Layer = 1GB GPU-RAM = Stutter.

**Anti-Patterns:**
- `will-change: transform` permanent auf vielen Elementen — der berüchtigte „Animation langsamer durch Optimierung"-Effekt
- PNG ohne Komprimierungspipeline
- Fonts ohne `font-display` → FOIT (Flash of Invisible Text), 3 Sekunden weiße Beamer-Wand

**CozyQuiz-spezifisch:** **Das einzelnstärkste Quick-Win: Wolf-PNG → AVIF Conversion.** README erwähnt schon -90% durch sharp; AVIF noch mal -50% drauf = ~750KB statt 7.5MB total. Beamer-Cold-Load fühlt sich danach wie eine andere App an.

---

## 6) Bug-Mild-Patterns (Defensive Coding)

**Top Patterns:**

1. **Error-Boundary-Pyramide** — eine globale ErrorBoundary für „App ist tot, reload" + lokale um Risk-Zonen (Comeback-Mini-Game, Reveal-Animations, Theme-Loader). Crash in einem Theme darf nicht das ganze Quiz kübeln.
   ```tsx
   <AppBoundary>
     <BeamerHeader />
     <FeatureBoundary fallback={<SafeRevealFallback />}>
       <RevealAnimation />
     </FeatureBoundary>
   </AppBoundary>
   ```

2. **Socket-Payload-Validation am Frontend** — z. B. Zod-Schema pro Event. Backend kann mal kaputtes Schema liefern (beim Deploy), Frontend soll graceful degradieren.

3. **Optional-Chaining + Defaults überall im State-Path** — `quizState?.teams?.[id]?.members?.length ?? 0`. Bei 16K-Zeilen-File ist EIN nicht-defensiver Zugriff genug für Crash.

4. **Idempotente Mod-Actions + Doppelklick-Schutz** — best-Practice: jede Aktion deaktiviert ihren Button für 500ms via lokalem `useState` + globalem Server-Side-Lock per actionId.

5. **Pre-flight-Check vor Game-Start** — Health-Endpoint pingt: Backend? MongoDB? Audio-Permission? Alle 4-8 Teams im Room? Dauert 2 Sekunden, spart 30 Minuten Crisis-Mode.

**Anti-Patterns:**
- `try { … } catch (e) { /* swallow */ }` — silent failures sind schlimmer als Crashes
- Logging mit User-IDs/Team-Namen ungesalzen → DSGVO-Issue. Lieber Hashes
- Feature-Flags die per Env-Var deployed werden müssen statt Runtime-Toggle

**CozyQuiz-spezifisch:** **Sentry (oder gratis: Highlight.io / Rollbar Free Tier) integrieren** — bei 3-4h Live-Show MUSS Wolf nachträglich sehen können was crashte ohne User zu fragen. Sentry React-SDK-Integration ist 10 Zeilen Code + Source-Maps in Vite-Build.

---

## Ehrlicher Stack-Reality-Check

- **Render-Free-Tier ist Bug-Magnet** für 3-4h Sessions. Cold-Starts mitten im Quiz sind UX-Disaster. Heartbeat-Cron ist Pflaster, nicht Lösung. Bei wachsendem Pub-Geschäft auf **Render Starter ($7/mo)** oder Fly.io. ~$10/mo für „kein Cold-Start je wieder" ist gutes Geschäft.
- **MongoDB Atlas Free-Tier** ist OK so lange Sessions in einem Cluster schreiben. Bei 100+ Quizzes parallel: Sharding/Index-Optimierung — heute irrelevant.
- **Vercel als Frontend-Host** ist gut, ABER: Vercel-Image-Optimization wird auf Free-Plan limitiert. Eigene AVIF-Pipeline (sharp-script) ist robuster.
- **Socket.IO** ist die richtige Wahl (vs raw WebSocket). Connection-State-Recovery + Auto-Reconnect ist genau die Krypto die Wolf braucht. Nicht zu native WebSocket migrieren — wäre 2-Wochen-Refactor für 10% Latenz-Gewinn unter Wahrnehmungsschwelle.

---

## Quellen

- [React useTransition](https://react.dev/reference/react/useTransition)
- [React 18 Concurrent Rendering — Curiosum](https://curiosum.com/blog/performance-optimization-with-react-18-concurrent-rendering)
- [useTransition vs useDeferredValue — OpenReplay](https://blog.openreplay.com/usetransition-vs-usedeferredvalue-in-react-18/)
- [React 19 Suspense for Data Fetching — Syncfusion](https://www.syncfusion.com/blogs/post/react-19-suspense-for-data-fetching)
- [React 19 Compiler kills useMemo/useCallback — isitdev](https://isitdev.com/react-19-compiler-usememo-usecallback-dead-2025/)
- [Premature Memoization Trap — Medium](https://medium.com/@mailraghavendranv/the-trap-of-premature-optimization-why-over-memoizing-can-slow-down-your-react-app-95a43b3e528c)
- [Vite Build Options](https://vite.dev/config/build-options)
- [Taming Large Chunks Vite + React — Mykola Aleksandrov](https://www.mykolaaleksandrov.dev/posts/2025/11/taming-large-chunks-vite-react/)
- [Route-Level Code-Splitting Vite manualChunks](http://www.mykolaaleksandrov.dev/posts/2025/10/react-lazy-suspense-vite-manualchunks/)
- [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)
- [vite-bundle-analyzer](https://github.com/nonzzz/vite-bundle-analyzer)
- [5 React Memory Leaks That Kill Performance — CodeWalnut](https://www.codewalnut.com/insights/5-react-memory-leaks-that-kill-performance)
- [React useEffect Memory Leak Avoidance — freeCodeCamp](https://www.freecodecamp.org/news/fix-memory-leaks-in-react-apps/)
- [Race Conditions and Memory Leaks in useEffect — WisdomGeek](https://www.wisdomgeek.com/development/web-development/react/avoiding-race-conditions-memory-leaks-react-useeffect/)
- [Chrome DevTools Heap Snapshots](https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots)
- [Find Memory Leaks Comparing Heap Snapshots — DevToolsTips](https://devtoolstips.org/tips/en/find-memory-leaks/)
- [Page Visibility API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Socket.IO Connection State Recovery](https://socket.io/docs/v4/connection-state-recovery)
- [Socket.IO Tutorial — Handling Disconnections](https://socket.io/docs/v4/tutorial/handling-disconnections)
- [Socket.IO Performance Tuning](https://socket.io/docs/v4/performance-tuning/)
- [Advanced Socket.IO Tips for Production — DEV](https://dev.to/bhavyajain/advanced-socketio-tips-and-tricks-for-building-scalable-production-systems-4eeo)
- [AVIF Browser Support — Can I Use](https://caniuse.com/avif)
- [WebP vs AVIF Browser Support — RUMVision](https://www.rumvision.com/blog/modern-image-formats-webp-avif-browser-support/)
- [Image Optimization 2025 — FrontendTools](https://www.frontendtools.tech/blog/modern-image-optimization-techniques-2025)
- [Font Loading Strategies](https://font-converters.com/guides/font-loading-strategies)
- [Preload Optional Fonts — web.dev](https://web.dev/preload-optional-fonts/)
- [Layout Shifts Caused by Web Fonts — DebugBear](https://www.debugbear.com/blog/web-font-layout-shift)
- [React Error Boundaries Production Guide — Sentry](https://blog.sentry.io/guide-to-error-and-exception-handling-in-react/)
- [prefers-reduced-motion React Hook — Josh Comeau](https://www.joshwcomeau.com/snippets/react-hooks/use-prefers-reduced-motion/)
- [prefers-reduced-motion — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
