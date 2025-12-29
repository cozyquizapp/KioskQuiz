const toBoolean = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return fallback;
};

const mode = ((import.meta.env.VITE_APP_MODE as string | undefined) || 'cozy60').toLowerCase();

export const featureFlags = {
  mode,
  isCozyMode: mode === 'cozy60',
  showBingo: toBoolean(import.meta.env.VITE_FEATURE_BINGO, false),
  showLegacyPanels: toBoolean(import.meta.env.VITE_FEATURE_LEGACY_PANELS, false),
  showLegacyCategories: toBoolean(import.meta.env.VITE_FEATURE_LEGACY_CATEGORIES, false)
};

export type FeatureFlagKey = keyof typeof featureFlags;

export const isFeatureEnabled = (key: FeatureFlagKey) => Boolean(featureFlags[key]);
