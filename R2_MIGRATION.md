# Cloudflare R2 Migration Guide

This document details the migration of video storage from Cloudinary to Cloudflare R2 using AWS S3-compatible APIs.

## Architecture
- **Upload Flow:** Admin selects a video -> Frontend requests multipart upload initialization -> Backend generates presigned URLs for parts -> Frontend uploads parts concurrently directly to R2 -> Frontend notifies backend of completion -> Backend saves metadata in MongoDB.
- **Storage:** Cloudflare R2 S3-compatible endpoints.
- **Playback Flow:** Student/Admin selects a video -> Frontend calls `/playback-url` -> Backend validates course access -> Backend generates a short-lived (1 hour) presigned GET URL -> Frontend plays directly from R2.

## Environment Variables
The following environment variables were added to `backend/.env`:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`

## 7-Day Expiry & Cleanup
- A cleanup job runs every 5 minutes in `videoCleanupService.js`.
- It searches for any video where `expiresAt <= now`.
- `expiresAt` is set exactly 7 days after the upload completion.
- Deletes the object from R2 first using `DeleteObjectCommand`, then removes the MongoDB `Video` document.

## CORS Configuration
A script is provided to configure the R2 bucket for direct browser uploads and presigned URL access.
Run:
`node backend/scripts/setup-cors.js`
*(Ensure `R2_` variables are correctly set in `.env` before running).*

## Cloudinary Fallback
Legacy videos with `storageProvider: 'cloudinary'` will continue to use the previous logic. New uploads use R2. You can safely remove Cloudinary code once all legacy videos expire or are migrated.
