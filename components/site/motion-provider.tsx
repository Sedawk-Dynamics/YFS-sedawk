'use client'

import { MotionConfig } from 'framer-motion'

/**
 * Honours the viewer's "reduce motion" system setting across every animation on
 * the site. Framer skips transform and layout animations when it is on, leaving
 * opacity changes, so content still appears without sliding or parallaxing.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
