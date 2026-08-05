import { INestApplication } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MockApiModule } from 'src/mock/mock-api.module'
import request from 'supertest'
import { MeetingModule } from './meeting.module'

describe('meeting middleware integration', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [
            () => ({
              // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
              MOCK_API_ENABLED: true,
            }),
          ],
        }),
        MockApiModule,
        MeetingModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('protects meeting detail with a participant Bearer token', async () => {
    await request(app.getHttpServer())
      .get('/meeting/1')
      .set('Authorization', 'Bearer host-session-token')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          viewerParticipantId: '11',
          role: 'HOST',
        })
      })
  })

  it('returns 401 for missing and invalid participant tokens', async () => {
    await request(app.getHttpServer()).get('/meeting/1').expect(401)
    await request(app.getHttpServer())
      .get('/meeting/1')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401)
  })

  it('keeps the mock-only query token compatibility path', async () => {
    await request(app.getHttpServer())
      .get('/meeting/1?accessToken=member-session-token')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          viewerParticipantId: '12',
          role: 'MEMBER',
        })
      })
  })

  it('gives Authorization precedence over the query token', async () => {
    await request(app.getHttpServer())
      .get('/meeting/1?accessToken=member-session-token')
      .set('Authorization', 'Bearer host-session-token')
      .expect(200)
      .expect(({ body }) => {
        expect(body.viewerParticipantId).toBe('11')
      })
  })

  it('returns 403 when a member updates the course plan', async () => {
    await request(app.getHttpServer())
      .put('/meetings/1/course-plan')
      .set('Authorization', 'Bearer member-session-token')
      .send({ categorySlugs: [CategorySlug.Cafe], version: 1 })
      .expect(403)
  })

  it('returns 400 for invalid course plans after authentication', async () => {
    await request(app.getHttpServer())
      .put('/meetings/1/course-plan')
      .set('Authorization', 'Bearer host-session-token')
      .send({
        categorySlugs: [CategorySlug.Cafe, CategorySlug.Cafe],
        version: 1,
      })
      .expect(400)
  })

  it('leaves invitation preview and join public', async () => {
    await request(app.getHttpServer())
      .post('/meetings/invitation/preview')
      .send({ accessToken: 'DNDFOR' })
      .expect(201)

    await request(app.getHttpServer())
      .post('/meetings/join')
      .send({
        accessToken: 'DNDFOR',
        userKey: 'device-1',
        nickname: '지니',
      })
      .expect(201)
  })

  it('returns 400 for invalid meeting input', async () => {
    await request(app.getHttpServer())
      .post('/meetings')
      .send({
        meetingTypeCode: 'INVALID',
        name: '모임',
        date: '2026-02-30',
        time: '12:00',
        firstLocationPlaceId: '101',
        categorySlugs: [CategorySlug.Cafe],
        host: { userKey: 'device-1', nickname: '모모' },
      })
      .expect(400)
  })
})
