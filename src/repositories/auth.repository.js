import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export function createAuthRepository(db) {
  return {
    async findByEmail(email) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return user ?? null;
    },

    async findById(id) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return user ?? null;
    },

    async create({ email, password }) {
      const [result] = await db.insert(users).values({ email, password });
      return { id: result.insertId, email };
    },
  };
}
