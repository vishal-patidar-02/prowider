import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { runWithPrismaRetry } from "@/lib/prisma-retry";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run checks.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
  }),
});

async function main() {
  const [services, providers, allocationStates, leads] = await Promise.all([
    runWithPrismaRetry(() => prisma.service.count()),
    runWithPrismaRetry(() => prisma.provider.count()),
    runWithPrismaRetry(() => prisma.allocationState.count()),
    runWithPrismaRetry(() =>
      prisma.lead.findMany({
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          customerName: true,
          phone: true,
          city: true,
          serviceId: true,
          description: true,
        },
      }),
    ),
  ]);

  console.log(
    JSON.stringify(
      {
        services,
        providers,
        allocationStates,
        leads,
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
