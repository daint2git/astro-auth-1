import type { APIRoute } from "astro";
import { randomUUID } from "node:crypto";
import queryString from "query-string";

export const GET: APIRoute = async ({ request, cookies }) => {
  const githubOauthState = randomUUID();

  cookies.set("github_oauth_state", githubOauthState, {
    path: "/",
    httpOnly: true,
  });

  const authorizationUrl = queryString.stringifyUrl({
    url: "https://github.com/login/oauth/authorize",
    query: {
      scope: "user:email",
      response_type: "code",
      client_id: import.meta.env.GITHUB_AUTH_CLIENT_ID,
      redirect_uri: import.meta.env.GITHUB_AUTH_CLIENT_CALLBACK_URL,
      state: githubOauthState,
    },
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizationUrl,
    },
  });
};
