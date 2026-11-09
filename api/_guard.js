// Shared bot check for the form endpoints (Vercel BotID). The browser side is assets/botid-client.js,
// which attaches the BotID headers to POSTs to /api/upload and /api/contact.
// Requests without those headers (curl, scripts) are classified as bots in production.
import { checkBotId } from 'botid/server';

export async function isBot(request) {
  try {
    const v = await checkBotId({ advancedOptions: { headers: Object.fromEntries(request.headers) } });
    return v.isBot === true;
  } catch (e) {
    // A BotID outage or misconfiguration must not take the contact form down with it.
    console.error('BotID check failed, allowing request', e);
    return false;
  }
}
