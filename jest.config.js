module.exports = {
  // Indicates the module system for Jest to use
  preset: 'ts-jest',
  
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)'
  ],
  
  // An array of regexp pattern strings that are matched against all test paths
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // A list of paths to directories that Jest should use to search for files in
  roots: [
    '<rootDir>/src'
  ],

  // Configure code coverage collection
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/examples/**',
    '!src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  
  // Transform files with ts-jest
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },

  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
};

