import { Injectable, NotImplementedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'

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
    return [
      { id: '1', name: '친구 모임' },
      { id: '2', name: '데이트' },
      { id: '3', name: '가족 모임' },
    ]
  }

  getCategories() {
    return [
      { id: '1', name: '카페', slug: 'cafe' },
      { id: '2', name: '식사', slug: 'restaurant' },
      { id: '3', name: '산책', slug: 'walk' },
    ]
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
      meetingType: { id: '1', name: '친구 모임' },
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
      categorySteps: this.getCategories().map((category, index) => ({
        ...category,
        order: index + 1,
      })),
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
    if (participantAccessToken === 'host-session-token') {
      return this.buildMeetingDetail('HOST', '11', participantAccessToken)
    }
    if (participantAccessToken === 'member-session-token') {
      return this.buildMeetingDetail('MEMBER', '12', participantAccessToken)
    }
    return undefined
  }

  createMeeting() {
    return this.buildMeetingDetail('HOST', '11', 'host-session-token')
  }

  joinMeeting(accessToken: string) {
    if (accessToken !== 'DNDFOR') return undefined

    return this.buildMeetingDetail('MEMBER', '12', 'member-session-token')
  }
}
