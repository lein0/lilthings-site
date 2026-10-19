# Lil Things

Launch teaser site for the Lil Things iOS app, served as static files from the repository root (GitHub Pages).

Preview locally:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

The homepage is a pre-launch teaser with a waitlist form (`assets/js/teaser.js`). Signups go to the Supabase table `public.waitlist` via the `join_waitlist` RPC. Legal pages still use `assets/css/styles.css` and `assets/js/main.js`.

- Home: `/`
- Privacy Policy: `/privacy.html`
- Terms of Use: `/terms.html`
- Community Guidelines: `/community-guidelines.html`
- Support: `/support.html`
