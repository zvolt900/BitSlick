import io, unittest, zipfile
from mcp_server import analyze_zip_bytes, BearerAuthASGI

def make_zip(files):
    b=io.BytesIO()
    with zipfile.ZipFile(b,'w') as z:
        for name, text in files.items(): z.writestr(name,text)
    return b.getvalue()

class ReadOnlyZipAnalysisTests(unittest.TestCase):
    def test_finds_multiple_issue_types_and_redacts_secret(self):
        report=analyze_zip_bytes(make_zip({'src/a.js':'eval(userInput);\nconsole.log("debug");\nif (a == b) {}\n','app.py':'def f(x=[]):\n    try: pass\n    except: pass\nTOKEN = "supersecretvalue123"\n'}))
        cats={f['category'] for f in report['findings']}
        self.assertIn('security',cats)
        self.assertIn('bug risk',cats)
        self.assertIn('maintenance',cats)
        self.assertNotIn('supersecretvalue123',str(report))
        self.assertEqual(report['mode'],'read-only')
    def test_skips_dependency_folders(self):
        report=analyze_zip_bytes(make_zip({'node_modules/pkg/index.js':'eval(x)','src/main.js':'console.log(1)'}))
        self.assertEqual(report['filesScanned'],1)
        self.assertEqual(report['files'][0]['path'],'src/main.js')
    def test_rejects_traversal_path(self):
        report=analyze_zip_bytes(make_zip({'../outside.py':'print(1)','ok.py':'print(2)'}))
        self.assertTrue(any('Unsafe path rejected' in x['message'] for x in report['findings']))
        self.assertEqual(report['filesScanned'],1)

class BearerAuthTests(unittest.IsolatedAsyncioTestCase):
    async def _request(self, headers):
        called = []
        async def app(scope, receive, send):
            called.append(True)
            await send({"type":"http.response.start", "status":200, "headers":[]})
            await send({"type":"http.response.body", "body":b"ok"})
        wrapped = BearerAuthASGI(app, "test-token-that-is-long-enough-for-unit-tests")
        messages=[]
        async def receive(): return {"type":"http.request", "body":b"", "more_body":False}
        async def send(message): messages.append(message)
        await wrapped({"type":"http", "path":"/mcp", "headers":headers}, receive, send)
        return messages, called

    async def test_rejects_missing_bearer_token(self):
        messages, called = await self._request([])
        self.assertEqual(messages[0]["status"],401)
        self.assertFalse(called)

    async def test_rejects_wrong_bearer_token(self):
        messages, called = await self._request([(b"authorization",b"Bearer wrong")])
        self.assertEqual(messages[0]["status"],401)
        self.assertFalse(called)

    async def test_accepts_valid_bearer_token(self):
        messages, called = await self._request([(b"authorization",b"Bearer test-token-that-is-long-enough-for-unit-tests")])
        self.assertEqual(messages[0]["status"],200)
        self.assertTrue(called)

if __name__=='__main__': unittest.main()
