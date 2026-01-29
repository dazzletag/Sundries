import axios from "axios";
import type { AxiosInstance } from "axios";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import type { IPublicClientApplication } from "@azure/msal-browser";
import { getApiScopes } from "./scopes";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const resolveScopes = () => getApiScopes();

let redirectInProgress = false;

export const createApiClient = (instance: IPublicClientApplication): AxiosInstance => {
  const client = axios.create({
    baseURL: baseUrl,
    timeout: 15000
  });

  client.interceptors.request.use(async (config) => {
    if (!config.headers) return config;
    const scopes = resolveScopes();
    if (!scopes.length) return config;

    const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
    if (!account) return config;

    try {
      const tokenResponse = await instance.acquireTokenSilent({
        scopes,
        account
      });
      config.headers.Authorization = `Bearer ${tokenResponse.accessToken}`;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        if (!redirectInProgress) {
          redirectInProgress = true;
          await instance.acquireTokenRedirect({ scopes, account });
        }
      }
      throw error;
    }

    return config;
  });

  return client;
};



