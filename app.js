// ============================================
// AI CODE STUDIO - Main JavaScript File
// ============================================

// Global Variables
let editor;
let currentPage = 'home';
let currentPanel = null;
const STORAGE_KEY = 'ai_studio_code';

// API Configuration
const CONFIG = {
    // ⚠️ Ganti dengan API Key OpenRouter Anda. 
    // Format OpenRouter biasanya dimulai dengan "sk-or-..."
    apiKey: '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', 
    apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'qwen/qwen3-coder:free', 
    maxTokens: 2048
}; 

// Default HTML Template
const DEFAULT_CODE = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My App</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        }
        
        .container {
            background: white;
            padding: 24px;
            margin: 20px;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            width: 90%;
            max-width: 400px;
        }
        
        h1 { color: #333; font-size: 24px; margin-top: 0; }
        p { color: #666; margin-bottom: 24px; line-height: 1.5; }
        
        button {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
            font-weight: 600;
            transition: transform 0.2s;
        }

        button:active { transform: scale(0.98); }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Hello World</h1>
        <p>Selamat datang di AI Code Studio! Edit kode ini dan tekan tombol "Run".</p>
        <button onclick="greet()">Klik Saya</button>
    </div>
    
    <script>
        function greet() {
            alert('🎉 Halo! Selamat coding dari HP!');
        }
    </script>
</body>
</html>`;

// ============================================
// MONACO EDITOR INITIALIZATION
// ============================================

function initMonacoEditor() {
    require.config({ 
        paths: { 
            'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' 
        }
    });

    require(['vs/editor/editor.main'], function() {
        const savedCode = localStorage.getItem(STORAGE_KEY);
        const element = document.getElementById('monaco-container');

        if (!element) return;

        editor = monaco.editor.create(element, {
            value: savedCode || DEFAULT_CODE,
            language: 'html',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 14,
            lineHeight: 22,
            minimap: { enabled: false },
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            roundedSelection: true,
            smoothScrolling: true
        });

        // Setup Resize Handler
        window.addEventListener('resize', () => {
             if (editor) editor.layout();
        });

        // Auto-save functionality
        let saveTimeout;
        editor.onDidChangeModelContent(() => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                localStorage.setItem(STORAGE_KEY, editor.getValue());
            }, 1000);
        });

        console.log('Monaco Editor initialized');
        
        // Initial Layout Fix
        setTimeout(() => {
            if (editor) editor.layout();
        }, 500);
    });
}

// Initialize Monaco when script loads
if (typeof require !== 'undefined') {
    initMonacoEditor();
}

// ============================================
// PAGE NAVIGATION
// ============================================

function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
    
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) targetPage.classList.add('active');
    
    const buttons = document.querySelectorAll('.menu-tab');
    if (page === 'home' && buttons[0]) buttons[0].classList.add('active');
    if (page === 'editor' && buttons[1]) buttons[1].classList.add('active');
    
    currentPage = page;
    
    // Toggle Button Visibility in Top Bar
    const editorButtons = ['run-btn', 'ai-btn'];
    editorButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = page === 'editor' ? 'flex' : 'none';
    });

    // Special handling for Editor Page
    if (page === 'editor') {
        setTimeout(() => {
            if (!editor) {
                // If not initialized, try again (rare case)
                const container = document.getElementById('monaco-container');
                if (container && container.innerHTML === '') initMonacoEditor();
            } else {
                // FORCE LAYOUT UPDATE FOR MOBILE
                editor.layout();
            }
            
            // Auto run code if preview is empty
            const frame = document.getElementById('preview-frame');
            if (frame && (!frame.contentDocument || frame.contentDocument.body.innerHTML === '')) {
                runCode();
            }
        }, 100);
    }
}

// ============================================
// BOTTOM PANEL MANAGEMENT
// ============================================

function togglePanel(panelType) {
    const panel = document.getElementById('bottom-panel');
    
    if (panel.classList.contains('open')) {
        closePanel();
    } else {
        panel.classList.add('open');
        // Setup focus to input
        setTimeout(() => {
             const input = document.getElementById('chat-input');
             if(input) input.focus();
             if(editor) editor.layout();
        }, 350);
    }
}

function closePanel() {
    const panel = document.getElementById('bottom-panel');
    if (panel) panel.classList.remove('open');
    currentPanel = null;
    
    setTimeout(() => {
         if(editor) editor.layout();
    }, 350);
}

// ============================================
// CODE EXECUTION
// ============================================

function runCode() {
    if (!editor) return;

    const code = editor.getValue();
    const frame = document.getElementById('preview-frame');
    
    if (!frame) return;

    // Remove old iframe content properly
    let doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write(code);
    doc.close();
    
    // Inject simple error catching in the iframe
    const script = doc.createElement('script');
    script.innerHTML = `
        window.onerror = function(msg, url, line) {
            console.error(msg);
        };
    `;
    doc.head.appendChild(script);
}

// ============================================
// AI CHAT FUNCTIONALITY (FIXED KEYBOARD)
// ============================================

// SETUP KEYBOARD ENTER LISTENER
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendToAI();
            }
        });
    }
});

async function sendToAI() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    
    const question = input.value.trim();
    if (!question) {
        return;
    }

    if (!CONFIG.apiKey) {
        appendMessage('ai', '⚠️ <strong>API Key Missing.</strong><br>Edit app.js untuk mengisi API Key.');
        return;
    }

    appendMessage('user', question);
    input.value = '';

    const loadingMsg = appendMessage('ai', '<div class="loading"></div> Sedang berpikir...');
    const currentCode = editor ? editor.getValue() : '';

    try {
        const response = await fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`, 
                'HTTP-Referer': window.location.href, 
                'X-Title': 'AI Code Studio'
            },
            body: JSON.stringify({
                model: CONFIG.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Anda adalah asisten coding ahli. Jawab dalam Bahasa Indonesia. Berikan kode lengkap jika diminta.'
                    },
                    {
                        role: 'user',
                        content: `User Current Code:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nQuestion: "${question}"`
                    }
                ],
                max_tokens: CONFIG.maxTokens
            })
        });

        const data = await response.json();
        
        if (loadingMsg && loadingMsg.parentNode) loadingMsg.remove();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            appendMessage('ai', formatAIResponse(data.choices[0].message.content));
        } else if (data.error) {
             throw new Error(data.error.message);
        } else {
            throw new Error('Format respon API tidak dikenali');
        }

    } catch (error) {
        if (loadingMsg && loadingMsg.parentNode) loadingMsg.remove();
        appendMessage('ai', `❌ Error: ${error.message}`);
        console.error(error);
    }
}

