/**
 * CozyGuessrReveal — Bunte-Tüte "map" Sub-Mechanic, Reveal-Phase.
 *
 * Leaflet-Map mit Target-Pin + Team-Pins. Per-Team Distanz-Berechnung,
 * Top-5-Ranking nach kürzester Distanz. Tie-Marker bei gleichem Δ.
 *
 * 2026-05-24 (Refactor #5.4): aus CozyQuizQuestionView.tsx extrahiert.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { qqGetAvatar, qqMegaFactionName, qqMegaFactionSlug, qqIsMega } from '../../../../shared/quarterQuizTypes';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon } from '../QQIcon';
import { TeamNameLabel } from '../TeamNameLabel';
import { getAvatarDisplay } from '../../avatarSets';
import { formatRevealedAnswer } from '../../cozyQuizShared';
import {
  playAvatarCascadeNote, playClimaxFinish, playRevealHighlight,
} from '../../utils/sounds';
import { isThemed } from '../../qqTheme';

// ── Leaflet-Map Helpers ─────────────────────────────────────────────────────
// Vorher inline in CozyQuizQuestionView.tsx — beim Extract mit hierher gewandert,
// weil CozyGuessr der einzige Consumer ist.

const QQFitBoundsOnTrigger: React.FC<{ bounds: L.LatLngBounds; trigger: number }> = ({ bounds, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds.isValid()) {
      // flyToBounds = smoother Cinematic-Zoom (vs. fitBounds = harter Sprung).
      map.flyToBounds(bounds, { padding: [100, 100], maxZoom: 8, duration: 1.4 });
    }
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

// Slow-Zoom-Intro: beim ersten Reveal-Step (showTarget) auf den Zielbereich
// zoomen — startet typischerweise von einem weiten Default-Zoom und gleitet
// rein, wie GeoGuessr-Round-End. Nur einmal beim Mount.
const QQInitialTargetZoom: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => {
      map.flyTo([lat, lng] as any, 6, { duration: 2.0 });
    }, 200);
    return () => window.clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

const QQMapResizer: React.FC<{ trigger: boolean }> = ({ trigger }) => {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 60);
    return () => window.clearTimeout(t);
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════

export function CozyGuessrReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const btt = (q.bunteTuete as any);
  const tLat: number = btt.lat;
  const tLng: number = btt.lng;
  const step = s.mapRevealStep ?? 0;

  // Distanzen + Sortierung worst→best (für dramatisches Aufdecken)
  const scored = useMemo(() => {
    return [...s.answers].map(a => {
      const parts = String(a.text ?? '').split(',');
      const lat = Number(parts[0]); const lng = Number(parts[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ...a, lat: null as any, lng: null as any, distKm: null as any };
      const R = 6371;
      const dLat = (lat - tLat) * Math.PI / 180;
      const dLng = (lng - tLng) * Math.PI / 180;
      const aa = Math.sin(dLat/2)**2 + Math.cos(tLat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2;
      return { ...a, lat, lng, distKm: R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa)) };
    }).filter(a => a.distKm !== null);
  }, [s.answers, tLat, tLng]);

  // CozyArena: pro Fraktion nur den BESTEN (nächsten) Pin behalten — sonst
  // klebt die Karte mit bis zu 24 Sub-Team-Pins zu (Wolf 2026-07-03 'nur der
  // beste pin pro team'). Wirkt auf Karte, Cascade UND Ranking gleichermaßen.
  const isMega = qqIsMega(s);
  const scoredEff = useMemo(() => {
    if (!isMega) return scored;
    const byAvatar = new Map<string, typeof scored[number]>();
    for (const p of [...scored].sort((a, b) => (a.distKm ?? 0) - (b.distKm ?? 0))) {
      const tm = s.teams.find(t => t.id === p.teamId);
      if (tm && !byAvatar.has(tm.avatarId)) byAvatar.set(tm.avatarId, p);
    }
    return [...byAvatar.values()];
  }, [scored, isMega, s.teams]);

  const worstFirst = useMemo(() => [...scoredEff].sort((a, b) => (b.distKm ?? 0) - (a.distKm ?? 0)), [scoredEff]);
  const bestFirst  = useMemo(() => [...scoredEff].sort((a, b) => (a.distKm ?? 0) - (b.distKm ?? 0)), [scoredEff]);

  // Pins werden EXAKT an der eingereichten Position dargestellt — kein
  // Cluster-Spread mehr. (User-Wunsch 2026-04-28: 'pins müssen exakt gesetzt
  // werden, nicht rundherum um das ziel'. Geoguessr-Look — falls Pins
  // überlappen ist das die echte Information; bounds.fit zoomt automatisch
  // näher rein wenn alle Pins eng beieinander liegen.)
  const displayPos = useMemo(() => {
    const out = new Map<string, { lat: number; lng: number }>();
    for (const p of scoredEff) {
      if (p.lat != null && p.lng != null) {
        out.set(p.teamId, { lat: p.lat, lng: p.lng });
      }
    }
    return out;
  }, [scoredEff]);

  const showTarget  = step >= 1;
  const revealedCnt = Math.max(0, step - 1); // Step 2 = 1 Pin, Step 3 = 2 Pins, ...
  const revealedPins = worstFirst.slice(0, revealedCnt);
  const validCount = scoredEff.length;
  const showRanking = step >= (1 + validCount + 1);

  // FitBounds bounds — aber Cap auf max. 2500km Pin-Distanz vom Ziel. Sehr
  // weit entfernte Pins (z.B. „Penguin-Team in Argentinien" bei einem
  // Hamburg-Quiz) wuerden sonst die Map auf Welt-Level rauszoomen, sodass
  // alle nahen Pins als Pixel verschmelzen. Diese „Off-Map"-Pins werden in
  // einer Leiste unter der Karte separat mit Distanz angezeigt.
  const FIT_MAX_KM = 2500;
  const onMapPins = useMemo(
    () => revealedPins.filter(p => (p.distKm ?? 0) <= FIT_MAX_KM),
    [revealedPins]
  );
  const offMapPins = useMemo(
    () => revealedPins.filter(p => (p.distKm ?? 0) > FIT_MAX_KM),
    [revealedPins]
  );
  const bounds = useMemo(() => {
    const b = L.latLngBounds([] as any);
    if (showTarget) b.extend([tLat, tLng]);
    for (const p of onMapPins) {
      const dp = displayPos.get(p.teamId);
      const lat = dp?.lat ?? p.lat;
      const lng = dp?.lng ?? p.lng;
      b.extend([lat, lng]);
    }
    if (!b.isValid()) b.extend([tLat, tLng]);
    return b;
  }, [showTarget, onMapPins, tLat, tLng, displayPos]);

  // v3 round 11 (User-Wunsch 'cozyguessr am ende um ziel rum zoomen, genau
  // zeigen wie knapp es zwischen teams war'): Geoguessr-Style. Wenn alle
  // Pins revealed sind und das Ranking sichtbar ist (showRanking), zoom auf
  // einen engen Bereich um Ziel + Top-3-naechste-Pins. Wir nutzen ein
  // separates Bounds + ein eigenes FitBounds-Trigger.
  const closeUpBounds = useMemo(() => {
    const b = L.latLngBounds([] as any);
    b.extend([tLat, tLng]);
    // Top 3 closest valid (on-map) pins um die enge Group-View zu zeigen
    const topClose = bestFirst.filter(p => (p.distKm ?? 0) <= FIT_MAX_KM).slice(0, 3);
    for (const p of topClose) {
      const dp = displayPos.get(p.teamId);
      const lat = dp?.lat ?? p.lat;
      const lng = dp?.lng ?? p.lng;
      if (lat != null && lng != null) b.extend([lat, lng]);
    }
    if (!b.isValid()) b.extend([tLat, tLng]);
    return b;
  }, [bestFirst, tLat, tLng, displayPos]);

  // 2026-04-30 v3 round 10 (User-Wunsch 'kannst du nicht den 📍-emote
  // nutzen' + 'auflösung etwas unpraktisch, ziel sieht man gar nicht'):
  // Target nutzt jetzt das 📍-Pin-Emoji XL mit Glow. Team-Markers haben
  // Avatar oben + 📍-Pin unten der die Tip-Position markiert.
  // iconAnchor sitzt am unteren Tip damit die Nadel exakt auf lat/lng landet.
  // Geoguessr-Style: Target deutlich groesser & dauerhaft pulsierend, plus
  // Distanz-Polylines vom Team-Pin zum Ziel (siehe Render unten).
  const targetIcon = useMemo(() => L.divIcon({
    className: 'qq-target-pin',
    html: `<div style="
      position: relative; width: 88px; height: 110px;
      animation: mapTargetDrop 0.75s var(--qq-ease-bounce) both, qqTargetPulse 2.1s ease-in-out 0.8s infinite;
      transform-origin: 50% 100%;
      filter: drop-shadow(0 0 18px rgba(236,72,153,0.95)) drop-shadow(0 8px 16px rgba(0,0,0,0.6));
    ">
      <span style="
        position: absolute; left: 50%; top: 0;
        transform: translateX(-50%);
        font-size: 96px; line-height: 1;
        color: #EC4899;
      ">📍</span>
      <!-- 2026-05-09 (Wolf): pulsierender pinker Glow-Dot entfernt — war
           redundant zum 📍 selbst, sah aus wie ein Bug. -->
    </div>`,
    iconSize: [88, 110] as any,
    iconAnchor: [44, 105] as any, // Pin-Tip an lat/lng (5px Offset, da Emoji-Tip nicht ganz unten)
  }), []);

  // 2026-05-05 (Wolf-Skizze): Pin-Kopf = runder Team-Color-Disc mit Avatar
  // drauf (Emoji-Mode: Emoji-Glyph; PNG-Mode: cozyCast-PNG). Schaft = sauberer
  // schwarzer CSS-Cone (kein 📍-Emoji mehr — sah „basteln" aus, war Wolfs
  // Beschwerde 'pin köpfe sollen die avatare mit rundem bg sein').
  const makeTeamIcon = (color: string, mode: 'png' | 'image' | 'emoji', srcOrEmoji: string, emojiFallback: string) => L.divIcon({
    className: 'qq-team-pin',
    html: `<div style="
      position: relative; width: 56px; height: 84px;
      animation: qqTeamPinDrop 0.55s var(--qq-ease-bounce) both;
      transform-origin: 50% 100%;
      filter: drop-shadow(0 6px 8px rgba(0,0,0,0.55));
    ">
      <!-- Schaft (schwarzer CSS-Cone unter Avatar-Disc) -->
      <div style="
        position: absolute; left: 50%; top: 38px;
        transform: translateX(-50%);
        width: 0; height: 0;
        border-left: 9px solid transparent;
        border-right: 9px solid transparent;
        border-top: 44px solid #1A1A1A;
        z-index: 1;
      "></div>
      <!-- Avatar-Disc Kopf (Team-Color BG, Avatar/Emoji drauf) -->
      <div style="
        position: absolute; left: 4px; top: 0;
        width: 48px; height: 48px; border-radius: 50%;
        background: ${color};
        border: 2.5px solid #1A1A1A;
        box-shadow: 0 0 22px ${color}66, inset 0 -3px 6px rgba(0,0,0,0.18), inset 0 2px 4px rgba(255,255,255,0.22);
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
        z-index: 2;
      ">
        ${mode === 'png' || mode === 'image' ? `
        <img src="${srcOrEmoji}" alt="" draggable="false"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
          style="width:${mode === 'image' ? '94%' : '100%'};height:${mode === 'image' ? '94%' : '100%'};object-fit:${mode === 'image' ? 'contain' : 'cover'};display:block;border-radius:50%;" />
        <span style="display:none;align-items:center;justify-content:center;width:100%;height:100%;font-size:28px;line-height:1;">${emojiFallback}</span>
        ` : `
        <span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:30px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));">${srcOrEmoji}</span>
        `}
      </div>
    </div>`,
    iconSize: [56, 84] as any,
    iconAnchor: [28, 82] as any, // Pin-Spitze (Cone-Tip) an lat/lng
  });

  const title = (lang === 'en' ? 'Where on the map?' : 'Wo auf der Karte?');

  return (
    <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden', background: isThemed() ? 'var(--qq-bg)' : '#0A0814' }}>
      {/* Karte */}
      <div style={{ flex: 1, position: 'relative', transition: 'flex 0.7s var(--qq-ease-smooth)' }}>
        <MapContainer
          center={[tLat, tLng] as any}
          zoom={3}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          dragging={false}
          touchZoom={false}
          style={{ width: '100%', height: '100%', background: '#0a1120' }}
        >
          {/* CartoDB Voyager — bunte, freundliche Karte mit Labels darueber.
              War vorher 'dark_all' (grau-schwarz) — User wollte was Schoeneres. */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains={['a', 'b', 'c', 'd']}
          />
          {/* Geoguessr-Style: erst Welt-Level (zoom 3), dann smoothes Reinzoomen
              auf den Zielbereich beim ersten Reveal-Schritt. */}
          <QQInitialTargetZoom lat={tLat} lng={tLng} />
          <QQMapResizer trigger={showRanking} />
          <QQFitBoundsOnTrigger bounds={bounds} trigger={step} />
          {/* v3 round 11: Wenn Ranking sichtbar ist (alle Pins revealed),
              zoom rein auf Ziel + Top 3 closest. Geoguessr-Style 'wie knapp
              war es'-Moment. Trigger ist showRanking-Bool als 0/1 */}
          {showRanking && (
            <QQFitBoundsOnTrigger bounds={closeUpBounds} trigger={1000 + step} />
          )}
          {showTarget && (
            // 2026-05-03 (Wolf-Bug 'Pin verdeckt Team-Avatare'): Leaflet
            // sortiert Marker nach Latitude (Norden hinten). zIndexOffset
            // negativ haelt Target-Pin hinter Team-Pins (die +1000 bekommen).
            <Marker position={[tLat, tLng] as any} icon={targetIcon} zIndexOffset={-100} />
          )}
          {/* v3 round 10 (User-Wunsch geoguessr-style 'ziel sieht man gar nicht'):
              Distanz-Polylines vom Team-Pin zum Ziel — nur wenn target sichtbar
              (showTarget) und beide on-map. team-color, dashed style fuer
              Map-Pin-Verbindung-Look wie Geoguessr. */}
          {showTarget && onMapPins.map(p => {
            const team = s.teams.find(t => t.id === p.teamId);
            if (!team) return null;
            const dp = displayPos.get(p.teamId);
            const lat = dp?.lat ?? p.lat;
            const lng = dp?.lng ?? p.lng;
            return (
              <Polyline
                key={`line-${p.teamId}`}
                positions={[[lat, lng], [tLat, tLng]] as any}
                pathOptions={{
                  color: team.color,
                  weight: 2.5,
                  opacity: 0.65,
                  dashArray: '6 8',
                }}
              />
            );
          })}
          {onMapPins.map(p => {
            const team = s.teams.find(t => t.id === p.teamId);
            if (!team) return null;
            const dp = displayPos.get(p.teamId);
            const lat = dp?.lat ?? p.lat;
            const lng = dp?.lng ?? p.lng;
            return (
              <Marker
                key={p.teamId}
                position={[lat, lng] as any}
                icon={(() => {
                  // 2026-05-05 (Wolf-Bug 'pin emoji nicht das gewaehlte'):
                  // serverEmojis + team.emoji werden jetzt durchgereicht,
                  // sodass der Map-Pin das vom Spieler gewaehlte Emoji zeigt.
                  const display = getAvatarDisplay(team.avatarId, s.avatarSetId, s.avatarSetEmojis, team.emoji);
                  if (display.kind === 'png') {
                    return makeTeamIcon(team.color, 'png', display.pngBase, team.emoji ?? qqGetAvatar(team.avatarId).emoji);
                  }
                  if (display.kind === 'image' || display.kind === 'crest') {
                    return makeTeamIcon(team.color, 'image', display.src, qqGetAvatar(team.avatarId).emoji);
                  }
                  return makeTeamIcon(team.color, 'emoji', display.emoji, display.emoji);
                })()}
                zIndexOffset={1000}
              />
            );
          })}
        </MapContainer>

        {/* Off-Map Indikator: Pins die >2500km vom Ziel weg sind, werden auf
            der Map nicht eingerahmt (sonst zoomt sie auf Welt-Level raus).
            Stattdessen hier kompakt mit Distanz-Pfeil. */}
        {offMapPins.length > 0 && (
          <div style={{
            position: 'absolute', top: 88, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '8px 16px', borderRadius: 'var(--qq-pill-radius)',
            background: 'rgba(13,10,6,0.85)',
            border: '1.5px solid rgba(236,72,153,0.35)',
            zIndex: 1000, maxWidth: 'calc(100% - 80px)', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: 13, fontWeight: 900, color: '#FBCFE8',
              letterSpacing: 0.3, textTransform: 'uppercase',
            }}>
              {lang === 'en' ? '✈ Far away' : '✈ Weit weg'}
            </span>
            {offMapPins.map(p => {
              const team = s.teams.find(t => t.id === p.teamId);
              if (!team) return null;
              return (
                <span key={p.teamId} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px 4px 4px', borderRadius: 'var(--qq-pill-radius)',
                  background: 'rgba(15,23,42,0.6)',
                  border: `1.5px solid ${team.color}55`,
                }}>
                  <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={28} />
                  <span style={{
                    fontWeight: 900, color: team.color, fontSize: 13,
                    fontVariantNumeric: 'tabular-nums', letterSpacing: 0.2,
                  }}>
                    {(p.distKm ?? 0) >= 1000 ? `${((p.distKm ?? 0) / 1000).toFixed(1)} Mm` : `${Math.round(p.distKm ?? 0)} km`}
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {/* Title-Overlay oben */}
        <div style={{
          position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)',
          padding: '12px 28px', borderRadius: 'var(--qq-pill-radius)',
          background: 'rgba(15,23,42,0.85)', border: '2px solid rgba(236,72,153,0.4)',
          color: '#FBCFE8', fontWeight: 900, fontSize: 'clamp(20px, 2.4cqw, 32px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 28px rgba(236,72,153,0.25)',
          zIndex: 1000, letterSpacing: 0.3,
        }}>
          <QQEmojiIcon emoji="🌍"/> {title}
        </div>

      </div>

      {/* Ranking-Panel rechts (slide-in). 2026-05-05 (Wolf): justifyContent center
          damit die Liste vertikal mittig sitzt statt top-aligned. Liste ist auf
          Top-5 gecappt (s.u. slice(0,5)) → overflow:hidden statt auto, damit auf
          /beamer NIE eine Scrollbar erscheint (harte Regel). */}
      {showRanking && (
        <div style={{
          flex: '0 0 38%', padding: '34px 22px 22px',
          // 2026-07-15 (Wolf 'rechts BG etwas sichtbar, wie Schau-mal'): Panel-
          // Hintergrund halbtransparent (0.96 → 0.62) → der Arena-BG scheint rechts
          // durch, bleibt aber dunkel genug fuer die Rangliste (Text hell auf dunkel).
          background: 'linear-gradient(180deg, rgba(15,23,42,0.62), rgba(13,10,6,0.62))',
          borderLeft: '2px solid rgba(236,72,153,0.2)',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
          animation: 'qqMapRankSlideIn 0.7s var(--qq-ease-out-cubic) both',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 8, overflowY: 'hidden',
        }}>
          <div style={{
            fontWeight: 900, fontSize: 'clamp(22px, 2.4cqw, 32px)',
            color: '#FBCFE8', marginBottom: 6, textAlign: 'center', letterSpacing: 0.4,
          }}>
            <QQEmojiIcon emoji="🏆"/> {lang === 'en' ? 'Closest to target' : 'Am nächsten dran'}
          </div>
          {(() => {
            // Top-5-Nächste anzeigen (Wolf 2026-07-03) — bei CozyArena schon je
            // Fraktion kollabiert (scoredEff), sonst reale Teams. Kein Bloßstellen
            // der hintersten (nur die besten 5 stehen in der Liste).
            const rankList = bestFirst.slice(0, 5);
            // Tie-Erkennung: Teams mit (gerundet) gleicher Distanz — dann entscheidet Speed.
            // Gruppen nach Distanz-Bucket (auf Anzeige-Präzision, also ganze Meter bzw. 0.1 km).
            const bucket = (km: number | null): string => {
              if (km == null) return '—';
              return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
            };
            const tieGroups: Record<string, number> = {};
            rankList.forEach(p => { const k = bucket(p.distKm); tieGroups[k] = (tieGroups[k] ?? 0) + 1; });
            const groupEarliest: Record<string, number> = {};
            rankList.forEach(p => {
              const k = bucket(p.distKm);
              const at = p.submittedAt ?? 0;
              if (groupEarliest[k] == null || at < groupEarliest[k]) groupEarliest[k] = at;
            });
            return rankList.map((p, i) => {
              const rawTeam = s.teams.find(t => t.id === p.teamId);
              if (!rawTeam) return null;
              // CozyArena: Fraktions-Identität (Tiername + Tier-slug) statt Sub-Team.
              const team = isMega
                ? { ...rawTeam, name: qqMegaFactionName(rawTeam.avatarId, lang), emoji: qqMegaFactionSlug(rawTeam.avatarId) ?? rawTeam.emoji }
                : rawTeam;
              const medal = i === 0 ? <QQEmojiIcon emoji="🥇"/> : i === 1 ? <QQEmojiIcon emoji="🥈"/> : i === 2 ? <QQEmojiIcon emoji="🥉"/> : `#${i+1}`;
              const dist = p.distKm == null ? '—' : p.distKm < 1 ? `${Math.round(p.distKm * 1000)} m` : `${p.distKm.toFixed(1)} km`;
              const isTop = i === 0;
              const key = bucket(p.distKm);
              const isTied = (tieGroups[key] ?? 0) > 1;
              const deltaMs = isTied && p.submittedAt ? p.submittedAt - (groupEarliest[key] ?? p.submittedAt) : 0;
              const timeLabel = isTied ? (deltaMs === 0 ? '⚡ zuerst' : `+${(deltaMs / 1000).toFixed(1)}s`) : null;
              return (
                <div key={p.teamId} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 16,
                  background: isTop ? `linear-gradient(90deg, ${team.color}22, ${team.color}0a)` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${isTop ? team.color + '88' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isTop ? `0 0 24px ${team.color}44` : 'none',
                  animation: `contentReveal 0.45s var(--qq-ease-pop-fast) ${0.15 + i * 0.08}s both`,
                }}>
                  <span style={{ fontSize: 'clamp(26px, 2.8cqw, 38px)', width: 52, textAlign: 'center', fontWeight: 900, fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif", color: isTop ? '#FBCFE8' : '#cbd5e1' }}>{medal}</span>
                  <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={'clamp(36px, 3.8cqw, 54px)'} />
                  <span title={team.name} style={{ flex: 1, minWidth: 0, fontWeight: 900, fontSize: 'clamp(20px, 2.2cqw, 30px)', color: team.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                  {timeLabel && (
                    <span style={{
                      fontWeight: 900, fontSize: 'clamp(14px, 1.3cqw, 18px)',
                      padding: '3px 10px', borderRadius: 'var(--qq-pill-radius)',
                      background: deltaMs === 0 ? 'rgba(250,204,21,0.18)' : 'rgba(148,163,184,0.12)',
                      color: deltaMs === 0 ? '#FBCFE8' : '#94a3b8',
                      border: `1px solid ${deltaMs === 0 ? 'rgba(250,204,21,0.4)' : 'rgba(148,163,184,0.25)'}`,
                    }}>{timeLabel}</span>
                  )}
                  <span style={{ fontWeight: 900, fontSize: 'clamp(19px, 1.9cqw, 26px)', color: isTop ? '#86efac' : '#94a3b8', fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif" }}><QQEmojiIcon emoji="📍"/> {dist}</span>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Antwort-Label unten — 2026-05-09 (Wolf 'reveal text leicht rechts
          versetzt'): pill ist jetzt im OUTER container statt im map-flex-item.
          Bei eingeblendetem Ranking-Panel (38%) bleibt die Pill mittig im
          gesamten Beamer-Viewport, nicht nur im Map-Bereich. */}
      {showTarget && q.answer && (
        <div style={{
          position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          padding: '14px 32px', borderRadius: 16,
          background: 'rgba(13,10,6,0.92)',
          border: '2.5px solid rgba(34,197,94,0.7)',
          color: '#86efac', fontWeight: 900, fontSize: 'clamp(22px, 2.8cqw, 38px)',
          boxShadow: '0 0 50px rgba(34,197,94,0.35), 0 8px 24px rgba(0,0,0,0.45)',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          textAlign: 'center',
          animation: 'revealAnswerBam 0.6s var(--qq-ease-out-cubic) both',
          zIndex: 1000, pointerEvents: 'none',
        }}>
          {formatRevealedAnswer(lang, q.answer, q.answerEn)}
        </div>
      )}
    </div>
  );
}
