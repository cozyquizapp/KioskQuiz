/**
 * lib/handy.mjs — ein Handy an einem laufenden Abend. Gemeinsame Grundlage.
 *
 * 2026-08-29. Dieselbe Ueberlegung wie im Kopf von lib/buehne.mjs, eine Ebene
 * tiefer: dort liegt die Maschine, die die BUEHNE aufsetzt und ansteuert, hier
 * die, die ein HANDY beitreten laesst und den Abend mitfahren.
 *
 * Der Anlass war Kopieren. Innerhalb eines Tages standen drei Werkzeuge mit
 * derselben achtzig Zeilen langen Einleitung da (handy-referenz,
 * handy-bedienung, handy-vorher-nachher), und das vierte war schon absehbar.
 * Drei Kopien einer Ablaufsteuerung laufen nach einer Sitzung auseinander -
 * dann misst man drei verschiedene Abende und glaubt, man vergleiche einen.
 *
 * ── Warum das Handy nicht einfach lib/buehne.mjs benutzt ──────────────────
 * `buehneStarten` faehrt die Buehne ueber einen Socket zu einer Station und
 * kennt kein zweites Geraet. Ein Handy braucht drei Dinge, die es dort nicht
 * gibt: einen eigenen Browser-Kontext (390x844, Touch), einen echten
 * BEITRITT, und den Moderator-Autoplay als Antrieb statt gezielter Spruenge.
 *
 * ⚠️ Und es braucht die Reihenfolge: erst beitreten, DANN den Abend starten.
 * Aus Schaden gelernt - ein Lauf am 2026-08-29 hat sechs Stationen sauber
 * gemeldet und dabei sechsmal die Sperrseite „Quiz laeuft schon" gemessen.
 * Der Bericht sah gut aus (21 Befunde auf 6 gefallen) und war wertlos. Wer
 * hier etwas aendert, laesst `sperrseite()` in Ruhe.
 *
 * VORAUSSETZUNG: Backend (4000, frisch) + Frontend (5173).
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';

const req = createRequire(new URL('../../backend/package.json', import.meta.url));
const { io } = req('socket.io-client');

export const API = 'http://localhost:4000';
export const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
export const PIN = process.env.ADMIN_PIN || '2506';
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* iPhone 14. Bewusst kein kleineres Geraet: 390x844 ist die haeufigste
 * Breite, und was hier zu eng ist, ist auf einem SE erst recht zu eng. */
export const HANDY = { width: 390, height: 844 };

/**
 * Handy und Buehne im selben frischen Raum, Handy beigetreten, Abend laeuft.
 *
 * Liefert `{ handy, buehne, phase, sperrseite, schliessen }`. Der Aufrufer
 * entscheidet, was er misst - dieses Modul misst nichts.
 */
