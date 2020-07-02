import warning from 'warning';
import { isFunction } from './utils';

export default {
  show() {
    const a = warning('');
    return isFunction(a);
  },
};
