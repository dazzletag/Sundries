declare module "@carehq/carehq-js" {
  export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  export interface ClientOptions {
    apiBaseUrl?: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
  }
  export interface RequestOptions {
    params?: Record<string, unknown>;
    data?: Record<string, unknown>;
  }
  export class APIClient {
    constructor(accountId: string, apiKey: string, apiSecret: string, opts?: ClientOptions);
    request<T = any>(method: HttpMethod, path: string, options?: RequestOptions): Promise<T>;
  }
}
