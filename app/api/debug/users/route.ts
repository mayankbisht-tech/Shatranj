import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        fullname: true,
        created_at: true,
      },
    });
    
    return NextResponse.json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
