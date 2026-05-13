// 2026-05-07 (Wolf-Brainstorm Eurovision-Watchparty): vorgefertigter Demo-Draft
// mit 15 Fragen ueber 3 Runden, alle Mechaniken (SCHAETZCHEN/MUCHO/ZehnVonZehn/
// CHEESE + BUNTE_TUETE Top5/Map/HotPotato).
// 2026-05-13 (Wolf-Eurovision-Refresh): komplett neue 15 Fragen aus KI-Spec.
// 3× CHEESE braucht Bilder (Lordi/Måneskin/Subwoolfer) und Wolf setzt
// musicMode + musicUrl pro Frage manuell — der Skeleton liefert die Frage-
// Struktur, nicht das Material.
import type { QQDraft, QQQuestion } from '../../../shared/quarterQuizTypes';
import { EUROVISION_THEME } from '../../../shared/eurovisionTheme';

export function makeEurovisionDraft(): QQDraft {
  const draftId = `qq-draft-esc-${Date.now().toString(36)}`;
  const mkId = (phase: number, idx: number, cat: string) =>
    `${draftId}-p${phase}-q${idx}-${cat}`;

  const questions: QQQuestion[] = [
    // ── Runde 1 — Klassiker (Pop-Knowledge, jeder ESC-Fan kann mit) ────────
    {
      id: mkId(1, 0, 'SCHAETZCHEN'),
      category: 'SCHAETZCHEN',
      phaseIndex: 1,
      questionIndexInPhase: 0,
      text: 'In welchem Jahr fand der allererste Eurovision Song Contest statt?',
      textEn: 'In which year did the very first Eurovision Song Contest take place?',
      answer: '1956',
      answerEn: '1956',
      targetValue: 1956,
      unit: '',
      unitEn: '',
      isYearAnswer: true,
      hostNote: 'Klassischer Opener — Lugano-Kursaal kurz antänzeln (Smoking, sieben Länder, jeder durfte zwei Songs einreichen).',
      funFact: 'Sieben Länder, Lugano, alles in Schwarz-Weiß — und Lys Assia gewann für die Schweiz mit "Refrain". Die Video-Aufzeichnung ist teilweise verschollen, nur das Audio überlebt komplett.',
      funFactEn: 'Seven countries, Lugano, all in black and white — Lys Assia won for Switzerland with "Refrain". Most of the video recording is lost; only the audio survives in full.',
    },
    {
      id: mkId(1, 1, 'MUCHO'),
      category: 'MUCHO',
      phaseIndex: 1,
      questionIndexInPhase: 1,
      text: 'In welcher Stadt fand der ESC 2024 statt?',
      textEn: 'In which city was Eurovision 2024 held?',
      answer: 'Malmö',
      answerEn: 'Malmö',
      options: ['Stockholm', 'Göteborg', 'Malmö', 'Liverpool'],
      optionsEn: ['Stockholm', 'Gothenburg', 'Malmö', 'Liverpool'],
      correctOptionIndex: 2,
      hostNote: 'Klassiker, lässt sich schnell auflösen.',
      funFact: 'Malmö war 2024 schon zum dritten Mal ESC-Gastgeber (nach 1992 und 2013). Schweden bekam den Slot, weil Loreen 2023 in Liverpool gewann.',
      funFactEn: 'Malmö hosted ESC for the third time in 2024 (after 1992 and 2013). Sweden got the slot because Loreen won in Liverpool 2023.',
    },
    {
      id: mkId(1, 2, 'ZEHN_VON_ZEHN'),
      category: 'ZEHN_VON_ZEHN',
      phaseIndex: 1,
      questionIndexInPhase: 2,
      text: 'In welchem Jahr gewann ABBA den ESC mit "Waterloo"?',
      textEn: 'In which year did ABBA win Eurovision with "Waterloo"?',
      answer: '1974',
      answerEn: '1974',
      options: ['1972', '1974', '1976'],
      optionsEn: ['1972', '1974', '1976'],
      correctOptionIndex: 1,
      hostNote: 'Falls jemand zögert: ABBA hatte vor Waterloo bereits 1973 versucht teilzunehmen — disqualifiziert in der schwedischen Vorausscheidung.',
      funFact: 'Brighton, 6. April 1974. ABBA performten in glitzernden Klamotten — und Stikkan Anderson, ihr Manager, hatte als Songwriter mit am Sieg geschrieben. Drei Jahre später waren sie die größte Band der Welt.',
      funFactEn: 'Brighton, April 6, 1974. ABBA performed in glitter outfits — and their manager Stikkan Anderson co-wrote the winning song. Three years later, they were the biggest band on the planet.',
    },
    {
      id: mkId(1, 3, 'CHEESE'),
      category: 'CHEESE',
      phaseIndex: 1,
      questionIndexInPhase: 3,
      text: 'Wer ist das?',
      textEn: 'Who is this?',
      answer: 'Lordi',
      answerEn: 'Lordi',
      hostNote: 'BILD UPLOAD NÖTIG: Bandfoto Lordi in vollen Monster-Kostümen, idealerweise Bühnenshot "Hard Rock Hallelujah" Athen 2006. Fuzzy-Match: "Lordy", "Mr Lordi" alle als Treffer akzeptieren. Sänger heißt Mr Lordi alias Tomi Putaansuu.',
      funFact: 'Lordi gewann 2006 für Finnland — der erste finnische ESC-Sieg überhaupt, nach 45 Jahren Teilnahme. Die EBU bestand zunächst darauf, die Kostüme als "reguläre Bühnenkleidung" zu deklarieren, weil Masken eigentlich verboten waren.',
      funFactEn: 'Lordi won in 2006 — Finland\'s first ESC victory ever, after 45 years of trying. The EBU initially insisted the costumes be declared "regular stagewear" because masks were technically banned.',
    },
    {
      id: mkId(1, 4, 'BUNTE_TUETE'),
      category: 'BUNTE_TUETE',
      phaseIndex: 1,
      questionIndexInPhase: 4,
      // 2026-05-13 (Wolf-Tie-Fix): vorher "Top 5", aber 6 Länder qualifizieren
      // (2× 7 Siege + 4× 5 Siege). Frage entschärft, alle 6 als gültig.
      text: 'Nenne bis zu 5 der erfolgreichsten ESC-Sieger-Nationen.',
      textEn: 'Name up to 5 of the most successful ESC-winning nations.',
      answer: 'Schweden (7), Irland (7), Luxemburg (5), Frankreich (5), Niederlande (5), Vereinigtes Königreich (5)',
      answerEn: 'Sweden (7), Ireland (7), Luxembourg (5), France (5), Netherlands (5), United Kingdom (5)',
      bunteTuete: {
        kind: 'top5',
        // 6 valide Antworten — Spieler tippen max 5, jeder Treffer in der Liste
        // zaehlt. Top-Gruppe Schweden/Irland je 7 Siege, dann gleichauf je 5 Siege
        // Luxemburg/Frankreich/Niederlande/UK.
        answers: ['Schweden', 'Irland', 'Luxemburg', 'Frankreich', 'Niederlande', 'Vereinigtes Königreich'],
        answersEn: ['Sweden', 'Ireland', 'Luxembourg', 'France', 'Netherlands', 'United Kingdom'],
      },
      hostNote: '6 valide Antworten im Pool — Schweden/Irland Spitze (7 Siege), Luxemburg/Frankreich/Niederlande/UK gleichauf (5 Siege). Spieler tippen max 5, jeder Treffer aus den 6 zählt.',
      funFact: 'Irland war 1992–94 unschlagbar — drei Siege in Folge, ein Rekord, der nie gebrochen wurde. Damals lief in Irland der Running Gag, RTÉ versuche absichtlich schlechte Beiträge zu schicken, weil die Austragungskosten den Sender ruinierten.',
      funFactEn: 'Ireland won three years in a row 1992–94 — a record that\'s never been broken. There was a running joke that RTÉ was deliberately sending bad entries because hosting was bankrupting the broadcaster.',
    },

    // ── Runde 2 — Mittel (eine spezielle Mechanik) ─────────────────────────
    {
      id: mkId(2, 0, 'SCHAETZCHEN'),
      category: 'SCHAETZCHEN',
      phaseIndex: 2,
      questionIndexInPhase: 0,
      text: 'Wie viele Sekunden darf ein ESC-Beitrag maximal lang sein?',
      textEn: 'What is the maximum length of a Eurovision entry in seconds?',
      answer: '180',
      answerEn: '180',
      targetValue: 180,
      unit: 'Sekunden',
      unitEn: 'seconds',
      hostNote: 'Tippvorlage gerne: "denkt an einen typischen Pop-Hit auf Spotify".',
      funFact: 'Drei Minuten, knallhart. Das ist EBU-Regel seit den 1960ern und gilt für JEDEN Beitrag — Sieger wie Niete. Künstler, die länger einreichen, müssen kürzen oder werden disqualifiziert.',
      funFactEn: 'Three minutes, hard limit. EBU rule since the 1960s — applies to every entry, winner or loser. Songs longer than that must be cut or get disqualified.',
    },
    {
      id: mkId(2, 1, 'MUCHO'),
      category: 'MUCHO',
      phaseIndex: 2,
      questionIndexInPhase: 1,
      text: 'Welche Sprache war 1956 beim allerersten ESC NICHT vertreten?',
      textEn: 'Which language was NOT represented at the very first ESC in 1956?',
      answer: 'Englisch',
      answerEn: 'English',
      options: ['Deutsch', 'Französisch', 'Englisch', 'Italienisch'],
      optionsEn: ['German', 'French', 'English', 'Italian'],
      correctOptionIndex: 2,
      hostNote: 'Schöne Pub-Quiz-Falle — alle tippen reflexartig "Englisch?" und liegen damit richtig.',
      funFact: 'Großbritannien war 1956 nicht dabei und stieg erst 1957 ein. Englisch tauchte beim ESC erst 1957 mit dem britischen Debüt auf — und wurde dann recht schnell zur dominierenden Wettbewerbssprache.',
      funFactEn: 'The UK didn\'t compete in 1956 and only joined in 1957. English first appeared at Eurovision with that UK debut — and pretty quickly came to dominate.',
    },
    {
      id: mkId(2, 2, 'ZEHN_VON_ZEHN'),
      category: 'ZEHN_VON_ZEHN',
      phaseIndex: 2,
      questionIndexInPhase: 2,
      // 2026-05-13 (Wolf-Drift-Fix): vorherige Frage „Wer hat meiste Siege" überlappte
      // mit Frage 5 (Top5 Länder-Siege). Ersetzt durch Punkte-Rekord-Frage —
      // andere thematische Achse, perfekte ZvZ-Risiko-Verteilung.
      text: 'Wer hielt den höchsten Punkte-Score bei einem ESC-Sieg?',
      textEn: 'Who held the highest points score at an ESC win?',
      answer: 'Salvador Sobral 2017 (758 Punkte)',
      answerEn: 'Salvador Sobral 2017 (758 points)',
      options: ['Salvador Sobral 2017', 'Måneskin 2021', 'Loreen 2023'],
      optionsEn: ['Salvador Sobral 2017', 'Måneskin 2021', 'Loreen 2023'],
      correctOptionIndex: 0,
      hostNote: 'Måneskin holten 524, Loreen 2023 hatte 583 — beide weit hinter Sobrals 758. ZvZ-Verteilung 8/1/1 oder 7/2/1 ist sehr lohnenswert wenn Team sicher ist.',
      funFact: 'Salvador performte krank kurz vor seiner Herz-Transplantation — der Sieg gilt als emotionalster ESC-Moment der 2010er Jahre. "Amar Pelos Dois" war der erste portugiesische Sieg überhaupt nach 53 Jahren Teilnahme. Seine Schwester Luisa schrieb den Song.',
      funFactEn: 'Salvador performed sick just before his heart transplant — widely seen as the most emotional ESC moment of the 2010s. "Amar Pelos Dois" was Portugal\'s first ever win, after 53 years of trying. His sister Luisa wrote the song.',
    },
    {
      id: mkId(2, 3, 'CHEESE'),
      category: 'CHEESE',
      phaseIndex: 2,
      questionIndexInPhase: 3,
      text: 'Wie hieß der Song, mit dem dieser Act den ESC gewann?',
      textEn: 'What was the name of the song this act won Eurovision with?',
      answer: 'Zitti e buoni',
      answerEn: 'Zitti e buoni',
      hostNote: 'BILD UPLOAD NÖTIG: Måneskin in Glamrock-Lederoutfits beim ESC-Sieg 2021 Rotterdam, idealerweise Bühnenshot mit Damiano vorn. Fuzzy-Match großzügig: "Zitti", "Zitti e Boni", "Zitti e Buoni", italienische Tippfehler-Toleranz.',
      funFact: 'Måneskins Sieg 2021 in Rotterdam katapultierte die Band weltweit nach vorn — "Beggin\'" wurde danach zum globalen TikTok-Hit, obwohl es nie ihr ESC-Beitrag war. Der Bandname kommt übrigens aus dem Dänischen und heißt "Mondlicht".',
      funFactEn: 'Måneskin\'s 2021 win in Rotterdam launched them globally — "Beggin\'" later became a worldwide TikTok hit, even though it wasn\'t their ESC entry. The band name is Danish for "moonlight".',
    },
    {
      id: mkId(2, 4, 'BUNTE_TUETE'),
      category: 'BUNTE_TUETE',
      phaseIndex: 2,
      questionIndexInPhase: 4,
      text: 'Wo fand der Eurovision Song Contest 2025 statt? Setze einen Pin auf die Karte.',
      textEn: 'Where was the Eurovision Song Contest 2025 held? Drop a pin on the map.',
      answer: 'St. Jakobshalle, Basel (Schweiz)',
      answerEn: 'St. Jakobshalle, Basel (Switzerland)',
      bunteTuete: {
        kind: 'map',
        lat: 47.5346,
        lng: 7.5848,
        targetLabel: 'St. Jakobshalle, Basel, Schweiz',
      },
      hostNote: 'Bei Pin in Lausanne / Zürich / Genf zumindest Schweiz anerkennen — wer "irgendwo Schweiz" getroffen hat, war nicht weit weg.',
      funFact: 'Nemo holte 2024 mit "The Code" den ersten Schweizer Sieg seit Céline Dion 1988 — und das brachte den ESC nach 36 Jahren zurück in die Schweiz, dorthin, wo 1956 alles angefangen hatte. JJ aus Österreich gewann am Ende.',
      funFactEn: 'Nemo\'s "The Code" in 2024 was Switzerland\'s first win since Céline Dion in 1988 — bringing ESC back to Switzerland 36 years later, to the country where it all started in 1956. JJ from Austria won the show.',
    },

    // ── Runde 3 — Hart (Insiderwissen + Klimax-Mechanik) ───────────────────
    {
      id: mkId(3, 0, 'SCHAETZCHEN'),
      category: 'SCHAETZCHEN',
      phaseIndex: 3,
      questionIndexInPhase: 0,
      text: 'In welchem Jahr gewann Deutschland zum letzten Mal den ESC (Lena mit "Satellite")?',
      textEn: 'In which year did Germany last win Eurovision (Lena with "Satellite")?',
      answer: '2010',
      answerEn: '2010',
      targetValue: 2010,
      unit: '',
      unitEn: '',
      isYearAnswer: true,
      hostNote: 'Nach Auflösung gerne kurz erzählen: das war Deutschlands zweiter Sieg überhaupt, nach Nicole 1982.',
      funFact: 'Lena war damals 19, wurde von Stefan Raab im Vorentscheid "Unser Star für Oslo" gecastet — und holte 246 Punkte vor laufender Kamera mit britischem Schul-Akzent.',
      funFactEn: 'Lena was 19, picked by Stefan Raab in the "Our Star for Oslo" selection show — and scored 246 points with her famously fake-British accent.',
    },
    {
      id: mkId(3, 1, 'MUCHO'),
      category: 'MUCHO',
      phaseIndex: 3,
      questionIndexInPhase: 1,
      text: 'Welche Veranstaltung war bisher der GRÖSSTE ESC-Austragungsort nach Zuschauerkapazität?',
      textEn: 'Which venue was the LARGEST ESC host venue by audience capacity?',
      answer: 'Esprit Arena Düsseldorf 2011',
      answerEn: 'Esprit Arena Düsseldorf 2011',
      options: [
        'Parken Stadium Kopenhagen 2014',
        'Esprit Arena Düsseldorf 2011',
        'Tele2 Arena Stockholm 2016',
        'Globe Arena Stockholm 2000',
      ],
      optionsEn: [
        'Parken Stadium Copenhagen 2014',
        'Esprit Arena Düsseldorf 2011',
        'Tele2 Arena Stockholm 2016',
        'Globe Arena Stockholm 2000',
      ],
      correctOptionIndex: 1,
      hostNote: 'Knifflige Frage — alle Antworten klingen plausibel. Distraktor-Stadt Stockholm doppelt drin.',
      funFact: 'Mit rund 36.000 Plätzen war Düsseldorf 2011 der größte ESC aller Zeiten — möglich gemacht durch Lenas Vorjahressieg.',
      funFactEn: 'With around 36,000 seats, Düsseldorf 2011 was the biggest ESC ever held — courtesy of Lena\'s win the year before.',
    },
    {
      id: mkId(3, 2, 'ZEHN_VON_ZEHN'),
      category: 'ZEHN_VON_ZEHN',
      phaseIndex: 3,
      questionIndexInPhase: 2,
      text: 'Welches Land hält den Rekord für die meisten letzten Plätze im ESC-Finale?',
      textEn: 'Which country holds the record for most last-place finishes in the ESC final?',
      answer: 'Norwegen',
      answerEn: 'Norway',
      options: ['Norwegen', 'Deutschland', 'Finnland'],
      optionsEn: ['Norway', 'Germany', 'Finland'],
      correctOptionIndex: 0,
      hostNote: 'Deutschland ist hier auch ein starker Distraktor (Stichwort: Ann Sophie 2015, Jamie-Lee 2016, etc.).',
      funFact: 'Norwegen hat 11 letzte Plätze auf dem Konto — Rekord. Und trotzdem haben sie dreimal gewonnen (1985, 1995, 2009). Pendel zwischen Triumph und Tristesse.',
      funFactEn: 'Norway holds the record with 11 last-place finishes — but they\'ve also won three times (1985, 1995, 2009). True ESC drama.',
    },
    {
      id: mkId(3, 3, 'CHEESE'),
      category: 'CHEESE',
      phaseIndex: 3,
      questionIndexInPhase: 3,
      text: 'Aus welchem Land kommt dieser ESC-Beitrag?',
      textEn: 'Which country is this Eurovision entry from?',
      answer: 'Norwegen',
      answerEn: 'Norway',
      hostNote: 'BILD UPLOAD NÖTIG: Subwoolfer in den gelben Wolfsmasken beim ESC 2022 Turin, Performance "Give That Wolf a Banana". Tipp falls Teams stocken: "Sie sagten, sie kämen vom Mond — kamen aber tatsächlich aus Skandinavien".',
      funFact: 'Subwoolfer gaben beim ESC 2022 nie ihre echten Identitäten preis — die Wölfe Keith und Jim behaupteten, 4,5 Milliarden Jahre alt zu sein und vom Mond zu kommen. Erst nach dem Wettbewerb wurde aufgedeckt, dass darunter zwei etablierte norwegische Popmusiker stecken.',
      funFactEn: 'Subwoolfer never revealed their real identities during ESC 2022 — the wolves Keith and Jim claimed to be 4.5 billion years old and from the moon. Only later was it confirmed they were two established Norwegian pop musicians.',
    },
    {
      id: mkId(3, 4, 'BUNTE_TUETE'),
      category: 'BUNTE_TUETE',
      phaseIndex: 3,
      questionIndexInPhase: 4,
      text: 'Hot Potato! Reihum: Nenne ein Land, das den ESC noch NIE gewonnen hat (Stand 2025). Wer keins mehr weiß, fliegt raus.',
      textEn: 'Hot Potato! Around the room: name a country that has NEVER won Eurovision (as of 2025). If you can\'t name one, you\'re out.',
      answer: 'Island, Malta, Polen, Rumänien, Slowenien, Litauen, Bulgarien, San Marino, Albanien, Tschechien, Georgien, Armenien, Belarus, Montenegro, Nordmazedonien, Bosnien, Zypern, Australien, Moldau, Andorra, Slowakei, Ungarn, Marokko',
      answerEn: 'Iceland, Malta, Poland, Romania, Slovenia, Lithuania, Bulgaria, San Marino, Albania, Czech Republic, Georgia, Armenia, Belarus, Montenegro, North Macedonia, Bosnia, Cyprus, Australia, Moldova, Andorra, Slovakia, Hungary, Morocco',
      bunteTuete: { kind: 'hotPotato' },
      hostNote: 'Achtung Stolperfalle: Norwegen (3 Siege), Israel (4 Siege), Niederlande (5 Siege) und Aserbaidschan (1 Sieg) HABEN gewonnen. Großbritannien hat 5 Siege. Wer eins davon nennt, ist raus.',
      funFact: 'Island, Malta und Zypern gelten als ewige "Bridesmaids" — Malta war zweimal Zweiter, Island einmal (Selma 1999, Yohanna 2009). Beim ESC heißt das: Tränen am Bühnenrand.',
      funFactEn: 'Iceland, Malta and Cyprus are the eternal "bridesmaids" — Malta finished 2nd twice, Iceland once (Selma 1999, Yohanna 2009). Eurovision tears at the side of the stage.',
    },
  ];

  return {
    id: draftId,
    title: '🎤 Eurovision Quiz — Watchparty Edition',
    phases: 3,
    language: 'both',
    questions,
    // 2026-05-07 (Wolf-ESC-Sidequest): Theme-Overrides die nur dieser Draft
    // nutzt. Andere Drafts ohne diese Felder sehen Standard-UI.
    // 2026-05-07: Theme-Block aus shared/eurovisionTheme.ts. Kanonische
    // Quelle — Backend mergt diesen Block beim DB-Read auch in stale
    // Drafts ein, damit Wolf nie manuell reparieren muss.
    theme: { ...EUROVISION_THEME },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// 2026-05-07 (Wolf-Hinweis): Fuer die Watchparty-Atmosphaere lade die Europa-
// Hymne (Beethovens 'Ode an die Freude' — gemeinfrei, Versionen z.B. auf
// imslp.org / archive.org) im Mod-Sound-Panel als 'lobbyWelcome'-Slot hoch.
