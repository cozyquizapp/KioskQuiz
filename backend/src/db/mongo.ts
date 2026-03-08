import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kioskquiz';

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
