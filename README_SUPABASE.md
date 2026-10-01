# JSN + Supabase setup

The frontend now uses Supabase for the backend. The existing UI and demo mode remain intact.

## 1. Create the Supabase project

Create a project at https://supabase.com/ and open its dashboard.

## 2. Configure authentication

In Authentication -> Providers -> Email:

- Keep Email/password enabled.
- Disable **Confirm email**.

JSN does not ask users for an email. It derives a non-deliverable internal email address from the 16-character recovery code and uses the recovery code as the password. Users only see the nickname and recovery code.

## 3. Create the database

Open SQL Editor and run `supabase_schema.sql` in full, then run `supabase_patch_v3.sql` in full. **Do not skip the patch:** without it any user can make themselves an admin, and only the original reporter can mark a report cleaned.

This creates:

- profiles
- reports
- report_stills
- events
- rsvps
- kit_requests
- kit_ledger
- Row Level Security policies
- the `report-photos` Storage bucket
- Realtime subscriptions

## 4. Configure the browser

Copy:

`config.example.js` -> `config.js`

Then put your Supabase Project URL and anon/publishable key into `config.js`.

Do not use the service-role/secret key.

`config.js` is intentionally committed for GitHub Pages. It contains only the public Supabase URL and publishable/anon key. Never put a service-role/secret key in it.

## 5. Make the first admin

Create your normal JSN account in the site. In Supabase, open Authentication -> Users and copy that user's UUID.

Then run:

```sql
update public.profiles
set is_admin = true
where id = 'YOUR_USER_UUID';
```

Admins can mark kit requests supplied and add/remove stock through the site.

## 6. Run locally

Use a local web server; do not open `index.html` directly from `file://`.

For example:

```bash
python3 -m http.server 8000
```

Then open:

http://localhost:8000

## 7. GitHub

Commit these files:

- `index.html`
- `style.css`
- `app.js`
- `config.js`
- `config.example.js`
- `supabase_schema.sql`
- `README_SUPABASE.md`
- `.gitignore`

## 8. Deployment

For GitHub Pages, commit the real `config.js` so the browser can load it. The publishable/anon key is safe to expose; RLS protects the database. Never expose the service-role/secret key.

The Supabase anon/publishable key is designed to be exposed in browser code; database security comes from RLS, not from hiding that key.

## Troubleshooting

- **"Supabase rejected the placeholder email address"** when creating an account: Supabase may refuse the made-up `@accounts.jsn.invalid` address. Set `window.JSN_AUTH_DOMAIN = 'yourdomain.com'` in `config.js` (a domain you own) and try again. Accounts still never receive email.
- **"Confirm email" error:** switch OFF Authentication > Providers > Email > Confirm email.
- **Admin:** run the `update public.profiles set is_admin = true ...` line from step 5 in the SQL editor. The site ignores any attempt to set this from the browser.

## Important notes

- Reports require a signed-in JSN account before submission.
- Photos are public because report photos are displayed publicly on the map.
- Never put the Supabase service-role key in frontend code.
- The recovery code is sensitive: anyone who has it can sign in as that user.
- The existing demo checkbox still works. Untick it to see only real Supabase data.
