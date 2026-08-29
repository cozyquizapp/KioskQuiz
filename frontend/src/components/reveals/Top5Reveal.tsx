/**
 * Top5Reveal v2 — "MYSTERY-TAFEL" (Redesign 2026-07-14).
 *
 * Fixes gegenüber v1:
 *  - Sieger-Karte links entfällt: sie stand die ganze Kaskade als geblurrte
 *    Leerfläche rum. Die Tafel läuft jetzt volle Breite (Held).
 *  - Verdeckte Plätze sind SICHTBARE Mystery-Rows („· · ·") statt hidden —
 *    Spannung statt Leere, kein Layout-Sprung.
 *  - Sieger-Banner poppt erst NACH der letzten Row unten rein (reservierte
 *    Zeile mit Teaser davor) — inkl. Wappen, x/5 richtig, Konfetti.
 *  - Treffer-Zähler (n×) pro Row rechts.
 *
 * Scoring-Story: Handy-Punkte = Treffer/5 → Row-Zähler + Sieger-Quote zeigen,
 * wie die 0–100 zustande kam. Daten-Logik (hitsByTeam, Fraktions-Bündelung,
 * Cascade-Sound-Filter) unverändert aus v1 übernommen.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { FactionCountAvatars } from '../QQFactionCrest';
import { QQEmojiIcon } from '../QQIcon';
import { TeamNameLabel } from '../TeamNameLabel';
import { playAvatarCascadeNote, playClimaxFinish, playRevealHighlight } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { isThemed, themedWindow, getActiveThemeId, BUEHNE_THEME_ID, QQ_BUEHNE_RAND } from '../../qqTheme';
import { QQ_CATEGORY_THEME } from '../../../../shared/qqCategoryTheme';
import { QQ_CATEGORY_LABELS } from '../../../../shared/quarterQuizTypes';

export function Top5Reveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const isMega = !!(s as any).nestedTeams || new Set(s.teams.map(t => t.avatarId)).size < s.teams.length;
  const btt = q.bunteTuete as any;
  const correctListDE: string[] = (btt.answers ?? []).map((x: string) => x.trim()).filter(Boolean);
  const correctListEN: string[] = (btt.answersEn ?? []).map((x: string) => x.trim()).filter(Boolean);
  const correctList = lang === 'en' && correctListEN.length ? correctListEN : correctListDE;
  const n = correctList.length;
  const hitsByTeam = s.top5HitsByTeam ?? {};

  const perAnswer = useMemo(() => {
    return correctList.map((correct, ci) => {
      const deIdx = ci, enIdx = ci + correctListDE.length;
      const hitters = s.answers
        .filter(a => {
          const teamHits = hitsByTeam[a.teamId] ?? [];
          return teamHits.includes(deIdx) || teamHits.includes(enIdx);
        })
        .map(a => s.teams.find(t => t.id === a.teamId))
        .filter((t): t is NonNullable<typeof t> => !!t);
      return { correct, hitters };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, s.teams, correctList, correctListDE.length, JSON.stringify(hitsByTeam)]);

  const teamScore = useMemo(() => {
    return s.answers.map(a => ({ teamId: a.teamId, hits: (hitsByTeam[a.teamId] ?? []).length }))
      .sort((x, y) => y.hits - x.hits);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, JSON.stringify(hitsByTeam)]);

  const topHits = teamScore[0]?.hits ?? 0;
  const winners = teamScore.filter(t => t.hits === topHits && topHits > 0);

  // Kaskade #n…#1 + Sieger-Beat am Ende. Cascade-Sound nur für Rows mit Hittern (v1-Fix).
  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const [winnerLit, setWinnerLit] = useState(false);
  const cascadeStartedRef = useRef(false);
  const STEP_MS = 2400, INITIAL_DELAY_MS = 600;

  useEffect(() => {
    if (cascadeStartedRef.current || n === 0) return;
    cascadeStartedRef.current = true;
    setRevealedMinIdx(n);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let hitAccum = 0;
    const hitOrderMap: number[] = new Array(n);
    for (let j = 0; j < n; j++) {
      const tIdx = n - 1 - j;
      const hasHit = (perAnswer[tIdx]?.hitters.length ?? 0) > 0;
      hitOrderMap[j] = hasHit ? hitAccum++ : -1;
    }
    const totalHits = hitAccum, cascadeTotal = totalHits + 1;
    for (let i = 0; i < n; i++) {
      const targetIdx = n - 1 - i;
      const hitOrder = hitOrderMap[i];
      const hasHitters = hitOrder >= 0;
      const isLastHit = hasHitters && hitOrder === totalHits - 1;
      timers.push(setTimeout(() => {
        setRevealedMinIdx(targetIdx);
        if (!s.sfxMuted && hasHitters) {
          try { playAvatarCascadeNote(hitOrder, cascadeTotal); } catch {}
          if (isLastHit) { try { playRevealHighlight(); } catch {} }
        }
      }, INITIAL_DELAY_MS + i * STEP_MS));
    }
    timers.push(setTimeout(() => {
      setWinnerLit(true);
      if (!s.sfxMuted) { try { playClimaxFinish(); } catch {} }
    }, INITIAL_DELAY_MS + n * STEP_MS + 200));
    // 2026-08-23: der Wachposten muss beim Aufraeumen ZURUECKGESETZT werden.
    // React ruft im Entwicklungsmodus (StrictMode) jeden Effekt doppelt auf:
    // erster Lauf setzt den Wachposten und die Zeitgeber, das Aufraeumen
    // loescht die Zeitgeber, der zweite Lauf sieht den gesetzten Wachposten
    // und steigt aus. Ergebnis: die Kaskade lief nie los, die Tafel stand
    // dauerhaft auf „0 / 5 aufgedeckt". Gemessen ueber 16 s: keine einzige
    // Aenderung im DOM. Auf der echten Buehne (Produktion, ohne StrictMode)
    // faellt das nicht auf, im Test aber immer - und ein Muster, das nur
    // zufaellig funktioniert, ist eins zu viel.
    return () => { timers.forEach(clearTimeout); cascadeStartedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  const revealedCount = n - revealedMinIdx;

  // 2026-08-23 (Uebergabe 2a, Buehnen-Durchgang): diese Tafel hatte den
  // Durchgang noch nicht gesehen. Sie fuehrte eine dritte Kopfzeilen-Sprache
  // (winzige Augenbraue plus Frage plus Fortschritt, alles um 13px), eine
  // eigene Medaillen-Palette fuer die Plaetze 1-3 und ein Siegerband in Gold
  // mit 48px Schein. Auf der Buehne wird daraus dieselbe Statuszeile wie auf
  // allen anderen Folien, ein ruhiges Raster und ein Band ohne Metall.
  // Die uebrigen Skins bleiben unveraendert.
  const istBuehne = getActiveThemeId() === BUEHNE_THEME_ID;
  const grund = QQ_CATEGORY_THEME.BUNTE_TUETE.deep;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      // 2026-08-24: dieselbe Kante wie die Fragefolie und die
      // Schaetzchen-Aufloesung. Gemessen sass die Kategorie-Pille hier auf
      // x48 y22, auf der Fragefolie auf x28 y28 - das Polster kam oben aus
      // `cqh` (Hoehe) und seitlich aus `cqw` (Breite), also zwei
      // Bezugsgroessen und zwei verschiedene Raender.
      padding: istBuehne
        ? `${QQ_BUEHNE_RAND} ${QQ_BUEHNE_RAND} clamp(14px, 2cqh, 26px)`
        : 'clamp(16px, 2.2cqh, 30px) clamp(20px, 3cqw, 48px) clamp(14px, 2cqh, 26px)',
      animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) both', minHeight: 0,
    }}>
      <style>{`
        @keyframes qqT5v2Flip{0%{transform:rotateX(72deg);opacity:0}100%{transform:rotateX(0);opacity:1}}
        @keyframes qqT5v2Rise{0%{transform:translateY(20px);opacity:0}100%{transform:translateY(0);opacity:1}}
      `}</style>

      {/* Kopf: Frage + Fortschritt */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'clamp(14px,2cqw,32px)' }}>
        <div style={{ minWidth: 0 }}>
          {istBuehne ? (
            // Dieselbe Pille wie auf jeder Frage-Folie: gefuellt im
            // Buehnen-Akzent, dunkle Schrift, Kategorie in Versalien. Sie
            // ersetzt die eigene Augenbraue („Top 5 · Aufloesung") - welches
            // Unterspiel laeuft, sagt das Zwischenbild vor der Frage, und der
            // Zaehler rechts sagt, dass hier aufgedeckt wird.
            <span style={{
              display: 'inline-block',
              padding: 'clamp(6px, 0.7cqh, 12px) clamp(14px, 1.6cqw, 28px)',
              borderRadius: 'var(--qq-pill-radius)',
              background: 'var(--qq-stage-accent)',
              color: '#12100E',
              fontWeight: 900, lineHeight: 1,
              fontSize: 'clamp(16px, 1.7cqw, 30px)',
              letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
            }}>
              {(QQ_CATEGORY_LABELS.BUNTE_TUETE?.[lang] ?? 'Bunte Tüte').toUpperCase()}
            </span>
          ) : (
            <div style={{ fontSize: 'clamp(11px, 1.05cqw, 16px)', fontWeight: 900, color: 'var(--qq-accent)', letterSpacing: '0.16em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
              <QQEmojiIcon emoji="🎁" /> {lang === 'en' ? 'Top 5 · Reveal' : 'Top 5 · Auflösung'}
            </div>
          )}
          <div key={lang} style={{
            // 2026-08-23: 22-37px sind ein Wert fuer eine Bildschirmseite. Auf
            // 1760px Buehnenbreite ist die Frage der Anker der Folie und faehrt
            // auf die Groesse, die die uebrigen Reveal-Folien auch fahren.
            fontSize: istBuehne
              ? (qText.length > 120 ? 'clamp(26px, 2.6cqw, 42px)' : 'clamp(30px, 3.1cqw, 52px)')
              : (qText.length > 120 ? 'clamp(20px, 2cqw, 32px)' : 'clamp(22px, 2.3cqw, 37px)'),
            fontWeight: 900, lineHeight: 1.18, color: 'var(--qq-card-text)', marginTop: 'clamp(4px,0.8cqh,10px)',
            animation: 'langFadeIn 0.4s ease both', textWrap: 'pretty' as any,
          }}>{qText}</div>
        </div>
        <div style={{
          // Gleiche Schreibweise wie der Fragezaehler oben rechts auf den
          // anderen Folien: Versalien, 0.26em Laufweite, gedaempft.
          fontSize: istBuehne ? 'clamp(15px, 1.6cqw, 28px)' : 'clamp(12px, 1.1cqw, 17px)',
          fontWeight: istBuehne ? 800 : 900,
          letterSpacing: istBuehne ? '0.26em' : undefined,
          textTransform: istBuehne ? 'uppercase' : undefined,
          color: 'var(--qq-text-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
        }}>
          {revealedCount} / {n} {lang === 'en' ? 'revealed' : 'aufgedeckt'}
        </div>
      </div>

      {/* Tafel: volle Breite, Mystery-Rows */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.4cqh, 16px)', marginTop: 'clamp(10px,2cqh,22px)', minHeight: 0, perspective: 1200 }}>
        {perAnswer.map(({ correct, hitters }, idx) => {
          const rank = idx + 1;
          const isRevealed = idx >= revealedMinIdx;
          const hasHits = hitters.length > 0;
          // 2026-08-23: Gold/Silber/Bronze fuer die Plaetze 1-3 sind eine
          // vierte Palette neben Kategorie, Creme und Gruen, und sie sagen
          // nichts, was die Ziffer nicht schon sagt - die Tafel IST eine
          // Rangliste, jede Zeile traegt ihre Nummer. Auf der Buehne bekommen
          // alle fuenf dieselbe ruhige Kachel; der Rang steht in der Ziffer.
          const badgeBg = istBuehne ? 'transparent'
            : rank === 1 ? 'linear-gradient(135deg,#FDE68A,#FACC15)'
            : rank === 2 ? 'linear-gradient(135deg,#F6EFE6,#94a3b8)'
            : rank === 3 ? 'linear-gradient(135deg,#fdba74,#b45309)'
            : 'linear-gradient(135deg,#64748b,#334155)';
          // Kachel-Grundriss, an beiden Stellen gleich (verdeckt wie aufgedeckt),
          // damit beim Umschlagen nur der Inhalt wechselt, nicht die Form.
          const rangKachel = istBuehne ? {
            border: '2px solid var(--qq-hairline)',
            color: 'var(--qq-text)',
            borderRadius: 'var(--qq-card-radius)',
          } : null;
          if (!isRevealed) {
            return (
              <div key={idx} style={{
                flex: 1, display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center',
                gap: 'clamp(12px,1.4cqw,22px)', padding: '0 clamp(14px,1.6cqw,24px)', borderRadius: 18,
                minHeight: 'clamp(56px,7cqh,88px)', background: 'rgba(246, 239, 230,0.03)',
                border: '2px solid rgba(148,163,184,0.14)',
              }}>
                <div style={{
                  width: 'clamp(44px,4.4cqw,66px)', height: 'clamp(44px,4.4cqw,66px)', borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(20px,2cqw,32px)', fontWeight: 900, color: 'var(--qq-card-text)',
                  background: istBuehne ? 'transparent' : 'linear-gradient(135deg,#334155,#1e293b)',
                  ...(rangKachel ?? {}),
                }}>#{rank}</div>
                <div style={{ fontSize: 'clamp(20px,2.4cqw,36px)', fontWeight: 900, color: 'rgba(148,163,184,0.5)', letterSpacing: '0.5em' }}>· · ·</div>
                <div /><div />
              </div>
            );
          }
          return (
            <div key={idx} style={{
              flex: 1, display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center',
              gap: 'clamp(12px,1.4cqw,22px)', padding: '0 clamp(14px,1.6cqw,24px)', borderRadius: 18,
              minHeight: 'clamp(56px,7cqh,88px)', transformOrigin: 'center bottom',
              // 2026-08-23, im Bild nachgemessen: das dunkle Gruen (0,42 Deckung)
              // auf dem roten Kategorie-Grund wurde braun - die getroffene Zeile
              // war von den nicht getroffenen kaum zu unterscheiden. Auf der
              // Buehne traegt deshalb die KONTUR das Signal, kraeftig und in
              // demselben hellen Gruen wie die Antwort auf den anderen Folien.
              // Die Fuellung bleibt fast durchsichtig, sonst mischt sie sich mit
              // dem Grund. Nicht getroffene Zeilen sind Haarlinie auf Creme.
              background: istBuehne
                ? (hasHits ? 'rgba(74,222,128,0.10)' : 'rgba(246,239,230,0.04)')
                : (hasHits ? 'linear-gradient(135deg, rgba(34,197,94,0.13), rgba(22,163,74,0.05))' : 'rgba(148,163,184,0.06)'),
              border: istBuehne
                ? (hasHits ? '2.5px solid rgba(74,222,128,0.85)' : '2px solid var(--qq-hairline)')
                : `2px solid ${hasHits ? 'rgba(34,197,94,0.42)' : 'rgba(148,163,184,0.18)'}`,
              animation: 'qqT5v2Flip 0.55s var(--qq-ease-out-cubic) both',
              // themedWindow legt die Fenster-Optik der jeweiligen Skin drueber
              // (Quirks-Rahmen). Auf der Buehne bleibt die Zeile die Zeile.
              ...(istBuehne ? {} : (themedWindow({ ok: hasHits }) ?? {})),
            }}>
              <div style={{
                width: 'clamp(44px,4.4cqw,66px)', height: 'clamp(44px,4.4cqw,66px)',
                borderRadius: isThemed() ? 'var(--qq-card-radius)' : 14, background: badgeBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'clamp(20px,2cqw,32px)', fontWeight: 900, color: '#120F18',
                textShadow: istBuehne ? 'none' : '0 1px 2px rgba(246, 239, 230,0.2)',
                boxShadow: (rank === 1 && !istBuehne) ? '0 0 20px rgba(250,204,21,0.5)' : 'none',
                ...(rangKachel ?? {}),
              }}>#{rank}</div>
              <div style={{
                fontSize: 'clamp(20px,2.4cqw,36px)', fontWeight: 900, lineHeight: 1.1,
                // 2026-08-23: die nicht getroffenen Antworten sind trotzdem die
                // Aufloesung - sie stehen auf der Buehne in Creme, nicht
                // gedaempft. Was sie von den Treffern unterscheidet, ist das
                // Gruen der Zeile daneben, nicht ein verschluckter Text.
                color: hasHits ? QQ_COLORS.green300 : (istBuehne ? 'var(--qq-text)' : 'var(--qq-text-muted)'),
                minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{correct}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {hasHits ? (
                  isMega ? <FactionCountAvatars teams={hitters} de={lang === 'de'} size={'clamp(48px, 4.8cqw, 72px)'} />
                    : hitters.map((tm, hi) => (
                      <QQTeamAvatar key={tm.id} avatarId={tm.avatarId} teamEmoji={tm.emoji}
                        size={'clamp(48px, 4.8cqw, 72px)'} title={tm.name}
                        style={{ boxShadow: istBuehne ? 'none' : `0 0 12px ${tm.color}55`, animation: `top5AvatarPop 0.5s var(--qq-ease-bounce) ${0.25 + hi * 0.09}s both` }} />
                    ))
                ) : (
                  <div style={{
                    // 2026-08-23: gestrichelt ist eine Bausprache fuer Entwuerfe,
                    // nicht fuer eine Leinwand - und der Kreis stand neben lauter
                    // eckigen Marken. Auf der Buehne dieselbe Kachel wie die
                    // Rangnummer, durchgezogen.
                    width: 'clamp(44px,4.4cqw,66px)', height: 'clamp(44px,4.4cqw,66px)',
                    borderRadius: istBuehne ? 'var(--qq-card-radius)' : '50%',
                    background: istBuehne ? 'transparent' : 'rgba(148,163,184,0.12)',
                    border: istBuehne ? '2px solid var(--qq-hairline)' : '2px dashed rgba(148,163,184,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'clamp(18px,1.8cqw,26px)', fontWeight: 900, color: 'var(--qq-text-muted)',
                    animation: 'top5AvatarPop 0.5s var(--qq-ease-bounce) 0.3s both',
                  }}>✕</div>
                )}
              </div>
              <div style={{
                // 2026-08-23: 18px sind auf 1760px Buehnenbreite aus acht Metern
                // nicht mehr da. Der Treffer-Zaehler ist die Zahl, aus der sich
                // die Handy-Punkte erklaeren, also muss er lesbar sein.
                fontSize: istBuehne ? 'clamp(18px,1.9cqw,30px)' : 'clamp(12px,1.15cqw,18px)',
                fontWeight: 900, minWidth: 'clamp(30px,3.2cqw,48px)', textAlign: 'right',
                color: hasHits ? QQ_COLORS.green300 : 'var(--qq-text-muted)', fontVariantNumeric: 'tabular-nums',
              }}>{hitters.length}×</div>
            </div>
          );
        })}
      </div>

      {/* Sieger-Banner (reserviert, poppt am Ende) */}
      <div style={{ flexShrink: 0, height: 'clamp(70px,11cqh,120px)', marginTop: 'clamp(10px,2cqh,20px)', position: 'relative' }}>
        {winnerLit ? (
          winners.length === 0 ? (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(18px,2cqw,30px)', fontWeight: 900, color: '#f87171',
              background: 'rgba(248,113,113,0.08)', border: '2px solid rgba(248,113,113,0.3)',
              animation: 'qqT5v2Rise 0.5s var(--qq-ease-bounce) both',
            }}>{lang === 'en' ? 'Nobody scored.' : 'Niemand hat getroffen.'}</div>
          ) : (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(12px,1.4cqw,24px)', borderRadius: 20,
              // Arena: KEINE Gold-Kroenung (anteilige Punkte, kein Rundensieger) →
              // neutraler Akzent-Rahmen + „Meiste Treffer"-Framing statt „Rundensieger".
              // Wolf 2026-07-16 (konsistent mit Kronen-raus im ganzen Batch).
              // 2026-08-23: dasselbe Aufraeumen wie am Siegerband von Schau
              // mal. Gold-Verlauf, Gold-Rand und 48px Gold-Schein waren drei
              // Traeger fuer eine Aussage, und Gold ist eine Farbe, die im
              // 2a-Vokabular sonst nirgends vorkommt. Auf der Buehne: ruhiges
              // Feld im tiefen Kategorie-Ton, keine Kontur, kein Schein.
              // Der Grund der Folie IST bereits der tiefe Kategorie-Ton, ein
              // Band in derselben Farbe waere unsichtbar. Es bekommt deshalb
              // dieselbe ruhige Flaeche wie die Zeilen darueber - eine Haarlinie
              // und ein Hauch Creme. Den Nachdruck traegt die gefuellte Pille
              // mit der Trefferquote, nicht der Rahmen.
              background: istBuehne
                ? 'rgba(246,239,230,0.06)'
                : isMega
                ? 'linear-gradient(135deg, rgba(var(--qq-accent-rgb),0.14), rgba(var(--qq-accent-magenta-rgb),0.08))'
                : 'linear-gradient(135deg, rgba(250,204,21,0.16), rgba(var(--qq-accent-rgb),0.10))',
              border: istBuehne ? '2px solid var(--qq-hairline)' : (isMega ? '2.5px solid rgba(var(--qq-accent-rgb),0.6)' : '2.5px solid rgba(250,204,21,0.65)'),
              boxShadow: istBuehne ? 'none' : (isMega ? '0 0 44px rgba(var(--qq-accent-rgb),0.22)' : '0 0 48px rgba(250,204,21,0.25)'),
              animation: 'qqT5v2Rise 0.55s var(--qq-ease-bounce) both',
            }}>
              <span style={{ fontSize: istBuehne ? 'clamp(15px,1.6cqw,26px)' : 'clamp(11px,1.05cqw,16px)', fontWeight: 900, color: 'var(--qq-text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                {isMega
                  ? <><QQEmojiIcon emoji="🎯" /> {lang === 'en' ? 'Most hits' : 'Meiste Treffer'}</>
                  : <><QQEmojiIcon emoji="🏆" /> {winners.length > 1 ? (lang === 'en' ? 'Round winners' : 'Rundensieger') : (lang === 'en' ? 'Round winner' : 'Rundensieger')}</>}
              </span>
              {isMega ? (
                <FactionCountAvatars
                  teams={winners.map(w => s.teams.find(t => t.id === w.teamId)).filter((t): t is NonNullable<typeof t> => !!t)}
                  de={lang === 'de'} size={'clamp(60px,7.6cqh,104px)'} />
              ) : winners.slice(0, 3).map(w => {
                const tm = s.teams.find(t => t.id === w.teamId);
                if (!tm) return null;
                return (
                  <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px,1cqw,16px)', minWidth: 0 }}>
                    <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(56px,7cqh,96px)'}
                      style={{ animation: 'celebShake 0.6s ease 0.5s both' }} />
                    {/* 2026-08-23: Teamnamen auf der Buehne in Creme, wie am
                        Brett und bei Schau mal. Die Marke daneben traegt die
                        Farbe. */}
                    <TeamNameLabel name={tm.name} maxLines={1} shrinkAfter={14}
                      fontSize={'clamp(22px,2.4cqw,40px)'}
                      color={istBuehne ? 'var(--qq-text)' : tm.color} fontWeight={900} />
                  </div>
                );
              })}
              <span style={{
                // Die Trefferquote ist die Zahl, um die es geht. Auf der Buehne
                // bekommt sie dieselbe Form wie die Kategorie-Pille und die
                // schnellste Zeit bei Schau mal: gefuellt im Akzent, dunkle
                // Schrift, keine Kontur. Ein Idiom fuer „das ist der Wert".
                fontSize: 'clamp(16px,1.7cqw,28px)', fontWeight: 900,
                color: istBuehne ? '#12100E' : (isMega ? 'var(--qq-accent)' : QQ_COLORS.yellow300),
                padding: 'clamp(5px,0.7cqh,10px) clamp(12px,1.3cqw,22px)', borderRadius: 'var(--qq-pill-radius)',
                background: istBuehne
                  ? 'var(--qq-stage-accent)'
                  : (isMega ? 'rgba(var(--qq-accent-rgb),0.16)' : 'rgba(250,204,21,0.14)'),
                border: istBuehne ? 'none' : (isMega ? '1.5px solid rgba(var(--qq-accent-rgb),0.5)' : '1.5px solid rgba(250,204,21,0.5)'),
                fontVariantNumeric: 'tabular-nums',
              }}>{topHits} / {n} {lang === 'en' ? 'correct' : 'richtig'}</span>
            </div>
          )
        ) : (
          <div style={{
            // 2026-08-23: gestrichelt raus, Groesse hoch. Die Zeile haelt den
            // Platz fuer das Siegerband frei und ist waehrend der ganzen
            // Kaskade sichtbar - bei 13px war sie auf der Buehne nicht da.
            position: 'absolute', inset: 0, borderRadius: 20,
            border: istBuehne ? '1.5px solid var(--qq-hairline)' : '2px dashed rgba(148,163,184,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: istBuehne ? 'clamp(15px,1.6cqw,26px)' : 'clamp(11px,1.1cqw,17px)',
            fontWeight: 900, color: 'var(--qq-text-muted)', letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>{lang === 'en' ? 'Who has the most hits?' : 'Wer hat die meisten Treffer?'}</div>
        )}
      </div>
    </div>
  );
}
