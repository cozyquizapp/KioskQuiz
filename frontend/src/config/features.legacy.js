"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFeatureEnabled = exports.featureFlags = void 0;
var toBoolean = function (value, fallback) {
    if (value === undefined || value === null)
        return fallback;
    if (typeof value === 'boolean')
        return value;
    var normalized = String(value).trim().toLowerCase();
    if (!normalized)
        return fallback;
    if (normalized === 'true' || normalized === '1')
        return true;
    if (normalized === 'false' || normalized === '0')
        return false;
    return fallback;
};
var mode = (import.meta.env.VITE_APP_MODE || 'cozy60').toLowerCase();
var singleSessionRoomCode = (_b = (((_a = import.meta.env.VITE_SINGLE_SESSION_ROOM_CODE) === null || _a === void 0 ? void 0 : _a.trim().toUpperCase()) || 'MAIN')) !== null && _b !== void 0 ? _b : 'MAIN';
exports.featureFlags = {
    mode: mode,
    isCozyMode: mode === 'cozy60',
    showBingo: toBoolean(import.meta.env.VITE_FEATURE_BINGO, false),
    showLegacyPanels: toBoolean(import.meta.env.VITE_FEATURE_LEGACY_PANELS, false),
    showLegacyCategories: toBoolean(import.meta.env.VITE_FEATURE_LEGACY_CATEGORIES, false),
    singleSessionMode: toBoolean(import.meta.env.VITE_SINGLE_SESSION_MODE, true),
    singleSessionRoomCode: singleSessionRoomCode
};
var isFeatureEnabled = function (key) { return Boolean(exports.featureFlags[key]); };
exports.isFeatureEnabled = isFeatureEnabled;
