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
  const id = formData.get("id")?.toString();
  const code = formData.get("code")?.toString();

  if (!id || !code) {
    return Response.json(
      {
        error: "validation_error",
        message: "Missing required fields",
      },
      { status: 400 }
    );
  }

  try {
    const emailVerAttemptCount = await redis.get(
      `${clientAddress}_email_ver_attempt`
    );

    if (emailVerAttemptCount === null) {
      await redis.set(`${clientAddress}_email_ver_attempt`, 9, { ex: 10 });
    } else {
      if (Number(emailVerAttemptCount) < 1) {
        return Response.json(
          {
            error: "rate_limit",
            message: "Too many requests. Please try again later.",
          },
          { status: 429 }
        );
      } else {
        await redis.decr(`${clientAddress}_email_ver_attempt`);
      }
    }

    const data: string | null = await redis.get(id);

    console.log(data);
    

    if (!data) {
      return Response.json(
        {
          error: "code_expired",
          message:
            "Verification code expired. Please generate a new verification code.",
        },
        { status: 400 }
      );
    }

    const [otp, email] = data.split(":");

    if (otp !== code) {
      return Response.json(
        {
          error: "invalid_code",
          message: "Please check your entered code",
        },
        { status: 400 }
      );
    }

    await updateUser({ emailVerified: new Date() }, { email });

    await redis.del(id);

    return Response.json({
      data: { emailVerified: true },
      message: "Email Verified",
    });
  } catch (error) {
    console.log("error while verifying email", error);
    return Response.json({ success: false });
  }
};
