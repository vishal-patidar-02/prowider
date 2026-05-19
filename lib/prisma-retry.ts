import { Prisma } from "@prisma/client";

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function runWithPrismaRetry<T>(
  operation: () => Promise<T>,
  attempts = 3,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (
        !(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P1001"
        ) ||
        attempt === attempts
      ) {
        throw error;
      }

      await delay(500 * attempt);
    }
  }

  throw lastError;
}