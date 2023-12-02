// Global Types
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

// Helpers
import axios from 'axios';
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
type $SetRequestContextListenerParams = {
  listener: $RequestContextListener;
};
type $SetRequestContextListenerResponse = void;

type $ResponseContextListener = (arg0: $ResponseContext) => void;
type $SetResponseContextListenerParams = {
  listener: $ResponseContextListener;
};
type $SetResponseContextListenerResponse = void;

type $UnauthenticatedHandler = () => unknown;
type $SetUnauthenticatedHandlerParams = {
  handler: $UnauthenticatedHandler;
};
type $SetUnauthenticatedHandlerResponse = void;

export const getMock = () => new AxiosMockAdapter(axios);

class ApiService<C extends $Config> {
  connection: AxiosInstance;

  unauthenticatedHandler: $UnauthenticatedHandler;

  requestContextListener: $RequestContextListener;

  responseContextListener: $ResponseContextListener;

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

    this.connection = axios.create(connectionConfig);

    this.unauthenticatedHandler = () => {};

    this.requestContextListener = () => {};

    this.responseContextListener = () => {};

    this.connection.interceptors.response.use(
      (response) => response,
      (error) => {
        const status: number | void = _.get(
          error,
          'response.status',
        );

        if (status === 401) {
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
        const response: AxiosResponse<unknown> | void = _.get(
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
          retryQty?: number;
          retryDelay?: number;
        }) | void = _.get(
          error,
          'config',
        );

        if (config
          && config.retryQty !== 0
          && ['Network Error', 'timeout'].some((e: string) => message.includes(e))
        ) {
          config.retryQty = typeof config.retryQty === 'undefined' ? 3 : config.retryQty - 1;

          const delayRetryRequest = new Promise((resolve) => {
            setTimeout(
              () => {
                resolve(null);
              },
              config.retryDelay || 3000,
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
  }

  // Actions
  setUnauthenticatedHandler({
    handler,
  }: $SetUnauthenticatedHandlerParams): $SetUnauthenticatedHandlerResponse {
    this.unauthenticatedHandler = handler;
  }

  setRequestContextListener({
    listener,
  }: $SetRequestContextListenerParams): $SetRequestContextListenerResponse {
    this.requestContextListener = listener;
  }

  setResponseContextListener({
    listener,
  }: $SetResponseContextListenerParams): $SetResponseContextListenerResponse {
    this.responseContextListener = listener;
  }

  pushRequestContext(config: AxiosRequestConfig<unknown>, requestId: string) {
    const requestContext: $RequestContext = {
      Method: `${(config.method || 'Unknown').toUpperCase()}`,
      RequestData: config.data,
      RequestHeaders: config.headers,
      RequestId: requestId,
      RequestParams: config.params,
      Route: config.url,
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
      Route: config.url,
      Status: status,
    };

    const cleanResponseContext = _.omitBy(
      responseContext,
      _.isUndefined,
    ) as $ResponseContext;

    this.responseContextListener(cleanResponseContext);
  }
}

export default ApiService;
