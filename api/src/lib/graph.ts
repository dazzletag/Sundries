type GraphTokenResponse = {
  access_token: string;
  expires_in: number;
};

const graphTenantId = process.env.GRAPH_TENANT_ID ?? process.env.TENANT_ID ?? "";
const graphClientId = process.env.GRAPH_CLIENT_ID ?? "";
const graphClientSecret = process.env.GRAPH_CLIENT_SECRET ?? "";
const graphSenderUpn = process.env.GRAPH_SENDER_UPN ?? "";

if (!graphTenantId || !graphClientId || !graphClientSecret || !graphSenderUpn) {
  // Defer throwing until used; routes can validate explicitly.
}

const tokenEndpoint = `https://login.microsoftonline.com/${graphTenantId}/oauth2/v2.0/token`;

const fetchJson = async (input: string, init?: RequestInit) => {
  const response = await fetch(input, init);
  const data = await response.json();
  if (!response.ok) {
    const message = (data as { error?: { message?: string } })?.error?.message ?? response.statusText;
    throw new Error(`Graph request failed (${response.status}): ${message}`);
  }
  return data;
};

export const getGraphAccessToken = async () => {
  if (!graphTenantId || !graphClientId || !graphClientSecret) {
    throw new Error("GRAPH_TENANT_ID, GRAPH_CLIENT_ID, and GRAPH_CLIENT_SECRET must be set");
  }

  const body = new URLSearchParams();
  body.set("client_id", graphClientId);
  body.set("client_secret", graphClientSecret);
  body.set("scope", "https://graph.microsoft.com/.default");
  body.set("grant_type", "client_credentials");

  const response = (await fetchJson(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  })) as GraphTokenResponse;

  return response.access_token;
};

export const sendGraphMailWithAttachment = async (params: {
  to: string;
  subject: string;
  html: string;
  attachmentName: string;
  attachmentContent: Buffer;
}) => {
  if (!graphSenderUpn) {
    throw new Error("GRAPH_SENDER_UPN must be set");
  }

  const token = await getGraphAccessToken();
  const attachmentContent = params.attachmentContent.toString("base64");

  const payload = {
    message: {
      subject: params.subject,
      body: {
        contentType: "HTML",
        content: params.html
      },
      toRecipients: [{ emailAddress: { address: params.to } }],
      attachments: [
        {
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: params.attachmentName,
          contentType: "application/pdf",
          contentBytes: attachmentContent
        }
      ]
    },
    saveToSentItems: "true"
  };

  await fetchJson(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(graphSenderUpn)}/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
};
