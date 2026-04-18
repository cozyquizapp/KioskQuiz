/**
 * QQ3DGrid — Isometric 3D grid for Quarter Quiz beamer view.
 *
 * Renders the same building types as grid-demo.html using imperative DOM
 * (the 3D box system doesn't map cleanly to React's declarative model).
 *
 * Usage:
 *   <QQ3DGrid state={qqState} animateCell={lastPlacedCell} />
 */
import { useRef, useEffect, useCallback, useState } from 'react';
import type { QQStateUpdate, QQTeam } from '../../../shared/quarterQuizTypes';
import { QQ_AVATARS } from '../../../shared/quarterQuizTypes';

// ── Team color helper ─────────────────────────────────────────────────────────
interface TeamRGB { r: number; g: number; b: number; color: string; emoji: string }

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.match(/#(..)(..)(..)/)!;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgba(t: TeamRGB, a: number): string {
  return `rgba(${t.r},${t.g},${t.b},${a})`;
}

function teamToRgb(team: QQTeam): TeamRGB {
  const { r, g, b } = hexToRgb(team.color);
  const av = QQ_AVATARS.find(a => a.id === team.avatarId);
  return { r, g, b, color: team.color, emoji: av?.emoji ?? '🏠' };
}

// ── 3D Box builder (exact copy from grid-demo.html) ──────────────────────────
function box(
  parent: HTMLElement, x: number, y: number, z: number,
  w: number, d: number, h: number,
  topColor: string, frontColor: string, rightColor: string,
  backColor: string, leftColor: string, borderColor: string,
) {
  const el = document.createElement('div');
  el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${d}px;transform-style:preserve-3d;transform:translateZ(${z}px);pointer-events:none`;

  const top = document.createElement('div');
  top.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${d}px;transform:translateZ(${h}px);background:${topColor};border:1px solid ${borderColor}`;

  const front = document.createElement('div');
  front.style.cssText = `position:absolute;left:0;bottom:0;width:${w}px;height:${h}px;transform-origin:bottom center;transform:rotateX(-90deg);background:${frontColor};border:1px solid ${borderColor}`;

  const right = document.createElement('div');
  right.style.cssText = `position:absolute;top:0;right:0;width:${h}px;height:${d}px;transform-origin:center right;transform:rotateY(90deg);background:${rightColor};border:1px solid ${borderColor}`;

  const back = document.createElement('div');
  back.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform-origin:top center;transform:rotateX(90deg);background:${backColor};border:1px solid ${borderColor}`;

  const left2 = document.createElement('div');
  left2.style.cssText = `position:absolute;top:0;left:0;width:${h}px;height:${d}px;transform-origin:center left;transform:rotateY(-90deg);background:${leftColor};border:1px solid ${borderColor}`;

  el.appendChild(top); el.appendChild(front); el.appendChild(right); el.appendChild(back); el.appendChild(left2);
  parent.appendChild(el);
  return { el, top, front, right };
}

function tbox(
  parent: HTMLElement, x: number, y: number, z: number,
  w: number, d: number, h: number, team: TeamRGB, bright = 0,
) {
  return box(parent, x, y, z, w, d, h,
    rgba(team, .90 + bright),
    rgba(team, .68 + bright * .5),
    rgba(team, .42 + bright * .3),
    rgba(team, .52 + bright * .3),
    rgba(team, .58 + bright * .4),
    rgba(team, .30),
  );
}

function addWin(face: HTMLElement, fw: number, fh: number, rows: number, cols: number) {
  const wW = Math.max(3, Math.round(fw * .13));
  const wH = Math.max(3, Math.round(fh * .12));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const gx = Math.round((fw - cols * wW) / (cols + 1));
    const gy = Math.round((fh - rows * wH) / (rows + 1));
    const w = document.createElement('div');
    w.style.cssText = `position:absolute;width:${wW}px;height:${wH}px;left:${gx + c * (wW + gx)}px;top:${gy + r * (wH + gy)}px;background:rgba(255,255,200,.28);border:1px solid rgba(255,255,200,.08);border-radius:1px;pointer-events:none`;
    face.appendChild(w);
  }
}

// ── Building types (8 unique silhouettes) ─────────────────────────────────────
const NUM_BTYPES = 8;

function buildBuilding(
  tileEl: HTMLElement, team: TeamRGB, sz: number, btypeIdx: number,
  opts: { frozen?: boolean; stuck?: boolean; joker?: boolean; stacked?: number; home?: boolean; wasSteal?: boolean } = {},
  animate = false,
) {
  // Clear old building
  Array.from(tileEl.children).forEach(ch => {
    if (!(ch as HTMLElement).classList.contains('ground')) ch.remove();
  });

  const bi = btypeIdx % NUM_BTYPES;
  let extra = (opts.stacked ?? 0) * Math.round(sz * .14);
  if (opts.joker) extra += Math.round(sz * .08);
  const hm = opts.home ? 1.2 : 1;

  let mainTop: HTMLElement | null = null;
  let mainEl: HTMLElement | null = null;
  let emojiZ = 0;

  // 0: HAUS
  if (bi === 0) {
    const w = Math.round(sz * .72), d = Math.round(sz * .68), h = Math.round(sz * .36 * hm) + extra;
    const ox = Math.round((sz - w) / 2), oy = Math.round((sz - d) / 2);
    const b = tbox(tileEl, ox, oy, 0, w, d, h, team);
    mainEl = b.el; mainTop = b.top;
    addWin(b.front, w, h, 1, 2);
    emojiZ = h;
  }
  // 1: TURM
  else if (bi === 1) {
    const w = Math.round(sz * .30), d = Math.round(sz * .30), h = Math.round(sz * .90 * hm) + extra;
    const ox = Math.round((sz - w) / 2), oy = Math.round((sz - d) / 2);
    const b = tbox(tileEl, ox, oy, 0, w, d, h, team);
    mainEl = b.el; mainTop = b.top;
    addWin(b.front, w, h, 4, 1);
    const w2 = Math.round(w * .65), d2 = Math.round(d * .65), h2 = Math.round(h * .22);
    tbox(tileEl, ox + Math.round((w - w2) / 2), oy + Math.round((d - d2) / 2), h, w2, d2, h2, team, .08);
    const w3 = Math.round(w2 * .55), d3 = Math.round(d2 * .55), h3 = Math.round(h2 * .65);
    tbox(tileEl, ox + Math.round((w - w3) / 2), oy + Math.round((d - d3) / 2), h + h2, w3, d3, h3, team, .15);
    emojiZ = h + h2 + h3;
  }
  // 2: HOCHHAUS
  else if (bi === 2) {
    const w = Math.round(sz * .50), d = Math.round(sz * .50), h = Math.round(sz * .75 * hm) + extra;
    const ox = Math.round((sz - w) / 2), oy = Math.round((sz - d) / 2);
    const b = tbox(tileEl, ox, oy, 0, w, d, h, team);
    mainEl = b.el; mainTop = b.top;
    addWin(b.front, w, h, 3, 2);
    const ah = Math.round(h * .35);
    const pole = document.createElement('div');
    pole.style.cssText = `position:absolute;left:${ox + Math.round(w / 2) - 1}px;top:${oy + Math.round(d / 2) - 1}px;width:3px;height:3px;transform-style:preserve-3d;transform:translateZ(${h}px);pointer-events:none`;
    const shaft = document.createElement('div');
    shaft.style.cssText = `position:absolute;left:0;bottom:0;width:3px;height:${ah}px;transform-origin:bottom center;transform:rotateX(-90deg);background:rgba(255,255,255,.6)`;
    pole.appendChild(shaft); tileEl.appendChild(pole);
    emojiZ = h;
  }
  // 3: LADEN
  else if (bi === 3) {
    const w = Math.round(sz * .82), d = Math.round(sz * .62), h = Math.round(sz * .18 * hm) + extra;
    const ox = Math.round((sz - w) / 2), oy = Math.round((sz - d) / 2);
    const b = tbox(tileEl, ox, oy, 0, w, d, h, team);
    mainEl = b.el; mainTop = b.top;
    const aw = w + 8, ad = Math.round(d * .38), ah = Math.max(3, Math.round(sz * .035));
    tbox(tileEl, ox - 4, oy + d - Math.round(ad * .2), Math.round(h * .55), aw, ad, ah, team, .15);
    emojiZ = h;
  }
  // 4: FABRIK
  else if (bi === 4) {
    const totalW = Math.round(sz * .78);
    const w1 = Math.round(totalW * .55), w2 = totalW - w1 + 2;
    const d = Math.round(sz * .62);
    const h1 = Math.round(sz * .52 * hm) + extra, h2 = Math.round(h1 * .50);
    const ox = Math.round((sz - totalW) / 2), oy = Math.round((sz - d) / 2);
    const b = tbox(tileEl, ox, oy, 0, w1, d, h1, team);
    mainEl = b.el; mainTop = b.top;
    addWin(b.front, w1, h1, 2, 1);
    tbox(tileEl, ox + w1 - 2, oy, 0, w2, d, h2, team, -.05);
    const cw = Math.round(w1 * .28), cd = Math.round(d * .22), ch = Math.round(h1 * .28);
    const chimX = ox + Math.round((w1 - cw) / 2), chimY = oy + Math.round((d - cd) / 2);
    tbox(tileEl, chimX, chimY, h1, cw, cd, ch, team, -.10);
    emojiZ = h1;
  }
  // 5: KIRCHE
  else if (bi === 5) {
    const w = Math.round(sz * .44), d = Math.round(sz * .60);
    const h = Math.round(sz * .30 * hm) + extra;
    const ox = Math.round((sz - w) / 2), oy = Math.round((sz - d) / 2);
    const b = tbox(tileEl, ox, oy, 0, w, d, h, team);
    mainEl = b.el; mainTop = b.top;
    const tw = Math.round(w * .50), td = Math.round(d * .38), th = Math.round(h * 1.3);
    const tox = ox + Math.round((w - tw) / 2), toy = oy + Math.round((d - td) / 2);
    tbox(tileEl, tox, toy, h, tw, td, th, team, .06);
    const sw = Math.round(tw * .55), sd = Math.round(td * .55), sh = Math.round(th * .35);
    tbox(tileEl, tox + Math.round((tw - sw) / 2), toy + Math.round((td - sd) / 2), h + th, sw, sd, sh, team, .12);
    const crossH = Math.round(sh * .80);
    const crossWrap = document.createElement('div');
    crossWrap.style.cssText = `position:absolute;left:${tox + Math.round(tw / 2) - 1}px;top:${toy + Math.round(td / 2) - 1}px;width:2px;height:2px;transform-style:preserve-3d;transform:translateZ(${h + th + sh}px);pointer-events:none`;
    const vBar = document.createElement('div');
    vBar.style.cssText = `position:absolute;left:0;bottom:0;width:3px;height:${crossH}px;transform-origin:bottom center;transform:rotateX(-90deg);background:rgba(255,255,255,.9);border-radius:1px`;
    const hBarLen = Math.round(crossH * .55);
    const hBar = document.createElement('div');
    hBar.style.cssText = `position:absolute;left:${-Math.round(hBarLen / 2) + 1}px;top:-1px;width:${hBarLen}px;height:3px;transform-style:preserve-3d;transform:translateZ(${Math.round(crossH * .6)}px);background:rgba(255,255,255,.9);border-radius:1px`;
    crossWrap.appendChild(vBar); crossWrap.appendChild(hBar); tileEl.appendChild(crossWrap);
    emojiZ = h + th + sh;
  }
  // 6: BURG
  else if (bi === 6) {
    const w = Math.round(sz * .78), d = Math.round(sz * .68);
    const h = Math.round(sz * .18 * hm) + extra;
    const ox = Math.round((sz - w) / 2), oy = Math.round((sz - d) / 2);
    const b = tbox(tileEl, ox, oy, 0, w, d, h, team);
    mainEl = b.el; mainTop = b.top;
    const tw = Math.round(w * .26), td = Math.round(d * .28), th = Math.round(h * 2.5);
    tbox(tileEl, ox, oy, 0, tw, td, th, team, .06);
    tbox(tileEl, ox + w - tw, oy, 0, tw, td, th, team, .06);
    emojiZ = th;
  }
  // 7: SILO (cylinder)
  else {
    const radius = Math.round(sz * .22), h = Math.round(sz * .52 * hm) + extra;
    const cx = Math.round(sz / 2), cy = Math.round(sz / 2);
    const segs = 16;
    const segW = Math.round(2 * Math.PI * radius / segs) + 1;
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:0;height:0;transform-style:preserve-3d;pointer-events:none`;
    for (let i = 0; i < segs; i++) {
      const angleDeg = (360 / segs) * i;
      const angleRad = angleDeg * Math.PI / 180;
      const px = Math.round(Math.sin(angleRad) * radius);
      const py = Math.round(-Math.cos(angleRad) * radius);
      const shade = .30 + .50 * Math.max(0, Math.cos((angleDeg - 210) * Math.PI / 180));
      const seg = document.createElement('div');
      seg.style.cssText = `position:absolute;left:${px - Math.round(segW / 2)}px;bottom:${-py}px;width:${segW}px;height:${h}px;transform-origin:center bottom;transform:rotateZ(${angleDeg}deg) rotateX(-90deg);background:${rgba(team, shade)}`;
      el.appendChild(seg);
    }
    const topSz = radius * 2;
    const top = document.createElement('div');
    top.style.cssText = `position:absolute;left:${-radius}px;top:${-radius}px;width:${topSz}px;height:${topSz}px;transform:translateZ(${h}px);border-radius:50%;background:radial-gradient(circle at 38% 32%, ${rgba(team, 1)} 0%, ${rgba(team, .60)} 60%, ${rgba(team, .30)} 100%);border:1px solid ${rgba(team, .40)}`;
    el.appendChild(top);
    tileEl.appendChild(el);
    mainEl = el; mainTop = top;
    emojiZ = h;
  }

  if (!mainEl) return;

  // Emoji
  const emoji = document.createElement('div');
  emoji.style.cssText = `position:absolute;left:0;top:0;width:${sz}px;height:${sz}px;transform-style:preserve-3d;transform:translateZ(${emojiZ + 4}px);display:flex;align-items:center;justify-content:center;pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.8));font-size:${Math.round(sz * .22)}px;will-change:transform,opacity`;
  if (opts.frozen) {
    emoji.innerHTML = `<span>${team.emoji}</span><span style="font-size:${Math.round(sz * .11)}px;margin-left:-1px;filter:drop-shadow(0 0 3px rgba(147,210,255,.8))">&#x2744;&#xFE0F;</span>`;
  } else if (opts.joker) {
    emoji.textContent = '\u2B50';
  } else if (opts.stuck) {
    emoji.textContent = '\uD83D\uDCCC';
  } else {
    emoji.textContent = team.emoji;
  }
  tileEl.appendChild(emoji);

  // Frozen roof
  if (opts.frozen && mainTop) {
    mainTop.style.background = 'rgba(147,210,255,.55)';
    mainTop.style.border = '2px solid rgba(147,210,255,.85)';
    mainTop.style.animation = 'qq3d-frostPulse 2.5s ease-in-out infinite';
  }
  // Joker roof
  if (opts.joker && mainTop) {
    mainTop.style.background = 'rgba(251,191,36,.60)';
    mainTop.style.border = '2px solid rgba(251,191,36,.9)';
    mainTop.style.animation = 'qq3d-jokerGlow 2s ease-in-out infinite';
  }
  // Stuck roof
  if (opts.stuck && mainTop) {
    mainTop.style.background = 'rgba(251,191,36,.45)';
    mainTop.style.border = '2px solid rgba(251,191,36,.7)';
  }

  // Animate: building slams down from above with bounce + dust ring + particles + glow + grid shake
  if (animate) {
    // ── 0. STEAL EXPLOSION: shards fly out before new building drops ──
    const stealDelay = opts.wasSteal ? 400 : 0;
    if (opts.wasSteal) {
      const shardCount = 10;
      for (let i = 0; i < shardCount; i++) {
        const shard = document.createElement('div');
        shard.className = 'qq3d-particle';
        const sSz = Math.round(sz * (.06 + Math.random() * .06));
        const angle = (360 / shardCount) * i + (Math.random() - .5) * 20;
        const rad = angle * Math.PI / 180;
        const dist = sz * (.7 + Math.random() * .6);
        const tx = Math.round(Math.cos(rad) * dist);
        const ty = Math.round(Math.sin(rad) * dist);
        const tz = Math.round(30 + Math.random() * 60);
        // Use white/grey shards for "destruction" look
        shard.style.cssText = `position:absolute;left:${Math.round(sz / 2 - sSz / 2)}px;top:${Math.round(sz / 2 - sSz / 2)}px;width:${sSz}px;height:${sSz}px;background:rgba(255,255,255,.8);border-radius:1px;transform:translateZ(${Math.round(sz * .3)}px) translate(0px,0px) rotate(0deg);opacity:1;pointer-events:none;transform-style:preserve-3d;box-shadow:0 0 8px rgba(255,200,150,.5)`;
        tileEl.appendChild(shard);
        const delay = Math.round(Math.random() * 60);
        setTimeout(() => {
          shard.style.transition = 'transform .5s cubic-bezier(.2,.8,.3,1), opacity .5s ease-out';
          shard.style.transform = `translateZ(${tz}px) translate(${tx}px,${ty}px) rotate(${Math.round(Math.random() * 360)}deg)`;
          shard.style.opacity = '0';
          setTimeout(() => { shard.remove(); }, 600);
        }, delay);
      }
      // Flash the ground red briefly for "destruction"
      const ground = tileEl.querySelector('.ground') as HTMLElement | null;
      if (ground) {
        const origBg = ground.style.background;
        ground.style.transition = 'background .1s ease-out';
        ground.style.background = 'rgba(239,68,68,.7)';
        setTimeout(() => {
          ground.style.transition = 'background .3s ease-out';
          ground.style.background = origBg;
        }, 200);
      }
    }

    // Collect all direct children of the tile that are NOT the ground / dust / particles
    const parts = Array.from(tileEl.children).filter(ch => {
      const el = ch as HTMLElement;
      return !el.classList.contains('ground') && !el.classList.contains('qq3d-dust') && !el.classList.contains('qq3d-particle') && !el.classList.contains('qq3d-glow');
    }) as HTMLElement[];

    // ── 1. DROP: fall from high up with dramatic bounce (delayed if steal) ──
    const dropFrom = Math.max(200, Math.round(sz * 3));

    parts.forEach((p, i) => {
      const origTransform = p.style.transform || '';
      p.style.transform = `translateZ(${dropFrom}px) ${origTransform}`;
      p.style.opacity = '0';
      p.style.transition = 'none';
      // Staggered: emoji (last child) drops slightly after the building body
      const partDelay = stealDelay + (i === parts.length - 1 ? 350 : 0);
      requestAnimationFrame(() => {
        setTimeout(() => {
          p.style.transition = `transform .8s cubic-bezier(.22,1.6,.36,1), opacity .25s ease-out`;
          p.style.transform = origTransform;
          p.style.opacity = '1';
        }, partDelay);
      });
    });

    // Impact timing — all effects trigger relative to when building lands
    const impactT = stealDelay + 650;

    // ── 2. GROUND FLASH: intense team-color flash on impact ──
    const ground2 = tileEl.querySelector('.ground') as HTMLElement | null;
    if (ground2) {
      const origBg = ground2.style.background;
      const origShadow = ground2.style.boxShadow;
      setTimeout(() => {
        ground2.style.transition = 'background .15s ease-out, box-shadow .15s ease-out';
        ground2.style.background = rgba(team, .85);
        ground2.style.boxShadow = `0 0 40px ${rgba(team, 1)}, 0 0 80px ${rgba(team, .7)}, 0 0 120px ${rgba(team, .3)}`;
        setTimeout(() => {
          ground2.style.transition = 'background .6s ease-out, box-shadow .6s ease-out';
          ground2.style.background = origBg;
          ground2.style.boxShadow = origShadow;
        }, 300);
      }, impactT);
    }

    // ── 3. GLOW RING: expanding light ring at impact point ──
    const glow = document.createElement('div');
    glow.className = 'qq3d-glow';
    const glowSz = Math.round(sz * 1.4);
    glow.style.cssText = `position:absolute;left:${Math.round((sz - glowSz) / 2)}px;top:${Math.round((sz - glowSz) / 2)}px;width:${glowSz}px;height:${glowSz}px;border-radius:50%;background:radial-gradient(circle,${rgba(team, .6)} 0%,${rgba(team, .3)} 30%,${rgba(team, 0)} 70%);transform:translateZ(3px) scale(.2);opacity:0;pointer-events:none;transform-style:preserve-3d`;
    tileEl.appendChild(glow);
    setTimeout(() => {
      glow.style.transition = 'transform .6s ease-out, opacity .6s ease-out';
      glow.style.transform = 'translateZ(3px) scale(2.5)';
      glow.style.opacity = '1';
      setTimeout(() => { glow.style.opacity = '0'; }, 200);
      setTimeout(() => { glow.remove(); }, 800);
    }, impactT - 30);

    // ── 4. DUST RING: larger expanding disc ──
    const dust = document.createElement('div');
    dust.className = 'qq3d-dust';
    const dustSz = Math.round(sz * 1.1);
    dust.style.cssText = `position:absolute;left:${Math.round((sz - dustSz) / 2)}px;top:${Math.round((sz - dustSz) / 2)}px;width:${dustSz}px;height:${dustSz}px;border-radius:50%;border:3px solid ${rgba(team, .9)};background:radial-gradient(circle,${rgba(team, .5)} 0%,${rgba(team, .15)} 40%,${rgba(team, 0)} 70%);transform:translateZ(2px) scale(.1);opacity:0;pointer-events:none;transform-style:preserve-3d`;
    tileEl.appendChild(dust);
    setTimeout(() => {
      dust.style.transition = 'transform .7s ease-out, opacity .7s ease-out';
      dust.style.transform = 'translateZ(2px) scale(2.2)';
      dust.style.opacity = '1';
      setTimeout(() => { dust.style.opacity = '0'; }, 300);
      setTimeout(() => { dust.remove(); }, 900);
    }, impactT - 10);

    // ── 5. PARTICLES: debris flying outward on impact ──
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = 'qq3d-particle';
      const pSz = Math.round(sz * (.04 + Math.random() * .04));
      const angle = (360 / particleCount) * i + (Math.random() - .5) * 25;
      const rad = angle * Math.PI / 180;
      const dist = sz * (.6 + Math.random() * .5);
      const tx = Math.round(Math.cos(rad) * dist);
      const ty = Math.round(Math.sin(rad) * dist);
      const tz = Math.round(20 + Math.random() * 40);
      p.style.cssText = `position:absolute;left:${Math.round(sz / 2 - pSz / 2)}px;top:${Math.round(sz / 2 - pSz / 2)}px;width:${pSz}px;height:${pSz}px;background:${rgba(team, .9)};border-radius:1px;transform:translateZ(${Math.round(sz * .2)}px) translate(0px,0px);opacity:1;pointer-events:none;transform-style:preserve-3d;box-shadow:0 0 6px ${rgba(team, .6)}`;
      tileEl.appendChild(p);
      const pDelay = impactT + Math.round(Math.random() * 80);
      setTimeout(() => {
        p.style.transition = 'transform .6s cubic-bezier(.2,.8,.3,1), opacity .6s ease-out';
        p.style.transform = `translateZ(${tz}px) translate(${tx}px,${ty}px)`;
        p.style.opacity = '0';
        setTimeout(() => { p.remove(); }, 700);
      }, pDelay);
    }

    // ── 6. GRID SHAKE: whole grid shakes on impact (not just tile) ──
    setTimeout(() => {
      tileEl.style.animation = 'qq3d-impactShake .4s ease-out';
      setTimeout(() => { tileEl.style.animation = ''; }, 450);
      // Also shake the parent grid for a heavier feel
      const gridEl = tileEl.parentElement;
      if (gridEl) {
        gridEl.style.animation = 'qq3d-gridShake .5s ease-out';
        setTimeout(() => { gridEl.style.animation = ''; }, 550);
      }
    }, impactT);
  }
}

