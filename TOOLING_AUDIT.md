# CozyQuiz Stack-Audit 2026 — IDE / Hosting / Build-Tool

**Datum:** 2026-05-08
**Quelle:** Tiefen-Recherche-Agent (VS Code/Cursor/Zed/Windsurf, Render/Hetzner/Coolify/DO/Cloudflare, Vite/Bun/Rspack/Turbopack — je 6+ Quellen pro Block).
**Status:** Recherche abgeschlossen, Migration nicht begonnen.

---

## TL;DR — Wolfs „2x oder bleib"-Regel

| Maßnahme | Speedup/Gewinn | Empfehlung |
|----------|---------|------------|
| **Render → Hetzner+Coolify** | EU-Latenz halbiert + RAM 8x + Kosten halbiert | **MACHEN** |
| **3 VS Code-Extensions** (Error Lens / Pretty TS Errors / Console Ninja) | 10-20% weniger Debug-Reibung | **MACHEN, 30 min** |
| **`npm install` → `bun install`** | 10-20x schnelleres Install | **MACHEN, low risk** |
| Vite → Bun-Bundler | 0% (Rolldown hat Lücke geschlossen 2026) | Skip |
| VS Code → Cursor / Windsurf / Zed | 10-15% schnelleres Tippen + $15-20/mo | Skip |
| Cloudflare Workers für Backend | Edge-Latency aber Socket.IO-Refactor 2 Wochen | Skip |

---

## A) IDE/Editor — VS Code 2026

### Kurzanalyse
VS Code + **Claude Code CLI** ist 2026 für Wolfs Workflow **der Default mit der besten Risiko/Nutzen-Bilanz**. Einziger messbarer Schmerzpunkt: Inline-Autocomplete in Cursor/Windsurf eine Spur smoother. Aber: Wolf nutzt Claude Code als Hauptgehirn — Editor-Hülle ist sekundär.

### Tabelle Alternativen

| Tool | Pro | Con | Lock-in | Wolf-Verdict |
|------|-----|-----|---------|---------------------|
| **VS Code + Claude Code** (current) | Stabil, riesiges Plugin-Ecosystem, gratis, Claude Code als CLI integriert | Inline-AI nicht so „fluide" wie Cursor | Null | **Bleiben** |
| **Cursor** | Composer + Tab-Completion top | $20/mo zusätzlich zu Claude-Sub | Niedrig (VS Code-Fork) | Skip — du hast Claude Code |
| **Zed 1.0** (April 2026 GA) | 0.4s Start, 180MB RAM, Claude Code via ACP | Plugin-Eco viel kleiner, einige TS-Refactorings fehlen | Mittel | Skip vorerst — zu früh für Solo-Prod |
| **Windsurf (Cognition)** | Cascade top für Multi-File-Refactor, $15/mo | Fork-Risk (Cognition-Übernahme), Indexer flaky | Niedrig | Skip |
| **WebStorm 2026.1** | Bester TS-Refactor, Junie + Claude Agent integriert | $15-20/mo, RAM-hungrig, anderes Mental-Model | Mittel | Skip — Lernkurve lohnt für 1 App nicht |
| **Bolt.new / v0 / Lovable** | Browser-AI, schnelle Prototypen | Kein echtes Backend, Layout-Memory degeneriert >15 screens | Hoch | **Skip hart** — für 16k-Zeilen-App ungeeignet |
| **Replit** | Cloud-collab | Zu lahm + teuer für Solo-Prod | Hoch | Skip |

### Verdict
**Bleiben.** Aber 3 Extensions installieren falls noch nicht da:

1. **Error Lens** — Inline-Errors statt Hover. Spart bei TS-heavy-Code 10-20 Klicks/Stunde
2. **Pretty TypeScript Errors** — macht Socket.IO-Generics-Errors wieder lesbar
3. **Console Ninja** — `console.log`-Werte direkt im Editor neben der Zeile (gratis Tier reicht). Bei Beamer-Debug-Sessions echter Game-Changer

### Migration: keine

---

## B) Backend-Hosting — Render

