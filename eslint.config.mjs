import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    plugins: { sonarjs },
    rules: {
      // allow _prefixed params as intentionally unused
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // disallow explicit any — use unknown + narrowing instead
      "@typescript-eslint/no-explicit-any": "error",
      // ── SonarJS: only the duplication & complexity rules (warnings) ──────
      "sonarjs/no-duplicated-branches": "warn",
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/cognitive-complexity": ["warn", 25],
      "sonarjs/no-collapsible-if": "warn",
      "sonarjs/no-redundant-boolean": "warn",
    },
  },
]);

export default eslintConfig;
