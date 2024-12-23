// Global Types
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

// Helpers
import * as axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import _ from 'lodash';
import {
  v4 as uuidv4,
} from 'uuid';

// Types
import type {
  $Config,
  $RequestContext,
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

class ApiService<C extends $Config> {
  connection: AxiosInstance;

  unauthenticatedHandler: $UnauthenticatedHandler;

  requestContextListener: $RequestContextListener;

  responseContextListener: $ResponseContextListener;

  mock: AxiosMockAdapter | null;

  path: (arg0: string) => RegExp | string;

  constructor({
    apiUrl,
    timeout,
  }: C) {
    // Connection setup
    const connectionConfig = {
      baseURL: apiUrl,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout,
      withCredentials: true,
    };

    this.connection = axios.default.create(connectionConfig);

    this.unauthenticatedHandler = () => {};

    this.requestContextListener = () => {};

    this.responseContextListener = () => {};

    this.connection.interceptors.response.use(
      (response) => response,
      (error) => {
        const status: number | undefined = _.get(
          error,
          'response.status',
        );

        if (status === unauthenticatedStatus) {
          this.unauthenticatedHandler();
        }

        return Promise.reject(error);
      },
    );

    this.connection.interceptors.response.use(
      (response) => {
        this.pushResponseContext(response);

        return response;
      },
      (error) => {
        const response: AxiosResponse<unknown> | undefined = _.get(
          error,
          'response',
        );

        if (response) {
          this.pushResponseContext(response);
        }

        return Promise.reject(error);
      },
    );

    this.connection.interceptors.response.use(
      undefined,
      (error) => {
        const message: string = _.get(
          error,
          'message',
        );

        const config: (AxiosRequestConfig<unknown> & {
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

    this.connection.interceptors.request.use((config) => {
      const requestId: string = uuidv4();

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

      this.pushRequestContext(
        config,
        requestId,
      );

      return config;
    });

    this.mock = null;

    this.path = (v: string): RegExp | string => {
      if (v.includes(':')) {
        return new RegExp(v.replace(
          /:\w+/g,
          '[^/]+',
        ));
      }

      return v;
    };
  }

  // Actions
  setUnauthenticatedHandler({
    handler,
  }: {
    handler: $UnauthenticatedHandler;
  }): void {
    this.unauthenticatedHandler = handler;
  }

  setRequestContextListener({
    listener,
  }: {
    listener: $RequestContextListener;
  }): void {
    this.requestContextListener = listener;
  }

  setResponseContextListener({
    listener,
  }: {
    listener: $ResponseContextListener;
  }): void {
    this.responseContextListener = listener;
  }

  pushRequestContext(config: AxiosRequestConfig<unknown>, requestId: string) {
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

    this.requestContextListener(cleanRequestContext);
  }

  pushResponseContext(response: AxiosResponse<unknown>) {
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
      RequestData: config.data,
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

    this.responseContextListener(cleanResponseContext);
  }

  initMock(mockSetup: (mock: AxiosMockAdapter) => void) {
    this.mock = new AxiosMockAdapter(this.connection);

    mockSetup(this.mock);
  }
}

export default ApiService;
