# Deployment and secure connection guide

## Recommended first host: Render (Docker)

This repository includes a `Dockerfile` and `render.yaml` for a straightforward managed deployment. The service listens on Render's `PORT`, provides `/health`, and exposes the MCP Streamable HTTP endpoint at `/mcp` using the MCP Python SDK.

### Deploy for private staging
1. Push this project to a private GitHub repository (do not commit credentials or `.env` files).
2. In Render, choose **New > Blueprint** and connect the repository; Render reads `render.yaml` and builds the Docker service.
3. Confirm the `MCP_BEARER_TOKEN` environment variable is generated as a secret. If you create it manually, use a cryptographically random value of at least 32 characters, e.g. `python -c 'import secrets; print(secrets.token_urlsafe(48))'`. Never paste it into source control or public listing fields.
4. Wait for the deployment to become healthy. Test `https://YOUR-SERVICE.onrender.com/health` (health only; no auth needed).
5. Test MCP with a client that can send `Authorization: Bearer YOUR_TOKEN` to `https://YOUR-SERVICE.onrender.com/mcp`. An unauthorized request should return HTTP 401.

### Authentication boundary — important
The included bearer-token gate is a secure *private staging* control, not the final authentication model for a public multi-user ChatGPT directory listing. A single shared token is not appropriate to distribute to every user. Before public release, add an OAuth 2.1 authorization flow supported by the ChatGPT/MCP client and use per-user tokens/scopes, token expiry/revocation, rate limits, and abuse monitoring. Keep the bearer-token gate enabled until OAuth has been implemented and tested; do not make `/mcp` public without authentication.

### End-to-end checks
- `GET /health` returns `200` and a small JSON status.
- `POST /mcp` without `Authorization` returns `401`.
- A valid bearer token reaches the MCP endpoint; invalid/expired credentials never do.
- Call `codebase_doctor_capabilities` and confirm the advertised limits.
- Call `analyze_project_zip` with a base64-encoded harmless test ZIP; confirm file inventory and findings.
- Include a ZIP with `../escape.py`, oversized files, too many files, and a possible secret. Confirm paths are not extracted, limits reject oversized input, and secret values never appear in the report.
- Verify the original browser app separately with `python3 server.py 4050` and `node tests/smoke-test.js`.

### Public submission is separate
Deployment does not automatically create a ChatGPT integration or publish a directory listing. Configure the deployed MCP endpoint in the developer integration flow, implement OAuth for public access, test in ChatGPT, prepare the listing/icon/privacy/terms/support URLs and reviewer cases, then submit for review. Approval and publication are separate from deployment.
