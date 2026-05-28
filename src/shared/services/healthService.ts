import { requestJson } from './http';

export const healthService = {
  async getHealth(): Promise<{ status: string }> {
    return requestJson<{ status: string }>('/health');
  },
};