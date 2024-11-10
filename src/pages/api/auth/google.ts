import type { APIContext, APIRoute } from "astro";
import { createHash, randomUUID } from "node:crypto";
import queryString from "query-string";

export const GET: APIRoute = async ({ request, cookies }) => {
  const googleOauthState = randomUUID();

  cookies.set("google_oauth_state", googleOauthState, {
    path: "/",
    httpOnly: true,
  });

  const googleCodeChallenge = randomUUID();
  const codeChallenge = createHash("sha256")
    .update(googleCodeChallenge)
    .digest("base64url");

  cookies.set("google_code_challenge", googleCodeChallenge, {
    path: "/",
    httpOnly: true,
  });

  const authorizationUrl = queryString.stringifyUrl({
    url: "https://accounts.google.com/o/oauth2/v2/auth",
    query: {
      scope: "openid email profile",
      response_type: "code",
      client_id: import.meta.env.GOOGLE_AUTH_CLIENT_ID,
      redirect_uri: import.meta.env.GOOGLE_AUTH_CLIENT_CALLBACK_URL,
      state: googleOauthState,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    },
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizationUrl,
    },
  });
};
