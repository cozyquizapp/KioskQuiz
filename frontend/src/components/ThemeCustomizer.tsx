import React, { useState, useEffect } from 'react';

export interface ThemeConfig {
  id: string;
  name: string;
  label: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    success: string;
    error: string;
    warning: string;
    border: string;
  };
}

// Default themes
export const THEME_PRESETS: Record<string, ThemeConfig> = {
  light: {
    id: 'light',
    name: 'Light',
    label: '☀️ Light',
    colors: {
      primary: '#0891b2',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#0f172a',
      textMuted: '#64748b',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      border: 'rgba(15, 23, 42, 0.08)'
    }
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    label: '🌙 Dark',
    colors: {
      primary: '#06b6d4',
      secondary: '#a78bfa',
      accent: '#ff79c6',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      success: '#4ade80',
      error: '#f87171',
      warning: '#fbbf24',
      border: 'rgba(255, 255, 255, 0.08)'
    }
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    label: '⚡ Neon',
    colors: {
      primary: '#00ffff',
      secondary: '#ff00ff',
      accent: '#ffff00',
      background: '#0a0a0a',
      surface: '#1a1a1a',
      text: '#ffffff',
      textMuted: '#a0a0a0',
      success: '#00ff00',
      error: '#ff0055',
      warning: '#ff8800',
      border: 'rgba(0, 255, 255, 0.2)'
    }
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    label: '🎨 Custom',
    colors: {
      primary: '#06b6d4',
      secondary: '#a78bfa',
      accent: '#ff79c6',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      success: '#4ade80',
      error: '#f87171',
      warning: '#fbbf24',
      border: 'rgba(255, 255, 255, 0.08)'
    }
  }
};

interface ThemeCustomizerProps {
  onThemeChange?: (theme: ThemeConfig) => void;
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ onThemeChange }) => {
  const [selectedTheme, setSelectedTheme] = useState<string>('dark');
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(THEME_PRESETS.dark);
  const [showCustomEditor, setShowCustomEditor] = useState(false);

  // Load saved theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('app-theme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentTheme(parsed);
        setSelectedTheme(parsed.id);
      } catch {
        // Fallback to dark theme
      }
    }
  }, []);

  // Apply theme to document and localStorage
  const applyTheme = (theme: ThemeConfig) => {
    setCurrentTheme(theme);
    setSelectedTheme(theme.id);

    // Apply CSS variables to document root
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Save to localStorage
    localStorage.setItem('app-theme', JSON.stringify(theme));
    localStorage.setItem('theme-id', theme.id);

    onThemeChange?.(theme);
  };

  const handlePresetChange = (presetId: string) => {
    const preset = THEME_PRESETS[presetId];
    if (preset) {
      applyTheme(preset);
      setShowCustomEditor(false);
    }
  };

  const handleColorChange = (colorKey: keyof ThemeConfig['colors'], value: string) => {
    const updated = {
      ...currentTheme,
      colors: {
        ...currentTheme.colors,
        [colorKey]: value
      },
      id: 'custom',
      name: 'Custom'
    };
    applyTheme(updated);
  };

  const resetToPreset = (presetId: string) => {
    handlePresetChange(presetId);
  };

  return (
    <div style={{ padding: '16px', color: '#f1f5f9' }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
          🎨 Theme Selector
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
          {Object.values(THEME_PRESETS).slice(0, 4).map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id)}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: selectedTheme === preset.id ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.12)',
                background: selectedTheme === preset.id ? 'rgba(6,182,212,0.15)' : 'rgba(15,23,42,0.6)',
                color: '#f1f5f9',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6
              }}
              onMouseEnter={(e) => {
                if (selectedTheme !== preset.id) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(15,23,42,0.8)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTheme !== preset.id) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(15,23,42,0.6)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
                }
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color Preview */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: 12, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Color Palette
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
          {Object.entries(currentTheme.colors).slice(0, 6).map(([key, color]) => (
            <div
              key={key}
              style={{
                padding: '8px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(15,23,42,0.5)'
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 6,
                  background: color,
                  marginBottom: 6,
                  border: `1px solid rgba(255,255,255,0.2)`
                }}
              />
              <div style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 500 }}>
                {key}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Editor Toggle */}
      <div>
        <button
          onClick={() => setShowCustomEditor(!showCustomEditor)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(15,23,42,0.6)',
            color: '#cbd5e1',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).background = 'rgba(15,23,42,0.8)';
          }}
        >
          {showCustomEditor ? '▼ Hide Custom Editor' : '▶ Advanced: Edit Colors'}
        </button>
      </div>

      {/* Custom Color Editor */}
      {showCustomEditor && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 8,
            border: '1px solid rgba(106,90,205,0.3)',
            background: 'rgba(106,90,205,0.08)',
            maxHeight: 400,
            overflowY: 'auto'
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>
            🎨 Custom Colors
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {Object.entries(currentTheme.colors).map(([key, color]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  htmlFor={`color-${key}`}
                  style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 500, textTransform: 'capitalize' }}
                >
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    id={`color-${key}`}
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(key as keyof ThemeConfig['colors'], e.target.value)}
                    style={{
                      width: 40,
                      height: 32,
                      borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => handleColorChange(key as keyof ThemeConfig['colors'], e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(15,23,42,0.7)',
                      color: '#f1f5f9',
                      fontSize: 11,
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {currentTheme.id === 'custom' && (
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => resetToPreset('dark')}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(15,23,42,0.6)',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                Reset to Dark
              </button>
              <button
                onClick={() => resetToPreset('light')}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(15,23,42,0.6)',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                Reset to Light
              </button>
            </div>
          )}
        </div>
      )}

      {/* Current Theme Info */}
      <div
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 8,
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.2)',
          fontSize: 12,
          color: '#bbf7d0'
        }}
      >
        ✓ Current Theme: <strong>{currentTheme.name}</strong>
        <br />
        {currentTheme.id === 'custom' && (
          <span style={{ fontSize: 11, color: '#86efac', marginTop: 4, display: 'block' }}>
            💾 Saved to localStorage
          </span>
        )}
      </div>
    </div>
  );
};
