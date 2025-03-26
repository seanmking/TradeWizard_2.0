// Helper function to create mock Axios responses with proper typing
export function createMockAxiosResponse<T>(data: T, status: number = 200) {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {
      url: 'http://wits.worldbank.org/API/V1/SDMX/V21/rest/data',
      method: 'get',
      headers: {},
      transformRequest: [(data: unknown) => data],
      transformResponse: [(data: unknown) => data],
      timeout: 0,
      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',
      maxContentLength: -1,
      maxBodyLength: -1,
      transitional: {
        silentJSONParsing: true,
        forcedJSONParsing: true,
        clarifyTimeoutError: false
      }
    }
  } as any;
} 