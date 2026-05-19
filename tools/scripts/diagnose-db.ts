import { prisma } from "@/lib/prisma";

async function main() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("PROWIDER DATABASE DIAGNOSTIC REPORT");
  console.log("═══════════════════════════════════════════════════════════════\n");

  try {
    // Check Services
    const services = await prisma.service.findMany();
    console.log(`✓ SERVICES: ${services.length} records`);
    services.forEach((s) => console.log(`  - (${s.id}) ${s.name}`));

    // Check Providers
    const providers = await prisma.provider.findMany();
    console.log(`\n✓ PROVIDERS: ${providers.length} records`);
    providers.forEach((p) =>
      console.log(
        `  - (${p.id}) ${p.name} | Quota: ${p.monthlyQuota} | Leads this month: ${p.leadsReceivedThisMonth}`,
      ),
    );

    // Check AllocationState
    const allocationStates = await prisma.allocationState.findMany();
    console.log(`\n✓ ALLOCATIONSTATE: ${allocationStates.length} records`);
    if (allocationStates.length === 0) {
      console.log("  ⚠️  EMPTY - Should have one record per service from seed");
      console.log("  Reason: Seed may not have run successfully, or was truncated");
    } else {
      allocationStates.forEach((a) =>
        console.log(`  - Service ${a.serviceId} | Last index: ${a.lastAssignedIndex}`),
      );
    }

    // Check Leads
    const leads = await prisma.lead.findMany();
    console.log(`\n✓ LEADS: ${leads.length} records`);
    if (leads.length === 0) {
      console.log(
        "  ⚠️  EMPTY - No leads have been submitted yet via Request Service API",
      );
      console.log("  Reason: Leads are only created when:");
      console.log("    1. User submits request via /request-service form");
      console.log("    2. Test tools concurrency test is run");
      console.log("    3. You manually POST to /api/leads");
    } else {
      leads.forEach((l) =>
        console.log(
          `  - ID ${l.id}: ${l.customerName} | Service ${l.serviceId} | Phone: ${l.phone}`,
        ),
      );
    }

    // Check LeadAssignment
    const assignments = await prisma.leadAssignment.findMany();
    console.log(`\n✓ LEADASSIGNMENT: ${assignments.length} records`);
    if (assignments.length === 0) {
      console.log(
        "  ⚠️  EMPTY - No leads have been allocated to providers yet",
      );
      console.log("  Reason: LeadAssignment records are created when:");
      console.log("    1. A Lead is successfully created via /api/leads POST");
      console.log("    2. The assignProviders() function runs successfully");
      console.log("    3. Exactly 3 providers are selected for that lead");
    } else {
      assignments.forEach((a) =>
        console.log(
          `  - Lead ${a.leadId} → Provider ${a.providerId} | Assigned: ${a.assignedAt.toISOString()}`,
        ),
      );
    }

    // Check WebhookEvent
    const webhookEvents = await prisma.webhookEvent.findMany();
    console.log(`\n✓ WEBHOOKEVENT: ${webhookEvents.length} records`);
    if (webhookEvents.length === 0) {
      console.log("  ⚠️  EMPTY - No webhook resets have been triggered yet");
      console.log("  Reason: WebhookEvent records are created when:");
      console.log("    1. POST /api/webhook/reset-quota is called");
      console.log("    2. Stores unique eventId for idempotency checking");
      console.log("    3. Prevents duplicate quota resets for same event");
    } else {
      webhookEvents.forEach((w) =>
        console.log(`  - Event ${w.eventId} | Processed: ${w.processedAt.toISOString()}`),
      );
    }
  } catch (error) {
    console.error("❌ Database connection error:", error);
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("RECOMMENDED NEXT STEPS:");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\n1. To populate LEADS and LEADASSIGNMENT:");
  console.log("   - Option A: Use UI at /request-service to submit forms");
  console.log("   - Option B: Run Test Tools → 'Concurrent Leads' button");
  console.log("   - Option C: Call the concurrency test: POST 10 requests to /api/leads");
  console.log("\n2. To populate WEBHOOKEVENT:");
  console.log("   - Use Test Tools → 'Idempotency Check' button");
  console.log("   - Or: POST to /api/webhook/reset-quota with eventId & providerId");
  console.log("\n3. Check AllocationState:");
  console.log("   - Run: npm run db:seed (creates AllocationState for each service)");
  console.log("\n═══════════════════════════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
