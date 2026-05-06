import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';

const SECRET = process.env.JWT_SECRET as string;
const EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as StringValue;

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: EXPIRES_IN });
}
