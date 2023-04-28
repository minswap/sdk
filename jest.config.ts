import { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  projects: [
    {
      testEnvironment: "jsdom",
      testPathIgnorePatterns: ["/dist/", "/node_modules/", "__tests__/data"],
      extensionsToTreatAsEsm: [".ts"],
      transform: {
        "^.+\\.[tj]sx?$": [
          "ts-jest",
          {
            useESM: true,
            tsconfig: {
              target: "esnext",
              module: "esnext",
            },
          },
        ],
      },
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
      },
    },
  ],
  // Required or Jest will throw an error about serializing BigInts
  // maxWorkers: 1,
};

export default config;
