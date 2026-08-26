/**
 * Die Kartenquelle — EINE Definition fuer alle Karten im Quiz.
 *
 * 2026-08-26 (Wolf, mit Bild von der CozyGuessr-Aufloesung: „ich glaube wir
 * brauchen eine neue map fuer cozyguessr"). Auf der Wand stand quer ueber die
 * ganze Karte, wieder und wieder, „API KEY REQUIRED / carto.com/basemaps/apikey".
 *
 * ── Was passiert ist ───────────────────────────────────────────────────────
 * Die Kacheln kamen von `{s}.basemaps.cartocdn.com`. Das war jahrelang ohne
 * Schluessel nutzbar; Carto verlangt inzwischen einen und schreibt den Hinweis
 * IN die ausgelieferten Bilder. Es ist also nichts im Code kaputt gegangen -
 * die Gegenseite hat ihre Bedingungen geaendert. Genau deshalb faellt so etwas
 * erst am Abend auf und nicht im Gate.
 *
 * ── Warum diese Datei ueberhaupt ───────────────────────────────────────────
 * Die Adresse stand an DREI Stellen in ZWEI Dateien, in drei verschiedenen
 * Stilen (dark_nolabels, dark_only_labels, rastertiles/voyager). Deshalb war es
 * auch kein einzelner Bildschirm, der kaputt war, sondern jede Karte im Haus -
 * und niemand konnte das an einer Stelle nachsehen. Ab jetzt: eine Quelle,
 * drei Verwendungen.
 *
 * ── Die Wahl ───────────────────────────────────────────────────────────────
 * ⚠️ Diese Auswahl ist NICHT aus der Entwicklungsumgebung heraus geprueft
 * worden: der Netzfilter dieser Umgebung laesst Kartenserver nicht durch
 * (403 auf CONNECT). Geprueft werden muss sie im Browser, an einer echten
 * CozyGuessr-Frage. Deshalb steht die Quelle als EINE Konstante hier: sollte
 * `esri-dunkel` nicht taugen, ist der Wechsel eine Zeile, kein Umbau.
 *
 * Warum Esri als Vorschlag:
 *   * dunkel, und die Buehne hat eine harte Lichtgrenze (docs/BUEHNEN_DESIGN.md,
 *     Abschnitt 7: unter 12 Prozent mittlere Leuchtdichte). Eine helle Karte
 *     reisst die allein.
 *   * Raster-Kacheln, also derselbe `TileLayer` wie bisher, kein Wechsel auf
 *     Vektor und keine neue Bibliothek.
 *   * ohne Schluessel erreichbar, seit Jahren stabil.
 *
 * ── Nennung ────────────────────────────────────────────────────────────────
 * Beide Karten liefen mit `attributionControl={false}`, also ganz ohne Nennung.
 * Das war schon bei Carto nicht sauber und ist es bei jedem freien Anbieter
 * nicht: die Nennung ist die Gegenleistung. Sie steht jetzt drin, klein und
 * unten rechts, wo sie niemanden stoert.
 */

export type QQKartenQuelleId = 'esri-dunkel' | 'esri-hell' | 'osm' | 'carto-mit-schluessel';

export interface QQKartenQuelle {
  /** Die Kacheln selbst. */
  url: string;
  /** Optionale zweite Ebene NUR mit Beschriftungen, ueber Markierungen hinweg. */
  beschriftung?: string;
  /** Pflichtnennung des Anbieters. Kurz halten, sie steht auf der Buehne. */
  nennung: string;
  /** Hoechste sinnvolle Zoomstufe dieser Quelle. */
  maxZoom: number;
  /** Kurz, warum es diese Quelle gibt - fuer den naechsten, der hier landet. */
  notiz: string;
}

export const QQ_KARTEN_QUELLEN: Record<QQKartenQuelleId, QQKartenQuelle> = {
  'esri-dunkel': {
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    beschriftung: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    nennung: 'Esri, HERE, Garmin, © OpenStreetMap',
    maxZoom: 16,
    notiz: 'Dunkel, ohne Schluessel, Raster. Vorschlag fuer die Buehne.',
  },
  'esri-hell': {
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    beschriftung: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    nennung: 'Esri, HERE, Garmin, © OpenStreetMap',
    maxZoom: 16,
    notiz: 'Hell. Fuers Handy, wo man einen Ort TRIFFT statt ihn anzuschauen.',
  },
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    nennung: '© OpenStreetMap',
    maxZoom: 19,
    notiz: 'Sicher schluessellos, aber hell und bunt. Nur als Rueckfallebene.',
  },
  'carto-mit-schluessel': {
    // Falls Wolf einen Carto-Schluessel loest: hier eintragen und die Quelle
    // unten umstellen. Der alte Look kommt damit unveraendert zurueck.
    url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png?api_key=FEHLT',
    beschriftung: 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png?api_key=FEHLT',
    nennung: '© CARTO, © OpenStreetMap',
    maxZoom: 18,
    notiz: 'Der bisherige Look. Braucht einen Schluessel, sonst Wasserzeichen.',
  },
};

/**
 * Was die BUEHNE faehrt. Eine Zeile, ein Wechsel.
 * Aendern heisst: Karte auf dem Beamer und im Steuerpult zugleich aendern.
 */
export const QQ_KARTE_BUEHNE: QQKartenQuelleId = 'esri-dunkel';

/**
 * Was das HANDY faehrt. Getrennt von der Buehne, weil die Aufgabe eine andere
 * ist: auf dem Beamer schaut der Saal auf eine Karte, auf dem Handy TIPPT
 * jemand einen Ort. Dort hilft Helligkeit, auf der Wand schadet sie.
 */
export const QQ_KARTE_HANDY: QQKartenQuelleId = 'esri-hell';

export const qqKartenQuelle = (id: QQKartenQuelleId): QQKartenQuelle => QQ_KARTEN_QUELLEN[id];
