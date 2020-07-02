import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import typescript from 'rollup-plugin-typescript';
import commonjs from 'rollup-plugin-commonjs';
import uglify from 'rollup-plugin-uglify';

const PROD = process.env.NODE_ENV === 'production';

const config = {
  input: 'src/index.ts',
  external: [
    'warning',
    'lodash/isFunction',
    'lodash/isString',
    'lodash/isObjectLike',
    'lodash/noop',
  ],
  output: {
    file: `dist/router${PROD ? '.min' : ''}.js`,
    format: 'umd',
    name: 'router',
    sourcemap: true,
    globals: {
      warning: 'warning',
      'lodash/isFunction': '_.isFunction',
      'lodash/isString': '_.isString',
      'lodash/isObjectLike': '_.isObjectLike',
      'lodash/noop': '_.noop',
    },
  },
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**',
    }),
    typescript({ module: 'CommonJS' }),
    commonjs({ extensions: ['.ts'], exclude: 'node_modules/**' }),
  ],
};

if (PROD) {
  config.plugins.push(
    uglify.uglify({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
      },
    }),
  );
}

export default config;
