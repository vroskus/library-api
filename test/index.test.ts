import ApiService from '../src';

// Types
import type {
  $Config,
} from '../src';

const apiConfig: $Config = {
  apiUrl: 'https://petstore.swagger.io/v2',
  timeout: 0,
};

const successStatus: number = 200;
const oneValue: number = 1;
const twoValue: number = 2;

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

            expect(response.status).toBe(successStatus);
            expect(response.data).toHaveProperty(
              'id',
              oneValue,
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

            expect(response.status).toBe(successStatus);
            expect(response.data).toHaveProperty(
              'id',
              oneValue,
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
              /* eslint-disable-next-line sonarjs/no-nested-functions */
              mock.onGet('/pet/1').reply(() => {
                const responseBody = {
                  id: 2,
                };

                return [successStatus, responseBody];
              });
            });

            const response = await testApiServiceInstance.testGet();

            expect(response.status).toBe(successStatus);
            expect(response.data).toHaveProperty(
              'id',
              twoValue,
            );
          },
        );
      },
    );
  },
);
