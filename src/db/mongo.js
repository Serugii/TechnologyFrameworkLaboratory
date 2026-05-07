import fp from 'fastify-plugin';
import mongoose from 'mongoose';

async function mongoPlugin(fastify) {
  try {
    const mongoUri = `${fastify.config.MONGO_URL}/${fastify.config.MONGO_DB_NAME}`;
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    fastify.log.info('MongoDB connected');
    fastify.decorate('db', mongoose.connection);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
  fastify.addHook('onClose', async () => {
    await mongoose.connection.close();
    fastify.log.info('MongoDB connection closed');
  });
}

export default fp(mongoPlugin);
