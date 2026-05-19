import { prisma } from "@/lib/prisma";

// ALLOCATION RULES:
// Service 1: Provider 1 mandatory -> fill 2 from pool [2,3,4]
// Service 2: Provider 5 mandatory -> fill 2 from pool [6,7,8]
// Service 3: Providers 1 and 4 mandatory -> fill 1 from pool [2,3,5,6,7,8]
// If mandatory provider is at quota, skip and pull extra from pool.
// Total assigned per lead: exactly 3 (or fewer only if pool is exhausted).
//
// IMPORTANT: All provider IDs and service IDs below are hardcoded and depend on
// the seed running with TRUNCATE + RESTART IDENTITY. This guarantees deterministic
// IDs (providers 1-8, services 1-3). Do not change these IDs without re-running
// `npm run db:seed` to reset the database. The seed always starts from ID 1.

type ServiceAllocationConfig = {
  mandatoryProviderIds: number[];
  poolProviderIds: number[];
};

type ProviderSnapshot = {
  id: number;
  name: string;
  monthlyQuota: number;
  leadsReceivedThisMonth: number;
};

type AssignedProvider = {
  id: number;
  name: string;
};

const SERVICE_ALLOCATION_CONFIG: Record<number, ServiceAllocationConfig> = {
  1: {
    mandatoryProviderIds: [1],
    poolProviderIds: [2, 3, 4],
  },
  2: {
    mandatoryProviderIds: [5],
    poolProviderIds: [6, 7, 8],
  },
  3: {
    mandatoryProviderIds: [1, 4],
    poolProviderIds: [2, 3, 5, 6, 7, 8],
  },
};

export async function assignProviders(leadId: number, serviceId: number) {
  const config = SERVICE_ALLOCATION_CONFIG[serviceId];

  if (!config) {
    throw new Error(`Unsupported serviceId: ${serviceId}`);
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT * FROM "AllocationState" WHERE "serviceId" = ${serviceId} FOR UPDATE`;

    const allocationState = await tx.allocationState.findUnique({
      where: {
        serviceId,
      },
      select: {
        id: true,
        lastAssignedIndex: true,
      },
    });

    if (!allocationState) {
      throw new Error(`Allocation state not found for serviceId ${serviceId}`);
    }

    const providerIds = Array.from(
      new Set([...config.mandatoryProviderIds, ...config.poolProviderIds]),
    );

    const providers = await tx.provider.findMany({
      where: {
        id: {
          in: providerIds,
        },
      },
      select: {
        id: true,
        name: true,
        monthlyQuota: true,
        leadsReceivedThisMonth: true,
      },
    });

    const monthlyUsage: Record<number, number> = {};

    for (const provider of providers) {
      monthlyUsage[provider.id] = provider.leadsReceivedThisMonth;
    }

    const providerById = new Map<number, ProviderSnapshot>(
      providers.map((provider) => [provider.id, provider]),
    );

    const assignedProviders: AssignedProvider[] = [];
    const assignedThisLead: number[] = [];
    const skippedMandatory: number[] = [];

    function isProviderEligible(
      providerId: number,
      assignedThisLeadIds: number[],
      usageSnapshot: Record<number, number>,
      quota: number,
    ) {
      return (
        !assignedThisLeadIds.includes(providerId) &&
        (usageSnapshot[providerId] ?? 0) < quota
      );
    }

    const tryAssignProvider = async (providerId: number) => {
      const provider = providerById.get(providerId);

      if (!provider) {
        return;
      }

      if (
        !isProviderEligible(
          providerId,
          assignedThisLead,
          monthlyUsage,
          provider.monthlyQuota,
        )
      ) {
        return;
      }

      const updateResult = await tx.provider.updateMany({
        where: {
          id: providerId,
          leadsReceivedThisMonth: {
            lt: provider.monthlyQuota,
          },
        },
        data: {
          leadsReceivedThisMonth: {
            increment: 1,
          },
        },
      });

      if (updateResult.count !== 1) {
        return;
      }

      assignedThisLead.push(providerId);
      monthlyUsage[providerId] = (monthlyUsage[providerId] ?? 0) + 1;
      assignedProviders.push({
        id: provider.id,
        name: provider.name,
      });
    };

    for (const providerId of config.mandatoryProviderIds) {
      const beforeCount = assignedProviders.length;
      await tryAssignProvider(providerId);

      if (assignedProviders.length === beforeCount) {
        skippedMandatory.push(providerId);
      }
    }

    const targetAssignments = 3;
    let remainingSlots = targetAssignments - assignedProviders.length;
    let poolPickedCount = 0;
    const pool = config.poolProviderIds;

    if (remainingSlots > 0) {
      const startIndex = allocationState.lastAssignedIndex % pool.length;

      for (let offset = 0; offset < pool.length && remainingSlots > 0; offset += 1) {
        const candidateProviderId = pool[(startIndex + offset) % pool.length];

        const beforeCount = assignedProviders.length;
        await tryAssignProvider(candidateProviderId);

        if (assignedProviders.length > beforeCount) {
          poolPickedCount += 1;
          remainingSlots -= 1;
        }
      }

      const nextIndex = pool.length
        ? (allocationState.lastAssignedIndex + poolPickedCount) % pool.length
        : allocationState.lastAssignedIndex;

      await tx.allocationState.update({
        where: {
          serviceId,
        },
        data: {
          lastAssignedIndex: nextIndex,
        },
      });
    }

    if (skippedMandatory.length > 0 || assignedProviders.length < targetAssignments) {
      console.warn("Lead assignment completed with fallback selection.", {
        leadId,
        serviceId,
        skippedMandatory,
        assignedCount: assignedProviders.length,
        targetAssignments,
      });
    }

    if (assignedProviders.length > 0) {
      await tx.leadAssignment.createMany({
        data: assignedProviders.map((provider) => ({
          leadId,
          providerId: provider.id,
        })),
      });
    }

    return assignedProviders;
  });
}