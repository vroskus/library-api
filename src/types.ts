// Types
import type {
  Agent,
} from 'https';
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
  Method: string;
  RequestData?: unknown;
  RequestHeaders: unknown;
  RequestId: string;
  RequestParams?: Record<string, unknown>;
  Route: string;
};

export type $ResponseContext = {
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
