"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var api_1 = require("../api");
var socket_1 = require("../socket");
var categoryColors_1 = require("../categoryColors");
var categoryLabels_1 = require("../categoryLabels");
var categoryAssets_1 = require("../categoryAssets");
var questionDecorations_1 = require("../config/questionDecorations");
var BeamerLobbyView_1 = require("./BeamerLobbyView");
var BeamerSlotView_1 = require("./BeamerSlotView");
var BeamerQuestionView_1 = require("./BeamerQuestionView");
var introSlides_1 = require("../introSlides");
var draft_1 = require("../utils/draft");
var features_1 = require("../config/features");
var beamer_1 = require("../components/beamer");
var mapStateToScreenState = function (state) {
    switch (state) {
        case 'INTRO':
            return 'intro';
        case 'Q_ACTIVE':
        case 'Q_LOCKED':
        case 'Q_REVEAL':
            return 'question';
        default:
            return 'lobby';
    }
};
var SLOT_ITEM_HEIGHT = 70;
var buildQrUrl = function (url) { return "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=".concat(encodeURIComponent(url)); };
var translations = {
    de: {
        lobbyTitle: "Gleich geht's los.",
        lobbySubtitle: 'Macht es euch gemuetlich - der Moderator legt gleich los.',
        codeLabel: 'Code',
        languageLabel: 'Sprache',
        waitingForHost: 'Warten auf Moderator ...',
        teamsInRoom: 'Teams im Raum',
        waitingForQuestion: 'Warten auf Moderator ...',
        timeLeft: function (s) { return "".concat(s, "s"); },
        timeUp: 'Zeit abgelaufen',
        noTimer: 'Kein Timer aktiv',
        calculating: 'Wir rechnen die Loesung aus... Bitte einen Moment geduldig sein.',
        answerLabel: 'Antwort',
        answerFallback: 'Antwort wird eingeblendet.',
        slotTitle: 'Naechste Kategorie',
        slotHint: 'Macht euch bereit - gleich seht ihr die Frage auf dem Beamer.',
        mixedMechanic: 'Gemischte TÃÂ¼te - Sondermechanik.',
        questionLabel: function (index, total) { return "Frage ".concat(index, "/").concat(total); },
        footerMeta: function (globalIndex, globalTotal, categoryLabel, categoryIndex, categoryTotal) { return "".concat(globalIndex, "/").concat(globalTotal, " Fragen | ").concat(categoryLabel, " ").concat(categoryIndex, "/").concat(categoryTotal); },
        teamsReady: function (ready, total) { return "".concat(ready, "/").concat(total, " bereit"); }
    },
    en: {
        lobbyTitle: "We'll start in a moment.",
        lobbySubtitle: 'Get cozy - the host will start soon.',
        codeLabel: 'Code',
        languageLabel: 'Language',
        waitingForHost: 'Waiting for host ...',
        teamsInRoom: 'Teams in room',
        waitingForQuestion: 'Waiting for host ...',
        timeLeft: function (s) { return "".concat(s, "s"); },
        timeUp: "Time's up",
        noTimer: 'No timer running',
        calculating: "We're calculating the result... Please wait a moment.",
        answerLabel: 'Answer',
        answerFallback: 'Answer will appear shortly.',
        slotTitle: 'Next category',
        slotHint: 'Get ready - the next question is about to appear.',
        mixedMechanic: 'Mixed bag - special mechanic.',
        questionLabel: function (index, total) { return "Question ".concat(index, "/").concat(total); },
        footerMeta: function (globalIndex, globalTotal, categoryLabel, categoryIndex, categoryTotal) { return "".concat(globalIndex, "/").concat(globalTotal, " questions | ").concat(categoryLabel, " ").concat(categoryIndex, "/").concat(categoryTotal); },
        teamsReady: function (ready, total) { return "".concat(ready, "/").concat(total, " ready"); }
    }
};
var translationsBoth = {
    lobbyTitle: "".concat(translations.de.lobbyTitle, " / ").concat(translations.en.lobbyTitle),
    lobbySubtitle: "".concat(translations.de.lobbySubtitle, " / ").concat(translations.en.lobbySubtitle),
    codeLabel: "".concat(translations.de.codeLabel, " / ").concat(translations.en.codeLabel),
    languageLabel: "".concat(translations.de.languageLabel, " / ").concat(translations.en.languageLabel),
    waitingForHost: "".concat(translations.de.waitingForHost, " / ").concat(translations.en.waitingForHost),
    teamsInRoom: "".concat(translations.de.teamsInRoom, " / ").concat(translations.en.teamsInRoom),
    waitingForQuestion: "".concat(translations.de.waitingForQuestion, " / ").concat(translations.en.waitingForQuestion),
    timeLeft: function (s) { return "".concat(translations.de.timeLeft(s), " / ").concat(translations.en.timeLeft(s)); },
    timeUp: "".concat(translations.de.timeUp, " / ").concat(translations.en.timeUp),
    noTimer: "".concat(translations.de.noTimer, " / ").concat(translations.en.noTimer),
    calculating: "".concat(translations.de.calculating, " / ").concat(translations.en.calculating),
    answerLabel: "".concat(translations.de.answerLabel, " / ").concat(translations.en.answerLabel),
    answerFallback: "".concat(translations.de.answerFallback, " / ").concat(translations.en.answerFallback),
    slotTitle: "".concat(translations.de.slotTitle, " / ").concat(translations.en.slotTitle),
    slotHint: "".concat(translations.de.slotHint, " / ").concat(translations.en.slotHint),
    mixedMechanic: "".concat(translations.de.mixedMechanic, " / ").concat(translations.en.mixedMechanic),
    questionLabel: function (index, total) {
        return "".concat(translations.de.questionLabel(index, total), " / ").concat(translations.en.questionLabel(index, total));
    },
    footerMeta: function (globalIndex, globalTotal, categoryLabel, categoryIndex, categoryTotal) { return "".concat(translations.de.footerMeta(globalIndex, globalTotal, categoryLabel, categoryIndex, categoryTotal), " / ").concat(translations.en.footerMeta(globalIndex, globalTotal, categoryLabel, categoryIndex, categoryTotal)); },
    teamsReady: function (ready, total) { return "".concat(translations.de.teamsReady(ready, total), " / ").concat(translations.en.teamsReady(ready, total)); }
};
var CATEGORY_DESCRIPTIONS = {
    Schaetzchen: {
        de: 'Hier \u00e4\u0068lt euer Gef\u00fchl f\u00fcr Zahlen und Gr\u00f6\u00dfen.',
        en: 'Here your sense for numbers and sizes matters.'
    },
    'Mu-Cho': {
        de: 'Hier entscheidet ihr euch clever zwischen vier Optionen.',
        en: 'Make the best choice between four options.'
    },
    Stimmts: {
        de: 'Raten oder wissen? Wahr oder falsch.',
        en: 'True or false? Trust your gut or knowledge.'
    },
    Cheese: {
        de: 'Alles rund ums Motiv \u2013 genau hinschauen.',
        en: 'All about the picture \u2013 look closely.'
    },
    GemischteTuete: {
        de: 'Gemischte T\u00fcte: ein bisschen von allem.',
        en: 'Mixed bag: a bit of everything.'
    }
};
var formatSeconds = function (ms) { return Math.max(0, Math.ceil(ms / 1000)); };
var normalizeLang = function (lang) { return (lang === 'both' ? 'de' : lang); };
var slidesForLanguage = function (lang) { return introSlides_1.introSlides[normalizeLang(lang)]; };
var combineDisplay = function (de, en, lang) {
    if (lang === 'both') {
        if (de === en)
            return de;
        return "".concat(de, " / ").concat(en);
    }
    return lang === 'en' ? en : de;
};
var getCategoryLabel = function (key, lang) {
    var _a, _b;
    var labels = categoryLabels_1.categoryLabels[key];
    var de = (_a = labels === null || labels === void 0 ? void 0 : labels.de) !== null && _a !== void 0 ? _a : key;
    var en = (_b = labels === null || labels === void 0 ? void 0 : labels.en) !== null && _b !== void 0 ? _b : de;
    return combineDisplay(de, en, lang);
};
var getCategoryDescription = function (key, lang) {
    var _a, _b;
    var base = CATEGORY_DESCRIPTIONS[key];
    var de = (_a = base === null || base === void 0 ? void 0 : base.de) !== null && _a !== void 0 ? _a : '';
    var en = (_b = base === null || base === void 0 ? void 0 : base.en) !== null && _b !== void 0 ? _b : de;
    return combineDisplay(de, en, lang);
};
var pillRule = {
    padding: '8px 12px',
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: '0.06em',
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e2e8f0',
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6
};
var BeamerView = function (_a) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    var roomCode = _a.roomCode;
    var draftTheme = (_b = (0, draft_1.loadPlayDraft)()) === null || _b === void 0 ? void 0 : _b.theme;
    var slotSpinMs = (_c = draftTheme === null || draftTheme === void 0 ? void 0 : draftTheme.slotSpinMs) !== null && _c !== void 0 ? _c : 2400;
    var slotHoldMs = (_d = draftTheme === null || draftTheme === void 0 ? void 0 : draftTheme.slotHoldMs) !== null && _d !== void 0 ? _d : 1200;
    var slotIntervalMs = (_e = draftTheme === null || draftTheme === void 0 ? void 0 : draftTheme.slotIntervalMs) !== null && _e !== void 0 ? _e : 260;
    var slotScale = (_f = draftTheme === null || draftTheme === void 0 ? void 0 : draftTheme.slotScale) !== null && _f !== void 0 ? _f : 1;
    var _x = (0, react_1.useState)('lobby'), screen = _x[0], setScreen = _x[1];
    var _y = (0, react_1.useState)('LOBBY'), gameState = _y[0], setGameState = _y[1];
    var _z = (0, react_1.useState)(null), slotMeta = _z[0], setSlotMeta = _z[1];
    var _0 = (0, react_1.useState)([]), slotSequence = _0[0], setSlotSequence = _0[1];
    var _1 = (0, react_1.useState)(0), slotOffset = _1[0], setSlotOffset = _1[1];
    var _2 = (0, react_1.useState)(false), slotRolling = _2[0], setSlotRolling = _2[1];
    var _3 = (0, react_1.useState)(false), slotExiting = _3[0], setSlotExiting = _3[1];
    var _4 = (0, react_1.useState)(null), question = _4[0], setQuestion = _4[1];
    var _5 = (0, react_1.useState)(null), questionMeta = _5[0], setQuestionMeta = _5[1];
    var _6 = (0, react_1.useState)('de'), language = _6[0], setLanguage = _6[1];
    var _7 = (0, react_1.useState)(null), timerEndsAt = _7[0], setTimerEndsAt = _7[1];
    var _8 = (0, react_1.useState)(null), timerDurationMs = _8[0], setTimerDurationMs = _8[1];
    var _9 = (0, react_1.useState)(0), remainingMs = _9[0], setRemainingMs = _9[1];
    var _10 = (0, react_1.useState)(0), highlightedCategoryIndex = _10[0], setHighlightedCategoryIndex = _10[1];
    var _11 = (0, react_1.useState)(false), evaluating = _11[0], setEvaluating = _11[1];
    var _12 = (0, react_1.useState)(false), answerVisible = _12[0], setAnswerVisible = _12[1];
    var _13 = (0, react_1.useState)(undefined), solution = _13[0], setSolution = _13[1];
    var _14 = (0, react_1.useState)([]), teams = _14[0], setTeams = _14[1];
    var _15 = (0, react_1.useState)('answering'), questionPhase = _15[0], setQuestionPhase = _15[1];
    var _16 = (0, react_1.useState)(null), potato = _16[0], setPotato = _16[1];
    var _17 = (0, react_1.useState)(null), blitz = _17[0], setBlitz = _17[1];
    var _18 = (0, react_1.useState)(null), answerResults = _18[0], setAnswerResults = _18[1];
    var _19 = (0, react_1.useState)(0), potatoTick = _19[0], setPotatoTick = _19[1];
    var _20 = (0, react_1.useState)(null), potatoAttemptOverlay = _20[0], setPotatoAttemptOverlay = _20[1];
    var potatoOverlayTimeoutRef = (0, react_1.useRef)(null);
    var _21 = (0, react_1.useState)(null), questionProgress = _21[0], setQuestionProgress = _21[1];
    var _22 = (0, react_1.useState)(null), lastQuestion = _22[0], setLastQuestion = _22[1];
    var _23 = (0, react_1.useState)(true), showLastQuestion = _23[0], setShowLastQuestion = _23[1];
    var previousQuestionRef = (0, react_1.useRef)(null);
    var _24 = (0, react_1.useState)('connecting'), connectionStatus = _24[0], setConnectionStatus = _24[1];
    var _25 = (0, react_1.useState)(null), toast = _25[0], setToast = _25[1];
    var _26 = (0, react_1.useState)(false), connectionStuck = _26[0], setConnectionStuck = _26[1];
    var _27 = (0, react_1.useState)(0), reconnectNonce = _27[0], setReconnectNonce = _27[1];
    var _28 = (0, react_1.useState)(function () {
        return Object.keys(categoryLabels_1.categoryLabels).reduce(function (acc, key) {
            var _a;
            return (__assign(__assign({}, acc), (_a = {}, _a[key] = 0, _a)));
        }, {});
    }), categoryProgress = _28[0], setCategoryProgress = _28[1];
    var _29 = (0, react_1.useState)(function () {
        return Object.keys(categoryLabels_1.categoryLabels).reduce(function (acc, key) {
            var _a;
            return (__assign(__assign({}, acc), (_a = {}, _a[key] = 5, _a)));
        }, {});
    }), categoryTotals = _29[0], setCategoryTotals = _29[1];
    var _30 = (0, react_1.useState)(false), questionFlyIn = _30[0], setQuestionFlyIn = _30[1];
    var _31 = (0, react_1.useState)(slidesForLanguage(language)), introSlides = _31[0], setIntroSlides = _31[1];
    var _32 = (0, react_1.useState)(0), introIndex = _32[0], setIntroIndex = _32[1];
    var introTimerRef = (0, react_1.useRef)(null);
    var timerRef = (0, react_1.useRef)(null);
    var slotTimeoutRef = (0, react_1.useRef)(null);
    var reconnectTimeoutsRef = (0, react_1.useRef)([]);
    var connectionStatusRef = (0, react_1.useRef)(connectionStatus);
    var categories = (0, react_1.useMemo)(function () { return Object.keys(categoryLabels_1.categoryLabels); }, []);
    var t = language === 'both' ? translationsBoth : translations[language === 'both' ? 'de' : language];
    var clearReconnectTimeouts = function () {
        reconnectTimeoutsRef.current.forEach(function (id) { return window.clearTimeout(id); });
        reconnectTimeoutsRef.current = [];
    };
    var scheduleReconnectAttempt = function (delayMs) {
        var id = window.setTimeout(function () {
            if (connectionStatusRef.current !== 'connected') {
                setReconnectNonce(function (n) { return n + 1; });
            }
        }, delayMs);
        reconnectTimeoutsRef.current.push(id);
    };
    var handleReconnect = function () {
        setConnectionStatus('connecting');
        setConnectionStuck(false);
        var reconnectText = language === 'both'
            ? 'Verbindung wird aufgebaut... / Reconnecting...'
            : language === 'de'
                ? 'Verbindung wird aufgebaut...'
                : 'Reconnecting...';
        setToast(reconnectText);
        setTimeout(function () { return setToast(null); }, 2000);
        clearReconnectTimeouts();
        setReconnectNonce(function (n) { return n + 1; });
        scheduleReconnectAttempt(1500);
        scheduleReconnectAttempt(4000);
    };
    var toastStyle = {
        position: 'fixed',
        right: 16,
        bottom: 16,
        padding: '10px 14px',
        borderRadius: 12,
        background: 'rgba(15,23,42,0.9)',
        color: '#e2e8f0',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
        zIndex: 20
    };
    var connectionPill = function (status) {
        var map = {
            connected: { bg: 'rgba(34,197,94,0.16)', border: 'rgba(34,197,94,0.5)', color: '#22c55e' },
            connecting: { bg: 'rgba(245,158,11,0.16)', border: 'rgba(245,158,11,0.5)', color: '#f59e0b' },
            disconnected: { bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.5)', color: '#ef4444' }
        };
        var palette = map[status];
        return {
            padding: '6px 10px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.05em',
            background: palette.bg,
            border: "1px solid ".concat(palette.border),
            color: palette.color,
            textTransform: 'uppercase'
        };
    };
    // timer tick
    (0, react_1.useEffect)(function () {
        if (!timerEndsAt) {
            setRemainingMs(0);
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }
        var tick = function () {
            var diff = timerEndsAt - Date.now();
            setRemainingMs(Math.max(0, diff));
            if (diff <= 0 && timerRef.current) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
        tick();
        timerRef.current = window.setInterval(tick, 250);
        return function () {
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [timerEndsAt]);
    // warn if disconnected > 5s
    (0, react_1.useEffect)(function () {
        if (connectionStatus !== 'disconnected') {
            setConnectionStuck(false);
            return;
        }
        var id = window.setTimeout(function () { return setConnectionStuck(true); }, 5000);
        return function () { return window.clearTimeout(id); };
    }, [connectionStatus]);
    (0, react_1.useEffect)(function () {
        connectionStatusRef.current = connectionStatus;
    }, [connectionStatus]);
    (0, react_1.useEffect)(function () {
        if (gameState !== 'POTATO') {
            setPotatoTick(0);
            return undefined;
        }
        var id = window.setInterval(function () { return setPotatoTick(function (tick) { return tick + 1; }); }, 500);
        return function () { return window.clearInterval(id); };
    }, [gameState]);
    (0, react_1.useEffect)(function () {
        var _a;
        if (!(potato === null || potato === void 0 ? void 0 : potato.lastAttempt) || (potato === null || potato === void 0 ? void 0 : potato.phase) !== 'PLAYING')
            return;
        var attempt = potato.lastAttempt;
        var teamName = ((_a = teams.find(function (team) { return team.id === attempt.teamId; })) === null || _a === void 0 ? void 0 : _a.name) || attempt.teamId;
        setPotatoAttemptOverlay({
            id: attempt.id,
            verdict: attempt.verdict,
            text: attempt.text,
            teamName: teamName,
            reason: attempt.reason || undefined
        });
        if (potatoOverlayTimeoutRef.current) {
            window.clearTimeout(potatoOverlayTimeoutRef.current);
        }
        potatoOverlayTimeoutRef.current = window.setTimeout(function () { return setPotatoAttemptOverlay(null); }, 1600);
    }, [(_g = potato === null || potato === void 0 ? void 0 : potato.lastAttempt) === null || _g === void 0 ? void 0 : _g.id, potato === null || potato === void 0 ? void 0 : potato.phase, (_h = potato === null || potato === void 0 ? void 0 : potato.lastAttempt) === null || _h === void 0 ? void 0 : _h.verdict, teams]);
    (0, react_1.useEffect)(function () {
        if ((potato === null || potato === void 0 ? void 0 : potato.phase) === 'PLAYING')
            return;
        if (potatoOverlayTimeoutRef.current) {
            window.clearTimeout(potatoOverlayTimeoutRef.current);
            potatoOverlayTimeoutRef.current = null;
        }
        setPotatoAttemptOverlay(null);
    }, [potato === null || potato === void 0 ? void 0 : potato.phase]);
    (0, react_1.useEffect)(function () { return function () {
        if (potatoOverlayTimeoutRef.current) {
            window.clearTimeout(potatoOverlayTimeoutRef.current);
        }
    }; }, []);
    (0, react_1.useEffect)(function () {
        var prev = previousQuestionRef.current;
        if (prev && question && prev.id !== question.id) {
            setLastQuestion({ text: prev.question, category: prev === null || prev === void 0 ? void 0 : prev.category });
        }
        else if (prev && !question && !lastQuestion) {
            setLastQuestion({ text: prev.question, category: prev === null || prev === void 0 ? void 0 : prev.category });
        }
        previousQuestionRef.current = question;
    }, [question, lastQuestion]);
    (0, react_1.useEffect)(function () {
        if (lastQuestion)
            setShowLastQuestion(true);
    }, [lastQuestion]);
    // initial fetch
    (0, react_1.useEffect)(function () {
        (0, api_1.fetchLanguage)(roomCode)
            .then(function (res) { return res.language && setLanguage(res.language); })
            .catch(function () { return undefined; });
        (0, api_1.fetchCurrentQuestion)(roomCode)
            .then(function (res) {
            var _a;
            if (res.question) {
                setQuestion(res.question);
                setQuestionMeta((_a = res.meta) !== null && _a !== void 0 ? _a : null);
                setScreen('question');
            }
        })
            .catch(function () { return undefined; });
        (0, api_1.fetchTimer)(roomCode)
            .then(function (res) {
            var _a, _b;
            var ends = (_b = (_a = res === null || res === void 0 ? void 0 : res.timer) === null || _a === void 0 ? void 0 : _a.endsAt) !== null && _b !== void 0 ? _b : null;
            if (ends) {
                var duration = ends - Date.now();
                setTimerEndsAt(ends);
                setTimerDurationMs(duration > 0 ? duration : null);
            }
        })
            .catch(function () { return undefined; });
    }, [roomCode]);
    (0, react_1.useEffect)(function () {
        return function () {
            clearReconnectTimeouts();
        };
    }, []);
    // sockets
    (0, react_1.useEffect)(function () {
        var _a, _b;
        setConnectionStatus('connecting');
        setConnectionStuck(false);
        clearReconnectTimeouts();
        var socket = (0, socket_1.connectToRoom)(roomCode);
        socket.on('connect', function () {
            setConnectionStatus('connected');
            setToast(language === 'de' ? 'Verbindung wiederhergestellt' : 'Connection restored');
            setConnectionStuck(false);
            setTimeout(function () { return setToast(null); }, 2200);
        });
        socket.on('disconnect', function () { return setConnectionStatus('disconnected'); });
        socket.on('connect_error', function () { return setConnectionStatus('disconnected'); });
        (_b = (_a = socket.io) === null || _a === void 0 ? void 0 : _a.on) === null || _b === void 0 ? void 0 : _b.call(_a, 'reconnect_attempt', function () { return setConnectionStatus('connecting'); });
        socket.on('syncState', function (payload) {
            var _a, _b;
            setLanguage(payload.language);
            setTimerEndsAt(payload.timerEndsAt);
            setScreen(payload.screen === 'slot' ? 'slot' : payload.question ? 'question' : 'lobby');
            setQuestion(payload.question);
            setQuestionMeta((_a = payload.questionMeta) !== null && _a !== void 0 ? _a : null);
            setSlotMeta((_b = payload.slotMeta) !== null && _b !== void 0 ? _b : null);
            setQuestionPhase(payload.questionPhase);
        });
        socket.on('beamer:show-slot-transition', function (meta) {
            setSlotMeta(meta);
            setScreen('slot');
            setQuestion(null);
            setQuestionMeta(null);
            setEvaluating(false);
            setAnswerVisible(false);
            setSolution(undefined);
            setQuestionPhase('answering');
            setSlotExiting(false);
        });
        socket.on('beamer:show-intro', function (payload) {
            var _a;
            setIntroSlides((_a = payload === null || payload === void 0 ? void 0 : payload.slides) !== null && _a !== void 0 ? _a : slidesForLanguage(language));
            setIntroIndex(0);
            setScreen('intro');
            setQuestion(null);
            setQuestionMeta(null);
            setEvaluating(false);
            setAnswerVisible(false);
            setSolution(undefined);
        });
        socket.on('beamer:show-question', function (payload) {
            var _a;
            // if slot animation is visible, exit it smoothly before showing question
            if (slotMeta) {
                setSlotExiting(true);
                window.setTimeout(function () {
                    var _a;
                    setSlotExiting(false);
                    setQuestion(payload.question);
                    setQuestionMeta((_a = payload.meta) !== null && _a !== void 0 ? _a : null);
                    setSlotMeta(null);
                    setScreen('question');
                    setEvaluating(false);
                    setAnswerVisible(false);
                    setSolution(undefined);
                    setQuestionPhase('answering');
                    setQuestionFlyIn(true);
                    requestAnimationFrame(function () { return setQuestionFlyIn(false); });
                }, slotHoldMs);
                return;
            }
            setQuestion(payload.question);
            setQuestionMeta((_a = payload.meta) !== null && _a !== void 0 ? _a : null);
            setSlotMeta(null);
            setScreen('question');
            setEvaluating(false);
            setAnswerVisible(false);
            setSolution(undefined);
            setQuestionPhase('answering');
            setQuestionFlyIn(true);
            requestAnimationFrame(function () { return setQuestionFlyIn(false); });
        });
        socket.on('questionStarted', function (_a) {
            var meta = _a.meta;
            setQuestionMeta(meta !== null && meta !== void 0 ? meta : null);
            setScreen('question');
            setQuestionPhase('answering');
            setSlotMeta(null);
            setSlotExiting(false);
        });
        socket.on('timerStarted', function (_a) {
            var endsAt = _a.endsAt;
            setTimerEndsAt(endsAt);
            setTimerDurationMs(endsAt - Date.now());
        });
        socket.on('timerStopped', function () {
            setTimerEndsAt(null);
            setRemainingMs(0);
            setTimerDurationMs(null);
        });
        var onStateUpdate = function (payload) {
            var _a, _b, _c, _d, _e;
            setGameState(payload.state);
            setScreen(mapStateToScreenState(payload.state));
            if ((_a = payload.scores) === null || _a === void 0 ? void 0 : _a.length) {
                setTeams(payload.scores.map(function (entry) { return ({
                    id: entry.id,
                    name: entry.name,
                    score: entry.score
                }); }));
            }
            if (payload.currentQuestion !== undefined) {
                setQuestion(payload.currentQuestion);
                if (payload.currentQuestion) {
                    setAnswerResults(null);
                }
            }
            if (payload.timer) {
                setTimerEndsAt(payload.timer.endsAt);
                setTimerDurationMs(payload.timer.endsAt ? payload.timer.endsAt - Date.now() : null);
            }
            if (payload.potato !== undefined) {
                setPotato((_b = payload.potato) !== null && _b !== void 0 ? _b : null);
            }
            if (payload.blitz !== undefined) {
                setBlitz((_c = payload.blitz) !== null && _c !== void 0 ? _c : null);
            }
            if (payload.results !== undefined) {
                setAnswerResults((_d = payload.results) !== null && _d !== void 0 ? _d : null);
            }
            if (payload.questionProgress !== undefined) {
                setQuestionProgress((_e = payload.questionProgress) !== null && _e !== void 0 ? _e : null);
            }
        };
        socket.on('server:stateUpdate', onStateUpdate);
        socket.on('languageChanged', function (_a) {
            var lang = _a.language;
            setLanguage(lang);
        });
        socket.on('beamer:show-rules', function () {
            setScreen('lobby');
            setSlotMeta(null);
            setQuestion(null);
            setQuestionMeta(null);
            setAnswerVisible(false);
            setSolution(undefined);
            setQuestionPhase('idle');
        });
        socket.on('evaluation:started', function () {
            setEvaluating(true);
            setAnswerVisible(false);
            setQuestionPhase('evaluated');
        });
        socket.on('answersEvaluated', function (_a) {
            var sol = _a.solution;
            setSolution(sol);
            setEvaluating(false);
            setAnswerVisible(true); // LÃÂ¶sung direkt einblenden
            setQuestionPhase('evaluated');
        });
        socket.on('evaluation:revealed', function () {
            setEvaluating(false);
            setAnswerVisible(true);
            setQuestionPhase('revealed');
        });
        socket.on('teamsReady', function (_a) {
            var tTeams = _a.teams;
            setTeams(tTeams !== null && tTeams !== void 0 ? tTeams : []);
        });
        return function () {
            socket.off('server:stateUpdate', onStateUpdate);
            socket.disconnect();
        };
    }, [roomCode, language, reconnectNonce]);
    // slot animation
    (0, react_1.useEffect)(function () {
        if (!slotMeta) {
            setSlotSequence([]);
            setSlotRolling(false);
            return;
        }
        var sequence = __spreadArray(__spreadArray(__spreadArray([], categories, true), categories, true), [slotMeta.categoryId], false);
        setSlotSequence(sequence);
        setSlotOffset(0);
        setSlotRolling(true);
        requestAnimationFrame(function () {
            setSlotOffset(Math.max(0, (sequence.length - 3) * SLOT_ITEM_HEIGHT));
        });
        if (slotTimeoutRef.current) {
            window.clearTimeout(slotTimeoutRef.current);
        }
        slotTimeoutRef.current = window.setTimeout(function () {
            setSlotRolling(false);
            // keep slot view visible until the actual question payload arrives
        }, slotSpinMs);
        return function () {
            if (slotTimeoutRef.current) {
                window.clearTimeout(slotTimeoutRef.current);
                slotTimeoutRef.current = null;
            }
        };
    }, [categories, slotMeta]);
    // roTÃÂ¼te lobby category highlights
    (0, react_1.useEffect)(function () {
        if (categories.length === 0)
            return;
        if (screen !== 'lobby')
            return;
        var interval = window.setInterval(function () { return setHighlightedCategoryIndex(function (i) { return (i + 1) % categories.length; }); }, 5000);
        return function () {
            window.clearInterval(interval);
        };
    }, [categories.length, screen]);
    // intro auto-advance
    (0, react_1.useEffect)(function () {
        if (screen !== 'intro') {
            if (introTimerRef.current) {
                window.clearInterval(introTimerRef.current);
                introTimerRef.current = null;
            }
            return;
        }
        introTimerRef.current = window.setInterval(function () {
            setIntroIndex(function (prev) { return (prev + 1) % introSlides.length; });
        }, 8000);
        return function () {
            if (introTimerRef.current) {
                window.clearInterval(introTimerRef.current);
                introTimerRef.current = null;
            }
        };
    }, [screen, introSlides.length]);
    // sync intro slides to current language
    (0, react_1.useEffect)(function () {
        setIntroSlides(slidesForLanguage(language));
        setIntroIndex(0);
    }, [language]);
    // category progress from meta
    (0, react_1.useEffect)(function () {
        if (question && (questionMeta === null || questionMeta === void 0 ? void 0 : questionMeta.categoryIndex)) {
            setCategoryProgress(function (prev) {
                var _a;
                var _b;
                return (__assign(__assign({}, prev), (_a = {}, _a[question.category] = Math.max((_b = prev[question.category]) !== null && _b !== void 0 ? _b : 0, questionMeta.categoryIndex), _a)));
            });
            setCategoryTotals(function (prev) {
                var _a;
                var _b, _c;
                return (__assign(__assign({}, prev), (_a = {}, _a[question.category] = (_c = (_b = questionMeta.categoryTotal) !== null && _b !== void 0 ? _b : prev[question.category]) !== null && _c !== void 0 ? _c : 5, _a)));
            });
        }
    }, [question, questionMeta]);
    (0, react_1.useEffect)(function () {
        if (slotMeta) {
            setCategoryTotals(function (prev) {
                var _a;
                var _b, _c;
                return (__assign(__assign({}, prev), (_a = {}, _a[slotMeta.categoryId] = (_c = (_b = slotMeta.totalQuestionsInCategory) !== null && _b !== void 0 ? _b : prev[slotMeta.categoryId]) !== null && _c !== void 0 ? _c : 5, _a)));
            });
        }
    }, [slotMeta]);
    var rawViewMode = screen === 'intro'
        ? 'intro'
        : screen === 'slot' && slotMeta
            ? 'categorySlot'
            : questionPhase === 'revealed' || answerVisible
                ? 'answer'
                : questionPhase === 'evaluated' || evaluating
                    ? 'calculating'
                    : screen === 'question'
                        ? 'question'
                        : 'lobby';
    var viewMode = !features_1.featureFlags.showLegacyCategories && rawViewMode === 'categorySlot' ? 'question' : rawViewMode;
    var isScoreboardState = gameState === 'SCOREBOARD' || gameState === 'SCOREBOARD_PAUSE' || gameState === 'AWARDS';
    var isPotatoStage = gameState === 'POTATO' && potato;
    var derivedQuestionProgress = questionProgress !== null && questionProgress !== void 0 ? questionProgress : (questionMeta
        ? { asked: (_j = questionMeta.globalIndex) !== null && _j !== void 0 ? _j : (question ? 1 : 0), total: (_k = questionMeta.globalTotal) !== null && _k !== void 0 ? _k : 20 }
        : { asked: question ? 1 : 0, total: 20 });
    var isBlitzStage = gameState === 'BLITZ' && blitz;
    var sortedScoreTeams = __spreadArray([], teams, true).sort(function (a, b) { var _a, _b; return ((_a = b.score) !== null && _a !== void 0 ? _a : 0) - ((_b = a.score) !== null && _b !== void 0 ? _b : 0); });
    var teamNameLookup = (0, react_1.useMemo)(function () {
        var map = {};
        teams.forEach(function (t) {
            map[t.id] = t.name;
        });
        return map;
    }, [teams]);
    var revealResultRows = (0, react_1.useMemo)(function () {
        if (!(answerResults === null || answerResults === void 0 ? void 0 : answerResults.length))
            return [];
        return __spreadArray([], answerResults, true).map(function (entry) { return (__assign(__assign({}, entry), { displayName: teamNameLookup[entry.teamId] || entry.teamName || entry.teamId })); })
            .sort(function (a, b) { var _a, _b; return ((_a = b.awardedPoints) !== null && _a !== void 0 ? _a : 0) - ((_b = a.awardedPoints) !== null && _b !== void 0 ? _b : 0); });
    }, [answerResults, teamNameLookup]);
    var potatoCountdown = (0, react_1.useMemo)(function () {
        if (!(potato === null || potato === void 0 ? void 0 : potato.deadline))
            return null;
        return Math.max(0, Math.ceil((potato.deadline - Date.now()) / 1000));
    }, [potato === null || potato === void 0 ? void 0 : potato.deadline, potatoTick]);
    var blitzCountdown = (0, react_1.useMemo)(function () {
        if (!(blitz === null || blitz === void 0 ? void 0 : blitz.deadline))
            return null;
        return Math.max(0, Math.ceil((blitz.deadline - Date.now()) / 1000));
    }, [blitz === null || blitz === void 0 ? void 0 : blitz.deadline, potatoTick]);
    var totalQuestions = (_m = (_l = derivedQuestionProgress === null || derivedQuestionProgress === void 0 ? void 0 : derivedQuestionProgress.total) !== null && _l !== void 0 ? _l : questionMeta === null || questionMeta === void 0 ? void 0 : questionMeta.globalTotal) !== null && _m !== void 0 ? _m : 20;
    var rawRoundIndex = (_p = (_o = questionMeta === null || questionMeta === void 0 ? void 0 : questionMeta.globalIndex) !== null && _o !== void 0 ? _o : derivedQuestionProgress === null || derivedQuestionProgress === void 0 ? void 0 : derivedQuestionProgress.asked) !== null && _p !== void 0 ? _p : 0;
    var currentRoundNumber = gameState === 'Q_ACTIVE' || gameState === 'Q_LOCKED' || gameState === 'Q_REVEAL'
        ? (_q = questionMeta === null || questionMeta === void 0 ? void 0 : questionMeta.globalIndex) !== null && _q !== void 0 ? _q : (rawRoundIndex > 0 ? rawRoundIndex : 1)
        : rawRoundIndex;
    var normalizedRound = Math.max(1, Math.min(totalQuestions || 20, currentRoundNumber || 1));
    var progressValue = totalQuestions ? Math.min(1, normalizedRound / totalQuestions) : null;
    var progressText = totalQuestions ? "".concat(normalizedRound, "/").concat(totalQuestions) : undefined;
    var activeCategory = (_r = categories[highlightedCategoryIndex]) !== null && _r !== void 0 ? _r : categories[0];
    var readyCount = teams.filter(function (tTeam) { return tTeam.isReady; }).length;
    var currentCategory = (_s = question === null || question === void 0 ? void 0 : question.category) !== null && _s !== void 0 ? _s : slotMeta === null || slotMeta === void 0 ? void 0 : slotMeta.categoryId;
    var categoryLabel = currentCategory ? getCategoryLabel(currentCategory, language) : '';
    var categoryTotal = currentCategory && categoryTotals[currentCategory]
        ? categoryTotals[currentCategory]
        : (_t = questionMeta === null || questionMeta === void 0 ? void 0 : questionMeta.categoryTotal) !== null && _t !== void 0 ? _t : 5;
    var categoryIndex = (_u = questionMeta === null || questionMeta === void 0 ? void 0 : questionMeta.categoryIndex) !== null && _u !== void 0 ? _u : (currentCategory ? Math.max(1, categoryProgress[currentCategory] || 1) : 1);
    var headerLeftLabel = (draftTheme === null || draftTheme === void 0 ? void 0 : draftTheme.title) || 'Cozy Quiz 60';
    var headerLeftHint = roomCode ? "Room ".concat(roomCode) : undefined;
    var headerTimerText = timerEndsAt ? "".concat(formatSeconds(remainingMs), "s") : undefined;
    var questionText = question && language === 'en' && (question === null || question === void 0 ? void 0 : question.questionEn)
        ? question.questionEn
        : question === null || question === void 0 ? void 0 : question.question;
    var timerText = timerEndsAt && remainingMs > 0
        ? t.timeLeft(formatSeconds(remainingMs))
        : timerEndsAt
            ? t.timeUp
            : t.noTimer;
    var progress = timerEndsAt && timerDurationMs
        ? Math.max(0, Math.min(1, remainingMs / timerDurationMs))
        : 0;
    var pageStyle = (0, react_1.useMemo)(function () { return ({
        position: 'relative',
        minHeight: '100vh',
        background: (draftTheme === null || draftTheme === void 0 ? void 0 : draftTheme.background) ? undefined : 'var(--bg) url("/background.png") center/cover fixed',
        backgroundImage: (draftTheme === null || draftTheme === void 0 ? void 0 : draftTheme.background) ? "url(".concat(draftTheme.background, ")") : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#e2e8f0',
        overflow: 'hidden',
        padding: '28px 18px',
        fontFamily: (draftTheme === null || draftTheme === void 0 ? void 0 : draftTheme.font) ? "".concat(draftTheme.font, ", \"Inter\", sans-serif") : undefined
    }); }, [draftTheme === null || draftTheme === void 0 ? void 0 : draftTheme.background, draftTheme === null || draftTheme === void 0 ? void 0 : draftTheme.font]);
    var footerMeta = questionMeta &&
        t.footerMeta(questionMeta.globalIndex, questionMeta.globalTotal, categoryLabel ? categoryLabel.toUpperCase() : '?', questionMeta.categoryIndex, questionMeta.categoryTotal);
    var showCalculating = viewMode === 'calculating';
    var showAnswer = viewMode === 'answer';
    var cardColor = currentCategory ? (_v = categoryColors_1.categoryColors[currentCategory]) !== null && _v !== void 0 ? _v : '#e1b75d' : '#e1b75d';
    var lobbyActiveColor = (draftTheme === null || draftTheme === void 0 ? void 0 : draftTheme.color) ||
        (viewMode === 'lobby' && categories.length > 0
            ? (_w = categoryColors_1.categoryColors[categories[highlightedCategoryIndex]]) !== null && _w !== void 0 ? _w : '#6dd5fa'
            : '#6dd5fa');
    var leftDecorationSrc = question && question.decorationLeft
        ? questionDecorations_1.DECORATION_ICONS[question.decorationLeft]
        : undefined;
    var rightDecorationSrc = question && question.decorationRight
        ? questionDecorations_1.DECORATION_ICONS[question.decorationRight]
        : undefined;
    var renderIntro = function () {
        var slide = introSlides[introIndex % introSlides.length];
        var backLabel = language === 'de' ? 'Zurueck' : 'Back';
        var nextLabel = language === 'de' ? 'Weiter' : 'Next';
        return (<div style={__assign(__assign({}, cardFrame), { padding: 0 })}>
        <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: 1180,
                margin: '0 auto',
                borderRadius: 32,
                padding: '34px 32px',
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'linear-gradient(140deg, rgba(13,15,20,0.94), rgba(14,17,27,0.85))',
                boxShadow: '0 30px 64px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                minHeight: 360,
                transition: 'opacity 240ms ease, transform 240ms ease'
            }}>
          <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 30% 30%, rgba(243,195,103,0.16), transparent 48%), radial-gradient(circle at 80% 15%, rgba(108,122,255,0.18), transparent 45%)',
                pointerEvents: 'none',
                opacity: 0.9
            }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative', zIndex: 1 }}>
            <div style={__assign(__assign({}, pillRule), { fontSize: 12, padding: '10px 14px', background: 'rgba(243,195,103,0.16)', borderColor: 'rgba(243,195,103,0.45)', color: '#fde68a' })}>
              {slide.badge || 'Intro'}
            </div>
            <div style={__assign(__assign({}, pillRule), { background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.16)', color: '#e2e8f0' })}>
              {introIndex + 1}/{introSlides.length}
            </div>
          </div>
          <div style={{ color: '#cbd5e1', fontSize: 18, letterSpacing: '0.02em', marginBottom: 10, position: 'relative', zIndex: 1 }}>{slide.subtitle}</div>
          <div style={{
                color: '#f8fafc',
                fontSize: 42,
                fontWeight: 900,
                lineHeight: 1.15,
                marginBottom: 14,
                position: 'relative',
                zIndex: 1
            }}>
            {slide.title}
          </div>
          <div style={{ color: '#e2e8f0', fontSize: 20, lineHeight: 1.6, maxWidth: 860, position: 'relative', zIndex: 1 }}>{slide.body}</div>
        </div>
      </div>);
    };
    var renderScoreboard = function () { return (<div style={cardFrame}>
      {/* TODO(DESIGN_LATER): Scoreboard styling */}
      <div style={{
            fontSize: 28,
            fontWeight: 900,
            marginBottom: 16,
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
        }}>
        {language === 'de' ? 'Scoreboard' : 'Scoreboard'}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {sortedScoreTeams.length === 0 && (<div style={{ color: '#94a3b8' }}>
            {language === 'de' ? 'Noch keine Teams' : 'No teams yet'}
          </div>)}
        {sortedScoreTeams.map(function (team, idx) {
            var _a;
            return (<div key={team.id} style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 12,
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(0,0,0,0.25)'
                }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{idx + 1}.</span>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{team.name}</span>
            <span style={{ fontSize: 20, fontWeight: 900 }}>{(_a = team.score) !== null && _a !== void 0 ? _a : 0}</span>
          </div>);
        })}
      </div>
    </div>); };
    var renderLobbyScene = function () {
        if (features_1.featureFlags.isCozyMode && !features_1.featureFlags.showLegacyCategories) {
            var steps = language === 'de'
                ? ['QR scannen oder Code eingeben.', 'Moderator waehlt Sprache & Quiz.', 'Bereit fuer Cozy Quiz 60.']
                : language === 'both'
                    ? ['QR scannen / scan QR code.', 'Moderator waehlt Sprache / selects language.', 'Bereit fuer Cozy Quiz 60 / Get ready.']
                    : ['Scan QR or enter the room code.', 'Host selects language & quiz.', 'Get ready for Cozy Quiz 60.'];
            var connectedInfo = readyCount > 0
                ? "".concat(readyCount, "/").concat(teams.length || 0, " ").concat(language === 'de' ? 'bereit' : language === 'both' ? 'bereit / ready' : 'ready')
                : "".concat(teams.length || 0, " ").concat(language === 'de' ? 'Teams verbunden' : language === 'both' ? 'Teams verbunden / connected' : 'teams connected');
            var joinDisplay = teamJoinLink ? teamJoinLink.replace(/^https?:\/\//i, '') : '';
            return (<beamer_1.BeamerFrame scene="lobby" leftLabel={headerLeftLabel} leftHint={headerLeftHint} title={language === 'de' ? 'Room offen' : language === 'both' ? 'Room offen / room open' : 'Room open'} subtitle={language === 'de'
                    ? 'Moderator startet gleich'
                    : language === 'both'
                        ? 'Moderator startet / host starts soon'
                        : 'Moderator starts soon'} badgeLabel="LOBBY" badgeTone="muted" progressText={progressText} progressValue={progressValue} timerText={headerTimerText} footerMessage={language === 'de'
                    ? 'Teams via QR oder Code beitreten lassen'
                    : language === 'both'
                        ? 'Teams via QR / Code beitreten lassen'
                        : 'Let teams join via QR or code'} status="info" rightNode={teamJoinQr ? (<div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
                <img src={teamJoinQr} alt="Team QR" style={{ width: 160, height: 160, borderRadius: 16, border: '1px solid rgba(255,255,255,0.2)', marginBottom: 6 }}/>
                <div>{joinDisplay}</div>
              </div>) : undefined}>
          <div className="beamer-stack">
            <div className="beamer-intro-card">
              <h2>{language === 'de' ? 'Room Code' : language === 'both' ? 'Room Code / Code' : 'Room code'}</h2>
              <p style={{ fontSize: 48, fontWeight: 800 }}>{roomCode || '----'}</p>
              <p>{connectedInfo}</p>
            </div>
            <div className="beamer-list">
              {steps.map(function (textLine) { return (<span key={"lobby-line-".concat(textLine)}>{textLine}</span>); })}
            </div>
            {sortedScoreTeams.length > 0 && (<>
                <div className="beamer-label">
                  {language === 'de'
                        ? 'Teams im Raum'
                        : language === 'both'
                            ? 'Teams im Raum / Teams in room'
                            : 'Teams in room'}
                </div>
                {renderCozyScoreboardGrid(sortedScoreTeams.slice(0, 6))}
              </>)}
          </div>
        </beamer_1.BeamerFrame>);
        }
        return (<BeamerLobbyView_1.default t={t} language={language} roomCode={roomCode} readyCount={readyCount} teamsCount={teams.length || 0} categories={features_1.featureFlags.showLegacyCategories ? categories : []} highlightedCategoryIndex={highlightedCategoryIndex} categoryColors={categoryColors_1.categoryColors} categoryIcons={categoryAssets_1.categoryIcons} categoryProgress={categoryProgress} categoryTotals={categoryTotals} getCategoryLabel={getCategoryLabel} getCategoryDescription={getCategoryDescription}/>);
    };
    var renderQuestionFrame = function () { return (<div style={__assign(__assign({}, cardFrame), { opacity: questionFlyIn ? 0 : 1, transform: questionFlyIn ? 'translateY(40px)' : 'translateY(0)', transition: 'opacity 420ms ease, transform 420ms ease' })}>
      <BeamerQuestionView_1.default showCalculating={showCalculating} showAnswer={showAnswer} categoryLabel={categoryLabel} questionMeta={questionMeta} timerText={timerText} progress={progress} hasTimer={Boolean(timerEndsAt)} question={question} questionText={questionText} t={t} solution={solution} footerMeta={footerMeta} cardColor={cardColor} leftDecorationSrc={leftDecorationSrc} rightDecorationSrc={rightDecorationSrc}/>
    </div>); };
    var renderCozyScoreboardGrid = function (entries, options) {
        if (!entries.length) {
            return (<div className="beamer-intro-card">
          <h2>{language === 'de' ? 'Noch keine Teams' : 'No teams yet'}</h2>
          <p>{language === 'de' ? 'Wartet auf Beitritte.' : 'Waiting for teams to join.'}</p>
        </div>);
        }
        return (<div className="beamer-scoreboard-grid">
        {entries.map(function (entry, idx) {
                var _a, _b, _c;
                return (<beamer_1.BeamerScoreboardCard key={"cozy-score-".concat(entry.id, "-").concat(idx)} rank={idx + 1} name={entry.name} score={(_a = entry.score) !== null && _a !== void 0 ? _a : 0} detail={(_c = (_b = options === null || options === void 0 ? void 0 : options.detailMap) === null || _b === void 0 ? void 0 : _b[entry.id]) !== null && _c !== void 0 ? _c : null} highlight={Boolean((options === null || options === void 0 ? void 0 : options.highlightTop) && idx < 3)}/>);
            })}
      </div>);
    };
    var renderCozyIntroContent = function () {
        var copy = language === 'de'
            ? ['Teams beitreten und Namen checken.', 'Host setzt Sprache & Quiz.', 'Bereit machen fÃ¼r Cozy Quiz 60.']
            : language === 'both'
                ? ['Teams beitreten / join teams.', 'Host setzt Sprache / selects language.', 'Get ready for Cozy Quiz 60.']
                : ['Teams join and check names.', 'Host selects language & quiz.', 'Get ready for Cozy Quiz 60.'];
        var connectedInfo = readyCount > 0
            ? "".concat(readyCount, "/").concat(teams.length || 0, " ").concat(language === 'de' ? 'bereit' : language === 'both' ? 'bereit / ready' : 'ready')
            : "".concat(teams.length || 0, " ").concat(language === 'de' ? 'Teams verbunden' : language === 'both' ? 'verbunden / connected' : 'teams connected');
        return (<div className="beamer-stack">
        <div className="beamer-intro-card">
          <h2>{language === 'de' ? 'Session startet gleich' : language === 'both' ? 'Session startet / starting soon' : 'Session starts soon'}</h2>
          <p>{connectedInfo}</p>
        </div>
        <div className="beamer-list">
          {copy.map(function (text) { return (<span key={"intro-line-".concat(text)}>{text}</span>); })}
        </div>
        {sortedScoreTeams.length > 0 && (<>
            <div className="beamer-label">
              {language === 'de'
                    ? 'Teams im Raum'
                    : language === 'both'
                        ? 'Teams im Raum / Teams in room'
                        : 'Teams in room'}
            </div>
            {renderCozyScoreboardGrid(sortedScoreTeams.slice(0, 6))}
          </>)}
      </div>);
    };
    var getQuestionPromptText = function () {
        var _a, _b;
        if (!question)
            return undefined;
        var q = question;
        if (language === 'both' && q.promptEn) {
            return "".concat((_a = q.prompt) !== null && _a !== void 0 ? _a : '').concat(q.promptEn ? " / ".concat(q.promptEn) : '');
        }
        if (language === 'en' && q.promptEn)
            return q.promptEn;
        if (q.prompt)
            return q.prompt;
        if ((_b = q.bunteTuete) === null || _b === void 0 ? void 0 : _b.prompt)
            return q.bunteTuete.prompt;
        return undefined;
    };
    var renderQuestionCardGrid = function () {
        var _a, _b, _c;
        if (!question)
            return null;
        var q = question;
        var mcOptions = language === 'en' && Array.isArray(q.optionsEn) && q.optionsEn.length ? q.optionsEn : q.options;
        if (Array.isArray(mcOptions) && mcOptions.length) {
            return (<div className="beamer-grid">
          {mcOptions.map(function (opt, idx) { return (<div className="beamer-card" key={"opt-".concat(idx)}>
              <strong>{String.fromCharCode(65 + idx)}.</strong> {opt}
            </div>); })}
        </div>);
        }
        var bunte = q.bunteTuete;
        if ((_a = bunte === null || bunte === void 0 ? void 0 : bunte.items) === null || _a === void 0 ? void 0 : _a.length) {
            return (<div className="beamer-grid">
          {bunte.items.map(function (item) { return (<div className="beamer-card" key={item.id || item.label}>
              {item.label || item.text || item.prompt || item.id}
            </div>); })}
        </div>);
        }
        if ((_b = bunte === null || bunte === void 0 ? void 0 : bunte.statements) === null || _b === void 0 ? void 0 : _b.length) {
            return (<div className="beamer-grid">
          {bunte.statements.map(function (statement) { return (<div className="beamer-card" key={statement.id}>
              <strong>{statement.id}.</strong> {statement.text}
            </div>); })}
        </div>);
        }
        if ((_c = bunte === null || bunte === void 0 ? void 0 : bunte.ladder) === null || _c === void 0 ? void 0 : _c.length) {
            return (<div className="beamer-grid">
          {bunte.ladder.map(function (step) { return (<div className="beamer-card" key={step.label}>
              <strong>{step.label}</strong>
              <span>{language === 'de' ? "".concat(step.points, " Punkte") : "".concat(step.points, " pts")}</span>
            </div>); })}
        </div>);
        }
        return null;
    };
    var renderRevealResultsSection = function () {
        if (!revealResultRows.length)
            return null;
        return (<div className="beamer-stack">
        <div className="beamer-label">
          {language === 'de' ? 'Teamwertung' : language === 'both' ? 'Teamwertung / Team results' : 'Team results'}
        </div>
        <div className="beamer-scoreboard-grid">
          {revealResultRows.map(function (entry, idx) {
                var pointsLabel = typeof entry.awardedPoints === 'number'
                    ? "".concat(entry.awardedPoints >= 0 ? '+' : '').concat(entry.awardedPoints)
                    : entry.awardedDetail || '';
                var detailLabel = entry.awardedDetail
                    ? entry.awardedDetail
                    : entry.isCorrect
                        ? language === 'de'
                            ? 'Richtig'
                            : 'Correct'
                        : language === 'de'
                            ? 'Offen'
                            : 'Pending';
                return (<beamer_1.BeamerScoreboardCard key={"result-".concat(entry.teamId, "-").concat(idx)} rank={idx + 1} name={entry.displayName || entry.teamId} score={pointsLabel} detail={detailLabel} highlight={Boolean(entry.isCorrect)}/>);
            })}
        </div>
      </div>);
    };
    var renderCozyBlitzContent = function () {
        var _a, _b, _c, _d;
        if (!blitz)
            return null;
        var detailMap = {};
        Object.entries(blitz.results || {}).forEach(function (_a) {
            var _b, _c;
            var teamId = _a[0], stats = _a[1];
            detailMap[teamId] = "".concat((_b = stats.correctCount) !== null && _b !== void 0 ? _b : 0, "/5, +").concat((_c = stats.pointsAwarded) !== null && _c !== void 0 ? _c : 0);
        });
        var submissions = (_b = (_a = blitz.submissions) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
        return (<div className="beamer-stack">
        <div className="beamer-question-main">
          <div className="beamer-question-category">
            {language === 'de' ? 'Blitz-Thema' : language === 'both' ? 'Blitz-Thema / Theme' : 'Theme'}
          </div>
          <div className="beamer-question-text">{((_c = blitz.theme) === null || _c === void 0 ? void 0 : _c.title) || '-'}</div>
          <div className="beamer-list">
            <span>
              {language === 'de'
                ? "Eing\u00C3\u00A4nge ".concat(submissions, "/").concat(teams.length)
                : "Submissions ".concat(submissions, "/").concat(teams.length)}
            </span>
            {blitzCountdown !== null && <span className="beamer-countdown">{blitzCountdown}s</span>}
          </div>
        </div>
        {((_d = blitz.items) === null || _d === void 0 ? void 0 : _d.length) ? (<div className="beamer-grid">
            {blitz.items.map(function (item, idx) { return (<div className="beamer-card" key={item.id || idx}>
                <strong>{language === 'de' ? "Item ".concat(idx + 1) : "Item ".concat(idx + 1)}</strong>
                {item.mediaUrl && <img src={item.mediaUrl} alt={item.prompt || "Blitz ".concat(idx + 1)}/>}
                {item.prompt && <span>{item.prompt}</span>}
              </div>); })}
          </div>) : null}
        {Object.keys(blitz.results || {}).length > 0 && (<>
            <div className="beamer-label">
              {language === 'de' ? 'Set-Ergebnis' : language === 'both' ? 'Set-Ergebnis / Result' : 'Set result'}
            </div>
            {renderCozyScoreboardGrid(sortedScoreTeams, { highlightTop: true, detailMap: detailMap })}
          </>)}
      </div>);
    };
    var renderCozyPotatoContent = function () {
        var _a;
        if (!potato)
            return null;
        var turnOrder = potato.turnOrder.length ? potato.turnOrder : Object.keys(potato.lives || {});
        var lives = potato.lives || {};
        var activeName = potato.activeTeamId ? teamNameLookup[potato.activeTeamId] || potato.activeTeamId : null;
        return (<div className="beamer-stack">
        <div className="beamer-question-main">
          <div className="beamer-question-category">
            {language === 'de' ? 'Aktuelles Thema' : language === 'both' ? 'Thema / Theme' : 'Theme'}
          </div>
          <div className="beamer-question-text">{potato.currentTheme || '-'}</div>
          <div className="beamer-list">
            {activeName && (<span>
                {language === 'de'
                    ? "Dran: ".concat(activeName)
                    : language === 'both'
                        ? "Dran / Up: ".concat(activeName)
                        : "Up: ".concat(activeName)}
              </span>)}
            {potatoCountdown !== null && <span className="beamer-countdown">{potatoCountdown}s</span>}
            {potato.usedAnswers && (<span>
                {language === 'de'
                    ? "".concat(potato.usedAnswers.length, " Antworten genannt")
                    : "".concat(potato.usedAnswers.length, " answers used")}
              </span>)}
          </div>
          {potato.pendingConflict && (<span className="beamer-conflict-badge">
              {potato.pendingConflict.type === 'duplicate'
                    ? language === 'de'
                        ? 'Duplikat'
                        : 'Duplicate'
                    : language === 'de'
                        ? 'Konflikt'
                        : 'Conflict'}
            </span>)}
        </div>
        <div className="beamer-grid">
          {turnOrder.map(function (teamId) {
                var _a;
                var name = teamNameLookup[teamId] || teamId;
                var livesCount = (_a = lives[teamId]) !== null && _a !== void 0 ? _a : 0;
                var hearts = livesCount > 0 ? "".concat(livesCount, "x") : '-';
                return (<div className={"beamer-card".concat(teamId === potato.activeTeamId ? ' highlight' : '')} key={"life-".concat(teamId)}>
                <strong>{name}</strong>
                <span>{hearts}</span>
              </div>);
            })}
        </div>
        {((_a = potato.selectedThemes) === null || _a === void 0 ? void 0 : _a.length) ? (<div className="beamer-grid">
            {potato.selectedThemes.map(function (theme, idx) { return (<div className="beamer-card" key={"theme-".concat(idx)}>
                {theme}
              </div>); })}
          </div>) : null}
      </div>);
    };
    var renderCozyAwardsContent = function () { return (<div className="beamer-stack">
      <div className="beamer-intro-card">
        <h2>{language === 'de' ? 'Siegerehrung' : language === 'both' ? 'Siegerehrung / Awards' : 'Awards'}</h2>
        <p>
          {language === 'de'
            ? 'Top Teams des Abends'
            : language === 'both'
                ? 'Top Teams des Abends / Top teams tonight'
                : 'Top teams tonight'}
        </p>
      </div>
      {renderCozyScoreboardGrid(sortedScoreTeams, { highlightTop: true })}
    </div>); };
    var renderCozyScene = function () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        var sceneKey = "".concat(gameState, "-").concat((_a = question === null || question === void 0 ? void 0 : question.id) !== null && _a !== void 0 ? _a : 'none', "-").concat((_b = blitz === null || blitz === void 0 ? void 0 : blitz.phase) !== null && _b !== void 0 ? _b : 'idle', "-").concat((_c = potato === null || potato === void 0 ? void 0 : potato.phase) !== null && _c !== void 0 ? _c : 'idle');
        var baseFrameProps = {
            scene: (gameState || 'lobby').toLowerCase(),
            leftLabel: headerLeftLabel,
            leftHint: headerLeftHint,
            progressText: progressText,
            progressValue: progressValue,
            timerText: headerTimerText
        };
        var badgeInfo = gameState === 'BLITZ'
            ? { label: "SET ".concat(((_d = blitz === null || blitz === void 0 ? void 0 : blitz.setIndex) !== null && _d !== void 0 ? _d : -1) + 1, "/3"), tone: 'accent' }
            : gameState === 'POTATO'
                ? { label: language === 'de' ? 'Finale' : 'Final', tone: 'warning' }
                : gameState === 'AWARDS'
                    ? { label: 'FINAL', tone: 'success' }
                    : totalQuestions
                        ? { label: "Segment ".concat(normalizedRound <= 10 ? 1 : 2), tone: normalizedRound <= 10 ? 'muted' : 'accent' }
                        : undefined;
        var questionTitle = "RUNDE ".concat(normalizedRound, "/").concat(totalQuestions || 20);
        var questionSubtitle = categoryLabel ? "".concat(categoryLabel, " ").concat(categoryIndex, "/").concat(categoryTotal) : undefined;
        var promptText = getQuestionPromptText();
        var mediaUrl = ((_e = question === null || question === void 0 ? void 0 : question.media) === null || _e === void 0 ? void 0 : _e.url) ||
            (question === null || question === void 0 ? void 0 : question.mediaUrl) ||
            (question === null || question === void 0 ? void 0 : question.imageUrl) ||
            (question === null || question === void 0 ? void 0 : question.image) ||
            null;
        var questionTextLocalized = language === 'both'
            ? "".concat((_f = question === null || question === void 0 ? void 0 : question.question) !== null && _f !== void 0 ? _f : '').concat((question === null || question === void 0 ? void 0 : question.questionEn) ? " / ".concat(question.questionEn) : '')
            : language === 'en'
                ? (_g = question === null || question === void 0 ? void 0 : question.questionEn) !== null && _g !== void 0 ? _g : question === null || question === void 0 ? void 0 : question.question
                : (_j = (_h = question === null || question === void 0 ? void 0 : question.question) !== null && _h !== void 0 ? _h : question === null || question === void 0 ? void 0 : question.questionEn) !== null && _j !== void 0 ? _j : '';
        var renderQuestionFrameCozy = function (phase) { return (<beamer_1.BeamerFrame key={"".concat(sceneKey, "-").concat(phase)} {...baseFrameProps} title={questionTitle} subtitle={questionSubtitle} badgeLabel={badgeInfo === null || badgeInfo === void 0 ? void 0 : badgeInfo.label} badgeTone={badgeInfo === null || badgeInfo === void 0 ? void 0 : badgeInfo.tone} footerMessage={phase === 'active'
                ? language === 'de'
                    ? 'Antworten jetzt mÃ¶glich'
                    : language === 'both'
                        ? 'Antworten mÃ¶glich / Answers open'
                        : 'Answers open'
                : phase === 'locked'
                    ? language === 'de'
                        ? 'Antwortfenster geschlossen'
                        : language === 'both'
                            ? 'Antworten geschlossen / Locked'
                            : 'Answers locked'
                    : language === 'de'
                        ? 'AuflÃ¶sung'
                        : language === 'both'
                            ? 'AuflÃ¶sung / Reveal'
                            : 'Reveal'} status={phase === 'active' ? 'active' : phase === 'locked' ? 'locked' : 'final'}>
        {question ? (<>
            <div className="beamer-question-layout">
              <div className="beamer-question-main">
                {categoryLabel && <div className="beamer-question-category">{categoryLabel}</div>}
                <div className="beamer-question-text">{questionTextLocalized}</div>
                {promptText && <div className="beamer-hint">{promptText}</div>}
                {phase === 'reveal' && solution && (<div className="beamer-question-solution">
                    {language === 'de'
                        ? "L\u00C3\u00B6sung: ".concat(solution)
                        : language === 'both'
                            ? "L\u00C3\u00B6sung / Solution: ".concat(solution)
                            : "Solution: ".concat(solution)}
                  </div>)}
              </div>
              {mediaUrl && (<div className="beamer-question-media">
                  <img src={mediaUrl} alt=""/>
                </div>)}
            </div>
            {renderQuestionCardGrid()}
            {phase === 'reveal' && renderRevealResultsSection()}
          </>) : (<div className="beamer-intro-card">
            <h2>{language === 'de' ? 'Keine Frage aktiv' : 'No active question'}</h2>
            <p>{language === 'de' ? 'Moderator startet gleich weiter.' : 'Host will continue shortly.'}</p>
          </div>)}
      </beamer_1.BeamerFrame>); };
        var renderScoreboardFrame = function (mode) { return (<beamer_1.BeamerFrame key={"".concat(sceneKey, "-").concat(mode)} {...baseFrameProps} title={mode === 'pause' ? 'PAUSE' : 'ZWISCHENSTAND'} subtitle={language === 'de' ? 'Aktuelle Punkte' : 'Current points'} badgeLabel={badgeInfo === null || badgeInfo === void 0 ? void 0 : badgeInfo.label} badgeTone={badgeInfo === null || badgeInfo === void 0 ? void 0 : badgeInfo.tone} footerMessage={mode === 'pause'
                ? language === 'de'
                    ? 'Kurze Pause â gleich geht es weiter.'
                    : 'Short break â back soon.'
                : language === 'de'
                    ? 'Zwischenstand anzeigen'
                    : 'Showing standings'} status="info">
        {renderCozyScoreboardGrid(sortedScoreTeams, { highlightTop: mode === 'scoreboard' })}
      </beamer_1.BeamerFrame>); };
        var renderBlitzFrame = function () {
            var _a, _b;
            return (<beamer_1.BeamerFrame key={"".concat(sceneKey, "-blitz")} {...baseFrameProps} title="BLITZ BATTLE" subtitle={((_a = blitz === null || blitz === void 0 ? void 0 : blitz.theme) === null || _a === void 0 ? void 0 : _a.title) || (language === 'de' ? 'Schnelle Runde' : 'Fast round')} badgeLabel={"SET ".concat(((_b = blitz === null || blitz === void 0 ? void 0 : blitz.setIndex) !== null && _b !== void 0 ? _b : -1) + 1, "/3")} badgeTone="accent" footerMessage={(blitz === null || blitz === void 0 ? void 0 : blitz.phase) === 'PLAYING'
                    ? language === 'de'
                        ? '30 Sekunden Antworten'
                        : '30 seconds to answer'
                    : language === 'de'
                        ? 'Set Ergebnis'
                        : 'Set result'} status={(blitz === null || blitz === void 0 ? void 0 : blitz.phase) === 'PLAYING' ? 'active' : 'info'}>
        {renderCozyBlitzContent()}
      </beamer_1.BeamerFrame>);
        };
        var renderPotatoFrame = function () { return (<beamer_1.BeamerFrame key={"".concat(sceneKey, "-potato")} {...baseFrameProps} title="HEISSE KARTOFFEL" subtitle={language === 'de' ? 'Finale Stage' : 'Final stage'} badgeLabel={language === 'de' ? 'FINAL' : 'FINAL'} badgeTone="warning" footerMessage={(potato === null || potato === void 0 ? void 0 : potato.phase) === 'PLAYING'
                ? language === 'de'
                    ? '5 Sekunden pro Antwort'
                    : '5 seconds per answer'
                : language === 'de'
                    ? 'Moderator entscheidet'
                    : 'Host resolving'} status="active">
        {renderCozyPotatoContent()}
      </beamer_1.BeamerFrame>); };
        var renderAwardsFrame = function () { return (<beamer_1.BeamerFrame key={"".concat(sceneKey, "-awards")} {...baseFrameProps} title="SIEGEREHRUNG" subtitle={language === 'de' ? 'Finales Ranking' : 'Final ranking'} badgeLabel="FINAL" badgeTone="success" footerMessage={language === 'de' ? 'GlÃ¼ckwunsch an alle Teams' : 'Congrats to all teams'} status="final">
        {renderCozyAwardsContent()}
      </beamer_1.BeamerFrame>); };
        switch (gameState) {
            case 'INTRO':
            case 'LOBBY':
                return (<beamer_1.BeamerFrame key={"".concat(sceneKey, "-intro")} {...baseFrameProps} title="WILLKOMMEN" subtitle={language === 'de' ? 'Moderator bereitet alles vor' : 'Host is getting ready'} badgeLabel="LOBBY" badgeTone="muted" footerMessage={language === 'de' ? 'Teams jetzt verbinden' : 'Teams can join now'} status="info">
            {renderCozyIntroContent()}
          </beamer_1.BeamerFrame>);
            case 'Q_ACTIVE':
                return renderQuestionFrameCozy('active');
            case 'Q_LOCKED':
                return renderQuestionFrameCozy('locked');
            case 'Q_REVEAL':
                return renderQuestionFrameCozy('reveal');
            case 'SCOREBOARD':
                return renderScoreboardFrame('scoreboard');
            case 'SCOREBOARD_PAUSE':
                return renderScoreboardFrame('pause');
            case 'BLITZ':
                return renderBlitzFrame();
            case 'POTATO':
                return renderPotatoFrame();
            case 'AWARDS':
                return renderAwardsFrame();
            default:
                return (<beamer_1.BeamerFrame key={"".concat(sceneKey, "-fallback")} {...baseFrameProps} title="ZWISCHENSTAND" subtitle={language === 'de' ? 'Status' : 'Status'} badgeLabel={badgeInfo === null || badgeInfo === void 0 ? void 0 : badgeInfo.label} badgeTone={badgeInfo === null || badgeInfo === void 0 ? void 0 : badgeInfo.tone} footerMessage={language === 'de' ? 'Warten auf den nÃ¤chsten Schritt' : 'Waiting for next step'} status="info">
            {renderCozyScoreboardGrid(sortedScoreTeams, { highlightTop: true })}
          </beamer_1.BeamerFrame>);
        }
    };
    var renderPotatoView = function () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if (!potato)
            return renderScoreboard();
        var roundTotal = (_b = (_a = potato.selectedThemes) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
        var roundLabel = roundTotal > 0 && potato.roundIndex >= 0 ? "".concat(potato.roundIndex + 1, "/").concat(roundTotal) : roundTotal > 0 ? "0/".concat(roundTotal) : 'â';
        var activeTeamName = potato.activeTeamId
            ? ((_c = teams.find(function (t) { return t.id === potato.activeTeamId; })) === null || _c === void 0 ? void 0 : _c.name) || potato.activeTeamId
            : null;
        var bans = potato.bans || {};
        var banLimits = potato.banLimits || {};
        var selectedThemes = potato.selectedThemes || [];
        var lives = potato.lives || {};
        var turnOrder = potato.turnOrder.length ? potato.turnOrder : Object.keys(lives);
        var lastWinner = potato.lastWinnerId && teams.find(function (t) { return t.id === potato.lastWinnerId; })
            ? (_d = teams.find(function (t) { return t.id === potato.lastWinnerId; })) === null || _d === void 0 ? void 0 : _d.name
            : potato.lastWinnerId || null;
        var infoCopy = language === 'de'
            ? 'Max. 5 Sekunden pro Antwort Â· doppelte Antworten = Strike.'
            : language === 'both'
                ? 'Max. 5 Sekunden / max. 5 seconds. Duplicate answers = strike.'
                : 'Max. 5 seconds per answer Â· duplicate answers = strike.';
        var attemptOverlay = potato.phase === 'PLAYING' ? potatoAttemptOverlay : null;
        var overlayVerdictText = function (verdict) {
            if (language === 'en') {
                return verdict === 'ok'
                    ? 'ACCEPTED'
                    : verdict === 'dup'
                        ? 'DUPLICATE'
                        : verdict === 'invalid'
                            ? 'INVALID'
                            : verdict === 'timeout'
                                ? 'TIMEOUT'
                                : 'CHECKING';
            }
            if (language === 'both') {
                return verdict === 'ok'
                    ? 'AKZEPTIERT / ACCEPTED'
                    : verdict === 'dup'
                        ? 'DUPLIKAT / DUPLICATE'
                        : verdict === 'invalid'
                            ? 'UNGUELTIG / INVALID'
                            : verdict === 'timeout'
                                ? 'ZEIT / TIMEOUT'
                                : 'PRUEFUNG / CHECKING';
            }
            if (verdict === 'ok')
                return 'AKZEPTIERT';
            if (verdict === 'dup')
                return 'DUPLIKAT';
            if (verdict === 'invalid')
                return 'UNGUELTIG';
            if (verdict === 'timeout')
                return 'TIMEOUT';
            return 'PRUEFUNG';
        };
        var overlayReasonText = function (reason) {
            if (!reason)
                return null;
            if (reason === 'duplicate')
                return language === 'en' ? 'Already used' : language === 'both' ? 'Schon genannt / Already used' : 'Schon genannt';
            if (reason === 'similar')
                return language === 'en' ? 'Very similar' : language === 'both' ? 'Sehr aehnlich / Very similar' : 'Sehr aehnlich';
            if (reason === 'not-listed')
                return language === 'en' ? 'Not on list' : language === 'both' ? 'Nicht gelistet / Not on list' : 'Nicht gelistet';
            if (reason === 'timeout')
                return language === 'en' ? 'Too late' : language === 'both' ? 'Zu spaet / Too late' : 'Zu spaet';
            if (reason === 'empty')
                return language === 'en' ? 'No answer' : language === 'both' ? 'Keine Antwort / No answer' : 'Keine Antwort';
            return null;
        };
        return (<div style={{ position: 'relative' }}>
        {attemptOverlay && (<div className={"potato-attempt-overlay verdict-".concat(attemptOverlay.verdict)}>
            <div className="potato-attempt-team">{attemptOverlay.teamName || 'Team'}</div>
            <div className="potato-attempt-text">"{attemptOverlay.text || '—'}"</div>
            <div className="potato-attempt-meta">
              <span>{overlayVerdictText(attemptOverlay.verdict)}</span>
              {overlayReasonText(attemptOverlay.reason) && <span>{overlayReasonText(attemptOverlay.reason)}</span>}
            </div>
          </div>)}
        <div style={cardFrame}>
          <div style={{
                borderRadius: 32,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'linear-gradient(140deg, rgba(13,15,20,0.94), rgba(14,17,27,0.85))',
                padding: '28px 26px',
                minHeight: 320,
                boxShadow: '0 30px 64px rgba(0,0,0,0.55)'
            }}>
          <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
                flexWrap: 'wrap',
                gap: 10
            }}>
            <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '0.06em' }}>
              {language === 'de'
                ? 'Heisse Kartoffel'
                : language === 'both'
                    ? 'Heisse Kartoffel / Hot Potato'
                    : 'Hot Potato'}
            </div>
            <div style={__assign(__assign({}, pillRule), { borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.12)' })}>
              Runde {roundLabel}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {potato.phase === 'BANNING' && (<>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {language === 'de'
                    ? 'Teams bannen noch Themen'
                    : language === 'both'
                        ? 'Teams bannen Themen / teams ban topics'
                        : 'Teams are banning topics'}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedThemes.length > 0 ? (selectedThemes.map(function (theme, idx) { return (<span key={"beamer-theme-".concat(idx)} style={__assign(__assign({}, pillRule), { fontSize: 14 })}>
                        {theme}
                      </span>); })) : (<span style={{ color: '#94a3b8' }}>
                      {language === 'de' ? 'Themen werden vorbereitet.' : 'Topics will be drawn soon.'}
                    </span>)}
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {sortedScoreTeams.map(function (team) {
                    var _a, _b;
                    return (<div key={"ban-show-".concat(team.id)} style={{
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 16,
                            padding: '10px 12px',
                            background: 'rgba(0,0,0,0.35)',
                            display: 'grid',
                            gap: 4
                        }}>
                      <div style={{ fontWeight: 800 }}>{team.name}</div>
                      <div style={{ fontSize: 14, color: '#cbd5e1' }}>
                        {language === 'de' ? 'Bans' : language === 'both' ? 'Bans / Verbote' : 'Bans'} ({(_a = banLimits[team.id]) !== null && _a !== void 0 ? _a : 0}):
                        {' '}
                        {((_b = bans[team.id]) === null || _b === void 0 ? void 0 : _b.length) ? bans[team.id].join(', ') : 'â'}
                      </div>
                    </div>);
                })}
                </div>
              </>)}
            {potato.phase === 'PLAYING' && (<>
                <div style={{ fontSize: 20, fontWeight: 800 }}>
                  {language === 'de' ? 'Thema' : language === 'both' ? 'Thema / Topic' : 'Topic'}:{' '}
                  {potato.currentTheme || 'â'}
                </div>
                <div style={{ fontSize: 16, color: '#cbd5e1' }}>
                  {language === 'de'
                    ? 'Aktives Team'
                    : language === 'both'
                        ? 'Team am Zug / Active team'
                        : 'Active team'}
                  : {activeTeamName || '-'}
                </div>
                <div style={{
                    fontSize: 16,
                    color: potatoCountdown !== null && potatoCountdown <= 1 ? '#f87171' : '#cbd5e1'
                }}>
                  {potatoCountdown !== null ? "".concat(Math.max(0, potatoCountdown), "s \u00C2\u00B7 ").concat(infoCopy) : infoCopy}
                </div>
                {potatoCountdown !== null && potatoCountdown <= 0 && (<div style={__assign(__assign({}, pillRule), { background: 'rgba(248,113,113,0.18)', borderColor: 'rgba(248,113,113,0.4)', color: '#fecaca' })}>
                    {language === 'de'
                        ? 'Zeit abgelaufen!'
                        : language === 'both'
                            ? 'Zeit abgelaufen / Time is up!'
                            : 'Time is up!'}
                  </div>)}
                <div style={{ display: 'grid', gap: 6 }}>
                  {turnOrder.map(function (teamId) {
                    var _a, _b;
                    return (<div key={"turn-".concat(teamId)} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: 10,
                            padding: '10px 12px',
                            borderRadius: 14,
                            border: teamId === potato.activeTeamId
                                ? '1px solid rgba(251,191,36,0.45)'
                                : '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(0,0,0,0.35)'
                        }}>
                      <span style={{ fontWeight: 700 }}>{((_a = teams.find(function (t) { return t.id === teamId; })) === null || _a === void 0 ? void 0 : _a.name) || teamId}</span>
                      <span style={{ fontWeight: 800 }}>{'?'.repeat(Math.max(1, (_b = lives[teamId]) !== null && _b !== void 0 ? _b : 0))}</span>
                    </div>);
                })}
                </div>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>
                  {language === 'de'
                    ? "".concat(((_e = potato.usedAnswers) === null || _e === void 0 ? void 0 : _e.length) || 0, " Antworten wurden schon genannt.")
                    : language === 'both'
                        ? "".concat(((_f = potato.usedAnswers) === null || _f === void 0 ? void 0 : _f.length) || 0, " Antworten wurden genannt / answers used.")
                        : "".concat(((_g = potato.usedAnswers) === null || _g === void 0 ? void 0 : _g.length) || 0, " answers already used.")}
                </div>
                {((_h = potato.usedAnswers) === null || _h === void 0 ? void 0 : _h.length) ? (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {potato.usedAnswers.map(function (answer, idx) { return (<span key={"potato-used-chip-".concat(idx)} style={__assign(__assign({}, pillRule), { fontSize: 14, background: 'rgba(15,23,42,0.45)', borderColor: 'rgba(148,163,184,0.35)', color: '#e2e8f0' })}>
                        {answer}
                      </span>); })}
                  </div>) : null}
              </>)}
            {potato.phase === 'ROUND_END' && (<>
                <div style={{ fontSize: 20, fontWeight: 800 }}>
                  {language === 'de'
                    ? 'Runde beendet'
                    : language === 'both'
                        ? 'Runde beendet / Round finished'
                        : 'Round finished'}
                </div>
                {lastWinner && (<div style={{ fontSize: 18, color: '#bbf7d0', fontWeight: 800 }}>
                    {language === 'de' ? 'Sieger' : language === 'both' ? 'Sieger / Winner' : 'Winner'}: {lastWinner}
                  </div>)}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedThemes.map(function (theme, idx) { return (<span key={"done-theme-".concat(idx)} style={__assign(__assign({}, pillRule), { background: idx <= potato.roundIndex ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.08)', borderColor: idx <= potato.roundIndex ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.14)' })}>
                      {theme}
                    </span>); })}
                </div>
                <div style={{ fontSize: 16, color: '#cbd5e1' }}>
                  {language === 'de'
                    ? 'Moderator startet gleich die nÃ¤chste Runde.'
                    : language === 'both'
                        ? 'Moderator startet gleich / Host starts next round soon.'
                        : 'Host will start the next round soon.'}
                </div>
              </>)}
            {potato.phase === 'DONE' && (<div style={{ fontSize: 20, fontWeight: 800 }}>
                {language === 'de'
                    ? 'Finale abgeschlossen. Awards folgen!'
                    : language === 'both'
                        ? 'Finale abgeschlossen / Final complete.'
                        : 'Final complete. Awards incoming.'}
              </div>)}
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              {language === 'de' ? 'Scoreboard' : 'Scoreboard'}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {sortedScoreTeams.map(function (team, idx) {
                var _a;
                return (<div key={"score-potato-".concat(team.id)} style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto',
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: 16,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(0,0,0,0.4)'
                    }}>
                  <span style={{ fontWeight: 900 }}>{idx + 1}.</span>
                  <span style={{ fontWeight: 700 }}>{team.name}</span>
                  <span style={{ fontWeight: 900 }}>{(_a = team.score) !== null && _a !== void 0 ? _a : 0}</span>
                </div>);
            })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBlitzView = () => {}
    if (!blitz) return renderScoreboard();
    const setLabel = `${Math.max(1, ((_j = blitz.setIndex) !== null && _j !== void 0 ? _j : -1) + 1)}/3`;
    const submissions = blitz.submissions?.length ?? 0;
    const results = blitz.results || ;
    const items = blitz.items || [];
    const themeName = blitz.theme?.title || '-';
    return (
      <div style={cardFrame}>
        <div style={{
                borderRadius: 32,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'linear-gradient(135deg, rgba(14,17,32,0.92), rgba(13,16,26,0.85))',
                padding: '26px 24px',
                minHeight: 280
            }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>Blitz Battle</div>
            <div style={__assign(__assign({}, pillRule), { borderColor: 'rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.15)' })}>
              Set {setLabel}
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700 }}>
            {language === 'de' ? 'Thema' : 'Theme'}: {themeName}
          </div>
          {blitz.phase === 'PLAYING' ? (<>
              <div style={{ marginTop: 6, color: '#cbd5e1' }}>
                {language === 'de'
                    ? 'Antworten werden gesammelt.'
                    : 'Collecting answers...'}
              </div>
              <div style={{ marginTop: 6, color: '#94a3b8' }}>
                {language === 'de'
                    ? "Eing\u00C3\u00A4nge: ".concat(submissions, "/").concat(teams.length)
                    : "Submissions: ".concat(submissions, "/").concat(teams.length)}
              </div>
              <div style={{
                    marginTop: 12,
                    display: 'grid',
                    gap: 12,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'
                }}>
                {items.map(function (item, idx) { return (<div key={"blitz-card-".concat(item.id || idx)} style={{
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 18,
                        padding: '12px 14px',
                        background: 'rgba(15,18,28,0.55)',
                        minHeight: 120,
                        display: 'grid',
                        gap: 6
                    }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>Item {idx + 1}</div>
                    {item.mediaUrl && (<img src={item.mediaUrl} alt={item.prompt || "Blitz Item ".concat(idx + 1)} style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 140 }}/>)}
                    {item.prompt && <div style={{ fontSize: 13, color: '#cbd5e1' }}>{item.prompt}</div>}
                  </div>); })}
              </div>
              {blitzCountdown !== null && (<div style={{
                        marginTop: 8,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderRadius: 12,
                        border: '1px solid rgba(59,130,246,0.4)',
                        background: 'rgba(59,130,246,0.14)'
                    }}>
                  ? {blitzCountdown}s
                </div>)}
            </>) : (<>
              <div style={{ marginTop: 8, fontWeight: 700 }}>
                {language === 'de' ? 'Set-Ergebnis' : 'Set result'}
              </div>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {sortedScoreTeams.map(function (team) {
                    var _a, _b, _c, _d;
                    return (<div key={"blitz-result-".concat(team.id)} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto auto',
                            gap: 12,
                            padding: '10px 12px',
                            borderRadius: 16,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(0,0,0,0.35)'
                        }}>
                    <span>{team.name}</span>
                    <span>{(_b = (_a = results[team.id]) === null || _a === void 0 ? void 0 : _a.correctCount) !== null && _b !== void 0 ? _b : 0}/5</span>
                    <span style={{ fontWeight: 900 }}>+{(_d = (_c = results[team.id]) === null || _c === void 0 ? void 0 : _c.pointsAwarded) !== null && _d !== void 0 ? _d : 0}</span>
                  </div>);
                })}
              </div>
            </>)}
        </div>
      </div>
    );
  };

  return (
    <main style={pageStyle}>
      {offlineBar(connectionStatus, language)}
      {toast && <div style={toastStyle}>{toast}</div>}
      {(draftTheme === null || draftTheme === void 0 ? void 0 : draftTheme.logoUrl) && (<div style={{ position: 'fixed', top: 16, right: 16, zIndex: 40 }}>
          <img src={draftTheme.logoUrl} alt="Logo" style={{ maxHeight: 70, objectFit: 'contain' }}/>
        </div>)}
      <div style={beamerAurora(lobbyActiveColor)}/>
      <div style={beamerShell}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
          <span style={connectionPill(connectionStatus)}>
            {language === 'de'
                ? connectionStatus === 'connected'
                    ? 'Verbunden'
                    : connectionStatus === 'connecting'
                        ? 'Verbinde...'
                        : 'Getrennt'
                : connectionStatus === 'connected'
                    ? 'Online'
                    : connectionStatus === 'connecting'
                        ? 'Reconnecting...'
                        : 'Offline'}
            {connectionStatus === 'disconnected' && (<button style={{
                    marginLeft: 10,
                    padding: '6px 10px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#e5e7eb',
                    fontWeight: 700,
                    cursor: 'pointer'
                }} onClick={handleReconnect}>
                {language === 'de' ? 'Neu laden' : 'Reload'}
              </button>)}
          </span>
        </div>
        {connectionStuck && (<div style={{
                    marginBottom: 8,
                    padding: '8px 10px',
                    borderRadius: 12,
                    border: '1px solid rgba(245,158,11,0.6)',
                    background: 'rgba(245,158,11,0.12)',
                    color: '#fbbf24',
                    fontWeight: 800
                }}>
            {language === 'de'
                    ? 'Keine Verbindung seit >5s. Bitte WLAN/Backend prÃ¼fen. / No connection for >5s. Check Wi-Fi/backend.'
                    : 'No connection for >5s. Please check Wi-Fi/backend.'}
          </div>)}
        {features_1.featureFlags.isCozyMode ? (renderCozyScene()) : isBlitzStage ? (renderBlitzView()) : isPotatoStage ? (renderPotatoView()) : isScoreboardState ? (renderScoreboard()) : (<>
            {viewMode === 'intro' && renderIntro()}
            {viewMode === 'lobby' && renderLobbyScene()}

            {features_1.featureFlags.showLegacyCategories && viewMode === 'categorySlot' && slotMeta && (<div style={cardFrame}>
                <BeamerSlotView_1.default t={t} language={language} slotMeta={slotMeta} categories={categories} categoryColors={categoryColors_1.categoryColors} categoryIcons={categoryAssets_1.categoryIcons} slotSequence={slotSequence} slotOffset={slotOffset} slotRolling={slotRolling} exiting={slotExiting} getCategoryLabel={getCategoryLabel} getCategoryDescription={getCategoryDescription} spinIntervalMs={slotIntervalMs} totalSpinMs={slotSpinMs} scale={slotScale}/>
              </div>)}

            {(viewMode === 'question' || viewMode === 'calculating' || viewMode === 'answer') && renderQuestionFrame()}
          </>)}
      </div>
      {lastQuestion && showLastQuestion && (<div style={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    maxWidth: 340,
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.16)',
                    background: 'rgba(15,23,42,0.92)',
                    boxShadow: '0 18px 42px rgba(0,0,0,0.42)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 40
                }}>
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>Letzte Frage</div>
          <div style={{ fontWeight: 800, marginTop: 4 }}>{lastQuestion.text}</div>
          {lastQuestion.category && (<div style={{ color: '#cbd5e1', fontSize: 12, marginTop: 2 }}>
              Kategorie: {getCategoryLabel(lastQuestion.category)}
            </div>)}
          <button style={{
                    marginTop: 10,
                    padding: '6px 10px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#e5e7eb',
                    fontWeight: 700,
                    cursor: 'pointer'
                }} onClick={function () { return setShowLastQuestion(false); }}>
            Overlay ausblenden
          </button>
        </div>)}
      {lastQuestion && !showLastQuestion && (<button style={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.16)',
                    background: 'rgba(0,0,0,0.65)',
                    color: '#e2e8f0',
                    fontWeight: 800,
                    cursor: 'pointer',
                    zIndex: 35
                }} onClick={function () { return setShowLastQuestion(true); }}>
          Letzte Frage anzeigen
        </button>)}
    </main>
  );
};

