import "dotenv/config";
import { POST } from "@/app/api/webhook/reset-quota/route";
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
    console.log("No provider found.");
    return;
  }

  const before = await prisma.provider.findUnique({
    where: { id: provider.id },
    select: { id: true, leadsReceivedThisMonth: true },
  });

  const request = new Request("http://localhost/api/webhook/reset-quota", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: `debug-reset-${provider.id}-${Date.now()}`,
      providerId: provider.id,
    }),
  });

  const response = await POST(request);
  const after = await prisma.provider.findUnique({
    where: { id: provider.id },
    select: { id: true, leadsReceivedThisMonth: true },
  });

  console.log(JSON.stringify({ before, responseStatus: response.status, after }, null, 2));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
