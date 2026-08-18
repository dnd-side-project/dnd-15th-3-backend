process.env.NODE_ENV ||= 'test'
process.env.CORS_ORIGINS ||= 'http://localhost:5173'
process.env.OCI_NAMESPACE ||= 'test-namespace'
process.env.OCI_S3_ACCESS_KEY ||= 'test-access-key'
process.env.OCI_S3_SECRET_KEY ||= 'test-secret-key'
process.env.MEDIA_BUCKET_NAME ||= 'momo-media-test'
process.env.MEDIA_PUBLIC_BASE_URL ||=
  'https://objectstorage.ap-hyderabad-1.oraclecloud.com/n/test-namespace/b/momo-media-test/o/'
