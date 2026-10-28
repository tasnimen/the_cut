import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

export function loadSeedEnvironment(directory, nodeEnv = process.env.NODE_ENV, loader = loadEnvConfig) {
  return loader(directory, nodeEnv === "development");
}
