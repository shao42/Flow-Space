import { describe, expect, it } from 'vitest';
import { hashPassword, validatePassword, validateUsername, verifyPassword, signJwt, verifyJwt } from './auth';

describe('auth', () => {
  it('validates username', () => {
    expect(validateUsername('ab')).toBe(false);
    expect(validateUsername('good_name1')).toBe(true);
    expect(validateUsername('Bad')).toBe(false);
  });

  it('validates password length', () => {
    expect(validatePassword('short')).toBe(false);
    expect(validatePassword('longenough')).toBe(true);
  });

  it('hashes and verifies password', async () => {
    const hash = await hashPassword('testpassword1');
    expect(await verifyPassword('testpassword1', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('signs and verifies jwt', async () => {
    const token = await signJwt('user-123', 'test-secret-key-for-jwt');
    const sub = await verifyJwt(token, 'test-secret-key-for-jwt');
    expect(sub).toBe('user-123');
    expect(await verifyJwt(token, 'wrong-secret')).toBeNull();
  });
});
