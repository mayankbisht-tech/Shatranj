import nodemailer from 'nodemailer';
import { hashPassword } from './auth';
import { prisma } from './prisma';
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
transporter.verify((error, success) => {
    if (error) {
        console.log('Error configuring email transporter:', error);
    } else {
        console.log('Email transporter is configured correctly');
    }
});

export async function sendResetPasswordEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error('No user found with this email');
    }
    const random4 = Math.floor(1000 + Math.random() * 9000).toString();

  const newPassword =
    user.username + user.fullname.replace(/\s+/g, "") + random4;
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword,
      reset_token: null,
      reset_expires: null,
    },
  });
   const mailOptions = {
    from: `"Shatranj " <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Your Password Has Been Reset",
    html: `
      <h2>Password Reset Successful</h2>
      <p>Hello <strong>${user.fullname}</strong>,</p>
      <p>Your new password is:</p>
      <h3 style="color:blue">${newPassword}</h3>
      <p>Please login and change your password immediately for security.</p>
      <br/>
      <p>Regards,</p>
      <strong>Mayank</strong>
    `,
  };

  await transporter.sendMail(mailOptions);

  return { message: "New password sent to email" };
}

  
