# API Configuration

This folder contains centralized API configuration utilities to avoid hardcoding IP addresses throughout the codebase.

## Usage

### 1. Set API URL in `.env` file

```env
EXPO_PUBLIC_API_URL=https://mapic-backend-ute.onrender.com/api
```

### 2. Import and use in your components

```typescript
import { getApiUrl, getBaseUrl, buildMediaUrl, buildMomentImageUrl, buildAvatarUrl } from '../config/api';

// Get API URL (with /api suffix)
const apiUrl = getApiUrl(); // https://mapic-backend-ute.onrender.com/api

// Get base URL (without /api suffix) for media files
const baseUrl = getBaseUrl(); // https://mapic-backend-ute.onrender.com

// Build media URLs
const avatarUrl = buildAvatarUrl('/uploads/avatars/image.jpg');
const momentUrl = buildMomentImageUrl('image.jpg'); // Automatically adds /uploads/moments/
const customUrl = buildMediaUrl('/uploads/custom/file.jpg');
```

### 3. Examples

#### Fetching data from API
```typescript
import { getApiUrl } from '../config/api';

const API_URL = getApiUrl();
const response = await fetch(`${API_URL}/moments/feed`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### Displaying images
```typescript
import { buildAvatarUrl, buildMomentImageUrl } from '../config/api';

// Avatar
<Image source={{ uri: buildAvatarUrl(user.avatarUrl) || undefined }} />

// Moment image
<Image source={{ uri: buildMomentImageUrl(moment.media[0].mediaUrl) || undefined }} />
```

## Benefits

1. **Single source of truth**: Change IP address in one place (`.env` file)
2. **Type safety**: TypeScript functions with proper return types
3. **Null safety**: Functions handle null/undefined values gracefully
4. **Consistency**: All URLs are built the same way across the app
5. **Easy testing**: Mock the config module for unit tests

## Functions

### `getApiUrl(): string`
Returns the full API URL with `/api` suffix.

### `getBaseUrl(): string`
Returns the base URL without `/api` suffix (for media files).

### `buildMediaUrl(path?: string | null): string | null`
Builds a full URL for any media file. Returns `null` if path is null/undefined.

### `buildMomentImageUrl(filename?: string | null): string | null`
Builds a full URL for moment images. Automatically prepends `/uploads/moments/`.

### `buildAvatarUrl(path?: string | null): string | null`
Builds a full URL for avatar images.

### `buildCoverUrl(path?: string | null): string | null`
Builds a full URL for cover images.
