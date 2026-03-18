const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { Storage } = require('@google-cloud/storage');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });
const storage = new Storage();
const bucketName = 'cybersentry-app-apks';
const PORT = process.env.PORT || 3000;

// Serve static files (like the index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Enhanced HTML wrapper with course UI navigation
const renderLesson = (contentHtml, title, currentModuleNum) => {
    // Navigation Logic
    const nextBtn = currentModuleNum < 5
        ? `<a href="/course/module-${currentModuleNum + 1}" class="nav-btn glow-bg" data-i18n="nav_next">Next Module →</a>`
        : `<a href="/" class="nav-btn glow-bg" data-i18n="nav_finish">Finish Course 🎉</a>`;

    const prevBtn = currentModuleNum > 1
        ? `<a href="/course/module-${currentModuleNum - 1}" class="nav-btn" data-i18n="nav_prev">← Previous</a>`
        : `<a href="/" class="nav-btn" data-i18n="nav_dashboard">← Course Dashboard</a>`;

    const progressPercent = (currentModuleNum / 5) * 100;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Cyber Course</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0d1117;
            --surface-color: #161b22;
            --border-color: #30363d;
            --text-primary: #e6edf3;
            --text-secondary: #8b949e;
            --accent-cyan: #58a6ff;
            --accent-purple: #bc8cff;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            line-height: 1.7;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }
        
        .page-container {
            display: flex;
            min-height: 100vh;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .main-content {
            flex: 1;
            padding: 3rem 6%;
            width: 100%;
            max-width: 850px;
            margin: 0 auto;
        }
        
        .sidebar {
            width: 300px;
            background: var(--surface-color);
            border-left: 1px solid var(--border-color);
            padding: 3rem 2rem;
            position: sticky;
            top: 0;
            height: 100vh;
            box-sizing: border-box;
            overflow-y: auto;
        }

        @media (max-width: 900px) {
            .page-container { flex-direction: column; }
            .sidebar { width: 100%; height: auto; border-left: none; border-top: 1px solid var(--border-color); position: static; padding: 2rem 5%; }
            .main-content { padding: 2rem 5%; }
        }
        
        h1, h2, h3, h4 { 
            font-family: inherit; 
            color: var(--text-primary);
            margin-top: 2em;
            margin-bottom: 0.75em;
            font-weight: 600;
        }
        h1 { font-size: 2.25rem; margin-top: 0; font-weight: 700; color: #fff; border-bottom: none; }
        h2 { font-size: 1.5rem; color: #fff; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
        h3 { font-size: 1.25rem; }
        p { margin-bottom: 1.25em; font-size: 1.05rem; }
        ul, ol { margin-bottom: 1.25em; padding-left: 1.5rem; font-size: 1.05rem; }
        li { margin-bottom: 0.5em; }
        
        code { background: var(--surface-color); padding: 0.2em 0.4em; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, monospace; color: var(--accent-cyan); font-size: 0.9em; }
        pre { background: var(--surface-color); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color); overflow-x: auto; margin: 1.5rem 0; line-height: 1.5; }
        pre code { color: var(--text-primary); background: transparent; padding: 0; border: none; }
        a { color: var(--accent-cyan); text-decoration: none; }
        a:hover { text-decoration: underline; }
        blockquote { border-left: 4px solid var(--accent-cyan); margin: 1.5rem 0; color: var(--text-secondary); background: rgba(88, 166, 255, 0.05); padding: 1rem 1rem 1rem 1.25rem; border-radius: 0 8px 8px 0; }
        
        table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.95rem; }
        th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
        th { font-weight: 600; color: #fff; background: rgba(255,255,255,0.03); }

        /* Top Navigation */
        .top-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
        .back-link { color: var(--text-secondary); text-decoration: none; font-weight: 500; font-size: 0.95rem; }
        .back-link:hover { color: var(--text-primary); text-decoration: none; }
        .module-badge { color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
        
        /* Bottom Navigation */
        .bottom-nav { margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; padding-bottom: 2rem; }
        .nav-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.6rem 1.2rem; border-radius: 6px; border: 1px solid var(--border-color); color: var(--text-primary); font-weight: 500; text-decoration: none; transition: all 0.2s ease; background: var(--surface-color); font-size: 0.95rem; }
        .nav-btn:hover { background: #21262d; border-color: #8b949e; text-decoration: none; }
        .glow-bg { background: var(--text-primary); color: var(--bg-color); border: none; font-weight: 600; }
        .glow-bg:hover { background: #ffffff; color: var(--bg-color); border: none; }
        
        /* Sidebar Styling */
        .sidebar h3 { font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.5rem; margin-top: 0; border: none; padding: 0; }
        .sidebar-nav { display: flex; flex-direction: column; gap: 0.4rem; }
        .sidebar-link {
            padding: 0.6rem 1rem;
            border-radius: 6px;
            color: var(--text-secondary);
            text-decoration: none !important;
            transition: all 0.2s;
            font-size: 0.95rem;
            display: block;
        }
        /* Translator overrides */
        .goog-te-gadget { color: var(--text-secondary) !important; font-family: inherit !important; font-size: 0.85rem !important; }
        .goog-te-gadget .goog-te-combo { background: var(--surface-color); color: var(--text-primary); border: 1px solid var(--border-color); padding: 4px; border-radius: 4px; outline: none; margin-left: 8px; }
    </style>
</head>
<body>
    <div class="page-container">
        <div class="main-content">
            <div class="top-nav">
                <a href="/" class="back-link" data-i18n="nav_dashboard">← Course Dashboard</a>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <select id="lang-switcher" onchange="changeLang(this.value)" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); padding: 4px; border-radius: 4px; outline: none; font-family: inherit; font-size: 0.85rem;">
                        <option value="en">English</option>
                        <option value="hi">हिन्दी</option>
                        <option value="kn">ಕನ್ನಡ</option>
                    </select>
                    <div class="module-badge">Module ${currentModuleNum}</div>
                </div>
            </div>
            
            ${contentHtml}
            
            <div class="bottom-nav">
                ${prevBtn}
                ${nextBtn}
            </div>
        </div>
        
        <aside class="sidebar">
            <h3 data-i18n="sidebar_title">Course Modules</h3>
            <nav class="sidebar-nav">
                <a href="/course/module-1" class="sidebar-link ${currentModuleNum === 1 ? 'active' : ''}">01. Introduction to AI</a>
                <a href="/course/module-2" class="sidebar-link ${currentModuleNum === 2 ? 'active' : ''}">02. The Evolving Landscape</a>
                <a href="/course/module-3" class="sidebar-link ${currentModuleNum === 3 ? 'active' : ''}">03. Specialized AI Tools</a>
                <a href="/course/module-4" class="sidebar-link ${currentModuleNum === 4 ? 'active' : ''}">04. Mobile APK Analysis</a>
                <a href="/course/module-5" class="sidebar-link ${currentModuleNum === 5 ? 'active' : ''}">05. Custom Deployed Solutions</a>
                <a href="/analyzer" class="sidebar-link ${currentModuleNum === 6 ? 'active' : ''}" style="color: var(--accent-purple); font-weight: 600; margin-top: 1rem; border: 1px solid var(--accent-purple);">✨ APK AI Analyzer</a>
            </nav>
        </aside>
    </div>
    
    <script src="/i18n.js"></script>
</body>
</html>
`;
};

// Direct Upload Endpoint via Multer to avoid IAM Signed URL local issues
app.post('/api/upload', upload.single('apk'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const fileId = crypto.randomBytes(16).toString('hex');
        const fileName = `${fileId}.apk`;
        const blob = storage.bucket(bucketName).file(fileName);
        
        await blob.save(req.file.buffer, {
            metadata: { contentType: 'application/octet-stream' }
        });
        
        res.json({ fileId });
    } catch (e) {
        console.error('Direct Upload Error:', e);
        res.status(500).json({ error: 'Failed to upload file to Cloud Storage: ' + e.message });
    }
});

// Trigger Analysis on Cloud Run Service
app.post('/api/analyze', async (req, res) => {
    try {
        const { fileId } = req.body;
        const analyzerUrl = process.env.ANALYZER_URL || 'http://localhost:8080/analyze'; 
        const response = await fetch(analyzerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId, bucket: bucketName })
        });
        const data = await response.json();
        res.json(data);
    } catch(e) {
        console.error('Analyze trigger error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Serve the APK Analyzer Page
app.get('/analyzer', (req, res) => {
    const html = `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
    
    <style>
        .dfir-dashboard {
            background: #0d1117;
            border: 1px solid #30363d;
            border-radius: 12px;
            padding: 2.5rem;
            box-shadow: 0 12px 32px rgba(0,0,0,0.6);
            margin-top: 1rem;
        }
        .dfir-header {
            text-align: center;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid #30363d;
            margin-bottom: 2.5rem;
        }
        .dfir-header h1 {
            color: #58a6ff;
            font-size: 2.4rem;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 800;
        }
        .dfir-header p { color: #8b949e; font-size: 1.15em; margin-top: 0.5rem; }
        
        .upload-zone {
            border: 2px dashed #58a6ff;
            background: rgba(88, 166, 255, 0.03);
            padding: 3rem;
            text-align: center;
            border-radius: 12px;
            transition: all 0.3s ease;
            margin-bottom: 2rem;
        }
        .upload-zone:hover {
            background: rgba(88, 166, 255, 0.08);
            border-color: #79c0ff;
        }
        
        .upload-btn {
            background: #238636;
            color: white;
            border: 1px solid rgba(240,246,252,0.1);
            padding: 0.9rem 2.5rem;
            font-size: 1.15rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: background 0.2s;
        }
        .upload-btn:hover { background: #2ea043; }
        
        .analyze-btn {
            background: #1f6feb;
            color: white;
            border: none;
            padding: 0.9rem 2.5rem;
            font-size: 1.15rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            margin-top: 1.5rem;
            display: none;
            box-shadow: 0 0 15px rgba(31,111,235,0.4);
            transition: all 0.2s;
        }
        .analyze-btn:hover { background: #388bfd; box-shadow: 0 0 20px rgba(56,139,253,0.6); transform: translateY(-2px); }

        #status-container {
            display: none;
            background: #161b22;
            padding: 1.5rem 2rem;
            border-left: 4px solid #bc8cff;
            border-radius: 8px;
            margin-bottom: 2rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        #status-text { color: #bc8cff; font-weight: 600; font-size: 1.1rem; margin: 0; line-height: 1.4; }
        
        /* Premium Markdown Styling */
        .markdown-body {
            background: #0d1117;
            color: #e6edf3;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            line-height: 1.6;
        }
        .markdown-body h1 { border-bottom: 1px solid #30363d; padding-bottom: 0.75rem; color: #fff; font-size: 2em; margin-bottom: 1.5rem; }
        .markdown-body h2 { border-bottom: 1px dashed #30363d; padding-bottom: 0.5rem; margin-top: 2.5rem; margin-bottom: 1.25rem; color: #58a6ff; font-size: 1.6em; }
        .markdown-body h3 { color: #d2a8ff; font-size: 1.3em; margin-top: 2rem; margin-bottom: 1rem; }
        .markdown-body p { margin-bottom: 1.25rem; font-size: 1.05em; }
        .markdown-body ul { background: rgba(255,255,255,0.02); padding: 1.5rem 1.5rem 1.5rem 3rem; border-radius: 8px; border: 1px solid #30363d; margin-bottom: 1.5rem; font-size: 1.05em;}
        .markdown-body li { margin-bottom: 0.6rem; }
        .markdown-body strong { color: #fff; }
        .markdown-body em { color: #ff7b72; font-style: normal; font-weight: 600; }
        
        .markdown-body pre {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 1.25rem;
            overflow-x: auto;
            margin: 1.5rem 0;
            box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);
        }
        .markdown-body code {
            font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
            font-size: 0.9em;
            background: rgba(240,246,252,0.1);
            padding: 0.2em 0.4em;
            border-radius: 6px;
        }
        .markdown-body pre code { background: transparent; padding: 0; color: inherit; }
    </style>

    <div class="dfir-dashboard">
        <div class="dfir-header">
            <h1>Sovereign DFIR</h1>
            <p>Automated Mobile Malware Static Analysis & IOC Extraction</p>
        </div>
        
        <div class="upload-zone">
            <input type="file" id="apk-file" accept=".apk" style="display:none;" />
            <button class="upload-btn" onclick="document.getElementById('apk-file').click()">Select Target APK</button>
            <p id="file-name-display" style="margin-top: 1.5rem; color: #8b949e; font-family: monospace; font-size: 1.1em;">No static binary loaded.</p>
            <button class="analyze-btn" id="upload-btn" onclick="startUpload()">Initiate Deep Scan</button>
        </div>
        
        <div id="status-container">
            <p id="status-text">Initializing forensic upload pipeline...</p>
        </div>
        
        <div id="result-container" class="markdown-body" style="display: none; margin-top: 2rem;"></div>
    </div>
    
    <script>
        // Configure Marked to use Highlight.js for code blocks
        marked.setOptions({
            highlight: function(code, lang) {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                return hljs.highlight(code, { language }).value;
            },
            langPrefix: 'hljs language-'
        });

        const fileInput = document.getElementById('apk-file');
        const nameDisplay = document.getElementById('file-name-display');
        const uploadBtn = document.getElementById('upload-btn');
        const statusContainer = document.getElementById('status-container');
        const statusText = document.getElementById('status-text');
        const resultContainer = document.getElementById('result-container');
        
        fileInput.addEventListener('change', (e) => {
            if(e.target.files.length > 0) {
                nameDisplay.textContent = "Target: " + e.target.files[0].name;
                nameDisplay.style.color = "#fff";
                uploadBtn.style.display = 'inline-block';
            }
        });

        async function startUpload() {
            const file = fileInput.files[0];
            if(!file) return;
            
            uploadBtn.style.display = 'none';
            statusContainer.style.display = 'block';
            resultContainer.style.display = 'none';
            
            try {
                statusText.innerHTML = "📡 Uploading binary to secure isolation chamber...";
                const formData = new FormData();
                formData.append('apk', file);
                
                const { fileId, error } = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                }).then(res => res.json());

                if (error) throw new Error(error);
                
                statusText.innerHTML = "🔍 Running \`apktool d\` & aggregating Smali logic...<br><br><span style='color: #8b949e; font-size: 0.9em; font-weight: 400;'>This requires natively decoding the Dalvik bytecode and may take up to 60 seconds...</span>";
                const res = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileId })
                });
                
                const data = await res.json();
                
                if (data.error) {
                    statusText.textContent = "❌ Analysis Failed: " + data.error;
                    statusText.style.color = "#ff7b72";
                } else {
                    statusText.textContent = "✅ Scan Complete. Rendering Intelligence Report...";
                    statusText.style.color = "#3fb950";
                    
                    // The Magic: Parse HTML flawlessly with Markdown and Syntax Highlighting!
                    resultContainer.innerHTML = marked.parse(data.report || data.message || "No report generated.");
                    resultContainer.style.display = 'block';
                    statusContainer.style.display = 'none';
                }
                
            } catch (e) {
                statusText.textContent = "❌ Fatal Error: " + e.message;
                statusText.style.color = "#ff7b72";
            }
        }
    </script>
    `;
    res.send(renderLesson(html, 'APK Analyzer', 6));
});

// Dynamic route for fetching MD files based on module ID
app.get('/course/:moduleName', (req, res) => {
    const moduleName = req.params.moduleName; // e.g., 'module-1'
    const lang = req.query.lang || 'en';
    
    const filename = lang === 'en' ? `${moduleName}.md` : `${moduleName}-${lang}.md`;
    let filePath = path.join(__dirname, 'content', filename);
    
    // Fallback to english if localized markdown doesn't exist
    if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, 'content', `${moduleName}.md`);
    }

    // Parse the module number out of the URL (e.g., 'module-1' -> 1)
    const moduleParts = moduleName.split('-');
    const currentModuleNum = moduleParts.length > 1 ? parseInt(moduleParts[1], 10) : 0;

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading ${filePath}:`, err);
            return res.status(404).send(renderLesson('<h1>404 - Module Not Found</h1><p>Sorry, the course module you are looking for does not exist.</p>', 'Not Found', 0));
        }

        // Convert Markdown to HTML
        const contentHtml = marked.parse(data);
        const friendlyTitle = moduleName.replace('-', ' ').toUpperCase();

        res.send(renderLesson(contentHtml, friendlyTitle, currentModuleNum));
    });
});

app.listen(PORT, () => {
    console.log(`Course engine running successfully at http://localhost:${PORT}`);
});
