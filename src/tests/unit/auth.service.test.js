import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthService } from '../../services/auth.service.js';

vi.mock('argon2', () => ({
  default: {
    hash: vi.fn(async (password) => `hashed_${password}`),
    verify: vi.fn(async (hash, password) => hash === `hashed_${password}`),
  },
}));

function makeRepo(overrides = {}) {
  return {
    findByEmail: vi.fn(async () => null),
    findById: vi.fn(async () => null),
    create: vi.fn(async ({ email }) => ({ id: 1, email })),
    ...overrides,
  };
}

describe('AuthService — register', () => {
  it('успішно реєструє нового користувача', async () => {
    const repo = makeRepo();
    const service = createAuthService(repo);

    const result = await service.register({
      email: 'user@test.com',
      password: 'secret123',
    });

    expect(result).toEqual({ id: 1, email: 'user@test.com' });
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('кидає 409, якщо email вже зайнятий', async () => {
    const repo = makeRepo({
      findByEmail: vi.fn(async () => ({ id: 1, email: 'user@test.com' })),
    });
    const service = createAuthService(repo);

    await expect(
      service.register({ email: 'user@test.com', password: 'secret123' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('не зберігає пароль у відкритому вигляді', async () => {
    const repo = makeRepo();
    const service = createAuthService(repo);

    await service.register({ email: 'a@b.com', password: 'mypass' });

    const callArg = repo.create.mock.calls[0][0];
    expect(callArg.password).not.toBe('mypass');
    expect(callArg.password).toMatch(/^hashed_/);
  });
});

describe('AuthService — login', () => {
  const existingUser = {
    id: 42,
    email: 'user@test.com',
    password: 'hashed_correct',
  };

  it('успішно логінить із правильним паролем', async () => {
    const repo = makeRepo({
      findByEmail: vi.fn(async () => existingUser),
    });
    const service = createAuthService(repo);

    const result = await service.login({
      email: 'user@test.com',
      password: 'correct',
    });

    expect(result).toEqual({ id: 42, email: 'user@test.com' });
  });

  it('кидає 401 якщо користувача не існує', async () => {
    const repo = makeRepo({ findByEmail: vi.fn(async () => null) });
    const service = createAuthService(repo);

    await expect(
      service.login({ email: 'nobody@test.com', password: 'x' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('кидає 401 якщо пароль неправильний', async () => {
    const repo = makeRepo({
      findByEmail: vi.fn(async () => existingUser),
    });
    const service = createAuthService(repo);

    await expect(
      service.login({ email: 'user@test.com', password: 'wrong' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('AuthService — getMe', () => {
  it('повертає дані користувача за id', async () => {
    const repo = makeRepo({
      findById: vi.fn(async () => ({ id: 5, email: 'me@test.com' })),
    });
    const service = createAuthService(repo);

    const result = await service.getMe(5);
    expect(result).toEqual({ id: 5, email: 'me@test.com' });
  });

  it('кидає 404 якщо користувача не знайдено', async () => {
    const repo = makeRepo({ findById: vi.fn(async () => null) });
    const service = createAuthService(repo);

    await expect(service.getMe(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});
