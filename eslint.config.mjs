// ESLint-Konfig fuer CozyQuiz (frontend + backend + shared + tests).
//
// Absicht (2026-07-31, Stufe 0 aus STRUKTUR_PLAN.md): KEIN Stil-Linter.
// Diese Konfig enthaelt ausschliesslich Regeln, die echte Bugs finden.
// Formatierung, Namenskonventionen, `any`-Verbote und aehnliches sind
// bewusst AUS: bei ~129.000 Zeilen Bestand erzeugt das nur Rauschen, in
// dem die echten Treffer untergehen.
//
// Wer eine Regel ergaenzt: bitte nur, wenn ein Verstoss dagegen ein
// Verhalten kaputt macht, nicht wenn er nur unschoen aussieht.
//
// studio/ hat eine eigene eslint.config.js und bleibt hier aussen vor.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '_archive/**',
      'studio/**',        // eigene Konfig
      'preview/**',
      'uploads/**',
      '.shots/**',
      '.shots-quirks/**',
      'design-assets/**',
      'assets-source/**',
      '_source-assets/**',
      'findings/**',
      'scripts/**',       // Einmal-Skripte, teils .mjs/.js ohne Typen
      'frontend/public/**',
      '**/*.config.{js,mjs,cjs,ts}',
      'optimize-images.js',
      'shared/quizTypes.js',
    ],
  },

  // ── Basis: TS-Parser, aber ohne typ-gestuetzte Regeln ────────────────────
  // (typ-gestuetzt = eslint muesste das ganze Projekt kompilieren, das
  //  dauert auf diesem Bestand Minuten. Der Typecheck laeuft ohnehin
  //  separat als `npm run typecheck`.)
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // ── AUS: Rauschen ohne Bug-Relevanz ───────────────────────────────
      '@typescript-eslint/no-explicit-any': 'off',       // ~993 Bestandsfaelle, s. STRUKTUR_PLAN Stufe 1
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'off', // a && b() ist hier gaengiges Muster
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',    // Lazy-require im CommonJS-Backend ist Absicht
      'no-empty': 'off',
      'no-case-declarations': 'off',
      'no-undef': 'off',                                 // macht TypeScript besser
      'no-useless-escape': 'off',                        // Stil, kein Bug
      'no-extra-boolean-cast': 'off',                    // Stil, kein Bug
      'prefer-const': 'off',                             // Stil, kein Bug
      'no-control-regex': 'off',                         // Absicht in backend/src/validation.ts (Sanitizer)

      // ── WARNUNG: aufraeumenswert, blockiert aber nichts ────────────────
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // ── FEHLER: das sind echte Bugs ───────────────────────────────────
      'no-dupe-keys': 'error',          // doppelter Key im Objekt: der zweite gewinnt still
      'no-dupe-else-if': 'error',
      'no-dupe-args': 'error',
      'no-unsafe-negation': 'error',
      'no-unreachable': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-cond-assign': ['error', 'always'],
      'no-constant-binary-expression': 'error',
      'no-async-promise-executor': 'error',
      'no-fallthrough': 'error',
      'valid-typeof': 'error',
      'use-isnan': 'error',
      'require-atomic-updates': 'off',  // zu viele Fehlalarme bei async/await
    },
  },

  // ── Frontend: React-Hooks-Regeln ────────────────────────────────────────
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // ACHTUNG, das hier ist die interessanteste Regel im ganzen File.
      //
      // Stand 2026-07-31: 41 Verstoesse im Bestand, fast alle nach dem
      // Muster "Guard-Return vor den Hooks" (z. B. CozyQuizQuestionView:
      // `if (!q) return null;` und danach ~20 Hooks). Wenn so eine
      // Komponente montiert bleibt und die Bedingung kippt, wirft React
      // "Rendered more hooks than during the previous render" und die
      // Ansicht faellt in die ErrorBoundary. Bisher maskiert das meist ein
      // key-Remount, verlassen kann man sich darauf nicht.
      //
      // Deshalb hier nur 'warn': als Fehler wuerde es ab sofort jeden Push
      // blockieren. Abarbeiten steht als eigener Punkt im STRUKTUR_PLAN.
      // Sobald die 41 weg sind: auf 'error' hochziehen.
      'react-hooks/rules-of-hooks': 'warn',
      // Fehlende Dependencies sind die Hauptquelle fuer "Wert haengt fest"-
      // Bugs. Bestand ist gross (67), deshalb erstmal nur Warnung.
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // ── Backend: Node-Globals ───────────────────────────────────────────────
  {
    files: ['backend/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
);
