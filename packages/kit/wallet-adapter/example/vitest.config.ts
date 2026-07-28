import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        conditions: ['browser'],
    },
    test: {
        environment: 'jsdom',
        include: ['src/__tests__/**/*-test.{ts,tsx}'],
        server: {
            deps: {
                // Bundle the Solana packages through Vite so they resolve their browser builds — the
                // wallet plugin's SSR stub disables discovery, and the node build of the reactive
                // action store calls Node's events.once with a jsdom AbortSignal it rejects.
                inline: [/@solana\//],
            },
        },
        setupFiles: ['./vitest.setup.ts'],
    },
});
