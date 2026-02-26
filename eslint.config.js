import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["src/pages/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/data/local/*", "@/data/firestore/*"],
              message:
                "Presentation layer should use data modules through '@/data' interfaces.",
            },
            {
              group: ["@/features/*/infrastructure/*"],
              message:
                "Presentation layer should depend on feature entrypoints/application APIs, not infrastructure adapters.",
            },
            {
              group: ["@/features/*/application/*", "@/features/*/domain/*"],
              message:
                "Presentation layer should import feature APIs from '@/features/<feature>' entrypoints.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/pages/*", "@/components/*"],
              message:
                "Feature layer must not depend on presentation components/pages.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ["src/components/**/index.ts", "src/components/**/index.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: [
      "src/components/theme-provider/theme-provider.tsx",
      "src/components/ui/button.tsx",
      "src/components/ui/sidebar.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
]);
