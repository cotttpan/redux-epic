module.exports = {
  notify: true,
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'json',
  ],
  globals: {
    'ts-jest': {
      skipBabel: true,
    },
  },
}
