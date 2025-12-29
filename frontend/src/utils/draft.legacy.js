"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDraftTheme = void 0;
exports.loadPlayDraft = loadPlayDraft;
exports.savePlayDraft = savePlayDraft;
var KEY = 'kiosk-quiz-play-draft';
var getDraftTheme = function () { var _a; return (_a = loadPlayDraft()) === null || _a === void 0 ? void 0 : _a.theme; };
exports.getDraftTheme = getDraftTheme;
function loadPlayDraft() {
    try {
        var raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch (e) {
        console.error('Draft konnte nicht geladen werden', e);
        return null;
    }
}
function savePlayDraft(draft) {
    try {
        localStorage.setItem(KEY, JSON.stringify(draft));
        return draft;
    }
    catch (e) {
        console.error('Draft konnte nicht gespeichert werden', e);
        return null;
    }
}
