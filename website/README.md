# Zion House INT'L Website

Marketing site for **zionhouse.org** — church home, live services, booklet store, app download, testimonies, and social links.

## Deploy to Vercel (zionhouse.org)

1. In Vercel, create/import a project pointing to this repo.
2. Set **Root Directory** to `website`.
3. Deploy — the install step copies photos from `../public/page-images` automatically.
4. Point your domain `zionhouse.org` to this project.

```bash
cd website
node scripts/prepare-images.js   # copy photos locally
npx vercel deploy --prod
```

## Preview locally

From the `website` folder after running `node scripts/prepare-images.js`:

```bash
npx serve public -l 3456
# open http://localhost:3456
```

Static files live in `public/` (index, css, js, page-images, assets, data). The `api/` folder stays at the website root for Vercel serverless functions.

## Sections

| Section | Images used |
|---------|-------------|
| Hero | IMG_2788 (worship), IMG_2782 (preaching) |
| About | IMG_8960 (auditorium), IMG_8956 (prayer) |
| Outreach | IMG_0049, 0051, 0066 (Wonders on the Street) |
| Live | IMG_2789, IMG_8994 |
| Booklets | IMG_8970 (booklets in service) |
| Pastor | IMG_8988, IMG_8966 |
| Testimonies | IMG_8996 background + live API |
| App | IMG_0050 + Play Store link |
| Social | Handles from church photography branding |

Testimonies load from `https://global-affirmation-hub-1.vercel.app/api/testimonies` with static fallbacks.