function appendMessage(role, content) {
    const container = document.getElementById('chat-messages');
    if (!container) return null;
    
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    msg.innerHTML = content;
    
    container.appendChild(msg);
    // Smooth scroll to bottom
    setTimeout(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }, 100);
    return msg;
}

function formatAIResponse(text) {
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const escapedCode = code.replace(/&/g, "&amp;")
                                .replace(/</g, "&lt;")
                                .replace(/>/g, "&gt;");
        return `<pre><div class="code-header">${lang || 'code'}</div><code>${escapedCode}</code></pre>`;
    });
    text = text.replace(/\n/g, '<br>');
    return text;
}

// ============================================
// UTILITIES (TEMPLATE FIXED)
// ============================================

function saveCode() {
    if (!editor) return;
    const code = editor.getValue();
    localStorage.setItem(STORAGE_KEY, code);
    
    const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('💾 Disimpan!', 'success');
}

function clearEditor() {
    if (confirm('Hapus semua kode?')) {
        if(editor) editor.setValue('');
        localStorage.removeItem(STORAGE_KEY);
        const frame = document.getElementById('preview-frame');
        if (frame) {
            frame.src = 'about:blank';
            try {
                frame.contentDocument.write('');
                frame.contentDocument.close();
            } catch(e){}
        }
    }
}

function loadSavedCode() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        switchPage('editor');
        showNotification('📂 Project dimuat', 'success');
    } else {
        showNotification('📂 Tidak ada simpanan', 'error');
    }
}

