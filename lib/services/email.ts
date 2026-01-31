import { Resend } from 'resend'

let resend: Resend | null = null

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: 'ASG App <no_reply@asg.geofhoffman.com>',
      to: email,
      subject: 'Reset Your Password - ASG App',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">ASG App</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Food Delivery Coordination</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>

    <p>We received a request to reset your password for your ASG App account.</p>

    <p>Click the button below to set a new password:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">This link will expire in <strong>1 hour</strong> for security reasons.</p>

    <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin: 0;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${resetUrl}</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">ASG Food Delivery Coordination App</p>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send password reset email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending password reset email:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendRouteAssignmentEmail(
  email: string,
  name: string,
  routeName: string,
  routeDate: string,
  stopCount: number,
  loginUrl: string,
  hasPassword: boolean,
  passwordResetUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const passwordSection = !hasPassword && passwordResetUrl ? `
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #92400e; margin: 0 0 10px 0; font-weight: 600;">Set Up Your Password</p>
      <p style="color: #92400e; margin: 0 0 10px 0; font-size: 14px;">You need to set up a password before you can log in.</p>
      <a href="${passwordResetUrl}" style="display: inline-block; background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Set Password</a>
    </div>
    ` : ''

    const { error } = await getResendClient().emails.send({
      from: 'ASG App <no_reply@asg.geofhoffman.com>',
      to: email,
      subject: `Route Assigned: ${routeName} - ${routeDate}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">ASG App</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Food Pickup Coordination</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>

    <p>You have been assigned to a pickup route!</p>

    <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Route:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${routeName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${routeDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Stops:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${stopCount} pickup location${stopCount !== 1 ? 's' : ''}</td>
        </tr>
      </table>
    </div>

    ${passwordSection}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Your Route</a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">Thank you for volunteering with ASG!</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">ASG Food Pickup Coordination App</p>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send route assignment email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending route assignment email:', err)
    return { success: false, error: 'Failed to send email' }
  }
}
