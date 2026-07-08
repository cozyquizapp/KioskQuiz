import mongoose from 'mongoose';
import { AnyQuestion, CozyQuizDraft } from '../../../shared/quizTypes';

// Flexible Schema für alle Question-Typen
const QuestionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  category: { type: String, required: true, index: true },
  mechanic: { type: String, required: true },
  question: { type: String, required: true },
  questionEn: String,
  funFact: String,
  funFactEn: String,
  points: { type: Number, default: 1 },
  
  // Optional fields für verschiedene Typen
  options: [String],
  correct: [Number],
  answer: String,
  targetValue: Number,
  unit: String,
  imageUrl: String,
  tags: [String],
  
  // Metadaten
  isCustom: { type: Boolean, default: false },
  catalogId: { type: String, default: 'default' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Overrides (von questionOverrides)
  mixedMechanic: String,
  imageOffsetX: { type: Number, default: 0 },
  imageOffsetY: { type: Number, default: 0 },
  logoOffsetX: { type: Number, default: 0 },
  logoOffsetY: { type: Number, default: 0 },
  mediaSlots: mongoose.Schema.Types.Mixed
}, { strict: false });

export const Question = mongoose.model<AnyQuestion & Document>('Question', QuestionSchema);

export async function getQuestionsFromDB(): Promise<AnyQuestion[]> {
  try {
    const questions = await Question.find({}).lean();
    return questions as AnyQuestion[];
  } catch (err) {
    console.error('Fehler beim Laden aus MongoDB:', err);
    return [];
  }
}

export async function getCustomQuestionsFromDB(): Promise<AnyQuestion[]> {
  try {
    const questions = await Question.find({ isCustom: true }).lean();
    return questions as AnyQuestion[];
  } catch (err) {
    console.error('Fehler beim Laden custom questions:', err);
    return [];
  }
}

export async function saveQuestionToDB(question: AnyQuestion): Promise<AnyQuestion> {
  try {
    const existing = await Question.findOne({ id: question.id });
    if (existing) {
      Object.assign(existing, { ...question, updatedAt: new Date() });
      await existing.save();
      return question;
    } else {
      const newQuestion = new Question({ ...question, createdAt: new Date(), updatedAt: new Date() });
      await newQuestion.save();
      return question;
    }
  } catch (err) {
    console.error('Fehler beim Speichern zu MongoDB:', err);
    throw err;
  }
}

export async function deleteQuestionFromDB(id: string): Promise<boolean> {
  try {
    const result = await Question.deleteOne({ id });
    return result.deletedCount > 0;
  } catch (err) {
    console.error('Fehler beim Löschen aus MongoDB:', err);
    return false;
  }
}

export async function bulkUploadQuestionsToDB(questionsToAdd: Partial<AnyQuestion>[]): Promise<number> {
  try {
    const timestamp = new Date();
    const operations = questionsToAdd.map(q => ({
      updateOne: {
        filter: { id: q.id },
        update: { $set: { ...q, updatedAt: timestamp } },
        upsert: true
      }
    }));
    const result = await Question.bulkWrite(operations);
    return result.upsertedCount + result.modifiedCount;
  } catch (err) {
    console.error('Fehler beim Bulk Upload:', err);
    return 0;
  }
}

