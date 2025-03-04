module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    EXPERIMENTAL_useProjectService: true, // Helps with TypeScript version warnings
  },
  env: {
    node: true,
    browser: true,
    es6: true,
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended',
    // Optional: Comment this out if too strict for current codebase state
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    // ESLint rules
    'no-console': 'warn',
    'no-debugger': 'warn',
    'no-duplicate-imports': 'error',
    'no-unused-vars': 'off', // TypeScript handles this
    'prefer-const': 'error',
    'spaced-comment': ['error', 'always'],
    'require-await': 'off', // Turn off require-await for production code

    // TypeScript rules
    // TypeScript rules
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off', // Changed from warn to off
    '@typescript-eslint/no-unused-vars': ['warn', { // Changed from error to warn
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-non-null-assertion': 'off', // Changed from warn to off
    '@typescript-eslint/consistent-type-assertions': 'warn', // Changed from error to warn
    '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'], // Changed from error to warn
    '@typescript-eslint/array-type': ['warn', { default: 'array-simple' }], // Changed from error to warn
    // Additional relaxed rules
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/unbound-method': 'warn',
    '@typescript-eslint/ban-types': 'warn',
    '@typescript-eslint/no-var-requires': 'warn',
    // Prettier integration
    'prettier/prettier': 'error',
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage'],
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
  overrides: [
    {
      // Override for example files
      files: ['**/examples/**/*.ts', '**/example/**/*.ts', '**/*.example.ts'],
      rules: {
        'no-console': 'off', // Allow console.log in examples
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
      }
    },
    {
      // Override for test files
      files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*.ts', '**/__tests__/**/*.ts'],
      parserOptions: {
        project: null, // Don't require tsconfig for test files
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        // Removed 'plugin:@typescript-eslint/recommended-requiring-type-checking' for test files
        'prettier',
      ],
      rules: {
        // Relax rules for test files
        'no-console': 'off', // Allow console.log in tests
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/unbound-method': 'off',
        '@typescript-eslint/ban-ts-comment': 'off', // Allow @ts-ignore in tests
        '@typescript-eslint/ban-types': 'off', // Allow {} and Function types in tests
        '@typescript-eslint/no-var-requires': 'off', // Allow require statements in tests
        '@typescript-eslint/no-unsafe-argument': 'off', // Turn off unsafe argument check in tests
        'no-duplicate-imports': 'off' // Allow duplicate imports in test files
      }
    }
  ],
};

