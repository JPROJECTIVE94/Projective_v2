// Contact form endpoint. Stores every submission (fields + attached files) in the
// project's private Vercel Blob store under submissions/<timestamp>-<company>/,
// and emails hello@projective.finance with the files attached when RESEND_API_KEY is set.
import { put } from '@vercel/blob';

const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // Vercel function request body limit is 4.5 MB
const TO = process.env.CONTACT_TO || 'hello@projective.finance';
const FROM = process.env.CONTACT_FROM || 'Projective website <onboarding@resend.dev>';

const clean = (s) => String(s || '').trim().slice(0, 2000);
const slug = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'unknown';
const safeName = (s) => clean(s).replace(/[\/\\]/g, '_').replace(/[^\w.\- ()]/g, '').slice(0, 120) || 'file';
const esc = (s) => clean(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function POST(request) {
  let form;
  try { form = await request.formData(); } catch { return Response.json({ ok: false, error: 'Bad form data' }, { status: 400 }); }

  if (clean(form.get('website'))) return Response.json({ ok: true }); // honeypot: bots fill it, people never see it

  const fields = {};
  for (const [k, v] of form.entries()) if (typeof v === 'string') fields[k] = clean(v);
  const { role, name, company, email } = fields;
  if (!role || !name || !company || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
  }

  const files = form.getAll('files').filter((f) => typeof f !== 'string' && f.size > 0);
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > MAX_TOTAL_BYTES) return Response.json({ ok: false, error: 'Attachments too large' }, { status: 413 });

  const receivedAt = new Date().toISOString();
  const folder = `submissions/${receivedAt.replace(/[:.]/g, '-')}-${slug(company)}/`;

  const stored = [];
  for (const f of files) {
    const blob = await put(folder + safeName(f.name), f, { access: 'private', addRandomSuffix: false, contentType: f.type || 'application/octet-stream' });
    stored.push({ name: f.name, size: f.size, type: f.type, pathname: blob.pathname, url: blob.url });
  }
  const record = { receivedAt, fields, files: stored };
  await put(folder + 'submission.json', JSON.stringify(record, null, 2), { access: 'private', addRandomSuffix: false, contentType: 'application/json' });

  let emailed = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const order = ['role', 'name', 'company', 'email', 'investorType', 'ticket', 'country', 'projectType', 'state', 'rec', 'capital', 'notes'];
      const rows = order.filter((k) => fields[k]).map((k) => `<tr><td style="padding:4px 12px 4px 0;color:#6B6F80">${esc(k)}</td><td style="padding:4px 0">${esc(fields[k]).replace(/\n/g, '<br>')}</td></tr>`).join('');
      const fileList = stored.length ? `<p><strong>Attached files</strong></p><ul>${stored.map((f) => `<li>${esc(f.name)} (${Math.round(f.size / 1024)} KB)</li>`).join('')}</ul>` : '<p>No files attached.</p>';
      const attachments = await Promise.all(files.map(async (f) => ({ filename: safeName(f.name), content: Buffer.from(await f.arrayBuffer()).toString('base64') })));
      const subject = `${role === 'Investor' ? 'Investor enquiry' : 'Project enquiry'} from ${company}`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM, to: [TO], reply_to: email, subject,
          html: `<p>New submission from the website contact form.</p><table>${rows}</table>${fileList}<p style="color:#6B6F80">Stored in Vercel Blob at ${esc(folder)}</p>`,
          attachments,
        }),
      });
      emailed = res.ok;
      if (!res.ok) console.error('Resend error', res.status, await res.text());
    } catch (e) { console.error('Email failed', e); }
  }

  return Response.json({ ok: true, folder, emailed });
}

export function GET() {
  return Response.json({ ok: false, error: 'Use POST' }, { status: 405 });
}
