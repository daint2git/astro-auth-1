import type { APIRoute } from "astro";
import { prismaClient } from "../../lib/prisma-client";

export const POST: APIRoute = async ({ request, cookies }) => {
  const formData = await request.formData();
  const name = formData.get("name")?.toString();
  const authToken = cookies.get("app_auth_token")?.value;

  if (!authToken) {
    return Response.json(
      { error: "authentication_error", message: "Please login" },
      {
        status: 401,
      }
    );
  }

  try {
    const session = await prismaClient.session.findFirst({
      where: {
        id: authToken,
        expires: {
          gte: new Date(),
        },
      },
      select: {
        user: true,
      },
    });

    if (!session) {
      return Response.json(
        { error: "authorization_error", message: "Authorized" },
        {
          status: 403,
        }
      );
    }

    await prismaClient.user.update({
      data: {
        name: name,
      },
      where: {
        id: session.user.id,
      },
    });

    return Response.json(
      { success: true, message: "Updated profile successfully" },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.log("error while creating profile", error);

    return Response.json(
      {
        error: "server_error",
        message: "Internal server error. Try again later",
      },
      { status: 500 }
    );
  }
};
