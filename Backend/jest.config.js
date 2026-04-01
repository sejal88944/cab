/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.js'],
    collectCoverageFrom: [
        'services/**/*.js',
        '!**/node_modules/**',
    ],
    coverageDirectory: 'coverage',
    clearMocks: true,
};
