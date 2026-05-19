// Avoid importing Prisma namespace for error types because @prisma/client
// in this workspace doesn't export the Prisma namespace in the build.

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

      // If it's not a connection error (P1001) or we've exhausted attempts,
      // rethrow. We cannot reliably use `instanceof Prisma.PrismaClientKnownRequestError`
      // here because the Prisma namespace may not be available at runtime in some builds,
      // so check the `code` property instead.
      if ((error as any)?.code !== "P1001" || attempt === attempts) {
        throw error;
      }

      await delay(500 * attempt);
    }
  }

  throw lastError;
}