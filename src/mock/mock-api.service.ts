import { Injectable, NotImplementedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  CATEGORY_DEFINITIONS,
  DEFAULT_COURSE_CATEGORY_SLUGS,
  MAX_COURSE_STEPS,
} from 'src/category/category.constants'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import type { Env } from 'src/config/env'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { MEETING_TYPE_DEFINITIONS } from 'src/meeting/meeting-type.constants'

type CoursePlan = {
  version: number
  categorySlugs: CategorySlug[]
}

export type ParticipantSession = {
  participantId: string
  role: 'HOST' | 'MEMBER'
}

const meetingTypes = MEETING_TYPE_DEFINITIONS.map((definition, index) => ({
  id: String(index + 1),
  code: definition.code,
  name: definition.name,
}))

const avatars = [
  {
    id: 'momo-blue',
    name: '파란 모모',
    imageKey: 'avatars/momo-blue.png',
    imageUrl: 'https://images.momo.local/avatars/momo-blue.png',
  },
  {
    id: 'momo-yellow',
    name: '노란 모모',
    imageKey: 'avatars/momo-yellow.png',
    imageUrl: 'https://images.momo.local/avatars/momo-yellow.png',
  },
  {
    id: 'momo-purple',
    name: '보라 모모',
    imageKey: 'avatars/momo-purple.png',
    imageUrl: 'https://images.momo.local/avatars/momo-purple.png',
  },
]

const participants = [
  {
    id: '11',
    nickname: '모모',
    role: 'HOST',
    profileImageKey: 'avatars/momo-blue.png',
  },
  {
    id: '12',
    nickname: '지니',
    role: 'MEMBER',
    profileImageKey: 'avatars/momo-yellow.png',
  },
]

const recommendations = [
  {
    id: '21',
    categoryId: '1',
    place: {
      id: '301',
      name: '성수 카페 모모',
      address: '서울 성동구 성수이로 1',
      latitude: 37.5446,
      longitude: 127.0557,
      previewUrl: 'https://images.momo.local/places/cafe-momo.png',
    },
    recommendedByParticipantId: '11',
    likeCount: 2,
    dislikeCount: 0,
    viewerPreference: 'LIKE',
  },
  {
    id: '22',
    categoryId: '2',
    place: {
      id: '302',
      name: '성수 파스타',
      address: '서울 성동구 연무장길 20',
      latitude: 37.5438,
      longitude: 127.0571,
      previewUrl: 'https://images.momo.local/places/pasta.png',
    },
    recommendedByParticipantId: '12',
    likeCount: 1,
    dislikeCount: 0,
    viewerPreference: null,
  },
]

@Injectable()
export class MockApiService {
  private readonly coursePlans = new Map<string, CoursePlan>()

  constructor(private readonly config: ConfigService<Env, true>) {}

  get enabled() {
    return this.config.get('MOCK_API_ENABLED', { infer: true })
  }

  requireEnabled() {
    if (!this.enabled) {
      throw new NotImplementedException(
        'Swagger 명세 단계입니다. MOCK_API_ENABLED=true로 실행하면 고정 fixture를 반환합니다.',
      )
    }
  }

  getAvatars() {
    return avatars
  }

  getMeetingTypes() {
    return meetingTypes
  }

  getCategories() {
    return CATEGORY_DEFINITIONS.map(({ id, name, slug }) => ({
      id,
      name,
      slug,
    }))
  }

  getParticipantSession(
    participantAccessToken: string,
  ): ParticipantSession | undefined {
    if (participantAccessToken === 'host-session-token') {
      return { participantId: '11', role: 'HOST' }
    }
    if (participantAccessToken === 'member-session-token') {
      return { participantId: '12', role: 'MEMBER' }
    }
    return undefined
  }

  private getOrCreateCoursePlan(meetingId: string): CoursePlan {
    const existingPlan = this.coursePlans.get(meetingId)
    if (existingPlan) return existingPlan

    const defaultPlan: CoursePlan = {
      version: 1,
      categorySlugs: [...DEFAULT_COURSE_CATEGORY_SLUGS],
    }
    this.coursePlans.set(meetingId, defaultPlan)
    return defaultPlan
  }

  private isValidCoursePlan(
    categorySlugs: readonly CategorySlug[] | undefined,
  ) {
    if (!Array.isArray(categorySlugs)) return false
    if (categorySlugs.length > MAX_COURSE_STEPS) return false
    if (new Set(categorySlugs).size !== categorySlugs.length) return false

    const validSlugs = new Set(this.getCategories().map(({ slug }) => slug))
    return categorySlugs.every((slug) => validSlugs.has(slug))
  }

  private buildCategorySteps(categorySlugs: readonly CategorySlug[]) {
    return categorySlugs.flatMap((slug, index) => {
      const category = this.getCategories().find(
        ({ slug: categorySlug }) => categorySlug === slug,
      )
      if (!category) return []

      return [{ ...category, order: index + 1 }]
    })
  }

