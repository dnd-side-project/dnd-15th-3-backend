import type { ConfigService } from '@nestjs/config'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import type { Env } from 'src/config/env'
import { KakaoWalkingCourseService } from './kakao-walking-course.service'

const validResponse = {
  status: 'OK',
  route: {
    properties: {
      totalDistance: 850,
      totalTime: 620,
    },
    legs: [
      {
        properties: {
          distance: 850,
          time: 620,
        },
      },
    ],
  },
}

function createService(apiKey = 'test-rest-api-key') {
  const config = {
    get: jest.fn().mockReturnValue(apiKey),
  } as unknown as ConfigService<Env, true>

  return new KakaoWalkingCourseService(config)
}

const request = {
  // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
  start_x: '127.1',
  // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
  start_y: '37.5',
  // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
  end_x: '127.2',
  // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
  end_y: '37.6',
}

describe('KakaoWalkingCourseService', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('카카오 도보 경로 API를 호출하고 응답을 검증한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(validResponse), { status: 200 }),
      )
    const service = createService()

    const result = await service.getWalkingCourse(request)

    expect(result).toEqual(validResponse)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('https://dapi.kakao.com/v2/routing/walk?')
    expect(String(url)).toContain('start_x=127.1')
    expect(String(url)).toContain('start_y=37.5')
    expect(String(url)).toContain('end_x=127.2')
    expect(String(url)).toContain('end_y=37.6')
    expect(options?.headers).toEqual({
      // biome-ignore lint/style/useNamingConvention: HTTP 헤더 이름과 동일하게 유지
      Authorization: 'KakaoAK test-rest-api-key',
    })
  })

  it('선택 파라미터가 있으면 쿼리에 포함한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(validResponse), { status: 200 }),
      )
    const service = createService()

    await service.getWalkingCourse({
      ...request,
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      via_x: '127.15',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      via_y: '37.55',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      route_mode: 'SHORTEST',
    })

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('via_x=127.15')
    expect(String(url)).toContain('via_y=37.55')
    expect(String(url)).toContain('route_mode=SHORTEST')
  })

  it('선택 파라미터가 없으면 쿼리에 포함하지 않는다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(validResponse), { status: 200 }),
      )
    const service = createService()

    await service.getWalkingCourse(request)

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).not.toContain('via_x')
    expect(String(url)).not.toContain('route_mode')
  })

  it('status가 OK가 아니면 route 없이 status만 반환한다', async () => {
    const notFoundResponse = { status: 'ROUTE_RESULT_NOT_FOUND' }
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(notFoundResponse), { status: 200 }),
      )
    const service = createService()

    await expect(service.getWalkingCourse(request)).resolves.toEqual(
      notFoundResponse,
    )
  })

  it('네트워크 요청 자체가 실패하면 외부 서비스 오류로 변환한다', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))
    const service = createService()

    await expect(service.getWalkingCourse(request)).rejects.toMatchObject({
      errorCode: CommonErrorCode.externalServiceError,
    })
  })

  it('카카오 API가 오류 상태를 반환하면 외부 서비스 오류로 변환한다', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 401 }))
    const service = createService()

    await expect(service.getWalkingCourse(request)).rejects.toMatchObject({
      errorCode: CommonErrorCode.externalServiceError,
    })
  })

  it('카카오 API 응답을 JSON으로 읽을 수 없으면 외부 서비스 오류로 변환한다', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('not json', { status: 200 }))
    const service = createService()

    await expect(service.getWalkingCourse(request)).rejects.toMatchObject({
      errorCode: CommonErrorCode.externalServiceError,
    })
  })

  it('카카오 API 응답 형식이 잘못되면 외부 서비스 오류로 변환한다', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ invalid: true }), { status: 200 }),
      )
    const service = createService()

    await expect(service.getWalkingCourse(request)).rejects.toMatchObject({
      errorCode: CommonErrorCode.externalServiceError,
    })
  })

  it('REST API 키가 없으면 외부 API를 호출하지 않는다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')
    const service = createService('')

    await expect(service.getWalkingCourse(request)).rejects.toMatchObject({
      errorCode: CommonErrorCode.serviceUnavailable,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('요청 파라미터가 유효하지 않으면 예외를 던진다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')
    const service = createService()

    await expect(
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      service.getWalkingCourse({ ...request, start_x: 'invalid' }),
    ).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
