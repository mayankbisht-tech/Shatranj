import { NextResponse } from "next/server";
import { createUser,generateToken } from "@/app/lib/auth";
export async function POST(request: Request) {
    try{
        const {email,password,fullname,username}=await request.json();
        if(!email||!password||!fullname||!username){
            return NextResponse.json({error:"All fields are required"}, {status:400});
        }
        if(password.length<6){
            return NextResponse.json({error:"Password must be at least 6 characters"}, {status:400});
        }
        const user=await createUser(email,password,fullname,username);
        const token=generateToken({id:user.id,email:user.email});
        return NextResponse.json({
            message:"Registration successful",
            user:{
                id:user.id,
                fullname: user.fullname,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                score: user.score,
            },
            token,
        });
    } catch (err) {
        console.error("Registration error:", err);
        const errorMessage = err instanceof Error ? err.message : "Registration failed";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}