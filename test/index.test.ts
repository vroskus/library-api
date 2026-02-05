import express from 'express';
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

const defaultResponseData = {
  id: oneValue,
  ok: true,
};
const unauthEndpoint: string = '/auth';
const unauthEndpointData = defaultResponseData;
const getEndpoint: string = '/get';
const getEndpointData = defaultResponseData;
const postEndpoint: string = '/post';
const postEndpointData = defaultResponseData;

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
      res.json(getEndpointData);
    },
  );

  app.post(
    postEndpoint,
    (req, res) => {
      res.json(req.body);
    },
  );

  app.get(
    unauthEndpoint,
    (req, res) => {
      res.status(unauthStatus).json(unauthEndpointData);
    },
  );

  return app.listen(port);
};

class TestApiService<C extends $Config> extends ApiService<C> {
  async testGet(endpoint: string) {
    return this.connection.get(
      endpoint,
    );
  }

  async testPost(endpoint: string, params: Record<string, unknown>) {
    return this.connection.post(
      endpoint,
      params,
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
            const response = await testApiServiceInstance.testGet(getEndpoint);

            expect(response.status).toBe(successStatus);
            expect(response.data).toMatchObject(getEndpointData);
          },
        );

        it(
          'should make POST request',
          async () => {
            const response = await testApiServiceInstance.testPost(
              postEndpoint,
              postEndpointData,
            );

            expect(response.status).toBe(successStatus);
            expect(response.data).toMatchObject(postEndpointData);
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
              ...getEndpointData,
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
  },
);
