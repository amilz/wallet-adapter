/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@solana/web3\\.js$': 'web3js-v3',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.tests.json', useESM: true }],
    },
    setupFiles: ['<rootDir>/jest.setup.cjs'],
    testEnvironment: 'jsdom',
    testMatch: ['<rootDir>/src/**/__tests__/**/*-test.ts?(x)'],
};
