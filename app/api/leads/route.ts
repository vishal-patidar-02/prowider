import { NextResponse } from "next/server";
import { assignProviders } from "@/lib/allocate";
import eventBus from "@/lib/eventBus";
import { prisma } from "@/lib/prisma";
import { runWithPrismaRetry } from "@/lib/prisma-retry";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const serviceId = Number(body.serviceId);

    if (!customerName || !phone || !city || !description || !Number.isInteger(serviceId)) {
      return NextResponse.json(
        { message: "All fields are required." },
        { status: 400 },
      );
    }

    const service = await runWithPrismaRetry(() =>
      prisma.service.findUnique({
        where: {
          id: serviceId,
        },
      }),
    );

    if (!service) {
      return NextResponse.json(
        { message: "Selected service does not exist." },
        { status: 400 },
      );
    }

    const lead = (await runWithPrismaRetry(() =>
      prisma.lead.create({
        data: {
          customerName,
          phone,
          city,
          description,
          serviceId,
        },
      }),
    )) as { id: number; serviceId: number };

    let assignedProviders: Awaited<ReturnType<typeof assignProviders>> = [];

    try {
      assignedProviders = await assignProviders(lead.id, lead.serviceId);
      eventBus.emit("lead-assigned", { timestamp: Date.now(), leadId: lead.id });
    } catch (error) {
      console.error("Lead allocation failed.", {
        leadId: lead.id,
        serviceId: lead.serviceId,
        error,
      });
    }

    return NextResponse.json(
      {
        ...lead,
        assignedProviders,
      },
      { status: 201 },
    );
  } catch (error) {
    // Handle unique constraint (duplicate lead for same phone+service)
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        {
          message: "You have already submitted a request for this service.",
        },
        { status: 409 },
      );
    }

    console.error(error);

    return NextResponse.json(
      { message: "Unable to create lead." },
      { status: 500 },
    );
  }
}