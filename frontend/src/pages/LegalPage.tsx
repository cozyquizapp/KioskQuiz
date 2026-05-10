import { Link, useLocation } from 'react-router-dom';

/**
 * LegalPage — Impressum + Datenschutz für play.cozyquiz.app.
 *
 * Eine Component, zwei Inhalte (via :doc-Param). Brand-themed Layout
 * (dark BG + Brand-Pink), Mobile-First, eine Spalte max 720px.
 *
 * Stand 2026-05-10: Placeholder-Modus aktiv — Wolf hat noch kein Gewerbe
 * angemeldet, daher Klar-Name + Anschrift als `{...}`-Slots. Der Banner
 * oben kommuniziert das transparent. Sobald Gewerbe steht: Placeholder
 * austauschen (siehe Code-Kommentare unten) und PLACEHOLDER_MODE = false.
 */

const PLACEHOLDER_MODE = true;
const NAME_PLACEHOLDER = '{Vor- und Nachname folgt mit Gewerbe-Anmeldung}';
const ADDRESS_PLACEHOLDER = '{Straße Hausnummer\nPLZ Stadt — folgt mit Gewerbe-Anmeldung}';
const EMAIL = 'hallo@cozywolf.de';

const BRAND = {
  pink:    '#EC4899',
  pinkRgb: '236,72,153',
  bg:      '#0A0814',
};

