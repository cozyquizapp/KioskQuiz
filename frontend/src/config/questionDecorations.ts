import type { DecorationKey } from '@shared/quizTypes';

// Assets liegen im public/decorations Ordner und sind per Root-Pfad erreichbar.
export const DECORATION_ICONS: Record<DecorationKey, string> = {
  moon: '/decorations/moon.png',
  earth: '/decorations/earth.png',
  cheese: '/decorations/cheese.png',
  target: '/decorations/target.png',
  ruler: '/decorations/ruler.png',
  measuringCup: '/decorations/measuring-cup.png',
  dice: '/decorations/dice.png',
  questionBag: '/decorations/question-bag.png',
  camera: '/decorations/camera.png',
  filmStrip: '/decorations/film-strip.png',
  lightbulb: '/decorations/lightbulb.png',
  book: '/decorations/book.png',
  stopwatch: '/decorations/stopwatch.png',
};