// ── Stable building type per cell (deterministic from row+col) ────────────────
function cellBtype(row: number, col: number, gridSize: number): number {
  // Simple hash so same cell always gets same building
  return ((row * 7 + col * 13 + row * col * 3) % NUM_BTYPES + NUM_BTYPES) % NUM_BTYPES;
}

// ── CSS keyframes (injected once) ─────────────────────────────────────────────
const QQ3D_CSS = `
@keyframes qq3d-frostPulse{0%,100%{box-shadow:0 0 6px rgba(147,210,255,.4)}50%{box-shadow:0 0 16px rgba(147,210,255,.8)}}
@keyframes qq3d-jokerGlow{0%,100%{box-shadow:0 0 8px rgba(251,191,36,.5)}50%{box-shadow:0 0 22px rgba(251,191,36,.9)}}
@keyframes qq3d-gridEnter{0%{transform:scale(var(--zoom,1)) rotateX(0deg) rotateZ(0deg)}100%{transform:scale(var(--zoom,1)) rotateX(var(--rx,55deg)) rotateZ(var(--rz,-45deg))}}
@keyframes qq3d-impactShake{0%{transform:translate(0,0)}15%{transform:translate(-3px,2px)}30%{transform:translate(3px,-2px)}45%{transform:translate(-2px,1px)}60%{transform:translate(2px,-1px)}80%{transform:translate(-1px,0)}100%{transform:translate(0,0)}}
@keyframes qq3d-gridShake{0%{transform:scale(var(--zoom,1)) rotateX(var(--rx,55deg)) rotateZ(var(--rz,-45deg)) translate3d(0,0,0)}15%{transform:scale(var(--zoom,1)) rotateX(var(--rx,55deg)) rotateZ(var(--rz,-45deg)) translate3d(-4px,2px,0)}30%{transform:scale(var(--zoom,1)) rotateX(var(--rx,55deg)) rotateZ(var(--rz,-45deg)) translate3d(4px,-3px,0)}50%{transform:scale(var(--zoom,1)) rotateX(var(--rx,55deg)) rotateZ(var(--rz,-45deg)) translate3d(-3px,1px,0)}70%{transform:scale(var(--zoom,1)) rotateX(var(--rx,55deg)) rotateZ(var(--rz,-45deg)) translate3d(2px,-1px,0)}100%{transform:scale(var(--zoom,1)) rotateX(var(--rx,55deg)) rotateZ(var(--rz,-45deg)) translate3d(0,0,0)}}
`;

