module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // A new feature
        'fix',      // A bug fix
        'docs',     // Documentation only changes
        'style',    // Changes that do not affect the meaning of the code
        'refactor', // A code change that neither fixes a bug nor adds a feature
        'perf',     // A code change that improves performance
        'test',     // Adding missing tests or correcting existing tests
        'build',    // Changes that affect the build system or external dependencies
        'ci',       // Changes to our CI configuration files and scripts
        'chore',    // Other changes that don't modify src or test files
        'revert',   // Reverts a previous commit
        'wip',      // Work in progress
        'security', // Security improvements
        'deps',     // Dependency updates
        'ui',       // UI/UX improvements
        'i18n',     // Internationalization
        'config',   // Configuration changes
        'release'   // Release commits
      ]
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-enum': [
      2,
      'always',
      [
        // Core areas
        'core',
        'shared',
        'types',
        'utils',

        // Frontend areas
        'frontend',
        'ui',
        'components',
        'hooks',
        'editor',
        'toolbar',
        'dialog',

        // Backend areas
        'backend',
        'api',
        'auth',
        'db',
        'storage',
        'routes',

        // Services
        'services',
        'ocr',
        'gemini',
        'classification',
        'pipeline',
        'agents',
        'cache',
        'performance',
        'memory',

        // Screenplay specific
        'screenplay',
        'formatting',
        'patterns',
        'coordinator',
        'classifier',

        // Infrastructure
        'config',
        'build',
        'deploy',
        'deps',
        'ci',
        'testing',
        'docs',

        // Firebase
        'firebase',
        'functions',
        'hosting',
        'firestore',

        // Development
        'dev',
        'lint',
        'prettier',
        'typescript',
        'vite',
        'eslint'
      ]
    ],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [2, 'always', 100]
  },
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)(?:\((.*)\))?: (.*)$/,
      headerCorrespondence: ['type', 'scope', 'subject']
    }
  },
  ignores: [
    // Ignore certain patterns
    (commit) => commit.includes('[skip ci]'),
    (commit) => commit.includes('[ci skip]'),
    (commit) => commit.includes('WIP:'),
    (commit) => commit.includes('wip:')
  ],
  defaultIgnores: true,
  helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint'
};