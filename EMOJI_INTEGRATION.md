# Figma-Style-Emojis in CozyQuiz — Crash-Free Integration

**Datum:** 2026-05-07
**Quelle:** Tiefen-Recherche-Agent (jdecked/twemoji, microsoft/fluentui-emoji, react-fluentui-emoji, Notion-Blog, Slack-Engineering, facebook/react Issue #17256).
**Status:** Recherche abgeschlossen, noch nicht implementiert. Wartet auf Wolfs OK.

---

## TL;DR

Wolfs alter Fluent-Replacer crashte weil ein **`MutationObserver` + DOM-Surgery** gegen Reacts Fiber-Reconciler lief — Reconciler-Crash bei `insertBefore` / `removeChild`. **Empfehlung: Methode A — Per-Component `<img>` mit CDN-URL**, exakt das Pattern das Wolfs Twemoji-Flag-Code in [`QQTeamAvatar.tsx:224`](frontend/src/components/QQTeamAvatar.tsx#L224) schon nutzt — nur mit Fluent-CDN-Schema. Kein DOM-Replacer, kein MutationObserver, kein Reconciler-Risiko.

---

## Warum der globale Replacer crashte

React's Fiber-Reconciler hält eine erinnerte Child-Liste pro DOM-Element. Beim Re-Render diff't React seine alte Fiber-Liste gegen die neue und ruft `parentNode.insertBefore(...)` / `removeChild(...)` mit **gemerkten Refs**.

Was der Replacer machte:
1. React rendert `<span>🎯 Aktion</span>` → ein einziger `#text`-Node `"🎯 Aktion"`.
2. `MutationObserver` feuert, Replacer splittet Text-Node in `""` + `<img>` + `" Aktion"`.
3. React's Fiber kennt aber nur **einen** Text-Child, nicht drei.
4. Beim nächsten State-Update will React den alten `#text` ersetzen → `removeChild(oldText)` schlägt fehl, weil `oldText` jetzt ein anderer Node ist → `NotFoundError: Failed to execute 'removeChild' on 'Node'` bzw. `insertBefore on Node`.

Gleicher Crash-Pfad wie bei Google-Translate-Extension (React Issue #17256) und `twemoji.parse()` auf React-Subtrees. **Einzige React-safe Lösung: nicht den DOM mutieren, sondern den Emoji bei Render-Zeit als React-Element produzieren.**

---

## 6 Methoden im Vergleich

| # | Methode | Pro | Con | Crash-Risiko | Bundle | Effort | Wer macht's so |
|---|---------|-----|-----|--------------|--------|--------|----------------|
| **A** | **Per-Component `<img>` (CDN)** | Voll React-safe, lazy-loadable, cache-able, beliebig viele Sets, 4K-scharf via SVG | Needs network, FOUC beim 1. Load, kein selectable text | **Null** | ~2 KB Helper | 1-2h | GitHub gemoji, Discord, react-apple-emojis, Wolfs Flag-Code |
| B | Build-Time SVG-Imports (`unplugin-icons`) | Kein Network, tree-shakeable, voll typisiert | Jeder Emoji = expliziter Import, dynamische User-Emojis nicht möglich | Null | +500 B/Emoji | 2-3h | Antfu-Stack, kleine Design-Systems |
| C | Color-Font (COLR/CPAL z. B. Twemoji-Mozilla.ttf) | Ein File, normaler Text, copy-paste, selectable | ~10 MB Font, **kein Fluent-3D-Font verfügbar**, Fallback-Stack-Hell | Null | 3-12 MB Font | 30 min | Discord (Twemoji-Mozilla), Firefox |
| D | CSS `background-image`-Klassen | Null JS, kein DOM-Risiko, `image-set()` für Retina | Pro Emoji eine CSS-Klasse, kein selectable Text | Null | Stylesheet-Bloat | 3-4h | Slack (Sprite-Sheets historisch) |
| E | RSC / Server-Render | Null Client-JS-Cost, perfekt accessible | Erfordert Next.js / RSC — **CozyQuiz ist Vite SPA, nicht anwendbar** | n/a | n/a | n/a | Notion (Next), Vercel-Stack |
| F | Twemoji-Style `parse()`-Replacer | Existing-Markup transparent ersetzt | **EXAKT der Crash-Pfad den Wolf schon hatte** | **Hoch** | Mittel | 1h zum Bauen, 100h zum Debuggen | Legacy WP-Plugins |

**Apple/Discord/Slack/Notion machen es heute alle als Variante A oder E**, nicht F.

---

## Empfehlung: Methode A für CozyQuiz

Eigene `<FluentEmoji>`-Komponente, exakt analog zu Wolfs schon laufendem Twemoji-Flag-Code in [`QQTeamAvatar.tsx`](frontend/src/components/QQTeamAvatar.tsx).

**CDN-URL-Schema:** `https://cdn.jsdelivr.net/gh/AdvenaHQ/fluent-emoji@latest/png/100x100/{codepoints}.png`

(AdvenaHQ-Fork organisiert die Microsoft-Fluent-Assets nach Codepoint statt Emoji-Name → direkt mappable.)

### Component-Sketch

```tsx
// frontend/src/components/FluentEmoji.tsx
import React from 'react';

type Style = 'color' | 'flat' | 'high-contrast' | '3d';

function emojiToCodepoints(input: string): string {
  const cps: number[] = [];
  for (const ch of input) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0xFE0F) continue; // strip variation selectors
    cps.push(cp);
  }
  return cps.map(cp => cp.toString(16)).join('-');
}

const FLUENT_CDN = 'https://cdn.jsdelivr.net/gh/AdvenaHQ/fluent-emoji@latest/png/100x100';

export function FluentEmoji({
  char,
  size = '1em',
  fallback = true,
}: {
  char: string;
  size?: number | string;
  fallback?: boolean;
}) {
  const code = emojiToCodepoints(char);
  const src = `${FLUENT_CDN}/${code}.png`;
  return (
    <img
      src={src}
      alt={char}
      draggable={false}
      onError={fallback ? (e) => {
        // Bei 404 fallback auf System-Emoji via alt-Text
        (e.currentTarget as HTMLImageElement).style.display = 'none';
        const txt = document.createElement('span');
        txt.textContent = char;
        e.currentTarget.parentNode?.insertBefore(txt, e.currentTarget);
      } : undefined}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        verticalAlign: '-0.125em',
      }}
    />
  );
}
```

### Variante-Mapping pro UI-Stelle

| Stelle | Variante | Begründung |
|--------|----------|-------------|
| Beamer Hero-Cards (5 Kategorien) | **3D PNG @512** | 4K-Beamer, Hero-Wow-Faktor, nur 5 Stück = 250 KB total |
| Team-Avatar-Badges | **Color SVG** | Vektor, viele Größen, sharp auf jedem Display |
| Status-Icons (●, 👋, ✨) | **Flat SVG** | Subtil, weniger visuelles Noise |
| Country-Flags Lobby | **Twemoji** (bleibt) | Schon implementiert, ESC-Theme passt zu Twemoji-Style |
| Mobile /team Joker | **Color SVG** | Konsistent mit Avatar-Set |

**3D-Variante:** ~50 KB pro PNG ist OK für ~10 statische Schlüssel-Emojis (Hero-Icons), **nicht** für User-getippte Inhalte. Dort 2D-Color-SVG (~3 KB).

---

## Migration-Plan (ohne grosses Umbauen)

### Schritt 1 — Komponente bauen (1-2h)
`frontend/src/components/FluentEmoji.tsx` anlegen. Tests in einer Test-Page.

### Schritt 2 — Opt-in, nicht global (Lessons Learned!)
Keine globale Ersetzung. Nur dort einsetzen wo der WOW-Effekt explizit gewollt ist:
- `QQBeamerPage.tsx` Kategorie-Hero-Renderer (eine Stelle)
- `QQTeamAvatar.tsx` (Emoji-Avatar-Branch — direkt neben dem Twemoji-Flag-Branch)
- `JokerIcon.tsx` o. ä.

### Schritt 3 — Helper-Util
`frontend/src/utils/emoji.ts` mit `<FluentEmoji>` re-export + `emojiToCodepoints()`-Helper. So bleibt Twemoji-Flag-Code bestehen, neuer Fluent-Code teilt sich denselben Codepoint-Helper.

### Schritt 4 — KEINE globale Find-Replace-Migration
Bestehender Code mit System-Emojis als Plain-Text bleibt bewusst auf System-Default. Wolf entscheidet pro Stelle ob Upgrade lohnt. Vermeidet Regression-Surface bei 16k-Zeilen-`QQBeamerPage`.

### Schritt 5 — Preload für Hero-Emojis
Im `index.html` `<link rel="preload" as="image" href="...3d/1f3af.png">` für die 5 Kategorie-3D-Emojis, damit Beamer keinen FOUC beim ersten Round-Reveal hat.

### Schritt 6 — Fallback-Strategie
`onError` setzt Image auf `display:none` und liefert via `alt` das System-Emoji. Bei CDN-Outage degradiert die App graceful auf System-Default — kein Blank.

---

## Was NICHT machen

- ❌ Kein `MutationObserver`. Kein `twemoji.parse()`. Kein globaler Replacer. **Niemals.**
- ❌ Kein `dangerouslySetInnerHTML` mit Emoji-HTML.
- ❌ Kein npm-`react-fluentui-emoji` Bundle-Approach (zu gross für dynamische User-Inhalte).
- ❌ Animierte Lottie-Variante erst wenn ein konkreter Hero-Moment es rechtfertigt — sonst Bundle-Bloat ohne Mehrwert.

---

## Quellen

- [twitter/twemoji README — DOM-Mutation-Warnung](https://github.com/twitter/twemoji)
- [jdecked/twemoji (aktiver Fork)](https://github.com/jdecked/twemoji)
- [microsoft/fluentui-emoji — offizielles Asset-Repo (MIT)](https://github.com/microsoft/fluentui-emoji)
- [AdvenaHQ/fluent-emoji — Codepoint-zu-PNG-Mapping CDN](https://github.com/AdvenaHQ/fluent-emoji)
- [react-fluentui-emoji npm](https://www.npmjs.com/package/react-fluentui-emoji)
- [jstnmthw/fluentui-emoji-icons — tree-shakeable React-SVG](https://github.com/jstnmthw/fluentui-emoji-icons)
- [react-apple-emojis — Provider+Emoji-Component-Pattern](https://github.com/dherault/react-apple-emojis)
- [Nolan Lawson — The struggle of using native emoji on the web](https://nolanlawson.com/2022/04/08/the-struggle-of-using-native-emoji-on-the-web/)
- [Slack Engineering — Rebuilding Slack's Emoji Picker in React](https://slack.engineering/rebuilding-slacks-emoji-picker-in-react/)
- [Notion Blog — How we built custom emoji](https://www.notion.com/blog/how-we-built-custom-emoji)
- [facebook/react Issue #17256 — removeChild crashes via DOM-mutating extensions](https://github.com/facebook/react/issues/17256)
- [Medium — Fixing Next.js 15 + React 19 removeChild DOM Error](https://medium.com/@fabrizio.azzarri/fixing-the-next-js-15-react-19-removechild-dom-error-a33b57cbc3b1)
- [unplugin-icons — Build-Time-SVG-Approach](https://github.com/unplugin/unplugin-icons)
- [SteGriff — Get hi-res twemoji SVGs by URL](https://stegriff.co.uk/upblog/get-hi-res-twemoji-svgs-by-url/)
- [emoji-mart — Reduce production bundle size #156](https://github.com/missive/emoji-mart/issues/156)
- Existing CozyQuiz code: [`QQTeamAvatar.tsx`](frontend/src/components/QQTeamAvatar.tsx) — jdecked/twemoji CDN-Pattern bereits live
