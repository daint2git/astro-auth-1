import type { APIRoute } from "astro";
import queryString from "query-string";
import {
  checkUserExists,
  createAccount,
  createSession,
  createUser,
  updateAccount,
} from "../../../../lib/auth";

export const GET: APIRoute = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const code = url.searchParams?.get("code");
  const state = url.searchParams?.get("state");

  const storedState = cookies.get("github_oauth_state")?.value;

  if (storedState !== state || !code) {
    cookies.delete("github_oauth_state", {
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
    const tokenUrl = queryString.stringifyUrl({
      url: "https://github.com/login/oauth/access_token",
      query: {
        client_id: import.meta.env.GITHUB_AUTH_CLIENT_ID,
        client_secret: import.meta.env.GITHUB_AUTH_CLIENT_SECRET,
        code: code,
        scope: "user:email",
      },
    });

    const fetchTokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
    });

    const fetchTokenData = await fetchTokenResponse.json();

    // {
    //   access_token: 'x',
    //   token_type: 'bearer',
    //   scope: 'user:email'
    // }

    console.log({ fetchTokenData });

    const fetchUserResponse = await fetch("https://api.github.com/user", {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${fetchTokenData.access_token}`,
      },
    });

    const fetchUserData = await fetchUserResponse.json();

    // {
    //   login: 'daidevdemo',
    //   id: 139003875,
    //   node_id: 'U_xxx',
    //   avatar_url: 'https://avatars.githubusercontent.com/u/139003875?v=4',
    //   gravatar_id: '',
    //   url: 'https://api.github.com/users/daidevdemo',
    //   html_url: 'https://github.com/daidevdemo',
    //   followers_url: 'https://api.github.com/users/daidevdemo/followers',
    //   following_url: 'https://api.github.com/users/daidevdemo/following{/other_user}',
    //   gists_url: 'https://api.github.com/users/daidevdemo/gists{/gist_id}',
    //   starred_url: 'https://api.github.com/users/daidevdemo/starred{/owner}{/repo}',
    //   subscriptions_url: 'https://api.github.com/users/daidevdemo/subscriptions',
    //   organizations_url: 'https://api.github.com/users/daidevdemo/orgs',
    //   repos_url: 'https://api.github.com/users/daidevdemo/repos',
    //   events_url: 'https://api.github.com/users/daidevdemo/events{/privacy}',
    //   received_events_url: 'https://api.github.com/users/daidevdemo/received_events',
    //   type: 'User',
    //   user_view_type: 'public',
    //   site_admin: false,
    //   name: null,
    //   company: null,
    //   blog: '',
    //   location: null,
    //   email: null,
    //   hireable: null,
    //   bio: null,
    //   twitter_username: null,
    //   notification_email: null,
    //   public_repos: 0,
    //   public_gists: 0,
    //   followers: 0,
    //   following: 0,
    //   created_at: '2023-07-08T17:17:13Z',
    //   updated_at: '2024-11-03T10:17:04Z'
    // }

    console.log({ fetchUserData });

    const fetchEmailResponse = await fetch(
      "https://api.github.com/user/emails",
      {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${fetchTokenData.access_token}`,
        },
      }
    );

    const fetchEmailData = await fetchEmailResponse.json();

    // [
    //   {
    //     email: 'dai.dev.demo@gmail.com',
    //     primary: true,
    //     verified: true,
    //     visibility: 'private'
    //   },
    //   {
    //     email: '139003875+daidevdemo@users.noreply.github.com',
    //     primary: false,
    //     verified: true,
    //     visibility: null
    //   }
    // ]

    console.log({ fetchEmailData });

    const userEmail = (() => {
      let primaryVerified = fetchEmailData.find(
        (email: any) => email.verified && email.primary
      );
      let verified = fetchEmailData.find((email: any) => email.verified);
      let primary = fetchEmailData.find((email: any) => email.primary);

      if (primaryVerified) {
        return primaryVerified.email;
      } else if (verified) {
        return verified.email;
      } else if (primary) {
        return primary.email;
      } else {
        return fetchEmailData[0].email;
      }
    })();

    const existingUser = await checkUserExists({
      email: userEmail,
      provider: "github",
    });

    console.log({ existingUser });

    if (!existingUser) {
      const newUser = await createUser({
        email: userEmail,
        name: fetchUserData.name,
        image: fetchUserData.avatar_url,
        emailVerified: new Date()
      });

      console.log({ newUser });

      await createAccount({
        userId: newUser.id,
        provider: "github",
        providerAccountId: String(fetchUserData.id),
        accessToken: fetchTokenData.access_token,
        refreshToken: fetchTokenData.access_token,
        tokenType: fetchTokenData.token_type,
        scope: fetchTokenData.scope,
      });

      const newSession = await createSession({
        userId: newUser.id,
      });

      cookies.delete("github_oauth_state", {
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
        // oauth strategy exists
        // update token

        await updateAccount({
          accountId: existingUser.accounts[0].id,
          provider: "github",
          providerAccountId: String(fetchUserData.id),
          accessToken: fetchTokenData.access_token,
          refreshToken: fetchTokenData.access_token,
          tokenType: fetchTokenData.token_type,
          scope: fetchTokenData.scope,
        });
      } else {
        await createAccount({
          userId: existingUser.id,
          provider: "github",
          providerAccountId: String(fetchUserData.id),
          accessToken: fetchTokenData.access_token,
          refreshToken: fetchTokenData.access_token,
          tokenType: fetchTokenData.token_type,
          scope: fetchTokenData.scope,
        });
      }

      const newSession = await createSession({
        userId: existingUser.id,
      });

      cookies.delete("github_oauth_state", {
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

    cookies.delete("github_oauth_state", {
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
};
