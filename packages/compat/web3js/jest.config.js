/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.tests.json' }],
    },
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*-test.ts?(x)'],
};
