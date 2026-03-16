import { z } from 'zod';

export const LoginBodySchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginBody = z.infer<typeof LoginBodySchema>;

export const RefreshBodySchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});
export type RefreshBody = z.infer<typeof RefreshBodySchema>;

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.literal('Bearer'),
});
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
