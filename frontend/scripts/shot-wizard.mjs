// Echter /moderator-test Wizard-Durchlauf → Screenshots nach design-vorschau/.
// Start: node scripts/shot-wizard.mjs   (aus dem frontend/-Ordner, Vite auf 5173)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = 'C:/Users/hornu/Desktop/für claude/design-vorschau';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5173/moderator-test';

const shot = async (page, name) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
};

// Klick per sichtbarem Text (erste Übereinstimmung)
const clickText = async (page, text, opts = {}) => {
  const el = page.getByText(text, { exact: false }).first();
  await el.waitFor({ state: 'visible', timeout: opts.timeout ?? 4000 });
  await el.click();
  await page.waitForTimeout(opts.wait ?? 350);
};

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1760, height: 990 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { sessionStorage.setItem('qq_admin_pin', '2506'); } catch {}
  });
  page.on('console', m => { if (m.type() === 'error') console.log('PAGE-ERR', m.text().slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {})); // Format-Wechsel-Confirm bestätigen

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // PIN-Gate „Staff-Bereich" → PIN 2506 eintippen + Weiter
  const pin = page.getByPlaceholder(/PIN/i).first();
  if (await pin.count() && await pin.isVisible().catch(() => false)) {
    await pin.fill('2506');
    await page.getByRole('button', { name: /Weiter/ }).first().click();
    await page.waitForTimeout(1600);
  }

  // Falls Cockpit (setupDone=true aus altem RAM-Raum): „⚙ Ändern" oeffnet den Wizard.
  const aendern = page.getByRole('button', { name: /Ändern/ }).first();
  if (await aendern.count() && await aendern.isVisible().catch(() => false)) {
    await aendern.click();
    // Warten bis der Wizard wirklich offen ist (Fusszeile „Schritt N von 7")
    await page.getByText(/Schritt .* von 7/).first().waitFor({ state: 'visible', timeout: 6000 });
    await page.waitForTimeout(400);
  }

  // ── ARENA-Pfad ──
  // Step 1 Format
  await shot(page, 'wizard-1-format');
  // CozyArena wählen → auto-advance zu Look
  await clickText(page, 'CozyArena', { wait: 700 });
  await shot(page, 'wizard-2-look-arena');
  // Tabs durchklicken
  await clickText(page, 'Fragensatz', { wait: 500 });
  await shot(page, 'wizard-3-fragensatz');
  await clickText(page, 'Runden & Ablauf', { wait: 500 });
  await shot(page, 'wizard-4-runden');
  await clickText(page, 'Timer & Sprache', { wait: 500 });
  await shot(page, 'wizard-5-timer-sprache');
  await clickText(page, 'Extras', { wait: 500 });
  await shot(page, 'wizard-6-extras');
  await clickText(page, 'Bereit', { wait: 500 });
  await shot(page, 'wizard-7-bereit');

  // ── CozyQuiz-Look-Variante ──
  await clickText(page, 'Format', { wait: 500 }); // Tab zurück zu Format
  await clickText(page, 'CozyQuiz', { wait: 700 });
  await shot(page, 'wizard-2-look-cozyquiz');

  await browser.close();
  console.log('done');
};

run().catch(e => { console.error(e); process.exit(1); });
