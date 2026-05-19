import { NextResponse } from "next/server";
import eventBus from "@/lib/eventBus";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
    const providerId = Number(body.providerId);

    if (!eventId || !Number.isInteger(providerId)) {
      return NextResponse.json(
        { message: "eventId and providerId are required." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
      const existingEvent = await tx.webhookEvent.findUnique({
        where: {
          eventId,
        },
        select: {
          id: true,
        },
      });

      if (existingEvent) {
        return {
          message: "already processed",
        };
      }

      const provider = await tx.provider.findUnique({
        where: {
          id: providerId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!provider) {
        throw new Error(`Provider ${providerId} not found.`);
      }

      await tx.provider.update({
        where: {
          id: providerId,
        },
        data: {
          leadsReceivedThisMonth: 0,
        },
      });

      await tx.webhookEvent.create({
        data: {
          eventId,
          processedAt: new Date(),
        },
      });

      return {
        message: "quota reset",
        providerId: provider.id,
      };
    });

    if (result.message === "quota reset") {
      eventBus.emit("quota-reset", { timestamp: Date.now(), providerId: result.providerId });
    }

    return NextResponse.json(
      {
        message: result.message,
      },
      { status: 200 },
    );
  } catch (error) {
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        { message: "already processed" },
        { status: 200 },
      );
    }

    console.error(error);

    return NextResponse.json(
      { message: "Unable to reset quota." },
      { status: 500 },
    );
  }
}
