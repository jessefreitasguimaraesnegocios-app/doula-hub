import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      ".output/**",
      ".vinxi/**",
      ".vercel/**",
      ".lovable/**",
      ".wrangler/**",
      "supabase/.temp/**",
      "node_modules/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["api/**/*.ts", "vite-dev-api.ts", "vite.config.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      prettier,
    },
    rules: {
      "no-restricted-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    ignores: ["api/**", "vite.config.ts", "vite-dev-api.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      prettier,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "This project does not use the Next.js `server-only` package. Use a `src/lib/server/*` module imported only from `/api` or dev middleware.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  eslintConfigPrettier,
);
