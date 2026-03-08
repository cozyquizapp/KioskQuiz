import mongoose from 'mongoose';
import { AnyQuestion, CozyQuizDraft } from '../../../shared/quizTypes';

// Flexible Schema für alle Question-Typen
const QuestionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  category: { type: String, required: true, index: true },
  mechanic: { type: String, required: true },
  question: { type: String, required: true },
  questionEn: String,
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
