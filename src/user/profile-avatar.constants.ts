import { ProfileAvatarId } from './enums/profile-avatar-id.enum'

export const PROFILE_AVATAR_DEFINITIONS = [
  { id: ProfileAvatarId.MomoBlue, name: '파란 모모', displayOrder: 1 },
  { id: ProfileAvatarId.MomoYellow, name: '노란 모모', displayOrder: 2 },
  { id: ProfileAvatarId.MomoPurple, name: '보라 모모', displayOrder: 3 },
  { id: ProfileAvatarId.MomoPink, name: '분홍 모모', displayOrder: 4 },
  { id: ProfileAvatarId.MomoGreen, name: '초록 모모', displayOrder: 5 },
] as const
