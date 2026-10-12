#!/usr/bin/env python3
"""
blow-dryr — Lightweight Local HTTP Development Server
Usage:
    python3 server.py [port]
"""

import http.server
import socketserver
import sys
import os
import json
import io
import zipfile

DEFAULT_PORT = 4050

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent aggressive caching during local development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/save-disk':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
                files = data.get('files', {})
                count = 0
                for rel_path, content in files.items():
                    clean_path = os.path.normpath(rel_path)
                    if clean_path.startswith("..") or os.path.isabs(clean_path):
                        continue
                    dir_name = os.path.dirname(clean_path)
                    if dir_name:
                        os.makedirs(dir_name, exist_ok=True)
                    with open(clean_path, "w", encoding="utf-8") as f:
                        f.write(content)
                    count += 1
                response = json.dumps({"success": True, "savedCount": count}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(response)))
                self.end_headers()
                self.wfile.write(response)
            except Exception as e:
                err_resp = json.dumps({"success": False, "error": str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(err_resp)))
                self.end_headers()
                self.wfile.write(err_resp)
        elif self.path == '/api/export-zip':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
                files = data.get('files', {})
                zip_buffer = io.BytesIO()
                with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                    for rel_path, content in files.items():
                        clean_path = os.path.normpath(rel_path)
                        if not clean_path.startswith("..") and not os.path.isabs(clean_path):
                            zip_file.writestr(clean_path, content)
                zip_bytes = zip_buffer.getvalue()
                self.send_response(200)
                self.send_header('Content-Type', 'application/zip')
                self.send_header('Content-Disposition', 'attachment; filename="codebase-doctor-fixed.zip"')
                self.send_header('Content-Length', str(len(zip_bytes)))
                self.end_headers()
                self.wfile.write(zip_bytes)
            except Exception as e:
                err_resp = json.dumps({"success": False, "error": str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(err_resp)))
                self.end_headers()
                self.wfile.write(err_resp)
        else:
            self.send_response(404)
            self.end_headers()

def run_server(port=DEFAULT_PORT):
    handler = CustomHTTPRequestHandler
    # Bind to localhost
    with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
        print(f"==================================================")
        print(f"  blow-dryr Local Server Started")
        print(f"  Access URL: http://localhost:{port}")
        print(f"  Directory:  {os.getcwd()}")
        print(f"==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    run_server(port)
