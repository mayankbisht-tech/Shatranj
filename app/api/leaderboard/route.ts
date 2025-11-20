import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma"; 
export async function GET(req: Request) {
    try{
        const {searchParams}=new URL(req.url);
        const page=parseInt(searchParams.get("page")||"1",10);
        const limit=parseInt(searchParams.get("limit")||"10",10);
        const skip=(page-1)*limit;
        const user =await prisma.user.findMany({
            orderBy:{
                score:"desc"
            },
            skip:skip,
            take:limit,
            select:{
                fullname:true,
                username:true,
                score:true,
                games_played:true,
                games_won:true
            }

        })
        const formatted = user.map((u) => ({
      ...u,
      win_rate:
        u.games_played === 0
          ? 0
          : Number(((u.games_won / u.games_played) * 100).toFixed(2)),
    }));
    const totalUsers = await prisma.user.count();
    return NextResponse.json({
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      data: formatted,
    });
  } catch (error) {
    console.error("LEADERBOARD ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 }
    );
  }
}