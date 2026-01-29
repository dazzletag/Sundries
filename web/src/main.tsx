import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import "./index.css";

const tenantId = import.meta.env.VITE_AAD_TENANT_ID;
const clientId = import.meta.env.VITE_AAD_CLIENT_ID;
const redirectUri = import.meta.env.VITE_AAD_REDIRECT_URI ?? window.location.origin;

if (!tenantId || !clientId) {
  console.warn("VITE_AAD_TENANT_ID and VITE_AAD_CLIENT_ID must be set in your environment");
}

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: clientId ?? "",
    authority: tenantId ? `https://login.microsoftonline.com/${tenantId}` : "",
    redirectUri
  },
  cache: {
    cacheLocation: "localStorage"
  }
});

const startApp = async () => {
  try {
    await msalInstance.initialize();
    const response = await msalInstance.handleRedirectPromise();
    if (response?.account) {
      msalInstance.setActiveAccount(response.account);
    } else {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length) {
        msalInstance.setActiveAccount(accounts[0]);
      }
    }
  } catch (error) {
    console.error("MSAL redirect handling failed", error);
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>
  );
};

void startApp();



