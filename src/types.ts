// Types
import type {
  Agent,
} from 'https';

export type $Config = {
  apiUrl: string;
  headers?: Record<string, string>;
  httpsAgent?: Agent;
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