export async function initializeDefaultQuestions(defaultQuestions: AnyQuestion[]) {
  try {
    const count = await Question.countDocuments();
    if (count === 0) {
      console.log(`Initialisiere ${defaultQuestions.length} Standard-Fragen...`);
      await Question.insertMany(
        defaultQuestions.map(q => ({
          ...q,
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      );
      console.log(`✓ ${defaultQuestions.length} Standard-Fragen erstellt`);
    }
  } catch (err) {
    console.error('Fehler beim Initialisieren von Standard-Fragen:', err);
  }
}

// ============= COZY QUIZ DRAFTS =============

const CozyQuizDraftSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  meta: mongoose.Schema.Types.Mixed,
  questions: mongoose.Schema.Types.Mixed,
  blitz: mongoose.Schema.Types.Mixed,
  rundlauf: mongoose.Schema.Types.Mixed,
  enableBingo: { type: Boolean, default: false },
  status: { type: String, default: 'draft', enum: ['draft', 'published'] },
  lastPublishedAt: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

export const CozyQuizDraftModel = mongoose.model<CozyQuizDraft & Document>('CozyQuizDraft', CozyQuizDraftSchema);

export async function getCozyDraftFromDB(draftId: string): Promise<CozyQuizDraft | null> {
  try {
    const draft = await CozyQuizDraftModel.findOne({ id: draftId }).lean();
    return draft as CozyQuizDraft | null;
  } catch (err) {
    console.error('Fehler beim Laden von Cozy Draft aus MongoDB:', err);
    return null;
  }
}

export async function getAllCozyDraftsFromDB(): Promise<CozyQuizDraft[]> {
  try {
    const drafts = await CozyQuizDraftModel.find({}).lean().sort({ updatedAt: -1 });
    return drafts as CozyQuizDraft[];
  } catch (err) {
    console.error('Fehler beim Laden aller Cozy Drafts:', err);
    return [];
  }
}

export async function saveCozyDraftToDB(draft: CozyQuizDraft): Promise<CozyQuizDraft> {
  try {
    const existing = await CozyQuizDraftModel.findOne({ id: draft.id });
    if (existing) {
      const updated = await CozyQuizDraftModel.findOneAndUpdate(
        { id: draft.id },
        { ...draft, updatedAt: new Date() },
        { new: true }
      );
      return updated as CozyQuizDraft;
    } else {
      const newDraft = new CozyQuizDraftModel({ 
        ...draft, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      });
      await newDraft.save();
      return draft;
    }
  } catch (err) {
    console.error('Fehler beim Speichern von Cozy Draft zu MongoDB:', err);
    throw err;
  }
}

export async function deleteCozyDraftFromDB(draftId: string): Promise<boolean> {
  try {
    const result = await CozyQuizDraftModel.deleteOne({ id: draftId });
    return result.deletedCount > 0;
  } catch (err) {
    console.error('Fehler beim Löschen von Cozy Draft aus MongoDB:', err);
    return false;
  }
}

// ============= QUARTER QUIZ DRAFTS =============

const QQDraftSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, default: 'Untitled' },
  phases: { type: Number, default: 3 },
  language: { type: String, default: 'both' },
  questions: mongoose.Schema.Types.Mixed,
  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now },
}, { strict: false });

export const QQDraftModel = mongoose.model('QQDraft', QQDraftSchema);

export async function getAllQQDraftsFromDB(): Promise<any[]> {
  try {
    return await QQDraftModel.find({}).lean().sort({ updatedAt: -1 });
  } catch (err) {
    console.error('Fehler beim Laden aller QQ Drafts:', err);
    return [];
  }
}

export async function getQQDraftFromDB(draftId: string): Promise<any | null> {
  try {
    return await QQDraftModel.findOne({ id: draftId }).lean();
  } catch (err) {
    console.error('Fehler beim Laden von QQ Draft:', err);
    return null;
  }
}

export async function saveQQDraftToDB(draft: any): Promise<any> {
  try {
    const existing = await QQDraftModel.findOne({ id: draft.id });
    if (existing) {
      const updated = await QQDraftModel.findOneAndUpdate(
        { id: draft.id },
        { ...draft, updatedAt: Date.now() },
        { new: true }
      );
      return updated;
    } else {
      const newDraft = new QQDraftModel({ ...draft, createdAt: Date.now(), updatedAt: Date.now() });
      await newDraft.save();
      return draft;
    }
  } catch (err) {
    console.error('Fehler beim Speichern von QQ Draft:', err);
    throw err;
  }
}

