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
  opts: { frozen?: boolean; stuck?: boolean; joker?: boolean; stacked?: number; home?: boolean } = {},
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

  // Animate: building slams down from above with bounce + dust ring + shake
  if (animate) {
    // Collect all direct children of the tile that are NOT the ground (the building + emoji)
    const parts = Array.from(tileEl.children).filter(ch => {
      const el = ch as HTMLElement;
      return !el.classList.contains('ground') && !el.classList.contains('qq3d-dust');
    }) as HTMLElement[];

    // Drop height: fall from way up
    const dropFrom = Math.max(120, Math.round(sz * 1.8));

    parts.forEach((p, i) => {
      const origTransform = p.style.transform || '';
      p.style.transform = `translateZ(${dropFrom}px) ${origTransform}`;
      p.style.opacity = '0';
      p.style.transition = 'none';
      // Staggered: emoji (last child) drops slightly after the building body
      const delay = i === parts.length - 1 ? 280 : 0;
      requestAnimationFrame(() => {
        setTimeout(() => {
          p.style.transition = `transform .55s cubic-bezier(.34,1.8,.5,1), opacity .2s ease-out`;
          p.style.transform = origTransform;
          p.style.opacity = '1';
        }, delay);
      });
    });

    // Ground flash
    const ground = tileEl.querySelector('.ground') as HTMLElement | null;
    if (ground) {
      const origBg = ground.style.background;
      const origShadow = ground.style.boxShadow;
      ground.style.transition = 'background .4s ease-out, box-shadow .4s ease-out';
      setTimeout(() => {
        ground.style.background = rgba(team, .65);
        ground.style.boxShadow = `0 0 30px ${rgba(team, .9)}, 0 0 60px ${rgba(team, .5)}`;
        setTimeout(() => {
          ground.style.background = origBg;
          ground.style.boxShadow = origShadow;
        }, 420);
      }, 520);
    }

    // Dust ring — expanding flat disc at impact
    const dust = document.createElement('div');
    dust.className = 'qq3d-dust';
    const dustSz = Math.round(sz * .9);
    dust.style.cssText = `position:absolute;left:${Math.round((sz - dustSz) / 2)}px;top:${Math.round((sz - dustSz) / 2)}px;width:${dustSz}px;height:${dustSz}px;border-radius:50%;border:3px solid ${rgba(team, .9)};background:radial-gradient(circle,${rgba(team, .4)} 0%,${rgba(team, 0)} 70%);transform:translateZ(2px) scale(.1);opacity:0;pointer-events:none;transform-style:preserve-3d`;
    tileEl.appendChild(dust);
    setTimeout(() => {
      dust.style.transition = 'transform .55s ease-out, opacity .55s ease-out';
      dust.style.transform = 'translateZ(2px) scale(1.6)';
      dust.style.opacity = '1';
      requestAnimationFrame(() => {
        setTimeout(() => { dust.style.opacity = '0'; }, 250);
        setTimeout(() => { dust.remove(); }, 700);
      });
    }, 500);

    // Tile shake on impact
    setTimeout(() => {
      tileEl.style.animation = 'qq3d-impactShake .35s ease-out';
      setTimeout(() => { tileEl.style.animation = ''; }, 400);
    }, 520);
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
@keyframes qq3d-impactShake{0%{transform:translate(0,0)}20%{transform:translate(-2px,1px)}40%{transform:translate(2px,-1px)}60%{transform:translate(-1px,1px)}80%{transform:translate(1px,0)}100%{transform:translate(0,0)}}
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

  // Flyover: slow cinematic orbit — low tilt sweep then rise back up. ~7s total.
  const prevFlySig = useRef(flyoverSignal);
  const flyoverTransitionRef = useRef<string | null>(null);
  useEffect(() => {
    if (flyoverSignal === prevFlySig.current) return;
    prevFlySig.current = flyoverSignal;
    const grid = gridRef.current;
    if (!grid) return;

    // Remember the base transition to restore later
    if (flyoverTransitionRef.current === null) {
      flyoverTransitionRef.current = grid.style.transition;
    }

    // Phase 1 (0 → 3.2s): swoop down to low angle + orbit halfway around
    grid.style.transition = 'transform 3.2s cubic-bezier(.45,.05,.55,.95)';
    setRx(28);
    setRz(-45 + 200); // ~200° sweep, not a full spin

    // Phase 2 (3.2s → 6.8s): rise up and complete the orbit back to default
    const t2 = setTimeout(() => {
      if (!gridRef.current) return;
      gridRef.current.style.transition = 'transform 3.6s cubic-bezier(.4,.0,.2,1)';
      setRx(55);
      setRz(-45 + 360); // complete the circle
    }, 3200);

    // Phase 3: snap rz back to -45 (equivalent to 315°) without visible movement + restore base transition
    const t3 = setTimeout(() => {
      if (!gridRef.current) return;
      gridRef.current.style.transition = 'none';
      setRz(-45);
      // restore base transition next frame
      requestAnimationFrame(() => {
        if (gridRef.current && flyoverTransitionRef.current !== null) {
          gridRef.current.style.transition = flyoverTransitionRef.current;
        }
      });
    }, 6850);

    return () => { clearTimeout(t2); clearTimeout(t3); };
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
            ground.style.cssText = `width:100%;height:100%;border-radius:3px;background:${rgba(team, .15)};border:1px solid ${rgba(team, .35)};box-shadow:0 0 10px ${rgba(team, .20)}`;
            tile.appendChild(ground);

            const animKey = animateCell ? `${animateCell.row}-${animateCell.col}-${animateCell.teamId}` : null;
            const isTargetCell = animateCell?.row === r && animateCell?.col === c;
            const shouldAnimate = isTargetCell && animKey !== null && animKey !== lastAnimatedKey.current;
            const btype = cellBtype(r, c, gs);
            buildBuilding(tile, team, cellSize, btype, {
              frozen: cell.frozen,
              stuck: cell.stuck,
              joker: cell.jokerFormed,
            }, shouldAnimate);
            if (shouldAnimate) lastAnimatedKey.current = animKey;
          } else {
            ground.style.cssText = 'width:100%;height:100%;border-radius:3px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05)';
            tile.appendChild(ground);
          }
        } else {
          ground.style.cssText = 'width:100%;height:100%;border-radius:3px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05)';
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
