import {
  deleteObjectRequestSchema,
  getDownloadUrlRequestSchema,
  getUploadUrlRequestSchema,
  MAX_STORAGE_URL_EXPIRES_IN,
} from './storage-request.schema'

describe('storage request schemas', () => {
  it('accepts safe object keys and preserves optional upload defaults', () => {
    expect(
      getUploadUrlRequestSchema.parse({
        key: 'uploads/profile-avatar.png',
        contentType: 'image/png',
      }),
    ).toMatchObject({
      key: 'uploads/profile-avatar.png',
      contentType: 'image/png',
    })
  })

  it.each([
    '/absolute/file.png',
    '../outside.txt',
    'uploads/../outside.txt',
    'C:\\outside.txt',
    'uploads/\u0000file.txt',
    '',
  ])('rejects unsafe key %s', (key) => {
    expect(() => deleteObjectRequestSchema.parse({ key })).toThrow()
  })

  it.each([-1, 0, MAX_STORAGE_URL_EXPIRES_IN + 1, 1.5])(
    'rejects invalid expiry %s',
    (expiresIn) => {
      expect(() =>
        getDownloadUrlRequestSchema.parse({ key: 'uploads/a.png', expiresIn }),
      ).toThrow()
    },
  )

  it('rejects invalid MIME values', () => {
    expect(() =>
      getUploadUrlRequestSchema.parse({
        key: 'uploads/a.png',
        contentType: 'not-a-mime',
      }),
    ).toThrow()
  })
})
