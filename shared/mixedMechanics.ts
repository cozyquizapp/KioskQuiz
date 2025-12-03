import { MixedMechanicId } from './quizTypes';

export interface MixedMechanic {
  id: MixedMechanicId;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
}

export const MIXED_MECHANICS: MixedMechanic[] = [
  {
    id: 'sortieren',
    label: 'Sortieren',
    shortLabel: 'Sortieren',
    icon: '🔀',
    description: 'Bringt Begriffe in die richtige Reihenfolge (z. B. Nord → Süd).'
  },
  {
    id: 'praezise-antwort',
    label: 'Präzisere Antwort',
    shortLabel: 'Präzise',
    icon: '🎯',
    description: 'Alle antworten – wer am genauesten liegt, gewinnt.'
  },
  {
    id: 'wer-bietet-mehr',
    label: 'Wer bietet mehr?',
    shortLabel: 'Bieten',
    icon: '📈',
    description: 'Teams nennen, wie viele sie kennen – wer mehr bietet, muss liefern.'
  },
  {
    id: 'eine-falsch',
    label: 'Eine ist falsch',
    shortLabel: 'Eine falsch',
    icon: '❌',
    description: 'Mehrere Aussagen – eine ist gelogen. Welche?'
  },
  {
    id: 'three-clue-race',
    label: 'Three Clue Race',
    shortLabel: '3 Hinweise',
    icon: '🏁',
    description: 'Bis zu drei Hinweise – wer früher richtig liegt, holt den Punkt.'
  },
  {
    id: 'vier-woerter-eins',
    label: 'Vier Wörter – eins',
    shortLabel: '4→1',
    icon: '🧩',
    description: 'Vier Begriffe, eine gemeinsame Bedeutung/Ursprung.'
  }
];

export const mixedMechanicMap: Record<MixedMechanicId, MixedMechanic> = Object.fromEntries(
  MIXED_MECHANICS.map((m) => [m.id, m])
) as Record<MixedMechanicId, MixedMechanic>;
