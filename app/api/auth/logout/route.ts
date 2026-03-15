import { clearAuthCookies } from '@/lib/auth/cookies'

export async function POST() {
  return clearAuthCookies()
}
