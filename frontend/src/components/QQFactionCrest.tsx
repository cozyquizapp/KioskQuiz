/**
 * QQFactionCrest — Wappen einer Cozy-Arena-Fraktion (Wolf „Cozy Universe" 2026-07-02).
 *
 * PLATZHALTER-ART: ein heraldisches Schild in der Fraktions-Farbe mit dem
 * cozy3d-Tier zentriert drauf + optional Name/Motto darunter. Später ersetzt
 * Wolf das durch echte Wappen-Grafiken (Icon-Referenz-Workflow) — dann nur den
 * Schild-Layer hier gegen ein <img src={crestUrl}/> tauschen, Rest bleibt.
 *
 * Genutzt auf den Identitäts-Screens: Lobby-Karten, Pre-Game-Roster,
 * Standings/Summary. Für die dichten Reveal-Cluster bleibt der runde Avatar
 * (Wappen wären dort zu klein/unruhig).
 */
import type { CSSProperties } from 'react';
import {
  QQ_AVATARS, qqMegaFactionSlug, qqMegaFactionName, qqMegaFactionMotto,
} from '../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from './QQTeamAvatar';

// Heraldische Schild-Silhouette (oben gerade, unten spitz zulaufend).
const SHIELD = 'polygon(50% 100%, 4% 62%, 4% 6%, 96% 6%, 96% 62%)';

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
  const meta = QQ_AVATARS.find(a => a.id === avatarId);
  const color = meta?.color ?? '#8a8a8a';
  const slug = qqMegaFactionSlug(avatarId);
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8, ...style }}>
      <div style={{ position: 'relative', width, aspectRatio: '1 / 1.16', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.45))' }}>
        {/* Rahmen-Schild (helle Farb-Kante) */}
        <div style={{ position: 'absolute', inset: 0, clipPath: SHIELD, background: color }} />
        {/* Innen-Schild (Verlauf dunkler nach unten) */}
        <div style={{
          position: 'absolute', inset: '7%', clipPath: SHIELD,
          background: `linear-gradient(165deg, ${color} 0%, ${color} 42%, rgba(0,0,0,0.42) 100%)`,
        }} />
        {/* Glanz oben */}
        <div style={{
          position: 'absolute', inset: '7%', clipPath: SHIELD, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 42%)',
        }} />
        {/* Tier zentriert — quadratischer Wrapper → keine Verzerrung */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column', paddingTop: '12%' }}>
          <div style={{ width: '58%', aspectRatio: '1', display: 'flex' }}>
            <QQTeamAvatar avatarId={avatarId} teamEmoji={slug} size="100%" flat />
          </div>
        </div>
      </div>
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
