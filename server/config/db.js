import mongoose from 'mongoose';

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== 'production',
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}
