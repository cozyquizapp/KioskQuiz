/**
 * OrderReveal v2 — "MYSTERY-TAFEL" (Redesign 2026-07-14, Wolf: "wie Top 5").
 *
 * Auf den Top5Reveal-v2-Look gehoben (vorher v1-2-Spalten-Layout):
 *  - Kompakter Kopf (Eyebrow + Frage + Kriterium links, "x/n aufgedeckt" rechts)
 *    statt grosser Frage-Card.
 *  - Verdeckte Positionen sind SICHTBARE Mystery-Rows ("· · ·") statt hidden —
 *    Spannung statt Leere, kein Layout-Sprung.
 *  - Sieger-Banner poppt erst NACH der letzten Row unten rein (reservierte Zeile
 *    mit Teaser davor) — inkl. Wappen/Team, x/n richtig.
 *  - Treffer-Zaehler (n×) pro Row rechts.
 *  - Order-Eigenheit erhalten: Wert-Pille pro Item (itemValues) + Sortier-Kriterium.
 *
 * Scoring-Story: Handy-Punkte = korrekte Positionen / n → Row-Zaehler +
 * Sieger-Quote zeigen, wie die 0–100 zustande kam. Daten-Logik (orderHitsByTeam,
 * Fraktions-Buendelung, Cascade-Sound-Filter) unveraendert aus v1 uebernommen.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { FactionCountAvatars } from '../QQFactionCrest';
import { QQEmojiIcon } from '../QQIcon';
import { TeamNameLabel } from '../TeamNameLabel';
import { playAvatarCascadeNote, playClimaxFinish, playRevealHighlight } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { isThemed, themedWindow, getActiveThemeId, QUIRKS_THEME_ID } from '../../qqTheme';
import { QQ_CATEGORY_LABELS } from '../../../../shared/quarterQuizTypes';

export function OrderReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  // CozyArena: mehrere Sub-Teams teilen einen avatarId → Cluster zu Fraktionen
  // zusammenfassen (1 Wappen + ×Anzahl) statt bis zu 24 Einzel-Avatare.
  const isMega = !!(s as any).nestedTeams || new Set(s.teams.map(t => t.avatarId)).size < s.teams.length;
  const btt = q.bunteTuete as any;
  const itemsDE: string[] = (btt.items ?? []) as string[];
  const itemsEN: string[] = (btt.itemsEn ?? []) as string[];
  const itemValues: string[] = (btt.itemValues ?? []) as string[];
  const correctOrder: number[] = (btt.correctOrder ?? []) as number[];
  const items = lang === 'en' && itemsEN.length ? itemsEN : itemsDE;
  const n = correctOrder.length;
  const criteriaTxt = lang === 'en' && btt.criteriaEn ? btt.criteriaEn : btt.criteria;

  // 2026-05-02: Backend-Truth via orderHitsByTeam (per-team boolean[] pro Position).
  const orderHits = s.orderHitsByTeam ?? {};

  // Pro Position: welche Teams haben hier richtig (Backend-Truth)?
  const perPosition = useMemo(() => {
    return correctOrder.map((correctIdx, posIdx) => {
      const hitters = s.answers
        .filter(a => (orderHits[a.teamId] ?? [])[posIdx] === true)
        .map(a => s.teams.find(t => t.id === a.teamId))
        .filter((t): t is NonNullable<typeof t> => !!t);
      return { correctIdx, hitters };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, correctOrder, s.teams, JSON.stringify(orderHits)]);

  // Treffer pro Team (Anzahl korrekter Positionen, Backend-Truth).
  const teamScore = useMemo(() => {
    return s.answers.map(a => ({
      teamId: a.teamId,
      hits: (orderHits[a.teamId] ?? []).filter(Boolean).length,
    })).sort((x, y) => y.hits - x.hits);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, JSON.stringify(orderHits)]);

  const topHits = teamScore[0]?.hits ?? 0;
  const winners = teamScore.filter(t => t.hits === topHits && topHits > 0);

  // Kaskade #n…#1 + Sieger-Beat am Ende. Cascade-Sound nur fuer Rows mit Hittern.
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
      const hasHit = (perPosition[tIdx]?.hitters.length ?? 0) > 0;
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
    // 2026-08-23: derselbe Fehler wie in Top5Reveal, dieselbe Zeile. Der
    // Wachposten muss beim Aufraeumen zurueckgesetzt werden, sonst startet die
    // Kaskade im Entwicklungsmodus (StrictMode, doppelter Effekt-Aufruf) nie:
    // erster Lauf setzt Wachposten und Zeitgeber, das Aufraeumen loescht die
    // Zeitgeber, der zweite Lauf steigt am Wachposten aus.
    return () => { timers.forEach(clearTimeout); cascadeStartedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  const revealedCount = n - revealedMinIdx;

  // 2026-08-23 (Uebergabe 2a, Buehnen-Durchgang): dieselbe Tafel wie Top 5 und
  // deshalb dieselben vier Befunde - eigene winzige Kopfzeile, Medaillen fuer
  // die Plaetze 1-3, Gold am Siegerband, gestrichelte Rahmen. Auf der Buehne
  // dieselbe Behandlung; die uebrigen Skins bleiben unveraendert.
  const istBuehne = getActiveThemeId() === QUIRKS_THEME_ID;
  const rangKachel = istBuehne ? {
    border: '2px solid var(--qq-hairline)',
    color: 'var(--qq-text)',
    borderRadius: 'var(--qq-card-radius)',
  } : null;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: 'clamp(16px, 2.2cqh, 30px) clamp(20px, 3cqw, 48px) clamp(14px, 2cqh, 26px)',
      animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) both', minHeight: 0,
    }}>
      <style>{`
        @keyframes qqOrdV2Flip{0%{transform:rotateX(72deg);opacity:0}100%{transform:rotateX(0);opacity:1}}
        @keyframes qqOrdV2Rise{0%{transform:translateY(20px);opacity:0}100%{transform:translateY(0);opacity:1}}
      `}</style>

      {/* Kopf: Frage + Kriterium + Fortschritt */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'clamp(14px,2cqw,32px)' }}>
        <div style={{ minWidth: 0 }}>
          {istBuehne ? (
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
              <QQEmojiIcon emoji="🎁" /> {lang === 'en' ? 'Order · Reveal' : 'Reihenfolge · Auflösung'}
            </div>
          )}
          <div key={lang} style={{
            fontSize: istBuehne
              ? (qText.length > 120 ? 'clamp(26px, 2.6cqw, 42px)' : 'clamp(30px, 3.1cqw, 52px)')
              : (qText.length > 120 ? 'clamp(20px, 2cqw, 32px)' : 'clamp(22px, 2.3cqw, 37px)'),
            fontWeight: 900, lineHeight: 1.18, color: 'var(--qq-card-text)', marginTop: 'clamp(4px,0.8cqh,10px)',
            animation: 'langFadeIn 0.4s ease both', textWrap: 'pretty' as any,
          }}>{qText}</div>
          {criteriaTxt && (
            // Das Sortier-Kriterium ist die Spielregel dieser Folie („wonach
            // ist sortiert?"). Bei 19px war sie auf der Buehne nicht da.
            <div style={{ marginTop: 'clamp(3px,0.6cqh,7px)', fontSize: istBuehne ? 'clamp(17px, 1.8cqw, 30px)' : 'clamp(13px, 1.3cqw, 19px)', fontWeight: 800, color: istBuehne ? 'var(--qq-text-muted)' : 'var(--qq-accent-soft)', fontStyle: 'italic' }}>
              ↕ {criteriaTxt}
            </div>
          )}
        </div>
        <div style={{
          fontSize: istBuehne ? 'clamp(15px, 1.6cqw, 28px)' : 'clamp(12px, 1.1cqw, 17px)',
          fontWeight: istBuehne ? 800 : 900,
          letterSpacing: istBuehne ? '0.26em' : undefined,
          textTransform: istBuehne ? 'uppercase' : undefined,
          color: 'var(--qq-text-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
        }}>
          {revealedCount} / {n} {lang === 'en' ? 'revealed' : 'aufgedeckt'}
        </div>
      </div>

      {/* Tafel: volle Breite, Mystery-Rows, von unten nach oben aufgedeckt */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.4cqh, 16px)', marginTop: 'clamp(10px,2cqh,22px)', minHeight: 0, perspective: 1200 }}>
        {perPosition.map(({ correctIdx, hitters }, idx) => {
          const rank = idx + 1;
          const isRevealed = idx >= revealedMinIdx;
          const hasHits = hitters.length > 0;
          const itemText = items[correctIdx] ?? '';
          const valueTxt = itemValues[correctIdx];
          // 2026-08-23: keine Medaillen auf der Buehne. Die Tafel IST eine
          // Reihenfolge, jede Zeile traegt ihre Nummer.
          const badgeBg = istBuehne ? 'transparent'
            : rank === 1 ? 'linear-gradient(135deg,#FDE68A,#FACC15)'
            : rank === 2 ? 'linear-gradient(135deg,#F6EFE6,#94a3b8)'
            : rank === 3 ? 'linear-gradient(135deg,#fdba74,#b45309)'
            : 'linear-gradient(135deg,#64748b,#334155)';
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
                <div style={{ fontSize: 'clamp(20px,2.4cqw,36px)', fontWeight: 900, color: '#475569', letterSpacing: '0.5em' }}>· · ·</div>
                <div /><div />
              </div>
            );
          }
          return (
            <div key={idx} style={{
              flex: 1, display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center',
              gap: 'clamp(12px,1.4cqw,22px)', padding: '0 clamp(14px,1.6cqw,24px)', borderRadius: 18,
              minHeight: 'clamp(56px,7cqh,88px)', transformOrigin: 'center bottom',
              // 2026-08-23, gemessen an der Top-5-Tafel: dunkles Gruen auf dem
              // roten Kategorie-Grund wird braun. Auf der Buehne traegt die
              // Kontur das Signal, die Fuellung bleibt fast durchsichtig.
              background: istBuehne
                ? (hasHits ? 'rgba(74,222,128,0.10)' : 'rgba(246,239,230,0.04)')
                : (hasHits ? 'linear-gradient(135deg, rgba(34,197,94,0.13), rgba(22,163,74,0.05))' : 'rgba(148,163,184,0.06)'),
              border: istBuehne
                ? (hasHits ? '2.5px solid rgba(74,222,128,0.85)' : '2px solid var(--qq-hairline)')
                : `2px solid ${hasHits ? 'rgba(34,197,94,0.42)' : 'rgba(148,163,184,0.18)'}`,
              animation: 'qqOrdV2Flip 0.55s var(--qq-ease-out-cubic) both',
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
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(8px,1cqw,14px)', minWidth: 0 }}>
                <span style={{
                  fontSize: 'clamp(20px,2.4cqw,36px)', fontWeight: 900, lineHeight: 1.1,
                  // Auch die nicht getroffenen Positionen sind die Aufloesung -
                  // auf der Buehne in Creme statt gedaempft.
                  color: hasHits ? QQ_COLORS.green300 : (istBuehne ? 'var(--qq-text)' : 'var(--qq-text-muted)'),
                  minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{itemText}</span>
                {valueTxt && (
                  <span style={{
                    flexShrink: 0, display: 'inline-flex', alignItems: 'center',
                    padding: '2px 11px', borderRadius: 'var(--qq-pill-radius)',
                    background: hasHits ? 'rgba(34,197,94,0.20)' : 'rgba(148,163,184,0.16)',
                    border: hasHits ? '1.5px solid rgba(34,197,94,0.5)' : '1.5px solid rgba(148,163,184,0.3)',
                    color: hasHits ? QQ_COLORS.green300 : 'var(--qq-text-muted)',
                    fontWeight: 900,
                    // Die Wert-Pille sagt, WARUM diese Reihenfolge stimmt
                    // (Einwohner, Jahr, Hoehe). Sie war mit 20px zu klein.
                    fontSize: istBuehne ? 'clamp(17px,1.8cqw,28px)' : 'clamp(13px,1.35cqw,20px)',
                    whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                  }}>{valueTxt}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {hasHits ? (
                  isMega ? <FactionCountAvatars teams={hitters} de={lang === 'de'} size={'clamp(46px, 4.6cqw, 68px)'} />
                    : hitters.map((tm, hi) => (
                      <QQTeamAvatar key={tm.id} avatarId={tm.avatarId} teamEmoji={tm.emoji}
                        size={'clamp(46px, 4.6cqw, 68px)'} title={tm.name}
                        style={{ boxShadow: istBuehne ? 'none' : `0 0 12px ${tm.color}55`, animation: `top5AvatarPop 0.5s var(--qq-ease-bounce) ${0.25 + hi * 0.09}s both` }} />
                    ))
                ) : (
                  <div style={{
                    // Gestrichelt ist eine Bausprache fuer Entwuerfe, und der
                    // Kreis stand neben lauter eckigen Marken.
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
              animation: 'qqOrdV2Rise 0.5s var(--qq-ease-bounce) both',
            }}>{lang === 'en' ? 'Nobody scored.' : 'Niemand hat getroffen.'}</div>
          ) : (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(12px,1.4cqw,24px)', borderRadius: 20,
              // Der Grund der Folie ist bereits der tiefe Kategorie-Ton, also
              // bekommt das Band dieselbe ruhige Flaeche wie die Zeilen
              // darueber. Gold raus - eine Farbe, die im 2a-Vokabular sonst
              // nirgends vorkommt.
              background: istBuehne
                ? 'rgba(246,239,230,0.06)'
                : 'linear-gradient(135deg, rgba(250,204,21,0.16), rgba(var(--qq-accent-rgb),0.10))',
              border: istBuehne ? '2px solid var(--qq-hairline)' : '2.5px solid rgba(250,204,21,0.65)',
              boxShadow: 'none',
              animation: 'qqOrdV2Rise 0.55s var(--qq-ease-bounce) both',
            }}>
              <span style={{ fontSize: istBuehne ? 'clamp(15px,1.6cqw,26px)' : 'clamp(11px,1.05cqw,16px)', fontWeight: 900, color: 'var(--qq-text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                <QQEmojiIcon emoji="🏆" /> {winners.length > 1 ? (lang === 'en' ? 'Round winners' : 'Rundensieger') : (lang === 'en' ? 'Round winner' : 'Rundensieger')}
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
                    {/* Teamnamen auf der Buehne in Creme, wie am Brett. */}
                    <TeamNameLabel name={tm.name} maxLines={1} shrinkAfter={14}
                      fontSize={'clamp(22px,2.4cqw,40px)'}
                      color={istBuehne ? 'var(--qq-text)' : tm.color} fontWeight={900} />
                  </div>
                );
              })}
              <span style={{
                // Gefuellt im Akzent, dunkle Schrift - dasselbe Idiom wie die
                // Kategorie-Pille und die schnellste Zeit bei Schau mal.
                fontSize: 'clamp(16px,1.7cqw,28px)', fontWeight: 900,
                color: istBuehne ? '#12100E' : QQ_COLORS.yellow300,
                padding: 'clamp(5px,0.7cqh,10px) clamp(12px,1.3cqw,22px)', borderRadius: 'var(--qq-pill-radius)',
                background: istBuehne ? 'var(--qq-stage-accent)' : 'rgba(250,204,21,0.14)',
                border: istBuehne ? 'none' : '1.5px solid rgba(250,204,21,0.5)',
                fontVariantNumeric: 'tabular-nums',
              }}>{topHits} / {n} {lang === 'en' ? 'correct' : 'richtig'}</span>
            </div>
          )
        ) : (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 20,
            border: istBuehne ? '1.5px solid var(--qq-hairline)' : '2px dashed rgba(148,163,184,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: istBuehne ? 'clamp(15px,1.6cqw,26px)' : 'clamp(11px,1.1cqw,17px)',
            fontWeight: 900, color: istBuehne ? 'var(--qq-text-muted)' : '#475569',
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>{lang === 'en' ? 'Who nailed the order?' : 'Wer hatte die Reihenfolge?'}</div>
        )}
      </div>
    </div>
  );
}
