const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const app = express();
const PORT = process.env.PORT || 3005;

// Serve static files (like the index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Enhanced HTML wrapper with course UI navigation
const renderLesson = (contentHtml, title, currentModuleNum) => {
    // Navigation Logic
    const nextBtn = currentModuleNum < 5 
        ? `<a href="/course/module-${currentModuleNum + 1}" class="nav-btn glow-bg">Next Module →</a>`
        : `<a href="/" class="nav-btn glow-bg">Finish Course 🎉</a>`;
        
    const prevBtn = currentModuleNum > 1
        ? `<a href="/course/module-${currentModuleNum - 1}" class="nav-btn">← Previous</a>`
        : `<a href="/" class="nav-btn">← Home</a>`;

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
            --bg-color: #0a0a0f;
            --surface-color: rgba(255, 255, 255, 0.03);
            --border-color: rgba(255, 255, 255, 0.08);
            --text-primary: #f0f0f5;
            --text-secondary: #9ba1b0;
            --accent-cyan: #00f0ff;
            --accent-purple: #8a2be2;
            --accent-gradient: linear-gradient(135deg, #00f0ff 0%, #8a2be2 100%);
        }
        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 2rem 5%;
            max-width: 900px;
            margin: 0 auto;
        }
        h1, h2, h3 { font-family: 'Outfit', sans-serif; color: var(--accent-cyan); }
        h1 { font-size: 2.8rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; color: #fff; }
        h2 { margin-top: 2.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
        p { margin-bottom: 1rem; font-size: 1.1rem; }
        code { background: var(--surface-color); padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; color: #ffbd2e; font-size: 0.9em; }
        pre { background: #111116; padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color); overflow-x: auto; margin: 1.5rem 0; }
        pre code { color: #00f0ff; background: transparent; padding: 0; }
        a { color: var(--accent-cyan); text-decoration: none; border-bottom: 1px dashed var(--accent-cyan); }
        a:hover { color: var(--accent-purple); border-bottom-color: var(--accent-purple); }
        ul, ol { margin-left: 1.5rem; margin-bottom: 1.5rem; }
        li { margin-bottom: 0.5rem; }
        blockquote { border-left: 4px solid var(--accent-purple); padding-left: 1rem; margin-left: 0; color: var(--text-secondary); font-style: italic; }
        
        /* Top Navigation */
        .top-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .back-link { color: var(--text-secondary); text-decoration: none; border: none; font-weight: 500; font-size: 0.95rem; }
        .back-link:hover { color: var(--text-primary); border: none; }
        .module-badge { background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.2); color: var(--accent-cyan); padding: 0.3rem 1rem; border-radius: 50px; font-size: 0.85rem; font-weight: 600; letter-spacing: 1px; }
        
        /* Progress Bar */
        .progress-bar { width: 100%; height: 4px; background: var(--surface-color); border-radius: 2px; margin-bottom: 3rem; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--accent-gradient); width: ${progressPercent}%; border-radius: 2px; transition: width 0.5s ease; }

        /* Bottom Navigation */
        .bottom-nav { margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; padding-bottom: 4rem; }
        .nav-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.8rem 1.5rem; border-radius: 50px; border: 1px solid var(--border-color); color: var(--text-primary); font-weight: 600; text-decoration: none; transition: all 0.3s ease; border-bottom: none; }
        .nav-btn:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.2); border-bottom: none; }
        .glow-bg { background: rgba(138, 43, 226, 0.15); border-color: var(--accent-purple); color: #fff; }
        .glow-bg:hover { background: rgba(138, 43, 226, 0.3); box-shadow: 0 0 15px rgba(138, 43, 226, 0.4); border-color: var(--accent-purple); border-bottom: none; }
    </style>
</head>
<body>
    <div class="top-nav">
        <a href="/" class="back-link">← Course Dashboard</a>
        <div class="module-badge">MODULE ${currentModuleNum}</div>
    </div>
    <div class="progress-bar">
        <div class="progress-fill"></div>
    </div>
    
    ${contentHtml}
    
    <div class="bottom-nav">
        ${prevBtn}
        ${nextBtn}
    </div>
</body>
</html>
`;
};

// Dynamic route for fetching MD files based on module ID
app.get('/course/:moduleName', (req, res) => {
    const moduleName = req.params.moduleName; // e.g., 'module-1'
    const filePath = path.join(__dirname, 'content', `${moduleName}.md`);
    
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