### Kurzanalyse
Render Starter $7/mo ist **OK, aber überteuert für was man kriegt**: 512 MB RAM, single-instance, US-Region (Latenz nach EU 100-150ms zusätzlich für jedes Socket-Roundtrip). Für Pub-Quiz-Geschäft (Live-Latency = User-Experience) ist das der **echte Hebel** in der Stack.

WebSocket-Nuance: Render-Doc bestätigt — auf Free Tier zählten WebSocket-Messages **nicht** als „Aktivität", d. h. Service konnte mitten im laufenden Quiz spindown machen. Auf Starter ist das gefixt (always-on), aber EU-Latenz bleibt.

### Tabelle Alternativen

| Option | Preis/mo | Always-on? | WS? | EU-Region? | Lock-in | Wolf-Verdict |
|--------|----------|------------|-----|------------|---------|--------------|
| **Render Starter** (current) | $7 | Ja | Ja | Frankfurt verfügbar | Niedrig (Docker) | OK aber nicht optimal |
| **Hetzner CX22 + Coolify** | €3.79 (~$4) | Ja | Ja | Falkenstein/Nürnberg/Helsinki | Niedrig (eigener Docker) | **★ TOP-EMPFEHLUNG** |
| **DigitalOcean App Platform Basic** | $5 | Ja | Ja (paid only) | Frankfurt | Niedrig | Solide Plan B |
| **Railway Hobby** | $5 + usage | Ja | Ja | EU | Niedrig | Skip — Outage-History 2025/26 + usage-Pricing |
| **Fly.io** | ~$2-5 | Ja | Ja | EU | Niedrig | Skip — Wolf will flat-rate |
| **Heroku Eco** | $5 | **Nein** (sleeps 30min) | Ja | EU | Mittel | **Skip hart** für Live-Quiz |
| **Cloudflare Workers + Durable Objects** | $5/mo Sockel | Ja | Ja, aber Socket.IO **nicht direkt** | Edge global | Hoch | Skip — Socket.IO-Refactor zu groß |
| **Vercel Functions** | inkl. | Nein (serverless) | Eingeschränkt | Edge | Hoch | Skip — kein Long-Live-Socket |
| **AWS Lightsail** | $3.50 | Ja | Ja | EU | Niedrig | Funktioniert, aber DIY |

### Wolfs „2 eigene Websites"
Wenn die auf **Hetzner/IONOS/Strato Managed-Hosting** laufen: **CozyQuiz-Backend nicht dort mit-hosten**. Managed-Webhosting unterstützt selten Long-Lived-WebSockets + Node.js-Prozesse vernünftig. Wenn aber bereits ein **Hetzner Cloud VPS** für die Sites: ja, Coolify drauf, alles auf eine €4-Box.

### Verdict
**Wechsel zu Hetzner CX22 + Coolify** ist der einzige Stack-Switch der sich für CozyQuiz wirklich rechnet:

- **Latency-Win**: 20-40 ms (DE→DE) statt 100-150 ms (DE→US-Render). Bei 4-Connect-Reveal mit 6 Teams gleichzeitig = spürbar
- **Kosten**: €3.79/mo statt $7 (~halber Preis)
- **Headroom**: 4 GB RAM statt 512 MB
- **Beide Render-Schmerzen weg**: Cold-Start-Risiko (Free) + EU-Latenz (Starter)

**Caveat ehrlich**: Coolify ist nicht 1-Klick wie Render. Du musst:
- VPS bestellen + SSH-Keys (30 min)
- Coolify-Installer (15 min, ein bash-Befehl)
- Domain (cozyquiz-api.cozywolf.de) auf Hetzner-IP zeigen + Cloudflare davor (30 min)
- Backend als Docker via Github-Push deployen (30 min Setup)
- MongoDB-URI + Cloudinary-Env-Vars in Coolify-UI (10 min)

**Realistisch ~3-4h für Erstmigration**, danach läuft's. Claude Code kann die Coolify-Configs schreiben.

### Migration-Roadmap

