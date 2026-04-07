/**
 * Singleton provider for ApiHealthService.
 * Production code uses getApiHealthService().
 *
 * @category Infrastructure
 */
import { ApiHealthService } from '../services/ApiHealthService';

let apiHealthServiceSingleton: ApiHealthService | null = null;

export function getApiHealthService(): ApiHealthService {
  if (!apiHealthServiceSingleton) {
    apiHealthServiceSingleton = new ApiHealthService();
  }
  return apiHealthServiceSingleton;
}

export function resetApiHealthProvider(): void {
  apiHealthServiceSingleton = null;
}
