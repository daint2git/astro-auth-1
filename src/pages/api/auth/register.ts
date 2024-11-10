import { PrismaClient } from "@prisma/client";
import type { APIRoute } from "astro";
import bcrypt from "bcryptjs";
import { createUser, sendVerificationMail } from "../../../lib/auth";
import { prismaClient } from "../../../lib/prisma-client";

const prisma = new PrismaClient();

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const name = formData.get("name")?.toString();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!name || !email || !password) {
    return new Response(
      JSON.stringify({
        message: "Missing required fields",
      }),
      {
        status: 400,
      }
    );
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      return new Response(
        JSON.stringify({
          message: "User already exists",
        }),
        {
          status: 400,
        }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await createUser({
      name,
      email,
      hashedPassword,
    });

    const verificationResponse = await sendVerificationMail({ email });

    console.log({verificationResponse});
    

    if (verificationResponse) {
      return Response.json(
        { data: { id: verificationResponse.verificationId } },
        { status: 201 }
      );
    }

    console.log("error while sending the mail");

    await prismaClient.user.delete({ where: { email: email } });

    return Response.json(
      { error: "email_error", message: "Error while sending email" },
      { status: 500 }
    );
  } catch (error) {
    console.log("Error while register", error);
    return Response.json(
      { error: "server_error", message: "Server Error" },
      { status: 500 }
    );
  }
};
