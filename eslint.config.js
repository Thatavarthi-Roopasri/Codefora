import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      "frontend/dist/**",
      "backend/data/**",
      "coverage/**",
      "tmp-logs/**"
    ]
  },
  {
    files: ["backend/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.node,
        document: "readonly",
        fetch: "readonly"
      }
    },
    rules: {
      "no-empty": "warn",
      "no-useless-assignment": "warn",
      "no-useless-catch": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
    }
  },
  {
    files: ["frontend/src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        ...globals.es2024
      }
    },
    rules: {
      "no-empty": "warn",
      "no-useless-catch": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^React$" }]
    }
  }
];
