# ChatGPT MCP integration — implementation notes

## What this adds
- `mcp_server.py`: Streamable HTTP MCP server with `analyze_project_zip` and `codebase_doctor_capabilities` tools.
- Read-only ZIP analysis. The archive is inspected in memory and is never extracted to disk; uploaded code is never executed or modified.
- Defensive limits: 12 MB compressed upload, 500 files, 40 MB expanded text, 1 MB per file; path traversal rejection; common generated/dependency folders skipped.
- Existing browser app, snippet cleaner, reports, local save/export routes, and smoke tests are retained.

## Local setup
1. Use Python 3.10+.
2. `python -m venv .venv && source .venv/bin/activate` (Windows: `.venv\\Scripts\\activate`).
3. `pip install -r requirements.txt`.
4. `python mcp_server.py` starts the MCP Streamable HTTP endpoint, normally on `http://localhost:8000/mcp` (check the MCP SDK startup output).
5. In another terminal, run `node tests/smoke-test.js` and `python -m unittest tests/test_mcp_analysis.py`.

## ChatGPT connection and public release
A local endpoint is not reachable by ChatGPT's hosted service. For a real public integration, deploy this MCP server to a public HTTPS host, verify `/mcp` and authentication/rate limiting, then configure the ChatGPT developer integration against that exact endpoint. Do not publish a guessed endpoint or expose an unauthenticated upload service. Public directory submission and approval are separate from building/testing the server.

## Important scope
The initial MCP scan is a conservative first integration layer and is not a 1:1 port of every browser-side analyzer. It does not execute uploaded code and does not modify source files. Existing in-browser analysis remains available in the original app.
