# Lil Things

Launch teaser site for the Lil Things iOS app. Production is GitHub Pages from the repository root, with `CNAME` set to `lilthings.app` (the public repo `lein0/lilthings-site`). This copy also lives at `site/` in the app repo so the onboarding restyle can be reviewed with the iOS code.

The page uses the onboarding palette: cream paper, charcoal ink, pastel near-square notes, Nunito for rounded UI type, and Caveat for handwriting. The Little Smiley blinks and follows the pointer, and the email caret while that field is focused.

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
