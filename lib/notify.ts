import { prisma } from '@/lib/db'
import { sendEmail, sendSms, type EmailMessage } from '@/lib/mail'
import type { NotificationChannel } from '@/lib/generated/prisma/client'

type NotifyInput = {
  userId: string | null
  title: string
  message: string
  type: string
  channels: NotificationChannel[]
  email?: { to: string } & Omit<EmailMessage, 'to'>
  sms?: { to: string; body: string }
}

/**
 * Records the in-app notification and fans out to the requested channels.
 *
 * Delivery failures are logged, never thrown: an SMS outage must not roll back
 * an approval that has already been committed.
 */
export async function notify(input: NotifyInput) {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        channels: input.channels,
      },
    })
  } catch (error) {
    console.error('[notify] failed to record in-app notification', input.type, error)
  }

  if (input.channels.includes('EMAIL') && input.email) {
    try {
      await sendEmail(input.email)
    } catch (error) {
      console.error('[notify] email delivery failed', input.type, error)
    }
  }

  if (input.channels.includes('SMS') && input.sms) {
    try {
      await sendSms(input.sms)
    } catch (error) {
      console.error('[notify] sms delivery failed', input.type, error)
    }
  }
}
