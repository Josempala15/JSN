# JSN – clean-map website

## Files
- `index.html` – page structure (Map, Community cleans, Good news, Donate, Information tabs)
- `style.css` – colours and layout (theme colours are the CSS variables at the top)
- `app.js` – all the logic

## Run it
Open a terminal in this folder and run `python3 -m http.server 8000`, then visit http://localhost:8000.
To publish, upload the folder to Netlify, Vercel, Cloudflare Pages or GitHub Pages.
Once hosted this way you get real street-level map tiles (OpenStreetMap) and address search.

## Where to change things (search `app.js` for these)
- **Report categories:** `CATS` at the top of `app.js` (icon and label for each type of report).
- **Demo data:** the block starting `// ---- demo data`. Delete it and the "Show demo data" checkbox in `index.html`.
- **Donation items and prices:** `GIVE` (each donation = x bin bags or litter pickers).
- **Kit bank (public stock):** `BASE` in `app.js` (demo starting numbers; real changes are saved as `ledger` entries, so two admins can't overwrite each other) (`in` = donated, `out` = lent out). Available = in minus out. Change the starting numbers there, or update them from an admin page once you have a backend. Update it only when donations are actually received.
- **Kit requests:** people request items in Community cleans; an admin marks them supplied, which adds to `out` in the kit bank. Requests are public and show the requester's nickname – don't collect contact details in the note.
- **Good news stories:** the `NEWS` list. The sample stories are placeholders, replace them with real ones.
- **Donate wording:** the `v4` section in `index.html`. Keep the not-a-charity line unless you become one, and say how donations are held and reported.
- **Learn tab:** the `v5` section (Information tab) in `index.html`.
- **Map lock area:** the bounds `-8.7, 2, 58.9, 49.8` in `render()`; minimum zoom in `zoomBy()`.

## What still depends on claude.ai (needs replacing)
The published version used claude.ai features that do not exist on your own host. Search `claude.use` in `app.js` (bottom of file). Until you replace them, the site runs in memory only: nothing is saved.

| Feature | Was | Replace with |
|---|---|---|
| Accounts | claude.ai identity (`user`) | The site already has nickname + recovery-code accounts (no email). Your ID is a hash of the code, stored on reports. For real protection (edit/delete only your own reports) add backend rules, or Supabase/Firebase anonymous auth |
| Saving reports, events, RSVPs | `db` | Supabase or Firebase (tables: reports, events) |
| Photo storage | `assets` | Supabase Storage, Firebase Storage or S3 |
| Donate button | placeholder | Stripe payment link or a fundraising platform |

## Data layout
One small document per action, so many people can act at once without overwriting each other: `reports`, `events`, `rsvps` (one per person per event), `stills` (one per person per report), `requests`, `ledger` (stock in/out), `profiles`.

## Accounts (My stats tab)
People pick a nickname and get a random 16-character recovery code. The code stays in their browser (localStorage) and only a hash of it is saved with their reports, so stats follow them to any device where they type the code. There is no email or password to store. Anyone with the code can act as that person, so tell users to keep it private. Without a backend, accounts and stats exist only in that browser.

## Before launch (UK)
- Privacy policy and terms; register with the ICO (you store photos, locations, accounts).
- Donations: if you collect money from the public for a purpose (bin bags, litter pickers), spend it on that purpose and report it. Check with a solicitor whether you need a charity, CIC or a partner charity to hold the funds.
- OpenStreetMap tiles and Nominatim search have fair-use limits – move to a paid provider (MapTiler, Mapbox) for real traffic.
- Reports are pins on the map. Anyone can mark one cleaned or say it is still there – decide who should be allowed to once you have accounts.
- Photo GPS: many phones strip location data when uploading; the manual pin is the fallback.
