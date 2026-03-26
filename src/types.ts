// Types
import type {
  Agent,
} from 'node:https';
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import type AxiosMockAdapter from 'axios-mock-adapter';

export type $Connection = AxiosInstance;

export type $RequestConfig<V> = AxiosRequestConfig<V>;

export type $Response<V> = AxiosResponse<V>;

export type $MockAdapter = AxiosMockAdapter;

export type $ConfigInterceptors = {
  context?: boolean;
  debug?: boolean;
  requestReplay?: boolean;
  unauth?: boolean;
};

export type $Config = {
  apiUrl: string;
  headers?: Record<string, string>;
  httpsAgent?: Agent;
  interceptors?: $ConfigInterceptors;
  timeout: number;
};

export type $RequestContext = {
  Domain: string;
  Method: string;
  RequestData?: unknown;
  RequestHeaders: unknown;
  RequestId: string;
  RequestParams?: Record<string, unknown>;
  Route: string;
};

export type $ResponseContext = {
  Domain: string;
  Duration: number;
  Method: string;
  RequestData?: Record<string, unknown>;
  RequestHeaders: unknown;
  RequestId: string;
  RequestParams?: Record<string, unknown>;
  ResponseData?: unknown;
  ResponseHeaders: unknown;
  Route: string;
  Status: number;
};
