import { useMemo } from "react";
import { useMsal } from "@azure/msal-react";
import { createApiClient } from "../api/client";
import type { AxiosInstance } from "axios";

export const useApi = (): AxiosInstance => {
  const { instance } = useMsal();
  return useMemo(() => createApiClient(instance), [instance]);
};



