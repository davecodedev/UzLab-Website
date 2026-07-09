# Content templates

`UzLab_Content_Template.xlsx` is the spreadsheet handed to the association
for the first bulk batch of content — Publications, News, and Membership
Types, each on its own tab with an example row and inline instructions.

Regenerate it after changing the columns with:
```bash
python3 build_template.py
```
(requires `pip3 install openpyxl`)

## Importing a filled-in copy

Once a filled-in copy comes back, run it against the database:
```bash
cd apps/api
npm run import:content -- /path/to/filled.xlsx
```

This creates real records directly via Prisma (see
`apps/api/scripts/import-content.ts`) — no API server needs to be running,
just a reachable `DATABASE_URL`. It's additive only: re-running it against
the same file creates duplicates rather than updating existing rows, so
review the file for junk (like the untouched example row) before running
it against a real database.

For anything after this first batch, use the `/admin` panel on the site
instead — it's the ongoing, no-developer-required way to add and edit
content.
