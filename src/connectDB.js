import mongoose from 'mongoose';

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: process.env.NODE_ENV !== 'development',
};

export async function connectDatabase(host, port, database) {
  try {
    await mongoose.connect(`mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASS}@${host}:${port}/${database}`, options);
    mongoose.set('useFindAndModify', false);

    mongoose.connection.on('error', err => {
      logger.error(err);
    });

    logger.info(`Mongo database connection successful on ${host}:${port}/${database}`);

  } catch (error) {
    logger.error(`Mongo database connection failed on ${host}:${port}/${database}`);
    logger.error(error);
  }
}
