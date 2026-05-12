import { useEffect, useState } from 'react'

const API_BASE_URL = 'https://api-projetointegrador-kmmg.onrender.com'

/**
 * Custom hook to fetch a user's weekly activity streak from the backend.
 * @param {string} userId - The Supabase user ID (GUID).
 * @returns {{ streakData: { currentStreak: number, lastActivityDate: string|null }, loading: boolean, error: string|null }}
 */
export function useUserStreak(userId) {
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    lastActivityDate: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchStreak = async () => {
      try {
        setLoading(true)
        setError(null)

        // Mocking behavior as requested
        setStreakData({
          currentStreak: 1,
          lastActivityDate: new Date().toISOString()
        })
        /*
        const response = await fetch(`${API_BASE_URL}/api/Streak/${userId}`)

        if (!response.ok) {
          throw new Error('Falha ao obter os dados de Streak')
        }

        const data = await response.json()
        setStreakData({
          currentStreak: data.currentStreak,
          lastActivityDate: data.lastActivityDate
        })
        */
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStreak()
  }, [userId])

  return { streakData, loading, error }
}
