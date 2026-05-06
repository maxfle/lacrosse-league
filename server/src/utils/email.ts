import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || 'noreply@lacrosseleague.com';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

export async function sendVerificationEmail(email: string, token: string) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your email — Lacrosse League',
    html: `<p>Click <a href="${CLIENT_URL}/verify-email?token=${token}">here</a> to verify your email address.</p>`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your password — Lacrosse League',
    html: `<p>Click <a href="${CLIENT_URL}/reset-password?token=${token}">here</a> to reset your password. This link expires in 1 hour.</p>`,
  });
}

export async function sendPlayerInviteEmail(email: string, playerName: string, teamName: string) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `You've been added to ${teamName} — Lacrosse League`,
    html: `
      <p>Hi ${playerName},</p>
      <p>Your coach has added you to <strong>${teamName}</strong> on the Lacrosse League website.</p>
      <p>Create your account using this email address to access your player profile and set up your recruitment profile.</p>
      <p><a href="${CLIENT_URL}/signup?email=${encodeURIComponent(email)}">Create Account</a></p>
    `,
  });
}

export async function sendCoachApprovalNotification(adminEmail: string, coachName: string) {
  await transporter.sendMail({
    from: FROM,
    to: adminEmail,
    subject: 'New coach account pending approval — Lacrosse League',
    html: `<p><strong>${coachName}</strong> has requested a coach account and is awaiting your approval.</p>
           <p><a href="${CLIENT_URL}/admin/approvals">Review pending approvals</a></p>`,
  });
}

export async function sendCoachApprovalResult(email: string, approved: boolean) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Your coach account has been ${approved ? 'approved' : 'rejected'} — Lacrosse League`,
    html: approved
      ? `<p>Your coach account has been approved! <a href="${CLIENT_URL}/dashboard">Go to your dashboard</a></p>`
      : `<p>Your coach account request was not approved. Please contact the league administrator for more information.</p>`,
  });
}

export async function sendProfileVisibilityChanged(email: string, isPublic: boolean) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Your recruitment profile visibility changed — Lacrosse League',
    html: `<p>Your recruitment profile has been made <strong>${isPublic ? 'public' : 'private'}</strong> by your coach.</p>
           <p><a href="${CLIENT_URL}/profile/recruitment">View your profile</a></p>`,
  });
}

export async function sendProfilePublicRequest(coachEmail: string, playerName: string) {
  await transporter.sendMail({
    from: FROM,
    to: coachEmail,
    subject: `${playerName} has requested their recruitment profile be made public`,
    html: `<p><strong>${playerName}</strong> is requesting that their recruitment profile be made public.</p>
           <p><a href="${CLIENT_URL}/dashboard/roster">Manage player profiles</a></p>`,
  });
}
