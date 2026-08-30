/**
 * qqStateUpdate — der flache Zustand, den alle Clients bekommen.
 *
 * 2026-08-30. Herausgeloest aus qqRooms.ts (Stufe 2b in STRUKTUR_PLAN.md).
 * Kein Zeichen am Rumpf geaendert, nur verschoben.
 *
 * Warum ausgerechnet diese Funktion zuerst: sie ist das einzige BLATT der
 * Datei. Gemessen am 30.08.: niemand in qqRooms.ts ruft sie auf, sie selbst
 * ruft nur zwei Helfer (qqSortedTeamIds, qqFinalRevealMaxStep). Damit ist der Schnitt beweisbar folgenlos, waehrend
 * die uebrigen Gruppen (Brett, Wertung, Minispiele, Finale) sich gegenseitig
 * aufrufen und beim Trennen Kreise bilden.
 *
 * ⚠️ Der Kreis qqRooms <-> qqStateUpdate ist unvermeidlich, weil qqRooms als
 * Durchreiche bestehen bleibt (damit KEINE Import-Zeile im Projekt sich
 * aendert). Er ist hier ungefaehrlich, und zwar aus einem messbaren Grund:
 * in qqRooms.ts laufen beim Import nur zwei Zeilen ueberhaupt etwas aus
 * (`new Map()` und die Build-Kennung), und beide haengen von nichts ab.
 * Funktionsdeklarationen werden gehoisted, die Aufrufe passieren erst zur
 * Laufzeit.
 *
 * ⚠️ DIE REGEL, DIE DAS SO HAELT: keine Zeile auf Modul-Ebene, die beim
 * Import etwas ausfuehrt UND auf ein anderes Modul zugreift. Wer das
 * einfuehrt, macht aus einem harmlosen Kreis einen Absturz beim Start.
 *
 * ⚠️ Und die Falle aus CLAUDE.md gilt hier weiter: ein neues Feld im Zustand
 * muss HIER eingetragen werden, sonst kommt es am Beamer nie an. Die Datei
 * hat nur den Namen gewechselt, nicht die Rolle.
 */
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import {
  QQ_QUESTIONS_PER_PHASE, QQ_COMEBACK_HL_TIMER_DEFAULT_SEC,
  QQ_CONNECTIONS_TIMER_DEFAULT_SEC, QQ_CONNECTIONS_MAX_FAILS_DEFAULT,
  QQ_ONLY_CONNECT_HINT_DURATION_DEFAULT_SEC,
  QQ_BLUFF_WRITE_DURATION_DEFAULT_SEC, QQ_BLUFF_VOTE_DURATION_DEFAULT_SEC,
  getRandomDummyEmojis,
} from '../../../shared/quarterQuizTypes';
import { QQ_DEFAULT_THEME_ID, qqDefaultAvatarSetId } from '../../../shared/qqThemeIds';
import type { QQRoomState } from './qqRooms';
import { qqSortedTeamIds, qqFinalRevealMaxStep, QQ_SERVER_BUILD } from './qqRooms';

