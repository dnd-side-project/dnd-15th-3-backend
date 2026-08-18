export const OutboxAggregateType = {
  meeting: 'meeting',
} as const

export type OutboxAggregateType =
  (typeof OutboxAggregateType)[keyof typeof OutboxAggregateType]
