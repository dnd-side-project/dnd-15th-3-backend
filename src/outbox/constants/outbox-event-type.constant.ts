export const OutboxEventType = {
  courseConfirmed: 'COURSE_CONFIRMED',
} as const

export type OutboxEventType =
  (typeof OutboxEventType)[keyof typeof OutboxEventType]
