import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ENCRYPTED_PREFIX = 'hush:v1:';

function getEncryptionKey(): Buffer {
  const configuredKey = process.env.HUSH_SYNC_ENCRYPTION_KEY;
  if (!configuredKey) throw new Error('SYNC_ENCRYPTION_NOT_CONFIGURED');

  const key = Buffer.from(configuredKey, 'base64');
  if (key.length !== 32) throw new Error('SYNC_ENCRYPTION_KEY_INVALID');
  return key;
}

function getAdditionalData(userId: string, recordId: string, field: string): Buffer {
  return Buffer.from(`hush:v1:${userId}:${recordId}:${field}`, 'utf8');
}

export function encryptConversationValue(value: string, userId: string, recordId: string, field: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  cipher.setAAD(getAdditionalData(userId, recordId, field));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptConversationValue(value: string, userId: string, recordId: string, field: string): string {
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;
  const key = getEncryptionKey();

  const [ivValue, tagValue, ciphertextValue] = value.slice(ENCRYPTED_PREFIX.length).split('.');
  if (!ivValue || !tagValue || ciphertextValue === undefined) {
    throw new Error('SYNC_DATA_INVALID');
  }

  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
    decipher.setAAD(getAdditionalData(userId, recordId, field));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('SYNC_DATA_INVALID');
  }
}
