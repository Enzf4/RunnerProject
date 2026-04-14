# Frontend Guide: Integrating the Filtered Feed

This document explains the new filtered feed endpoint, its logic, and how to consume it in the frontend application.

## Overview
A new API endpoint has been introduced to fetch posts that are exclusively visible to the current requesting user based on their club memberships. Instead of returning the entire application's global post feed, it now securely acts as a localized or customized "network feed".

## How Visibility Works
When you query the feed for a given `userId`, the backend performs the following checks:
1. Determines all **Clubs** that the `userId` is an active member of.
2. Identifies the **Network** of users (all users who are also members of those same clubs).
3. Returns posts where **either**:
   - The original author (`user_id`) is part of the requesting user's network.
   - The post is explicitly linked to a `club_id` that the requesting user belongs to.

This guarantees that a user only sees content from the clubs they joined or the people in them.

## Endpoint Details

- **Path:** `GET /api/Post/feed/{userId}`
- **Authentication:** Must provide the valid `userId` in the path. (Authorization headers might be required depending on application-wide configuration).

### Example Request

Using `fetch` in JavaScript:
```javascript
const userId = "YOUR_USER_ID_UUID";

try {
  const response = await fetch(`/api/Post/feed/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${token}` // if needed
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch the feed');
  }

  const posts = await response.json();
  console.log('Filtered feed posts:', posts);
} catch (error) {
  console.error(error);
}
```

### Expected Response
The response is a JSON array of post objects, ordered from newest to oldest by `createdAt`.

```json
[
  {
    "id": "f51b...6a01",
    "userId": "b48a...4b02",
    "imageUrl": "https://example.com/image.jpg",
    "caption": "Morning Run!",
    "challengeId": null,
    "activityId": 12345678,
    "clubId": "a11d...9c22",
    "createdAt": "2026-04-13T10:00:00Z"
  },
  ...
]
```

## Integrating into Components

When rendering these posts in the UI, make sure to handle scenarios like empty states (when the user hasn't joined any clubs or their network hasn't made any posts yet).

```tsx
// React Example
import { useEffect, useState } from 'react';

export function UserFeed({ userId }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      try {
        const response = await fetch(`/api/Post/feed/${userId}`);
        const data = await response.json();
        setPosts(data);
      } catch (err) {
        console.error("Failed to load feed", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (userId) loadFeed();
  }, [userId]);

  if (loading) return <div>Loading your network...</div>;
  if (posts.length === 0) return <div>Your feed is empty. Join a club to see more posts!</div>;

  return (
    <div className="feed-container">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

> [!TIP]
> If a user has an empty feed, use it as an onboarding opportunity to show them a list of recommended clubs they can join!
