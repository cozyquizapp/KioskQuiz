/**
 * enge.mjs — laeuft auf dieser Folie etwas ineinander?
 *
 * 2026-08-29, Wolf: „wie koennte man das ueberpruefen, dass sowas nicht
 * passiert? alle varianten mit allen fragelaengen durchspielen waere extrem
 * umstaendlich, aber ein werkzeug muesste sehr zuverlaessig sein um das
 * herauszufinden ohne luecken."
 *
 * Die Zahl der Varianten ist unendlich, die Zahl der FEHLERARTEN ist klein.
 * Beim MUCHO-Fehler war es genau eine: zwei Dinge liegen uebereinander, die
 * sich nicht ueberlappen duerfen. Also werden nicht Varianten geprueft,
 * sondern drei Regeln - auf jedem Bild, das ein Werkzeug ohnehin schon macht:
 *
 *   1. VERDECKT      Etwas liegt hinter einer angemeldeten Sperre
 *                    (`data-qq-sperre`: absolut positioniert, also fuer den
 *                    Fluss unsichtbar - genau die Falle vom 27.08. und 29.08.).
 *   2. AUSSERHALB    Etwas steht ausserhalb der Buehne (1760 x 990).
 *   3. ABGESCHNITTEN Etwas wird von einem `overflow: hidden` beschnitten.
 *
 * ⚠️ Was NICHT geprueft wird, und das gehoert dazu: Geschmack. Dass die
 * Fraktions-Spanne aus zehn Metern unsichtbar war, haette hier nichts
 * gemeldet. Das Werkzeug findet Geometrie, nicht Wirkung.
 *
 * ⚠️ Gezaehlt werden nur Dinge, die jemand SIEHT: sichtbarer Text und Bilder.
 * Die Buehne hat absichtlich uebergrosse Hintergrundflaechen (Schein,
 * Vignette, Saallicht) - die ragen bauartbedingt hinaus und waeren sonst auf
 * jeder Folie ein falscher Alarm. Am 29.08. habe ich genau die einmal fuer
 * einen Befund gehalten.
 */

