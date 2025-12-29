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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublishedQuizzes = exports.publishQuiz = exports.publishCozyDraft = exports.saveCozyDraft = exports.fetchCozyDraft = exports.createCozyDraft = exports.listCozyDrafts = exports.publishStudioDraft = exports.fetchStudioDraft = exports.fetchStudioDrafts = exports.fetchQuestionStat = exports.postQuestionStats = exports.postRunStats = exports.fetchLeaderboard = exports.saveQuizLayout = exports.fetchQuizLayout = exports.updateQuestion = exports.createQuestion = exports.fetchQuestions = exports.resetQuestionLayout = exports.setQuestionLayout = exports.setQuestionMeta = exports.deleteQuestionImage = exports.uploadQuestionImage = exports.createCustomQuiz = exports.setLanguage = exports.fetchLanguage = exports.fetchTimer = exports.stopTimer = exports.startTimer = exports.overrideAnswer = exports.markBingoCell = exports.fetchBingoBoard = exports.startNextQuestion = exports.useQuiz = exports.deleteQuiz = exports.fetchQuizzes = exports.kickTeam = exports.fetchScoreboard = exports.revealAnswers = exports.resolveGeneric = exports.resolveEstimate = exports.fetchAnswers = exports.submitAnswer = exports.fetchCurrentQuestion = exports.fetchHealth = exports.startQuestion = exports.joinRoom = void 0;
var API_BASE = import.meta.env.VITE_API_BASE ||
    "".concat(window.location.protocol, "//").concat(window.location.hostname, ":4000/api");
