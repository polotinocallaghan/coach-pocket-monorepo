import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const { to, coachName, inviteLink } = await request.json();

        if (!to || !coachName || !inviteLink) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const data = await resend.emails.send({
            from: 'Coach Pocket <onboarding@resend.dev>', // Using Resend's testing email since no custom domain is verified yet.
            to: [to],
            subject: `You've been invited by ${coachName} to join Coach Pocket`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #f4f4f5;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .header {
              background: linear-gradient(135deg, #22c55e 0%, #059669 100%);
              padding: 40px 20px;
              text-align: center;
              color: white;
            }
            .content {
              padding: 40px 30px;
              color: #334155;
              line-height: 1.6;
            }
            .title {
              font-size: 24px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 20px;
            }
            .button-wrapper {
              text-align: center;
              margin: 35px 0;
            }
            .button {
              display: inline-block;
              background-color: #22c55e;
              color: #ffffff !important;
              text-decoration: none;
              padding: 14px 28px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              transition: background-color 0.2s;
            }
            .footer {
              background-color: #f8fafc;
              padding: 24px;
              text-align: center;
              color: #64748b;
              font-size: 14px;
              border-top: 1px solid #e2e8f0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0; font-size:28px;">CoachPocket</h1>
            </div>
            <div class="content">
              <div class="title">Join Your Team</div>
              <p>Hi there,</p>
              <p><strong>${coachName}</strong> has invited you to join their team on <strong>Coach Pocket</strong> — the app where you can view your assigned sessions, drills, and interact with your coach.</p>
              
              <div class="button-wrapper">
                <a href="${inviteLink}" class="button">Accept Invitation</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 13px;">
                ${inviteLink}
              </p>
            </div>
            <div class="footer">
              <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
              <p>&copy; ${new Date().getFullYear()} Coach Pocket. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error sending email:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
