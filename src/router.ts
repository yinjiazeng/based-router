import warning from 'warning';
import { isFunction, isPlainObject, globalWindow, noop } from './utils';
import { parser, pathToRegexp, normalizePath, restorePath } from './path';
import {
  Location,
  PathRegexp,
  BlockData,
  ListenerCallback,
  BlockCallback,
  PushFunction,
  CreateRouterFunction,
  LocationObject,
} from './typings';

const { location: globalLocation, history } = globalWindow;
// 监听列表
let listeners: Array<ListenerCallback> = [];
// location额外的数据
let extraData: any = {};
// 是否创建过路由
let created = false;
// 执行路由监听器标记，0不能执行，1可以执行，2可以执行，但不能执行冻结回调
let listenerFlag = 1;
// path对应的正则集合
let pathRegexps: PathRegexp = {};
// 是否是hash类型
let isHash = true;
// 默认路由选项
const defaultOptions = {
  // 路由类型 hash or browser
  type: 'hash',
  // 路由路径通用前缀
  basename: '/',
};
// 路由选项
let options = defaultOptions;
// 当前location
let currentLocation: Location;
// 阻塞回调
let blockCallback: Function | null = null;
// 卸载回调
let unmount: any = null;
// 阻塞路由控制
export let blockData: BlockData = {};

const getOriginPath = () => {
  const { pathname, search, hash } = globalWindow.location;
  let originPath = '';

  if (isHash) {
    originPath = hash.substr(1);
  } else {
    originPath = pathname + search + hash;
  }

  return decodeURI(originPath);
};

const getMergeLocation = () => {
  const mergeLocation = { ...location(), ...extraData };
  // 临时数据，仅用一次
  extraData = {};
  return mergeLocation;
};

const callListener = (location?: any) => {
  // 一次change可能有多个listeners，只创建一次location
  let current = location;
  listeners.forEach((callback) => {
    if (!current) {
      current = getMergeLocation();
    }
    callback(current);
  });
};

const routerEventListener = () => {
  if (listenerFlag) {
    // 检测路由是否冻结
    if (listenerFlag === 1 && (isFunction(blockData.callback) || isFunction(blockCallback))) {
      // 记录待跳转的数据
      if (!blockData.toLocation) {
        blockData.toLocation = getMergeLocation();
      }

      const { toLocation } = blockData;
      const { url, data, reload }: any = toLocation;
      const callback = blockData.callback || blockCallback;

      if (callback) {
        callback(
          (isLeave: boolean | undefined) => {
            blockData = {};
            listenerFlag = 2;
            if (isLeave) {
              callListener(toLocation);
            } else {
              push(url, data, reload);
            }
          },
          (path: string) => {
            listenerFlag = 0;
            blockData.toLocation = null;
            replace(path);
          },
          blockData.toLocation,
        );
      }
    } else {
      callListener();
    }
  }
  listenerFlag = 1;
};

const routeTo = (...args: any) => {
  const type = args[0];
  const path = args[1];
  const data = args[2];
  let isReload = args[3];
  if (path) {
    if (typeof data === 'boolean') {
      isReload = data;
    }
    if (typeof isReload === 'boolean') {
      extraData.reload = isReload;
    }
    if (isPlainObject(data) || isFunction(data)) {
      extraData.data = data;
    }

    let url = combinePath(path);
    const originPath = getOriginPath();

    if (url !== originPath) {
      if (isHash && !history.pushState && !history.replaceState) {
        if (type === 'push') {
          globalWindow.location.hash = url;
        } else {
          const { pathname, search } = globalWindow.location;
          globalWindow.location.replace(`${pathname + search}#${url}`);
        }
      } else {
        if (isHash) {
          url = `#${url}`;
        }
        history[type === 'push' ? 'pushState' : 'replaceState']({ url }, '', url);
        routerEventListener();
      }
    } else if (isReload === true) {
      routerEventListener();
    }
  }
};

