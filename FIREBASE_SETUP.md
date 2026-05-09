# Firebase Storage & Firestore Setup Guide for Codefora

## Overview
Firebase Storage stores files (code, execution logs), and Firestore stores metadata and relationships.

---

## Firestore Database Structure

```
codefora-9289d
├── users/
│   ├── {userId}
│   │   ├── uid
│   │   ├── email
│   │   ├── displayName
│   │   ├── photoURL
│   │   ├── rooms: [{roomId, joinedAt}]
│   │   ├── settings: {theme, language}
│   │   └── createdAt, updatedAt
│
├── rooms/
│   ├── {roomId}
│   │   ├── roomId
│   │   ├── createdBy
│   │   ├── createdAt
│   │   ├── participants: [{userId, displayName, photoURL, joinedAt}]
│   │   ├── files: [{fileName, language, size, savedAt}]
│   │   └── updatedAt
│   │
│   └── {roomId}/files/
│       ├── {fileId}
│       │   ├── fileName
│       │   ├── language
│       │   ├── size
│       │   └── createdAt
│
│   └── {roomId}/activities/
│       ├── {activityId}
│       │   ├── type (user_joined, code_saved, code_executed)
│       │   ├── userId
│       │   ├── description
│       │   └── timestamp
```

---

## Firebase Storage Structure

```
codefora-9289d.firebasestorage.app
├── users/
│   └── {userId}/files/
│       ├── file1.js
│       ├── file2.py
│       └── ...
│
├── rooms/
│   └── {roomId}/
│       ├── metadata.json (room info)
│       ├── code/
│       │   ├── file1.js (code content)
│       │   ├── file2.py
│       │   └── ...
│       └── executions/
│           ├── exec_001.json (output)
│           ├── exec_002.json
│           └── ...
```

---

## Firestore Security Rules

Add these rules in Firebase Console → Firestore Database → Rules:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Rooms collection
    match /rooms/{roomId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == resource.data.createdBy;
      
      // Files subcollection
      match /files/{fileId} {
        allow read: if request.auth != null;
        allow write: if request.auth.uid == get(/databases/$(database)/documents/rooms/$(roomId)).data.createdBy;
      }
      
      // Activities subcollection
      match /activities/{activityId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
      }
    }
  }
}
```

---

## Firebase Storage Security Rules

Add these rules in Firebase Console → Storage → Rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User files - only user can access their own
    match /users/{userId}/files/{allPaths=**} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Room files - authenticated users can read, room creator can write
    match /rooms/{roomId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

## Usage in Application

### Save User Profile After Sign-In
```javascript
import { useAuth } from "../hooks/useAuth";
import { storeUserProfile } from "../services/storageService";

export function HomePage() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      storeUserProfile(user.uid, user);
    }
  }, [user]);
}
```

### Save Code in Room
```javascript
import { saveCodeToRoom } from "../services/storageService";

const saveCode = async (roomId, fileName, code, language) => {
  await saveCodeToRoom(roomId, fileName, code, language);
};
```

### Retrieve Room Files
```javascript
import { getRoomFiles } from "../services/storageService";

const files = await getRoomFiles(roomId);
console.log(files); // [{fileName, language, size, savedAt}]
```

### Log Room Activity
```javascript
import { logActivity } from "../lib/firebase";

await logActivity(roomId, {
  type: "code_executed",
  userId: currentUser.uid,
  output: executionResult
});
```

---

## Data Stored per Feature

### Authentication
- User email, profile photo, display name
- Login timestamps
- User settings (theme, language preference)

### Room Management
- Room metadata (creator, creation date)
- Participant list (who joined, when)
- File list (what code files exist)

### Code Execution
- Execution timestamps
- Execution output/logs
- Activity history (who executed, when)

### Collaboration
- User activity logs
- File modification history
- Real-time cursor positions (via Socket.IO)

---

## Setup Steps

1. **Enable Firestore Database**
   - Firebase Console → Create Database
   - Select production mode
   - Location: us-central1 (or your preference)

2. **Enable Storage**
   - Firebase Console → Storage → Get Started
   - Location: same as Firestore

3. **Add Security Rules**
   - Copy Firestore rules above
   - Copy Storage rules above

4. **Test Connection**
   - In app, user signs in → profile saved
   - User creates room → room data stored
   - User saves code → code uploaded to Storage

---

## Available Functions

| Function | Purpose | Parameters |
|----------|---------|-----------|
| `storeUserProfile()` | Save user info after sign-in | userId, authUser |
| `saveCodeToRoom()` | Save code file to room | roomId, fileName, code, language |
| `getCodeFromRoom()` | Retrieve code file | roomId, fileName |
| `saveExecutionOutput()` | Save code execution result | roomId, executionId, output |
| `addRoomParticipant()` | Add user to room | roomId, userId, userDetails |
| `getRoomFiles()` | List all files in room | roomId |
| `initializeRoom()` | Create new room | roomId, roomData |

---

## Data Retention & Cleanup

- User profiles: Stored indefinitely (delete on account deletion)
- Rooms: Kept until user deletes
- Execution logs: Optional auto-cleanup (30 days)
- User files: Stored indefinitely

To delete user data:
```javascript
import { deleteFile } from "../lib/firebase";

// Delete all user files
await deleteFile(userId, "file.js");
```

