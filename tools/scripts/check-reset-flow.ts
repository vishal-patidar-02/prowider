import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const provider = await prisma.provider.findFirst({ orderBy: { id: "asc" } });
  if (!provider) {
    console.log("No providers found.");
    return;
  }

  const beforeAssignments = await prisma.leadAssignment.count({
    where: { providerId: provider.id },
  });

  const beforeCurrentMonthAssignments = await prisma.leadAssignment.count({
    where: {
      providerId: provider.id,
      assignedAt: {
        gte: (() => {
          const d = new Date();
          d.setDate(1);
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
      },
    },
  });

  console.log(JSON.stringify({
    providerId: provider.id,
    providerName: provider.name,
    leadsReceivedThisMonth: provider.leadsReceivedThisMonth,
    beforeAssignments,
    beforeCurrentMonthAssignments,
  }, null, 2));

  await prisma.$transaction(async (tx) => {
    await tx.provider.update({
      where: { id: provider.id },
      data: { leadsReceivedThisMonth: 0 },
    });
  });

  const afterProvider = await prisma.provider.findUnique({
    where: { id: provider.id },
    select: { id: true, leadsReceivedThisMonth: true },
  });

  console.log(JSON.stringify({ afterProvider }, null, 2));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
