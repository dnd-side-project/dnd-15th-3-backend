import { z } from 'zod'

export const feedbackConstraintSchema = z.strictObject({
  kind: z.enum(['include', 'exclude', 'prefer', 'avoid']),
  target: z.enum(['place', 'category', 'tag']),
  values: z.array(z.string().min(1)).min(1).max(20),
  strength: z.enum(['hard', 'soft']),
  weight: z.number().min(0).max(1),
  commentIds: z.array(z.string().min(1)).max(20).default([]),
})

export const courseFeedbackInterpretationSchema = z.strictObject({
  constraints: z.array(feedbackConstraintSchema).max(50),
  unresolved: z
    .array(
      z.strictObject({
        commentId: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .max(20),
})

export type FeedbackConstraint = z.infer<typeof feedbackConstraintSchema>
export type CourseFeedbackInterpretation = z.infer<
  typeof courseFeedbackInterpretationSchema
>

export function emptyCourseFeedback(): CourseFeedbackInterpretation {
  return { constraints: [], unresolved: [] }
}

export function parseCourseFeedback(
  raw: unknown,
): CourseFeedbackInterpretation {
  return courseFeedbackInterpretationSchema.parse(raw)
}
