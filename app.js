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
    model: 'qwen/qwen2.5-coder-32b-instruct:free', // Update model ke yang lebih stabil/baru jika perlu
    maxTokens: 2048
}; // <-- PERBAIKAN 1: Menambahkan penutup object dan titik koma

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

        logConsole('Monaco Editor initialized', 'success');
        
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
    const editorButtons = ['run-btn', 'ai-toggle-btn', 'console-toggle-btn'];
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
    
    if (currentPanel === panelType && panel.classList.contains('open')) {
        closePanel();
    } else {
        panel.classList.add('open');
        switchPanelTab(panelType);
        currentPanel = panelType;
        
        // Wait for transition then resize editor
        setTimeout(() => {
             if(editor) editor.layout();
        }, 350);
    }
}

function switchPanelTab(tab) {
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel-view').forEach(v => v.classList.remove('active'));
    
    const btns = document.querySelectorAll('.panel-tab');
    if (tab === 'ai' && btns[0]) btns[0].classList.add('active');
    if (tab === 'console' && btns[1]) btns[1].classList.add('active');
    
    const tabElement = document.getElementById(`${tab}-panel`);
    if (tabElement) tabElement.classList.add('active');
    
    currentPanel = tab;
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
            window.parent.postMessage({type: 'error', message: msg, line: line}, '*');
        };
        console.log = function(...args) {
            window.parent.postMessage({type: 'log', message: args.join(' ')}, '*');
        };
    `;
    doc.head.appendChild(script);
    
    logConsole('✓ Code executed successfully', 'success');
}

// Listen for messages from iframe (simple console capture)
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'error') {
        logConsole(`Runtime Error (Line ${event.data.line}): ${event.data.message}`, 'error');
    }
    if (event.data && event.data.type === 'log') {
        logConsole(`Log: ${event.data.message}`, 'info');
    }
});

// ============================================
// AI CHAT FUNCTIONALITY (CORRECTED)
// ============================================

async function sendToAI() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    
    const question = input.value.trim();
    if (!question) {
        showNotification('⚠️ Silakan masukkan pertanyaan', 'error');
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
        // PERBAIKAN 2: Request Format OpenRouter (Standard OpenAI)
        const response = await fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`, // Gunakan Bearer untuk OpenRouter
                'HTTP-Referer': window.location.href, // Required by OpenRouter for free tier
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
        
        // PERBAIKAN 3: Response Parsing (Standard OpenAI Format)
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
    // Escape HTML tags inside text to prevent rendering them
    // But allow code blocks to be formatted
    
    // 1. Format Code Blocks
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        // Simple HTML escape for code content
        const escapedCode = code.replace(/&/g, "&amp;")
                                .replace(/</g, "&lt;")
                                .replace(/>/g, "&gt;");
        return `<pre><div class="code-header">${lang || 'code'}</div><code>${escapedCode}</code></pre>`;
    });

    // 2. Format Line Breaks for non-code parts
    // (This is a simple regex, might need refinement for complex markdown)
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// ============================================
// UTILITIES
// ============================================

function logConsole(message, type = 'info') {
    const consolePanel = document.getElementById('console-panel');
    if (!consolePanel) return;
    
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    const time = new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    line.innerHTML = `<span class="console-time">[${time}]</span><span>${message}</span>`;
    
    consolePanel.appendChild(line);
    consolePanel.scrollTop = consolePanel.scrollHeight;
}

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

function loadTemplate(type) {
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
    </style>
</head>
<body>
    <h1>Landing Page</h1>
    <p>Template berhasil dimuat!</p>
    <button class="btn" onclick="alert('Clicked!')">Get Started</button>
</body>
</html>`
    };

    if (templates[type]) {
        switchPage('editor');
        setTimeout(() => {
            if (editor) {
                editor.setValue(templates[type]);
                runCode();
            }
        }, 300);
    }
}

function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());

    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    // Auto remove
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(-20px)';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Mobile Keyboard Handler
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && currentPage === 'editor') { e.preventDefault(); runCode(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCode(); }
});
