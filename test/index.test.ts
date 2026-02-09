import express from 'express';
import url from 'url';
import ApiService from '../src';

// Types
import type {
  $Config,
} from '../src';

const successStatus: number = 200;
const unauthStatus: number = 401;
const oneValue: number = 1;
const twoValue: number = 2;
const port: number = 3000;

const miniData = {
  id: '123',
};
const maxiData = {
  id1: oneValue,
  id2: true,
  id3: 'ok',
};

const unauthEndpoint: string = '/auth';
const getEndpoint: string = '/get';
const postEndpoint: string = '/post';
const postUrlencodedEndpoint: string = '/post_urlencoded';

const apiConfig: $Config = {
  apiUrl: `http://127.0.0.1:${port}`,
  timeout: 0,
};

const startServer = () => {
  const app = express();

  app.disable('x-powered-by');

  app.use(express.json());

  app.get(
    getEndpoint,
    (req, res) => {
      res.json(req.query);
    },
  );

  app.post(
    postEndpoint,
    (req, res) => {
      res.json(req.body);
    },
  );

  app.post(
    postUrlencodedEndpoint,
    express.urlencoded({
      extended: true,
      inflate: true,
      limit: '1mb',
      parameterLimit: 5000,
      type: 'application/x-www-form-urlencoded',
    }),
    (req, res) => {
      res.json(req.body);
    },
  );

  app.get(
    unauthEndpoint,
    (req, res) => {
      res.status(unauthStatus).json(miniData);
    },
  );

  return app.listen(port);
};

class TestApiService<C extends $Config> extends ApiService<C> {
  async testGet(endpoint: string, params?: Record<string, unknown>) {
    return this.connection.get(
      endpoint,
      params,
    );
  }

  async testPost(
    endpoint: string,
    params: Record<string, unknown> | string,
    options?: Record<string, unknown>,
  ) {
    return this.connection.post(
      endpoint,
      params,
      options,
    );
  }

  async testPostUrlencoded(
    endpoint: string,
    params: Record<string, string>,
  ) {
    const urlParams = new url.URLSearchParams(params);

    return this.connection.post(
      endpoint,
      urlParams.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
  }
}

describe(
  'ApiService',
  () => {
    let server;

    beforeAll(() => {
      server = startServer();
    });

    afterAll(() => {
      if (server) {
        server.close();
      }
    });

    const testApiServiceInstance = new TestApiService(apiConfig);

    describe(
      'request',
      () => {
        it(
          'should make GET request',
          async () => {
            const response = await testApiServiceInstance.testGet(
              getEndpoint,
              {
                params: miniData,
              },
            );

            expect(response.status).toBe(successStatus);
            expect(response.data).toMatchObject(miniData);
          },
        );

        it(
          'should make GET request urlencoded',
          async () => {
            const response = await testApiServiceInstance.testPostUrlencoded(
              postUrlencodedEndpoint,
              miniData,
            );

            expect(response.status).toBe(successStatus);
            expect(response.data).toMatchObject(miniData);
          },
        );

        it(
          'should make POST request',
          async () => {
            const response = await testApiServiceInstance.testPost(
              postEndpoint,
              maxiData,
            );

            expect(response.status).toBe(successStatus);
            expect(response.data).toMatchObject(maxiData);
          },
        );
      },
    );

    describe(
      'interceptors',
      () => {
        it(
          'should set X-Request-Id header on request',
          async () => {
            const response = await testApiServiceInstance.testGet(getEndpoint);

            expect(response.status).toBe(successStatus);
            expect(response.config.headers['X-Request-Id']).toBeDefined();
            expect(typeof response.config.headers['X-Request-Id']).toBe('string');
          },
        );

        it(
          'should set context on request and response',
          async () => {
            const params = {
              random: 'value',
            };
            const requestContextListener = jest.fn();
            const responseContextListener = jest.fn();

            testApiServiceInstance.setRequestContextListener(requestContextListener);
            testApiServiceInstance.setResponseContextListener(responseContextListener);

            const response = await testApiServiceInstance.testPost(
              postEndpoint,
              params,
            );

            const context = {
              Method: 'POST',
              RequestData: params,
              RequestHeaders: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              Route: postEndpoint,
            };

            expect(response.status).toBe(successStatus);
            expect(requestContextListener.mock.calls).toHaveLength(oneValue);
            expect(requestContextListener.mock.calls[0][0]).toMatchObject(context);
            expect(responseContextListener.mock.calls).toHaveLength(oneValue);
            expect(responseContextListener.mock.calls[0][0]).toMatchObject({
              ...context,
              ResponseData: params,
              Status: successStatus,
            });
            expect(typeof responseContextListener.mock.calls[0][0].Duration).toBe('number');
          },
        );

        it(
          `should run unauth handler on status code ${unauthStatus}`,
          async () => {
            const unauthHandler = jest.fn();

            testApiServiceInstance.setUnauthenticatedHandler(unauthHandler);

            let error = new Error('Wrong error!');

            try {
              await testApiServiceInstance.testGet(unauthEndpoint);
            } catch (err) {
              if (err instanceof Error) {
                error = err;
              }
            }

            expect(error.message).toBe('Request failed with status code 401');
            expect(unauthHandler.mock.calls).toHaveLength(oneValue);
          },
        );
      },
    );

    describe(
      'mock',
      () => {
        it(
          'should make MOCK request',
          async () => {
            const mockData = {
              ...miniData,
              id: twoValue,
            };

            testApiServiceInstance.initMock((mockAdapter) => {
              /* eslint-disable-next-line sonarjs/no-nested-functions */
              mockAdapter.onGet(getEndpoint).reply(() => {
                const responseBody = mockData;

                return [successStatus, responseBody];
              });
            });

            const response = await testApiServiceInstance.testGet(getEndpoint);

            expect(response.status).toBe(successStatus);
            expect(response.data).toMatchObject(mockData);
          },
        );
      },
    );

    describe(
      'helpers',
      () => {
        it(
          'should help',
          async () => {
            const input = '/:some/param/:random/string?ok=123';
            const output = /\/[^/]+\/param\/[^/]+\/string?ok=123/;

            expect(testApiServiceInstance.expressRouteToMockRoute(input)).toStrictEqual(output);
          },
        );
      },
    );
  },
);
