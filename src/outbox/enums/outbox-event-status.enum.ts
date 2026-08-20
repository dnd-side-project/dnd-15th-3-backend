export enum OutboxEventStatus {
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Processed = 'PROCESSED',
  Failed = 'FAILED',
  DeadLetter = 'DEAD_LETTER',
}
