module.exports = {
  "root": true,
  "extends": [
    'lxsmnsyc/typescript',
  ],
  "parserOptions": {
    "project": "./tsconfig.eslint.json",
    "tsconfigRootDir": __dirname,
  },
  "rules": {
    "import/no-extraneous-dependencies": [
      "error", {
        "devDependencies": ["**/*.test.tsx"]
      }
    ],
    "no-param-reassign": "off",
    "no-plusplus": "off",
    "no-restricted-syntax": "off",
    "no-continue": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "prefer-object-spread": "off"
  },
};