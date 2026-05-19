import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

    const dashboardData = providers.map((provider) => {
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
            serviceId: assignment.lead.serviceId,
            serviceName: assignment.lead.service.name,
            submittedAt: assignment.assignedAt.toISOString(),
          })),
      };
    });

    return NextResponse.json(dashboardData, { status: 200 });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { message: "Unable to fetch dashboard data." },
      { status: 500 },
    );
  }
}
