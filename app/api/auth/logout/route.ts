import { cookies } from 'next/headers'
import { clearAuthCookies } from '@/lib/auth/cookies'
import { blacklistToken } from '@/lib/auth/token-blacklist'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('clinix-refresh-token')?.value
    const accessToken = cookieStore.get('clinix-access-token')?.value

    // Blacklist both tokens for their remaining TTL
    if (refreshToken) {
      await blacklistToken(refreshToken, 7 * 24 * 60 * 60) // 7 days max
    }
    if (accessToken) {
      await blacklistToken(accessToken, 15 * 60) // 15 min max
    }

    return clearAuthCookies()
  } catch {
    // Even on error, clear cookies
    return clearAuthCookies()
  }
}
