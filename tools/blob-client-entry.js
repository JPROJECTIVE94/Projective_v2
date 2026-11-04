// Entry for the browser bundle of the Vercel Blob client upload helper.
// Build: npm run bundle:blob  ->  assets/blob-client.js
import { upload } from '@vercel/blob/client';
window.VercelBlobClient = { upload: upload };
