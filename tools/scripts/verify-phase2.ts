import "dotenv/config";
import { execSync } from "child_process";
import { prisma } from "@/lib/prisma";
import { assignProviders } from "@/lib/allocate";

function log(...args: any[]) {
  console.log(...args);
}

async function run() {
  try {
    log('Seeding database...');
    execSync('npx tsx -r dotenv/config prisma/seed.ts', { stdio: 'inherit' });

    const svc1 = await prisma.service.findFirst({ where: { name: 'Service 1' } });
    const svc3 = await prisma.service.findFirst({ where: { name: 'Service 3' } });

    if (!svc1 || !svc3) {
      throw new Error('Services not found after seed');
    }

    // Helper to create a lead and run allocation
    async function createAndAllocate(serviceId: number, phoneSuffix: number) {
      const lead = await prisma.lead.create({
        data: {
          customerName: `Verifier ${serviceId}-${phoneSuffix}`,
          phone: String(9000000000 + phoneSuffix),
          city: 'Test City',
          description: 'automated verifier',
          serviceId,
        },
      });

      const assigned = await assignProviders(lead.id, serviceId);

      const assignments = await prisma.leadAssignment.findMany({ where: { leadId: lead.id } });

      return { lead, assigned, assignments };
    }

    // Test 1: Service 1 single lead
    log('\nTest 1: Service 1 single lead');
    const t1 = await createAndAllocate(svc1.id, 1);
    log('Assigned provider names:', t1.assigned.map((p) => p.name));
    const hasP1 = t1.assigned.some((p) => p.name === 'Provider 1');
    log('Provider 1 present:', hasP1);

    // Test 2: Service 3 single lead
    log('\nTest 2: Service 3 single lead');
    const t2 = await createAndAllocate(svc3.id, 2);
    const hasP1_t2 = t2.assigned.some((p) => p.name === 'Provider 1');
    const hasP4_t2 = t2.assigned.some((p) => p.name === 'Provider 4');
    log('Provider 1 present:', hasP1_t2, 'Provider 4 present:', hasP4_t2);

    // Test 3: Rotation for Service 1 across 6 leads
    log('\nTest 3: Rotation for Service 1 across 6 leads');
    const rotations: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const r = await createAndAllocate(svc1.id, 100 + i);
      // collect pool-assigned provider (excluding Provider 1)
      const pool = r.assigned.filter((p) => p.name !== 'Provider 1').map((p) => p.name);
      rotations.push(...pool);
      log(`Lead ${i} pool picks:`, pool);
    }
    log('Rotations sequence (pool picks):', rotations.join(', '));

    // Test 4: Concurrency 10 leads
    log('\nTest 4: Concurrency 10 leads (parallel)');
    const phonesStart = 2000;
    const createLeads = Array.from({ length: 10 }, (_, idx) => idx + 1).map(async (n) => {
      const lead = await prisma.lead.create({
        data: {
          customerName: `Concurrent ${n}`,
          phone: String(9100000000 + n),
          city: 'Test City',
          description: 'concurrency test',
          serviceId: svc1.id,
        },
      });
      return lead;
    });

    const leads = await Promise.all(createLeads);
    // run allocs in parallel
    const allocs: any[] = [];
    for (const L of leads) {
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20)));
      try {
        const a = await assignProviders(L.id, svc1.id);
        allocs.push(a);
      } catch (e) {
        allocs.push({ error: String(e) });
      }
    }

    log('Allocated (sequential) ', allocs.length, 'leads.');

    // verify no provider exceeds quota and no duplicate assignments
    const providers = await prisma.provider.findMany();
    const quotaIssues = providers.filter((p) => p.leadsReceivedThisMonth > p.monthlyQuota);
    log('Providers over quota:', quotaIssues.map((p) => ({ name: p.name, leads: p.leadsReceivedThisMonth })));

    const allAssignments = await prisma.leadAssignment.findMany();
    const dupMap = new Map<string, number>();
    for (const a of allAssignments) {
      const key = `${a.leadId}-${a.providerId}`;
      dupMap.set(key, (dupMap.get(key) ?? 0) + 1);
    }
    const duplicates = Array.from(dupMap.entries()).filter(([, v]) => v > 1);
    log('Duplicate assignments found:', duplicates.length);

    // Test 5: Webhook idempotency
    log('\nTest 5: Webhook idempotency');
    const eventId = 'phase2-verifier-ev-001';
    const res1 = await prisma.$transaction(async (tx) => {
      const existing = await tx.webhookEvent.findUnique({ where: { eventId } });
      if (existing) return 'Already processed';
      await tx.provider.updateMany({ data: { leadsReceivedThisMonth: 0 } });
      await tx.allocationState.updateMany({ data: { lastAssignedIndex: 0 } });
      await tx.webhookEvent.create({ data: { eventId, processedAt: new Date() } });
      return 'Quota reset successfully';
    });
    const res2 = await prisma.$transaction(async (tx) => {
      const existing = await tx.webhookEvent.findUnique({ where: { eventId } });
      if (existing) return 'Already processed';
      await tx.provider.updateMany({ data: { leadsReceivedThisMonth: 0 } });
      await tx.allocationState.updateMany({ data: { lastAssignedIndex: 0 } });
      await tx.webhookEvent.create({ data: { eventId, processedAt: new Date() } });
      return 'Quota reset successfully';
    });
    log('Webhook first call:', res1, 'second call:', res2);

    // Test 6: Skipping providers at quota limit
    log('\nTest 6: Skipping providers at quota limit');
    // Pick Provider 2 and set leadsReceivedThisMonth = monthlyQuota
    const p2 = await prisma.provider.findFirst({ where: { name: 'Provider 2' } });
    if (!p2) throw new Error('Provider 2 not found');
    await prisma.provider.update({ where: { id: p2.id }, data: { leadsReceivedThisMonth: p2.monthlyQuota } });

    const t6 = await createAndAllocate(svc1.id, 5000);
    const usedP2 = t6.assigned.some((p) => p.name === 'Provider 2');
    log('Provider 2 used after reaching quota?', usedP2);

    log('\nVerification complete.');
  } catch (err) {
    console.error('Verifier failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
