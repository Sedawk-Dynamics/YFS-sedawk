import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Outbound email and SMS.
 *
 * Email goes over SMTP when SMTP_HOST/SMTP_USER/SMTP_PASS are set, and falls
 * back to a console log otherwise so development works with no provider.
 * SMS has no provider yet and always logs — swap `sendSms` for MSG91/Twilio.
 */

export type EmailMessage = {
  to: string
  subject: string
  body: string
}

export type SmsMessage = {
  to: string
  body: string
}

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

let transporter: Transporter | null = null

function getTransporter() {
  if (transporter) return transporter
  const port = Number(process.env.SMTP_PORT ?? 587)
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 upgrades via STARTTLS.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  return transporter
}

function logToConsole(message: EmailMessage) {
  console.info(
    ['[email]', `to: ${message.to}`, `subject: ${message.subject}`, message.body, ''].join('\n  '),
  )
}

/**
 * Sends an email. Throws on SMTP failure so callers can decide what to do —
 * the notification layer swallows it, but registration surfaces it.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (!isEmailConfigured()) {
    logToConsole(message)
    return
  }

  const from =
    process.env.SMTP_FROM ?? `YFS Infinity <${process.env.SMTP_USER}>`

  await getTransporter().sendMail({
    from,
    to: message.to,
    subject: message.subject,
    text: message.body,
  })
}

export async function sendSms(message: SmsMessage): Promise<void> {
  console.info(['[sms]', `to: ${message.to}`, message.body, ''].join('\n  '))
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

/**
 * Spec §10.1 — mandatory on every approval, with identical wording for DSAs who
 * registered with a Refer Code and those who did not.
 */
export function approvalEmail(name: string): Omit<EmailMessage, 'to'> {
  return {
    subject: 'Your DSA Application is Approved',
    body:
      `Dear ${name},\n\n` +
      'Your documents have been successfully verified. You can now log in to the DSA Portal ' +
      'using your registered email/mobile and password.\n\n' +
      `Log in: ${appUrl()}/login\n\n` +
      'YFS Infinity Private Limited',
  }
}

export function rejectionEmail(name: string, reason: string): Omit<EmailMessage, 'to'> {
  return {
    subject: 'Update on your DSA Application',
    body:
      `Dear ${name},\n\n` +
      'We were unable to approve your DSA application at this time.\n\n' +
      `Reason: ${reason}\n\n` +
      'You may contact our team if you believe this was in error.\n\n' +
      'YFS Infinity Private Limited',
  }
}

export function newReferralEmail(referrerName: string, joinedName: string) {
  return {
    subject: 'A new DSA has joined under you',
    body:
      `Dear ${referrerName},\n\n` +
      `${joinedName} has been approved and is now linked under your Refer Code.\n\n` +
      `View your referrals: ${appUrl()}/dsa/referrals\n\n` +
      'YFS Infinity Private Limited',
  }
}

export function payoutPublishedEmail(name: string, month: string, hasSlip: boolean) {
  return {
    subject: `Your payout for ${month} has been published`,
    body:
      `Dear ${name},\n\n` +
      `Your payout details for ${month} are now available in your dashboard.\n` +
      (hasSlip
        ? 'Your salary slip is available to download.\n'
        : 'Your salary slip will be uploaded shortly.\n') +
      `\nView payouts: ${appUrl()}/dsa/payouts\n\n` +
      'YFS Infinity Private Limited',
  }
}
