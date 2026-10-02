# Worker

This folder may later hold a Cloudflare Worker that acts as a CORS proxy for the downloader feature.

A browser cannot fetch Loom or Jam video files directly because those hosts do not set permissive CORS headers. The worker will forward the request server-side and stream the response back to the client, bypassing the restriction.

No worker code exists yet.
