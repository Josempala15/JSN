# JSN – Clean UK Map

JSN is a static frontend backed by Supabase. The existing map, community cleans, good news, donations/kit bank, information and My stats UI are retained.

## Files

- `index.html` – page structure and Supabase CDN/config loading
- `style.css` – colours and layout
- `logo.png` – the JSN logo (hand-drawn smiley) shown in the header and browser tab
- `icons/` – hand-drawn icons for report categories and kit items (a missing icon falls back to its emoji)
- `app.js` – map, UI and Supabase integration
- `config.example.js` – safe template for the browser Supabase configuration
- `config.js` – public browser configuration for Supabase; it contains only the Supabase URL and publishable/anon key
- `supabase_schema.sql` – database, RLS, Storage and Realtime setup
- `README_SUPABASE.md` – step-by-step Supabase/GitHub/deployment setup

## Supabase setup

1. Create a Supabase project.
2. In Authentication -> Providers -> Email, keep Email/password enabled and disable **Confirm email**. JSN uses a recovery code instead of asking for an email address.
3. Run `supabase_schema.sql`, then `supabase_patch_v3.sql`, in Supabase SQL Editor (the patch fixes an admin-takeover hole and lets anyone mark a report cleaned, and adds good news).
4. Copy `config.example.js` to `config.js` and enter the Supabase Project URL and publishable/anon key.
5. Commit `config.js` to GitHub Pages. The publishable/anon key is designed to be used in browser code; never put a service-role/secret key in it.
5. Create a JSN account in the site.
6. To make that account an administrator, copy its Supabase Auth UUID and run:

```sql
update public.profiles
set is_admin = true
where id = 'YOUR_USER_UUID';
```

Never put the Supabase service-role/secret key in frontend code.

## Run locally

Use a local web server rather than opening the HTML file directly:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## GitHub

Commit the application and setup files. `config.js` holds only the public Supabase URL and anon key, so it is fine (and needed) to commit it:

```bash
git add index.html style.css app.js logo.png icons config.js config.example.js supabase_schema.sql supabase_patch_v3.sql README.md README_SUPABASE.md
git commit -m "Connect JSN to Supabase"
git push
```

## Backend data

Supabase stores:

- `profiles` – nickname/admin status
- `reports` – litter reports and clean status
- `report_stills` – "still there" checks
- `events` – community cleans
- `rsvps` – event RSVPs
- `kit_requests` – equipment requests
- `kit_ledger` – stock received/lent out
- `good_news` – posts shared on the Good news page (admins can remove)
- `report-photos` Storage bucket – report images

Realtime subscriptions keep reports, events, RSVPs, requests and kit stock updated without refreshing the page.

## Accounts

The user-facing account remains nickname + 16-character recovery code. Supabase Auth stores the underlying credential, so the same recovery code can be used on another device. The recovery code is sensitive: anyone who has it can sign in as that user.

## Demo data

The existing **Show demo data** checkbox remains. Untick it to display only real Supabase data.

## Donations

The Donate button is still a placeholder for a payment provider such as Stripe. Payment processing is intentionally not handled directly by Supabase/browser code yet.

## Photos

Report photos are resized in the browser and uploaded to the `report-photos` Supabase Storage bucket. The bucket is public because report photos are displayed publicly on the map. Uploading is restricted to authenticated JSN users by Storage RLS.

## Important production notes

- `config.js` is public browser configuration. The publishable/anon key may be exposed to browsers, but the service-role/secret key must never be exposed.
- Keep the Supabase RLS policies enabled.
- Review the privacy/terms requirements before launch, especially because the site stores user accounts, photos and location reports.
- The existing site is UK-only and continues to use OpenStreetMap/Nominatim as documented in the original project.
