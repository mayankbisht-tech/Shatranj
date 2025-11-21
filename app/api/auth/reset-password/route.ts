import { NextResponse } from "next/server";
import { sendResetPasswordEmail } from "../../../lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await sendResetPasswordEmail(email);
    return NextResponse.json({ message: "Password reset email sent" });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to reset password";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
