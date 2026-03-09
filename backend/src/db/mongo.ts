import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/kioskquiz';

export function getMongoEnvSource(): 'MONGODB_URI' | 'DATABASE_URL' | 'default-local' {
  if (process.env.MONGODB_URI?.trim()) return 'MONGODB_URI';
  if (process.env.DATABASE_URL?.trim()) return 'DATABASE_URL';
  return 'default-local';
}

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      retryWrites: true,
      writeConcern: { w: 'majority' },
      serverSelectionTimeoutMS: 5000
    });
    console.log('✓ MongoDB verbunden');
    return true;
  } catch (err) {
    console.error('✗ MongoDB Verbindung fehlgeschlagen:', err);
    return false;
  }
}

export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}
