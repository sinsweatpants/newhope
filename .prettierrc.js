module.exports = {
  // Formatting options
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  endOfLine: 'lf',

  // JSX specific options
  jsxSingleQuote: false,
  jsxBracketSameLine: false,

  // Other formatting options
  arrowParens: 'avoid',
  bracketSpacing: true,
  bracketSameLine: false,
  embeddedLanguageFormatting: 'auto',
  htmlWhitespaceSensitivity: 'css',
  insertPragma: false,
  proseWrap: 'preserve',
  requirePragma: false,
  vueIndentScriptAndStyle: false,

  // Plugin configurations
  plugins: [
    'prettier-plugin-organize-imports',
    'prettier-plugin-tailwindcss'
  ],

  // File-specific overrides
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always'
      }
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    }
  ]
};