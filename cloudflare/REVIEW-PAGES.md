# Sable & Fern team review on Cloudflare Pages

The **pages-review** branch is for sharing a complete sample storefront and operations workspace without sign-in. It does not use live orders, real customer details, D1 or authentication secrets.

| Cloudflare Pages setting | Value |
| --- | --- |
| GitHub repository | miaomiao0227/sable-fern-demo |
| Production branch | pages-review |
| Framework | None |
| Root directory | Leave blank |
| Build command | node worker/build-pages.mjs --review |
| Build output directory | pages-dist |

Open the production Pages URL and use the navigation bar to switch between the storefront, operations workspace, and analytics. Reviewers can edit sample listings, place test orders, record shipments and update order status. Changes are browser-local and do not propagate to other reviewers. Use fictitious data.

When the Pages project is connected to GitHub, pushes to **pages-review** trigger an automatic rebuild. The existing **main** branch is used by the Workers deployment.
