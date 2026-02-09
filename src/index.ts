// Helpers
import * as axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import _ from 'lodash';

// Types
import type {
  $Config,
  $ConfigInterceptors,
  $Connection,
  $RequestConfig,
  $RequestContext,
  $Response,
  $ResponseContext,
} from './types';

export * from './types';

type $RequestContextListener = (arg0: $RequestContext) => void;
type $ResponseContextListener = (arg0: $ResponseContext) => void;

type $UnauthenticatedHandler = () => unknown;

const unauthenticatedStatus: number = 401;

const defaultRetryDelay: number = 3000;
const defaultRetryQuantity: number = 3;
const defaultRetryIncrementor: number = 1;
const zeroValue: number = 0;

const isRecord = (obj: unknown): obj is Record<string, unknown> => {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  if (Array.isArray(obj)) {
    return false;
  }

  if (Object.getOwnPropertySymbols(obj).length > zeroValue) {
    return false;
  }

  return true;
};

const parseRequestData = (value: unknown): Record<string, unknown> | undefined => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_e) {
      if (_e) {
        return Object.fromEntries(new URLSearchParams(value));
      }
    }
  }

  if (isRecord(value) === true) {
    return value;
  }

  return undefined;
};

class ApiService<C extends $Config> {
  connection: $Connection;

  #unauthenticatedHandler: $UnauthenticatedHandler;

  #requestContextListener: $RequestContextListener;

  #responseContextListener: $ResponseContextListener;

  mockAdapter: AxiosMockAdapter | null;

  expressRouteToMockRoute: (arg0: string) => RegExp | string;

  constructor({
    apiUrl,
    headers,
    httpsAgent,
    interceptors,
    timeout,
  }: C) {
    // Connection setup
    const connectionConfig = {
      baseURL: apiUrl,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(headers || {
        }),
      },
      httpsAgent,
      timeout,
      withCredentials: true,
    };

    this.connection = axios.default.create(connectionConfig);

    this.#unauthenticatedHandler = () => {};

    this.#requestContextListener = () => {};

    this.#responseContextListener = () => {};

    this.mockAdapter = null;

    this.expressRouteToMockRoute = (v: string): RegExp | string => {
      if (v.includes(':')) {
        return new RegExp(v.replace(
          /:\w+/g,
          '[^/]+',
        ));
      }

      return v;
    };

    const interceptorsConfig: $ConfigInterceptors = {
      context: true,
      requestReplay: true,
      unauth: true,
      ...interceptors || {
      },
    };

    this.#initInterceptors(interceptorsConfig);
  }

  #initInterceptors(interceptorsConfig: $ConfigInterceptors): void {
    if (interceptorsConfig.unauth !== false) {
      this.connection.interceptors.response.use(
        (response) => response,
        (error) => {
          const status: number | undefined = _.get(
            error,
            'response.status',
          );

          if (status === unauthenticatedStatus) {
            this.#unauthenticatedHandler();
          }

          return Promise.reject(error);
        },
      );
    }

    if (interceptorsConfig.context !== false) {
      this.connection.interceptors.request.use(
        (config) => {
          const requestId: string = crypto.randomUUID();

          _.set(
            config,
            'headers.X-Request-Id',
            requestId,
          );

          const startTimestamp: number = performance.now();

          _.set(
            config,
            'startTimestamp',
            startTimestamp,
          );

          this.#pushRequestContext(
            config,
            requestId,
          );

          return config;
        },
      );

      this.connection.interceptors.response.use(
        (response) => {
          this.#pushResponseContext(response);

          return response;
        },
        (error) => {
          const response: $Response<unknown> | undefined = _.get(
            error,
            'response',
          );

          if (response) {
            this.#pushResponseContext(response);
          }

          return Promise.reject(error);
        },
      );
    }

    if (interceptorsConfig.requestReplay !== false) {
      this.connection.interceptors.response.use(
        undefined,
        (error) => {
          const message: string = _.get(
            error,
            'message',
          );

          const config: ($RequestConfig<unknown> & {
            retryDelay?: number;
            retryQty?: number;
          }) | undefined = _.get(
            error,
            'config',
          );

          if (config
            && config.retryQty !== zeroValue
            && ['Network Error', 'timeout'].some((e: string) => message.includes(e))
          ) {
            config.retryQty = typeof config.retryQty === 'undefined'
              ? defaultRetryQuantity
              : config.retryQty - defaultRetryIncrementor;

            const delayRetryRequest = new Promise((resolve) => {
              setTimeout(
                () => {
                  resolve(null);
                },
                config.retryDelay || defaultRetryDelay,
              );
            });

            return delayRetryRequest.then(() => this.connection.request(config));
          }

          return Promise.reject(error);
        },
      );
    }
  }

  // Actions
  setUnauthenticatedHandler(handler: $UnauthenticatedHandler): void {
    this.#unauthenticatedHandler = handler;
  }

  setRequestContextListener(listener: $RequestContextListener): void {
    this.#requestContextListener = listener;
  }

  setResponseContextListener(listener: $ResponseContextListener): void {
    this.#responseContextListener = listener;
  }

  #pushRequestContext(config: $RequestConfig<unknown>, requestId: string) {
    const requestContext: $RequestContext = {
      Method: `${(config.method || 'Unknown').toUpperCase()}`,
      RequestData: config.data,
      RequestHeaders: config.headers,
      RequestId: requestId,
      RequestParams: config.params,
      Route: config.url || 'Unknown',
    };

    const cleanRequestContext = _.omitBy(
      requestContext,
      _.isUndefined,
    ) as $RequestContext;

    this.#requestContextListener(cleanRequestContext);
  }

  #pushResponseContext(response: $Response<unknown>) {
    const requestId: string = _.get(
      response.config,
      'headers.X-Request-Id',
      '',
    );

    const {
      config,
      data,
      headers,
      status,
    } = response;

    const endTimestamp: number = performance.now();

    const startTimestamp: number = _.get(
      config,
      'startTimestamp',
      endTimestamp,
    );

    const responseContext: $ResponseContext = {
      Duration: endTimestamp - startTimestamp,
      Method: `${(config.method || 'Unknown').toUpperCase()}`,
      RequestData: parseRequestData(config.data),
      RequestHeaders: config.headers,
      RequestId: requestId,
      RequestParams: config.params,
      ResponseData: data,
      ResponseHeaders: headers,
      Route: config.url || 'Unknown',
      Status: status,
    };

    const cleanResponseContext = _.omitBy(
      responseContext,
      _.isUndefined,
    ) as $ResponseContext;

    this.#responseContextListener(cleanResponseContext);
  }

  initMock(
    mockSetup: (mockAdapter: AxiosMockAdapter) => void,
    delay?: number,
  ) {
    this.mockAdapter = new AxiosMockAdapter(
      this.connection,
      {
        delayResponse: delay,
      },
    );

    mockSetup(this.mockAdapter);
  }
}

export default ApiService;
