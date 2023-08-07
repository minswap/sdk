import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";

const bundle = (config) => ({
  ...config,
  input: "src/index.ts",
  external: (id) => !/^[./]/.test(id),
});

export default [
  bundle({
    plugins: [esbuild()],
    output: [
      {
        file: `build/index.es.js`,
        format: "es",
        sourcemap: true,
      },
    ],
  }),
  bundle({
    plugins: [dts()],
    output: {
      file: `build/index.d.ts`,
      format: "es",
    },
  }),
];
