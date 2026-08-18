export enum OutboxEventStatus {
  Pending = 'PENDING',
  Processed = 'PROCESSED',
  Failed = 'FAILED',
  DeadLetter = 'DEAD_LETTER',
}
