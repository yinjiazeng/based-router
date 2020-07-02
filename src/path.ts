import { isString, isPlainObject } from './utils';
import { LocationObject, Location } from './typings';

export const normalizePath = (path: string) => {
  return (
    `/${path}`
      // /a//b//c => /a/b/c
      .replace(/\/{2,}/g, '/')
      // /a/b/c/ => /a/b/c
      .replace(/([^/])\/$/, '$1')
      // /a/***/b/*** => /a/*/b/*
      .replace(/\*{2,}/g, '*')
  );
};

export const pathToRegexp = (path: string) => {
  const regexpPath = path
    // ( => (?:
    // (?: => (?:
    .replace(/(\()(?!\?[:=!<>])/g, '$1?:')
    // /:id => /(\/\w+)
    .replace(/\/:\w+/g, '(/\\w+)')
    // /a/b => \/a\/b
    // a.html => a\.html
    .replace(/([./])/g, '\\$1')
    // * => (?:.*)?
    // /* => (?:\/.*)?
    .replace(/(\\\/)?\*/g, '(?:$1.*)?');

  return new RegExp(`^${regexpPath}\\/?$`, 'i');
};

export const restorePath = (object: LocationObject | string) => {
  if (isString(object)) {
    return object;
  }

  let path = '';
  const { pathname, query, search, url, hash } = object;

  if (url && isString(url)) {
    path = url;
  } else if (pathname && isString(pathname)) {
    path = pathname;

    if (search && isString(search)) {
      if (search.indexOf('?') !== 0) {
        path += `?${search}`;
      } else {
        path += search;
      }
    } else if (query && isPlainObject(query) && Object.keys(query).length) {
      path += '?';
      const querys: Array<string> = [];
      Object.keys(query).forEach((key) => {
        querys.push(`${key}=${query[key]}`);
      });
      path += querys.join('&');
    }

    if (hash && isString(hash)) {
      if (hash.indexOf('#') === 0) {
        path += hash;
      } else {
        path += `#${hash}`;
      }
    }
  }

  return path;
};

export const mergePath = (...args: Array<string>) => {
  let paths = args.filter((path) => path && isString(path));
  const maxIndex = paths.length - 1;
  paths = paths.map((path, index) => (index < maxIndex ? path.replace(/\*$/, '') : path));
  return normalizePath(paths.join('/'));
};

export const parser = (path: string): Location => {
  let pathname = path;
  let url = '';
  let hash = '';
  let search = '';
  const query = {};
  const params = {};
  const hashIndex = pathname.indexOf('#');

  if (hashIndex !== -1) {
    hash = pathname.substr(hashIndex);
    pathname = pathname.substr(0, hashIndex);
  }

  const searchIndex = pathname.indexOf('?');

  if (searchIndex !== -1) {
    search = pathname.substr(searchIndex);
    search
      .substr(1)
      .split('&')
      .forEach((param) => {
        const [name, value] = param.split('=');
        if (name) {
          query[name] = value;
        }
      });
    pathname = pathname.substr(0, searchIndex);
  }

  pathname = normalizePath(pathname);
  url = pathname + search + hash;

  return {
    pathname,
    url,
    hash,
    search,
    query,
    params,
  };
};
