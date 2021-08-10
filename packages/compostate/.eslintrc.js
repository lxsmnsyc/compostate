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
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "import/no-mutable-exports": "off",
    "no-param-reassign": "off",
    "no-plusplus": "off"
  }
};