export async function deleteQQDraftFromDB(draftId: string): Promise<boolean> {
  try {
    const result = await QQDraftModel.deleteOne({ id: draftId });
    return result.deletedCount > 0;
  } catch (err) {
    console.error('Fehler beim Löschen von QQ Draft:', err);
    return false;
  }
}

// ============= COZY GAMES (Mini-Game-Katalog) =============
// 2026-05-17 (Wolf-Feature CozyGames): Katalog analoger Real-Life-Mini-Spiele
// die als Brand-Differenziator ins Quiz eingebaut werden. Seed mit 12 V1-Spielen
// erfolgt beim ersten Backend-Start, Wolf kann via /cozygames-Editor erweitern.
// Doku: COZYGAMES.md + shared/cozyGameTypes.ts.

const CozyGameSchema = new mongoose.Schema({
  id:           { type: String, required: true, unique: true, index: true },
  emoji:        { type: String, default: '🎲' },
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  materialTags: { type: [String], default: [] },
  setting:      { type: String, default: 'tisch' },     // tisch|steh|wand|boden
  noiseLevel:   { type: String, default: 'leise' },     // leise|mittel|laut
  scoringType:  { type: String, default: 'countIn60s' },// countIn60s|timeToFinish|distance|height|lastStanding
  scoringNote:  { type: String, default: '' },
  isSeed:       { type: Boolean, default: false },
  archived:     { type: Boolean, default: false },
  createdAt:    { type: Number, default: Date.now },
  updatedAt:    { type: Number, default: Date.now },
}, { strict: false });

export const CozyGameModel = mongoose.model('CozyGame', CozyGameSchema);

export async function getAllCozyGamesFromDB(): Promise<any[]> {
  try {
    return await CozyGameModel.find({}).lean().sort({ createdAt: 1 });
  } catch (err) {
    console.error('Fehler beim Laden aller CozyGames:', err);
    return [];
  }
}

export async function getCozyGameFromDB(id: string): Promise<any | null> {
  try {
    return await CozyGameModel.findOne({ id }).lean();
  } catch (err) {
    console.error('Fehler beim Laden CozyGame:', err);
    return null;
  }
}

export async function saveCozyGameToDB(game: any): Promise<any> {
  try {
    const existing = await CozyGameModel.findOne({ id: game.id });
    if (existing) {
      const updated = await CozyGameModel.findOneAndUpdate(
        { id: game.id },
        { ...game, updatedAt: Date.now() },
        { new: true }
      );
      return updated;
    } else {
      const newGame = new CozyGameModel({
        ...game,
        createdAt: game.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      });
      await newGame.save();
      return game;
    }
  } catch (err) {
    console.error('Fehler beim Speichern CozyGame:', err);
    throw err;
  }
}

export async function deleteCozyGameFromDB(id: string): Promise<boolean> {
  try {
    const result = await CozyGameModel.deleteOne({ id });
    return result.deletedCount > 0;
  } catch (err) {
    console.error('Fehler beim Löschen CozyGame:', err);
    return false;
  }
}

/** Seed-Funktion: idempotent. Für jedes V1-Spiel: in DB anlegen wenn nicht da.
 *  Bestehende DB-Einträge (z.B. von Wolf editiert) bleiben unangetastet. */
export async function seedCozyGamesIfMissing(seedGames: any[]): Promise<number> {
  let inserted = 0;
  for (const g of seedGames) {
    try {
      const existing = await CozyGameModel.findOne({ id: g.id });
      if (existing) continue;
      const newGame = new CozyGameModel({ ...g });
      await newGame.save();
      inserted++;
    } catch (err) {
      console.warn(`[cozygames-seed] failed to insert ${g.id}:`, err);
    }
  }
  return inserted;
}

/** 2026-05-19 Migration: Syncs `parallel`-Flag aus Seed → DB für Seed-Spiele.
 *  2026-05-20: auf findOneAndUpdate+$set umgestellt — direct-assignment auf
 *  strict:false-Docs registriert Mongoose den Change nicht zuverlaessig. */
