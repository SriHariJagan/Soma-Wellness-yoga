import mongoose from 'mongoose';
import logger from '../notification/logger.js';

const MODULE = 'Database';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function connectWithRetry(uri, attempt = 1) {
  try {
    await mongoose.connect(uri, {
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
    });
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      logger.warn(MODULE, `MongoDB connection attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms`, {
        error: err.message,
      });
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectWithRetry(uri, attempt + 1);
    }
    throw err;
  }
}

export async function connectDB(uri) {
  if (!uri) throw new Error('MONGO_URI is not configured in server/.env');

  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (err) => {
    logger.error(MODULE, 'MongoDB connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn(MODULE, 'MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info(MODULE, 'MongoDB reconnected');
  });

  await connectWithRetry(uri);

  logger.info(MODULE, 'MongoDB connected', { db: mongoose.connection.name });
  return mongoose.connection;
}

export default connectDB;
