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
    <h1>APK AI Analyzer</h1>
    <p>Upload your compiled Android application (.apk) for static security analysis using Gemini AI. We will decompile your application and scan it for vulnerabilities.</p>
    <div style="border: 2px dashed var(--border-color); padding: 3rem; text-align: center; border-radius: 12px; margin: 2rem 0; background: rgba(88, 166, 255, 0.05);" id="upload-box">
        <input type="file" id="apk-file" accept=".apk" style="display:none;" />
        <button class="nav-btn glow-bg" style="font-size: 1.1rem; padding: 0.8rem 1.5rem;" onclick="document.getElementById('apk-file').click()">Select APK File</button>
        <p style="margin-top: 1rem; color: var(--text-secondary);" id="file-name-display">No file selected.</p>
        <button class="nav-btn" style="margin-top: 1rem; display:none; border-color: var(--accent-purple); color: var(--accent-purple);" id="upload-btn" onclick="startUpload()">Upload & Analyze</button>
    </div>
    
    <div id="status-container" style="display:none; padding: 1.5rem; background: var(--surface-color); border: 1px left solid var(--accent-purple); border-radius: 8px;">
        <h3>Analysis Status</h3>
        <p id="status-text" style="color: var(--accent-cyan); font-weight: 600;">Initializing upload...</p>
        <div id="result-container" style="margin-top: 1.5rem; white-space: pre-wrap; word-wrap: break-word; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.9em; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 6px; display: none;"></div>
    </div>
    
    <script>
        const fileInput = document.getElementById('apk-file');
        const nameDisplay = document.getElementById('file-name-display');
        const uploadBtn = document.getElementById('upload-btn');
        const statusContainer = document.getElementById('status-container');
        const statusText = document.getElementById('status-text');
        const resultContainer = document.getElementById('result-container');
        
        fileInput.addEventListener('change', (e) => {
            if(e.target.files.length > 0) {
                nameDisplay.textContent = e.target.files[0].name;
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
                statusText.textContent = "Uploading APK to backend (might take a minute)...";
                const formData = new FormData();
                formData.append('apk', file);
                
                const { fileId, error } = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                }).then(res => res.json());

                if (error) {
                    throw new Error(error);
                }
                
                statusText.textContent = "Upload complete. Extracting APK and running Gemini Analysis...";
                const res = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileId })
                });
                
                const data = await res.json();
                
                if (data.error) {
                    statusText.textContent = "Analysis Failed: " + data.error;
                    statusText.style.color = "#ff7b72";
                } else {
                    statusText.textContent = "Analysis Complete! ✨";
                    statusText.style.color = "var(--accent-purple)";
                    resultContainer.style.display = 'block';
                    resultContainer.textContent = data.report || data.message || JSON.stringify(data, null, 2);
                }
                
            } catch (e) {
                statusText.textContent = "Error: " + e.message;
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
