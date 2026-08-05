import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import {
  deleteObjectRequestSchema,
  getDownloadUrlRequestSchema,
  getPublicUrlRequestSchema,
  getUploadUrlRequestSchema,
} from './schemas/storage-request.schema'
import { StorageService } from './storage.service'

class GetUploadUrlDto {
  @ApiProperty({
    description: '버킷 내 객체 키(경로)',
    example: 'uploads/profile-avatar.png',
  })
  key!: string

  @ApiPropertyOptional({
    description: '업로드할 파일의 MIME 타입',
    example: 'image/png',
  })
  contentType?: string

  @ApiPropertyOptional({
    description: 'URL 만료 시간(초, 기본값: 300)',
    example: 300,
    default: 300,
  })
  expiresIn?: number
}

class GetDownloadUrlDto {
  @ApiProperty({
    description: '버킷 내 객체 키(경로)',
    example: 'uploads/profile-avatar.png',
  })
  key!: string

  @ApiPropertyOptional({
    description: 'URL 만료 시간(초, 기본값: 3600)',
    example: 3600,
    default: 3600,
  })
  expiresIn?: number
}

class GetPublicUrlDto {
  @ApiProperty({
    description: '버킷 내 객체 키(경로)',
    example: 'uploads/profile-avatar.png',
  })
  key!: string
}

class DeleteObjectDto {
  @ApiProperty({
    description: '버킷 내 객체 키(경로)',
    example: 'uploads/profile-avatar.png',
  })
  key!: string
}

@ApiTags('스토리지')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  @UsePipes(new ZodValidationPipe(getUploadUrlRequestSchema))
  @ApiBadRequestResponse({
    description: '객체 키, MIME 타입 또는 만료 시간이 올바르지 않습니다.',
  })
  @ApiOperation({
    summary: '업로드용 사전 서명 URL 조회',
    description:
      '사전 서명된 PUT URL을 반환합니다. 클라이언트는 이 URL을 사용해 OCI Object Storage에 파일을 직접 업로드합니다.',
  })
  @ApiBody({ type: GetUploadUrlDto })
  @ApiResponse({ status: 201, description: '업로드용 사전 서명 URL 생성 완료' })
  async getUploadUrl(@Body() dto: GetUploadUrlDto) {
    const url = await this.storageService.getPresignedUploadUrl(
      dto.key,
      dto.contentType,
      dto.expiresIn,
    )
    return {
      uploadUrl: url,
      bucket: this.storageService.getBucketName(),
      key: dto.key,
    }
  }

  @Post('download-url')
  @UsePipes(new ZodValidationPipe(getDownloadUrlRequestSchema))
  @ApiBadRequestResponse({
    description: '객체 키 또는 만료 시간이 올바르지 않습니다.',
  })
  @ApiOperation({
    summary: '다운로드용 사전 서명 URL 조회',
    description:
      '비공개 객체에 대한 사전 서명된 GET URL을 반환합니다. 클라이언트는 이 URL을 사용해 OCI Object Storage에서 파일을 직접 다운로드합니다.',
  })
  @ApiBody({ type: GetDownloadUrlDto })
  @ApiResponse({
    status: 201,
    description: '다운로드용 사전 서명 URL 생성 완료',
  })
  async getDownloadUrl(@Body() dto: GetDownloadUrlDto) {
    const url = await this.storageService.getPresignedDownloadUrl(
      dto.key,
      dto.expiresIn,
    )
    return {
      downloadUrl: url,
      bucket: this.storageService.getBucketName(),
      key: dto.key,
    }
  }

  @Post('public-url')
  @UsePipes(new ZodValidationPipe(getPublicUrlRequestSchema))
  @ApiBadRequestResponse({
    description: '객체 키가 올바르지 않습니다.',
  })
  @ApiOperation({
    summary: '객체 공개 URL 조회',
    description: '공개 객체의 직접 URL(서명되지 않은 URL)을 반환합니다.',
  })
  @ApiBody({ type: GetPublicUrlDto })
  @ApiResponse({ status: 201, description: '공개 URL 생성 완료' })
  async getPublicUrl(@Body() dto: GetPublicUrlDto) {
    return {
      publicUrl: await this.storageService.getPublicUrl(dto.key),
      bucket: this.storageService.getBucketName(),
      key: dto.key,
    }
  }

  @Delete('objects')
  @UsePipes(new ZodValidationPipe(deleteObjectRequestSchema))
  @ApiBadRequestResponse({
    description: '객체 키가 올바르지 않습니다.',
  })
  @ApiOperation({
    summary: '객체 삭제',
    description:
      '버킷에서 객체를 영구적으로 삭제합니다. 설정된 인증 정보로 서버에서 실행됩니다.',
  })
  @ApiBody({ type: DeleteObjectDto })
  @ApiResponse({ status: 204, description: '객체 삭제 완료' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteObject(@Body() dto: DeleteObjectDto) {
    await this.storageService.deleteObject(dto.key)
  }
}
