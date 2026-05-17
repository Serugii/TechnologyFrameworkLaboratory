import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/tests/setup.js'],
    env: {
      NODE_ENV: 'test',
    },
    envFile: '.env.test',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.js'],
      exclude: [
        'src/db/**',
        'src/scripts/**',
        'src/plugins/**',
        'src/schemas/**',
        'src/constants/**',
        'src/events/**',
        'src/models/**',
        'src/routes/**',
        'src/controllers/**',
        'src/services/github.service.v1.js',
        'src/services/github.service.v2.js',
        'src/services/device.service.v2.js',
        'src/repositories/**',
        'src/tests/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
