// Issues short lived client tokens so the contact form can upload attachments
// straight from the browser into the private Blob store (no 4.5 MB function limit).
import { handleUpload } from '@vercel/blob/client';
import { isBot } from './_guard.js';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const PATH_RE = /^submissions\/\d{4}-\d{2}-\d{2}T[\d-]+Z-[a-z0-9-]{1,40}\/[^/]{1,120}$/;
const TYPES = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/x-iwork-keynote-sffkey', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/png', 'image/jpeg'];

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  // Only the browser's token request carries BotID headers. The upload-completed callback comes from
  // Vercel's servers and is signature checked by handleUpload, so it is not bot checked here.
  if (body && body.type === 'blob.generate-client-token' && await isBot(request)) {
    return Response.json({ error: 'Access denied' }, { status: 403 });
  }
  try {
    const json = await handleUpload({
      body, request,
      onBeforeGenerateToken: async (pathname) => {
        if (!PATH_RE.test(pathname)) throw new Error('Invalid upload path');
        return { allowedContentTypes: TYPES, maximumSizeInBytes: MAX_FILE_BYTES, addRandomSuffix: false, validUntil: Date.now() + 15 * 60 * 1000 };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(json);
  } catch (e) {
    return Response.json({ error: e.message || 'Upload refused' }, { status: 400 });
  }
}

export function GET() { return Response.json({ error: 'Use POST' }, { status: 405 }); }