export function buildQQStateUpdate(room: QQRoomState): QQStateUpdate {
  return {
    // 2026-05-19 (Wolf 'beamer-timer +6s'): Server-Clock-Stempel pro Update.
    // Frontend (utils/serverTime.ts) rechnet daraus den Client-Offset.
    serverTime:       Date.now(),
    roomCode:         room.roomCode,
    phase:            room.phase,
    gamePhaseIndex:   room.gamePhaseIndex,
    questionIndex:    room.questionIndex,
    gridSize:         room.gridSize,
    grid:             room.grid,
    teams:            Object.values(room.teams),
    serverBuild:      QQ_SERVER_BUILD,
    // ⚠️ Diese Zahl MUSS aus derselben Funktion kommen, die den Phasenwechsel
    // ausloest (qqFinalRevealMaxStep, siehe qqAdvanceFinalReveal). Sonst ist
    // sie wieder nur eine zweite Meinung.
    finalRevealMaxStep: room.phase === 'FINAL_REVEAL' ? qqFinalRevealMaxStep(room) : undefined,
    sortedTeamIds:    qqSortedTeamIds(room),
    botsPaused:       (room as any).botsPaused ?? false,
    teamPhaseStats:   room.teamPhaseStats,
    currentQuestion:  room.currentQuestion,
    revealedAnswer:   room.revealedAnswer,
    correctTeamId:    room.correctTeamId,
    currentQuestionWinners: room._currentQuestionWinners ?? [],
    tieBreakerCandidates: room.tieBreakerCandidates ?? [],
    tieBreakerWinnerId:   room.tieBreakerWinnerId ?? null,
    tieBreaker:           (room as any).tieBreaker ?? null,
    pendingFor:       room.pendingFor,
    pendingAction:    room.pendingAction,
    comebackTeamId:   room.comebackTeamId,
    comebackAction:   room.comebackAction,
    comebackStealTargets: room.comebackStealTargets ?? [],
    comebackStealsDone:   room.comebackStealsDone ?? [],
    comebackStealPaused:  !!room._comebackStealPaused,
    comebackHL:           room.comebackHL ?? null,
    comebackHLTimerSec:   room.comebackHLTimerSec ?? QQ_COMEBACK_HL_TIMER_DEFAULT_SEC,
    connections:          room.connections ?? null,
    connectionsTimerSec:  room.connectionsTimerSec ?? QQ_CONNECTIONS_TIMER_DEFAULT_SEC,
    connectionsMaxFails:  room.connectionsMaxFails ?? QQ_CONNECTIONS_MAX_FAILS_DEFAULT,
    connectionsEnabled:   room.connectionsEnabled ?? false,
    cozyGamesEnabled:     room.cozyGamesEnabled ?? false,
    cozyGamesPool:        room.cozyGamesPool ?? [],
    // 2026-08-25: fehlte hier seit Mai. Ohne diese Zeile bekommt der
    // Fortschrittsbaum immer eine leere Liste und graut keinen gespielten
    // CozyGame-Knoten aus. Begruendung am Feld in shared/quarterQuizTypes.ts.
    cozyGamesPlayedAfterPhases: [...(room.cozyGamesPlayedAfterPhases ?? [])],
    cozyGame:             room.cozyGame ?? null,
    cozyGameWins:         { ...(room.teamCozyGameWins ?? {}) },
    comebackEnabled:      room.comebackEnabled !== false,
    largeGroupMode:       room.largeGroupMode ?? false,
    nestedTeams:          room.nestedTeams ?? false,
    arenaBackgrounds:     room.arenaBackgrounds !== false,
    megaQuestionRanking:  room.megaQuestionRanking ?? null,
    megaStandingsRevealed: room.megaStandingsRevealed ?? false,
    megaAwards:           room.megaAwards ?? null,
    awardCeremonyStep:    room.awardCeremonyStep ?? 0,
    shuffleQuestionsInRound: room.shuffleQuestionsInRound ?? true,
    swapFirstCell:    room.swapFirstCell
      ? { row: room.swapFirstCell.row, col: room.swapFirstCell.col }
      : null,
    language:         room.language,
    timerDurationSec: room.timerDurationSec,
    timerEndsAt:      room.timerEndsAt,
    timerExpired:     room.timerExpired,
    answers:          room.answers,
    top5HitsByTeam:   room.top5HitsByTeam,
    orderHitsByTeam:  room.orderHitsByTeam,
    allAnswered:      room.allAnswered,
    buzzQueue:        room.buzzQueue,
    hotPotatoActiveTeamId: room.hotPotatoActiveTeamId,
    hotPotatoEliminated:   room.hotPotatoEliminated,
    hotPotatoLastAnswer:   room.hotPotatoLastAnswer,
    hotPotatoTurnEndsAt:   room.hotPotatoTurnEndsAt,
    hotPotatoUsedAnswers:  room.hotPotatoUsedAnswers,
    hotPotatoAnswerAuthors: room.hotPotatoAnswerAuthors,
    hotPotatoQualified:    room.hotPotatoQualified,
    hotPotatoSlotState:    room.hotPotatoSlotState ?? null,
    // 2026-05-12 (Wolf-Bug 'links/rechts-Reihenfolge im Halbkreis falsch'):
    // Score-sortierte Rotations-Order ins Frontend mit-broadcasten. Frontend
    // brauchte die exakt gleiche Reihenfolge wie nextRoundRobinTeam(), sonst
    // mismatcht das Slot-Mapping.
    hotPotatoOrder:        ((room as any)._hotPotatoOrder as string[] | undefined) ?? room.joinOrder,
    imposterActiveTeamId:  room.imposterActiveTeamId,
    imposterChosenIndices: room.imposterChosenIndices,
    imposterEliminated:    room.imposterEliminated,
    onlyConnectHintIndices:      room.onlyConnectHintIndices ?? {},
    onlyConnectHintRevealedAt:   room.onlyConnectHintRevealedAt ?? {},
    onlyConnectLockedTeams:      room.onlyConnectLockedTeams ?? [],
    onlyConnectStrikes:          room.onlyConnectStrikes ?? {},
    onlyConnectWinnerTeamId:     room.onlyConnectWinnerTeamId ?? null,
    onlyConnectWinnerHintIdx:    room.onlyConnectWinnerHintIdx ?? null,
    onlyConnectGuesses:          room.onlyConnectGuesses ?? [],
    onlyConnectHintDurationSec:  room.onlyConnectHintDurationSec ?? QQ_ONLY_CONNECT_HINT_DURATION_DEFAULT_SEC,
    bluffPhase:                  room.bluffPhase ?? null,
    bluffWriteEndsAt:            room.bluffWriteEndsAt ?? null,
    bluffVoteEndsAt:             room.bluffVoteEndsAt ?? null,
    bluffSubmissions:            room.bluffSubmissions ?? {},
    bluffOptions:                room.bluffOptions ?? [],
    bluffOptionsByTeam:          room.bluffOptionsByTeam ?? {},
    bluffVotes:                  room.bluffVotes ?? {},
    bluffPoints:                 room.bluffPoints ?? {},
    bluffWriteDurationSec:       room.bluffWriteDurationSec ?? QQ_BLUFF_WRITE_DURATION_DEFAULT_SEC,
    bluffVoteDurationSec:        room.bluffVoteDurationSec ?? QQ_BLUFF_VOTE_DURATION_DEFAULT_SEC,
    bluffModeratorReview:        room.bluffModeratorReview ?? false,
    bluffRejected:               room.bluffRejected ?? [],
    lastPlacedCell:        room.lastPlacedCell,
    stuckCandidates:  [],
    imageRevealed:    room.imageRevealed,
    mapRevealStep:    room.mapRevealStep,
    comebackIntroStep: room.comebackIntroStep,
    muchoRevealStep:  room.muchoRevealStep,
    zvzRevealStep:    room.zvzRevealStep,
    cheeseRevealStep: room.cheeseRevealStep,
    avatarsEnabled:   room.avatarsEnabled,
    totalPhases:      room.totalPhases,
    schedule:         room.questions.map(q => ({
      phase: q.phaseIndex,
      category: q.category,
      bunteTueteKind: q.bunteTuete?.kind,
    })),
    theme:            room.theme,
    draftId:          room.draftId,
    slideTemplates:   room.slideTemplates,
    globalMuted:      room.musicMuted && room.sfxMuted,
    musicMuted:       room.musicMuted,
    sfxMuted:         room.sfxMuted,
    volume:           room.volume,
    soundConfig:      room.soundConfig,
    setupDone:        room.setupDone,
    showJoinLink:     room.showJoinLink === true,
    lobbyOpen:        room.lobbyOpen === true,
    formatSelected:   room.formatSelected,
    rulesSlideEndsAt: room.rulesSlideEndsAt ?? null,
    // 2026-08-28: hier stand `?? 'all'` - der gewuerfelte Emoji-Mix -, waehrend
    // die Raumanlage 'cozyquiz' setzt. Dieselbe Doppel-Vorgabe wie beim Design
    // eine Zeile darueber. Die Vorgabe haengt am FORMAT: CrowdQuiz hat eigene
    // Fraktions-Wappen, die an Name und Farbe gebunden sind (Wolf: „crowdquiz
    // hat spezifische emojis neu fuer die fraktionen die auch fest sind in
    // namen und farbe").
    avatarSetId:      room.avatarSetId ?? qqDefaultAvatarSetId(room.largeGroupMode),
    // 2026-08-28: hier stand `?? 'cozy'`, waehrend die Raum-Vorgabe eine
    // Bildschirmseite weiter oben 'buehne' setzt. Zwei Vorgaben fuer denselben
    // Wert, und die falsche gewinnt genau dort, wo es weh tut: bei einem
    // gespeicherten Raum, dessen Datei das Feld noch nicht hat. Reproduziert am
    // 28.08. - Datei ohne `themeId`, Server neu gestartet, Broadcast sagte
    // „cozy", der Beamer haette Pink/Navy gezeigt.
    // Jetzt EINE Quelle: QQ_DEFAULT_THEME_ID aus shared/qqThemeIds.ts.
    themeId:          room.themeId ?? QQ_DEFAULT_THEME_ID,
    // Lazy-Init fuer Bestands-Rooms: wenn Set 'all' aber noch keine Emojis
    // gewuerfelt sind (z.B. weil Room vor 2026-05-04 erstellt), jetzt einmal
    // wuerfeln und festhalten. Ohne diesen Schritt wuerden alle Slots auf
    // den Cozy-Tier-Default zurueckfallen.
    avatarSetEmojis:  (() => {
      if ((room.avatarSetId ?? qqDefaultAvatarSetId(room.largeGroupMode)) !== 'all') return room.avatarSetEmojis;
      if (room.avatarSetEmojis && room.avatarSetEmojis.length === 8) return room.avatarSetEmojis;
      room.avatarSetEmojis = getRandomDummyEmojis(8);
      return room.avatarSetEmojis;
    })(),
    enable3DTransition: room.enable3DTransition,
    rulesSlideIndex:  room.rulesSlideIndex,
    teamsRevealStartedAt: room.teamsRevealStartedAt,
    introStep:        room.introStep,
    finalBets:        room.finalBets ?? {},
    finalBettingSubmitted: room.finalBettingSubmitted ?? {},
    teamTotalSteals:  room.teamTotalSteals ?? {},
    finalPhaseWins:        room.finalPhaseWins ?? {},
    finalLastSnapshot:     room.finalLastSnapshot ?? null,
    finalRecapStep:        room.finalRecapStep ?? 0,
    finalRecapJustWon:     room.finalRecapJustWon ?? null,
    finalRevealStep:       room.finalRevealStep ?? 0,
    finalRevealPendingStacks: room.finalRevealPendingStacks ?? null,
    finalRoundWinners:     room.finalRoundWinners ?? null,
    finalBetResolution:    room.finalBetResolution ?? null,
    endAwards:             room.endAwards ?? null,
    // 2026-07-09 (Wolf-Livetest 'Timer im Reveal 0.0 beim schnellsten'): der
    // echte Frage-/Timer-Start, damit Reveals die Reaktionszeit relativ dazu
    // rechnen können. Bei Reveal ist timerEndsAt schon null → Frontend fiel sonst
    // auf den ersten Submit zurück (= 0.0 fürs schnellste Team).
    currentQuestionStartedAt: (room as any)._currentQuestionStartedAt ?? null,
    // 2026-05-10: Wenn das Spiel persistiert wurde (GAME_OVER → THANKS),
    // liegt die Game-Result-ID hier — ThanksView nutzt sie für den QR-Link
    // (`/summary/by-id/{id}` statt nur `/summary/{roomCode}`), damit
    // geteilte Links auch nach dem nächsten Spiel stabil bleiben.
    lastGameResultId:      (room as any).lastGameResultId ?? null,
    finalWagerEnabled:     room.finalWagerEnabled ?? true,
    // 2026-05-25 (Wolf 'kein intro vor final tip'): Flag wurde im Backend
    // gesetzt aber nie propagiert → Frontend sah undefined → !== false →
    // Intro wurde übersprungen.
    finalBettingIntroDone: (room as any).finalBettingIntroDone ?? true,
    // 2026-05-09 v2 (Wolf-Bug 'Thanks-Ticker stuck dreifach'): questionHistory
    // war bisher nur im Summary-Save-Payload, nicht im Live-State. Frontend-
    // Ticker bekam undefined → strip = 3× Sonja-Card → Loop optisch stuck.
    // Jetzt im Live-State, damit der Ticker während der THANKS-Phase echte
    // Recap-Items zeigt.
    questionHistory:       room.questionHistory.map(h => ({
      questionText: h.questionText,
      category: h.category,
      bunteTueteKind: (h as any).bunteTueteKind,
      correctTeamId: h.correctTeamId,
      correctTeamIds: h.correctTeamIds,
    })),
    categoryIsNew:    (() => {
      const q = room.currentQuestion;
      if (!q) return false;
      const catKey = q.category === 'BUNTE_TUETE' && q.bunteTuete
        ? `BUNTE_TUETE:${q.bunteTuete.kind}` : q.category;
      // It's "new" if it was just added (i.e. it's in seenCategories but was added for THIS question)
      // Simpler: it's in seenCategories AND the intro is showing the explanation step
      const questionInPhase = room.questionIndex % QQ_QUESTIONS_PER_PHASE;
      const catRevealStep = questionInPhase === 0 ? 2 : 0;
      return room.introStep === catRevealStep + 1 && room.seenCategories.includes(catKey);
    })(),
  };
}