export async function syncCozyGameSeedFlags(seedGames: any[]): Promise<number> {
  let updated = 0;
  for (const g of seedGames) {
    try {
      const existing = await CozyGameModel.findOne({ id: g.id }).lean();
      if (!existing) continue;
      const seedParallel = g.parallel;
      const dbParallel = (existing as any).parallel;
      if (seedParallel !== dbParallel) {
        await CozyGameModel.updateOne({ id: g.id }, { $set: { parallel: seedParallel } });
        updated++;
      }
    } catch (err) {
      console.warn(`[cozygames-sync] failed to sync ${g.id}:`, err);
    }
  }
  return updated;
}

/** 2026-05-20 Migration: Syncs `nameEn` + `descriptionEn` aus Seed → DB.
 *  Wolf-Edits bleiben unangetastet (nur leere Felder werden gefuellt).
 *  Nutzt updateOne+$set statt save() — siehe Kommentar bei syncCozyGameSeedFlags. */
export async function syncCozyGameSeedI18n(seedGames: any[]): Promise<number> {
  let updated = 0;
  for (const g of seedGames) {
    try {
      const existing = await CozyGameModel.findOne({ id: g.id }).lean();
      if (!existing) continue;
      const seedNameEn = g.nameEn;
      const seedDescEn = g.descriptionEn;
      const patch: Record<string, string> = {};
      if (seedNameEn && !(existing as any).nameEn) patch.nameEn = seedNameEn;
      if (seedDescEn && !(existing as any).descriptionEn) patch.descriptionEn = seedDescEn;
      if (Object.keys(patch).length > 0) {
        await CozyGameModel.updateOne({ id: g.id }, { $set: patch });
        updated++;
      }
    } catch (err) {
      console.warn(`[cozygames-i18n] failed to sync ${g.id}:`, err);
    }
  }
  return updated;
}

// ============= QUARTER QUIZ GAME RESULTS =============

const QQGameResultSchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true, index: true },
  draftId:   { type: String, default: null },
  draftTitle:{ type: String, default: 'Unbekannt' },
  roomCode:  { type: String, default: '' },
  // 2026-07-08 (Wolf): Location/Event-Tag pro Spiel — Basis fuer die
  // „keine Wiederholung an derselben Location"-Filterung in der CozyLibrary.
  venue:     { type: String, default: '', index: true },
  playedAt:  { type: Number, default: Date.now, index: true },
  teams: mongoose.Schema.Types.Mixed,       // Array<{id, name, color, score}>
  winner:    { type: String, default: null }, // winning team name
  phases:    { type: Number, default: 3 },
  language:  { type: String, default: 'both' },
  grid:      mongoose.Schema.Types.Mixed,   // final territory grid
}, { strict: false });

export const QQGameResultModel = mongoose.model('QQGameResult', QQGameResultSchema);

export async function saveQQGameResult(result: any): Promise<void> {
  try {
    const doc = new QQGameResultModel({ ...result, id: result.id ?? `qqr-${Date.now().toString(36)}` });
    await doc.save();
    // 2026-05-24 (Wolf-Bug 'Spiel von gestern abend fehlt im Recap'): explicit
    // success-Log damit man im Coolify-Log sehen kann ob Save lief. Kombiniert
    // mit DB-Down-Detection im catch.
    console.log(`[QQGameResult] saved ${result.id ?? 'unknown'} (room=${result.roomCode}, title="${result.draftTitle}", playedAt=${new Date(result.playedAt ?? Date.now()).toISOString()})`);
  } catch (err) {
    console.error('[QQGameResult] SAVE FAILED:', err);
    // Try Sentry capture if available (fail-safe).
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require('@sentry/node');
      Sentry?.captureException?.(err, {
        tags: { feature: 'qq-game-result-save', roomCode: result?.roomCode ?? 'unknown' },
        extra: { resultId: result?.id, draftTitle: result?.draftTitle, playedAt: result?.playedAt },
      });
    } catch { /* Sentry not loaded / no-op */ }
  }
}

