import { defineMiddleware } from "astro/middleware";
import { getSession } from "./lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  const authToken = context.cookies.get("app_auth_token")?.value;
  const { pathname } = context.url;

  console.log("middleware");

  if (authToken) {
    const session = await getSession(authToken);

    // console.log({ session });

    if (
      ["dashboard", "account", "profile"].some((path) =>
        pathname.includes(path)
      )
    ) {
      if (!session) {
        context.cookies.delete("app_auth_token", {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: import.meta.env.PROD,
        });

        return context.redirect("/login");
      }

      context.locals.userId = session.user.id;

      return next();
    }

    if (["login", "register"].some((path) => pathname.includes(path))) {
      if (session) {
        context.locals.userId = session.user.id;

        return context.redirect("/dashboard");
      }

      context.cookies.delete("app_auth_token", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: import.meta.env.PROD,
      });

      return next();
    }
  }

  // there is no authToken
  if (
    ["dashboard", "account", "profile"].some((path) => pathname.includes(path))
  ) {
    return context.redirect("/login");
  }

  return next();
});
