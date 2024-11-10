import type { APIRoute } from "astro";
import { prismaClient } from "../../../lib/prisma-client";

export const GET: APIRoute = async ({ request, cookies }) => {
  const authToken = cookies.get("app_auth_token")?.value;

  if (!authToken) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
      },
    });
  }

  try {
    await prismaClient.session.delete({
      where: {
        id: authToken,
      },
    });

    cookies.delete("app_auth_token", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: import.meta.env.PROD,
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
      },
    });
  } catch (error) {
    console.log("error while logout", error);

    return Response.json(
      {
        error: "server_error",
        message: "Internal server error. Try again later",
      },
      { status: 500 }
    );
  }
};
