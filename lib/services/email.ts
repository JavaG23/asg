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
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Food Donation Coordination</p>
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
    <p style="margin: 0;">ASG Food Donation Coordination App</p>
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

// ============================================
// DONOR PORTAL EMAIL TEMPLATES (#35)
// ============================================

export async function sendDonorWelcomeEmail(
  email: string,
  name: string,
  passwordSetupUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: 'ASG App <no_reply@asg.geofhoffman.com>',
      to: email,
      subject: 'Welcome to ASG Food Donation Program!',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to ASG!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Food Donation Program</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>

    <p>Welcome to A Simple Gesture! Your donor account has been approved and you're now part of our food donation community.</p>

    <p>As a donor, you can:</p>
    <ul style="color: #4b5563;">
      <li>Opt-in to scheduled pickup dates</li>
      <li>Set reminder preferences for upcoming pickups</li>
      <li>View your donation history</li>
      <li>Update your contact information</li>
    </ul>

    <p>Click the button below to set up your password and access your donor dashboard:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${passwordSetupUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Set Up Your Account</a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">This link will expire in <strong>24 hours</strong>.</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #6b7280; font-size: 14px;">Thank you for supporting our mission to fight hunger in our community!</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">A Simple Gesture - Food Donation Program</p>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send donor welcome email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending donor welcome email:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendPickupReminderEmail(
  email: string,
  name: string,
  date: string,
  address: string,
  cancelUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: 'ASG App <no_reply@asg.geofhoffman.com>',
      to: email,
      subject: `Pickup Reminder: ${date}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Pickup Reminder</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">A Simple Gesture</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>

    <p>This is a friendly reminder that you have an upcoming food donation pickup scheduled.</p>

    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #92400e; font-size: 14px;">Date:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #78350f;">${date}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #92400e; font-size: 14px;">Address:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #78350f;">${address}</td>
        </tr>
      </table>
    </div>

    <p><strong>Please remember to:</strong></p>
    <ul style="color: #4b5563;">
      <li>Place your food donation outside by the designated time</li>
      <li>Ensure items are in sealed, weatherproof containers if possible</li>
      <li>Check expiration dates on donated items</li>
    </ul>

    <p style="color: #6b7280; font-size: 14px;">If you need to cancel this pickup, please let us know as soon as possible so we can adjust our route.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${cancelUrl}" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Cancel This Pickup</a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">A Simple Gesture - Food Donation Program</p>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send pickup reminder email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending pickup reminder email:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendFoodNotOutsideEmail(
  email: string,
  name: string,
  nextDates: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const upcomingDatesHtml = nextDates.length > 0
      ? `<p>Upcoming pickup dates you can opt into:</p>
         <ul style="color: #4b5563;">
           ${nextDates.map(d => `<li>${d}</li>`).join('')}
         </ul>`
      : ''

    const { error } = await getResendClient().emails.send({
      from: 'ASG App <no_reply@asg.geofhoffman.com>',
      to: email,
      subject: 'Missed Pickup - A Simple Gesture',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Missed Pickup</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">A Simple Gesture</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>

    <p>Our driver visited your location today but was unable to find your food donation outside.</p>

    <p>We understand that schedules can be unpredictable. If you'd like to reschedule or need assistance, please don't hesitate to reach out.</p>

    ${upcomingDatesHtml}

    <p style="color: #6b7280; font-size: 14px;">If you're no longer able to participate in our program, you can update your preferences in your donor dashboard or contact us.</p>

    <p>Thank you for your continued support!</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">A Simple Gesture - Food Donation Program</p>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send food not outside email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending food not outside email:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendDonorReengagementEmail(
  email: string,
  name: string,
  upcomingDates: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: 'ASG App <no_reply@asg.geofhoffman.com>',
      to: email,
      subject: 'We Miss You! - A Simple Gesture',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">We Miss You!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">A Simple Gesture</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>

    <p>We noticed it's been a while since your last food donation pickup. We wanted to reach out and let you know we'd love to have you back!</p>

    <p>Your contributions make a real difference in fighting hunger in our community. Here are some upcoming pickup dates you can sign up for:</p>

    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="font-weight: 600; color: #991b1b; margin: 0 0 10px 0;">Upcoming Pickup Dates:</p>
      <ul style="color: #7f1d1d; margin: 0; padding-left: 20px;">
        ${upcomingDates.map(d => `<li>${d}</li>`).join('')}
      </ul>
    </div>

    <p>Log into your donor dashboard to opt-in for any of these dates, or update your contact information if anything has changed.</p>

    <p style="color: #6b7280; font-size: 14px;">Thank you for being part of our community!</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">A Simple Gesture - Food Donation Program</p>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send donor reengagement email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending donor reengagement email:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

// ============================================
// VOLUNTEER PORTAL EMAIL TEMPLATES (#36)
// ============================================

export async function sendVolunteerShiftConfirmationEmail(
  email: string,
  name: string,
  shiftDate: string,
  time: string,
  location: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: 'ASG App <no_reply@asg.geofhoffman.com>',
      to: email,
      subject: `Shift Confirmed: ${shiftDate}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Shift Confirmed!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">A Simple Gesture Volunteer</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>

    <p>Great news! Your volunteer shift has been approved.</p>

    <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #166534; font-size: 14px;">Date:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #14532d;">${shiftDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #166534; font-size: 14px;">Time:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #14532d;">${time}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #166534; font-size: 14px;">Location:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #14532d;">${location}</td>
        </tr>
      </table>
    </div>

    <p><strong>Remember to:</strong></p>
    <ul style="color: #4b5563;">
      <li>Arrive a few minutes early</li>
      <li>Clock in when you arrive using the volunteer app</li>
      <li>Clock out when your shift ends</li>
    </ul>

    <p style="color: #6b7280; font-size: 14px;">If you need to cancel, please do so as soon as possible through your volunteer dashboard so we can offer the spot to someone on the waitlist.</p>

    <p>Thank you for volunteering with A Simple Gesture!</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">A Simple Gesture - Volunteer Program</p>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send volunteer shift confirmation email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending volunteer shift confirmation email:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendVolunteerWaitlistNotificationEmail(
  email: string,
  name: string,
  shiftDate: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: 'ASG App <no_reply@asg.geofhoffman.com>',
      to: email,
      subject: `Waitlisted for Shift: ${shiftDate}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">You're on the Waitlist</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">A Simple Gesture Volunteer</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>

    <p>Thank you for your interest in volunteering! The shift on <strong>${shiftDate}</strong> is currently full, but you've been added to the waitlist.</p>

    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #92400e; margin: 0; font-size: 14px;">
        <strong>What this means:</strong> If a spot opens up, we'll notify you and move you to the approved list.
      </p>
    </div>

    <p>In the meantime, you can:</p>
    <ul style="color: #4b5563;">
      <li>Check for other available shifts in your dashboard</li>
      <li>Keep an eye on your email for waitlist updates</li>
    </ul>

    <p>Thank you for your dedication to helping our community!</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">A Simple Gesture - Volunteer Program</p>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send waitlist notification email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending waitlist notification email:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendVolunteerWelcomeEmail(
  email: string,
  name: string,
  passwordSetupUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: 'ASG App <no_reply@asg.geofhoffman.com>',
      to: email,
      subject: 'Welcome to ASG Volunteer Program!',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to ASG!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Volunteer Program</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>

    <p>Welcome to A Simple Gesture! Your volunteer account has been approved and you're now part of our volunteer team.</p>

    <p>As a volunteer, you can:</p>
    <ul style="color: #4b5563;">
      <li>Browse and sign up for available shifts</li>
      <li>Clock in/out to track your volunteer hours</li>
      <li>View your hour history and statistics</li>
      <li>Update your profile information</li>
    </ul>

    <p>Click the button below to set up your password and access your volunteer dashboard:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${passwordSetupUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Set Up Your Account</a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">This link will expire in <strong>24 hours</strong>.</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #6b7280; font-size: 14px;">Thank you for joining our mission to fight hunger in our community!</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">A Simple Gesture - Volunteer Program</p>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send volunteer welcome email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending volunteer welcome email:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendVolunteerReengagementEmail(
  email: string,
  name: string,
  upcomingShifts: Array<{ date: string; time: string; location: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const shiftsHtml = upcomingShifts.length > 0
      ? `<div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="font-weight: 600; color: #166534; margin: 0 0 10px 0;">Upcoming Volunteer Shifts:</p>
          <ul style="color: #15803d; margin: 0; padding-left: 20px;">
            ${upcomingShifts.map(s => `<li>${s.date} - ${s.time} at ${s.location}</li>`).join('')}
          </ul>
        </div>`
      : ''

    const { error } = await getResendClient().emails.send({
      from: 'ASG App <no_reply@asg.geofhoffman.com>',
      to: email,
      subject: 'We Miss You! - A Simple Gesture Volunteers',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">We Miss You!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">A Simple Gesture Volunteer Team</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>

    <p>We noticed it's been a while since you last volunteered with us. We wanted to reach out and let you know we'd love to have you back!</p>

    <p>Your time and dedication make a real difference in fighting hunger in our community. Every hour you volunteer helps us serve more families in need.</p>

    ${shiftsHtml}

    <p>Log into your volunteer dashboard to sign up for shifts, or simply stop by during any event day to help out.</p>

    <p style="color: #6b7280; font-size: 14px;">Thank you for being part of our community!</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">A Simple Gesture - Volunteer Program</p>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send volunteer reengagement email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending volunteer reengagement email:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

// Volunteer portal build-out (#65): "Contact Manager" button on an
// opportunity card. Sends the volunteer's message to the opportunity
// manager with reply-to set to the volunteer.
export async function sendContactOpportunityManagerEmail(
  managerEmail: string,
  managerName: string,
  opportunityName: string,
  volunteerName: string,
  volunteerEmail: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: 'ASG App <no_reply@asg.geofhoffman.com>',
      to: managerEmail,
      replyTo: volunteerEmail,
      subject: `Volunteer question about ${opportunityName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Volunteer Message</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${opportunityName}</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${managerName},</h2>

    <p><strong>${volunteerName}</strong> (${volunteerEmail}) sent a message about the <strong>${opportunityName}</strong> opportunity:</p>

    <div style="background: #f3f4f6; border-left: 4px solid #16a34a; border-radius: 4px; padding: 16px; margin: 20px 0; white-space: pre-wrap;">${message}</div>

    <p style="color: #6b7280; font-size: 14px;">Reply directly to this email to respond to the volunteer.</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">A Simple Gesture - Volunteer Program</p>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send contact manager email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending contact manager email:', err)
    return { success: false, error: 'Failed to send email' }
  }
}
