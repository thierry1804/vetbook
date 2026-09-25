import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

let client;

function getClient() {
  if (!client) {
    const endpoint = process.env.MINIO_ENDPOINT;
    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;
    if (!endpoint || !accessKey || !secretKey) {
      throw new Error('Configuration MinIO incomplete (MINIO_ENDPOINT / ACCESS / SECRET).');
    }
    client = new S3Client({
      endpoint,
      region: process.env.MINIO_REGION || 'us-east-1',
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: true,
    });
  }
  return client;
}

export function getBucket() {
  return process.env.MINIO_BUCKET || 'vetbook-media';
}

export async function ensureBucket() {
  const bucket = getBucket();
  const s3 = getClient();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export async function putObject(key, body, contentType) {
  await getClient().send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

export async function getObject(key) {
  return getClient().send(new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  }));
}

export async function deleteObject(key) {
  await getClient().send(new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  }));
}
