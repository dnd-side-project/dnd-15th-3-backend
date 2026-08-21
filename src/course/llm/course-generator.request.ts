import type { CourseStrategy } from './course-generator.planner'

export type CourseGenerationMode = 'initial' | 'regenerate-one'

export type CourseCommentInput = {
  id: string
  content: string
}

export type CourseGenerationOptions = {
  mode?: CourseGenerationMode
  targetStrategy?: CourseStrategy
  currentPlaceIds?: readonly string[]
  reservedPlaceIds?: readonly (readonly string[])[]
  comments?: readonly CourseCommentInput[]
  variationSeed?: string
}
