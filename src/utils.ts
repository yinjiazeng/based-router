import isString from 'lodash/isString';
import isObjectLike from 'lodash/isObjectLike';
import isFunction from 'lodash/isFunction';
import noop from 'lodash/noop';

export const globalWindow = typeof window !== 'undefined' && typeof window.document !== 'undefined'
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
    },
  };

export {
  isString, isObjectLike, isFunction, noop,
};
