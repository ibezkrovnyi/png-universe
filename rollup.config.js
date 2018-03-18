import builtins from 'rollup-plugin-node-builtins'; // TODO: temporary, required for pngjs
import globals from 'rollup-plugin-node-globals'; // TODO: temporary, required for pngjs
import sourcemaps from 'rollup-plugin-sourcemaps';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'dist/esm/image-q.js',
  output: {
    file: 'dist/umd/image-q.umd.js',
    format: 'umd',
    name: 'image-q',
    exports: 'named',
    sourcemap: true
  },
  plugins: [
    sourcemaps(),
    resolve(),
    commonjs(),
    globals(),
    builtins(),
  ]
};