export type AnyObject = {
  [key: string]: any;
};

export interface Location extends AnyObject {
  pathname: string;
  url: string;
  hash: string;
  search: string;
  query: AnyObject;
  params: AnyObject;
}

export interface ExtraLocation {
  reload?: boolean;
  data?: any;
}

export type MergeLocation = Location & ExtraLocation;

export interface LocationObject extends AnyObject {
  pathname?: string;
  url?: string;
  hash?: string;
  search?: string;
  query?: AnyObject;
  params?: AnyObject;
}

export interface PathRegexp {
  [key: string]: RegExp;
}

export interface RouterOptions {
  type?: 'hash' | 'browser';
  basename?: string;
  context?: AnyObject;
}

export interface BlockData {
  callback?(): void;
  toLocation?: MergeLocation | null;
}

export interface ListenerCallback {
  (location: MergeLocation): void;
}

export interface BlockCallback {
  (from: MergeLocation, to: MergeLocation, enter: Function): void;
}

export interface PushFunction {
  (path: string | LocationObject): void;
  (path: string | LocationObject, reload: boolean): void;
  (path: string | LocationObject, data: any, reload?: boolean): void;
}

export interface CreateRouterFunction {
  (routerOptions: RouterOptions, callback: ListenerCallback): Function | void;
  (callback: ListenerCallback): Function | void;
}
