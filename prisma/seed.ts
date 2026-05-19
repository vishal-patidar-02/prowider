import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
  }),
});

async function main() {
  // Truncate all related tables and restart identity sequences so repeated
  // runs produce deterministic IDs (avoids ID drift during reseeding).
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "LeadAssignment", "WebhookEvent", "Lead", "AllocationState", "Provider", "Service" RESTART IDENTITY CASCADE',
  );

  const services = [] as Array<{ id: number; name: string }>;

  for (const name of ["Service 1", "Service 2", "Service 3"]) {
    const service = await prisma.service.create({
      data: {
        name,
      },
    });

    services.push(service);
  }

  const providerNames = [
    "SwiftFix Solutions",
    "HomeGuard Services",
    "CityPro Repairs",
    "ReliCare Home Works",
    "VoltEdge Electricals",
    "BrightSpark Technicians",
    "PowerPoint Services",
    "ZapZone Electrical Co.",
  ];

  for (let index = 0; index < 8; index += 1) {
    await prisma.provider.create({
      data: {
        name: providerNames[index],
        monthlyQuota: 10,
        leadsReceivedThisMonth: 0,
      },
    });
  }

  for (const service of services) {
    await prisma.allocationState.upsert({
      where: {
        serviceId: service.id,
      },
      update: {
        lastAssignedIndex: 0,
      },
      create: {
        serviceId: service.id,
        lastAssignedIndex: 0,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed successfully.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });