# Coach Pocket Monorepo

This monorepo contains the "Country Club" edition for coaches and players.

## Project Structure
- `apps/coach-standard`: Main application for coaches.
- `apps/player-standard`: Main application for players.
- `packages/core`: Shared logic, data store, and Firebase services.
- `packages/shared`: Shared UI components and utilities.

## Deployment Instructions

### 1. GitHub Setup
1. Create a new private repository on GitHub.
2. Link this local repository to GitHub:
   ```bash
   git remote add origin <your-github-url>
   git branch -M main
   git push -u origin main
   ```

### 2. Vercel Deployment
You need to create **two separate projects** in Vercel for the Coach and Player apps.

#### For Coach App (`apps/coach-standard`):
1. Import your repository in Vercel.
2. Select `apps/coach-standard` as the **Root Directory**.
3. Vercel should automatically detect **Next.js**.
4. **Environment Variables**: Add all keys found in `apps/coach-standard/.env`.
5. Deploy.

#### For Player App (`apps/player-standard`):
1. Import the same repository again in a new Vercel project.
2. Select `apps/player-standard` as the **Root Directory**.
3. **Environment Variables**: Add all keys found in `apps/player-standard/.env`.
4. Deploy.

## Development
To run all applications locally:
```bash
npm run dev
```
## Data Architecture
Uses **Firebase Firestore** for real-time synchronization between the coach and player apps.