const beamerAurora = (color: string): React.CSSProperties => ({position}: 'absolute',
  inset: 0,
  background: `radial-gradient(circle at 20% 20%, ${color}33, transparent 32%), radial-gradient(circle at 80% 0%, ${color}26, transparent 38%)`,
  filter: 'blur(8px)',
  animation: 'aurora-shift 16s ease-in-out infinite'
});

const beamerShell: React.CSSProperties = {position}: 'relative',
  maxWidth: 1380,
  margin: '0 auto',
  padding: '0 16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12
};
const offlineBar = (status: typeof connectionStatus, lang: Lang) =>
    status === 'connected'
      ? null
      : (
          <div style={{
                position: 'fixed',
                top: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '8px 12px',
                borderRadius: 12,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.45)',
                color: '#fecdd3',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                zIndex: 25
            }}>
            {status === 'connecting'
                ? lang === 'de'
                    ? 'Verbinde erneut ...'
                    : 'Reconnecting ...'
                : lang === 'de'
                    ? 'Offline - Bitte neu laden'
                    : 'Offline - please reload'}
            {status === 'disconnected' && (<button style={{
                    padding: '6px 10px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#e5e7eb',
                    fontWeight: 700,
                    cursor: 'pointer'
                }} onClick={handleReconnect}>
                {lang === 'de' ? 'Neu laden' : 'Reload'}
              </button>)}
          </div>
        );

const cardButtonStyle: React.CSSProperties = {padding}: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  cursor: 'pointer',
  fontWeight: 700
};

const cardFrame: React.CSSProperties = {position}: 'relative',
  borderRadius: 24,
  border: 'none',
  background: 'transparent',
  boxShadow: 'none',
  padding: 0
};

export default BeamerView;

















        </>);
    };
};
