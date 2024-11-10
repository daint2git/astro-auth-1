import { PrismaClient } from "@prisma/client";
import type { APIRoute } from "astro";
import bcrypt from "bcryptjs";
import {
  createUser,
  sendVerificationMail,
  updateUser,
} from "../../../lib/auth";
import { prismaClient } from "../../../lib/prisma-client";
import redis from "../../../lib/redis";

const prisma = new PrismaClient();

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();

  if (!email) {
    return Response.json(
      {
        error: "validation_error",
        message: "Missing required fields",
      },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!existingUser) {
    return Response.json(
      {
        error: "user_not_exist",
        message: "User with this email doesn't exist",
      },
      { status: 404 }
    );
  }

  if (existingUser.emailVerified) {
    return Response.json(
      {
        error: "email_already_verified",
        message:
          "User with this email has been already verified. You can log in",
      },
      { status: 400 }
    );
  }

  try {
    const verificationResponse = await sendVerificationMail({ email });

    if (verificationResponse.emailSendLimit) {
      return Response.json(
        {
          error: "rate_limit",
          message: `Please wait for 24 hrs before sending new mail request`,
        },
        { status: 429 }
      );
    }

    if (verificationResponse.waitTime) {
      return Response.json(
        {
          error: "resend_limit",
          message: `Please wait for ${verificationResponse.waitTime} minutes before generating new request for mail`,
        },
        { status: 429 }
      );
    }

    if (verificationResponse.verificationId) {
      return Response.json(
        { data: { verificationId: verificationResponse.verificationId } },
        { status: 200 }
      );
    }

    return Response.json({ error: "server_error" }, { status: 500 });
  } catch (error) {
    console.log("Error while sending mail", error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
};
