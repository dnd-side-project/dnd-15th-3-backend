import { NotImplementedException } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { CourseController } from './course.controller'

function createController() {
  return new CourseController()
}

describe('CourseController', () => {
  it('실제 데이터 연동 전까지 모든 엔드포인트가 501을 반환한다', () => {
    const controller = createController()

    expect(() => controller.generateCourse('1')).toThrow(
      NotImplementedException,
    )
  })

  it('Swagger 문서에 모든 경로와 응답 코드가 포함된다', async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [CourseController],
    }).compile()
    const app = moduleFixture.createNestApplication()
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    )

    type PathOperations = {
      post?: { responses?: Record<string, unknown> }
    }

    function responseCodes(responses?: Record<string, unknown>) {
      return Object.keys(responses ?? {}).sort()
    }

    const coursesPath = document.paths?.['/meetings/{meetingId}/courses'] as
      | PathOperations
      | undefined
    expect(responseCodes(coursesPath?.post?.responses)).toEqual(
      ['202', '400', '401', '403', '404', '409', '422', '501'].sort(),
    )

    await app.close()
  })
})
