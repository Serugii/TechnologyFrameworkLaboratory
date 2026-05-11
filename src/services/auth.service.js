import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema.js';
import { REDIS_KEYS, REDIS_TTL } from '#constants/redis';

export class AuthService {
  constructor(db, redis) {
    this.db = db;
    this.redis = redis;
  }

  async register(email, password) {
    const [existing] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existing) {
      const error = new Error('Email already in use');
      error.statusCode = 409;
      throw error;
    }

    const hashedPassword = await argon2.hash(password);

    const [result] = await this.db.insert(users).values({
      email,
      password: hashedPassword,
    });

    return { id: result.insertId, email };
  }

  async login(email, password) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    const isValid = await argon2.verify(user.password, password);

    if (!isValid) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    return { id: user.id, email: user.email };
  }

  async saveRefreshToken(userId, token) {
    const key = REDIS_KEYS.REFRESH_TOKEN(userId);
    await this.redis.set(key, token, 'EX', REDIS_TTL.REFRESH_TOKEN);
  }

  async getRefreshToken(userId) {
    const key = REDIS_KEYS.REFRESH_TOKEN(userId);
    return this.redis.get(key);
  }

  async deleteRefreshToken(userId) {
    const key = REDIS_KEYS.REFRESH_TOKEN(userId);
    await this.redis.del(key);
  }

  async blacklistToken(jti, ttl) {
    const key = REDIS_KEYS.TOKEN_BLACKLIST(jti);
    await this.redis.set(key, '1', 'EX', ttl);
  }
}
