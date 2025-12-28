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
    apiKey: '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', // ⚠️ MASUKKAN API KEY ANTHROPIC DI SINI
    apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'qwen/qwen3-coder:free',
    maxTokens: 1024
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
        }
        
        .container {
            background: white;
            padding: 24px;
            margin: 20px;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
        }
        
        h1 { color: #333; font-size: 28px; }
        p { color: #666; margin-bottom: 24px; }
        
        button {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Hello World</h1>
        <p>Selamat datang di AI Code Studio!</p>
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
        
        editor = monaco.editor.create(document.getElementById('monaco-container'), {
            value: savedCode || DEFAULT_CODE,
            language: 'html',
            theme: 'vs-dark',
            automaticLayout: true, // PENTING: Agar auto resize
            fontSize: 14,
            lineHeight: 22,
            minimap: { enabled: false }, // Disable minimap di mobile agar lega
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            roundedSelection: true,
            smoothScrolling: true
        });

        // Setup Resize Handler untuk Mobile
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
        
        // PENTING: Paksa layout ulang setelah init agar muncul di Android
        setTimeout(() => {
            editor.layout();
        }, 100);
    });
}

// Initialize Monaco when script loads
if (typeof require !== 'undefined') {
    initMonacoEditor();
} else {
    console.error('Monaco loader not found');
}

// ============================================
// PAGE NAVIGATION
// ============================================

function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
    
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) targetPage.classList.add('active');
    
    // Update active tab visual
    const buttons = document.querySelectorAll('.menu-tab');
    if (page === 'home') buttons[0].classList.add('active');
    if (page === 'editor') buttons[1].classList.add('active');
    
    currentPage = page;
    
    const editorButtons = ['run-btn', 'ai-toggle-btn', 'console-toggle-btn'];
    editorButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = page === 'editor' ? 'flex' : 'none';
    });

    if (page === 'editor') {
        setTimeout(() => {
            if (!editor) {
                const monacoContainer = document.getElementById('monaco-container');
                if (monacoContainer && monacoContainer.innerHTML === '') {
                    initMonacoEditor();
                }
            } else {
                // FIX MOBILE: Layout ulang saat tab berubah
                editor.layout();
            }
            // Run code untuk preview pertama kali
            setTimeout(runCode, 200);
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
        
        // Fix untuk editor agar tidak tertutup panel di mobile
        setTimeout(() => {
             if(editor) editor.layout();
        }, 350);
    }
}

function switchPanelTab(tab) {
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel-view').forEach(v => v.classList.remove('active'));
    
    // Find button related to tab
    const btns = document.querySelectorAll('.panel-tab');
    if (tab === 'ai') btns[0].classList.add('active');
    if (tab === 'console') btns[1].classList.add('active');
    
    const tabElement = document.getElementById(`${tab}-panel`);
    if (tabElement) tabElement.classList.add('active');
    
    currentPanel = tab;
}

function closePanel() {
    const panel = document.getElementById('bottom-panel');
    if (panel) panel.classList.remove('open');
    currentPanel = null;
    
    // Kembalikan ukuran editor
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

    const doc = frame.contentDocument || frame.contentWindow.document;
    
    try {
        doc.open();
        doc.write(code);
        doc.close();
        
        logConsole('✓ Code executed successfully', 'success');
    } catch (error) {
        logConsole(`✗ Error: ${error.message}`, 'error');
    }
}

// ============================================
// AI CHAT FUNCTIONALITY
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
        appendMessage('ai', '⚠️ <strong>API Key belum dikonfigurasi.</strong><br>Edit app.js untuk mengisi API Key.');
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
                'x-api-key': CONFIG.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: CONFIG.model,
                max_tokens: CONFIG.maxTokens,
                messages: [{
                    role: 'user',
                    content: `User Code:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nQuestion: "${question}"\n\nJawab dalam Bahasa Indonesia, berikan solusi kode.`
                }]
            })
        });

        const data = await response.json();
        
        if (loadingMsg && loadingMsg.parentNode) loadingMsg.remove();
        
        if (data.content && data.content[0] && data.content[0].text) {
            appendMessage('ai', formatAIResponse(data.content[0].text));
        } else {
            throw new Error(data.error?.message || 'Unknown API error');
        }

    } catch (error) {
        if (loadingMsg && loadingMsg.parentNode) loadingMsg.remove();
        appendMessage('ai', `❌ Error: ${error.message}`);
    }
}

function appendMessage(role, content) {
    const container = document.getElementById('chat-messages');
    if (!container) return null;
    
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    msg.innerHTML = content;
    
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return msg;
}

function formatAIResponse(text) {
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
    });
    text = text.replace(/\n/g, '<br>');
    return text;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// UTILITIES (Console, File, Template)
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
    if (editor && confirm('Hapus semua kode?')) {
        editor.setValue('');
        localStorage.removeItem(STORAGE_KEY);
        const frame = document.getElementById('preview-frame');
        if (frame) frame.src = 'about:blank';
    }
}

function loadSavedCode() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        switchPage('editor');
        showNotification('📂 Project dimuat', 'success');
    }
}

function loadTemplate(type) {
    const templates = {
        landing: `<!DOCTYPE html><html><head><style>body{font-family:sans-serif;background:#111;color:#fff;text-align:center;padding:50px}h1{color:#4ec9b0}</style></head><body><h1>Landing Page</h1><p>Template Loaded!</p></body></html>`
    };
    if (templates[type]) {
        switchPage('editor');
        setTimeout(() => {
            if (editor) editor.setValue(templates[type]);
            runCode();
        }, 300);
    }
}

function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Mobile Keyboard Handler
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter' && currentPage === 'editor') { e.preventDefault(); runCode(); }
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveCode(); }
});
