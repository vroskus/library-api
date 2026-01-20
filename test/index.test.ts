import express from 'express';
import ApiService from '../src';

// Types
import type {
  $Config,
} from '../src';

const successStatus: number = 200;
const oneValue: number = 1;
const twoValue: number = 2;
const port: number = 3000;

const getEndpoint: string = '/get';
const getEndpointData = {
  id: oneValue,
  ok: true,
};
const postEndpoint: string = '/post';
const postEndpointData = {
  id: oneValue,
  ok: true,
};

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

  return app.listen(port);
};

class TestApiService<C extends $Config> extends ApiService<C> {
  async testGet() {
    return this.connection.get(
      getEndpoint,
    );
  }

  async testPost(params: Record<string, unknown>) {
    return this.connection.post(
      postEndpoint,
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
            const response = await testApiServiceInstance.testGet();

            expect(response.status).toBe(successStatus);
            expect(response.data).toMatchObject(getEndpointData);
          },
        );

        it(
          'should make POST request',
          async () => {
            const response = await testApiServiceInstance.testPost(postEndpointData);

            expect(response.status).toBe(successStatus);
            expect(response.data).toMatchObject(postEndpointData);
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

            testApiServiceInstance.initMock((mock) => {
              /* eslint-disable-next-line sonarjs/no-nested-functions */
              mock.onGet(getEndpoint).reply(() => {
                const responseBody = mockData;

                return [successStatus, responseBody];
              });
            });

            const response = await testApiServiceInstance.testGet();

            expect(response.status).toBe(successStatus);
            expect(response.data).toMatchObject(mockData);
          },
        );
      },
    );
  },
);
