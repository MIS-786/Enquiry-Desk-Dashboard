<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Dashboard data comes from the "Enquiry Capture (Responses)" Google Sheet via a server function (`src/lib/enquiries.functions.ts`) calling the Lovable connector gateway; it falls back to a bundled snapshot when the connection is not linked, so the page never breaks.
- Row parsing and aggregation live as pure functions in `src/lib/enquiries.ts` (columns mapped by header name), so they stay unit-testable and survive column reordering in the form.
