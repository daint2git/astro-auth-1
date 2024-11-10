import type { APIRoute } from "astro";
import bcrypt from "bcryptjs";
import { prismaClient } from "../../../lib/prisma-client";
import { createSession } from "../../../lib/auth";

export const POST: APIRoute = async ({ request, cookies }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return new Response(
      JSON.stringify({
        error: "validation_error",
        message: "Missing required fields",
      }),
      {
        status: 400,
      }
    );
  }

  try {
    const existingUser = await prismaClient.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!existingUser) {
      return new Response(
        JSON.stringify({
          error: "auth_error",
          message: "Unauthorized",
        }),
        {
          status: 401,
        }
      );
    }

    if (!existingUser.emailVerified) {
      return Response.json(
        {
          error: "email_unverified",
          message: "Please verify your email",
        },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(
      password,
      existingUser.hashedPassword!
    );

    if (!passwordMatch) {
      return new Response(
        JSON.stringify({
          error: "auth_error",
          message: "Unauthorized",
        }),
        {
          status: 401,
        }
      );
    }

    const newSession = await createSession({
      userId: existingUser.id,
    });

    cookies.set("app_auth_token", newSession.id, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      expires: newSession.expires,
      path: "/",
    });

    return new Response(null, {
      status: 200,
    });
  } catch (error) {
    console.log("Error while signup", error);
    return Response.json(
      { error: "server_error", message: "Server Error" },
      { status: 500 }
    );
  }
};
