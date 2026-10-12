"""Remote MCP tools for Code Organizer + Codebase Doctor.

Read-only ZIP analysis: archives are inspected in memory and never extracted to disk.
Run with: python -m mcp.server (deployment entrypoint: mcp_server:mcp)
"""
from __future__ import annotations
import base64, hmac, io, json, os, re, zipfile
from pathlib import PurePosixPath
from typing import Any

try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    class FastMCP:  # lets analysis helpers be tested without installing the server SDK
        def __init__(self, name): self.name = name
        def tool(self): return lambda fn: fn
        def run(self, transport="streamable-http"):
            raise SystemExit("Install dependencies with: pip install -r requirements.txt")

mcp = FastMCP("Code Organizer + Codebase Doctor")
MAX_ZIP_BYTES = 12 * 1024 * 1024
MAX_UNPACKED_BYTES = 40 * 1024 * 1024
MAX_FILES = 500
MAX_FILE_BYTES = 1_000_000
SKIP_PARTS = {"node_modules", ".git", "__pycache__", ".venv", "venv", "dist", "build", ".next", "coverage"}
TEXT_EXTS = {".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json", ".md", ".java", ".c", ".h", ".cpp", ".go", ".rs", ".php", ".rb", ".yaml", ".yml", ".toml", ".sh"}
SECRET_RE = re.compile(r'(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*["\']?([A-Za-z0-9_\-/+=]{8,})')


def _safe_name(name: str) -> bool:
    p = PurePosixPath(name.replace("\\", "/"))
    return not p.is_absolute() and ".." not in p.parts and not (p.parts and ":" in p.parts[0])


def analyze_zip_bytes(raw: bytes) -> dict[str, Any]:
    if len(raw) > MAX_ZIP_BYTES:
        raise ValueError(f"ZIP exceeds the {MAX_ZIP_BYTES // (1024*1024)} MB upload limit")
    findings: list[dict[str, Any]] = []
    files: list[dict[str, Any]] = []
    total_unpacked = 0
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        infos = [i for i in zf.infolist() if not i.is_dir()]
        if len(infos) > MAX_FILES:
            raise ValueError(f"Archive contains too many files (maximum {MAX_FILES})")
        for info in infos:
            name = info.filename.replace("\\", "/")
            if not _safe_name(name):
                findings.append({"severity":"high", "category":"archive safety", "file":name[:200], "line":None, "message":"Unsafe path rejected; file was not read."})
                continue
            parts = PurePosixPath(name).parts
            if any(p in SKIP_PARTS for p in parts):
                continue
            ext = PurePosixPath(name).suffix.lower()
            if ext not in TEXT_EXTS:
                continue
            if info.file_size > MAX_FILE_BYTES:
                findings.append({"severity":"low", "category":"scope", "file":name, "line":None, "message":"Skipped file larger than 1 MB."})
                continue
            total_unpacked += info.file_size
            if total_unpacked > MAX_UNPACKED_BYTES:
                raise ValueError("Archive expands beyond the 40 MB analysis limit")
            try:
                text = zf.read(info).decode("utf-8")
            except (UnicodeDecodeError, RuntimeError, zipfile.BadZipFile):
                continue
            files.append({"path":name, "bytes":info.file_size, "lines":len(text.splitlines()), "extension":ext})
            for line_no, line in enumerate(text.splitlines(), 1):
                if ext in {".js", ".jsx", ".ts", ".tsx"} and re.search(r'\beval\s*\(', line):
                    findings.append({"severity":"high", "category":"security", "file":name, "line":line_no, "message":"Use of eval() can execute dynamically supplied code."})
                if ext == ".py" and re.search(r'\bexcept\s*:', line):
                    findings.append({"severity":"medium", "category":"bug risk", "file":name, "line":line_no, "message":"Bare except catches nearly every exception; catch specific exceptions when possible."})
                if ext == ".py" and re.search(r'\bdef\s+\w+\s*\([^)]*=\s*(\[\]|\{\}|set\(\))', line):
                    findings.append({"severity":"high", "category":"bug risk", "file":name, "line":line_no, "message":"Mutable default argument may be shared between function calls."})
                if ext in {".js", ".jsx", ".ts", ".tsx"} and re.search(r'\bconsole\.log\s*\(', line):
                    findings.append({"severity":"low", "category":"maintenance", "file":name, "line":line_no, "message":"Debug logging remains in source."})
                if ext in {".js", ".jsx", ".ts", ".tsx"} and re.search(r'(?<![=!])==(?!=)', line):
                    findings.append({"severity":"low", "category":"bug risk", "file":name, "line":line_no, "message":"Loose equality may produce surprising type coercions; consider strict equality."})
                if SECRET_RE.search(line):
                    findings.append({"severity":"critical", "category":"security", "file":name, "line":line_no, "message":"Possible hard-coded secret. Value intentionally omitted from this report."})
    return {"mode":"read-only", "filesScanned":len(files), "totalLines":sum(f["lines"] for f in files), "files":files, "findings":findings, "summary":{"critical":sum(f["severity"]=="critical" for f in findings),"high":sum(f["severity"]=="high" for f in findings),"medium":sum(f["severity"]=="medium" for f in findings),"low":sum(f["severity"]=="low" for f in findings)}, "note":"Read-only heuristic scan. Findings are suggestions, not proof of a vulnerability. No source files were modified."}


