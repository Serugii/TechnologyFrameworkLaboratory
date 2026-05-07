import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(
      // eslint-disable-next-line no-restricted-properties
      `${process.env.MONGO_URL}/${process.env.MONGO_DB_NAME}`,
    );

    console.log('Migration completed');

    await mongoose.connection.close();

    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
};

migrate();
