import warning from 'warning';
import { isFunction, isPlainObject, globalWindow, noop } from './utils';
import { parser, pathToRegexp, normalizePath, restorePath } from './path';
import {
  Location,
  ExtraLocation,
  MergeLocation,
  PathRegexp,
  BlockData,
  ListenerCallback,
  BlockCallback,
  ReplaceFunction,
  LocationFunction,
  CreateRouterFunction,
} from './typings';

const { location: globalLocation, history } = globalWindow;
// 监听列表
let listeners: Array<ListenerCallback> = [];
// location额外的数据
let extraData: ExtraLocation = {};
// 是否创建过路由
let created = false;
// 是否允许执行路由监听器
let allowCallListener = true;
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
// 卸载路由
let unmount: Function | null = null;
// 当前location
let currentLocation: MergeLocation;
// 阻塞回调
let blockCallback: Function | null = null;
// 阻塞路由控制
export let blockData: BlockData = {};

export const getOriginPath = () => {
  const { pathname, search, hash } = globalWindow.location;
  let originPath = '';

  if (isHash) {
    originPath = hash.substr(1);
  } else {
    originPath = pathname + search + hash;
  }

  return decodeURI(originPath);
};

export const getLocation = () => {
  const originPath = getOriginPath();
  return parser(originPath.replace(new RegExp(`^${options.basename}`), ''));
};

export const getMergeLocation = () => {
  const mergeLocation = { ...getLocation(), ...extraData };
  // 临时数据，仅用一次
  extraData = {};
  return mergeLocation;
};

export const block = (callback: BlockCallback) => {
  if (!blockCallback) {
    if (isFunction(callback)) {
      blockCallback = (enter: Function, restore: Function, toLocation: MergeLocation) => {
        const isEnter = callback(currentLocation, toLocation, enter) !== false;
        if (isEnter) {
          enter(isEnter);
        } else {
          restore(currentLocation.url);
        }
      };
    }
  } else {
    warning(false, 'router.block只能调用一次');
  }
};

export const callListener = () => {
  // 一次change可能有多个listeners，只创建一次location
  let current: MergeLocation;
  listeners.forEach((callback) => {
    if (!current) {
      current = getMergeLocation();
    }
    callback(current);
  });
};

export const routerEventListener = () => {
  if (allowCallListener) {
    // 检测路由是否冻结
    if (isFunction(blockData.callback) || isFunction(blockCallback)) {
      // 记录待跳转的数据
      if (!blockData.toLocation) {
        blockData.toLocation = getMergeLocation();
      }

      const { url, reload: isReload, data } = blockData.toLocation;
      const callback = blockData.callback || blockCallback;

      if (callback) {
        callback(
          (isLeave: any) => {
            blockData = {};
            allowCallListener = true;
            if (isLeave) {
              callListener();
            } else {
              location(url, data, isReload);
            }
          },
          (path: string) => {
            allowCallListener = false;
            blockData.toLocation = null;
            replace(path);
          },
          blockData.toLocation,
        );
      }
    } else {
      callListener();
    }
  } else {
    allowCallListener = true;
  }
};

export const combinePath = (path: string = '') => {
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

export const locationHandle = (...args: any) => {
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

function locationFunction(): Location;

function locationFunction(...args: any): any {
  if (!args.length) {
    return getLocation();
  }
  locationHandle('push', ...args);
}

export const location: LocationFunction = locationFunction;

export const replace: ReplaceFunction = (...args: any) => {
  locationHandle('replace', ...args);
};

export const reload = () => {
  const { url } = getLocation();
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
    callback(getLocation(), true);
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
    if (isFunction(unmount)) {
      unmount();
    }
    globalWindow.location = routerOptions.context;
  }

  if (!created) {
    created = true;
    options = { ...options, ...routerOptions };
    isHash = options.type !== 'browser';
    const eventType = isHash ? 'hashchange' : 'popstate';

    listener((locationData) => {
      callback((currentLocation = locationData));
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
      unmount = null;
      blockCallback = null;
      blockData = {};
    });
  }
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