export async function getQQGameResults(limit = 50): Promise<any[]> {
  try {
    return await QQGameResultModel.find({}).lean().sort({ playedAt: -1 }).limit(limit);
  } catch (err) {
    console.error('Fehler beim Laden der QQ Spielergebnisse:', err);
    return [];
  }
}

export async function deleteQQGameResult(id: string): Promise<boolean> {
  try {
    const res = await QQGameResultModel.deleteOne({ id });
    return res.deletedCount > 0;
  } catch (err) {
    console.error('Fehler beim Löschen des QQ Spielergebnisses:', err);
    return false;
  }
}

export async function deleteAllQQGameResults(): Promise<number> {
  try {
    const res = await QQGameResultModel.deleteMany({});
    return res.deletedCount;
  } catch (err) {
    console.error('Fehler beim Löschen aller QQ Spielergebnisse:', err);
    return 0;
  }
}

// ============= QUARTER QUIZ FEEDBACK =============
// Spieler-Feedback von der Summary-Seite (/qq/summary/:roomCode).
// Persistent in Mongo statt File (Render Free Tier hat kein stabiles FS).

const QQFeedbackSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true, index: true },
  submittedAt: { type: Number, default: Date.now, index: true },
  roomCode:    { type: String, default: null },
  teamName:    { type: String, default: null },
  rating:      { type: Number, default: null },  // 1-5
  text:        { type: String, required: true },
  contact:     { type: String, default: null },
}, { strict: false });

export const QQFeedbackModel = mongoose.model('QQFeedback', QQFeedbackSchema);

export async function saveQQFeedbackToDB(entry: any): Promise<void> {
  try {
    const doc = new QQFeedbackModel(entry);
    await doc.save();
  } catch (err) {
    console.error('Fehler beim Speichern des QQ Feedbacks:', err);
    throw err;
  }
}

export async function getQQFeedbackFromDB(limit = 500): Promise<any[]> {
  try {
    return await QQFeedbackModel.find({}).lean().sort({ submittedAt: -1 }).limit(limit);
  } catch (err) {
    console.error('Fehler beim Laden des QQ Feedbacks:', err);
    return [];
  }
}

export async function deleteQQFeedbackFromDB(id: string): Promise<boolean> {
  try {
    const res = await QQFeedbackModel.deleteOne({ id });
    return res.deletedCount > 0;
  } catch (err) {
    console.error('Fehler beim Löschen eines QQ Feedbacks:', err);
    return false;
  }
}

// ============= QUARTER QUIZ REGULAR TEAMS (Stamm-Teams) =============
// 2026-05-02: Wiederkehr-Mechanik fuer Pub-Stammgaeste. Pro (pubCode, teamId)
// wird nach jedem Spiel ein Eintrag mit wins / gamesPlayed / lastPlayedAt
// upserted. Beim naechsten Mal kann der Spieler seinen Code eingeben und seine
// Win-Streak wird angezeigt — Retention-Hebel laut PM-Audit.
const QQRegularTeamSchema = new mongoose.Schema({
  teamId:       { type: String, required: true, index: true },  // = qq_teamId aus localStorage
  pubCode:      { type: String, required: true, index: true },  // = roomCode des Pubs
  teamName:     { type: String, default: '' },
  avatarId:     { type: String, default: 'fox' },
  wins:         { type: Number, default: 0 },
  gamesPlayed:  { type: Number, default: 0 },
  lastPlayedAt: { type: Number, default: Date.now, index: true },
  createdAt:    { type: Number, default: Date.now },
}, { strict: false });
QQRegularTeamSchema.index({ teamId: 1, pubCode: 1 }, { unique: true });