export const location = () => {
  const originPath = getOriginPath();
  return parser(originPath.replace(new RegExp(`^${options.basename}`), ''));
};

export const block = (callback: BlockCallback) => {
  if (!blockCallback) {
    if (isFunction(callback)) {
      blockCallback = (enter: Function, restore: Function, toLocation: Location) => {
        const isLeave = callback(currentLocation, toLocation, () => enter()) !== false;
        if (isLeave) {
          enter(isLeave);
        } else {
          restore(currentLocation.url);
        }
      };
    }
  } else {
    warning(false, 'Router blocking can only be created once!');
  }
};

export const combinePath = (path: LocationObject | string = '') => {
  const url = restorePath(path);
  const searchIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');
  let pathname = url;
  let rest = '';

  if (searchIndex !== -1) {
    pathname = url.substr(0, searchIndex);
    rest = url.substr(searchIndex);
  } else if (hashIndex !== -1) {
    pathname = url.substr(0, hashIndex);
    rest = url.substr(hashIndex);
  }

  return normalizePath(`${options.basename}/${pathname}`) + rest;
};

export const push: PushFunction = (...args: any) => {
  routeTo('push', ...args);
};

export const replace: PushFunction = (...args: any) => {
  routeTo('replace', ...args);
};

export const reload = () => {
  const { url } = location();
  replace(url, true);
};

export const back = (step?: number) => {
  history.back(step);
};

export const forward = (step?: number) => {
  history.forward(step);
};

export const removeListener = (...args: Array<ListenerCallback>) => {
  // 移除所有
  if (!args.length) {
    listeners = [];
  } else {
    listeners = listeners.filter((cb) => cb !== args[0]);
  }
};

export const listener = (callback: ListenerCallback) => {
  if (isFunction(callback)) {
    listeners.push(callback);
    // 执行一次
    callback(location(), true);
    return () => {
      removeListener(callback);
    };
  }
  return noop;
};

export const create: CreateRouterFunction = (...args: any) => {
  let [routerOptions, callback] = args;

  if (isFunction(routerOptions)) {
    callback = routerOptions;
    routerOptions = null;
  }

  if (routerOptions && routerOptions.context) {
    if (unmount) {
      unmount();
    }
    globalWindow.location = routerOptions.context;
  }

  if (!created) {
    created = true;
    options = { ...options, ...routerOptions };
    isHash = options.type !== 'browser';
    const eventType = isHash ? 'hashchange' : 'popstate';

    listener((loc, isInit) => {
      callback((currentLocation = loc), isInit);
    });

    globalWindow.addEventListener(eventType, routerEventListener);

    return (unmount = () => {
      created = false;
      globalWindow.removeEventListener(eventType, routerEventListener);
      removeListener();
      pathRegexps = {};
      options = defaultOptions;
      isHash = true;
      globalWindow.location = globalLocation;
      blockCallback = null;
      blockData = {};
    });
  }

  warning(false, 'Router can only be created once!');
};

export const match = (locationData: Location, path: string, returnLocation?: Boolean) => {
  const { pathname } = locationData;
  const normalPath = normalizePath(path);
  let pathRegexp = pathRegexps[normalPath];

  if (!pathRegexp) {
    pathRegexp = pathToRegexp(normalPath);
    pathRegexps[normalPath] = pathRegexp;
  }

  const pathnameMatch = pathname.match(pathRegexp);

  if (pathnameMatch && returnLocation) {
    const pathMatch = path.match(/\/:(\w+)/g);
    if (pathMatch) {
      const params = {};
      pathMatch.forEach((param, i) => {
        const name = param.replace(/^\/:/, '');
        const value = pathnameMatch[i + 1];
        if (value !== undefined) {
          params[name] = value.replace(/^\//, '');
        }
      });
      return {
        ...locationData,
        params,
      };
    }
    return locationData;
  }

  return !!pathnameMatch;
};

export const matchPath = (...args: [Location, string]) => {
  return match(args[0], args[1], true);
};
