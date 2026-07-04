/**
 * QQFactionCrest — Wappen einer Cozy-Arena-Fraktion (Wolf „Cozy Universe").
 *
 * 2026-07-03 (Wolf): echte 3D-Wappen-PNGs (Schild + Farbe + Emblem komplett
 * gebacken) unter /avatars/cozyarena/<slug>.png. Der Crest wird als flaches
 * Bild via QQTeamAvatar (kind:'crest') gerendert — keine code-gezeichnete
 * Schild-Form mehr. QQ_MEGA_FACTIONS.slug liefert den Wappen-Slug.
 *
 * Genutzt auf den Identitäts-Screens: Lobby-Karten, Pre-Game-Roster,
 * Standings/Summary + (via FactionCountAvatars) die Reveal-Cluster.
 */
import type { CSSProperties } from 'react';
import {
  qqMegaFactionSlug, qqMegaFactionName, qqMegaFactionMotto,
} from '../../../shared/quarterQuizTypes';
import { qqFactionBuckets } from '../qqShared';
import { QQTeamAvatar } from './QQTeamAvatar';

/**
 * FactionCountAvatars — Cozy-Arena-Rollout für Reveal-Cluster: fasst eine
 * Team-Liste zu ihren Fraktionen zusammen und zeigt je Fraktion EIN Tier-Avatar
 * + ×Anzahl-Badge (statt bis zu 24 Einzel-Sub-Teams). Optional Fraktions-Name.
 * Zum Eintauschen an den Avatar-Cluster-Stellen der Reveals (Order/Top5/…).
 */
export function FactionCountAvatars({
  teams, de, size = 'clamp(36px, 3.8cqw, 54px)', showName, style,
}: {
  teams: Array<{ id: string; name: string; avatarId: string; color?: string; emoji?: string }>;
  de: boolean;
  size?: string;
  showName?: boolean;
  style?: CSSProperties;
}) {
  const buckets = qqFactionBuckets(teams as any, de);
  // 2026-07-04 (Wolf 'Rundensieger 7+1 → 4+4'): viele benannte Fraktions-Chips
  // in 2 ausgewogene Reihen legen (Grid mit ceil(n/2) Spalten, 8 → 4+4) statt
  // flex-wrap, das den letzten Chip allein in Reihe 2 haengen laesst.
  const n = buckets.length;
  const useGrid = !!showName && n > 4;
  const cols = Math.ceil(n / 2);
  return (
    <div style={{
      display: useGrid ? 'grid' : 'flex',
      gap: showName ? 12 : 8,
      ...(useGrid
        ? { gridTemplateColumns: `repeat(${cols}, max-content)`, justifyContent: 'center', alignItems: 'center' }
        : { alignItems: 'center', flexWrap: 'wrap' }),
      ...style,
    }}>
      {buckets.map(b => (
        <div key={b.avatarId} style={{
          display: 'inline-flex', alignItems: 'center', gap: showName ? 8 : 0,
          ...(showName ? {
            padding: '4px 12px 4px 4px', borderRadius: 'var(--qq-pill-radius)',
            background: `linear-gradient(135deg, ${b.color}26, ${b.color}0a)`,
            border: `2px solid ${b.color}55`,
          } : {}),
        }}>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <QQTeamAvatar avatarId={b.avatarId} teamEmoji={b.slug} size={size} style={{ boxShadow: `0 0 8px ${b.color}44` }} />
            {b.count > 1 && (
              <span style={{
                position: 'absolute', right: -4, bottom: -4, minWidth: 18, height: 18, padding: '0 4px',
                borderRadius: 9, background: '#0A0814', border: `1.5px solid ${b.color}`,
                color: '#fff', fontSize: 11, fontWeight: 900, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×{b.count}</span>
            )}
          </div>
          {showName && (
            <span style={{ fontWeight: 900, fontSize: 'clamp(15px, 1.7cqw, 24px)', color: b.color, whiteSpace: 'nowrap' }}>{b.name}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function FactionCrest({
  avatarId, width = 'clamp(64px, 7cqw, 110px)', showName, showMotto, de = true, style,
}: {
  avatarId: string;
  width?: string;
  showName?: boolean;
  showMotto?: boolean;
  de?: boolean;
  style?: CSSProperties;
}) {
  const slug = qqMegaFactionSlug(avatarId);
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8, ...style }}>
      {/* Volles Wappen-PNG (Schild + Farbe + Emblem gebacken). Quadratische
          Leinwand → QQTeamAvatar (crest, non-flat) rendert es ungeschnitten. */}
      <QQTeamAvatar avatarId={avatarId} teamEmoji={slug} size={width} />
      {showName && (
        <span style={{
          fontWeight: 900, fontSize: 'clamp(14px, 1.5cqw, 20px)',
          color: 'var(--qq-card-text, #fff)', textAlign: 'center', lineHeight: 1.12,
        }}>
          {qqMegaFactionName(avatarId, de ? 'de' : 'en')}
        </span>
      )}
      {showMotto && (
        <span style={{
          fontSize: 'clamp(10px, 1.1cqw, 14px)', fontWeight: 700,
          color: 'var(--qq-text-muted, #9aa3b2)', fontStyle: 'italic',
          textAlign: 'center', lineHeight: 1.15,
        }}>
          „{qqMegaFactionMotto(avatarId, de ? 'de' : 'en')}"
        </span>
      )}
    </div>
  );
}
