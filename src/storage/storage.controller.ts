import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common'
import {
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { StorageService } from './storage.service'

class GetUploadUrlDto {
  @ApiProperty({
    description: 'Object key (path) in the bucket',
    example: 'uploads/profile-avatar.png',
  })
  key!: string

  @ApiPropertyOptional({
    description: 'MIME type of the file to upload',
    example: 'image/png',
  })
  contentType?: string

  @ApiPropertyOptional({
    description: 'URL expiry in seconds (default: 300)',
    example: 300,
    default: 300,
  })
  expiresIn?: number
}

class GetDownloadUrlDto {
  @ApiProperty({
    description: 'Object key (path) in the bucket',
    example: 'uploads/profile-avatar.png',
  })
  key!: string

  @ApiPropertyOptional({
    description: 'URL expiry in seconds (default: 3600)',
    example: 3600,
    default: 3600,
  })
  expiresIn?: number
}

class GetPublicUrlDto {
  @ApiProperty({
    description: 'Object key (path) in the bucket',
    example: 'uploads/profile-avatar.png',
  })
  key!: string
}

class DeleteObjectDto {
  @ApiProperty({
    description: 'Object key (path) in the bucket',
    example: 'uploads/profile-avatar.png',
  })
  key!: string
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

  @Post('public-url')
  @ApiOperation({
    summary: 'Get public URL for an object',
    description: 'Returns a direct (non-signed) URL for public objects.',
  })
  @ApiBody({ type: GetPublicUrlDto })
  @ApiResponse({ status: 201, description: 'Public URL generated' })
  async getPublicUrl(@Body() dto: GetPublicUrlDto) {
    return {
      publicUrl: await this.storageService.getPublicUrl(dto.key),
      bucket: this.storageService.getBucketName(),
      key: dto.key,
    }
  }

  @Delete('objects')
  @ApiOperation({
    summary: 'Delete an object',
    description:
      'Permanently deletes the object from the bucket. Executed server-side with the configured credentials.',
  })
  @ApiBody({ type: DeleteObjectDto })
  @ApiResponse({ status: 204, description: 'Object deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteObject(@Body() dto: DeleteObjectDto) {
    await this.storageService.deleteObject(dto.key)
  }
}
