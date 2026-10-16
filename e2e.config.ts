import { web } from '@e2e-dev/web'
import type { E2EConfig } from 'e2e'

export default {
  timeout: 240_000,
  targets: [
    {
      name: 'example',
      engine: web(),
      app: {
        url: 'http://127.0.0.1:43180',
        command: {
          executable: 'npm',
          args: ['run', 'web', '--prefix', 'example'],
          // The runner gives the app process only PATH, HOME and temp variables plus this env.
          env: {
            NODE_ENV: 'development',
            CI: '1',
            EXPO_NO_TELEMETRY: '1',
            EXPO_NO_DOTENV: '1',
            BROWSER: 'none',
          },
          startupTimeout: 180_000,
          log: '.e2e/logs/example.log',
        },
      },
    },
    {
      name: 'docs',
      engine: web(),
      app: {
        url: 'http://127.0.0.1:43173/',
        command: {
          executable: 'npm',
          args: ['run', 'docs:dev'],
          env: { CI: '1' },
          startupTimeout: 120_000,
          log: '.e2e/logs/docs.log',
        },
      },
    },
  ],
} satisfies E2EConfig