1. **Hetzner-Account + CX22 in Falkenstein** bestellen (€3.79/mo) — 15 min
2. **Coolify-Install** via offizielles Hetzner-Image oder `curl -sSL https://cdn.coollabs.io/coolify/install.sh | bash` — 30 min
3. **Cloudflare in front** für DDoS + SSL (gratis) — 30 min
4. **Backend als Docker-Image** via Github-Connect in Coolify deployen — 1h
5. **Env-Vars setzen** (MONGODB_URI etc.) — 10 min
6. **Vercel Frontend `VITE_SOCKET_URL` umpunkten** auf neue Domain — 5 min
7. **Parallel-Test 1 Woche** vor finalem Cutover — Render bleibt aktiv
8. **Render kündigen** nach 7 grünen Tagen

**Total: ~4h aktive Arbeit + 1 Woche Beobachten.**

**Plan B falls Coolify zu komplex**: DigitalOcean App Platform Basic $5. Ähnlich wie Render aber Frankfurt-Region und etwas günstiger. Migration: ~1h. Aber nur 10-15% Verbesserung — würde ich nicht machen wegen der „2x oder bleib"-Regel.

---

## C) Build-Tool — Vite

### Kurzanalyse
Vite **ist** 2026 das State-of-the-Art für React-SPAs. Vite 8 (März 2026) hat mit Rolldown den Rust-Bundler integriert — der einzige Vorsprung den Bun/Rspack mal hatten ist weg. Wolf ist hier **bereits an der Spitze**.

### Tabelle Alternativen

| Tool | Cold-Build (500-Mod-React) | HMR | Plugin-Eco | Wolf-Verdict |
|------|----------------------------|-----|-----------|--------------|
| **Vite 6/7/8** (current) | 0.4-0.6 s mit Rolldown | 10-15ms | 800+ Plugins | **Bleiben** |
| **Bun bundler** | 0.8 s | 30 ms, **kein React Fast Refresh stabil** | Klein | Skip für Frontend |
| **Rspack** | Schnellste Kalt-Builds | OK | Webpack-API-kompatibel | Skip — kein Mehrwert ggü. Vite 8 |
| **Turbopack** | Top, aber **nur in Next.js** | Top | Nur Next | Skip — Wolf nicht in Next |
| **esbuild standalone** | Schnell, aber kein Fast Refresh | Manuell | Niedrig | Skip |
| **Webpack 5** | Lahm | Lahm | Riesig (legacy) | Skip — wäre Regression |
| **Parcel** | OK | OK | Klein | Skip — verwaist gefühlt |

### Hybrid-Tipp 2026
**Bun als Package-Manager + Vite als Bundler** ist der häufigste „Best of Both"-Pattern 2026. Bun installiert npm-Pakete 10-20x schneller als npm/pnpm. Wenn `npm install` als Schmerz empfunden wird: einfach `bun install` statt `npm install` ausprobieren — null Build-Tool-Switch nötig, package.json bleibt identisch. Risiko niedrig, Gewinn klein-bis-mittel.

### Verdict
**Bleiben bei Vite.** Optional Bun als Package-Manager testen.

### Migration: keine

---

## Top-3 Empfehlung quer durch alle Blöcke

1. **(Backend-Wechsel — der einzige echte Hebel)** Hetzner CX22 + Coolify statt Render Starter. Halbe Kosten, 4x RAM, EU-Latenz für deutsche Pub-Quiz-Crowd. ~4h Migration. **Wenn Wolf nächste Woche eh einen Pufferabend hat: machen.**

2. **(VS Code aufrüsten — 30 min Aufwand, dauerhafter Gewinn)** Error Lens + Pretty TypeScript Errors + Console Ninja installieren. Drei Extensions die den Debug-Loop bei der QQBeamerPage.tsx (16k Zeilen!) spürbar verkürzen.

3. **(Bun als Package-Manager testen — 10 min)** `bun install` statt `npm install` probieren. Wenn's stabil läuft, Aliasse setzen. Wenn nicht: rollback mit `npm install`. Null Lock-in.

## Top-3 Skip — verlockend aber falsch

1. **Cursor / Windsurf / Zed wechseln**. Wolf hat Claude Code als Hauptgehirn. Editor-Hülle ist Hintergrund. Switching-Cost (Tag 1-3 unproduktiv) > Gewinn. Erst nochmal evaluieren wenn Claude Code seine VS-Code-Integration verschlechtert.

