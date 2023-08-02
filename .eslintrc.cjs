module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json"],
  },
  plugins: [
    "@typescript-eslint",
    "simple-import-sort",
    "unused-imports",
    "unicorn",
  ],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  rules: {
    eqeqeq: "error",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "@typescript-eslint/no-namespace": "off",
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-floating-promises": "error",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "error",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "all",
        argsIgnorePattern: "^_",
      },
    ],
    "no-console": "warn",
    "unicorn/no-array-for-each": "error",
    "unicorn/prefer-regexp-test": "error",
  },
};