export async function handyStarten({ mega = false, secs = 200, vorBeitritt = null } = {}) {
  const health = await fetch(`${API}/api/health`).then(r => r.json()).catch(() => null);
  if (!health?.ok) throw new Error('Backend nicht erreichbar auf 4000.');
  console.log(`Backend ok (build ${health.build ?? '?'})`);

  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
  });

  const ctxMain = await browser.newContext({ viewport: { width: 1760, height: 990 } });
  await ctxMain.addInitScript(({ pin }) => {
    try {
      sessionStorage.setItem('qq_admin_unlocked', '1');
      sessionStorage.setItem('qq_admin_pin', pin);
      localStorage.setItem('qq-admin-pin', pin);
    } catch { /* ignore */ }
  }, { pin: PIN });

  const ctxTeam = await browser.newContext({
    viewport: HANDY, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  await ctxTeam.addInitScript(() => {
    try {
      localStorage.setItem('qq_teamName', 'Testtrupp');
      localStorage.setItem('qq_avatarId', 'fox');
    } catch { /* ignore */ }
  });

  const buehne = await ctxMain.newPage();
  await buehne.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
  await buehne.waitForSelector('[data-qq-room]', { timeout: 20000 }).catch(() => {});
  const roomCode = await buehne.evaluate(() =>
    document.querySelector('[data-qq-room]')?.getAttribute('data-qq-room') ?? 'default').catch(() => 'default');

  const sock = io(API, { transports: ['websocket'] });
  await new Promise((res, rej) => {
    sock.on('connect', res); sock.on('connect_error', rej);
    setTimeout(() => rej(new Error('Socket-Timeout')), 8000);
  });
  const emit = (ev, extra = {}) => new Promise(res => sock.emit(ev, { roomCode, ...extra }, res));
  await emit('qq:joinModerator', { pin: PIN });

  /* Frischer Raum, VOR dem Beitritt.
   *
   * ⚠️ `qq:resetRoom` allein reicht nicht: es setzt das SPIEL zurueck und
   * behaelt die Teams. Ohne `clearBots` erbt jeder Lauf die Teams des ersten,
   * samt deren Avataren (derselbe Fund wie in lib/buehne.mjs vom 2026-08-24).
   * Und beides muss ueber den Socket laufen, nicht per `rm .qq-rooms/*.json`:
   * der Server schreibt seine offenen Speicherungen beim Herunterfahren noch
   * einmal weg. */
  await emit('qq:resetRoom', { confirm: true });
  await sleep(900);
  await fetch(`${API}/api/qq/${encodeURIComponent(roomCode)}/dev/clearBots`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: PIN }),
  }).catch(() => {});
  await sleep(500);
  if (mega) { await emit('qq:setQuizOptions', { largeGroupMode: true, nestedTeams: true }); await sleep(500); }

  /* Raum einrichten und Lobby OEFFNEN.
   *
   * ⚠️ Wolf, 2026-08-29: „im moderator erst die lobby freigegeben werden
   * muesste, sie ist nicht randomly immer offen." Genau daran sind zwei
   * Anlaeufe gescheitert, die Setup-Ansicht zu messen: der frische Gast kam an,
   * bekam „Preparing the quiz …" und meldete ein einziges Bedienelement. Ich
   * hatte den Grund beim Werkzeug gesucht, und er lag im Ablauf des Abends.
   *
   * `lobbyOpen` ist seit dem 27.08. ein eigener Schalter, bewusst getrennt von
   * `setupDone`: das Steuerpult darf ins Cockpit, ohne dass der Saal schon
   * scannen soll. Ein Harness, der nur `setupDone` setzt, sieht die Lobby also
   * nie - und ein Harness, der beides nicht setzt, misst den Wartebildschirm. */
  await emit('qq:setSetupDone', { value: true });
  await sleep(300);
  await emit('qq:setLobbyOpen', { value: true });
  await sleep(600);
  console.log(`Raum ${roomCode} frisch${mega ? ' (CrowdQuiz)' : ''}.`);

  const handy = await ctxTeam.newPage();
  handy.on('dialog', async (d) => { await d.dismiss(); });
  await handy.goto(`${BASE}/team`, { waitUntil: 'domcontentloaded' });
  await sleep(6000);

  /** Haengt das Handy auf der Sperrseite? Siehe Kopf dieser Datei. */
  const sperrseite = () => handy.evaluate(() =>
    /Quiz läuft schon|Quiz already running|nicht angemeldet|not registered/i
      .test(document.body.innerText || '')).catch(() => false);

  /**
   * Ein FRISCHER Gast: eigener Browser-Kontext ohne gespeichertes Team.
   *
   * ⚠️ Ohne den gibt es die Setup-Ansicht in keiner Messung. Der Harness legt
   * Teamname und Avatar in den localStorage, damit der Beitritt zuverlaessig
   * klappt - und genau deshalb springt das Handy sofort in die Lobby. Am
   * 2026-08-29 hat eine Messung deshalb eine Datei „01-SETUP.png" geschrieben,
   * auf der die Lobby zu sehen war, und fuer die dichteste Ansicht der App ein
   * einziges Bedienelement gemeldet.
   *
   * Der Gast tritt NICHT bei. Er sieht nur zu, und wird danach geschlossen.
   */
  const frischerGast = async (was) => {
    const ctx = await browser.newContext({
      viewport: HANDY, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    });
    const seite = await ctx.newPage();
    seite.on('dialog', async (d) => { await d.dismiss(); });
    await seite.goto(`${BASE}/team`, { waitUntil: 'domcontentloaded' });
    await sleep(5000);
    try { await was(seite); } finally { await ctx.close(); }
  };

  /* Die Setup-Ansicht, BEVOR irgendetwas laeuft.
   *
   * Sie ist die einzige Ansicht, die der Autoplay nie zeigt, und zugleich die
   * mit der groessten Dichte an Bedienelementen und rohen Zeichen: dort waehlt
   * ein Gast Avatar, Emoji und Namen. Wer sie auslaesst, misst die halbe App.
   * `scripts/design-audit-cozyquiz.mjs` misst umgekehrt NUR sie.
   *
   * ⚠️ Zwei Anlaeufe haben sie verfehlt, jeder auf andere Weise, und beide
   * haben trotzdem eine Datei „SETUP.png" geschrieben:
   *   1. Das Harness-Handy traegt Teamname und Avatar im localStorage, damit
   *      der Beitritt zuverlaessig klappt - und springt deshalb sofort in die
   *      Lobby. Gemessen wurde die Lobby.
   *   2. Ein frischer Gast NACH dem Start sieht „Quiz laeuft schon".
   * Also: frischer Kontext UND vor dem Spielstart. Beides zusammen, sonst
   * gar nicht. */
  if (vorBeitritt) await frischerGast(vorBeitritt);

  /* Beitreten, und zwar bis das Handy WIRKLICH in der Lobby steht - nicht bis
   * eine Frist abgelaufen ist. Geprueft wird am Bild des Handys, weil es kein
   * Socket-Ereignis „gib mir den Zustand" gibt (der Server schickt von sich
   * aus) und ein erfundener Ereignisname nirgends auffiele: der Socket-Vertrag
   * ist untypisiert, siehe CLAUDE.md. */
  let beigetreten = false;
  for (let i = 0; i < 20 && !beigetreten; i++) {
    const btn = handy.locator('button', {
      hasText: /Wieder einsteigen|Spiel beitreten|Rejoin|Join game|Los geht|einsteigen|Beitreten/i,
    }).first();
    if (await btn.count().catch(() => 0)) { await btn.click({ timeout: 2000 }).catch(() => {}); await sleep(1800); }
    else await sleep(1200);
    const text = await handy.evaluate(() => document.body.innerText || '').catch(() => '');
    beigetreten = /READY|BEREIT|Waiting for opponents|Warte auf/i.test(text);
  }
  console.log(beigetreten ? 'Handy beigetreten.' : '⚠️  Handy nicht sichtbar beigetreten.');

  const mod = await ctxMain.newPage();
  mod.on('dialog', async (d) => { await d.dismiss(); });
  await mod.goto(`${BASE}/moderator-test?run=1${mega ? '&arena=1&mega=1' : ''}`, { waitUntil: 'domcontentloaded' });
  await sleep(6000);

  if (await sperrseite()) {
    await browser.close(); sock.close();
    throw new Error('Handy haengt auf der Sperrseite. Backend frisch starten:\n'
      + '  pkill -f \'[t]s-node-dev\'; rm -f backend/.qq-rooms/*.json; npm run start:backend');
  }

  const phase = () => buehne.evaluate(() =>
    document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? null).catch(() => null);

  /**
   * Eine Ueberlagerung oeffnen, die der Autoplay nie zeigt: das Menue hinter
   * dem Hamburger, die Kurz-Regeln. Beides sind Ansichten mit eigenem Inhalt,
   * die am Abend jeder Gast benutzt - sie fehlen in jeder Messung, die nur den
   * Phasen folgt.
   *
   * ⚠️ Ausdruecklich NICHT dabei: das Reaktions-Pad. Es liegt inline in den
   * Wartephasen, ist also ohnehin in der Messung - und seine Knoepfe SCHICKEN
   * eine Reaktion. Ein Messwerkzeug, das nebenbei Ereignisse ins Spiel
   * schickt, misst nicht mehr nur.
   *
   * Liefert true, wenn wirklich etwas aufgegangen ist. Ein `false` ist kein
   * Fehler: nicht jede Ueberlagerung gibt es in jeder Phase.
   */
  const oeffnen = async (was) => {
    const vorher = await handy.evaluate(() => (document.body.innerText || '').length).catch(() => 0);
    const muster = was === 'menue'
      ? 'button[aria-label*="enü" i], button[aria-label*="enu" i]'
      : 'button[aria-label*="egeln" i], button[aria-label*="ules" i]';
    const wahl = handy.locator(muster).first();
    if (!(await wahl.count().catch(() => 0))) return false;
    await wahl.click({ timeout: 2000 }).catch(() => {});
    await sleep(1200);
    const nachher = await handy.evaluate(() => (document.body.innerText || '').length).catch(() => 0);
    return nachher !== vorher;
  };

  /**
   * Eine Ueberlagerung wieder schliessen.
   *
   * ⚠️ Escape reicht nicht. Beim ersten Lauf blieb das Menue offen und lag ab
   * da ueber JEDER folgenden Ansicht; die Messung galt danach nur noch dem
   * Menue, meldete aber die Phasennamen. Deshalb wird der Schliessen-Knopf
   * gesucht und, wenn es ihn nicht gibt, neben die Ueberlagerung getippt.
   */
  const schliessen = async (was = 'menue') => {
    const laenge = () => handy.evaluate(() => (document.body.innerText || '').length).catch(() => 0);
    const vorher = await laenge();
    await handy.keyboard.press('Escape').catch(() => {});
    await sleep(700);
    if (await laenge() !== vorher) return;
    // Noch offen: denselben Knopf nochmal, er schaltet um.
    //
    // ⚠️ KEIN blinder Klick auf eine Koordinate. Der stand hier zuerst und hat
    // den Lauf abgebrochen - er trifft, was gerade dort liegt, und das war
    // nicht der Schliessen-Knopf. Ein Messwerkzeug, das die Ansicht bedient,
    // die es messen soll, misst am Ende sich selbst.
    const muster = was === 'menue'
      ? 'button[aria-label*="enü" i], button[aria-label*="enu" i]'
      : 'button[aria-label*="egeln" i], button[aria-label*="ules" i]';
    const wahl = handy.locator(muster).first();
    if (await wahl.count().catch(() => 0)) await wahl.click({ timeout: 2000 }).catch(() => {});
    await sleep(900);
  };

  return {
    handy, buehne, roomCode, emit, phase, sperrseite, beigetreten, oeffnen, schliessen, frischerGast,
    schliessen: async () => { await browser.close(); sock.close(); },

    /**
     * Den Abend mitfahren und bei JEDER neuen Phase `was(phase)` aufrufen.
     * Stationen, an denen das Handy auf der Sperrseite steht, werden
     * uebersprungen statt gezaehlt - sonst faerbt eine Sperrseite die Messung
     * aller folgenden Stationen ein.
     */
    async abendMitfahren(was) {
      const gesehen = new Set();
      const bis = Date.now() + secs * 1000;
      while (Date.now() < bis) {
        const p = await phase();
        if (p && !gesehen.has(p)) {
          gesehen.add(p);
          // Der Auftritt einer Ansicht laeuft bis zu 2 s; waehrend er laeuft
          // misst man Zwischenwerte (halbe Deckkraft = andere Farbe).
          await sleep(2600);
          if (await sperrseite()) { console.log(`  – ${p} (Sperrseite, nicht gezaehlt)`); continue; }
          try {
            await was(p);
          } catch (e) {
            // ⚠️ Ein Fehler in EINER Station darf nicht den ganzen Abend
            // beenden. Die erste Fassung liess ihn durch; der Bericht wurde
            // trotzdem geschrieben und meldete drei Ansichten statt neun -
            // ohne ein Wort darueber, dass sechs gefehlt haben.
            console.log(`  ! ${p} abgebrochen: ${String(e).slice(0, 120)}`);
          }
        }
        await sleep(1500);
      }
      return Array.from(gesehen);
    },
  };
}
