import { prismaClient } from "./prisma-client";
import { randomUUID } from "node:crypto";
import { customAlphabet } from "nanoid";
import redis from "./redis";

const generateVerificationId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  24
);

export async function checkUserExists({
  email,
  provider,
}: {
  email: string;
  provider: "google" | "github";
}) {
  return await prismaClient.user.findFirst({
    where: {
      email: email,
    },
    include: {
      accounts: {
        where: {
          provider: provider,
        },
      },
    },
  });
}

export async function createUser({
  email,
  name,
  image,
  hashedPassword,
  emailVerified,
}: {
  email: string;
  name: string;
  image?: string;
  hashedPassword?: string;
  emailVerified?: Date;
}) {
  return await prismaClient.user.create({
    data: {
      email: email,
      name: name,
      image: image,
      emailVerified,
      hashedPassword,
    },
  });
}

export async function updateUser(
  {
    emailVerified,
  }: {
    emailVerified?: Date;
  },
  { email }: { email: string }
) {
  return await prismaClient.user.update({
    where: {
      email,
    },
    data: {
      emailVerified,
    },
  });
}

export async function getSession(authToken: string) {
  return await prismaClient.session.findFirst({
    where: {
      id: authToken,
      expires: {
        gte: new Date(),
      },
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function createAccount({
  userId,
  provider,
  providerAccountId,
  accessToken,
  refreshToken,
  expiresAt,
  scope,
  tokenType,
  idToken,
}: {
  userId: string;
  provider: "google" | "github";
  providerAccountId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  tokenType: string;
  scope: string;
  idToken?: string;
}) {
  return await prismaClient.account.create({
    data: {
      userId: userId,
      type: "oauth",
      provider: provider,
      providerAccountId: providerAccountId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      token_type: tokenType,
      scope: scope,
      id_token: idToken,
    },
  });
}

export async function updateAccount({
  accountId,
  provider,
  providerAccountId,
  accessToken,
  refreshToken,
  expiresAt,
  scope,
  tokenType,
  idToken,
}: {
  accountId: string;
  provider: "google" | "github";
  providerAccountId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  tokenType: string;
  scope: string;
  idToken?: string;
}) {
  return await prismaClient.account.update({
    data: {
      providerAccountId: providerAccountId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      token_type: tokenType,
      scope: scope,
      id_token: idToken,
    },
    where: {
      id: accountId,
      provider: provider,
    },
  });
}

export async function createSession({ userId }: { userId: string }) {
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days from now
  return prismaClient.session.create({
    data: {
      userId: userId,
      sessionToken: randomUUID(),
      expires: expires,
    },
  });
}

export async function sendVerificationMail({ email }: { email: string }) {
  const verificationToken = randomUUID();
  const verificationId = generateVerificationId();

  try {
    const lastEmailSentTime = await redis.get<number>(`${email}:sent`);

    if (lastEmailSentTime) {
      return {
        waitTime:
          10 - Math.floor((new Date().getTime() - lastEmailSentTime) / 60000),
      };
    }

    const emailSentCount = await redis.get<number>(`${email}:count`);

    if (emailSentCount === null || emailSentCount > 0) {
      const emailsResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: import.meta.env.RESEND_FROM_EMAIL,
          to: "dai.dev.demo@gmail.com",
          subject: `${verificationToken} is your email verification code`,
          html: `<div>The code for verification is ${verificationToken} </div>
        <div>The code is valid for only 1 hour</div>
        <div>You have received this email because you or someone tried to signup on the website </div>
        <div>If you didn't signup, kindly ignore this email.</div>
        <div>For support contact us at contact[at]example.com</div>
        `,
        }),
      });

      console.log({ emailsResponse });

      if (emailsResponse.ok) {
        const verificationIdPromise = redis.set(
          verificationId,
          `${verificationToken}:${email}`,
          {
            ex: 3600,
          }
        );

        let emailCountPromise;

        if (emailSentCount === null) {
          emailCountPromise = redis.set(`${email}:count`, 4, {
            ex: 86400,
          });
        } else {
          emailCountPromise = redis.decr(`${email}:count`);
        }

        const emailSentPromise = redis.set(
          `${email}:sent`,
          new Date().getTime(),
          {
            ex: 10,
          }
        );

        const [res1, res2, res3] = await Promise.all([
          verificationIdPromise,
          emailCountPromise,
          emailSentPromise,
        ]);

        if (res1 && res2 && res3) {
          return { verificationId };
        } else {
          throw new Error("Error while sending mail");
        }
      } else {
        return { emailSendLimit: true };
      }
    } else {
      throw new Error("Error while sending mail");
    }
  } catch (error) {
    console.log("error while sending mail", error);
    throw new Error("Error while sending mail");
  }
}