  private buildCoursePlanResponse(meetingId: string, plan: CoursePlan) {
    return {
      meetingId,
      maxSteps: MAX_COURSE_STEPS,
      version: plan.version,
      categorySteps: this.buildCategorySteps(plan.categorySlugs),
    }
  }

  searchPlaces(keyword: string, categoryId?: string) {
    const normalizedKeyword = keyword.trim().toLowerCase()
    const normalizedCategoryId = categoryId?.trim()

    return recommendations
      .filter(({ categoryId: recommendationCategoryId, place }) => {
        const matchesKeyword = [place.name, place.address].some((value) =>
          value.toLowerCase().includes(normalizedKeyword),
        )
        const matchesCategory =
          !normalizedCategoryId ||
          recommendationCategoryId === normalizedCategoryId

        return matchesKeyword && matchesCategory
      })
      .map((recommendation) => recommendation.place)
  }

  private buildMeetingDetail(
    role: 'HOST' | 'MEMBER',
    viewerParticipantId: string,
    participantAccessToken: string,
  ) {
    const isHost = role === 'HOST'
    return {
      id: '1',
      meetingId: '1',
      accessToken: 'DNDFOR',
      participantAccessToken,
      invitationUrl: 'https://momo.local/invite/DNDFOR',
      name: '성수 브런치 모임',
      meetingType: meetingTypes.find(
        ({ code }) => code === MeetingTypeCode.Social,
      ),
      date: '2026-08-23',
      time: '12:00',
      role,
      isHost,
      placeId: '101',
      permissions: {
        canManageMeeting: isHost,
        canSelectCourse: isHost,
        canShareInvitation: isHost,
      },
      firstLocation: {
        id: '101',
        name: '성수역 3번 출구',
        address: '서울 성동구 성수이로 1',
        latitude: 37.5446,
        longitude: 127.0557,
      },
      viewerParticipantId,
      participants,
      categorySteps: this.buildCategorySteps(
        this.getOrCreateCoursePlan('1').categorySlugs,
      ),
      recommendations,
      selectedCourse: null,
    }
  }

  getInvitationPreview(accessToken: string) {
    if (accessToken !== 'DNDFOR') return undefined

    return {
      meetingId: '1',
      accessToken: 'DNDFOR',
      invitationUrl: 'https://momo.local/invite/DNDFOR',
      name: '성수 브런치 모임',
      date: '2026-08-23',
      time: '12:00',
      placeId: '101',
    }
  }

  getMeetingDetail(meetingId: string, participantAccessToken: string) {
    if (meetingId !== '1') return 'NOT_FOUND' as const
    const session = this.getParticipantSession(participantAccessToken)
    if (!session) return undefined

    return this.buildMeetingDetail(
      session.role,
      session.participantId,
      participantAccessToken,
    )
  }

  getCoursePlan(meetingId: string, participantAccessToken: string) {
    if (meetingId !== '1') return 'NOT_FOUND' as const
    if (!this.getParticipantSession(participantAccessToken)) return undefined

    return this.buildCoursePlanResponse(
      meetingId,
      this.getOrCreateCoursePlan(meetingId),
    )
  }

  updateCoursePlan(
    meetingId: string,
    participantAccessToken: string,
    categorySlugs: CategorySlug[],
    version: number,
  ) {
    if (meetingId !== '1') return 'NOT_FOUND' as const

    const session = this.getParticipantSession(participantAccessToken)
    if (!session) return 'UNAUTHORIZED' as const
    if (session.role !== 'HOST') return 'FORBIDDEN' as const

    const currentPlan = this.getOrCreateCoursePlan(meetingId)
    if (version !== currentPlan.version) return 'CONFLICT' as const
    if (!this.isValidCoursePlan(categorySlugs)) return 'BAD_REQUEST' as const

    const nextPlan: CoursePlan = {
      version: currentPlan.version + 1,
      categorySlugs: [...categorySlugs],
    }
    this.coursePlans.set(meetingId, nextPlan)

    return this.buildCoursePlanResponse(meetingId, nextPlan)
  }

  createMeeting(
    categorySlugs: CategorySlug[] = [...DEFAULT_COURSE_CATEGORY_SLUGS],
  ) {
    if (!this.isValidCoursePlan(categorySlugs)) return 'BAD_REQUEST' as const

    this.coursePlans.set('1', { version: 1, categorySlugs: [...categorySlugs] })
    return this.buildMeetingDetail('HOST', '11', 'host-session-token')
  }

  joinMeeting(accessToken: string) {
    if (accessToken !== 'DNDFOR') return undefined

    return this.buildMeetingDetail('MEMBER', '12', 'member-session-token')
  }
}
