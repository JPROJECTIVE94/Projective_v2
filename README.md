# Projective Finance website

Static multi page site with two Vercel functions for the contact form. No build step for the pages.
Deployed from `main` to the Vercel project `projectivev2` at https://www.projective.finance.

## Pages

- `index.html`: home. Hero, the problem thesis, Projective OS, Econergy proof strip, the pinned Projective Process flow, comparison table, open facilities carousel, global access box, FAQ.
- `lenders.html`: for lenders. Hero, the "Built for the investor" box with its four steps, deal discovery panel, portfolio management, investor CRM panel.
- `case-study.html`: Econergy, Illinois school solar.
- `contact.html`: contact form. The visitor picks Builder, Investor or Other first and sees only that role's fields. `?role=builder` or `?role=investor` preselects it.
- `privacy-policy.html`: privacy policy, also served at `/privacy-policy` through the rewrite in `vercel.json`.
- `404.html`: not found page.

Shared files: `styles.css`, `script.js` (flow section, facilities carousel, star fields, contact form), `assets/`, `llms.txt`, `sitemap.xml`, `robots.txt`.

Section layout values are inline in the HTML. Brand colours are navy `#09133A`, gold `#D9A32B` and paper `#F7F7F5`.

## Run locally

```
python3 -m http.server 8765
```

then open http://localhost:8765. The contact form's API routes only exist on Vercel, so submitting the form locally shows its error message.

## Cache busting

`styles.css` and `script.js` are linked with a `?v=N` query string on every page. After editing either file run `python3 tools/bump-version.py css` or `python3 tools/bump-version.py js` before committing.
A pre-commit hook (`.githooks/pre-commit`, enabled with `git config core.hooksPath .githooks`) refuses a commit where the file changed but the version did not, or where pages disagree on the version.

## Contact form

Submissions post to `api/contact.js`. Each one is stored in the private Blob store `projective-contact-uploads` under `submissions/<timestamp>-<company>/` as `submission.json` plus the attached files. Browse them in the Vercel dashboard: project `projectivev2`, Storage, `projective-contact-uploads`.

Attachments upload straight from the browser into the Blob store through `api/upload.js`, using client tokens from `@vercel/blob/client` (bundled into `assets/blob-client.js` by `npm run bundle:blob`). Limits: 25 MB per file, 10 files per submission, and PDF, PowerPoint, Keynote, Word, Excel, CSV, PNG and JPEG only. If the bundle fails to load, the form posts files in the request body instead, limited to 4 MB in total.

Email notification with the files attached is sent through Resend when these environment variables exist on the project: `RESEND_API_KEY` (required), `CONTACT_FROM` (a sender on a domain verified in Resend, defaults to `onboarding@resend.dev`) and `CONTACT_TO` (defaults to `hello@projective.finance`). Without `RESEND_API_KEY` submissions are stored but no email is sent.

### Bot protection

Both API routes are protected by Vercel BotID. `assets/botid-client.js` (built from `tools/botid-client-entry.js` by `npm run bundle:botid`) must load on `contact.html` before the other scripts. It attaches BotID headers to POSTs to `/api/upload` and `/api/contact`, and `api/_guard.js` rejects requests that fail the check with a 403. Requests from curl or scripts are blocked in production. If a new protected route is added, list it in the client entry as well and rebuild the bundle.

The hidden `website` field in the form is a second, simpler bot trap.
