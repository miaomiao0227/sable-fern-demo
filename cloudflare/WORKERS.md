# Deploy to the existing Cloudflare Worker

Use the existing sable-fern-demo Worker, connected to miaomiao0227/sable-fern-demo.

In **Settings → Build**, select main, keep the repository root, and set the deploy command to **npx wrangler deploy**. Wrangler runs the JavaScript build and provisions the **DB** binding. With automatic builds enabled, a push to main triggers deployment.

After the first successful deployment, open **Storage & databases → D1** and select the database identified by the Worker's **DB** binding. Initialize the empty database by applying each file once in this order:

1. [Commerce schema](../drizzle/0000_commerce.sql)
2. [Product visits](../drizzle/0001_product_visits.sql)
3. [Google login sessions](0002_commerce_sessions.sql)

Create a Google OAuth Web client. Set the authorized redirect URI to https://sable-fern-demo.runmiao0227.workers.dev/auth/google/callback.

In the Worker's **Settings → Variables and Secrets**, configure **COMMERCE_ADMIN_EMAIL**, **GOOGLE_CLIENT_ID**, and **GOOGLE_CLIENT_SECRET** (Secret type). The production origin is set in Wrangler. Never commit real OAuth credentials or customer data.

Follow the [verification checklist](README.md#verify-and-update).
