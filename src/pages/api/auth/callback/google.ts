import type { APIRoute } from "astro";
import {
  checkUserExists,
  createAccount,
  createSession,
  createUser,
  updateAccount,
} from "../../../../lib/auth";

export const GET: APIRoute = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = cookies.get("google_oauth_state")?.value;
  const codeVerifier = cookies.get("google_code_challenge")?.value;

  if (storedState !== state || !codeVerifier || !code) {
    cookies.delete("google_oauth_state", {
      path: "/",
      httpOnly: true,
    });
    cookies.delete("google_code_challenge", {
      path: "/",
      httpOnly: true,
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/login?error=Server+Error",
      },
    });
  }

  try {
    const tokenUrl = "https://www.googleapis.com/oauth2/v4/token";

    const searchParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: import.meta.env.GOOGLE_AUTH_CLIENT_ID,
      client_secret: import.meta.env.GOOGLE_AUTH_CLIENT_SECRET,
      redirect_uri: import.meta.env.GOOGLE_AUTH_CLIENT_CALLBACK_URL,
      code: code,
      code_verifier: codeVerifier,
    });

    const fetchTokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: searchParams,
    });

    const fetchTokenData = await fetchTokenResponse.json();

    console.log(
      "fetch token response",
      fetchTokenResponse.status,
      fetchTokenData
    );

    // {
    //   access_token: 'ya29.a0AeDClZCZ0XX6CJJq0sIvj-6XZsRaAWrCBzZ2GXOAp4FAYVG8FseR8wDs9W0CHqbOiexvKMXo9fxHtKcNG4N8TH4ffuPG28PdRhWK4-IvOoNPEfo0WA6c0fWRDDrzc5nwpfH29WUXLMtnprbsYjSLkVeI6BAGzr83SZHb4iuHaCgYKAT0SARMSFQHGX2MiNP9iwWi6nE8lVcfdqaigEQ0175',
    //   expires_in: 3599,
    //   scope: 'https://www.googleapis.com/auth/userinfo.email openid https://www.googleapis.com/auth/userinfo.profile',
    //   token_type: 'Bearer',
    //   id_token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImU4NjNmZTI5MmZhMmEyOTY3Y2Q3NTUxYzQyYTEyMTFiY2FjNTUwNzEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI2MjIyOTQwMTg3OTctbThlamFyMThuZTkydG1vbHEyMXA2M2NwbGo5aHVocjUuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI2MjIyOTQwMTg3OTctbThlamFyMThuZTkydG1vbHEyMXA2M2NwbGo5aHVocjUuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDE1NzgyMjY1NTcxNDMxMjc1NzEiLCJlbWFpbCI6ImRhaS5kZXYuZGVtb0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXRfaGFzaCI6IkpZVDBjM3JEU1VNaF8wYm5JbzYxTlEiLCJuYW1lIjoiVHJhbiBEYWkgTmd1eWVuIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0xmVEhvNUt3RmxaVS1faFY0VlNtQjh1QkZMSi1peDdRTjFoTzJvQVFUOXdtbVByUT1zOTYtYyIsImdpdmVuX25hbWUiOiJUcmFuIERhaSIsImZhbWlseV9uYW1lIjoiTmd1eWVuIiwiaWF0IjoxNzMwNjI1MTg5LCJleHAiOjE3MzA2Mjg3ODl9.c1KBK0i6axLEO-LEZtaF5VoRGvWKH4sOAAWTYgJfIuUwt-aFw2Tz2C4yYEom6jmRidezxvtFZ2PPSRdBC57xHaGjsVlAOIKUh1_ufmqJuvAesCxWDapctAIuenxGYj3E5YCyRz5MK0ZS8DRfhzDoAtDxK75S87PlliuZ7gJR5jB3-V7atOLktsZqHn8-nwRuaYtpgxc17N0yv6H2efnuJWr6wWbNkVw32M3Yp98r0XNr40hwjIjEAaMPNpkbttOn0VxiHn_vkvDSknmBP797n-4-d2iY6Lzk7LE_lZnKS95mlFSNAKD_Ecbj0A22q95eu1ebTpizfl38YCLn1YKpnw'
    // }

    const fetchUserResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${fetchTokenData.access_token}`,
        },
      }
    );
    const fetchUserData = await fetchUserResponse.json();

    console.log("fetch user response", fetchUserResponse.status, fetchUserData);

    // {
    //   id: '101578226557143127571',
    //   email: 'dai.dev.demo@gmail.com',
    //   verified_email: true,
    //   name: 'Tran Dai Nguyen',
    //   given_name: 'Tran Dai',
    //   family_name: 'Nguyen',
    //   picture: 'https://lh3.googleusercontent.com/a/ACg8ocLfTHo5KwFlZU-_hV4VSmB8uBFLJ-ix7QN1hO2oAQT9wmmPrQ=s96-c'
    // }

    const existingUser = await checkUserExists({
      email: fetchUserData.email,
      provider: "google",
    });

    console.log({ existingUser });

    if (!existingUser) {
      const newUser = await createUser({
        email: fetchUserData.email,
        name: fetchUserData.name,
        image: fetchUserData.picture,
        emailVerified: new Date(),
      });

      await createAccount({
        userId: newUser.id,
        provider: "google",
        providerAccountId: fetchUserData.id,
        accessToken: fetchTokenData.access_token,
        refreshToken: fetchTokenData.refresh_token,
        expiresAt: fetchTokenData.expires_at,
        tokenType: fetchTokenData.token_type,
        scope: fetchTokenData.scope,
        idToken: fetchTokenData.id_token,
      });

      const newSession = await createSession({
        userId: newUser.id,
      });

      cookies.delete("google_oauth_state", {
        path: "/",
        httpOnly: true,
      });
      cookies.delete("google_code_challenge", {
        path: "/",
        httpOnly: true,
      });

      cookies.set("app_auth_token", newSession.id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: import.meta.env.PROD,
        expires: newSession.expires,
      });

      return new Response(null, {
        status: 302,
        headers: {
          Location: "/profile",
        },
      });
    } else {
      if (existingUser.accounts.length > 0) {
        await updateAccount({
          accountId: existingUser.accounts[0].id,
          provider: "google",
          providerAccountId: fetchUserData.id,
          accessToken: fetchTokenData.access_token,
          refreshToken: fetchTokenData.access_token,
          expiresAt: fetchTokenData.expires_at,
          tokenType: fetchTokenData.token_type,
          scope: fetchTokenData.scope,
          idToken: fetchTokenData.id_token,
        });
      } else {
        await createAccount({
          userId: existingUser.id,
          provider: "google",
          providerAccountId: fetchUserData.id,
          accessToken: fetchTokenData.access_token,
          refreshToken: fetchTokenData.refresh_token,
          expiresAt: fetchTokenData.expires_at,
          tokenType: fetchTokenData.token_type,
          scope: fetchTokenData.scope,
          idToken: fetchTokenData.id_token,
        });
      }

      const newSession = await createSession({
        userId: existingUser.id,
      });

      cookies.delete("google_oauth_state", {
        path: "/",
        httpOnly: true,
      });
      cookies.delete("google_code_challenge", {
        path: "/",
        httpOnly: true,
      });

      cookies.set("app_auth_token", newSession.id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: import.meta.env.PROD,
        expires: newSession.expires,
      });

      return new Response(null, {
        status: 302,
        headers: {
          Location: "/dashboard",
        },
      });
    }
  } catch (error) {
    console.log(error);

    cookies.delete("google_oauth_state", {
      path: "/",
    });
    cookies.delete("google_code_challenge", {
      path: "/",
    });
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/login?error=Server+Error",
      },
    });
  }
};
