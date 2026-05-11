import argon2 from 'argon2';

export function createAuthService(authRepository) {
  return {
    async register({ email, password }) {
      const existing = await authRepository.findByEmail(email);
      if (existing) {
        const error = new Error('Email вже використовується');
        error.statusCode = 409;
        throw error;
      }

      const hashedPassword = await argon2.hash(password);
      const user = await authRepository.create({
        email,
        password: hashedPassword,
      });

      return { id: user.id, email: user.email };
    },

    async login({ email, password }) {
      const user = await authRepository.findByEmail(email);
      if (!user) {
        const error = new Error('Невірний email або пароль');
        error.statusCode = 401;
        throw error;
      }

      const isValid = await argon2.verify(user.password, password);
      if (!isValid) {
        const error = new Error('Невірний email або пароль');
        error.statusCode = 401;
        throw error;
      }

      return { id: user.id, email: user.email };
    },

    async getMe(userId) {
      const user = await authRepository.findById(userId);
      if (!user) {
        const error = new Error('Користувача не знайдено');
        error.statusCode = 404;
        throw error;
      }
      return { id: user.id, email: user.email };
    },
  };
}
