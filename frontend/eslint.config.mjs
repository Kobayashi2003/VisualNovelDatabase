import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This codebase deliberately fetches in effects and reflects the result
      // (and the synchronous loading/reset state) via setState — the standard
      // pre-`use()` data-fetching pattern. The rule flags every such effect;
      // rewriting them all around it would be churn without benefit, so it is
      // disabled project-wide rather than per-line in ~30 places.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
