import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json(providers, { status: 200 });
  } catch (error) {
    console.error("Provider list API error:", error);
    return NextResponse.json(
      { message: "Unable to fetch providers." },
      { status: 500 },
    );
  }
}
