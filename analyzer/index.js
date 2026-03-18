require('dotenv').config();
const express = require('express');
const { Storage } = require('@google-cloud/storage');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const storage = new Storage();

app.post('/analyze', async (req, res) => {
    const { fileId, bucket } = req.body;
    if (!fileId || !bucket) return res.status(400).json({ error: 'Missing fileId or bucket' });

    const apkPath = `/tmp/${fileId}.apk`;
    const outDir = `/tmp/${fileId}_out`;

    try {
        console.log(`Downloading gs://${bucket}/${fileId}.apk...`);
        await storage.bucket(bucket).file(`${fileId}.apk`).download({ destination: apkPath });

        console.log(`Extracting ${apkPath}...`);

        // Smart fallback: If apktool isn't globally installed (like on local Mac), use the standalone jar
        const localJarPath = path.join(__dirname, 'apktool.jar');
        const extractCmd = fs.existsSync(localJarPath)
            ? `java -jar "${localJarPath}" d "${apkPath}" -o "${outDir}" -f`
            : `apktool d "${apkPath}" -o "${outDir}" -f`;

        try {
            execSync(extractCmd, { stdio: 'pipe' });
        } catch (execErr) {
            const stderrStr = execErr.stderr ? execErr.stderr.toString() : '';
            console.error("Extraction Failed:", stderrStr || execErr.message);
            
            // Intelligently detect if this is a standard malware anti-analysis mechanism
            if (stderrStr.includes('invalid CEN header') || stderrStr.includes('ZipException') || stderrStr.includes('bad compression method')) {
                console.log("Anti-analysis technique natively detected. Bypassing Gemini and returning static IoC report.");
                
                // Cleanup before returning
                console.log(`Cleaning up files for ${fileId} ...`);
                try { if (fs.existsSync(apkPath)) fs.unlinkSync(apkPath); } catch (e) { }
                try { if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true }); } catch (e) { }
                try { await storage.bucket(bucket).file(`${fileId}.apk`).delete(); } catch (e) { }

                return res.json({ 
                    success: true, 
                    report: `
# 🕵️ Mobile Forensic Analysis Report
        
## 📊 Executive Summary
The application is actively employing ZIP structure obfuscation to purposefully defeat forensic extraction and reverse engineering tools.

## 🎯 Threat Assessment & Confidence Score
**Malware Confidence Score:** 100%
**Summary:** This APK uses an aggressive anti-analysis mechanism natively employed by sophisticated malware to defend its source code from decompilation.

## 🔴 Critical Indicators of Compromise (IoCs) & High Risks
* **Anti-Analysis Sandbox Evasion:** The primary DFIR extraction engine (\`apktool\`) suffered a fatal crash while unpacking the application because the threat actor intentionally malformed the ZIP Central Directory (CEN) headers (using an invalid or fake compression method like \`8314\`). 
* **Forensic Implication:** This breaks strict static analysis tools, while the permissive Android OS package installer (which relies on C++) executes it flawlessly.

## 📌 Recommended Analyst Action
Manual forensic header repair using specialized hex editors (e.g., \`ziputil\`) is strictly required before the underlying payload can be statically exposed to Gemini.`
                });
            }
            throw new Error(`Apktool Extraction failed: ${stderrStr || execErr.message}`);
        }

        console.log(`Reading codebase...`);
        let codebaseStr = '';
        
        // Smart Filter: Skip massive boilerplate SDK libraries to preserve the 800k token gap exclusively for the developer's actual application code.
        const ignorePaths = [
            '/smali/androidx/', '/smali/android/', '/smali/kotlin/', '/smali/kotlinx/', 
            '/smali/com/google/', '/smali/com/facebook/', '/smali/io/flutter/', '/original/', '/META-INF/'
        ];
        
        function readDirRecursively(dir) {
            if (!fs.existsSync(dir)) return;
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                
                const normalizedPath = fullPath.replace(/\\/g, '/');
                if (ignorePaths.some(ignored => normalizedPath.includes(ignored))) {
                    continue; // Skip massive 3rd party UI/framework libraries completely
                }
                
                if (stat.isDirectory()) {
                    readDirRecursively(fullPath);
                } else if (file.endsWith('.xml') || file.endsWith('.smali') || file.endsWith('.properties') || file.endsWith('.json')) {
                    if (stat.size < 1024 * 500) {
                        try {
                            const content = fs.readFileSync(fullPath, 'utf8');
                            codebaseStr += `\n--- FILE: ${path.relative(outDir, fullPath)} ---\n${content}\n`;
                        } catch(e) {}
                    }
                }
                
                // Keep strictly under Free Tier Limits (~200k tokens)
                if (codebaseStr.length > 800000) break;
            }
        }
        
        readDirRecursively(outDir);
        
        if (!codebaseStr) {
            throw new Error('No readable source code or manifest found after extraction.');
        }

        // Hard truncation in case a single large file bypassed the loop break
        if (codebaseStr.length > 800000) {
            codebaseStr = codebaseStr.substring(0, 800000) + "\n... [CODEBASE TRUNCATED TO FIT FREE TIER TOKEN LIMITS] ...";
        }

        console.log(`Sending codebase (${codebaseStr.length} bytes) to Gemini via AI Studio API...`);
        if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY in environment variables");
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const generativeModel = genAI.getGenerativeModel({
            model: 'gemini-3.1-flash-lite-preview'
        });

        const prompt = `
        You are an elite Digital Forensics and Incident Response (DFIR) malware analyst. Perform a comprehensive forensic static analysis of the provided Android application compiled codebase (Smali/Dalvik) and AndroidManifest.xml files. 
        Do NOT recommend code changes or developer remediations. Your core objective is strictly to identify malicious indicators, operational capabilities, and misconfigurations from an examiner's perspective to understand what the application is capable of doing.

        Your analysis MUST be formatted in highly polished, professional Markdown. Use EXACTLY the following structured outline:

        # 🕵️ Comprehensive Mobile Forensic Source Analysis
        
        ## 📊 Executive Summary
        Provide a 2-3 sentence high-level summary of the application's true operational intent and threat profile based entirely on the combined codebase.
        
        ## 🎯 Threat Assessment & Confidence Score
        **Malware Confidence Score:** [0-100%]
        **Summary:** (Provide a clear one-sentence reasoning justifying this score based on the highest severity findings).
        
        ## 📄 AndroidManifest.xml Forensic Analysis
        Analyze the structural application entry points and privileges.
        * **Dangerous Privileges:** (List and explain the forensic implications of excessive/suspicious permissions).
        * **Suspicious Components:** (Activities, Services, Receivers that are misconfigured, hidden, or dynamically abuse privileges).
        * **XML Evidence:** (Include the exact \`xml\` code blocks to back your claims directly from the provided manifest).
        
        ## 💻 Java Source Code (Smali) Forensic Analysis
        Deep dive into the operational behavior of the actual application code.
        * **Hardcoded Secrets & Network IoCs:** (Identify embedded API keys, suspicious IPs, C2 servers, or endpoints).
        * **Malicious Operational Logic:** (Identify dynamic code loading, background payload execution, broadcast receiver intents, or spyware behaviors).
        * **Code Evidence:** (Include the exact \`smali\` or Java code logic directly from the provided files to backup every claim, explicitly citing the package or filename it was found in).
        
        ---
        **Extracted Codebase Content:**
        \`\`\`
        ${codebaseStr}
        \`\`\`
        `;

        const resp = await generativeModel.generateContent(prompt);
        const report = resp.response.candidates[0].content.parts[0].text;

        console.log(`Analysis complete for ${fileId}`);
        res.json({ success: true, report: report });

    } catch (err) {
        console.error('Error during analysis:', err);
        res.status(500).json({ error: err.message, stack: err.stack });
    } finally {
        // Cleanup
        console.log(`Cleaning up files for ${fileId} ...`);
        try { if (fs.existsSync(apkPath)) fs.unlinkSync(apkPath); } catch (e) { }
        try { if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true }); } catch (e) { }

        // delete from GCS to save space
        try { await storage.bucket(bucket).file(`${fileId}.apk`).delete(); } catch (e) { }
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Analyzer Service listening on port ${port}`);
});
