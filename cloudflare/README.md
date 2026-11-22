# Cloudflare Pages deployment

The existing Sites deployment still uses the original build. For Cloudflare Pages, use the separate target below. The Cloudflare demo starts with a fresh database and uses Google sign-in. It continues to take test COD orders only.

## Git integration

In Cloudflare Workers & Pages, create a Pages project with **Connect to Git**. Authorize only the selected GitHub repository and keep its existing visibility. Use these build settings:

| Setting | Value |
| --- | --- |
| Production branch | main |
| Framework | None |
| Root directory | Repository root |
| Build command | node worker/build-pages.mjs |
| Build output directory | pages-dist |

The build embeds the web assets and shopping API in the Pages Advanced Mode Worker. Commit source, SQL and build scripts. The generated Worker and local secret files are ignored.

## Database

Create a D1 database for the Cloudflare demo, bind it as **DB** to production, and apply these SQL files once in order to the empty database. Wrangler can run each file using the command below. Sign in locally with Wrangler before running remote commands, or use the authenticated Cloudflare dashboard.

1. drizzle/0000_commerce.sql
2. drizzle/0001_product_visits.sql
3. cloudflare/0002_commerce_sessions.sql

    npx wrangler d1 execute DATABASE_NAME --remote --file=PATH_TO_SQL

Bind an independent database for previews if you want preview API access. Keep production customer data out of previews and GitHub.

## Identity

Create a Google OAuth **Web application** and register the production callback URL with the exact hostname:

    https://YOUR-PAGES-PROJECT.pages.dev/auth/google/callback

Configure these values in **Pages → Settings → Variables and Secrets** for production, then redeploy.

| Variable | Purpose |
| --- | --- |
| COMMERCE_PUBLIC_ORIGIN | Production HTTPS origin, without a trailing slash |
| COMMERCE_ADMIN_EMAIL | Verified Google email authorized to use the dashboard |
| GOOGLE_CLIENT_ID | Google Web OAuth client ID |
| GOOGLE_CLIENT_SECRET | Google Web OAuth client secret. Use the Secret type |

The storefront is public and browsing requires no login. Account creation and checkout use Google sign-in. OAuth test mode requires eligible test users in the Google project. Sign-in is restricted to the configured production origin. Customer addresses, sessions and order records are persisted in D1.

## Verify and update

Run the local integration checks before pushing:

    node worker/build-pages.mjs
    node worker/check-pages.mjs

On the deployed URL, confirm the storefront, catalogue API, CSS, photos, category navigation and product details load in a private window. Verify anonymous users cannot access the administration page or API. Sign in with a customer account, register a profile, and place a test COD order. Sign in as the operator, confirm the order, enter a tracking number, and mark it signed. Recheck the customer's order and the analytics page. No real funds are transferred.

After Git integration is active, a push to main triggers a production build. Review the deployment result in Cloudflare. Apply database schema changes deliberately before publishing code that requires them. Secrets, database content and account ownership are managed independently of the Git repository.
