# Codebase Doctor — Project-Wide Code Health Suite

**Codebase Doctor** (built on the *blow-dryr* core) is an advanced developer tool for project-wide static analysis, transparent code health reporting, and review-before-apply safe code maintenance — with full support for single-snippet indentation and syntax gatekeeping.

## Key Capabilities

### 1. Project-Wide Code Analysis
- Ingests full project directories or multi-file uploads via native HTML5 folder/file inputs.
- Automatically filters out internal and build directories (`node_modules`, `.git`, `__pycache__`, `.venv`, `dist`, `build`).
- Inspects real relationships, file structures, and code patterns across Python, JavaScript, TypeScript, HTML, CSS, C/C++, and JSON.
- Detects:
  - **Cross-File Import & Dependency Graph**: Resolves local module imports (`.js`, `.ts`, `/index.js`, Python relative `.module`, package `__init__.py`), flags broken import paths (`DEP_BROKEN`), and detects circular dependency chains (`A -> B -> A`).
  - **Function Complexity & Nesting Analysis**: Calculates cyclomatic complexity (branches: `if`, `elif`, `for`, `while`, `catch`, `&&`, `||`) flagging functions > 8, and measures nesting depth flagging logic nested >= 5 levels deep.
  - **Reliable Unused Declarations**: Pinpoints dead internal functions and unreferenced variables while exempting public API exports, docstrings, and type annotations.
  - **Syntax Errors & Unclosed Delimiters**: Real-time stack-based delimiter validation for Python, JavaScript, and TypeScript.
  - **Python Antipatterns**: `== None` vs `is None`, mutable default arguments (`def f(x=[])`), bare `except:`, unused imports.
  - **JavaScript/TypeScript Vulnerabilities**: `eval()` invocations, leftover `console.log()` debug statements, loose equality `==`.
  - **Security Gatekeeper**: Scans for plain-text API keys, passwords, and tokens, masking values with asterisks in reports.
  - **Cross-File Duplication**: Sliding-window line hash comparator that identifies duplicated logic blocks across different modules.
  - **Full .gitignore & Incremental Rescanning**: Parses `.gitignore` rules and uses string hashing to cache unchanged files during re-scans.
  - **Direct Disk Sync & ZIP Export**: Direct local disk persistence via `server.py` (`POST /api/save-disk`) and one-click ZIP packaging (`POST /api/export-zip`).
  - **Persistent Backups**: Session state and rollback history are automatically persisted in `localStorage` across page reloads.

### 2. Transparent Code Health Report
- Calculates an honest, non-arbitrary health score (0–100) using a transparent mathematical formula:
  $$\text{Score} = \max\left(0, \min\left(100, 100 - \frac{\text{Penalty}}{\text{Normalizer}}\right)\right)$$
  - Critical: -15 penalty points
  - High: -8 penalty points
  - Medium: -3 penalty points
  - Low: -1 penalty point
  - Normalizer: $\max(1, \text{TotalFiles} \times 0.4)$
- Interactive filtering by severity (Critical, High, Medium, Low), category (Security, Bug Risk, Architecture, Dependencies, Complexity, Formatting, Documentation), file, and issue status.
- Export full structured Markdown reports with a single click.

### 3. Review-Before-Apply Safe Fix Workflow
- **Zero Unsolicited Edits**: Every proposed modification requires explicit user review.
- Shows side-by-side diff previews comparing the original line against the proposed safe fix.
- **Recoverable Backup Snapshots**: Automatic in-memory and `localStorage` rollback snapshots ensure changes are 100% reversible via the top **Undo** button.
- **Post-Fix Syntax Verification**: Re-runs the syntax gatekeeper to ensure applied fixes never introduce compiler breaks.

### 4. Beginner-Friendly Mode
- Toggle switch dynamically enables plain-English pedagogical explanations.
- Features **Why It Matters** callouts and **Learning Tips** for students and developers.

### 5. Preserved Snippet Cleaner (blow-dryr Core)
- Switch seamlessly between **Project Doctor** and the original **Snippet Cleaner**.
- 4-space preserved-logic indentation formatter.
- Language auto-detection and pre-flight verification modal.
- Syntax gatekeeper circuit breaker.

---

## Quick Start & Automated Testing

### 1. Run Automated Smoke Tests
```bash
node tests/smoke-test.js
```
Runs 15 automated test assertions validating JavaScript syntax, Python compilation, issue detection, clean benchmark 100/100 scoring, fix rejection/acceptance/undo, .gitignore parsing, incremental rescanning, XSS sanitization, HTTP server response, and ZIP bundle integrity.

### 2. Start Local Development Server
```bash
python3 server.py 4050
```
Open **[http://localhost:4050](http://localhost:4050)** in your browser.

- Click **Demo Project** to run an instant analysis on a realistic multi-file repository with known issues.
- Click **Clean Benchmark** to verify zero false positives on clean codebases.
- Click **Upload Folder** to inspect your own local coding projects.
- Click **View Dependency Graph** to inspect cross-module architecture.
- Click **Save to Disk** or **Export ZIP** to synchronize or download your repaired project files.

---

## ChatGPT MCP integration (initial read-only version)

The original browser application and its `server.py` local-development routes are preserved. The added `mcp_server.py` exposes two MCP tools for remote use:

- `codebase_doctor_capabilities`: describes the initial scan's supported checks and limits.
- `analyze_project_zip`: accepts a base64-encoded ZIP and returns a structured read-only heuristic report.

The MCP scanner is a **separate, limited first integration**, not a complete remote version of every analysis feature in the browser app. It does not execute uploaded project code, extract archives to disk, or apply fixes.

### Run MCP tests

```bash
python -m unittest tests/test_mcp_analysis.py
```

### Local MCP server setup

Install dependencies from `requirements.txt`, set `MCP_BEARER_TOKEN` to a randomly generated secret of at least 32 characters, then run:

```bash
python mcp_server.py
```

The HTTP MCP endpoint is normally `/mcp` on the configured host and port. `/health` is unauthenticated for hosting health checks; other HTTP paths require the bearer token. This token gate is for private staging only. Before public multi-user release, implement and test OAuth-based authentication, per-user authorization, rate limiting, and abuse monitoring.

See `PLUGIN_INTEGRATION.md` and `DEPLOYMENT.md` for integration scope and deployment steps. Passing local tests does not prove a live ChatGPT connection or successful cloud deployment.