@mcp.tool()
def analyze_project_zip(zip_base64: str, project_name: str = "uploaded-project") -> str:
    """Analyze a project ZIP without changing it. Pass the ZIP file bytes encoded as base64. Returns file inventory, line counts, and heuristic code-health findings. Limits: 12 MB ZIP, 500 files, 40 MB expanded text. Do not include secrets if avoidable."""
    try:
        raw = base64.b64decode(zip_base64, validate=True)
        result = analyze_zip_bytes(raw)
        result["projectName"] = project_name[:120]
        return json.dumps(result, ensure_ascii=False)
    except (ValueError, zipfile.BadZipFile, base64.binascii.Error) as exc:
        return json.dumps({"error":str(exc),"mode":"read-only"})


@mcp.tool()
def codebase_doctor_capabilities() -> str:
    """Describe supported input, safety limits, and the read-only analysis performed by Codebase Doctor."""
    return json.dumps({"input":"Base64-encoded ZIP archive", "readOnly":True, "limits":{"zipBytes":MAX_ZIP_BYTES,"files":MAX_FILES,"expandedBytes":MAX_UNPACKED_BYTES,"perFileBytes":MAX_FILE_BYTES}, "checks":["possible hard-coded secrets (redacted)","eval() use in JavaScript/TypeScript","bare except in Python","mutable Python default arguments","console.log debug statements","loose JavaScript/TypeScript equality","file inventory and line counts"], "excludedDirectories":sorted(SKIP_PARTS), "notIncluded":"No automated edits, execution of project code, or claims of complete security coverage."})

# HTTP entrypoint for managed hosting. A bearer token is suitable for private
# staging only; public multi-user distribution should use OAuth at the host/MCP
# authorization layer (see DEPLOYMENT.md). Never commit the token to source.
class BearerAuthASGI:
    def __init__(self, app, token: str):
        self.app = app
        self.token = token.encode("utf-8")

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        path = scope.get("path", "")
        if path == "/health":
            body = b'{"status":"ok","service":"code-organizer-codebase-doctor"}'
            await send({"type":"http.response.start", "status":200, "headers":[(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
            await send({"type":"http.response.body", "body":body})
            return
        headers = {k.lower(): v for k, v in scope.get("headers", [])}
        supplied = headers.get(b"authorization", b"")
        prefix = b"Bearer "
        candidate = supplied[len(prefix):] if supplied.startswith(prefix) else b""
        if not candidate or not hmac.compare_digest(candidate, self.token):
            body = b'{"error":"unauthorized"}'
            await send({"type":"http.response.start", "status":401, "headers":[(b"content-type", b"application/json"), (b"www-authenticate", b"Bearer"), (b"content-length", str(len(body)).encode())]})
            await send({"type":"http.response.body", "body":body})
            return
        await self.app(scope, receive, send)


def create_app():
    """Create an authenticated Streamable HTTP ASGI app for Render/Docker."""
    token = os.environ.get("MCP_BEARER_TOKEN", "").strip()
    if len(token) < 32:
        raise RuntimeError("Set MCP_BEARER_TOKEN to a randomly generated secret of at least 32 characters")
    try:
        import uvicorn
    except ImportError as exc:
        raise RuntimeError("Install requirements.txt before starting the server") from exc
    return BearerAuthASGI(mcp.streamable_http_app(), token)


if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(create_app(), host=host, port=port)