var joinRoom = function (roomCode, teamName, teamId) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/join"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ teamName: teamName, teamId: teamId })
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Beitritt fehlgeschlagen');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.joinRoom = joinRoom;
var startQuestion = function (roomCode, questionId) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/start-question"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questionId: questionId })
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Start fehlgeschlagen');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.startQuestion = startQuestion;
var fetchHealth = function () { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/health"))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Backend nicht erreichbar');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchHealth = fetchHealth;
var fetchCurrentQuestion = function (roomCode) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/current-question"))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Laden der Frage fehlgeschlagen');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchCurrentQuestion = fetchCurrentQuestion;
var submitAnswer = function (roomCode, teamId, answer) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/answer"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ teamId: teamId, answer: answer })
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Antwort konnte nicht gesendet werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.submitAnswer = submitAnswer;
var fetchAnswers = function (roomCode) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/answers"))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Antworten konnten nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchAnswers = fetchAnswers;
var resolveEstimate = function (roomCode) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/resolve"), { method: 'POST' })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Auswertung fehlgeschlagen');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.resolveEstimate = resolveEstimate;
var resolveGeneric = function (roomCode) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/resolve"), { method: 'POST' })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Auswertung fehlgeschlagen');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.resolveGeneric = resolveGeneric;
// Neue API: Aufdecken / reveal
var revealAnswers = function (roomCode) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/reveal"), { method: 'POST' })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Aufdecken fehlgeschlagen');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.revealAnswers = revealAnswers;
var fetchScoreboard = function (roomCode) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/scoreboard"))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Scoreboard konnte nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchScoreboard = fetchScoreboard;
var kickTeam = function (roomCode, teamId) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/teams/").concat(teamId), {
                    method: 'DELETE'
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Team konnte nicht entfernt werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.kickTeam = kickTeam;
// Quiz Templates
var fetchQuizzes = function () { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/quizzes"))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Quizzes konnten nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchQuizzes = fetchQuizzes;
var deleteQuiz = function (quizId) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/quizzes/").concat(quizId), { method: 'DELETE' })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Quiz konnte nicht gel├Âscht werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.deleteQuiz = deleteQuiz;
var useQuiz = function (roomCode, quizId) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/use-quiz"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quizId: quizId })
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Quiz konnte nicht gesetzt werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.useQuiz = useQuiz;
var startNextQuestion = function (roomCode) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/next-question"), {
                    method: 'POST'
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('N├ñchste Frage konnte nicht gestartet werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.startNextQuestion = startNextQuestion;
// Bingo
var fetchBingoBoard = function (roomCode, teamId) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/board/").concat(teamId))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Bingo-Board konnte nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchBingoBoard = fetchBingoBoard;
var markBingoCell = function (roomCode, teamId, cellIndex) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/bingo/mark"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ teamId: teamId, cellIndex: cellIndex })
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Feld konnte nicht markiert werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.markBingoCell = markBingoCell;
// Manuelle Korrektur einer Antwort
var overrideAnswer = function (roomCode, teamId, isCorrect) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/answers/override"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ teamId: teamId, isCorrect: isCorrect })
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Korrektur fehlgeschlagen');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.overrideAnswer = overrideAnswer;
// Timer
var startTimer = function (roomCode, seconds) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/timer/start"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ seconds: seconds })
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Timer konnte nicht gestartet werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.startTimer = startTimer;
var stopTimer = function (roomCode) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/timer/stop"), { method: 'POST' })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Timer konnte nicht gestoppt werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.stopTimer = stopTimer;
var fetchTimer = function (roomCode) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/timer"))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Timer-Status konnte nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchTimer = fetchTimer;
// Sprache
var fetchLanguage = function (roomCode) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/language"))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Sprache konnte nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchLanguage = fetchLanguage;
var setLanguage = function (roomCode, language) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/rooms/").concat(roomCode, "/language"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ language: language })
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Sprache konnte nicht gespeichert werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.setLanguage = setLanguage;
// Custom Quiz erstellen (Creator)
var createCustomQuiz = function (name, questionIds, extras) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/quizzes/custom"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(__assign({ name: name, questionIds: questionIds }, extras))
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Quiz konnte nicht gespeichert werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.createCustomQuiz = createCustomQuiz;
// Frage-Bild hochladen
var uploadQuestionImage = function (questionId, file) { return __awaiter(void 0, void 0, void 0, function () {
    var form, res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                form = new FormData();
                form.append('file', file);
                form.append('questionId', questionId);
                return [4 /*yield*/, fetch("".concat(API_BASE, "/upload/question-image"), {
                        method: 'POST',
                        body: form
                    })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Bild-Upload fehlgeschlagen');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.uploadQuestionImage = uploadQuestionImage;
var deleteQuestionImage = function (questionId) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/upload/question-image"), {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questionId: questionId })
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Bild konnte nicht entfernt werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.deleteQuestionImage = deleteQuestionImage;
// Frage-Metadaten (z. B. mixedMechanic, answer) setzen
var setQuestionMeta = function (questionId, payload) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/questions/").concat(questionId, "/meta"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Metadaten konnten nicht gespeichert werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.setQuestionMeta = setQuestionMeta;
// Frage-Layout setzen (Offsets)
var setQuestionLayout = function (questionId, payload) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/questions/").concat(questionId, "/layout"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Layout konnte nicht gespeichert werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.setQuestionLayout = setQuestionLayout;
var resetQuestionLayout = function (questionId) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/questions/").concat(questionId, "/layout"), { method: 'DELETE' })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Layout konnte nicht zur├╝ckgesetzt werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.resetQuestionLayout = resetQuestionLayout;
// Fragen laden (mit Usage/Images)
var fetchQuestions = function () { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/questions"))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Fragen konnten nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchQuestions = fetchQuestions;
// Neue Frage anlegen (nur f├╝r Admin/Creator)
var createQuestion = function (payload) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/questions"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Frage konnte nicht angelegt werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.createQuestion = createQuestion;
var updateQuestion = function (id, payload) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/questions/").concat(id), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Frage konnte nicht aktualisiert werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.updateQuestion = updateQuestion;
// Quiz Layout (Presentation)
var fetchQuizLayout = function (quizId) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/quizzes/").concat(quizId, "/layout"))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Layout konnte nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchQuizLayout = fetchQuizLayout;
var saveQuizLayout = function (quizId, layout) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/quizzes/").concat(quizId, "/layout"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(layout)
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Layout konnte nicht gespeichert werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.saveQuizLayout = saveQuizLayout;
// Stats & Leaderboard
var fetchLeaderboard = function () { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/stats/leaderboard"))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Leaderboard konnte nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchLeaderboard = fetchLeaderboard;
var postRunStats = function (payload) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/stats/run"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Run-Stats konnten nicht gespeichert werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.postRunStats = postRunStats;
var postQuestionStats = function (payload) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/stats/question"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Frage-Stats konnten nicht gespeichert werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.postQuestionStats = postQuestionStats;
var fetchQuestionStat = function (questionId) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/stats/question/").concat(questionId))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Frage-Stat konnte nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchQuestionStat = fetchQuestionStat;
// Studio Drafts (Quiz-Definitionen)
var fetchStudioDrafts = function () { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/studio/quizzes"))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Drafts konnten nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchStudioDrafts = fetchStudioDrafts;
var fetchStudioDraft = function (draftId) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/studio/quizzes/").concat(draftId))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Draft konnte nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchStudioDraft = fetchStudioDraft;
var publishStudioDraft = function (draft) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/studio/quizzes"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(draft)
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Draft konnte nicht gespeichert werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.publishStudioDraft = publishStudioDraft;
var listCozyDrafts = function () { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/studio/cozy60"))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Cozy-Drafts konnten nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.listCozyDrafts = listCozyDrafts;
var createCozyDraft = function (meta) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/studio/cozy60"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ meta: meta })
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Draft konnte nicht erstellt werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.createCozyDraft = createCozyDraft;
var fetchCozyDraft = function (draftId) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/studio/cozy60/").concat(draftId))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Draft konnte nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.fetchCozyDraft = fetchCozyDraft;
var saveCozyDraft = function (draftId, payload) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/studio/cozy60/").concat(draftId), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Draft konnte nicht gespeichert werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.saveCozyDraft = saveCozyDraft;
var publishCozyDraft = function (draftId, payload) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/studio/cozy60/").concat(draftId, "/publish"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload !== null && payload !== void 0 ? payload : {})
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Draft konnte nicht veroeffentlicht werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.publishCozyDraft = publishCozyDraft;
// Published Quizzes (für Moderator/Beamer auswählbar)
var publishQuiz = function (payload) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/quizzes/publish"), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Quiz konnte nicht veroeffentlicht werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.publishQuiz = publishQuiz;
var listPublishedQuizzes = function () { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(API_BASE, "/quizzes/published"))];
            case 1:
                res = _a.sent();
                if (!res.ok)
                    throw new Error('Veröffentlichte Quizzes konnten nicht geladen werden');
                return [2 /*return*/, res.json()];
        }
    });
}); };
exports.listPublishedQuizzes = listPublishedQuizzes;