/** Laeuft IM BROWSER. Liefert die drei Listen, ohne zu urteilen. */
export function engeMessung(grenzen) {
  const { breite, hoehe, luft } = grenzen;
  const sperrEls = [...document.querySelectorAll('[data-qq-sperre]')];
  const sperren = sperrEls.map(el => el.getBoundingClientRect()).filter(r => r.height > 4 && r.width > 4);

  /** Sieht man das Element ueberhaupt? Text oder Bild, sichtbar, gross genug. */
  const zaehlt = (el) => {
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') return false;
    if (Number(st.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 16 || r.height < 10) return false;
    if (el.tagName === 'IMG') return true;
    // Nur BLATT-Text: sonst meldet jeder Vorfahr denselben Text noch einmal.
    if (el.children.length > 0) return false;
    const t = (el.textContent || '').trim();
    return t.length > 0 && t.length <= 60;
  };

  const wie = (el) => {
    const t = (el.textContent || '').trim();
    return t ? `„${t.slice(0, 34)}"` : `<${el.tagName.toLowerCase()} ${(el.getAttribute('src') || '').slice(-26)}>`;
  };

  // ── Regel 1b: SCHWEBER ueber Text ───────────────────────────────────────
  // ⚠️ Diese Regel ist der eigentliche Kern, und sie hat gefehlt.
  //
  // Die erste Fassung prueft nur gegen ANGEMELDETE Sperren, und genau daran
  // ist sie gescheitert: der MUCHO-Fehler stand im Code, das Werkzeug meldete
  // gruen - weil die Team-Leiste in dieser Lage gar keine Sperre ist
  // (`bandDauerhaft`, CozyQuizQuestionView). Ein Register, das jemand pflegen
  // muss, hat immer die Luecke an der Stelle, an der der Fehler sitzt.
  //
  // Deshalb ohne Register: JEDES absolut positionierte Element mit sichtbarem
  // Inhalt ist ein Schweber. Der Fluss kann es nicht sehen, also kann sich
  // Fliesstext darunter schieben. Liegt sichtbarer Text unter einem Schweber,
  // der ihn nicht enthaelt, ist das die Fehlerart aus beiden Vorfaellen.
  const schweber = [...document.querySelectorAll('*')].filter(el => {
    const st = getComputedStyle(el);
    if (st.position !== 'absolute' && st.position !== 'fixed') return false;
    if (st.visibility === 'hidden' || Number(st.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 16) return false;
    // Nur Schweber MIT Inhalt. Die Buehne hat viele leere Flaechen fuer Licht
    // und Schein, die absichtlich ueber allem liegen.
    return (el.textContent || '').trim().length > 0 || el.querySelector('img');
  });

  const verdeckt = [], ausserhalb = [], abgeschnitten = [];
  for (const el of document.querySelectorAll('*')) {
    if (!zaehlt(el)) continue;
    const r = el.getBoundingClientRect();

    // 1. hinter einer Sperre? Was IN der Sperre steht, gehoert ihr.
    if (!sperrEls.some(sp => sp.contains(el))) {
      for (const s of sperren) {
        if (r.bottom > s.top + luft && r.top < s.bottom - luft
          && r.right > s.left + luft && r.left < s.right - luft) {
          verdeckt.push(`${wie(el)} ${Math.round(r.top)}..${Math.round(r.bottom)} hinter Sperre ${Math.round(s.top)}..${Math.round(s.bottom)}`);
          break;
        }
      }
    }

    // 1b. unter einem Schweber?
    for (const sch of schweber) {
      if (sch.contains(el) || el.contains(sch)) continue;
      const sr = sch.getBoundingClientRect();
      if (r.bottom > sr.top + luft && r.top < sr.bottom - luft
        && r.right > sr.left + luft && r.left < sr.right - luft) {
        verdeckt.push(`${wie(el)} ${Math.round(r.top)}..${Math.round(r.bottom)} unter Schweber ${wie(sch)} ${Math.round(sr.top)}..${Math.round(sr.bottom)}`);
        break;
      }
    }

    // 2. ausserhalb der Buehne?
    if (r.right > breite + luft || r.left < -luft || r.bottom > hoehe + luft || r.top < -luft) {
      ausserhalb.push(`${wie(el)} ${Math.round(r.left)}..${Math.round(r.right)} x ${Math.round(r.top)}..${Math.round(r.bottom)}`);
    }

    // 3. von einem overflow:hidden beschnitten?
    //
    // ⚠️ NUR Text. Der erste Lauf meldete acht Avatarbilder als
    // „abgeschnitten" - sie sitzen in einer Kachel mit `overflow: hidden` und
    // werden dort ABSICHTLICH beschnitten, das ist die Maske, die aus dem
    // quadratischen Bild eine Kachel macht. Ein Bild in einer Maske ist der
    // Normalfall, abgeschnittener Text ist der Fehler (Wolfs „Kasten unten
    // wird abgeschnitten", 2026-08-27).
    let v = el.tagName === 'IMG' ? null : el.parentElement;
    while (v && v !== document.body) {
      const vs = getComputedStyle(v);
      if (vs.overflow === 'hidden' || vs.overflowY === 'hidden' || vs.overflowX === 'hidden') {
        const vr = v.getBoundingClientRect();
        if (vr.width > 8 && vr.height > 8
          && (r.bottom > vr.bottom + luft || r.top < vr.top - luft
            || r.right > vr.right + luft || r.left < vr.left - luft)) {
          abgeschnitten.push(`${wie(el)} ragt ueber <${v.tagName.toLowerCase()}> hinaus`);
          break;
        }
      }
      v = v.parentElement;
    }
  }
  const eindeutig = (l) => [...new Set(l)];
  return { verdeckt: eindeutig(verdeckt), ausserhalb: eindeutig(ausserhalb), abgeschnitten: eindeutig(abgeschnitten), sperren: sperren.length };
}

/**
 * Prueft die aktuelle Seite und gibt das Ergebnis zurueck.
 * `luft` federt Rundung bei gebrochenen Zoomfaktoren ab (2 px).
 */
export async function engePruefen(seite, { breite = 1760, hoehe = 990, luft = 2 } = {}) {
  return seite.evaluate(engeMessung, { breite, hoehe, luft });
}

/** Eine Zeile je Station, im selben Ton wie die uebrigen Werkzeuge. */
export function engeZeile(name, r) {
  const n = r.verdeckt.length + r.ausserhalb.length + r.abgeschnitten.length;
  if (!n) return `  ${String(name).padEnd(16)} ✓ nichts ineinander  (${r.sperren} Sperre${r.sperren === 1 ? '' : 'n'})`;
  const zeilen = [`  ${String(name).padEnd(16)} ⚠️ ${n} Stelle${n === 1 ? '' : 'n'}`];
  for (const x of r.verdeckt) zeilen.push(`      ✗ verdeckt       ${x}`);
  for (const x of r.ausserhalb) zeilen.push(`      ✗ ausserhalb    ${x}`);
  for (const x of r.abgeschnitten) zeilen.push(`      ✗ abgeschnitten ${x}`);
  return zeilen.join('\n');
}
