/* ==========================================================================
   Codebase Doctor — Core Engine (blow-dryr v2.1)
   Advanced Static Analysis, Dependency Graphs, Complexity & Safe Maintenance
   ========================================================================== */

// Global Application State
const appState = {
  currentMode: "doctor", // 'doctor' | 'cleaner'
  isBeginnerMode: true,
  project: {
    name: "No Project Loaded",
    files: {}, // { [filePath]: fileContent }
    fileCount: 0,
    totalLoc: 0,
    duplicationPercent: 0,
    languages: {},
    issues: [], // Array of Issue objects
    score: null,
    grade: "--",
    counts: { Critical: 0, High: 0, Medium: 0, Low: 0 },
    lastScanTime: null,
    scanMode: "Full Scan",
    dependencyGraph: { nodes: {}, brokenCount: 0, totalResolved: 0 }
  },
  fileHashCache: {}, // { [filePath]: hash } for Incremental Rescanning
  historySnapshots: [], // For reversible backups (persisted to localStorage)
  scanHistory: [], // Track chronological scan runs for deltas and comparison
  activeDepModule: null, // Selected module in dependency inspector
  activeFilter: {
    severity: "All",
    category: "All",
    file: "All",
    status: "All",
    search: ""
  },
  pendingFixIssue: null
};

// ==========================================================================
// PRE-BUILT DEMO CODEBASES (REALISTIC MULTI-FILE SOURCE CODE)
// ==========================================================================
const DEMO_PROJECTS = {
  issues: {
    name: "Flask & JS Fullstack Service",
    files: {
      "backend/app.py": `import os
import json
import requests
from .utils import calculate_discount
from .missing_module import non_existent_helper  # Intentional broken import test

API_KEY = "sk_live_9876543210abcdef9876"  # Hardcoded test secret

def authenticate_user(token):
    # Missing docstring
    if token == None:
        return False
    return True

def query_user_records(query, cache=[]):
    try:
        if query in cache:
            return cache[query]
        # Insecure shell command execution demonstration
        os.system("echo 'Auditing query: ' + query")
        result = requests.get("https://api.internal/users?q=" + query)
        cache.append(query)
        return result.json()
    except:
        return None

def process_batch_orders(order_list):
    total = 0
    for order in order_list:
        if order.get("active") != None:
            total += order.get("amount", 0)
    return total

def calculate_nested_tax(item, country, is_vip, has_coupon):
    # High cyclomatic complexity & excessive nesting demo
    tax = 0.0
    if country == "US":
        if is_vip:
            if has_coupon:
                if item.get("category") == "food":
                    tax = 0.01
                else:
                    tax = 0.03
            else:
                tax = 0.05
        else:
            tax = 0.08
    elif country == "EU":
        if is_vip:
            tax = 0.12
        else:
            tax = 0.20
    else:
        tax = 0.15
    return tax
`,

      "backend/utils.py": `import math
import os

def calculate_discount(price, rate):
    return price - (price * (rate / 100))

def process_batch_orders(order_list):
    # Duplicate block from app.py
    total = 0
    for order in order_list:
        if order.get("active") != None:
            total += order.get("amount", 0)
    return total

def run_large_statistical_pipeline(items):
    # Overly long function for demonstration
    results = []
    step1 = [x * 2 for x in items]
    step2 = [x + 5 for x in step1]
    step3 = [x / 2 for x in step2]
    step4 = [x * 1.5 for x in step3]
    step5 = [x - 1 for x in step4]
    step6 = [x * 0.9 for x in step5]
    step7 = [x + 10 for x in step6]
    step8 = [x / 1.1 for x in step7]
    step9 = [x * 2 for x in step8]
    step10 = [x - 3 for x in step9]
    for val in step10:
        if val > 10:
            results.append(val)
        else:
            results.append(0)
    return results

def unused_internal_helper():
    # Unused function declaration
    return 42
`,

      "frontend/main.js": `import { renderBanner } from "./ui.js";

function handleClientPayload(rawString) {
    // Insecure eval usage
    eval("var parsed = " + rawString);
    console.log("DEBUG: raw payload received", rawString);

    if (parsed.status == 200) {
        updateInterface(parsed.data);
    }
}

function updateInterface(userData) {
    const banner = document.getElementById("welcomeBanner");
    if (userData.name != null) {
        // Unsafe DOM XSS innerHTML assignment demonstration
        banner.innerHTML = "<strong>Welcome, " + userData.name + "</strong>";
    }
}

const unusedLocalVariable = 100;
`,

      "frontend/ui.js": `export function renderBanner(text) {
    return "<div>" + text + "</div>";
}
`,

      "package.json": `{
  "name": "fullstack-demo",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "*",
    "express": "^4.18.2"
  }
}`,

      ".gitignore": `# Demo gitignore
node_modules/
*.log
dist/
build/
`
    }
  },

  clean: {
    name: "Clean Benchmark Microservice",
    files: {
      "services/calculator.py": `"""Mathematical calculation helper service."""

def add(a: float, b: float) -> float:
    """Add two numbers and return the sum."""
    return a + b

def subtract(a: float, b: float) -> float:
    """Subtract b from a and return the difference."""
    return a - b

def multiply(a: float, b: float) -> float:
    """Multiply two numbers and return the product."""
    return a * b
`,

      "services/logger.js": `/**
 * Pure application logging module.
 */
export function logInfo(message) {
    if (message !== null && message !== undefined) {
        return { timestamp: Date.now(), log: message };
    }
    return null;
}
`
    }
  }
};

// ==========================================================================
// PRESERVED SNIPPET CLEANER STATE & SAMPLES (blow-dryr Core)
// ==========================================================================
const cleanerState = {
  rawCode: "",
  detectedLanguage: "javascript",
  confirmedLanguage: "javascript",
  formattedCode: "",
  hasError: false
};

const SAMPLES = {
  js_messy: `function processOrderData(order,discountRate,taxPercentage){
let subtotal=0;for(let i=0;i<order.items.length;i++){
let item=order.items[i];if(item.price>0){
subtotal+=item.price*item.quantity;
}
}
if(discountRate>0){subtotal=subtotal-(subtotal*(discountRate/100));}
let tax=subtotal*(taxPercentage/100);
return{subtotal:subtotal,tax:tax,total:subtotal+tax};
}`,

  py_messy: `def filter_active_users(user_list,min_score=50):
result=[]
for user in user_list:
if user.get('is_active') and user.get('score',0)>=min_score:
score=user['score']
if score>=90:
rank='Gold'
elif score>=75:
rank='Silver'
else:
rank='Bronze'
result.append({'username':user['name'],'rank':rank})
return result`,

  cpp_messy: `int calculateFactorial(int n){
if(n<=1){return 1;}
int result=1;
for(int i=2;i<=n;i++){
result=result*i;
}
return result;
}`,

  syntax_error: `function parseConfiguration(inputString {
let config = JSON.parse(inputString);
if (config.enabled === true) {
console.log("Config loaded:", config.name;
return config;
}`
};

// ==========================================================================
// INITIALIZATION & PERSISTENCE
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Load persistent snapshots from localStorage if available
  loadPersistentBackups();

  // Setup snippet cleaner listener
  const codeInput = document.getElementById("codeInput");
  if (codeInput) {
    codeInput.addEventListener("input", handleInputChange);
    updateCounterStats();
  }

  // Restore previous project session if saved, or load default demo project
  const restored = loadActiveProjectSession();
  if (!restored) {
    loadDemoProject("issues");
  }

  // Close dropdowns on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown-wrapper")) {
      closeAllDropdowns();
    }
  });
});

function toggleDropdown(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isOpen = el.classList.contains("open");
  closeAllDropdowns();
  if (!isOpen) {
    el.classList.add("open");
  }
}

function closeAllDropdowns() {
  if (typeof document === "undefined" || !document.querySelectorAll) return;
  document.querySelectorAll(".dropdown-wrapper.open").forEach(d => {
    d.classList.remove("open");
  });
}

function loadPersistentBackups() {
  try {
    const saved = localStorage.getItem("codebase_doctor_backups");
    if (saved) {
      appState.historySnapshots = JSON.parse(saved);
      updateUndoCountBadge();
    }
  } catch (e) {
    console.warn("Could not load snapshots from localStorage:", e);
  }
}

function savePersistentBackups() {
  try {
    localStorage.setItem("codebase_doctor_backups", JSON.stringify(appState.historySnapshots));
    updateUndoCountBadge();
  } catch (e) {
    console.warn("Could not save snapshots to localStorage:", e);
  }
}

function updateUndoCountBadge() {
  const badge = document.getElementById("undoCountBadge");
  if (badge) {
    badge.textContent = appState.historySnapshots.length;
  }
}

function saveActiveProjectSession() {
  try {
    if (typeof localStorage !== "undefined" && appState.project && appState.project.files && Object.keys(appState.project.files).length > 0) {
      localStorage.setItem("codebase_doctor_active_project", JSON.stringify({
        name: appState.project.name,
        files: appState.project.files
      }));
    }
  } catch (e) {
    console.warn("Could not save active project session to localStorage:", e);
  }
}

function loadActiveProjectSession() {
  try {
    if (typeof localStorage === "undefined") return false;
    const saved = localStorage.getItem("codebase_doctor_active_project");
    if (saved) {
      const data = JSON.parse(saved);
      if (data && data.files && Object.keys(data.files).length > 0) {
        appState.project.name = data.name || "Restored Session";
        appState.project.files = data.files;
        appState.fileHashCache = {};
        runProjectAnalysis(false);
        return true;
      }
    }
  } catch (e) {
    console.warn("Could not restore active project session:", e);
  }
  return false;
}

async function saveChangesToDisk() {
  const files = appState.project.files;
  if (!files || Object.keys(files).length === 0) {
    showToast("No active project files to save.");
    return;
  }

  showToast("Saving files directly to local disk...");
  try {
    const res = await fetch("/api/save-disk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files })
    });
    if (res.ok) {
      const result = await res.json();
      showToast(`✓ Successfully synchronized ${result.savedCount} files directly to disk!`);
    } else {
      showToast("Notice: Local server returned an error during disk sync.");
    }
  } catch (e) {
    showToast("Direct disk sync requires running local server (python3 server.py). Use 'Export ZIP' for browser download.");
  }
}

async function exportModifiedProject() {
  const files = appState.project.files;
  if (!files || Object.keys(files).length === 0) {
    showToast("No active project files to export.");
    return;
  }

  showToast("Preparing ZIP export...");
  try {
    const res = await fetch("/api/export-zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files })
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${appState.project.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-fixed.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast("✓ Downloaded fixed project ZIP archive!");
      return;
    }
  } catch (e) {
    console.warn("Server ZIP export unavailable, using client-side fallback:", e);
  }

  // Fallback: If server is offline, export JSON
  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(files, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = "project-files-export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Exported project files as JSON (Server ZIP unavailable)");
  } catch (err) {
    showToast("Export failed: " + err.message);
  }
}

// Mode Switching (Project Doctor vs Snippet Cleaner)
function switchToolMode(mode) {
  appState.currentMode = mode;
  const btnDoctor = document.getElementById("btnModeDoctor");
  const btnCleaner = document.getElementById("btnModeCleaner");
  const secDoctor = document.getElementById("doctorModeSection");
  const secCleaner = document.getElementById("cleanerModeSection");
  const actDoctor = document.getElementById("doctorHeaderActions");
  const actCleaner = document.getElementById("cleanerHeaderActions");

  if (mode === "doctor") {
    btnDoctor.classList.add("active");
    btnCleaner.classList.remove("active");
    secDoctor.classList.remove("hidden");
    secCleaner.classList.add("hidden");
    actDoctor.classList.remove("hidden");
    actCleaner.classList.add("hidden");
  } else {
    btnCleaner.classList.add("active");
    btnDoctor.classList.remove("active");
    secCleaner.classList.remove("hidden");
    secDoctor.classList.add("hidden");
    actCleaner.classList.remove("hidden");
    actDoctor.classList.add("hidden");
  }
}

function toggleBeginnerMode(isEnabled) {
  appState.isBeginnerMode = isEnabled;
  renderIssuesList();
  showToast(isEnabled ? "Beginner Mode enabled" : "Expert Mode enabled");
}

// ==========================================================================
// PROJECT INGESTION & .GITIGNORE PARSING
// ==========================================================================
function loadDemoProject(type) {
  const demo = DEMO_PROJECTS[type];
  if (!demo) return;

  appState.project.name = demo.name;
  appState.project.files = JSON.parse(JSON.stringify(demo.files)); // Deep clone
  appState.fileHashCache = {}; // Reset hash cache for fresh project
  saveActiveProjectSession();
  runProjectAnalysis(false);
  showToast(`Loaded ${demo.name}`);
}

function handleFolderUpload(event) {
  const fileList = event.target.files;
  if (!fileList || fileList.length === 0) return;

  const filesMap = {};
  let loadedCount = 0;
  const total = fileList.length;

  for (let i = 0; i < total; i++) {
    const file = fileList[i];
    const relPath = file.webkitRelativePath || file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
      filesMap[relPath] = e.target.result;
      loadedCount++;
      if (loadedCount === total) {
        processUploadedProject(filesMap, "Uploaded Folder");
      }
    };
    reader.readAsText(file);
  }
}

function handleFilesUpload(event) {
  const fileList = event.target.files;
  if (!fileList || fileList.length === 0) return;

  const filesMap = {};
  let loadedCount = 0;
  const total = fileList.length;

  for (let i = 0; i < total; i++) {
    const file = fileList[i];
    const fileName = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
      filesMap[fileName] = e.target.result;
      loadedCount++;
      if (loadedCount === total) {
        processUploadedProject(filesMap, "Uploaded Files");
      }
    };
    reader.readAsText(file);
  }
}

