# Invite links

Share `https://lilthings.app/join/<token>`. The app also accepts `lilthings://join?token=`, `littlethings://join?token=`, `https://lilthings.app/join?token=`, `https://www.lilthings.app/join?token=`, a trailing slash, a bare UUID, and a URL buried in pasted text. `handoff:<uuid>` is a clipboard backup, not an invite token.

## What the phone does

The invite token is created first and the share sheet opens immediately. A short square H.264 replay (3–6 seconds) and a 1200×1200 poster upload afterward to the public `invite-previews` bucket at `<token>/poster.png` and `<token>/replay.mp4`. Until those objects exist, link previews use `https://lilthings.app/og-invite.png` and no `og:video`.

## App Clip vs clipboard

An App Clip was not used. Someone without the app sees the note on the web, then Sign in with Apple. If the pasteboard looks like a URL, the app asks before reading it. Tapping Get Lil Things on the join page calls `stage_invite_handoff` (30 per hour per token, reused while it is valid, about 48 hours) and copies `handoff:<uuid>`. That id is not an invite token, so it cannot be mistaken for one.

## DNS and routing (do this yourself)

`lilthings.app` can stay on GitHub Pages for every path except `/join`. A Worker route only runs when the hostname is proxied by Cloudflare (orange cloud). This repo does not change DNS.

1. Add the `lilthings.app` zone to Cloudflare and point the registrar nameservers at Cloudflare.
2. Keep the existing apex and `www` records aimed at GitHub Pages, proxied.
3. From `worker/`, run `npx wrangler deploy`. Routes in `worker/wrangler.jsonc` are `lilthings.app/join`, `lilthings.app/join/*`, and the same on `www`. `workers.dev` is on, so the Worker has a preview URL before the zone is proxied.
4. Leave `/.well-known/apple-app-site-association` on GitHub Pages. Pages often serves it as `application/octet-stream`. Add a Cloudflare Response Header Transform Rule for that path only: set `Content-Type` to `application/json`.
5. Copy this `site/` directory to `lein0/lilthings-site`, including `.nojekyll`, `.well-known/apple-app-site-association`, `join/index.html`, `404.html`, and `og-invite.png`.

Until step 3 is live, `/join/<token>` is the static page. It can show the poster and the note text, but crawlers will not see per-invite `og:video` tags. The Worker is what sets `og:title` (`<name> sent you a little thing`), `og:description`, `og:image`, `og:video`, `og:video:secure_url`, `og:video:type` (`video/mp4`), width and height, and `twitter:card` `player` (or `summary_large_image` when the video is not uploaded yet). The page body is the note plus an App Store button. Handoff is created on that click, not while a crawler fetches the tags.

## Database

`supabase/migrations/20261023020000_default_reactions_and_invite_preview.sql` is not applied. It changes the default reactions for new Spaces to 👍 ❤️ 🔥, adds the preview and handoff RPCs (anon may execute them; they return no user id), and creates the public `invite-previews` bucket. Members of that invite's Space can upload only `poster.png` and `replay.mp4`. There is no list policy.

## Apple

Associated Domains on the main app is `applinks:lilthings.app`. Enable that on the App ID and regenerate the App Store profile under the same name. This change does not edit the Apple developer portal.
