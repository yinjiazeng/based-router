import isString from 'lodash/isString';
import isPlainObject from 'lodash/isPlainObject';
import isFunction from 'lodash/isFunction';
import noop from 'lodash/noop';

export const globalWindow =
  typeof window !== 'undefined' && typeof window.document !== 'undefined'
    ? window
    : {
        addEventListener: noop,
        removeEventListener: noop,
        location: {
          pathname: '',
          search: '',
          hash: '',
          replace: noop,
        },
        history: {
          pushState: noop,
          replaceState: noop,
          back: noop,
          forward: noop,
        },
      };

export { isString, isPlainObject, isFunction, noop };