// FIXED: Template Function Logic
function loadTemplate(type) {
    // Jika type undefined (dari tombol menu utama), minta user memilih
    if (!type) {
        const choice = prompt(
            "Pilih Template:\n1. Landing Page\n2. Kalkulator\n3. Portfolio Sederhana\n\nKetik nomor (1-3):"
        );
        if (choice === '1') type = 'landing';
        else if (choice === '2') type = 'calculator';
        else if (choice === '3') type = 'portfolio';
        else return; // Cancel
    }

    const templates = {
        landing: `<!DOCTYPE html>
<html>
<head>
    <title>Landing Page</title>
    <style>
        body{font-family:sans-serif;background:#111;color:#fff;text-align:center;padding:50px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0}
        h1{color:#4ec9b0;font-size:3em;margin-bottom:10px}
        p{color:#888;font-size:1.2em}
        .btn{padding:10px 20px;background:#4ec9b0;border:none;color:#000;font-weight:bold;cursor:pointer;border-radius:5px;margin-top:20px}
        .btn:hover{opacity:0.8}
    </style>
</head>
<body>
    <h1>Selamat Datang</h1>
    <p>Ini adalah template landing page sederhana.</p>
    <button class="btn" onclick="alert('Started!')">Mulai Sekarang</button>
</body>
</html>`,
        
        calculator: `<!DOCTYPE html>
<html>
<head>
    <title>Kalkulator</title>
    <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f0f0; margin: 0; }
        .calc { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); width: 280px; }
        #display { width: 100%; height: 50px; font-size: 24px; text-align: right; margin-bottom: 10px; padding: 5px; box-sizing: border-box; }
        .keys { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        button { padding: 15px; font-size: 18px; border: none; background: #eee; cursor: pointer; border-radius: 5px; }
        button:hover { background: #ddd; }
        .op { background: #ff9f43; color: white; }
        .eq { background: #2ecc71; color: white; grid-column: span 2; }
        .cl { background: #e74c3c; color: white; }
    </style>
</head>
<body>
    <div class="calc">
        <input type="text" id="display" readonly>
        <div class="keys">
            <button class="cl" onclick="clearD()">C</button>
            <button onclick="app('/')">/</button>
            <button onclick="app('*')">x</button>
            <button class="cl" onclick="del()">←</button>
            <button onclick="app('7')">7</button>
            <button onclick="app('8')">8</button>
            <button onclick="app('9')">9</button>
            <button class="op" onclick="app('-')">-</button>
            <button onclick="app('4')">4</button>
            <button onclick="app('5')">5</button>
            <button onclick="app('6')">6</button>
            <button class="op" onclick="app('+')">+</button>
            <button onclick="app('1')">1</button>
            <button onclick="app('2')">2</button>
            <button onclick="app('3')">3</button>
            <button class="eq" onclick="calc()">=</button>
            <button onclick="app('0')" style="grid-column: span 2">0</button>
            <button onclick="app('.')">.</button>
        </div>
    </div>
    <script>
        let d = document.getElementById('display');
        function app(v) { d.value += v; }
        function clearD() { d.value = ''; }
        function del() { d.value = d.value.slice(0,-1); }
        function calc() { try { d.value = eval(d.value); } catch { d.value = 'Error'; } }
    </script>
</body>
</html>`,

        portfolio: `<!DOCTYPE html>
<html>
<head>
    <title>Portfolio Saya</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; background: #1a1a1a; color: white; }
        header { padding: 40px 20px; text-align: center; background: linear-gradient(to right, #2b5876, #4e4376); }
        .content { max-width: 800px; margin: 20px auto; padding: 20px; }
        .card { background: #333; padding: 20px; margin-bottom: 20px; border-radius: 10px; }
        h2 { color: #4ec9b0; border-bottom: 2px solid #444; padding-bottom: 10px; }
    </style>
</head>
<body>
    <header>
        <h1>Nama Saya</h1>
        <p>Web Developer & Designer</p>
    </header>
    <div class="content">
        <div class="card">
            <h2>Tentang</h2>
            <p>Halo! Saya adalah pengembang web pemula yang menggunakan AI Code Studio.</p>
        </div>
        <div class="card">
            <h2>Skill</h2>
            <ul>
                <li>HTML & CSS</li>
                <li>JavaScript</li>
                <li>Mobile Design</li>
            </ul>
        </div>
    </div>
</body>
</html>`
    };

    if (templates[type]) {
        switchPage('editor');
        setTimeout(() => {
            if (editor) {
                editor.setValue(templates[type]);
                runCode();
                showNotification('📄 Template dimuat', 'success');
            }
        }, 300);
    } else {
        showNotification('❌ Template tidak ditemukan', 'error');
    }
}

function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());

    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    
    // Style notification dynamically
    notif.style.position = 'fixed';
    notif.style.top = '20px';
    notif.style.left = '50%';
    notif.style.transform = 'translateX(-50%)';
    notif.style.padding = '10px 20px';
    notif.style.borderRadius = '5px';
    notif.style.zIndex = '10000';
    notif.style.color = 'white';
    notif.style.fontWeight = 'bold';
    notif.style.background = type === 'success' ? '#2ecc71' : '#e74c3c';
    
    document.body.appendChild(notif);
    
    // Auto remove
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Mobile Keyboard Handler
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && currentPage === 'editor') { e.preventDefault(); runCode(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCode(); }
});