2. **Cloudflare Workers + Durable Objects** für Backend. Klingt nach „Edge-Magic", aber Socket.IO läuft nicht direkt — Server müsste umgeschrieben werden auf raw WebSocket + Durable-Object-State-Machine. Für 6 parallele Quizze nicht der Aufwand wert. Vielleicht in 2 Jahren wenn 100 parallele Pubs.

3. **Bolt.new / v0 / Lovable / Replit als Haupt-IDE**. Für 16k-Zeilen-Live-App mit Custom-State-Machines und Socket-Logik alle drei zu schwach. Browser-IDE-Hype lohnt für Throwaway-Prototypen, nicht für Production-Asset.

---

## Quellen

**A) IDE:**
- [Cursor vs VS Code vs Windsurf 2026 — daily.dev](https://daily.dev/blog/cursor-vs-vs-code-vs-windsurf-ai-code-editor-comparison)
- [Cursor vs VS Code with Copilot 2026 — is4.ai](https://is4.ai/blog/our-blog-1/cursor-vs-vscode-copilot-comparison-2026-279)
- [Zed 1.0 GA April 2026 — zed.dev/blog](https://zed.dev/blog/zed-1-0)
- [Is Zed ready for AI power users 2026 — builder.io](https://www.builder.io/blog/zed-ai-2026)
- [Windsurf vs Cursor 2026 — Vibe Coding Academy](https://www.vibecodingacademy.ai/blog/windsurf-vs-cursor)
- [WebStorm 2026.1 — JetBrains Blog](https://blog.jetbrains.com/webstorm/2026/03/webstorm-2026-1/)
- [Best VS Code Extensions 2026 — Builder.io](https://www.builder.io/blog/best-vs-code-extensions-2026)
- [Bolt.new Review 2026 — uxmagic.ai](https://uxmagic.ai/blog/bolt-new-review-2026-ai-app-builder-limits)

**B) Backend-Hosting:**
- [Render Pricing 2026 — render.com/pricing](https://render.com/pricing)
- [Render Pricing Explained 2026 — Kuberns](https://kuberns.com/blogs/render-pricing/)
- [Render real-time WebSockets article](https://render.com/articles/building-real-time-applications-with-websockets)
- [Hetzner Cloud Pricing 2026 — bestusavps](https://bestusavps.com/reviews/hetzner/)
- [Hetzner Cloud Review 2026 — Better Stack](https://betterstack.com/community/guides/web-servers/hetzner-cloud-review/)
- [Coolify on Hetzner — Hetzner Docs](https://docs.hetzner.com/cloud/apps/list/coolify/)
- [Self-Hosted PaaS 2026 — Server Compass](https://servercompass.app/blog/best-self-hosted-paas-platforms-2026)
- [Coolify vs Dokploy 2026 — Contabo Blog](https://contabo.com/blog/blog-coolify-vs-dokploy-comparison/)
- [Cloudflare Durable Objects WebSocket Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Heroku Eco $5 sleeping behavior — DigitalOcean](https://www.digitalocean.com/resources/articles/heroku-alternatives)
- [Render alternatives no cold start 2026](https://expresstech.io/best-render-alternatives-in-2026-no-cold-starts/)
- [Railway vs Render vs Fly.io for solo devs 2026](https://devtoolpicks.com/blog/railway-vs-render-vs-fly-io-solo-developers-2026)

**C) Build-Tool:**
- [Bun vs Vite 2026 — PkgPulse](https://www.pkgpulse.com/guides/bun-vs-vite-2026)
- [Vite vs Turbopack vs Rspack Benchmark 2026 — Kunal Ganglani](https://www.kunalganglani.com/blog/vite-turbopack-rspack-benchmark)
- [Build Tools Performance — rstackjs Github](https://github.com/rstackjs/build-tools-performance)
- [Bun vs Node.js 2026 — Strapi](https://strapi.io/blog/bun-vs-nodejs-performance-comparison-guide)
- [Bun Runtime Production Guide 2026 — byteiota](https://byteiota.com/bun-runtime-production-guide-2026-speed-vs-stability/)