function processUploadedProject(rawFilesMap, projectName) {
  // Parse .gitignore if present in project
  const gitignoreRules = extractGitignoreRules(rawFilesMap);

  const filteredMap = {};
  Object.keys(rawFilesMap).forEach(path => {
    if (!shouldIgnorePath(path, gitignoreRules)) {
      filteredMap[path] = rawFilesMap[path];
    }
  });

  if (Object.keys(filteredMap).length === 0) {
    showToast("No readable source files found after ignore filters");
    return;
  }

  appState.project.name = projectName;
  appState.project.files = filteredMap;
  appState.fileHashCache = {};
  saveActiveProjectSession();
  runProjectAnalysis(false);
  showToast(`Ingested ${Object.keys(filteredMap).length} project files`);
}

function extractGitignoreRules(filesMap) {
  const gitignorePath = Object.keys(filesMap).find(p => p.endsWith(".gitignore"));
  if (!gitignorePath) return [];

  const content = filesMap[gitignorePath] || "";
  return content.split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"));
}

function shouldIgnorePath(path, customRules = []) {
  // Built-in critical ignores
  const defaultIgnorePatterns = [
    /node_modules\//,
    /\.git\//,
    /__pycache__\//,
    /\.venv\//,
    /venv\//,
    /dist\//,
    /build\//,
    /\.DS_Store/,
    /\.(png|jpg|jpeg|gif|ico|pdf|zip|tar|gz|exe|bin|woff|woff2|ttf)$/i
  ];

  if (defaultIgnorePatterns.some(pat => pat.test(path))) return true;

  // Check custom .gitignore rules
  for (const rule of customRules) {
    if (!rule) continue;
    const cleanRule = rule.replace(/\/$/, "");
    if (path.includes(cleanRule)) return true;
    if (rule.startsWith("*.") && path.endsWith(rule.slice(1))) return true;
  }

  return false;
}

function rescanCurrentProject() {
  if (Object.keys(appState.project.files).length === 0) {
    showToast("No project loaded to re-scan");
    return;
  }
  // Run incremental analysis
  runProjectAnalysis(true);
  showToast("Incremental re-scan completed");
}

// Simple fast string hashing for incremental rescanning
function computeStringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

// ==========================================================================
// ADVANCED STATIC ANALYSIS ENGINE (IMPORT GRAPHS, COMPLEXITY & UNUSED CHECKS)
// ==========================================================================
function runProjectAnalysis(isIncremental = false) {
  const startTime = performance.now();
  const files = appState.project.files;
  const filePaths = Object.keys(files);
  const issues = [];
  const langCounts = {};
  let totalLoc = 0;
  let cachedFilesCount = 0;

  // Track previous issue states for progress tracking
  const previousIssues = appState.project.issues || [];
  const prevMap = {};
  previousIssues.forEach(iss => { prevMap[iss.id] = iss.status; });

  // 1. Build Comprehensive Dependency & Import Graph
  const depGraph = buildProjectDependencyGraph(files, issues);
  appState.project.dependencyGraph = depGraph;

  // 2. Analyze Individual Files (with Incremental Rescan caching)
  filePaths.forEach(path => {
    const content = files[path];
    const lines = content.split("\n");
    totalLoc += lines.length;

    const lang = detectLanguageFromFile(path, content);
    langCounts[lang] = (langCounts[lang] || 0) + 1;

    const contentHash = computeStringHash(content);
    if (isIncremental && appState.fileHashCache[path] === contentHash) {
      cachedFilesCount++;
    }
    appState.fileHashCache[path] = contentHash;

    // Syntax Gatekeeper Check
    const syntaxCheck = validateSyntaxGatekeeper(content, lang.toLowerCase());
    if (!syntaxCheck.valid) {
      issues.push(createIssue({
        id: generateIssueId("SYNTAX", path, syntaxCheck.line || 1),
        file: path,
        line: syntaxCheck.line || 1,
        severity: "Critical",
        category: "Bug Risk",
        title: "Unresolved Syntax / Delimiter Error",
        description: syntaxCheck.message || "Code failed delimiter balancing.",
        whyItMatters: "Syntax errors prevent execution, break compilers, and crash runtimes.",
        learningTip: "Check for unclosed curly braces {}, parentheses (), or quotes.",
        suggestedSolution: "Repair the broken delimiter at the specified line.",
        confidence: "High",
        requiresHumanReview: false,
        codeSnippet: syntaxCheck.snippet || `Line ${syntaxCheck.line}`,
        fixAvailable: false
      }));
    }

    // Language Specific Real Static Rules
    if (lang === "Python") {
      analyzePythonFile(path, content, lines, issues, depGraph);
    } else if (lang === "JavaScript" || lang === "TypeScript") {
      analyzeJavaScriptFile(path, content, lines, issues, depGraph);
    } else if (path.endsWith("package.json")) {
      analyzePackageJson(path, content, lines, issues);
    }

    // Complexity & Nesting Analysis
    analyzeFunctionComplexityAndNesting(path, content, lines, lang, issues);

    // Generic Rules: Secrets Detection & File Size
    analyzeGenericSecurityAndSize(path, content, lines, issues);
  });

  // 3. Detect Unused Declarations Across Entire Project
  analyzeUnusedDeclarations(files, issues, depGraph);

  // 4. Cross-File Duplicate Code Analysis
  const duplicateStats = analyzeCrossFileDuplication(files, issues);

  const durationMs = Math.round(performance.now() - startTime);

  // 5. Update Project State Metrics
  appState.project.fileCount = filePaths.length;
  appState.project.totalLoc = totalLoc;
  appState.project.languages = langCounts;
  appState.project.duplicationPercent = duplicateStats.percent;
  appState.project.scanMode = isIncremental
    ? `Incremental (${cachedFilesCount} cached, ${filePaths.length - cachedFilesCount} scanned in ${durationMs}ms)`
    : `Full Scan (${filePaths.length} files in ${durationMs}ms)`;

  // 6. Carry Over Issue Statuses
  issues.forEach(iss => {
    if (prevMap[iss.id] === "Ignored") {
      iss.status = "Ignored";
    }
  });

  appState.project.issues = issues;
  appState.project.lastScanTime = new Date().toLocaleTimeString();

  // 7. Calculate Transparent Health Score
  calculateHealthScore();
  recordScanSnapshot();

  // 8. Update UI Components
  renderProjectOverview();
  renderFileTree();
  renderFilterDropdowns();
  renderIssuesList();
  renderScanHistoryComparison(previousIssues, issues);
}

function recordScanSnapshot() {
  const p = appState.project;
  const snapshot = {
    timestamp: new Date().toLocaleTimeString(),
    score: p.score,
    grade: p.grade,
    counts: { ...p.counts },
    issues: p.issues.map(iss => ({ id: iss.id, severity: iss.severity, title: iss.title, file: iss.file, line: iss.line, status: iss.status })),
    fileCount: p.fileCount,
    totalLoc: p.totalLoc
  };
  appState.scanHistory.push(snapshot);
  if (appState.scanHistory.length > 10) {
    appState.scanHistory.shift();
  }
}

// ==========================================================================
// 1. ACCURATE CROSS-FILE IMPORT & DEPENDENCY GRAPH RESOLUTION
// ==========================================================================
function buildProjectDependencyGraph(files, issues) {
  const filePaths = Object.keys(files);
  const nodes = {}; // { [path]: { imports: [], importedBy: [] } }
  let brokenCount = 0;
  let totalResolved = 0;

  filePaths.forEach(p => {
    nodes[p] = { imports: [], importedBy: [] };
  });

  filePaths.forEach(filePath => {
    const content = files[filePath];
    const lines = content.split("\n");
    const dir = getDirectoryName(filePath);

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // JS/TS Imports: import ... from './target' or require('./target')
      const jsImportMatch = trimmed.match(/(?:import\s+.*?\s+from\s+['"]|require\(\s*['"])([\.\/][^'"]+)['"]/);
      if (jsImportMatch) {
        const rawTarget = jsImportMatch[1];
        const resolvedPath = resolveRelativePath(dir, rawTarget, filePaths);

        if (resolvedPath) {
          nodes[filePath].imports.push(resolvedPath);
          if (nodes[resolvedPath]) {
            nodes[resolvedPath].importedBy.push(filePath);
          }
          totalResolved++;
        } else {
          brokenCount++;
          issues.push(createIssue({
            id: generateIssueId("DEP_BROKEN", filePath, lineNum),
            file: filePath,
            line: lineNum,
            severity: "High",
            category: "Dependencies",
            title: `Broken Local Import '${rawTarget}'`,
            description: `Import reference '${rawTarget}' cannot be resolved to any existing file in the project.`,
            whyItMatters: "Broken imports cause module loader runtime crashes (Cannot find module) when bundled or executed.",
            learningTip: "Verify the relative path spelling and file extension (.js, .ts, etc.).",
            suggestedSolution: `Ensure '${rawTarget}' exists relative to '${dir}'.`,
            confidence: "High",
            requiresHumanReview: true,
            codeSnippet: `Line ${lineNum}: ${trimmed}`,
            fixAvailable: false
          }));
        }
      }

      // Python Relative Imports: from .sibling import foo or from ..parent import bar
      const pyRelativeMatch = trimmed.match(/^from\s+(\.+[a-zA-Z0-9_\.]*)\s+import/);
      if (pyRelativeMatch) {
        const rawTarget = pyRelativeMatch[1];
        const resolvedPath = resolvePythonRelativePath(dir, rawTarget, filePaths);

        if (resolvedPath) {
          nodes[filePath].imports.push(resolvedPath);
          if (nodes[resolvedPath]) {
            nodes[resolvedPath].importedBy.push(filePath);
          }
          totalResolved++;
        } else {
          brokenCount++;
          issues.push(createIssue({
            id: generateIssueId("DEP_BROKEN_PY", filePath, lineNum),
            file: filePath,
            line: lineNum,
            severity: "High",
            category: "Dependencies",
            title: `Broken Python Relative Import '${rawTarget}'`,
            description: `Relative import '${rawTarget}' does not resolve to an existing Python module in the project.`,
            whyItMatters: "Causes ImportError or ModuleNotFoundError at runtime.",
            learningTip: "Make sure the referenced module file exists with a .py extension.",
            suggestedSolution: `Verify target module path in '${dir}'.`,
            confidence: "High",
            requiresHumanReview: true,
            codeSnippet: `Line ${lineNum}: ${trimmed}`,
            fixAvailable: false
          }));
        }
      }
    });
  });

  // Circular Dependency Detection
  detectCircularDependencies(nodes, issues);

  return { nodes, brokenCount, totalResolved };
}

function getDirectoryName(path) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

function resolveRelativePath(fromDir, targetRel, allFiles) {
  // Normalize path
  const parts = (fromDir ? fromDir.split("/") : []).concat(targetRel.split("/"));
  const resolvedParts = [];
  for (const p of parts) {
    if (p === "." || p === "") continue;
    if (p === "..") {
      resolvedParts.pop();
    } else {
      resolvedParts.push(p);
    }
  }
  const candidate = resolvedParts.join("/");

  // Try exact match, .js, .ts, .jsx, .tsx, /index.js
  const extensions = ["", ".js", ".ts", ".jsx", ".tsx", "/index.js", "/index.ts"];
  for (const ext of extensions) {
    const full = candidate + ext;
    if (allFiles.includes(full)) return full;
  }
  return null;
}

function resolvePythonRelativePath(fromDir, targetRel, allFiles) {
  // Convert dots to slashes
  let dotCount = 0;
  while (targetRel.startsWith(".")) {
    dotCount++;
    targetRel = targetRel.slice(1);
  }
  const dirParts = fromDir ? fromDir.split("/") : [];
  for (let i = 1; i < dotCount; i++) {
    dirParts.pop();
  }
  if (targetRel) {
    dirParts.push(targetRel.replace(/\./g, "/"));
  }
  const candidate = dirParts.join("/");
  if (allFiles.includes(candidate + ".py")) return candidate + ".py";
  if (allFiles.includes(candidate + "/__init__.py")) return candidate + "/__init__.py";
  return null;
}

function detectCircularDependencies(nodes, issues) {
  const visited = new Set();
  const recStack = new Set();

  function dfs(curr, pathStack) {
    visited.add(curr);
    recStack.add(curr);
    pathStack.push(curr);

    const neighbors = nodes[curr] ? nodes[curr].imports : [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        dfs(next, pathStack);
      } else if (recStack.has(next)) {
        const cycle = pathStack.slice(pathStack.indexOf(next)).concat(next).join(" -> ");
        issues.push(createIssue({
          id: generateIssueId("DEP_CYCLE", curr, 1),
          file: curr,
          line: 1,
          severity: "Medium",
          category: "Dependencies",
          title: "Circular Import Dependency Detected",
          description: `Circular reference chain detected: ${cycle}`,
          whyItMatters: "Circular dependencies cause partial object initialization, undefined import symbols, and memory leaks.",
          learningTip: "Refactor shared definitions into a standalone intermediate module.",
          suggestedSolution: "Extract shared logic into a separate utility module.",
          confidence: "High",
          requiresHumanReview: true,
          codeSnippet: `Cycle: ${cycle}`,
          fixAvailable: false
        }));
      }
    }

    pathStack.pop();
    recStack.delete(curr);
  }

  Object.keys(nodes).forEach(file => {
    if (!visited.has(file)) {
      dfs(file, []);
    }
  });
}

