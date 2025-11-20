import { NextResponse } from "next/server";
import { authenticateUser,generateToken } from "@/app/lib/auth";

export async function POST(request: Request) {
    try{
        const {email,password}=await request.json();
        if(!email||!password){
            return NextResponse.json({error:"Email and password are required"}, {status:400});
        }
    
        const {user,token}=await authenticateUser(email,password);
        const response=NextResponse.json({
            message:"Login successful",
            user:{
                id:user.id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
            },
            token,
        })
        response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, 
      path: "/",
    });
        return response;
    } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Login failed" },
      { status: 401 }
    );
}}