export const QQRegularTeamModel = mongoose.model('QQRegularTeam', QQRegularTeamSchema);

/** Liest Stamm-Team via teamId + pubCode. */
export async function getQQRegularTeam(teamId: string, pubCode: string): Promise<any | null> {
  try {
    return await QQRegularTeamModel.findOne({ teamId, pubCode }).lean();
  } catch (err) {
    console.error('Fehler beim Laden Stamm-Team:', err);
    return null;
  }
}

// ============= COZY LIBRARY ITEMS =============
// 2026-05-11: Pool von losen Einzel-Fragen — keine Drafts. Wolf zieht sie im
// CozyBuilder via „📚 Aus Library importieren" in seine aktuellen Quizze.
// Skalierbar auf 10k+ Items dank Indizes + Pagination + Topic-Filter.

const QQLibraryItemSchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true, index: true },
  category:  { type: String, required: true, index: true },
  topic:     { type: String, default: '', index: true },
  text:      { type: String, default: '' },
  textEn:    { type: String, default: '' },
  answer:    { type: String, default: '' },
  answerEn:  { type: String, default: '' },
  funFact:   { type: String, default: '' },
  funFactEn: { type: String, default: '' },
  // Mechanik-spezifisch:
  targetValue:        Number,
  unit:               String,
  unitEn:             String,
  isYearAnswer:       Boolean,
  options:            [String],
  optionsEn:          [String],
  correctOptionIndex: Number,
  bunteTuete:         mongoose.Schema.Types.Mixed,
  image:              mongoose.Schema.Types.Mixed,
  hostNote:           String,
  // Meta:
  source:    { type: String, default: 'seed', index: true },  // 'seed' | 'wolf' | 'ai'
  createdAt: { type: Number, default: Date.now, index: true },
  updatedAt: { type: Number, default: Date.now },
}, { strict: false });

export const QQLibraryItemModel = mongoose.model('QQLibraryItem', QQLibraryItemSchema);

