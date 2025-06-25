import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  prettier,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        // Cloudflare Workers globals
        Request: "readonly",
        Response: "readonly",
        URL: "readonly",
        fetch: "readonly",
        btoa: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        KVNamespace: "readonly",
        ExecutionContext: "readonly",
        global: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": ["error", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      
      // General rules
      "no-console": "off", // Allow console in Workers
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
      "no-unused-vars": "off", // Use TypeScript version instead
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      // Allow console in tests
      "no-console": "off",
      // Allow any in tests for mocking
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    ignores: ["dist/", "node_modules/", ".wrangler/"],
  },
];