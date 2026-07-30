import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { StorageService } from './storage.service'

class GetUploadUrlDto {
  key!: string
  contentType?: string
  expiresIn?: number
}

class GetDownloadUrlDto {
  key!: string
  expiresIn?: number
}

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  @ApiOperation({
    summary: 'Get pre-signed upload URL',
    description:
      'Returns a pre-signed PUT URL. The client uploads the file directly to OCI Object Storage using this URL.',
  })
  @ApiBody({ type: GetUploadUrlDto })
  @ApiResponse({ status: 201, description: 'Pre-signed upload URL generated' })
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
  @ApiOperation({
    summary: 'Get pre-signed download URL',
    description:
      'Returns a pre-signed GET URL for private objects. The client downloads the file directly from OCI Object Storage.',
  })
  @ApiBody({ type: GetDownloadUrlDto })
  @ApiResponse({
    status: 201,
    description: 'Pre-signed download URL generated',
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

  @Get('public-url/:key')
  @ApiOperation({
    summary: 'Get public URL for an object',
    description: 'Returns a direct (non-signed) URL for public objects.',
  })
  @ApiParam({ name: 'key', description: 'Object key in the bucket' })
  @ApiResponse({ status: 200, description: 'Public URL generated' })
  getPublicUrl(@Param('key') key: string) {
    return {
      publicUrl: this.storageService.getPublicUrl(key),
      bucket: this.storageService.getBucketName(),
      key,
    }
  }
}
