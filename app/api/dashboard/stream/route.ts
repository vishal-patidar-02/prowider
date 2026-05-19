import eventBus from "@/lib/eventBus";
import { prisma } from "@/lib/prisma";

type DashboardProvider = {
  id: number;
  name: string;
  monthlyQuota: number;
  leadsReceivedThisMonth: number;
  assignments: Array<{
    assignedAt: Date;
    lead: {
      id: number;
      customerName: string;
      phone: string;
      city: string;
      service: {
        name: string;
      };
    };
  }>;
};

export async function GET(request: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let heartbeatId: ReturnType<typeof setInterval> | null = null;
      let refreshId: ReturnType<typeof setInterval> | null = null;
      let closed = false;

      const buildDashboardPayload = async () => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const providers = await prisma.provider.findMany({
          include: {
            assignments: {
              where: {
                assignedAt: {
                  gte: startOfMonth,
                },
              },
              include: {
                lead: {
                  include: {
                    service: true,
                  },
                },
              },
            },
          },
          orderBy: {
            id: "asc",
          },
        });

        const typedProviders = providers as DashboardProvider[];

        return typedProviders.map((provider) => {
          const quotaUsed = provider.leadsReceivedThisMonth;

          return {
            id: provider.id,
            name: provider.name,
            quotaTotal: provider.monthlyQuota,
            quotaUsed,
            quotaRemaining: provider.monthlyQuota - quotaUsed,
            leads: provider.assignments
              .sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime())
              .map((assignment) => ({
                leadId: assignment.lead.id,
                customerName: assignment.lead.customerName,
                phone: assignment.lead.phone,
                city: assignment.lead.city,
                serviceName: assignment.lead.service.name,
                submittedAt: assignment.assignedAt.toISOString(),
              })),
          };
        });
      };

      const sendDashboardSnapshot = async () => {
        try {
          const payload = await buildDashboardPayload();

          if (closed) {
            return;
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (error) {
          console.error("SSE data fetch error:", error);
        }
      };

      const handleRefresh = () => {
        void sendDashboardSnapshot();
      };

      const handleAbort = () => {
        closed = true;

        if (heartbeatId) {
          clearInterval(heartbeatId);
        }

        if (refreshId) {
          clearInterval(refreshId);
        }

        eventBus.off("lead-assigned", handleRefresh);
        eventBus.off("quota-reset", handleRefresh);
        controller.close();
      };

      request.signal.addEventListener("abort", handleAbort);

      controller.enqueue(encoder.encode(": heartbeat\n\n"));
      await sendDashboardSnapshot();

      eventBus.on("lead-assigned", handleRefresh);
      eventBus.on("quota-reset", handleRefresh);

      heartbeatId = setInterval(() => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 25_000);

      refreshId = setInterval(() => {
        void sendDashboardSnapshot();
      }, 30_000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
