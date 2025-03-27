import axios from 'axios';

type AxiosResponse<T = any> = ReturnType<typeof axios.create> extends {
  get: (...args: any[]) => Promise<infer R>;
} ? R : never;

interface MockAxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: {
    url: string;
    method: string;
    headers: Record<string, string>;
    baseURL?: string;
    timeout?: number;
  };
}

// Helper function to create mock Axios responses with proper typing
export function createMockAxiosResponse<T = any>(data: T): MockAxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {
      url: 'http://wits.worldbank.org/API/V1/SDMX/V21/rest/data',
      method: 'GET',
      headers: {},
      baseURL: 'http://wits.worldbank.org/API/V1/SDMX/V21/rest/data',
      timeout: 10000
    }
  };
} 