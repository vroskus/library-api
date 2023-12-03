import ApiService from '../src';

// Types
import type {
  $Config,
} from '../src';

const apiConfig: $Config = {
  apiUrl: 'https://petstore.swagger.io/v2',
  timeout: 0,
};

class TestApiService<C extends $Config> extends ApiService<C> {
  async testGet() {
    return this.connection.get('/pet/1');
  }

  async testPost(params) {
    return this.connection.post(
      '/pet',
      params,
    );
  }
}

describe(
  'ApiService',
  () => {
    const testApiServiceInstance = new TestApiService(apiConfig);

    describe(
      'request',
      () => {
        it(
          'should make GET request',
          async () => {
            const response = await testApiServiceInstance.testGet();

            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty(
              'id',
              1,
            );
          },
        );

        it(
          'should make POST request',
          async () => {
            const params = {
              category: {
                id: 1,
                name: 'test',
              },
              id: 1,
              name: 'test',
              photoUrls: [],
              status: 'available',
              tags: [],
            };

            const response = await testApiServiceInstance.testPost(params);

            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty(
              'id',
              1,
            );
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
            testApiServiceInstance.initMock((mock) => {
              mock.onGet('/pet/1').reply(() => {
                const responseBody = {
                  id: 2,
                };

                return [200, responseBody];
              });
            });

            const response = await testApiServiceInstance.testGet();

            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty(
              'id',
              2,
            );
          },
        );
      },
    );
  },
);