// ── Component ─────────────────────────────────────────────────────────────────
interface QQ3DGridProps {
  state: QQStateUpdate;
  maxSize?: number;
  /** Cell to animate (building grows from ground) */
  animateCell?: { row: number; col: number; teamId: string; wasSteal?: boolean } | null;
  /** Enable drag-to-rotate and scroll-to-zoom */
  interactive?: boolean;
  /** Callback when transition from 2D→3D finishes */
  onTransitionDone?: () => void;
  /** When true, grid starts flat (top-down) and animates to isometric — the "Fahrt" */
  entering?: boolean;
  /** Incrementing counter — each change triggers a quick cinematic flyover (~3s orbit) */
  flyoverSignal?: number;
}

export function QQ3DGrid({ state, maxSize = 600, animateCell, interactive = false, onTransitionDone, entering = false, flyoverSignal = 0 }: QQ3DGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const injectedCss = useRef(false);
  // Track last animated cell so we only play slam-down ONCE per new placement.
  // Subsequent re-renders (score updates, flyover, etc.) must not retrigger.
  const lastAnimatedKey = useRef<string | null>(null);
  // When entering, start flat (rx=0, rz=0) and animate to isometric
  const [rx, setRx] = useState(entering ? 0 : 55);
  const [rz, setRz] = useState(entering ? 0 : -45);
  const [zoom, setZoom] = useState(1);

  // "Fahrt" animation: flat → isometric
  useEffect(() => {
    if (!entering) return;
    // Start flat, then after a brief moment animate to isometric
    const t = setTimeout(() => {
      setRx(55);
      setRz(-45);
    }, 80);
    return () => clearTimeout(t);
  }, [entering]);

  // Flyover: dramatic cinematic orbit — zoom in, low-angle 270° dolly, then pull back up. ~9.8s total.
  const prevFlySig = useRef(flyoverSignal);
  const flyoverTransitionRef = useRef<string | null>(null);
  const flyoverBaseZoomRef = useRef<number>(1);
  useEffect(() => {
    if (flyoverSignal === prevFlySig.current) return;
    prevFlySig.current = flyoverSignal;
    const grid = gridRef.current;
    if (!grid) return;

    // Remember base transition + zoom to restore later.
    // Only capture zoom the first time or if no flyover is currently running,
    // so re-triggering mid-flyover doesn't save the already-zoomed value.
    if (flyoverTransitionRef.current === null) {
      flyoverTransitionRef.current = grid.style.transition;
      flyoverBaseZoomRef.current = zoom;
    }

    // Smoother flyover: one continuous motion with matched easings at the seams.
    // Total: 2.2s dive + 3.8s orbit + 3.0s rise = 9.0s. No linear segment, no snap at end.
    // Winkel-Plan: rz startet bei -45 (≡ 315), geht über -45+360=315° nach oben
    // und landet bei -45+720 = 675° (≡ 315°). Kein sichtbarer Snap nötig.
    const baseRz = -45;

    // Phase 1 (0 → 2.2s): dive — tiefer Winkel, dichter ran. easeOut für weiches Ankommen.
    grid.style.transition = 'transform 2.2s cubic-bezier(.33,.0,.2,1)';
    setRx(18);
    setRz(baseRz + 30);
    setZoom(flyoverBaseZoomRef.current * 1.55);

    // Phase 2 (2.2s → 6.0s): 300° Orbit am Boden. easeInOut, damit der Übergang
    // aus Phase 1 nahtlos weitergeht und Phase 3 nahtlos übernimmt.
    const t2 = setTimeout(() => {
      if (!gridRef.current) return;
      gridRef.current.style.transition = 'transform 3.8s cubic-bezier(.4,.0,.6,1)';
      setRz(baseRz + 30 + 300);
    }, 2200);

    // Phase 3 (6.0s → 9.0s): ascend — hoch + weit, zurück zur Ausgangs-Zoom-Stufe.
    // Letzte Drehung auf baseRz + 720 (≡ 315° ≡ -45°) — landet exakt bei Ausgangs-Rotation.
    const t3 = setTimeout(() => {
      if (!gridRef.current) return;
      gridRef.current.style.transition = 'transform 3s cubic-bezier(.33,.0,.2,1)';
      setRx(55);
      setRz(baseRz + 720);
      setZoom(flyoverBaseZoomRef.current);
    }, 6000);

    // Phase 4 (nach Ende der Bewegung): rz-Wert stillschweigend auf -45 normalisieren
    // (720 → 0 Umdrehungen), ohne sichtbaren Sprung, da visuell identische Orientierung.
    const t4 = setTimeout(() => {
      if (!gridRef.current) return;
      gridRef.current.style.transition = 'none';
      setRz(baseRz);
      requestAnimationFrame(() => {
        if (gridRef.current && flyoverTransitionRef.current !== null) {
          gridRef.current.style.transition = flyoverTransitionRef.current;
          flyoverTransitionRef.current = null;
        }
      });
    }, 9100);

    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [flyoverSignal]);

  // Inject CSS once
  useEffect(() => {
    if (injectedCss.current) return;
    injectedCss.current = true;
    const style = document.createElement('style');
    style.textContent = QQ3D_CSS;
    document.head.appendChild(style);
    return () => { style.remove(); injectedCss.current = false; };
  }, []);

  // Reset slam-down tracking when the question changes (so the next placement animates fresh)
  useEffect(() => {
    lastAnimatedKey.current = null;
  }, [state.questionIndex]);

  // Team lookup
  const teamMap = useRef(new Map<string, TeamRGB>());
  useEffect(() => {
    const m = new Map<string, TeamRGB>();
    for (const t of state.teams) m.set(t.id, teamToRgb(t));
    teamMap.current = m;
  }, [state.teams]);

  // Render grid
  const renderGrid = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.innerHTML = '';

    const gs = state.gridSize;
    const gap = 4;
    const cellSize = Math.floor((maxSize - (gs - 1) * gap) / gs);

    grid.style.cssText = `display:grid;gap:${gap}px;grid-template-columns:repeat(${gs},${cellSize}px);grid-template-rows:repeat(${gs},${cellSize}px);transform-style:preserve-3d;transform:scale(var(--zoom,1)) rotateX(var(--rx,55deg)) rotateZ(var(--rz,-45deg));transition:transform 1.2s cubic-bezier(.25,.46,.45,.94)`;

    // Helper: prüft, ob Nachbar-Zelle demselben Team gehört (für Territorium-Fusion)
    const sameOwner = (rr: number, cc: number, tid: string): boolean => {
      const other = state.grid[rr]?.[cc];
      return !!other && other.ownerId === tid;
    };

    for (let r = 0; r < gs; r++) {
      for (let c = 0; c < gs; c++) {
        const cell = state.grid[r]?.[c];
        const tile = document.createElement('div');
        tile.style.cssText = `position:relative;width:${cellSize}px;height:${cellSize}px;transform-style:preserve-3d`;
        tile.dataset.r = String(r);
        tile.dataset.c = String(c);

        const ground = document.createElement('div');
        ground.className = 'ground';

        if (cell?.ownerId) {
          const team = teamMap.current.get(cell.ownerId);
          if (team) {
            const tid = cell.ownerId;
            // Nachbar-Check: welche Kanten sollen verschmelzen?
            const nTop    = sameOwner(r - 1, c, tid);
            const nRight  = sameOwner(r, c + 1, tid);
            const nBottom = sameOwner(r + 1, c, tid);
            const nLeft   = sameOwner(r, c - 1, tid);
            // Ecken runden nur, wo KEINE benachbarte Kante fusioniert
            const rTL = (nTop    || nLeft ) ? 0 : 6;
            const rTR = (nTop    || nRight) ? 0 : 6;
            const rBR = (nBottom || nRight) ? 0 : 6;
            const rBL = (nBottom || nLeft ) ? 0 : 6;
            const edge = `1.5px solid ${rgba(team, .55)}`;
            ground.style.cssText = `
              position:absolute;left:0;top:0;width:100%;height:100%;
              border-radius:${rTL}px ${rTR}px ${rBR}px ${rBL}px;
              background:linear-gradient(135deg, ${rgba(team, .34)}, ${rgba(team, .16)});
              border-top:${nTop    ? 'none' : edge};
              border-right:${nRight ? 'none' : edge};
              border-bottom:${nBottom ? 'none' : edge};
              border-left:${nLeft  ? 'none' : edge};
              box-shadow:0 0 14px ${rgba(team, .30)}, inset 0 1px 0 ${rgba(team, .35)};
            `.replace(/\s+/g, ' ');
            tile.appendChild(ground);

            // Bridges: füllen die Grid-Gap zu gleichfarbigen Nachbarn, damit das
            // Territorium als eine zusammenhängende Region wirkt (rechts + unten
            // genügen, die gegenüberliegende Seite deckt der Nachbar selbst ab).
            const bridgeBg = rgba(team, .24);
            if (nRight) {
              const b = document.createElement('div');
              b.style.cssText = `position:absolute;right:${-gap - 1}px;top:0;width:${gap + 2}px;height:100%;background:${bridgeBg};border-top:${edge};border-bottom:${edge};z-index:1`;
              tile.appendChild(b);
            }
            if (nBottom) {
              const b = document.createElement('div');
              b.style.cssText = `position:absolute;bottom:${-gap - 1}px;left:0;height:${gap + 2}px;width:100%;background:${bridgeBg};border-left:${edge};border-right:${edge};z-index:1`;
              tile.appendChild(b);
            }

            const animKey = animateCell ? `${animateCell.row}-${animateCell.col}-${animateCell.teamId}` : null;
            const isTargetCell = animateCell?.row === r && animateCell?.col === c;
            const shouldAnimate = isTargetCell && animKey !== null && animKey !== lastAnimatedKey.current;
            const btype = cellBtype(r, c, gs);
            buildBuilding(tile, team, cellSize, btype, {
              frozen: cell.frozen,
              stuck: cell.stuck,
              joker: cell.jokerFormed,
              wasSteal: animateCell?.wasSteal,
            }, shouldAnimate);
            if (shouldAnimate) lastAnimatedKey.current = animKey;
          } else {
            ground.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;border-radius:6px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05)';
            tile.appendChild(ground);
          }
        } else {
          // Leerer Slot: eingesenkte Kachel mit dezentem Checker-Pattern (hell/dunkel).
          const darker = ((r + c) % 2 === 0);
          const slotBg = darker ? 'rgba(255,255,255,.015)' : 'rgba(255,255,255,.05)';
          ground.style.cssText = `position:absolute;left:0;top:0;width:100%;height:100%;border-radius:6px;background:${slotBg};border:1px solid rgba(255,255,255,.06);box-shadow:inset 0 2px 5px rgba(0,0,0,.35), inset 0 -1px 0 rgba(255,255,255,.04)`;
          tile.appendChild(ground);
        }

        grid.appendChild(tile);
      }
    }
  }, [state.grid, state.gridSize, state.teams, maxSize, animateCell]);

  useEffect(() => {
    renderGrid();
  }, [renderGrid]);

  // Apply transform vars
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.style.setProperty('--rx', rx + 'deg');
    grid.style.setProperty('--rz', rz + 'deg');
    grid.style.setProperty('--zoom', String(zoom));
  }, [rx, rz, zoom]);

  // Refs for drag state (avoids re-registering listeners on every state change)
  const rxRef = useRef(rx);
  const rzRef = useRef(rz);
  useEffect(() => { rxRef.current = rx; }, [rx]);
  useEffect(() => { rzRef.current = rz; }, [rz]);

  // Interactive: drag to rotate + wheel to zoom
  useEffect(() => {
    if (!interactive) return;
    const scene = containerRef.current;
    if (!scene) return;

    let dragging = false, startX = 0, startY = 0, startRx = 0, startRz = 0, didDrag = false;

    const onDown = (e: MouseEvent) => {
      dragging = true; didDrag = false;
      startX = e.clientX; startY = e.clientY;
      startRx = rxRef.current; startRz = rzRef.current;
      scene.style.cursor = 'grabbing';
      e.preventDefault();
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true;
      const newRz = startRz + dx * .4;
      const newRx = Math.max(15, Math.min(75, startRx - dy * .3));
      setRz(newRz); setRx(newRx);
    };
    const onUp = () => { dragging = false; scene.style.cursor = 'grab'; };
    const onClick = (e: MouseEvent) => { if (didDrag) { e.stopPropagation(); didDrag = false; } };
    const onDbl = (e: MouseEvent) => { setRx(55); setRz(-45); setZoom(1); e.preventDefault(); };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.max(.4, Math.min(2.5, z + (e.deltaY > 0 ? -.08 : .08))));
    };

    scene.style.cursor = 'grab';
    scene.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    scene.addEventListener('click', onClick, true);
    scene.addEventListener('dblclick', onDbl);
    scene.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      scene.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      scene.removeEventListener('click', onClick, true);
      scene.removeEventListener('dblclick', onDbl);
      scene.removeEventListener('wheel', onWheel);
    };
  }, [interactive]);

  return (
    <div
      ref={containerRef}
      style={{
        perspective: '800px',
        perspectiveOrigin: '50% 35%',
        padding: '10px 0',
        userSelect: 'none',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div ref={gridRef} />
    </div>
  );
}
