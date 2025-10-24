
import globals from "globals";
import pluginJs from "@eslint/js";
import pluginVue from "eslint-plugin-vue";


export default [
  {languageOptions: { globals: { ...globals.browser, ...globals.vitest, node: true } }},
  pluginJs.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    rules: {
      'no-unused-vars': ['error', { 'caughtErrorsIgnorePattern': '^_', 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }]
    }
  }
];
