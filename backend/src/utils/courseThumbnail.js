// Course thumbnails uploaded from the admin panel are stored as base64 data URLs
// (~100 KB each). Sending them inside list JSON made GET /courses over 1 MB and the
// page waited for all of it before drawing a single card. List endpoints now send a
// short path instead, and the image itself is served (and browser-cached) by
// GET /api/courses/:id/thumbnail.

const DATA_URL_RE = /^data:([^;,]+);base64,/;

// Path is relative to the API base (frontend prefixes API_URL). `v` busts the
// browser cache whenever the course is updated.
const THUMB_PATH_RE = /^\/courses\/[a-f0-9]{24}\/thumbnail(\?.*)?$/i;

export const isInlineThumbnail = (thumb) => typeof thumb === 'string' && DATA_URL_RE.test(thumb);

export const isThumbnailPath = (thumb) => typeof thumb === 'string' && THUMB_PATH_RE.test(thumb);

export const publicThumbnail = (course) => {
  const thumb = course?.thumbnail;
  if (!isInlineThumbnail(thumb)) return thumb || '';
  const version = course.updatedAt ? new Date(course.updatedAt).getTime() : 0;
  return `/courses/${course._id}/thumbnail?v=${version}`;
};

export const decodeThumbnail = (thumb) => {
  const match = typeof thumb === 'string' ? thumb.match(DATA_URL_RE) : null;
  if (!match) return null;
  return {
    contentType: match[1],
    buffer: Buffer.from(thumb.slice(match[0].length), 'base64'),
  };
};