export default function LegalPage() {
  const { pathname } = useLocation();
  const isImpressum = pathname.includes('impressum');

  return (
    <div style={{
      minHeight: '100vh',
      background:
        `radial-gradient(ellipse at 22% 28%, rgba(${BRAND.pinkRgb},0.18) 0%, transparent 55%),` +
        'radial-gradient(ellipse at 78% 72%, rgba(30,42,90,0.22) 0%, transparent 55%),' +
        `linear-gradient(180deg, #14101F 0%, ${BRAND.bg} 100%)`,
      color: '#e2e8f0',
      fontFamily: "'Nunito', system-ui, sans-serif",
      padding: '32px 20px 60px',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header — Back-Link */}
        <div style={{ marginBottom: 24 }}>
          <Link to="/" style={{
            color: BRAND.pink, textDecoration: 'none',
            fontSize: 14, fontWeight: 800,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>← Zurück</Link>
        </div>

        {/* Im-Aufbau-Banner */}
        {PLACEHOLDER_MODE && (
          <div style={{
            padding: '14px 18px', borderRadius: 12,
            background: `rgba(${BRAND.pinkRgb},0.08)`,
            border: `1.5px solid rgba(${BRAND.pinkRgb},0.4)`,
            marginBottom: 28,
            fontSize: 14, lineHeight: 1.5,
          }}>
            <div style={{
              fontWeight: 900, color: BRAND.pink, marginBottom: 4,
              fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>⚠️ Seite im Aufbau</div>
            <div style={{ color: '#cbd5e1' }}>
              CozyQuiz wird aktuell als Privatperson aufgebaut. Klar-Name
              und ladungsfähige Anschrift werden mit der Gewerbe-Anmeldung
              ergänzt. Bei Rückfragen: <a href={`mailto:${EMAIL}`}
              style={{ color: BRAND.pink }}>{EMAIL}</a>.
            </div>
          </div>
        )}

        {isImpressum ? <Impressum /> : <Datenschutz />}
      </div>
    </div>
  );
}

// ─── Impressum ───────────────────────────────────────────────────────────────

function Impressum() {
  return (
    <article>
      <H1>Impressum</H1>

      <H2>Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)</H2>
      <pre style={preStyle}>
        {NAME_PLACEHOLDER}{'\n'}
        {ADDRESS_PLACEHOLDER}
      </pre>

      <H2>Kontakt</H2>
      <P>E-Mail: <A href={`mailto:${EMAIL}`}>{EMAIL}</A></P>

      <H2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</H2>
      <P>{NAME_PLACEHOLDER}, Anschrift wie oben.</P>

      <H2>EU-Streitschlichtung</H2>
      <P>
        Die Europäische Kommission stellt eine Plattform zur
        Online-Streitbeilegung (OS) bereit:{' '}
        <A href="https://ec.europa.eu/consumers/odr/">
          https://ec.europa.eu/consumers/odr/
        </A>
        . Unsere E-Mail-Adresse findest du oben.
      </P>

      <H2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</H2>
      <P>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungs­verfahren
        vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </P>

      <H2>Haftung für Inhalte</H2>
      <P>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte
        auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
        §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet,
        übermittelte oder gespeicherte fremde Informationen zu überwachen oder
        nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
        hinweisen.
      </P>

      <H2>Haftung für Links</H2>
      <P>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren
        Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
        fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
        verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber
        der Seiten verantwortlich.
      </P>

      <H2>Urheberrecht</H2>
      <P>
        Die durch den Seitenbetreiber erstellten Inhalte und Werke auf
        diesen Seiten unterliegen dem deutschen Urheberrecht. Beiträge
        Dritter sind als solche gekennzeichnet.
      </P>
    </article>
  );
}

// ─── Datenschutz ─────────────────────────────────────────────────────────────

function Datenschutz() {
  const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return (
    <article>
      <H1>Datenschutzerklärung</H1>

      <P>
        Diese Erklärung informiert dich darüber, welche Daten beim Besuch
        und Spielen auf <strong>play.cozyquiz.app</strong> verarbeitet werden,
        zu welchem Zweck und auf welcher Rechtsgrundlage.
      </P>

      <H2>1. Verantwortlicher</H2>
      <pre style={preStyle}>
        {NAME_PLACEHOLDER}{'\n'}
        {ADDRESS_PLACEHOLDER}{'\n'}
        E-Mail: {EMAIL}
      </pre>

      <H2>2. Hosting (Frontend) — Vercel</H2>
      <P>
        Diese Web-App wird gehostet bei Vercel Inc., 340 S Lemon Ave #4133,
        Walnut, CA 91789, USA. Server in EU-Region (Frankfurt). Vercel ist
        nach dem EU-US Data Privacy Framework zertifiziert; ein
        Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO liegt vor.
        Beim Aufruf werden durch Vercel automatisch Logfiles erfasst
        (IP-Adresse, Datum/Uhrzeit, Browser, Referrer-URL). Speicherdauer
        max. 14 Tage. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO
        (berechtigtes Interesse am stabilen Betrieb).
      </P>

      <H2>3. Backend & Datenbank</H2>
      <P>
        Spieldaten und Feedback werden über meinen eigenen Backend-Server
        verarbeitet:
      </P>
      <Ul>
        <li><strong>Server</strong>: Hetzner Online GmbH, Industriestr. 25,
          91710 Gunzenhausen (Deutschland) — Container-Hosting via Coolify</li>
        <li><strong>Datenbank</strong>: MongoDB Atlas, EU-Region (Frankfurt) —
          AVV gemäß Art. 28 DSGVO liegt vor</li>
      </Ul>

      <H2>4. Spielteilnahme</H2>
      <P>Wenn du an einem Live-Quiz teilnimmst, werden gespeichert:</P>
      <Ul>
        <li>Team-Name (von dir gewählt — Pseudonym möglich)</li>
        <li>Avatar-Auswahl + Emoji</li>
        <li>Spielstatistiken (richtige/falsche Antworten, Felder, Punkte)</li>
        <li>Stamm-Code (zur Wiedererkennung über mehrere Spiele)</li>
      </Ul>
      <P>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung —
        Bereitstellung des Quiz-Erlebnisses). Speicherdauer: 5 Jahre nach
        letztem Spiel, danach automatische Anonymisierung. Du kannst deine
        Daten jederzeit per Mail an {EMAIL} löschen lassen.
      </P>

      <H2>5. Feedback-Formular</H2>
      <P>Bei Abgabe von Feedback nach einem Spiel werden gespeichert:</P>
      <Ul>
        <li>Dein Feedback-Text</li>
        <li>Optional: Bewertung, Lieblingskategorie, Kontakt-Adresse</li>
      </Ul>
      <P>
        Die optionale Kontakt-Adresse wird nur genutzt, um auf konkrete
        Rückfragen zu antworten. Rechtsgrundlage: Art. 6 Abs. 1 lit. a
        DSGVO (Einwilligung durch aktives Eintragen). Du kannst die Löschung
        jederzeit per Mail verlangen.
      </P>

      <H2>6. Lokaler Speicher (localStorage)</H2>
      <P>
        Wir speichern in deinem Browser ausschließlich funktionale Werte
        (Sprach-Auswahl DE/EN, Team-Reconnect-Token). Diese Informationen
        verlassen dein Gerät nicht. Rechtsgrundlage: § 25 Abs. 2 Nr. 2
        TDDDG (technisch erforderlich) — daher kein Cookie-Banner nötig.
      </P>

      <H2>7. Verlinkungen</H2>
      <P>
        Auf dieser Seite befinden sich Verlinkungen zu Instagram (Meta
        Platforms Ireland Ltd.) und externen Websites. Beim Klick verlässt
        du diese Seite — es gelten die Datenschutzerklärungen der Zielseiten.
      </P>

      <H2>8. Deine Rechte</H2>
      <P>Du hast das Recht auf:</P>
      <Ul>
        <li>Auskunft (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch (Art. 21 DSGVO)</li>
      </Ul>
      <P>Anfrage bitte an <A href={`mailto:${EMAIL}`}>{EMAIL}</A>.</P>

      <H2>9. Beschwerderecht bei der Aufsichtsbehörde</H2>
      <P>
        Du kannst dich jederzeit bei der zuständigen Aufsichtsbehörde
        beschweren:
      </P>
      <pre style={preStyle}>
        Der Hamburgische Beauftragte für{'\n'}
        Datenschutz und Informationsfreiheit{'\n'}
        Ludwig-Erhard-Str. 22, 7. OG{'\n'}
        20459 Hamburg{'\n'}
        mailbox@datenschutz.hamburg.de{'\n'}
        datenschutz-hamburg.de
      </pre>

      <H2>10. Stand</H2>
      <P>Diese Datenschutzerklärung gilt seit dem {today}.</P>
    </article>
  );
}

// ─── Style-Helpers ───────────────────────────────────────────────────────────

function H1({ children }: { children: React.ReactNode }) {
  return <h1 style={{
    fontSize: 32, fontWeight: 900, color: '#F1F5F9',
    margin: '0 0 24px', letterSpacing: '-0.01em',
  }}>{children}</h1>;
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{
    fontSize: 18, fontWeight: 900, color: BRAND.pink,
    margin: '28px 0 8px', letterSpacing: '-0.005em',
  }}>{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{
    margin: '0 0 12px', color: '#cbd5e1', lineHeight: 1.6,
    fontSize: 15, fontWeight: 500,
  }}>{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul style={{
    margin: '0 0 14px 24px', color: '#cbd5e1',
    lineHeight: 1.7, fontSize: 15, fontWeight: 500,
  }}>{children}</ul>;
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  const isExternal = href.startsWith('http');
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      style={{ color: BRAND.pink, textDecoration: 'none', fontWeight: 700 }}
    >{children}</a>
  );
}

const preStyle: React.CSSProperties = {
  margin: '0 0 14px',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid rgba(${BRAND.pinkRgb},0.18)`,
  borderRadius: 10,
  fontFamily: "'Nunito', system-ui, sans-serif",
  fontSize: 14, color: '#e2e8f0', lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
};
