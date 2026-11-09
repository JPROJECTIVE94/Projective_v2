// Entry for the browser bundle of the Vercel BotID client.
// Build: npm run bundle:botid  ->  assets/botid-client.js
// Must load before any script that POSTs to the protected endpoints.
import { initBotId } from 'botid/client/core';
initBotId({
  protect: [
    { path: '/api/upload', method: 'POST' },
    { path: '/api/contact', method: 'POST' },
  ],
});