export async function getQQLibraryItems(opts: {
  search?: string;
  category?: string;
  topic?: string;
  source?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ items: any[]; total: number }> {
  try {
    const filter: any = {};
    if (opts.category) filter.category = opts.category;
    if (opts.topic)    filter.topic    = opts.topic;
    if (opts.source)   filter.source   = opts.source;
    if (opts.search && opts.search.trim()) {
      const re = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      // 2026-05-11 (Audit P0): EN-Felder mitsuchen — TriviaDB-Import-Items
      // haben oft nur textEn/answerEn ohne DE-Übersetzung. Vorher waren die
      // bei DE-Suchbegriffen unsichtbar. Jetzt findet 'eiffel' auch 'Eiffel Tower'.
      filter.$or = [
        { text: re }, { textEn: re },
        { answer: re }, { answerEn: re },
        { topic: re }, { funFact: re }, { funFactEn: re },
      ];
    }
    const limit  = Math.min(opts.limit ?? 200, 500);
    const offset = Math.max(opts.offset ?? 0, 0);
    const [items, total] = await Promise.all([
      QQLibraryItemModel.find(filter).lean().sort({ createdAt: -1 }).skip(offset).limit(limit),
      QQLibraryItemModel.countDocuments(filter),
    ]);
    return { items, total };
  } catch (err) {
    console.error('Fehler beim Laden der Library-Items:', err);
    return { items: [], total: 0 };
  }
}

export async function getQQLibraryItem(id: string): Promise<any | null> {
  try { return await QQLibraryItemModel.findOne({ id }).lean(); }
  catch { return null; }
}

export async function upsertQQLibraryItem(item: any): Promise<void> {
  if (!item?.id) return;
  try {
    await QQLibraryItemModel.updateOne(
      { id: item.id },
      { $set: { ...item, updatedAt: Date.now() }, $setOnInsert: { createdAt: Date.now() } },
      { upsert: true },
    );
  } catch (err) {
    console.error('Fehler beim Upsert Library-Item:', err);
  }
}

export async function deleteQQLibraryItem(id: string): Promise<boolean> {
  try { return (await QQLibraryItemModel.deleteOne({ id })).deletedCount > 0; }
  catch { return false; }
}

/** Seed-Helper: Bulk-Upsert mit source='seed'. Idempotent — bestehende Items
 *  mit gleicher id werden überschrieben. */
export async function bulkUpsertQQLibrarySeed(items: any[]): Promise<number> {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const now = Date.now();
  try {
    const operations = items.map(it => ({
      updateOne: {
        filter: { id: it.id },
        update: {
          $set: { ...it, source: 'seed', updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    }));
    const result = await QQLibraryItemModel.bulkWrite(operations);
    return (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);
  } catch (err) {
    console.error('Fehler beim Seed-Bulk-Upsert Library:', err);
    return 0;
  }
}

/** Topic-Aggregation: Liste aller verwendeten Topics + Anzahl. */
export async function getQQLibraryTopics(): Promise<Array<{ topic: string; count: number }>> {
  try {
    const result = await QQLibraryItemModel.aggregate([
      { $match: { topic: { $ne: '' } } },
      { $group: { _id: '$topic', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return result.map((r: any) => ({ topic: r._id as string, count: r.count as number }));
  } catch (err) {
    console.error('Fehler beim Aggregieren der Library-Topics:', err);
    return [];
  }
}

// ============= QUARTER QUIZ QUESTION USAGE =============
// 2026-05-11: pro QQQuestion wird gezaehlt wie oft + wann + in welchem
// Room/Draft sie aktiviert wurde. Backbone fuer die CozyLibrary, damit Wolf
// nach 10 Monaten Pub-Quiz sieht welche Fragen schon (zu oft) gelaufen sind
// und nicht versehentlich Wiederholungen bei Stammgaesten serviert.
const QQQuestionUsageSchema = new mongoose.Schema({
  questionId: { type: String, required: true, unique: true, index: true },
  // letzter bekannter Text — fuer Backfill / Diagnose, falls die Frage aus
  // ihrem Draft geloescht oder umbenannt wurde.
  lastText:   { type: String, default: '' },
  category:   { type: String, default: '' },
  topic:      { type: String, default: '' },
  usageCount: { type: Number, default: 0, index: true },
  firstUsedAt:{ type: Number, default: 0 },
  lastUsedAt: { type: Number, default: 0, index: true },
  // Letzte N Spielsessions in denen die Frage lief — fuer "wo schon mal".
  // Wir limitieren auf 50 Eintraege, sonst waechst das Doc ungebremst.
  recentUses: [{
    roomCode:   String,
    draftId:    String,
    draftTitle: String,
    venue:      String, // 2026-07-08 (Wolf): Location/Event dieser Nutzung
    playedAt:   Number,
  }],
}, { strict: false });

export const QQQuestionUsageModel = mongoose.model('QQQuestionUsage', QQQuestionUsageSchema);

/** Idempotenter Hook: zaehlt eine Frage-Aktivierung. Wenn dieselbe Frage in
 *  derselben Session bereits gezaehlt wurde (gleiche roomCode + questionId in
 *  recentUses innerhalb von 5 Minuten), wird nichts gemacht — damit Reconnects /
 *  Re-Renders nicht doppelt zaehlen. */
export async function recordQQQuestionUsage(args: {
  questionId: string;
  text?: string;
  category?: string;
  topic?: string;
  roomCode?: string;
  draftId?: string;
  draftTitle?: string;
  venue?: string;
}): Promise<void> {
  const now = Date.now();
  const dedupeWindow = 5 * 60 * 1000;
  try {
    const existing = await QQQuestionUsageModel.findOne({ questionId: args.questionId }).lean();
    if (existing) {
      const recent = (existing.recentUses ?? []) as any[];
      const dup = recent.find((r: any) =>
        r?.roomCode === (args.roomCode ?? '') &&
        typeof r?.playedAt === 'number' &&
        (now - r.playedAt) < dedupeWindow
      );
      if (dup) return;
    }
    const newUse = {
      roomCode:   args.roomCode ?? '',
      draftId:    args.draftId ?? '',
      draftTitle: args.draftTitle ?? '',
      venue:      args.venue ?? '',
      playedAt:   now,
    };
    await QQQuestionUsageModel.updateOne(
      { questionId: args.questionId },
      {
        $set: {
          lastText:   args.text ?? '',
          category:   args.category ?? '',
          topic:      args.topic ?? '',
          lastUsedAt: now,
        },
        $setOnInsert: { firstUsedAt: now },
        $inc: { usageCount: 1 },
        $push: { recentUses: { $each: [newUse], $slice: -50 } },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error('Fehler beim Tracken der QQ Question Usage:', err);
  }
}

/** Map questionId → { usageCount, lastUsedAt, recentUses[] } für die Library. */
export async function getQQUsageMap(): Promise<Record<string, {
  usageCount: number;
  firstUsedAt: number;
  lastUsedAt: number;
  recentUses: Array<{ roomCode: string; draftId: string; draftTitle: string; venue?: string; playedAt: number }>;
}>> {
  try {
    const docs = await QQQuestionUsageModel.find({}).lean();
    const map: Record<string, any> = {};
    for (const d of docs) {
      const id = (d as any).questionId;
      if (!id) continue;
      map[id] = {
        usageCount:  (d as any).usageCount ?? 0,
        firstUsedAt: (d as any).firstUsedAt ?? 0,
        lastUsedAt:  (d as any).lastUsedAt ?? 0,
        recentUses:  (d as any).recentUses ?? [],
      };
    }
    return map;
  } catch (err) {
    console.error('Fehler beim Laden der QQ Usage Map:', err);
    return {};
  }
}

/** Distinct-Liste bisher genutzter Locations (Autocomplete im Moderator +
 *  „bei Ort X schon gespielt"-Filter in der CozyLibrary). Aus den Spielergebnissen
 *  gezogen (ein Eintrag pro Spiel), leere/ungetaggte ignoriert. */
export async function getQQVenues(): Promise<string[]> {
  try {
    const vals = await QQGameResultModel.distinct('venue');
    return (vals as unknown[])
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .sort((a, b) => a.localeCompare(b, 'de'));
  } catch (err) {
    console.error('Fehler beim Laden der QQ Venues:', err);
    return [];
  }
}

/** Wipe-All — Admin-Reset, falls Wolf bei 0 starten will. */
export async function clearQQQuestionUsage(): Promise<number> {
  try {
    const res = await QQQuestionUsageModel.deleteMany({});
    return res.deletedCount ?? 0;
  } catch (err) {
    console.error('Fehler beim Loeschen der QQ Question Usage:', err);
    return 0;
  }
}

/** Upsert nach Game-Over: pro Team gamesPlayed +1, fuer Sieger zusaetzlich wins +1. */
export async function upsertQQRegularTeams(
  pubCode: string,
  teams: { id: string; name: string; avatarId: string }[],
  winnerIds: string[],
): Promise<void> {
  if (!pubCode) return;
  const winnerSet = new Set(winnerIds);
  const now = Date.now();
  try {
    await Promise.all(teams.map(t =>
      QQRegularTeamModel.updateOne(
        { teamId: t.id, pubCode },
        {
          $set: { teamName: t.name, avatarId: t.avatarId, lastPlayedAt: now },
          $setOnInsert: { createdAt: now },
          $inc: {
            gamesPlayed: 1,
            wins: winnerSet.has(t.id) ? 1 : 0,
          },
        },
        { upsert: true },
      )
    ));
  } catch (err) {
    console.error('Fehler beim Upsert Stamm-Teams:', err);
  }
}
