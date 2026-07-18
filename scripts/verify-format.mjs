import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext();
await ctx.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked','1'); sessionStorage.setItem('qq_admin_pin','2506'); localStorage.setItem('qq-admin-pin','2506'); localStorage.setItem('qqLastFormat','arena'); } catch {} });
const p = await ctx.newPage();
p.on('console', m => { const t = m.text(); if (t.includes('[format-restore]')) console.log('  CONSOLE:', t); });
p.on('dialog', d => d.dismiss());
await p.goto('http://localhost:5173/moderator-test', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 4000));
// Format-Karte "CozyArena" aktiv? (grep aktiver Border/Shadow ist fuzzy -> lieber Konsole)
await b.close();
