# Streak System - Frontend Implementation Guide

This document explains how to integrate the new Weekly Streaks system in the frontend (React/React Native).

## Overview

The Streaks system tracks consecutive weeks where a user has synchronized at least one activity.
- Ex: If the user exercises this week and next week, the streak is `2`.
- If the user misses an entire week, the streak resets to `1` on their next activity.

## Endpoint Details

### **GET: `/api/Streak/{userId}`**

Use this endpoint to query a user's current streak state.

#### URL Params

- `userId` (GUID) - The Supabase unique identity of the user.

#### Implementation with `fetch` (React Example)

```javascript
import { useEffect, useState } from 'react';

export function useUserStreak(userId) {
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    lastActivityDate: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchStreak = async () => {
      try {
        setLoading(true);
        // Ajuste a API_URL de acordo com a variável de ambiente do seu projeto
        const response = await fetch(`https://SEU_BACKEND_URL/api/Streak/${userId}`);
        
        if (!response.ok) {
          throw new Error('Falha ao obter os dados de Streak');
        }

        const data = await response.json();
        setStreakData({
          currentStreak: data.currentStreak,
          lastActivityDate: data.lastActivityDate
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStreak();
  }, [userId]);

  return { streakData, loading, error };
}
```

### Response Scheme

If the request is successful, you will receive a JSON structure like the one below:
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "currentStreak": 3,
  "lastActivityDate": "2026-04-10T14:30:00.0000000+00:00"
}
```

If the user has **never** synchronized an activity before, you will receive:
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "currentStreak": 0,
  "lastActivityDate": null
}
```

## Considerations for the UI

1. We recommend displaying the `currentStreak` using a 'fire' 🔥 icon or something representative in the User's Profile screen.
2. The logic for incrementing streaks runs entirely in the backend when the synchronization of a Strava Activity completes. You only need to *read* from this endpoint!
