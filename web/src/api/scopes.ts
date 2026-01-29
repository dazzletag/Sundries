const splitScopes = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);

const deriveScopeFromAudience = (audience: string) => {
  if (audience.startsWith("api://")) {
    const rest = audience.slice("api://".length);
    if (rest.includes("/")) return audience;
    return `${audience}/access_as_user`;
  }

  if (audience.startsWith("https://") || audience.startsWith("http://")) {
    try {
      const url = new URL(audience);
      if (url.pathname && url.pathname !== "/") return audience;
    } catch {
      // Fall through to default.
    }
    return `${audience.replace(/\/$/, "")}/access_as_user`;
  }

  return audience;
};

export const getApiScopes = () => {
  const scopes = splitScopes(import.meta.env.VITE_API_SCOPES);
  if (scopes.length) return scopes;
  const audience = import.meta.env.VITE_API_AUDIENCE?.trim();
  if (!audience) return [];
  return [deriveScopeFromAudience(audience)];
};