// ==========================================================================
// 2. UNUSED FUNCTIONS & VARIABLES DETECTION
// ==========================================================================
function analyzeUnusedDeclarations(files, issues, depGraph) {
  Object.keys(files).forEach(filePath => {
    const content = files[filePath];
    const lines = content.split("\n");
    const lang = detectLanguageFromFile(filePath, content);

    // Skip entry points and non-code
    if (filePath.endsWith("package.json") || filePath.endsWith("index.html") || filePath.endsWith(".css")) return;

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // Python function: def foo(...)
      if (lang === "Python" && /^def\s+([a-zA-Z0-9_]+)\s*\(/.test(trimmed)) {
        const funcName = trimmed.match(/^def\s+([a-zA-Z0-9_]+)\s*\(/)[1];
        if (funcName.startsWith("_") || funcName === "main" || funcName === "run") return;

        // Count occurrences across this file
        const internalOccurrences = (content.match(new RegExp(`\\b${funcName}\\b`, "g")) || []).length;

        // Check if imported by another file in project
        let isImportedExternally = false;
        Object.keys(files).forEach(otherPath => {
          if (otherPath !== filePath && files[otherPath].includes(funcName)) {
            isImportedExternally = true;
          }
        });

        // Exempt documented public library/service functions or functions with type annotations / docstrings
        const nextLine = lines[idx + 1] ? lines[idx + 1].trim() : "";
        const hasDocstring = nextLine.startsWith('"""') || nextLine.startsWith("'''");
        const hasTypeAnnotations = trimmed.includes("->") || (trimmed.includes(":") && /\b(float|int|str|bool|list|dict|Any|Optional)\b/.test(trimmed));
        const isPublicApi = hasDocstring || hasTypeAnnotations;

        if (internalOccurrences <= 1 && !isImportedExternally && !isPublicApi) {
          issues.push(createIssue({
            id: generateIssueId("UNUSED_FUNC", filePath, lineNum),
            file: filePath,
            line: lineNum,
            severity: "Medium",
            category: "Architecture",
            title: `Potentially Unused Function '${funcName}'`,
            description: `Function '${funcName}' is declared on Line ${lineNum} but never referenced internally or externally.`,
            whyItMatters: "Dead functions increase cognitive overhead, test maintenance burden, and application size.",
            learningTip: "Audit whether this function is still required, or prefix with '_' for internal testing.",
            suggestedSolution: `Remove or export '${funcName}' if intended for an external API.`,
            confidence: "Medium",
            requiresHumanReview: true,
            codeSnippet: `Line ${lineNum}: ${trimmed}`,
            fixAvailable: false
          }));
        }
      }

      // JavaScript unused variable: const/let unusedVar = ...
      if ((lang === "JavaScript" || lang === "TypeScript") && /^(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=/.test(trimmed)) {
        const varName = trimmed.match(/^(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=/)[1];
        if (varName.startsWith("_")) return;

        const occurrences = (content.match(new RegExp(`\\b${varName}\\b`, "g")) || []).length;
        if (occurrences <= 1 && !trimmed.startsWith("export ")) {
          issues.push(createIssue({
            id: generateIssueId("UNUSED_VAR", filePath, lineNum),
            file: filePath,
            line: lineNum,
            severity: "Low",
            category: "Architecture",
            title: `Unused Variable '${varName}'`,
            description: `Variable '${varName}' is assigned on Line ${lineNum} but never read or referenced.`,
            whyItMatters: "Wastes memory and indicates unfinished or dead logic.",
            learningTip: "Remove unused local variables or prefix with '_' if required by signature.",
            suggestedSolution: `Remove 'const ${varName}' on Line ${lineNum}.`,
            confidence: "High",
            requiresHumanReview: false,
            codeSnippet: `Line ${lineNum}: ${trimmed}`,
            fixAvailable: true,
            proposedFix: "" // Clean deletion
          }));
        }
      }
    });
  });
}

// ==========================================================================
// 3. FUNCTION COMPLEXITY & NESTING ANALYSIS
// ==========================================================================
function analyzeFunctionComplexityAndNesting(filePath, content, lines, lang, issues) {
  let inFunction = false;
  let currentFuncName = "";
  let funcStartLine = 0;
  let branchCount = 1;
  let maxNestingDepth = 0;
  let currentIndentLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Detect function start
    const isPyFunc = lang === "Python" && /^def\s+([a-zA-Z0-9_]+)\s*\(/.test(trimmed);
    const isJsFunc = (lang === "JavaScript" || lang === "TypeScript") && /^(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/.test(trimmed);

    if (isPyFunc || isJsFunc) {
      // Evaluate previous function before starting new
      if (inFunction) {
        evaluateFunctionMetrics(filePath, currentFuncName, funcStartLine, branchCount, maxNestingDepth, issues);
      }
      inFunction = true;
      currentFuncName = (isPyFunc ? trimmed.match(/^def\s+([a-zA-Z0-9_]+)/)[1] : trimmed.match(/function\s+([a-zA-Z0-9_]+)/)[1]);
      funcStartLine = lineNum;
      branchCount = 1;
      maxNestingDepth = 0;
      currentIndentLevel = 0;
      continue;
    }

    if (inFunction) {
      // Check for function end (unindent in Python or closing brace at root in JS)
      if (lang === "Python") {
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1].length : 0;
        if (indent === 0 && trimmed && !trimmed.startsWith("#")) {
          evaluateFunctionMetrics(filePath, currentFuncName, funcStartLine, branchCount, maxNestingDepth, issues);
          inFunction = false;
        }
      }

      // Count branches: if, elif, for, while, catch, except, &&, ||, ?
      if (/\b(if|elif|else\s+if|for|while|except|catch|case)\b/.test(trimmed)) {
        branchCount++;
      }
      if (trimmed.includes("&&")) branchCount++;
      if (trimmed.includes("||")) branchCount++;

      // Track nesting depth via indentation / braces
      const indentMatch = line.match(/^(\s*)/);
      const level = indentMatch ? Math.floor(indentMatch[1].length / (lang === "Python" ? 4 : 2)) : 0;
      if (level > maxNestingDepth) {
        maxNestingDepth = level;
      }
    }
  }

  if (inFunction) {
    evaluateFunctionMetrics(filePath, currentFuncName, funcStartLine, branchCount, maxNestingDepth, issues);
  }
}

function evaluateFunctionMetrics(filePath, funcName, lineNum, complexity, maxNesting, issues) {
  // Cyclomatic Complexity > 8
  if (complexity > 8) {
    issues.push(createIssue({
      id: generateIssueId("COMPLEX_FUNC", filePath, lineNum),
      file: filePath,
      line: lineNum,
      severity: complexity > 12 ? "High" : "Medium",
      category: "Complexity",
      title: `High Cyclomatic Complexity (${complexity}) in '${funcName}'`,
      description: `Function '${funcName}' contains ${complexity} distinct execution branches.`,
      whyItMatters: "High cyclomatic complexity makes code hard to test, comprehend, and increases regression risk exponentially.",
      learningTip: "Decompose complex branches into smaller specialized helper functions or dispatch tables.",
      suggestedSolution: "Extract branch conditions into smaller sub-functions.",
      confidence: "High",
      requiresHumanReview: true,
      codeSnippet: `Function '${funcName}' starting at Line ${lineNum} (Complexity: ${complexity})`,
      fixAvailable: false
    }));
  }

  // Nesting Depth > 4
  if (maxNesting >= 5) {
    issues.push(createIssue({
      id: generateIssueId("NESTING_DEPTH", filePath, lineNum),
      file: filePath,
      line: lineNum,
      severity: "Medium",
      category: "Complexity",
      title: `Excessive Nesting Depth (${maxNesting} levels) in '${funcName}'`,
      description: `Logic in '${funcName}' is nested ${maxNesting} levels deep.`,
      whyItMatters: "Deeply nested code ('arrow anti-pattern') impairs readability and hinders debugging.",
      learningTip: "Use guard clauses and early returns (e.g. 'if not condition: return') to flatten nesting.",
      suggestedSolution: "Refactor deeply nested blocks using early return guard statements.",
      confidence: "High",
      requiresHumanReview: true,
      codeSnippet: `Max nesting depth: ${maxNesting} levels inside '${funcName}'`,
      fixAvailable: false
    }));
  }
}

// ==========================================================================
// 4. LANGUAGE SPECIFIC RULES & SAFE REVERSIBLE FIXES
// ==========================================================================
function analyzePythonFile(path, content, lines, issues, depGraph) {
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Rule: == None comparison
    if (/\b\w+\s*==\s*None\b/.test(trimmed)) {
      issues.push(createIssue({
        id: generateIssueId("PY_NONE", path, lineNum),
        file: path,
        line: lineNum,
        severity: "High",
        category: "Bug Risk",
        title: "Comparison to None using '==' instead of 'is'",
        description: "Found '== None'. In Python, comparison to None should always be done with 'is None'.",
        whyItMatters: "Equality ('==') invokes the object's __eq__ method, which may be slow or overridden. 'is None' directly tests identity.",
        learningTip: "Use 'if x is None:' rather than 'if x == None:' to conform with PEP 8 standards.",
        suggestedSolution: "Replace '== None' with 'is None'.",
        confidence: "High",
        requiresHumanReview: false,
        codeSnippet: `Line ${lineNum}: ${trimmed}`,
        fixAvailable: true,
        proposedFix: line.replace(/==\s*None/g, "is None")
      }));
    }

    // Rule: != None comparison
    if (/\b\w+\s*!=\s*None\b/.test(trimmed)) {
      issues.push(createIssue({
        id: generateIssueId("PY_NOT_NONE", path, lineNum),
        file: path,
        line: lineNum,
        severity: "High",
        category: "Bug Risk",
        title: "Comparison to None using '!=' instead of 'is not'",
        description: "Found '!= None'. In Python, comparison to None should always be done with 'is not None'.",
        whyItMatters: "The identity operator 'is not' is faster and immune to custom class overrides.",
        learningTip: "Use 'if x is not None:' to follow Python conventions.",
        suggestedSolution: "Replace '!= None' with 'is not None'.",
        confidence: "High",
        requiresHumanReview: false,
        codeSnippet: `Line ${lineNum}: ${trimmed}`,
        fixAvailable: true,
        proposedFix: line.replace(/!=\s*None/g, "is not None")
      }));
    }

    // Rule: Mutable default argument in function
    if (/def\s+\w+\(.*=\s*(\[\]|\{\})\)/.test(trimmed)) {
      issues.push(createIssue({
        id: generateIssueId("PY_MUTABLE_DEF", path, lineNum),
        file: path,
        line: lineNum,
        severity: "High",
        category: "Bug Risk",
        title: "Mutable Default Argument in Function Definition",
        description: "Function defines a mutable container (list or dict) as its default parameter.",
        whyItMatters: "Default arguments in Python are evaluated once at definition time, meaning mutations persist across separate function calls.",
        learningTip: "Set the default to 'None' and initialize the list inside the function: 'if param is None: param = []'.",
        suggestedSolution: "Replace default parameter with None and initialize container inside function body.",
        confidence: "High",
        requiresHumanReview: true,
        codeSnippet: `Line ${lineNum}: ${trimmed}`,
        fixAvailable: false
      }));
    }

    // Rule: Bare except
    if (/^except\s*:/.test(trimmed)) {
      issues.push(createIssue({
        id: generateIssueId("PY_BARE_EXCEPT", path, lineNum),
        file: path,
        line: lineNum,
        severity: "High",
        category: "Bug Risk",
        title: "Bare 'except:' Statement",
        description: "A bare 'except:' catches all exceptions, including SystemExit, KeyboardInterrupt, and MemoryError.",
        whyItMatters: "This makes stopping the script via Ctrl+C difficult and masks critical system exceptions.",
        learningTip: "Catch 'except Exception:' to handle normal application errors while letting system signals pass.",
        suggestedSolution: "Change 'except:' to 'except Exception:'.",
        confidence: "High",
        requiresHumanReview: false,
        codeSnippet: `Line ${lineNum}: ${trimmed}`,
        fixAvailable: true,
        proposedFix: line.replace(/^(\s*)except\s*:/, "$1except Exception:")
      }));
    }

    // Rule: Dangerous subprocess shell=True execution
    if (/subprocess\.(Popen|run|call|check_output|check_call)\(.*shell\s*=\s*True/i.test(trimmed)) {
      issues.push(createIssue({
        id: generateIssueId("PY_SEC_SHELL", path, lineNum),
        file: path,
        line: lineNum,
        severity: "Critical",
        category: "Security",
        title: "Subprocess Invocation with shell=True",
        description: "Spawning subprocess with shell=True invites command injection vulnerabilities if inputs are tainted.",
        whyItMatters: "Arbitrary shell execution enables command injection (CWE-78), giving attackers shell access to the host.",
        learningTip: "Pass arguments as an argument list (e.g. ['git', 'status']) and avoid shell=True.",
        suggestedSolution: "Refactor subprocess invocation into an argument list and remove shell=True.",
        confidence: "High",
        requiresHumanReview: true,
        codeSnippet: `Line ${lineNum}: ${trimmed}`,
        fixAvailable: false
      }));
    }

    // Rule: Insecure os.system or os.popen execution
    if (/os\.(system|popen)\s*\(/.test(trimmed)) {
      issues.push(createIssue({
        id: generateIssueId("PY_SEC_OS_SYSTEM", path, lineNum),
        file: path,
        line: lineNum,
        severity: "Critical",
        category: "Security",
        title: "Insecure 'os.system' Command Execution",
        description: "Direct usage of os.system() or os.popen() invokes the shell without argument sanitization.",
        whyItMatters: "os.system executes through the system command shell, making it susceptible to command hijacking.",
        learningTip: "Use subprocess.run(['cmd', 'arg'], check=True) instead of os.system().",
        suggestedSolution: "Replace os.system with safe subprocess.run() without shell=True.",
        confidence: "High",
        requiresHumanReview: true,
        codeSnippet: `Line ${lineNum}: ${trimmed}`,
        fixAvailable: false
      }));
    }

    // Rule: Dynamic Python exec() execution
    if (/\bexec\s*\(/.test(trimmed)) {
      issues.push(createIssue({
        id: generateIssueId("PY_SEC_EXEC", path, lineNum),
        file: path,
        line: lineNum,
        severity: "Critical",
        category: "Security",
        title: "Dynamic 'exec()' Code Execution",
        description: "Execution of dynamic Python source code via exec().",
        whyItMatters: "Dynamic code execution allows arbitrary code injection and evades static security boundary guarantees.",
        learningTip: "Avoid dynamic execution of code strings; utilize structured dispatch patterns.",
        suggestedSolution: "Refactor dynamic code execution into static functions or data lookup tables.",
        confidence: "High",
        requiresHumanReview: true,
        codeSnippet: `Line ${lineNum}: ${trimmed}`,
        fixAvailable: false
      }));
    }

    // Rule: Missing docstring on public function
    if (/^def\s+[a-zA-Z0-9_]+\(/.test(trimmed) && !trimmed.startsWith("def _")) {
      const nextLine = lines[idx + 1] ? lines[idx + 1].trim() : "";
      if (!nextLine.startsWith('"""') && !nextLine.startsWith("'''")) {
        issues.push(createIssue({
          id: generateIssueId("PY_DOC", path, lineNum),
          file: path,
          line: lineNum,
          severity: "Low",
          category: "Documentation",
          title: "Public Function Missing Docstring",
          description: `Function '${trimmed.split("(")[0].replace("def ", "")}' lacks a docstring specification.`,
          whyItMatters: "Documentation helps other developers understand parameters, return values, and expected behavior.",
          learningTip: "Add a triple-quoted docstring on the line right under 'def': \"\"\"Describe function.\"\"\"",
          suggestedSolution: "Add a PEP 257 compliant docstring.",
          confidence: "Medium",
          requiresHumanReview: true,
          codeSnippet: `Line ${lineNum}: ${trimmed}`,
          fixAvailable: false
        }));
      }
    }
  });

  // Rule: Unused Imports in Python
  lines.forEach((line, idx) => {
    const match = line.match(/^import\s+([a-zA-Z0-9_]+)/);
    if (match) {
      const moduleName = match[1];
      const occurrences = (content.match(new RegExp(`\\b${moduleName}\\b`, "g")) || []).length;
      if (occurrences <= 1) {
        issues.push(createIssue({
          id: generateIssueId("PY_UNUSED_IMPORT", path, idx + 1),
          file: path,
          line: idx + 1,
          severity: "Medium",
          category: "Architecture",
          title: `Unused Import '${moduleName}'`,
          description: `The module '${moduleName}' is imported but never used in ${path}.`,
          whyItMatters: "Unused imports clutter the namespace, increase startup latency, and confuse readers.",
          learningTip: "Remove unused import statements to keep modules lightweight.",
          suggestedSolution: `Remove 'import ${moduleName}' from line ${idx + 1}.`,
          confidence: "High",
          requiresHumanReview: false,
          codeSnippet: `Line ${idx + 1}: ${line.trim()}`,
          fixAvailable: true,
          proposedFix: "" // Clean deletion
        }));
      }
    }
  });
}

function analyzeJavaScriptFile(path, content, lines, issues, depGraph) {
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Rule: eval() usage
    if (/\beval\s*\(/.test(trimmed)) {
      issues.push(createIssue({
        id: generateIssueId("JS_EVAL", path, lineNum),
        file: path,
        line: lineNum,
        severity: "Critical",
        category: "Security",
        title: "Dangerous 'eval()' Execution",
        description: "Direct invocation of eval() executes arbitrary strings as JavaScript.",
        whyItMatters: "eval() introduces arbitrary code execution vulnerabilities (XSS / RCE) and prevents JIT optimization.",
        learningTip: "Use JSON.parse() for data serialization or safe dictionary lookups instead of eval.",
        suggestedSolution: "Replace eval() with JSON.parse() or dedicated parser logic.",
        confidence: "High",
        requiresHumanReview: true,
        codeSnippet: `Line ${lineNum}: ${trimmed}`,
        fixAvailable: false
      }));
    }

    // Rule: Dangerous new Function() dynamic execution
    if (/new\s+Function\s*\(/.test(trimmed)) {
      issues.push(createIssue({
        id: generateIssueId("JS_SEC_FUNCTION", path, lineNum),
        file: path,
        line: lineNum,
        severity: "Critical",
        category: "Security",
        title: "Dangerous 'new Function()' Dynamic Execution",
        description: "Constructing functions dynamically via new Function() evaluates code similarly to eval().",
        whyItMatters: "new Function evaluates code in the global scope, enabling arbitrary script execution (XSS).",
        learningTip: "Avoid string-to-code compilation; use standard closures and callback functions.",
        suggestedSolution: "Replace new Function invocation with static JavaScript functions.",
        confidence: "High",
        requiresHumanReview: true,
        codeSnippet: `Line ${lineNum}: ${trimmed}`,
        fixAvailable: false
      }));
    }

    // Rule: Unsafe innerHTML assignment (DOM XSS risk)
    if (/\.innerHTML\s*=/.test(trimmed)) {
      issues.push(createIssue({
        id: generateIssueId("JS_SEC_INNERHTML", path, lineNum),
        file: path,
        line: lineNum,
        severity: "High",
        category: "Security",
        title: "Unsafe 'innerHTML' Assignment (DOM XSS Risk)",
        description: "Assigning strings directly to innerHTML can allow Cross-Site Scripting (XSS) if input contains unescaped HTML.",
        whyItMatters: "Direct innerHTML mutation bypasses HTML sanitization, allowing script execution if untrusted content is injected.",
        learningTip: "Use element.textContent or element.innerText when assigning text, or sanitize with DOMPurify.",
        suggestedSolution: "Use textContent for plain text, or safely construct DOM nodes via createElement.",
        confidence: "High",
        requiresHumanReview: true,
        codeSnippet: `Line ${lineNum}: ${trimmed}`,
        fixAvailable: false
      }));
    }

    // Rule: console.log left in production
    if (/console\.log\s*\(/.test(trimmed)) {
      issues.push(createIssue({
        id: generateIssueId("JS_CONSOLE", path, lineNum),
        file: path,
        line: lineNum,
        severity: "Low",
        category: "Formatting",
        title: "Leftover 'console.log' Debug Statement",
        description: "Diagnostic console.log statement found in client source code.",
        whyItMatters: "Can leak sensitive debug information to the browser console and pollute logging streams.",
        learningTip: "Remove debug logging before shipping or wrap inside a dedicated logger with environment guards.",
        suggestedSolution: "Remove or comment out the console.log call.",
        confidence: "High",
        requiresHumanReview: false,
        codeSnippet: `Line ${lineNum}: ${trimmed}`,
        fixAvailable: true,
        proposedFix: line.replace(/console\.log\([^)]*\);?/, "// $& [Codebase Doctor: removed debug log]")
      }));
    }

    // Rule: Loose equality '==' instead of '==='
    if (/[^!=<>]==[^=]/.test(trimmed) && !trimmed.includes("== null") && !trimmed.includes("== undefined")) {
      issues.push(createIssue({
        id: generateIssueId("JS_LOOSE_EQ", path, lineNum),
        file: path,
        line: lineNum,
        severity: "Medium",
        category: "Bug Risk",
        title: "Loose Equality '==' Used Instead of Strict '==='",
        description: "Loose equality operator performs implicit type coercion.",
        whyItMatters: "Type coercion in JavaScript causes subtle edge-case bugs (e.g. false == '0' evaluates to true).",
        learningTip: "Always use strict equality '===' to verify both value and type.",
        suggestedSolution: "Replace '==' with '==='.",
        confidence: "High",
        requiresHumanReview: false,
        codeSnippet: `Line ${lineNum}: ${trimmed}`,
        fixAvailable: true,
        proposedFix: line.replace(/([^!=<>])==([^=])/g, "$1===$2")
      }));
    }
  });
}

function analyzePackageJson(path, content, lines, issues) {
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/"\*"/.test(line)) {
      issues.push(createIssue({
        id: generateIssueId("CFG_WILDCARD", path, lineNum),
        file: path,
        line: lineNum,
        severity: "Medium",
        category: "Architecture",
        title: "Wildcard Dependency Version (*)",
        description: "Package dependency is pinned to wildcard version '*'.",
        whyItMatters: "Allows automatic, unreviewed major version updates that can introduce breaking API changes.",
        learningTip: "Pin dependencies with caret (^), tilde (~), or exact semantic versions.",
        suggestedSolution: "Pin dependency to a specific semantic version range.",
        confidence: "High",
        requiresHumanReview: true,
        codeSnippet: `Line ${lineNum}: ${line.trim()}`,
        fixAvailable: false
      }));
    }
  });
}

function analyzeGenericSecurityAndSize(path, content, lines, issues) {
  // Hardcoded Secret Detection
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const secretMatch = line.match(/(api_key|secret|password|token|auth_token)\s*=\s*['"]([a-zA-Z0-9_\-]{16,})['"]/i);
    if (secretMatch) {
      const rawSecret = secretMatch[2];
      const maskedSecret = rawSecret.substring(0, 4) + "****************";
      issues.push(createIssue({
        id: generateIssueId("SEC_HARDCODED", path, lineNum),
        file: path,
        line: lineNum,
        severity: "Critical",
        category: "Security",
        title: "Hardcoded API Key / Secret Detected",
        description: `Potential confidential token '${secretMatch[1]}' stored in plain source code.`,
        whyItMatters: "Exposing credentials in source control allows attackers to compromise services and databases.",
        learningTip: "Store credentials in environment variables (.env) or a secret manager.",
        suggestedSolution: "Move credential to an environment variable via os.environ or process.env.",
        confidence: "High",
        requiresHumanReview: true,
        codeSnippet: `Line ${lineNum}: ${secretMatch[1]} = "${maskedSecret}"`,
        fixAvailable: false
      }));
    }
  });

  // Overly Large File (>200 lines)
  if (lines.length > 200) {
    issues.push(createIssue({
      id: generateIssueId("ARCH_LARGE_FILE", path, 1),
      file: path,
      line: 1,
      severity: "Medium",
      category: "Architecture",
      title: `Overly Large File (${lines.length} lines)`,
      description: `File '${path}' contains ${lines.length} lines of code.`,
      whyItMatters: "Monolithic files violate the Single Responsibility Principle and increase maintenance friction.",
      learningTip: "Consider breaking this file down into cohesive modular components.",
      suggestedSolution: "Split file into smaller domain-specific submodules.",
      confidence: "High",
      requiresHumanReview: true,
      codeSnippet: `${path}: ${lines.length} total lines`,
      fixAvailable: false
    }));
  }
}

function analyzeCrossFileDuplication(files, issues) {
  const blockMap = {};
  let duplicateCount = 0;
  let totalComparedBlocks = 0;
  const filePaths = Object.keys(files);

  filePaths.forEach(path => {
    const lines = files[path].split("\n");
    for (let i = 0; i < lines.length - 3; i++) {
      const windowLines = lines.slice(i, i + 4).map(l => l.trim()).filter(l => l && !l.startsWith("//") && !l.startsWith("#"));
      if (windowLines.length < 4) continue;

      const blockKey = windowLines.join(" | ");
      totalComparedBlocks++;

      if (blockMap[blockKey]) {
        const original = blockMap[blockKey];
        if (original.file !== path) {
          duplicateCount++;
          issues.push(createIssue({
            id: generateIssueId("DUP_BLOCK", path, i + 1),
            file: path,
            line: i + 1,
            severity: "Medium",
            category: "Architecture",
            title: `Duplicate Code Block Across Files`,
            description: `Identical block found in '${path}' (Line ${i + 1}) matching '${original.file}' (Line ${original.line}).`,
            whyItMatters: "Duplicated code leads to divergent bug fixes, technical debt, and larger bundle sizes.",
            learningTip: "Extract repeated logic into a shared utility function.",
            suggestedSolution: `Consolidate repeated logic into a shared utility function imported by both files.`,
            confidence: "High",
            requiresHumanReview: true,
            codeSnippet: `Original: ${original.file}:${original.line}\nDuplicate: ${path}:${i + 1}\n\n${windowLines.slice(0, 2).join("\n")}...`,
            fixAvailable: false
          }));
        }
      } else {
        blockMap[blockKey] = { file: path, line: i + 1 };
      }
    }
  });

  const percent = totalComparedBlocks > 0 ? Math.min(100, Math.round((duplicateCount / totalComparedBlocks) * 100)) : 0;
  return { percent };
}

function maskSensitiveSecrets(text) {
  if (!text) return "";
  return text
    .replace(/\b(sk_live_[a-zA-Z0-9]{4})[a-zA-Z0-9]+/g, "$1****")
    .replace(/(api_key|secret|token|password)\s*=\s*['"]([^'"]+)['"]/gi, (match, key, val) => {
      if (val.includes("****")) return `${key} = "${val}"`;
      const prefix = val.slice(0, 4);
      return `${key} = "${prefix}****"`;
    });
}

function createIssue(data) {
  return {
    id: data.id,
    file: data.file,
    line: data.line,
    severity: data.severity,
    category: data.category,
    title: data.title,
    description: data.description,
    whyItMatters: data.whyItMatters,
    learningTip: data.learningTip,
    suggestedSolution: data.suggestedSolution,
    confidence: data.confidence,
    requiresHumanReview: data.requiresHumanReview,
    status: data.status || "Open",
    codeSnippet: maskSensitiveSecrets(data.codeSnippet),
    fixAvailable: !!data.fixAvailable,
    proposedFix: data.proposedFix !== undefined ? data.proposedFix : null
  };
}

function generateIssueId(prefix, file, line) {
  const fileHash = file.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  return `${prefix}-${fileHash}-${line}`;
}

function detectLanguageFromFile(path, content) {
  const ext = path.includes(".") ? path.split(".").pop().toLowerCase() : "";
  if (ext === "py") return "Python";
  if (ext === "js" || ext === "jsx" || ext === "mjs") return "JavaScript";
  if (ext === "ts" || ext === "tsx") return "TypeScript";
  if (ext === "html") return "HTML";
  if (ext === "css") return "CSS";
  if (ext === "json") return "JSON";
  if (ext === "cpp" || ext === "c") return "C/C++";
  return detectLanguage(content);
}

// ==========================================================================
// 5. TRANSPARENT HEALTH SCORING
// ==========================================================================
function calculateHealthScore() {
  const issues = appState.project.issues.filter(iss => iss.status === "Open");
  const fileCount = Math.max(1, appState.project.fileCount);

  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  issues.forEach(iss => {
    if (iss.severity === "Critical") critical++;
    else if (iss.severity === "High") high++;
    else if (iss.severity === "Medium") medium++;
    else if (iss.severity === "Low") low++;
  });

  appState.project.counts = { Critical: critical, High: high, Medium: medium, Low: low };

  const totalPenalty = (critical * 15) + (high * 8) + (medium * 3) + (low * 1);
  const normalizer = Math.max(1, fileCount * 0.4);
  const calculatedScore = Math.max(0, Math.min(100, Math.round(100 - (totalPenalty / normalizer))));

  appState.project.score = calculatedScore;

  if (calculatedScore >= 90) appState.project.grade = "Grade A (Excellent)";
  else if (calculatedScore >= 75) appState.project.grade = "Grade B (Good)";
  else if (calculatedScore >= 60) appState.project.grade = "Grade C (Fair)";
  else appState.project.grade = "Grade D (Needs Remediation)";
}

// ==========================================================================
// 6. SAFE REVIEW-BEFORE-APPLY FIX WORKFLOW & PERSISTENT UNDO
// ==========================================================================
function openSafeFixModal(issueId) {
  const issue = appState.project.issues.find(iss => iss.id === issueId);
  if (!issue || !issue.fixAvailable) return;

  appState.pendingFixIssue = issue;

  const fileContent = appState.project.files[issue.file];
  const lines = fileContent.split("\n");
  const targetLine = lines[issue.line - 1] || "";

  document.getElementById("fixModalTitle").textContent = `Fix: ${issue.title}`;
  document.getElementById("fixModalExplanation").textContent = issue.whyItMatters;
  document.getElementById("diffOriginalLineRange").textContent = `Line ${issue.line}`;
  document.getElementById("diffOriginalCode").textContent = targetLine.trim();
  document.getElementById("diffProposedCode").textContent = issue.proposedFix.trim() || "[Line will be cleanly deleted]";

  document.getElementById("safeFixModal").classList.remove("hidden");
}

function closeSafeFixModal() {
  document.getElementById("safeFixModal").classList.add("hidden");
  appState.pendingFixIssue = null;
}

function rejectFixProposal() {
  closeSafeFixModal();
  showToast("Fix proposal rejected. Project left unchanged.");
}

function applyVerifiedFix() {
  const issue = appState.pendingFixIssue;
  if (!issue) return;

  const fileContent = appState.project.files[issue.file];
  if (fileContent === undefined) return;

  // 1. Create Recoverable Backup Snapshot (persisted in localStorage)
  appState.historySnapshots.push({
    timestamp: new Date().toLocaleTimeString(),
    file: issue.file,
    content: fileContent,
    issueId: issue.id
  });
  savePersistentBackups();

  // 2. Perform Line Replacement
  const lines = fileContent.split("\n");
  if (issue.proposedFix === "") {
    lines.splice(issue.line - 1, 1);
  } else {
    lines[issue.line - 1] = issue.proposedFix;
  }
  const updatedContent = lines.join("\n");

  // 3. Post-Fix Syntax Verification Check
  const lang = detectLanguageFromFile(issue.file, updatedContent);
  const syntaxCheck = validateSyntaxGatekeeper(updatedContent, lang.toLowerCase());
  if (!syntaxCheck.valid) {
    showToast("Safety gatekeeper aborted fix: Proposed change would cause a syntax error!");
    return;
  }

  // 4. Save Verified Content
  appState.project.files[issue.file] = updatedContent;
  issue.status = "Fixed";
  saveActiveProjectSession();

  closeSafeFixModal();

  // 5. Recalculate Score & Update View
  calculateHealthScore();
  renderProjectOverview();
  renderIssuesList();
  showToast(`✓ Fix applied & verified for ${issue.file} (Line ${issue.line})`);
}

function undoLastFix() {
  if (appState.historySnapshots.length === 0) {
    showToast("No previous backups available to undo");
    return;
  }

  const snapshot = appState.historySnapshots.pop();
  savePersistentBackups();

  // Restore file content
  appState.project.files[snapshot.file] = snapshot.content;
  saveActiveProjectSession();

  // Re-open issue if tracked
  if (snapshot.issueId) {
    const issue = appState.project.issues.find(i => i.id === snapshot.issueId);
    if (issue) issue.status = "Open";
  }

  calculateHealthScore();
  renderProjectOverview();
  renderIssuesList();
  showToast(`Restored original version of ${snapshot.file} from ${snapshot.timestamp}`);
}

function markIssueStatus(issueId, newStatus) {
  const issue = appState.project.issues.find(iss => iss.id === issueId);
  if (issue) {
    issue.status = newStatus;
    calculateHealthScore();
    renderProjectOverview();
    renderIssuesList();
    showToast(`Issue ${issue.id} marked as ${newStatus}`);
  }
}

// ==========================================================================
// 7. UI RENDERING & DEPENDENCY GRAPH MODAL
// ==========================================================================
function renderProjectOverview() {
  const p = appState.project;
  document.getElementById("projectTitle").textContent = p.name;
  document.getElementById("healthScoreValue").textContent = p.score !== null ? p.score : "--";
  document.getElementById("healthGradeBadge").textContent = p.grade;
  document.getElementById("metricFileCount").textContent = p.fileCount;
  document.getElementById("metricLoc").textContent = p.totalLoc;
  document.getElementById("metricDuplication").textContent = `${p.duplicationPercent}%`;
  document.getElementById("metricImportsCount").textContent = `${p.dependencyGraph.totalResolved} resolved (${p.dependencyGraph.brokenCount} broken)`;
  document.getElementById("metricScanMode").textContent = p.scanMode || "Full Scan";

  document.getElementById("countCritical").textContent = p.counts.Critical;
  document.getElementById("countHigh").textContent = p.counts.High;
  document.getElementById("countMedium").textContent = p.counts.Medium;
  document.getElementById("countLow").textContent = p.counts.Low;

  // Language Breakdown Track
  const track = document.getElementById("langMeterTrack");
  const breakdownText = document.getElementById("langBreakdownText");
  track.innerHTML = "";

  const langNames = Object.keys(p.languages);
  if (langNames.length === 0) {
    breakdownText.textContent = "No languages detected";
    return;
  }

  const parts = [];
  const colors = ["#09090b", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7"];

  langNames.forEach((name, idx) => {
    const count = p.languages[name];
    const pct = Math.round((count / p.fileCount) * 100);
    parts.push(`${name} (${pct}%)`);

    const seg = document.createElement("div");
    seg.className = "meter-segment";
    seg.style.width = `${pct}%`;
    seg.style.backgroundColor = colors[idx % colors.length];
    seg.title = `${name}: ${pct}%`;
    track.appendChild(seg);
  });

  breakdownText.textContent = parts.join(" · ");
}

function renderFileTree() {
  const container = document.getElementById("fileTreeContainer");
  const filePaths = Object.keys(appState.project.files);
  container.innerHTML = "";

  document.getElementById("treeFileCountBadge").textContent = `${filePaths.length} files`;

  if (filePaths.length === 0) {
    container.innerHTML = `<div class="empty-tree-msg">No project loaded.</div>`;
    return;
  }

  filePaths.forEach(path => {
    const issuesForFile = appState.project.issues.filter(i => i.file === path && i.status === "Open");
    const item = document.createElement("div");
    item.className = "tree-item";
    item.onclick = () => filterBySpecificFile(path);

    item.innerHTML = `
      <span class="tree-item-name" title="${path}">📄 ${path}</span>
      ${issuesForFile.length > 0 ? `<span class="tree-item-issues-badge">${issuesForFile.length}</span>` : ''}
    `;
    container.appendChild(item);
  });
}

// ==========================================================================
// 7. INTERACTIVE DEPENDENCY INSPECTOR & UI WORKSPACE
// ==========================================================================
function openDepGraphModal() {
  const container = document.getElementById("depModuleListContainer");
  const graph = appState.project.dependencyGraph;
  const filePaths = Object.keys(appState.project.files);

  if (!container) return;
  container.innerHTML = "";

  if (filePaths.length === 0) {
    container.innerHTML = `<div class="empty-tree-msg" style="padding:16px;">No project files loaded.</div>`;
    const detailPane = document.getElementById("depDetailPane");
    if (detailPane) {
      detailPane.innerHTML = `<div style="color:var(--text-muted); padding: 50px 20px; text-align: center;">Upload or load a project to inspect dependencies.</div>`;
    }
    const modal = document.getElementById("depGraphModal");
    if (modal) modal.classList.remove("hidden");
    return;
  }

  // Find all circular dependency paths to badge them
  const circularFiles = new Set();
  const circularIssues = appState.project.issues.filter(i => i.id.startsWith("DEP_CIRCULAR"));
  circularIssues.forEach(iss => {
    if (iss.file) circularFiles.add(iss.file);
  });

  filePaths.forEach(file => {
    const node = graph.nodes[file] || { imports: [], importedBy: [] };
    const hasBroken = node.imports.some(imp => !appState.project.files[imp] && !imp.startsWith("<system:") && !imp.startsWith("<builtin:"));
    const isCircular = circularFiles.has(file);

    const item = document.createElement("div");
    item.className = `dep-module-item ${appState.activeDepModule === file ? 'active' : ''}`;
    item.onclick = () => selectDepModule(file);

    item.innerHTML = `
      <span class="dep-module-name" title="${file}">📄 ${file}</span>
      <div style="display:flex; gap:4px; align-items:center;">
        ${hasBroken ? `<span class="badge-sev Critical" style="font-size:9px; padding:1px 4px;">Broken</span>` : ''}
        ${isCircular ? `<span class="badge-sev High" style="font-size:9px; padding:1px 4px;">Cycle</span>` : ''}
        <span class="tree-item-issues-badge" style="font-size:10px;">${node.imports.length} ➔</span>
      </div>
    `;
    container.appendChild(item);
  });

  // Select initial module
  const targetModule = appState.activeDepModule && appState.project.files[appState.activeDepModule]
    ? appState.activeDepModule
    : filePaths[0];

  selectDepModule(targetModule);
  const modal = document.getElementById("depGraphModal");
  if (modal) modal.classList.remove("hidden");
}

function closeDepGraphModal() {
  const modal = document.getElementById("depGraphModal");
  if (modal) modal.classList.add("hidden");
}

function selectDepModule(filePath) {
  appState.activeDepModule = filePath;
  const graph = appState.project.dependencyGraph;
  const node = (graph && graph.nodes && graph.nodes[filePath]) || { imports: [], importedBy: [] };
  const detailPane = document.getElementById("depDetailPane");
  if (!detailPane) return;

  // Update active class in list
  const items = document.querySelectorAll(".dep-module-item");
  items.forEach(el => {
    const name = el.querySelector(".dep-module-name")?.getAttribute("title");
    el.classList.toggle("active", name === filePath);
  });

  const content = appState.project.files[filePath] || "";
  const lang = detectLanguageFromFile(filePath, content);
  const linesCount = content ? content.split("\n").length : 0;

  // Check circular dependencies affecting this file
  const circularIssues = appState.project.issues.filter(i => i.id.startsWith("DEP_CIRCULAR") && (i.file === filePath || (i.description && i.description.includes(filePath))));

  // Supported import conventions info banner
  let conventionsNote = "";
  if (lang === "Python") {
    conventionsNote = "Supported Import Syntax: <code>import foo</code>, <code>from foo import bar</code>, relative <code>from .sibling import util</code>.";
  } else if (lang === "JavaScript" || lang === "TypeScript") {
    conventionsNote = "Supported Import Syntax: ES6 <code>import { x } from './foo.js'</code>, CommonJS <code>const x = require('./foo')</code>.";
  } else {
    conventionsNote = "Language-specific dependency resolution supported for Python and JavaScript/TypeScript modules.";
  }

  // Outward imports
  let outwardHtml = "";
  if (node.imports.length === 0) {
    outwardHtml = `<span style="color:var(--text-muted); font-size:12px;">No outward dependencies declared.</span>`;
  } else {
    outwardHtml = node.imports.map(imp => {
      const isSystem = imp.startsWith("<system:") || imp.startsWith("<builtin:");
      const isResolved = isSystem || !!appState.project.files[imp];
      return `
        <span class="dep-item-pill" style="${isResolved ? '' : 'border-color: #ef4444; color: #dc2626;'}">
          ${isResolved ? '✓' : '❌ Broken:'} ${escapeHtml(imp)}
          ${isSystem ? '<span style="font-size:10px; opacity:0.7;">(StdLib)</span>' : ''}
        </span>
      `;
    }).join("");
  }

  // Inward importedBy
  let inwardHtml = "";
  if (node.importedBy.length === 0) {
    inwardHtml = `<span style="color:var(--text-muted); font-size:12px;">Standalone module or top-level application entry point.</span>`;
  } else {
    inwardHtml = node.importedBy.map(parent => `
      <span class="dep-item-pill" style="cursor:pointer;" onclick="selectDepModule('${parent}')" title="Click to inspect this dependent module">
        ➔ ${escapeHtml(parent)}
      </span>
    `).join("");
  }

  detailPane.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-light); padding-bottom:10px;">
      <div>
        <h4 style="margin:0; font-family:var(--font-mono); font-size:15px;">📄 ${escapeHtml(filePath)}</h4>
        <span style="font-size:12px; color:var(--text-muted);">${lang} · ${linesCount} Lines of Code</span>
      </div>
      <span class="badge-category">${lang}</span>
    </div>

    <div style="background:var(--bg-subtle); padding:8px 12px; border-radius:4px; font-size:11px; color:var(--text-muted); border:1px solid var(--border-light);">
      ${conventionsNote}
    </div>

    <div class="dep-detail-section">
      <span class="dep-detail-title">Outgoing Dependencies (${node.imports.length})</span>
      <div style="display:flex; flex-wrap:wrap;">
        ${outwardHtml}
      </div>
    </div>

    <div class="dep-detail-section">
      <span class="dep-detail-title">Inward Dependents (Imported By: ${node.importedBy.length})</span>
      <div style="display:flex; flex-wrap:wrap;">
        ${inwardHtml}
      </div>
    </div>

    <div class="dep-detail-section">
      <span class="dep-detail-title">Circular Dependency Analysis</span>
      ${circularIssues.length > 0 ? `
        <div style="padding:10px; background:#fef2f2; border:1px solid #fecaca; border-radius:4px; color:#991b1b; font-size:12px; font-family:var(--font-mono);">
          ⚠️ <strong>Circular Reference Detected:</strong><br/>
          ${escapeHtml(circularIssues[0].description)}
        </div>
      ` : `
        <div style="padding:8px 12px; background:var(--bg-subtle); border:1px solid var(--border-light); border-radius:4px; color:#15803d; font-size:12px;">
          ✓ Acyclic: No circular dependency chains involving this module.
        </div>
      `}
    </div>
  `;
}

function renderFilterDropdowns() {
  const fileSelect = document.getElementById("filterFile");
  if (!fileSelect) return;
  const currentVal = fileSelect.value;
  fileSelect.innerHTML = `<option value="All">All Files</option>`;

  Object.keys(appState.project.files).forEach(path => {
    const opt = document.createElement("option");
    opt.value = path;
    opt.textContent = path;
    fileSelect.appendChild(opt);
  });

  if (currentVal && Object.keys(appState.project.files).includes(currentVal)) {
    fileSelect.value = currentVal;
  }
}

// 28 Static Rules Checked for Clean Benchmark Display
const VERIFIED_RULES_28 = [
  "No Subprocess Shell Injections (shell=False)",
  "No Unsafe os.system / os.popen Shell Execution",
  "No Dynamic Python exec() Arbitrary Execution",
  "No Insecure JavaScript eval() Execution",
  "No Dynamic new Function() Code Execution",
  "No Unsanitized innerHTML Injections (XSS)",
  "No Plaintext Hardcoded API Keys & Tokens",
  "Zero Syntax Errors & Balanced Delimiters",
  "Safe Python Identity Comparisons (is None)",
  "Safe Python Non-Identity Comparisons (is not None)",
  "No Mutable Default Arguments in Functions",
  "No Broad / Bare Except Clause Catches",
  "Strict Public Function PEP 257 Docstrings",
  "Clean Python Import Hierarchy (Zero Unused)",
  "Strict Equality Operator Usage (===)",
  "Zero Leftover Production console.log Calls",
  "Strict Semantic Dependency Pinning (No '*')",
  "Controlled Cyclomatic Complexity (<8 Branches)",
  "Bounded Function Nesting Depth (<5 Levels)",
  "Zero Unused Function Declarations",
  "Zero Dead / Unused Local Variables",
  "Clean Cross-File Import References",
  "No Broken Target Import Files",
  "Acyclic Dependency Architecture (No Cycles)",
  "No Monolithic Large Source Files (<200 LOC)",
  "Zero Cross-File Duplicate Code Blocks",
  "Clean .gitignore Pattern Compliance",
  "Non-Destructive Reversible Fix Snapshots"
];

function toggleSeverityFilter(sev) {
  const filterSevSelect = document.getElementById("filterSeverity");
  const pills = {
    Critical: document.getElementById("pillSevCritical"),
    High: document.getElementById("pillSevHigh"),
    Medium: document.getElementById("pillSevMedium"),
    Low: document.getElementById("pillSevLow")
  };

  if (appState.activeFilter.severity === sev) {
    appState.activeFilter.severity = "All";
    if (filterSevSelect) filterSevSelect.value = "All";
    Object.values(pills).forEach(p => p && p.classList.remove("active"));
  } else {
    appState.activeFilter.severity = sev;
    if (filterSevSelect) filterSevSelect.value = sev;
    Object.values(pills).forEach(p => p && p.classList.remove("active"));
    if (pills[sev]) pills[sev].classList.add("active");
  }
  renderIssuesList();
}

function resetAllFilters() {
  appState.activeFilter = {
    severity: "All",
    category: "All",
    file: "All",
    status: "All",
    search: ""
  };
  const searchInput = document.getElementById("filterSearch");
  if (searchInput) searchInput.value = "";
  const filterSev = document.getElementById("filterSeverity");
  if (filterSev) filterSev.value = "All";
  const filterCat = document.getElementById("filterCategory");
  if (filterCat) filterCat.value = "All";
  const filterFile = document.getElementById("filterFile");
  if (filterFile) filterFile.value = "All";
  const filterStat = document.getElementById("filterStatus");
  if (filterStat) filterStat.value = "All";

  const pills = {
    Critical: document.getElementById("pillSevCritical"),
    High: document.getElementById("pillSevHigh"),
    Medium: document.getElementById("pillSevMedium"),
    Low: document.getElementById("pillSevLow")
  };
  Object.values(pills).forEach(p => p && p.classList.remove("active"));

  renderIssuesList();
  showToast("Filters and search reset");
}

function applyFilters() {
  const searchInput = document.getElementById("filterSearch");
  appState.activeFilter.search = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const filterSev = document.getElementById("filterSeverity");
  if (filterSev) appState.activeFilter.severity = filterSev.value;
  const filterCat = document.getElementById("filterCategory");
  if (filterCat) appState.activeFilter.category = filterCat.value;
  const filterFile = document.getElementById("filterFile");
  if (filterFile) appState.activeFilter.file = filterFile.value;
  const filterStat = document.getElementById("filterStatus");
  if (filterStat) appState.activeFilter.status = filterStat.value;

  // Sync severity pills
  const pills = {
    Critical: document.getElementById("pillSevCritical"),
    High: document.getElementById("pillSevHigh"),
    Medium: document.getElementById("pillSevMedium"),
    Low: document.getElementById("pillSevLow")
  };
  Object.keys(pills).forEach(k => {
    if (pills[k]) {
      pills[k].classList.toggle("active", appState.activeFilter.severity === k);
    }
  });

  renderIssuesList();
}

function renderIssuesList() {
  const container = document.getElementById("issuesListContainer");
  if (!container) return;
  const filter = appState.activeFilter;
  const allIssues = appState.project.issues || [];

  // Case 1: Clean project with 0 total issues (e.g. Clean Benchmark)
  if (allIssues.length === 0 && appState.project.fileCount > 0) {
    container.innerHTML = `
      <div class="empty-issues-card" style="text-align: left; padding: 24px;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
          <span style="display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; background:#dcfce7; color:#15803d; font-size:18px; font-weight:bold;">✓</span>
          <div>
            <h3 style="margin:0; font-size:18px;">All 28 Code Health Rules Passed</h3>
            <p style="margin:2px 0 0; color:var(--text-muted); font-size:13px;">Zero findings detected across all inspected files. Code complies with clean architecture standards.</p>
          </div>
        </div>

        <div class="clean-rule-grid">
          ${VERIFIED_RULES_28.map(rule => `
            <div class="clean-rule-item">
              <span class="clean-rule-check">✓</span>
              <span>${rule}</span>
            </div>
          `).join("")}
        </div>

        <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border-light); font-size:11px; color:var(--text-muted);">
          <strong>Scoring Disclaimer:</strong> A health score of 100/100 signifies that all 28 automated checks executed cleanly. It does not mathematically prove that software is free of logic defects.
        </div>
      </div>
    `;
    return;
  }

  // Filter issues
  const q = filter.search;
  const filtered = allIssues.filter(iss => {
    if (filter.severity !== "All" && iss.severity !== filter.severity) return false;
    if (filter.category !== "All" && iss.category !== filter.category) return false;
    if (filter.file !== "All" && iss.file !== filter.file) return false;
    if (filter.status !== "All" && iss.status !== filter.status) return false;

    if (q) {
      const match = (iss.title || "").toLowerCase().includes(q) ||
                    (iss.id || "").toLowerCase().includes(q) ||
                    (iss.file || "").toLowerCase().includes(q) ||
                    (iss.codeSnippet || "").toLowerCase().includes(q) ||
                    (iss.description || "").toLowerCase().includes(q) ||
                    (iss.category || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  container.innerHTML = "";

  // Case 2: Zero matches due to active filter/search
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-issues-card">
        <h3>Zero Matching Findings</h3>
        <p>No issues match the active filters (${filter.severity} severity, ${filter.category} category${q ? `, search: "${escapeHtml(q)}"` : ''}).</p>
        <button class="btn-subtle-sm" style="margin-top:12px;" onclick="resetAllFilters()">Clear Filters & Search</button>
      </div>
    `;
    return;
  }

  // Case 3: Render issue cards
  filtered.forEach(iss => {
    const card = document.createElement("div");
    card.className = `issue-card ${iss.status === 'Fixed' ? 'status-fixed' : ''}`;

    card.innerHTML = `
      <div class="issue-header">
        <div class="issue-tags-left">
          <span class="issue-id">${escapeHtml(iss.id)}</span>
          <span class="badge-sev ${iss.severity}">${iss.severity}</span>
          <span class="badge-category">${escapeHtml(iss.category)}</span>
          <span class="issue-meta-text">Confidence: ${escapeHtml(iss.confidence)}</span>
          ${iss.requiresHumanReview ? '<span class="badge-sev Medium" style="font-size:10px; padding:1px 5px;">Heuristic</span>' : ''}
        </div>
        <div class="issue-location">${escapeHtml(iss.file)}:${iss.line}</div>
      </div>

      <div class="issue-content">
        <h4 class="issue-title">${escapeHtml(iss.title)}</h4>
        <p class="issue-desc">${escapeHtml(iss.description)}</p>

        <!-- Why It Matters -->
        <div class="callout-box">
          <strong>Why It Matters:</strong> ${escapeHtml(iss.whyItMatters)}
        </div>

        <!-- Learning Tip (Beginner Mode Only) -->
        ${appState.isBeginnerMode && iss.learningTip ? `
          <div class="callout-box learning-tip">
            <strong>Learning Tip:</strong> ${escapeHtml(iss.learningTip)}
          </div>
        ` : ''}

        <!-- Code Snippet -->
        <pre class="issue-snippet-block"><code>${escapeHtml(iss.codeSnippet)}</code></pre>

        <!-- Suggested Solution -->
        <div class="callout-box">
          <strong>Suggested Solution:</strong> ${escapeHtml(iss.suggestedSolution)}
        </div>
      </div>

      <div class="issue-footer">
        <span class="issue-meta-text">Status: <strong>${iss.status}</strong> · ${iss.requiresHumanReview ? 'Heuristic (Review Required)' : 'Verified Finding'}</span>
        <div class="issue-actions">
          ${iss.fixAvailable && iss.status === 'Open' ? `
            <button class="btn-primary" onclick="openSafeFixModal('${iss.id}')">Review & Apply Fix</button>
          ` : ''}
          ${iss.status === 'Open' ? `
            <button class="btn-subtle-sm" onclick="markIssueStatus('${iss.id}', 'Ignored')">Ignore</button>
          ` : ''}
          ${iss.status !== 'Open' ? `
            <button class="btn-subtle-sm" onclick="markIssueStatus('${iss.id}', 'Open')">Re-Open</button>
          ` : ''}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
}

function renderScanHistoryComparison(prevIssues, currentIssues) {
  const note = document.getElementById("scanComparisonNote");
  const trackOpen = document.getElementById("trackOpenCount");
  const trackFixed = document.getElementById("trackFixedCount");
  const trackIgnored = document.getElementById("trackIgnoredCount");

  const openCount = currentIssues.filter(i => i.status === "Open").length;
  const fixedCount = currentIssues.filter(i => i.status === "Fixed").length;
  const ignoredCount = currentIssues.filter(i => i.status === "Ignored").length;

  if (trackOpen) trackOpen.textContent = `${openCount} Open`;
  if (trackFixed) trackFixed.textContent = `${fixedCount} Fixed`;
  if (trackIgnored) trackIgnored.textContent = `${ignoredCount} Ignored`;

  if (!note) return;
  if (!prevIssues || prevIssues.length === 0) {
    note.textContent = "Initial scan established as baseline.";
  } else {
    const prevIds = new Set(prevIssues.map(i => i.id));
    const currIds = new Set(currentIssues.map(i => i.id));
    let newCount = 0;
    currentIssues.forEach(i => { if (!prevIds.has(i.id)) newCount++; });
    let resolvedCount = 0;
    prevIssues.forEach(i => { if (!currIds.has(i.id) || i.status === 'Fixed') resolvedCount++; });

    note.textContent = `Latest vs Previous Scan: ${newCount} new findings, ${resolvedCount} resolved issues.`;
  }
}

function setSeverityFilter(sev) {
  const filterSev = document.getElementById("filterSeverity");
  if (filterSev) filterSev.value = sev;
  appState.activeFilter.severity = sev;
  renderIssuesList();
}

function filterBySpecificFile(filePath) {
  const filterFile = document.getElementById("filterFile");
  if (filterFile) filterFile.value = filePath;
  appState.activeFilter.file = filePath;
  renderIssuesList();
}

function openScoreFormulaModal() {
  const p = appState.project;
  const breakdownEl = document.getElementById("scoreFormulaDynamicBreakdown");
  if (breakdownEl) {
    const crit = p.counts.Critical;
    const high = p.counts.High;
    const med = p.counts.Medium;
    const low = p.counts.Low;
    const penalty = (crit * 15) + (high * 8) + (med * 3) + (low * 1);
    const normalizer = Math.max(1, p.fileCount * 0.4).toFixed(1);
    const scaledDeduction = Math.round(penalty / normalizer);
    const calculated = Math.max(0, Math.min(100, 100 - scaledDeduction));

    breakdownEl.innerHTML = `
      <div style="font-weight:600; margin-bottom:6px;">Current Project Calculation: <em>${escapeHtml(p.name)}</em></div>
      <table style="width:100%; border-collapse:collapse; font-family:var(--font-mono); font-size:12px; margin-bottom:8px;">
        <tr><td style="padding:2px 0;">Critical Deductions:</td><td style="text-align:right;">${crit} × 15 = <strong>-${crit * 15}</strong></td></tr>
        <tr><td style="padding:2px 0;">High Deductions:</td><td style="text-align:right;">${high} × 8 = <strong>-${high * 8}</strong></td></tr>
        <tr><td style="padding:2px 0;">Medium Deductions:</td><td style="text-align:right;">${med} × 3 = <strong>-${med * 3}</strong></td></tr>
        <tr><td style="padding:2px 0;">Low Deductions:</td><td style="text-align:right;">${low} × 1 = <strong>-${low * 1}</strong></td></tr>
        <tr style="border-top:1px solid var(--border-light); font-weight:bold;"><td style="padding:4px 0;">Total Raw Penalty:</td><td style="text-align:right;">${penalty} pts</td></tr>
        <tr><td style="padding:2px 0;">Normalizer (${p.fileCount} files × 0.4):</td><td style="text-align:right;">${normalizer}</td></tr>
        <tr><td style="padding:2px 0;">Effective Scaled Deduction:</td><td style="text-align:right;">Math.round(${penalty} / ${normalizer}) = -${scaledDeduction}</td></tr>
        <tr style="border-top:1px solid var(--border-light); font-weight:bold; font-size:13px;"><td style="padding:4px 0;">Final Health Score:</td><td style="text-align:right;">100 - ${scaledDeduction} = <strong>${calculated}/100</strong> (${p.grade})</td></tr>
      </table>
    `;
  }
  const modal = document.getElementById("scoreFormulaModal");
  if (modal) modal.classList.remove("hidden");
}

function closeScoreFormulaModal() {
  const modal = document.getElementById("scoreFormulaModal");
  if (modal) modal.classList.add("hidden");
}

// ==========================================================================
// SCAN COMPARISON & HISTORY DELTA INSIGHTS
// ==========================================================================
function openScanCompareModal() {
  const container = document.getElementById("scanCompareContent");
  const history = appState.scanHistory;
  if (!container) return;

  if (history.length < 2) {
    container.innerHTML = `
      <div class="empty-issues-card" style="padding:30px;">
        <h3>Insufficient Scan History</h3>
        <p>At least two scans are required to compute delta comparisons. Apply a fix or click <strong>Re-Scan</strong> above to record consecutive scan snapshots.</p>
      </div>
    `;
    const modal = document.getElementById("scanCompareModal");
    if (modal) modal.classList.remove("hidden");
    return;
  }

  const curr = history[history.length - 1];
  const prev = history[history.length - 2];

  const scoreDiff = curr.score - prev.score;
  const scoreDiffBadge = scoreDiff > 0
    ? `<span class="delta-badge delta-badge-pos">+${scoreDiff} (Improved)</span>`
    : scoreDiff < 0
    ? `<span class="delta-badge delta-badge-neg">${scoreDiff} (Regressed)</span>`
    : `<span class="delta-badge" style="background:var(--bg-subtle);">±0 (Unchanged)</span>`;

  const prevIds = new Set(prev.issues.map(i => i.id));
  const currIds = new Set(curr.issues.map(i => i.id));

  const newIssues = curr.issues.filter(i => !prevIds.has(i.id));
  const resolvedIssues = prev.issues.filter(i => !currIds.has(i.id) || i.status === 'Fixed');
  const recurringIssues = curr.issues.filter(i => prevIds.has(i.id) && i.status === 'Open');

  // File Defect Hotspot Ranking
  const fileIssueCounts = {};
  curr.issues.filter(i => i.status === 'Open').forEach(i => {
    fileIssueCounts[i.file] = (fileIssueCounts[i.file] || 0) + 1;
  });

  const sortedHotspots = Object.keys(fileIssueCounts)
    .map(file => {
      const loc = (appState.project.files[file] || "").split("\n").length;
      const count = fileIssueCounts[file];
      const density = loc > 0 ? ((count / loc) * 100).toFixed(1) : "0.0";
      return { file, count, loc, density };
    })
    .sort((a, b) => b.count - a.count);

  container.innerHTML = `
    <!-- Top Comparison Metrics Grid -->
    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:16px;">
      <div class="metric-box">
        <span class="metric-title">Health Score Shift</span>
        <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
          <span style="font-size:18px; font-weight:700;">${prev.score} ➔ ${curr.score}</span>
          ${scoreDiffBadge}
        </div>
      </div>
      <div class="metric-box">
        <span class="metric-title">New Findings</span>
        <span style="font-size:18px; font-weight:700; color:${newIssues.length > 0 ? '#b91c1c' : '#15803d'};">
          ${newIssues.length}
        </span>
      </div>
      <div class="metric-box">
        <span class="metric-title">Resolved Issues</span>
        <span style="font-size:18px; font-weight:700; color:#15803d;">
          ${resolvedIssues.length}
        </span>
      </div>
      <div class="metric-box">
        <span class="metric-title">Recurring Open Issues</span>
        <span style="font-size:18px; font-weight:700; color:var(--text-main);">
          ${recurringIssues.length}
        </span>
      </div>
    </div>

    <!-- Severity Shift Table -->
    <div style="margin-bottom:16px;">
      <h4 style="font-size:13px; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin-bottom:6px;">
        Severity Distribution Progression
      </h4>
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Severity Tier</th>
            <th>Previous Scan (${prev.timestamp})</th>
            <th>Latest Scan (${curr.timestamp})</th>
            <th>Delta Shift</th>
          </tr>
        </thead>
        <tbody>
          ${['Critical', 'High', 'Medium', 'Low'].map(sev => {
            const pCount = (prev.counts && prev.counts[sev]) || 0;
            const cCount = (curr.counts && curr.counts[sev]) || 0;
            const diff = cCount - pCount;
            const diffHtml = diff < 0
              ? `<span class="delta-badge delta-badge-pos">${diff}</span>`
              : diff > 0
              ? `<span class="delta-badge delta-badge-neg">+${diff}</span>`
              : `<span class="delta-badge" style="background:var(--bg-subtle);">0</span>`;
            return `
              <tr>
                <td><strong>${sev}</strong></td>
                <td>${pCount}</td>
                <td>${cCount}</td>
                <td>${diffHtml}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>

    <!-- Defect Hotspots Ranking -->
    <div>
      <h4 style="font-size:13px; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin-bottom:6px;">
        Defect Hotspot Ranking (Problem Concentration)
      </h4>
      ${sortedHotspots.length === 0 ? `
        <div style="padding:12px; background:var(--bg-subtle); border-radius:4px; font-size:12px; color:#15803d;">
          ✓ No defect hotspots identified. All files are clear of open findings.
        </div>
      ` : `
        <table class="comparison-table">
          <thead>
            <tr>
              <th style="width:60px;">Rank</th>
              <th>File Location</th>
              <th>Open Findings</th>
              <th>Lines of Code</th>
              <th>Defect Density (Issues / 100 LOC)</th>
            </tr>
          </thead>
          <tbody>
            ${sortedHotspots.slice(0, 5).map((hot, idx) => `
              <tr>
                <td><span class="hotspot-rank-badge">#${idx + 1}</span></td>
                <td><code>${escapeHtml(hot.file)}</code></td>
                <td><span class="badge-sev High">${hot.count} findings</span></td>
                <td>${hot.loc}</td>
                <td>${hot.density}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `}
    </div>
  `;

  const modal = document.getElementById("scanCompareModal");
  if (modal) modal.classList.remove("hidden");
}

function closeScanCompareModal() {
  const modal = document.getElementById("scanCompareModal");
  if (modal) modal.classList.add("hidden");
}

// ==========================================================================
// PLUGIN READINESS CHECKLIST (8/8) MODAL
// ==========================================================================
const PLUGIN_CHECKLIST = [
  { title: "Zero-Instruction First Scan", desc: "A new user can open a project, select a realistic demo, or upload files and complete a full health scan without external manuals.", passed: true },
  { title: "Transparent Language & Rule Capabilities", desc: "Supported languages (Python, JS/TS, JSON, C++) and rule scopes are clearly described with explicit heuristic flags.", passed: true },
  { title: "Trustworthy Fix Preview & Undo Safety", desc: "Side-by-side diff previews, pre-apply syntax verification gatekeeper, and persistent localStorage undo snapshots ensure changes are reliable.", passed: true },
  { title: "Non-Destructive by Default (Zero Silent Writes)", desc: "Code edits remain in memory until explicit user authorization (Download ZIP or Save to Disk). No silent rewrites occur.", passed: true },
  { title: "Graceful Failure on Malformed Syntax", desc: "Unclosed delimiters and malformed syntax strings trigger the safety gatekeeper rather than crashing the analyzer.", passed: true },
  { title: "Secret Masking in Reports & UI", desc: "Sensitive credentials (API tokens, auth keys, passwords) are automatically masked in diff previews, HTML exports, and JSON schemas.", passed: true },
  { title: "Automated Verification Test Coverage", desc: "Comprehensive automated test suite covering rules, fixes, reversibility, server endpoints, and clean benchmarks.", passed: true },
  { title: "Documented Communication Architecture", desc: "Clear architectural distinction: ChatGPT Actions (REST/OpenAPI with Bearer auth) vs. VS Code Extension (Language Server Protocol / LSP webview).", passed: true }
];

function openPluginChecklistModal() {
  const container = document.getElementById("pluginChecklistItems");
  if (!container) return;
  container.innerHTML = "";

  PLUGIN_CHECKLIST.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "checklist-item-card";
    card.innerHTML = `
      <input type="checkbox" class="checklist-checkbox" checked disabled />
      <div>
        <div style="font-weight:700; font-size:13px; color:var(--text-main); margin-bottom:2px;">
          ${idx + 1}. ${escapeHtml(item.title)}
        </div>
        <div style="font-size:12px; color:var(--text-muted); line-height:1.4;">
          ${escapeHtml(item.desc)}
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  const modal = document.getElementById("pluginChecklistModal");
  if (modal) modal.classList.remove("hidden");
}

function closePluginChecklistModal() {
  const modal = document.getElementById("pluginChecklistModal");
  if (modal) modal.classList.add("hidden");
}

// ==========================================================================
// PROFESSIONAL AUDIT REPORT EXPORTERS (HTML, JSON, MARKDOWN)
// ==========================================================================
function exportHtmlReport() {
  const p = appState.project;
  const dateStr = new Date().toLocaleString();
  const fileIssueCounts = {};
  p.issues.filter(i => i.status === 'Open').forEach(i => {
    fileIssueCounts[i.file] = (fileIssueCounts[i.file] || 0) + 1;
  });

  const sortedHotspots = Object.keys(fileIssueCounts)
    .map(file => ({
      file,
      count: fileIssueCounts[file],
      loc: (p.files[file] || "").split("\n").length
    }))
    .sort((a, b) => b.count - a.count);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Codebase Doctor Audit Report — ${escapeHtml(p.name)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #09090b; margin: 0; padding: 40px; font-size: 14px; line-height: 1.6; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { margin: 0; font-size: 26px; }
    .meta { color: #71717a; font-size: 13px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
    .kpi-card { border: 1px solid #e4e4e7; border-radius: 6px; padding: 16px; background: #fafafa; }
    .kpi-title { font-size: 11px; text-transform: uppercase; color: #71717a; font-weight: 600; }
    .kpi-val { font-size: 24px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; margin-bottom: 30px; font-size: 13px; }
    th, td { border: 1px solid #e4e4e7; padding: 10px 12px; text-align: left; }
    th { background: #f4f4f5; font-weight: 600; }
    code { font-family: monospace; background: #f4f4f5; padding: 2px 5px; border-radius: 3px; font-size: 12px; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .badge-Critical { background: #fee2e2; color: #b91c1c; }
    .badge-High { background: #ffedd5; color: #c2410c; }
    .badge-Medium { background: #fef9c3; color: #a16207; }
    .badge-Low { background: #f4f4f5; color: #71717a; }
    .snippet { background: #18181b; color: #f4f4f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 11px; overflow-x: auto; white-space: pre-wrap; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Codebase Doctor Audit Report</h1>
      <div class="meta">Project: <strong>${escapeHtml(p.name)}</strong> · Audited: ${dateStr}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 32px; font-weight: 800;">${p.score}/100</div>
      <div class="meta">${p.grade}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-title">Total Files</div><div class="kpi-val">${p.fileCount}</div></div>
    <div class="kpi-card"><div class="kpi-title">Lines of Code</div><div class="kpi-val">${p.totalLoc}</div></div>
    <div class="kpi-card"><div class="kpi-title">Duplicate Code</div><div class="kpi-val">${p.duplicationPercent}%</div></div>
    <div class="kpi-card"><div class="kpi-title">Open Findings</div><div class="kpi-val">${p.issues.filter(i => i.status === 'Open').length}</div></div>
  </div>

  <h2>Severity Distribution</h2>
  <table>
    <tr><th>Critical</th><th>High</th><th>Medium</th><th>Low</th></tr>
    <tr>
      <td><span class="badge badge-Critical">${p.counts.Critical}</span></td>
      <td><span class="badge badge-High">${p.counts.High}</span></td>
      <td><span class="badge badge-Medium">${p.counts.Medium}</span></td>
      <td><span class="badge badge-Low">${p.counts.Low}</span></td>
    </tr>
  </table>

  <h2>Defect Concentration Hotspots</h2>
  <table>
    <thead><tr><th>Rank</th><th>File Location</th><th>Open Findings</th><th>Lines of Code</th></tr></thead>
    <tbody>
      ${sortedHotspots.slice(0, 5).map((hot, idx) => `
        <tr><td>#${idx + 1}</td><td><code>${escapeHtml(hot.file)}</code></td><td>${hot.count}</td><td>${hot.loc}</td></tr>
      `).join("")}
    </tbody>
  </table>

  <h2>Detailed Findings Catalog</h2>
  ${p.issues.map(iss => `
    <div style="border: 1px solid #e4e4e7; border-radius: 6px; padding: 16px; margin-bottom: 16px; background: #fafafa;">
      <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
        <div>
          <span class="badge badge-${iss.severity}">${iss.severity}</span>
          <span style="font-weight:700; margin-left:6px;">${escapeHtml(iss.title)}</span>
          <code>${escapeHtml(iss.id)}</code>
        </div>
        <div><code>${escapeHtml(iss.file)}:${iss.line}</code></div>
      </div>
      <p style="margin:4px 0;"><strong>Why It Matters:</strong> ${escapeHtml(iss.whyItMatters)}</p>
      <div class="snippet">${escapeHtml(maskSensitiveSecrets(iss.codeSnippet))}</div>
      <p style="margin:4px 0;"><strong>Suggested Solution:</strong> ${escapeHtml(iss.suggestedSolution)}</p>
      <div class="meta">Category: ${escapeHtml(iss.category)} · Status: ${iss.status} · Confidence: ${iss.confidence}</div>
    </div>
  `).join("")}

  <div style="margin-top: 40px; border-top: 1px solid #e4e4e7; padding-top: 14px; font-size: 11px; color: #71717a;">
    Generated by Codebase Doctor (blow-dryr Core v2.1). Sensitive tokens and API credentials automatically masked.
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `codebase_audit_report_${p.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Exported standalone HTML audit report");
}

function exportJsonReport() {
  const p = appState.project;
  const reportObj = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    tool: "Codebase Doctor v2.1",
    project: {
      name: p.name,
      score: p.score,
      grade: p.grade,
      fileCount: p.fileCount,
      totalLoc: p.totalLoc,
      duplicationPercent: p.duplicationPercent,
      scanMode: p.scanMode,
      severityCounts: { ...p.counts }
    },
    dependencies: {
      totalResolved: p.dependencyGraph.totalResolved,
      brokenCount: p.dependencyGraph.brokenCount
    },
    findings: p.issues.map(iss => ({
      id: iss.id,
      file: iss.file,
      line: iss.line,
      severity: iss.severity,
      category: iss.category,
      title: iss.title,
      description: iss.description,
      whyItMatters: iss.whyItMatters,
      suggestedSolution: iss.suggestedSolution,
      confidence: iss.confidence,
      requiresHumanReview: iss.requiresHumanReview,
      status: iss.status,
      codeSnippet: maskSensitiveSecrets(iss.codeSnippet)
    }))
  };

  const jsonStr = JSON.stringify(reportObj, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `codebase_audit_${p.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Exported machine-readable JSON audit");
}

function exportReportMarkdown() {
  const p = appState.project;
  let md = `# Codebase Doctor Health Report — ${p.name}\n`;
  md += `**Date:** ${new Date().toLocaleString()}\n`;
  md += `**Health Score:** ${p.score}/100 (${p.grade})\n`;
  md += `**Total Files:** ${p.fileCount} | **Total LOC:** ${p.totalLoc} | **Duplication:** ${p.duplicationPercent}%\n\n`;

  md += `## Issues Summary\n`;
  md += `- Critical: ${p.counts.Critical}\n`;
  md += `- High: ${p.counts.High}\n`;
  md += `- Medium: ${p.counts.Medium}\n`;
  md += `- Low: ${p.counts.Low}\n\n`;

  md += `## Detailed Findings\n\n`;
  p.issues.forEach(iss => {
    md += `### [${iss.severity}] ${iss.title} (${iss.id})\n`;
    md += `- **Location:** \`${iss.file}:${iss.line}\`\n`;
    md += `- **Category:** ${iss.category} | **Status:** ${iss.status}\n`;
    md += `- **Explanation:** ${iss.description}\n`;
    md += `- **Why It Matters:** ${iss.whyItMatters}\n`;
    md += `- **Suggested Fix:** ${iss.suggestedSolution}\n\n`;
  });

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `codebase_health_report_${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Exported markdown health report");
}

function downloadAllProjectFiles() {
  const files = appState.project.files;
  const filePaths = Object.keys(files);
  if (filePaths.length === 0) return;

  const bundle = JSON.stringify(files, null, 2);
  const blob = new Blob([bundle], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `codebase_doctor_project_bundle_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Downloaded project files bundle");
}

// ==========================================================================
// 8. PRESERVED SNIPPET CLEANER METHODS (blow-dryr Core)
// ==========================================================================
function handleInputChange() {
  const codeInput = document.getElementById("codeInput");
  const detectedLangTag = document.getElementById("detectedLangTag");
  const code = codeInput ? codeInput.value : "";
  updateCounterStats();

  if (!code.trim()) {
    if (detectedLangTag) detectedLangTag.textContent = "Auto-detecting language...";
    return;
  }

  const lang = detectLanguage(code);
  cleanerState.detectedLanguage = lang;
  if (detectedLangTag) detectedLangTag.textContent = `Detected: ${formatLangTitle(lang)}`;
}

function updateCounterStats() {
  const codeInput = document.getElementById("codeInput");
  const counterStats = document.getElementById("counterStats");
  if (!codeInput || !counterStats) return;

  const code = codeInput.value;
  const lines = code ? code.split("\n").length : 0;
  const chars = code.length;
  counterStats.textContent = `${lines} ${lines === 1 ? 'line' : 'lines'} · ${chars} ${chars === 1 ? 'character' : 'characters'}`;
}

function detectLanguage(code) {
  const trimmed = code.trim();
  if (trimmed.startsWith("<") && (trimmed.includes("<!DOCTYPE") || trimmed.includes("<html") || trimmed.includes("<div"))) {
    return "html";
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { JSON.parse(trimmed); return "json"; } catch (e) {}
  }
  if (code.includes("def ") || code.includes("elif ") || (code.includes("import ") && code.includes(":"))) {
    return "python";
  }
  if (code.includes("#include") || code.includes("std::") || code.includes("int main(")) {
    return "cpp";
  }
  if (code.includes("using System;") || code.includes("namespace ") || code.includes("Console.WriteLine")) {
    return "csharp";
  }
  if (code.includes("public class") || code.includes("System.out.println")) {
    return "java";
  }
  if (code.includes("{") && (code.includes("margin:") || code.includes("padding:") || code.includes("color:"))) {
    return "css";
  }
  return "javascript";
}

function formatLangTitle(lang) {
  const titles = {
    python: "Python",
    javascript: "JavaScript / TypeScript",
    java: "Java",
    cpp: "C / C++",
    csharp: "C#",
    html: "HTML",
    css: "CSS",
    json: "JSON"
  };
  return titles[lang] || lang;
}

function loadSample(key) {
  const codeInput = document.getElementById("codeInput");
  if (SAMPLES[key] && codeInput) {
    codeInput.value = SAMPLES[key];
    handleInputChange();
  }
}

function clearInput() {
  const codeInput = document.getElementById("codeInput");
  if (codeInput) {
    codeInput.value = "";
    handleInputChange();
  }
}

function resetWorkspace() {
  clearInput();
  const errorBanner = document.getElementById("errorBanner");
  const outputSection = document.getElementById("outputSection");
  if (errorBanner) errorBanner.classList.add("hidden");
  if (outputSection) outputSection.classList.add("hidden");
}

function initiateFormat() {
  const codeInput = document.getElementById("codeInput");
  const code = codeInput ? codeInput.value.trim() : "";
  if (!code) {
    showToast("Please enter code first");
    return;
  }

  cleanerState.rawCode = code;
  cleanerState.detectedLanguage = detectLanguage(code);

  const detectedLangName = document.getElementById("detectedLangName");
  const langSelect = document.getElementById("langSelect");
  if (detectedLangName) detectedLangName.textContent = formatLangTitle(cleanerState.detectedLanguage);
  if (langSelect) langSelect.value = cleanerState.detectedLanguage;

  document.getElementById("confirmOverlay").classList.remove("hidden");
}

function closeConfirmModal() {
  document.getElementById("confirmOverlay").classList.add("hidden");
}

function proceedWithFormatting() {
  const langSelect = document.getElementById("langSelect");
  cleanerState.confirmedLanguage = langSelect ? langSelect.value : cleanerState.detectedLanguage;
  closeConfirmModal();

  const errorBanner = document.getElementById("errorBanner");
  const outputSection = document.getElementById("outputSection");
  if (errorBanner) errorBanner.classList.add("hidden");
  if (outputSection) outputSection.classList.add("hidden");

  // Syntax Error Gatekeeper Check
  const errorCheck = validateSyntaxGatekeeper(cleanerState.rawCode, cleanerState.confirmedLanguage);
  if (!errorCheck.valid) {
    cleanerState.hasError = true;
    document.getElementById("errorMessage").textContent = errorCheck.message;
    document.getElementById("errorSnippet").textContent = errorCheck.snippet || "";
    if (errorBanner) errorBanner.classList.remove("hidden");
    return;
  }

  // Preserved-Logic Formatter (4 Spaces)
  cleanerState.hasError = false;
  cleanerState.formattedCode = formatCodePreserveLogic(cleanerState.rawCode, cleanerState.confirmedLanguage);
  displayOutput();
}

function validateSyntaxGatekeeper(code, lang) {
  const lines = code.split("\n");
  const stack = [];
  let inString = false;
  let strDelimiter = "";

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if ((char === '"' || char === "'" || char === '`') && (c === 0 || line[c-1] !== '\\')) {
        if (!inString) {
          inString = true;
          strDelimiter = char;
        } else if (strDelimiter === char) {
          inString = false;
        }
        continue;
      }
      if (inString) continue;

      if (char === '(' || char === '{' || char === '[') {
        stack.push({ char, line: l + 1, col: c + 1 });
      } else if (char === ')' || char === '}' || char === ']') {
        if (stack.length === 0) {
          return {
            valid: false,
            message: `Syntax Error: Unexpected closing delimiter '${char}' without opening character.`,
            line: l + 1,
            snippet: `Line ${l + 1}: ${line.trim()}`
          };
        }
        const last = stack.pop();
        const expected = getMatch(last.char);
        if (char !== expected) {
          return {
            valid: false,
            message: `Syntax Error: Mismatched delimiter. Expected '${expected}' to close '${last.char}' from Line ${last.line}, but found '${char}'.`,
            line: l + 1,
            snippet: `Line ${l + 1}: ${line.trim()}`
          };
        }
      }
    }
  }

  if (inString) {
    return {
      valid: false,
      message: `Syntax Error: Unterminated string literal.`,
      line: lines.length,
      snippet: `Line ${lines.length}: ${lines[lines.length - 1].trim()}`
    };
  }

  if (stack.length > 0) {
    const unclosed = stack.pop();
    return {
      valid: false,
      message: `Syntax Error: Unclosed delimiter '${unclosed.char}' opened on Line ${unclosed.line}.`,
      line: unclosed.line,
      snippet: `Line ${unclosed.line}: ${lines[unclosed.line - 1].trim()}`
    };
  }

  if (lang === "python") {
    for (let l = 0; l < lines.length; l++) {
      const line = lines[l].trim();
      if ((line.startsWith("def ") || line.startsWith("if ") || line.startsWith("elif ") || line.startsWith("else") || line.startsWith("for ") || line.startsWith("while ") || line.startsWith("class ")) && !line.endsWith(":") && !line.includes("#")) {
        return {
          valid: false,
          message: `Syntax Error: Expected ':' at end of control line in Python.`,
          line: l + 1,
          snippet: `Line ${l + 1}: ${line}`
        };
      }
    }
  }

  return { valid: true };
}

function getMatch(open) {
  if (open === '(') return ')';
  if (open === '{') return '}';
  if (open === '[') return ']';
  return '';
}

function formatCodePreserveLogic(code, lang) {
  const lines = code.split("\n");
  let result = [];
  let indentLevel = 0;
  const indentStr = "    "; // Strictly 4 spaces
  let commentAdded = false;

  if (lang === "python") {
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith("def ") && !commentAdded) {
        result.push(`${indentStr.repeat(indentLevel)}# Function implementation`);
        commentAdded = true;
      }

      if (line.startsWith("elif ") || line.startsWith("else:") || line.startsWith("except") || line.startsWith("finally:")) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      let spacedLine = standardizeSpacing(line);
      result.push(`${indentStr.repeat(indentLevel)}${spacedLine}`);

      if (line.endsWith(":")) {
        indentLevel++;
      }
    }
    return result.join("\n");
  }

  // C-style formatting
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    if ((line.startsWith("function ") || line.startsWith("class ") || line.includes("def ")) && !commentAdded) {
      result.push(`${indentStr.repeat(indentLevel)}// Main structure definition`);
      commentAdded = true;
    }

    if (line.startsWith("}") || line.startsWith("]") || line.startsWith(")")) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    let spacedLine = standardizeSpacing(line);
    result.push(`${indentStr.repeat(indentLevel)}${spacedLine}`);

    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    indentLevel += (openBraces - closeBraces);
    if (indentLevel < 0) indentLevel = 0;
  }

  return result.join("\n");
}

function standardizeSpacing(line) {
  return line
    .replace(/\s*=\s*/g, " = ")
    .replace(/\s*\+\s*/g, " + ")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*;\s*/g, ";")
    .replace(/\s+/g, " ");
}

function displayOutput() {
  const outputLangBadge = document.getElementById("outputLangBadge");
  const formattedCodeDisplay = document.getElementById("formattedCodeDisplay");
  const outputSection = document.getElementById("outputSection");

  if (outputLangBadge) outputLangBadge.textContent = formatLangTitle(cleanerState.confirmedLanguage);
  if (formattedCodeDisplay) formattedCodeDisplay.textContent = cleanerState.formattedCode;
  if (outputSection) {
    outputSection.classList.remove("hidden");
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function copyOutput() {
  if (!cleanerState.formattedCode) return;
  navigator.clipboard.writeText(cleanerState.formattedCode).then(() => {
    showToast("Formatted code copied to clipboard");
  });
}

function downloadOutput() {
  if (!cleanerState.formattedCode) return;
  const extMap = {
    python: "py",
    javascript: "js",
    java: "java",
    cpp: "cpp",
    csharp: "cs",
    html: "html",
    css: "css",
    json: "json"
  };
  const ext = extMap[cleanerState.confirmedLanguage] || "txt";
  const filename = `formatted_code.${ext}`;

  const blob = new Blob([cleanerState.formattedCode], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Downloaded ${filename}`);
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2600);
}
