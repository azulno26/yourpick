import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { JWTPayload } from './types';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
};

export async function signToken(payload: Partial<JWTPayload>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('yp_session')?.value;
  if (!token) return null;
  return verifyToken(token);
}
