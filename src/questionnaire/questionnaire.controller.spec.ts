import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { QuestionnaireGenerationStatus } from './enums/questionnaire-generation-status.enum'
import { QuestionnaireController } from './questionnaire.controller'
import { QuestionnaireService } from './questionnaire.service'

const response = {
  status: QuestionnaireGenerationStatus.Ready,
  questionnaireId: '10',
  version: 1,
  totalCount: 3,
  availableCount: 3,
  questions: [],
}

describe('QuestionnaireController', () => {
  it('질문 생성과 조회를 QuestionnaireService에 위임한다', async () => {
    const service = {
      createQuestionnaire: jest.fn().mockResolvedValue(response),
      getQuestionnaire: jest.fn().mockResolvedValue(response),
    }
    const controller = new QuestionnaireController(service as never)

    await expect(
      controller.createQuestionnaire('1', 'host-token'),
    ).resolves.toEqual(response)
    await expect(
      controller.getQuestionnaire('1', 'host-token'),
    ).resolves.toEqual(response)
    expect(service.createQuestionnaire).toHaveBeenCalledWith('1', 'host-token')
    expect(service.getQuestionnaire).toHaveBeenCalledWith('1', 'host-token')
  })

  it('Swagger에 생성·조회 API 계약을 등록한다', async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [QuestionnaireController],
      providers: [
        {
          provide: QuestionnaireService,
          useValue: {
            createQuestionnaire: jest.fn(),
            getQuestionnaire: jest.fn(),
          },
        },
      ],
    }).compile()
    const app = moduleFixture.createNestApplication()
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    )
    const path = document.paths?.['/meetings/{meetingId}/questionnaire']

    expect(Object.keys(path?.post?.responses ?? {}).sort()).toEqual(
      ['200', '401', '403', '404', '409'].sort(),
    )
    expect(Object.keys(path?.get?.responses ?? {}).sort()).toEqual(
      ['200', '401', '403', '404'].sort(),
    )

    await app.close()
  })
})
