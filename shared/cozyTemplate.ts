import { CozyQuestionSlotTemplate } from './quizTypes';

export const COZY_SLOT_TEMPLATE: CozyQuestionSlotTemplate[] = [
  { index: 0, segmentIndex: 0, type: 'MU_CHO', defaultPoints: 1, label: 'Slot 1 - Multiple Choice Warmup' },
  { index: 1, segmentIndex: 0, type: 'SCHAETZCHEN', defaultPoints: 1, label: 'Slot 2 - Schätzfrage' },
  { index: 2, segmentIndex: 0, type: 'STIMMTS', defaultPoints: 1, label: 'Slot 3 - Stimmts / 10 Punkte verteilen' },
  { index: 3, segmentIndex: 0, type: 'CHEESE', defaultPoints: 1, label: 'Slot 4 - Cheese (Bildfrage)' },
  { index: 4, segmentIndex: 0, type: 'BUNTE_TUETE', defaultPoints: 1, label: 'Slot 5 - Bunte Tuete Top 5', bunteKind: 'top5' },
  { index: 5, segmentIndex: 0, type: 'BUNTE_TUETE', defaultPoints: 1, label: 'Slot 6 - Bunte Tuete 8 Dinge, 1 falsch', bunteKind: 'oneOfEight' },
  { index: 6, segmentIndex: 0, type: 'BUNTE_TUETE', defaultPoints: 1, label: 'Slot 7 - Bunte Tuete Ordnen', bunteKind: 'order' },
  { index: 7, segmentIndex: 0, type: 'CHEESE', defaultPoints: 1, label: 'Slot 8 - Cheese (Bildfrage)' },
  { index: 8, segmentIndex: 0, type: 'MU_CHO', defaultPoints: 1, label: 'Slot 9 - Multiple Choice' },
  { index: 9, segmentIndex: 0, type: 'SCHAETZCHEN', defaultPoints: 1, label: 'Slot 10 - Schätzfrage' },
  { index: 10, segmentIndex: 1, type: 'STIMMTS', defaultPoints: 2, label: 'Slot 11 - Stimmts / 10 Punkte verteilen' },
  { index: 11, segmentIndex: 1, type: 'CHEESE', defaultPoints: 2, label: 'Slot 12 - Cheese (Bildfrage)' },
  { index: 12, segmentIndex: 1, type: 'BUNTE_TUETE', defaultPoints: 2, label: 'Slot 13 - Bunte Tuete Praezisiere Antwort', bunteKind: 'precision' },
  { index: 13, segmentIndex: 1, type: 'MU_CHO', defaultPoints: 2, label: 'Slot 14 - Multiple Choice' },
  { index: 14, segmentIndex: 1, type: 'SCHAETZCHEN', defaultPoints: 2, label: 'Slot 15 - Schätzfrage' },
  { index: 15, segmentIndex: 1, type: 'BUNTE_TUETE', defaultPoints: 2, label: 'Slot 16 - Bunte Tuete Ordnen', bunteKind: 'order' },
  { index: 16, segmentIndex: 1, type: 'CHEESE', defaultPoints: 2, label: 'Slot 17 - Cheese (Bildfrage)' },
  { index: 17, segmentIndex: 1, type: 'MU_CHO', defaultPoints: 2, label: 'Slot 18 - Multiple Choice' },
  { index: 18, segmentIndex: 1, type: 'SCHAETZCHEN', defaultPoints: 2, label: 'Slot 19 - Schätzfrage' },
  { index: 19, segmentIndex: 1, type: 'BUNTE_TUETE', defaultPoints: 2, label: 'Slot 20 - Bunte Tuete Top 5', bunteKind: 'top5' }
];
