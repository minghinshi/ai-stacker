/// <reference types="vitest/config" />

import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  // Make sure NODE_ENV is not set to production
  // Some test helpers, like act(), are unavailable in production
  test: {
    env: {
      NODE_ENV: "test",
    },
  },
});
