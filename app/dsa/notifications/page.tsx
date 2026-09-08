import { Bell, CheckCheck } from 'lucide-react'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { requireDsa } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { markNotificationsRead } from '../_actions/account'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const dsa = await requireDsa()

  const notifications = await prisma.notification.findMany({
    // Broadcasts (null recipient) reach everyone alongside personal notices.
    where: { OR: [{ userId: dsa.id }, { userId: null }] },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const unread = notifications.filter((n) => n.readAt === null && n.userId === dsa.id).length

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-navy-deep">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : 'You are all caught up.'}
          </p>
        </div>
        {unread > 0 && (
          <form action={markNotificationsRead}>
            <Button type="submit" variant="outline" size="lg">
              <CheckCheck className="size-4" aria-hidden />
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      <Card>
        <CardContent className={notifications.length === 0 ? undefined : 'px-0'}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Bell className="size-8 text-muted-foreground/50" aria-hidden />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {notifications.map((notification) => {
                const isUnread = notification.readAt === null && notification.userId === dsa.id
                return (
                  <li
                    key={notification.id}
                    className={cn(
                      'flex gap-3 px-(--card-spacing) py-4',
                      isUnread && 'bg-gold/5',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        isUnread ? 'bg-gold-dark' : 'bg-transparent',
                      )}
                      aria-hidden
                    />
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-navy-deep">{notification.title}</p>
                        <time className="text-xs text-muted-foreground">
                          {formatDateTime(notification.createdAt)}
                        </time>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
