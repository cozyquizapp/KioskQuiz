/**
 * Die Uebergabe der Sieger-Marke von der Kroenung auf die Danke-Folie.
 *
 * 2026-08-25. Aufgenommen mit `scripts/danke-uebergang.mjs`: bei 9 ms steht die
 * Siegerfolie, bei 161 ms ist die Buehne LEER, und erst ab 641 ms baut sich das
 * Danke Stueck fuer Stueck auf. Rund eine halbe Sekunde Schwarz auf 2,8 Metern,
 * und zwar an der Naht zwischen dem groessten Moment des Abends und dem letzten
 * Bild. Genau das benennt Baustein B2 in docs/MOTION_REFERENZEN.md: nie ein
 * leeres Bild, die alte Szene geht sichtbar ab.
 *
 * Die Loesung ist dieselbe wie beim Brett, das in den Turm faehrt
 * (`qqBrettUebergabe.ts`): der Gegenstand, um den es geht, ueberlebt den
 * Wechsel. Die Kroenung merkt sich, wo ihre Marke steht, die Danke-Folie faehrt
 * sie von dort an ihren neuen Platz. Ein Objekt, eine Bewegung, kein Schnitt.
 *
 * Warum ein Modul und keine Prop: die beiden Folien sind zwei verschiedene
 * PHASEN. Zwischen FINAL_REVEAL und THANKS wird der ganze Teilbaum ausgetauscht,
 * es gibt keinen gemeinsamen Elternteil, durch den man etwas durchreichen
 * koennte.
 *
 * Gemerkt werden BRUCHTEILE der Buehne, keine Bildpunkte: der Beamer skaliert
 * die feste 1760x990-Flaeche per Transform (1.09 auf 1080p, 2.18 auf 4K).
 * Pixelwerte waeren auf jedem zweiten Geraet falsch.
 */
export type SiegerQuelle = {
  /** Mittelpunkt und Groesse der Marke, als Anteil der Buehnenbreite/-hoehe. */
  x: number; y: number; groesse: number;
  teamId: string;
  zeit: number;
};

let quelle: SiegerQuelle | null = null;

export function merkeSiegerQuelle(q: Omit<SiegerQuelle, 'zeit'>): void {
  quelle = { ...q, zeit: Date.now() };
  // Sichtbar fuer die Messwerkzeuge. Sonst laesst sich von aussen nicht
  // pruefen, WAS gemerkt wurde - und genau daran haengt, ob der Flug stimmt.
  (globalThis as unknown as { __qqSiegerQuelle?: SiegerQuelle }).__qqSiegerQuelle = quelle;
}

/**
 * Die gemerkte Position, wenn sie frisch genug ist und zum selben Team gehoert.
 *
 * Das Hoechstalter ist kein Zierrat: wer die Danke-Folie direkt aufruft (Test-
 * seite, Reload, Showroom), soll KEINE Uebergabe bekommen, sondern den normalen
 * Aufbau. Eine Marke, die aus dem Nichts von einer alten Position hereinfaehrt,
 * waere schlechter als gar keine Bewegung.
 */
export function holeSiegerQuelle(teamId: string, hoechstalterMs = 12000): SiegerQuelle | null {
  if (!quelle) return null;
  if (quelle.teamId !== teamId) return null;
  if (Date.now() - quelle.zeit > hoechstalterMs) return null;
  return quelle;
}

export function vergissSiegerQuelle(): void { quelle = null; }
