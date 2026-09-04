document.addEventListener('DOMContentLoaded', () => {
    // === 1. Navbar & Mobile Menu ===
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = hamburger.querySelector('i');
        if (navLinks.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-xmark');
        } else {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    });

    // Automatically adjust editor layouts on window resize or device orientation change
    window.addEventListener('resize', () => {
        if (typeof sourceEditor !== 'undefined' && sourceEditor) sourceEditor.layout();
        if (typeof targetEditor !== 'undefined' && targetEditor) targetEditor.layout();
        if (typeof diffEditor !== 'undefined' && diffEditor) diffEditor.layout();
    });

    // Handle SPA navigation and close mobile menu on link click
    const allSections = document.querySelectorAll('.hero, .section');
    
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.length > 1) {
                e.preventDefault();
                const targetId = href.substring(1);
                
                // Hide all sections
                allSections.forEach(sec => sec.classList.remove('active-section'));
                
                // Show target section
                const targetSec = document.getElementById(targetId);
                if (targetSec) {
                    targetSec.classList.add('active-section');
                    window.scrollTo(0, 0); // Scroll to top of the new section
                    
                    // Force Monaco editors to layout if navigating to the demo page
                    if (targetId === 'demo') {
                        setTimeout(() => {
                            if (typeof sourceEditor !== 'undefined' && sourceEditor) sourceEditor.layout();
                            if (typeof targetEditor !== 'undefined' && targetEditor) targetEditor.layout();
                            if (typeof diffEditor !== 'undefined' && diffEditor) diffEditor.layout();
                        }, 200);
                    }
                }

                // Close mobile menu if open
                navLinks.classList.remove('active');
                if (hamburger.querySelector('i')) {
                    hamburger.querySelector('i').classList.remove('fa-xmark');
                    hamburger.querySelector('i').classList.add('fa-bars');
                }

                // Handle Floating Back Button visibility
                const floatingBackBtn = document.getElementById('floating-back-btn');
                if (floatingBackBtn) {
                    if (targetId === 'home') {
                        floatingBackBtn.classList.remove('show');
                    } else {
                        floatingBackBtn.classList.add('show');
                    }
                }
            }
        });
    });

    // Close menu when clicking outside of it
    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('active') && !navLinks.contains(e.target) && !hamburger.contains(e.target)) {
            navLinks.classList.remove('active');
            if (hamburger.querySelector('i')) {
                hamburger.querySelector('i').classList.remove('fa-xmark');
                hamburger.querySelector('i').classList.add('fa-bars');
            }
        }
    });

    // === 2. Dark/Light Theme Toggle ===
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    
    // Check local storage for theme
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') {
        body.setAttribute('data-theme', 'light');
        body.classList.remove('dark-mode');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }

    themeToggleBtn.addEventListener('click', () => {
        if (body.getAttribute('data-theme') === 'light') {
            body.removeAttribute('data-theme');
            body.classList.add('dark-mode');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        } else {
            body.setAttribute('data-theme', 'light');
            body.classList.remove('dark-mode');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        }
    });

    // === 3. Typing Animation ===
    const typingText = "Translating Logic. Preserving Semantics.";
    const typingElement = document.getElementById('typing-text');
    let typeIndex = 0;

    function type() {
        if (typeIndex < typingText.length) {
            typingElement.textContent += typingText.charAt(typeIndex);
            typeIndex++;
            setTimeout(type, 100);
        } else {
            setTimeout(() => {
                typingElement.textContent = "";
                typeIndex = 0;
                type();
            }, 3000);
        }
    }
    type();

    // === 4. Scroll Animations (Intersection Observer) ===
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // If it's a stat number, trigger count animation
                if (entry.target.classList.contains('stat-number') && !entry.target.classList.contains('counted')) {
                    animateValue(entry.target);
                    entry.target.classList.add('counted');
                }
            }
        });
    }, observerOptions);

    document.querySelectorAll('.slide-up, .stat-number').forEach(el => {
        observer.observe(el);
    });

    // === 5. Animated Counters ===
    function animateValue(obj) {
        let startTimestamp = null;
        const duration = 2000;
        const target = parseFloat(obj.getAttribute('data-target'));
        const isFloat = obj.classList.contains('float');

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            let current = easeProgress * target;
            if (isFloat) {
                obj.innerHTML = current.toFixed(1);
            } else {
                obj.innerHTML = Math.floor(current);
            }

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = isFloat ? target.toFixed(1) : target;
            }
        };
        window.requestAnimationFrame(step);
    }

    // Set Copyright Year
    document.getElementById('year').textContent = new Date().getFullYear();

    // === 6. Editor Features (Monaco) & Dummy Implementation ===
    let sourceEditor, targetEditor, diffEditor;
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');
    const btnToggleDiff = document.getElementById('btn-toggle-diff');
    const targetEditorContainer = document.getElementById('target-editor');
    const diffEditorContainer = document.getElementById('diff-editor');
    let isDiffView = false;
    let isEditorLight = false;

    // --- History Modal Logic ---
    const historyOverlay = document.getElementById('history-overlay');
    const btnHistory = document.getElementById('btn-history');
    const btnCloseHistory = document.getElementById('btn-close-history');
    const btnClearHistory = document.getElementById('btn-clear-history');
    const historyList = document.getElementById('history-list');

    function loadHistory() {
        const h = JSON.parse(localStorage.getItem('syn2sem_history') || '[]');
        if (h.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #888; margin-top: 20px;">No translation history yet.</p>';
            return;
        }
        historyList.innerHTML = '';
        h.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-item-langs">${item.sourceLang} <i class="fa-solid fa-arrow-right"></i> ${item.targetLang}</div>
                <div class="history-item-code">${item.sourceCode.substring(0, 50)}...</div>
                <div class="history-item-time">${new Date(item.timestamp).toLocaleString()}</div>
            `;
            div.addEventListener('click', () => {
                sourceLang.value = item.sourceLang;
                targetLang.value = item.targetLang;
                sourceEditor.setValue(item.sourceCode);
                targetEditor.setValue(item.targetCode);
                historyOverlay.classList.add('hidden');
            });
            historyList.appendChild(div);
        });
    }

    function saveHistory(sourceCode, targetCode, sLang, tLang) {
        const h = JSON.parse(localStorage.getItem('syn2sem_history') || '[]');
        h.unshift({
            sourceCode, targetCode, sourceLang: sLang, targetLang: tLang, timestamp: Date.now()
        });
        if (h.length > 20) h.pop(); // limit to 20 items
        localStorage.setItem('syn2sem_history', JSON.stringify(h));
    }

    if (btnHistory) {
        btnHistory.addEventListener('click', () => {
            loadHistory();
            historyOverlay.classList.remove('hidden');
        });
    }
    if (btnCloseHistory) btnCloseHistory.addEventListener('click', () => historyOverlay.classList.add('hidden'));
    if (btnClearHistory) btnClearHistory.addEventListener('click', () => {
        localStorage.removeItem('syn2sem_history');
        loadHistory();
    });
    // --- End History Logic ---

    // Load Monaco Editor
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.41.0/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        try {
        
        sourceEditor = monaco.editor.create(document.getElementById('source-editor'), {
            value: `public class Demo{\n  public static void main(String args[]){\n    System.out.println("Hello");\n  }\n}`,
            language: 'java',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            scrollbar: {
                alwaysConsumeOnTouch: false
            }
        });
        
        // Auto Detect Language Helper Function
        function autoDetectLanguage(code) {
            if (!code || code.trim().length < 5) return null;
            const text = code.trim();

            if (text.includes('public class') || text.includes('public static void main') || text.includes('System.out.print') || text.includes('Scanner ')) {
                return 'java';
            }
            if (text.includes('#include <iostream>') || text.includes('std::cout') || text.includes('std::cin') || text.includes('std::endl') || text.includes('using namespace std')) {
                return 'cpp';
            }
            if (text.includes('#include <stdio.h>') || text.includes('printf(') || text.includes('scanf(') || text.includes('#include <stdlib.h>')) {
                return 'c';
            }
            if (text.includes('def ') || text.includes('elif ') || (text.includes('print(') && !text.includes(';') && !text.includes('{')) || (text.includes(':') && !text.includes('{') && !text.includes(';'))) {
                return 'python';
            }
            if (text.includes('console.log') || text.includes('let ') || text.includes('const ') || text.includes('function ') || text.includes('=>')) {
                return 'javascript';
            }
            return null;
        }

        // Clear syntax markers when user starts typing, sync diff editor, auto-detect language & auto-analyze
        let autoDetectTimeout = null;
        sourceEditor.onDidChangeModelContent(() => {
            if (window.errorDecorations) window.errorDecorations.clear();
            if (isDiffView && diffEditor) {
                const models = diffEditor.getModel();
                if (models && models.original) {
                    models.original.setValue(sourceEditor.getValue());
                }
            }

            clearTimeout(autoDetectTimeout);
            autoDetectTimeout = setTimeout(() => {
                const code = sourceEditor.getValue();
                const detected = autoDetectLanguage(code);
                if (detected && detected !== sourceLang.value) {
                    sourceLang.value = detected;
                    monaco.editor.setModelLanguage(sourceEditor.getModel(), detected);
                    showToast(`Auto-Detected Source Language: ${detected.toUpperCase()}`);
                }
                
                // Auto-trigger analysis when code is pasted or typed
                if (code.trim().length > 5) {
                    const btnAnalyze = document.getElementById('btn-analyze');
                    if (btnAnalyze) {
                        // Show a small indication that it's analyzing
                        btnAnalyze.click();
                    }
                }
            }, 800);
        });

        targetEditor = monaco.editor.create(targetEditorContainer, {
            value: '',
            language: 'python',
            theme: 'vs-dark',
            automaticLayout: true,
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            scrollbar: {
                alwaysConsumeOnTouch: false
            }
        });

        diffEditor = monaco.editor.createDiffEditor(diffEditorContainer, {
            theme: 'vs-dark',
            automaticLayout: true,
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            renderSideBySide: window.innerWidth > 768, // Inline diff on mobile, side-by-side on laptop
            scrollbar: {
                alwaysConsumeOnTouch: false
            }
        });

        // Initialize permanent models for the diff editor
        const diffOriginalModel = monaco.editor.createModel('', 'java');
        const diffModifiedModel = monaco.editor.createModel('', 'python');
        diffEditor.setModel({
            original: diffOriginalModel,
            modified: diffModifiedModel
        });

        // Toggle Diff View
        const btnToggleDiff = document.getElementById('btn-toggle-diff');
        if (btnToggleDiff) {
            btnToggleDiff.addEventListener('click', () => {
                isDiffView = !isDiffView;
                if (isDiffView) {
                    diffEditorContainer.classList.remove('hidden');
                    const diffHeader = document.getElementById('diff-header');
                    if (diffHeader) diffHeader.classList.remove('hidden');
                    diffEditor.layout();
                } else {
                    diffEditorContainer.classList.add('hidden');
                    const diffHeader = document.getElementById('diff-header');
                    if (diffHeader) diffHeader.classList.add('hidden');
                }
            });
        }

        // Line-by-line hover highlighting (Semantic correspondence)
        let sourceDecorations = [];
        let targetDecorations = [];
        
        function updateHoverLine(lineNum) {
            if (!sourceEditor || !targetEditor) return;
            const decObj = [{
                range: new monaco.Range(lineNum, 1, lineNum, 1),
                options: { isWholeLine: true, className: 'hover-line-highlight' }
            }];
            sourceDecorations = sourceEditor.deltaDecorations(sourceDecorations, decObj);
            targetDecorations = targetEditor.deltaDecorations(targetDecorations, decObj);
        }
        
        function clearHoverLine() {
            if (sourceEditor) sourceDecorations = sourceEditor.deltaDecorations(sourceDecorations, []);
            if (targetEditor) targetDecorations = targetEditor.deltaDecorations(targetDecorations, []);
        }

        sourceEditor.onMouseMove(e => {
            if (e.target && e.target.position) updateHoverLine(e.target.position.lineNumber);
        });
        targetEditor.onMouseMove(e => {
            if (e.target && e.target.position) updateHoverLine(e.target.position.lineNumber);
        });
        sourceEditor.onMouseLeave(() => clearHoverLine());
        targetEditor.onMouseLeave(() => clearHoverLine());

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                const btnTranslate = document.getElementById('btn-translate');
                if (btnTranslate) btnTranslate.click();
            }
        });

        // Gap Analysis View is now automatically controlled by the translation engine

        // Code Theme Toggle for Editor
        const editorThemeToggle = document.querySelector('.theme-toggle-editor');
        editorThemeToggle.addEventListener('click', () => {
            isEditorLight = !isEditorLight;
            monaco.editor.setTheme(isEditorLight ? 'vs' : 'vs-dark');
            editorThemeToggle.innerHTML = isEditorLight ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-palette"></i>';
        });

        // Language Dropdowns change model languages
        sourceLang.addEventListener('change', () => {
            monaco.editor.setModelLanguage(sourceEditor.getModel(), sourceLang.value);
        });
        targetLang.addEventListener('change', () => {
            monaco.editor.setModelLanguage(targetEditor.getModel(), targetLang.value);
        });

        // Predefined Translations (Minimum 6)
        const translationsMap = {
            'java_python': {
                input: `public class Demo{\n  public static void main(String args[]){\n    System.out.println("Hello");\n  }\n}`,
                output: `print("Hello")`
            },
            'python_java': {
                input: `print("Hello")`,
                output: `public class Demo{\n  public static void main(String args[]){\n    System.out.println("Hello");\n  }\n}`
            },
            'c_javascript': {
                input: `#include <stdio.h>\n\nint main() {\n    printf("Hello World");\n    return 0;\n}`,
                output: `console.log("Hello World");`
            },
            'javascript_c': {
                input: `console.log("Hello World");`,
                output: `#include <stdio.h>\n\nint main() {\n    printf("Hello World");\n    return 0;\n}`
            },
            'cpp_python': {
                input: `#include <iostream>\n\nint main() {\n    std::cout << "Data Structures" << std::endl;\n    return 0;\n}`,
                output: `print("Data Structures")`
            },
            'python_cpp': {
                input: `print("Data Structures")`,
                output: `#include <iostream>\n\nint main() {\n    std::cout << "Data Structures" << std::endl;\n    return 0;\n}`
            }
        };

        // Analyze Code Button
        const btnAnalyze = document.getElementById('btn-analyze');
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        const dashboard = document.getElementById('results-dashboard');
        const btnTranslate = document.getElementById('btn-translate');
        let hasSyntaxErrors = false;
        
        btnAnalyze.addEventListener('click', async () => {
            if (!sourceEditor.getValue().trim()) {
                alert("Please enter some code to analyze.");
                return;
            }

            loadingText.textContent = "Analyzing Syntax & Semantics...";
            loadingOverlay.classList.remove('hidden');
            dashboard.classList.add('hidden');

            try {
                const response = await fetch(`/analyze-code?lang=${sourceLang.value}`, {
                    method: 'POST',
                    body: sourceEditor.getValue()
                });
                
                loadingOverlay.classList.add('hidden');
                dashboard.classList.remove('hidden');

                if (response.ok) {
                    const result = await response.json();
                    if (result.error) {
                        alert(result.message);
                        return;
                    }

                    // Syntax Errors
                    const syntaxEl = document.getElementById('res-syntax');
                    
                    // Draw or Clear Editor Decorations
                    if (window.errorDecorations) window.errorDecorations.clear();
                    
                    if (result.markers && result.markers.length > 0) {
                        const decorations = result.markers.map(m => ({
                            range: new monaco.Range(m.line, 1, m.line, 1),
                            options: {
                                isWholeLine: true,
                                className: 'error-line-highlight',
                                hoverMessage: { value: '🤖 **AI Fix:** ' + m.message }
                            }
                        }));
                        window.errorDecorations = sourceEditor.createDecorationsCollection(decorations);
                    }
                    
                    if (result.errorCount > 0) {
                        hasSyntaxErrors = true;
                        btnTranslate.style.opacity = '0.5';
                        btnTranslate.style.cursor = 'not-allowed';
                        syntaxEl.innerHTML = `<i class="fa-solid fa-xmark text-red"></i> ${result.errorCount} syntax errors detected`;
                        syntaxEl.className = 'result-value text-red';
                        document.getElementById('res-gap').textContent = 'Translation Blocked - Fix Errors';
                        document.getElementById('res-score').textContent = 'N/A';
                        document.getElementById('res-time-complexity').textContent = 'N/A';
                        document.getElementById('res-space-complexity').textContent = 'N/A';
                        
                        const suggestions = document.getElementById('res-suggestions');
                        if (result.markers && result.markers.length > 0) {
                            suggestions.innerHTML = result.markers.map((m, i) => `
                                <li style="margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px; list-style-type: none;">
                                    <strong style="color: #ff6b6b;">❌ Line ${m.line} Error:</strong><br>
                                    <div style="font-family: monospace; background: rgba(0,0,0,0.3); padding: 5px 10px; border-radius: 4px; margin: 5px 0; border-left: 3px solid #ff6b6b;">
                                        ${m.sourceLine || '(Empty or Missing Line)'}
                                    </div>
                                    <span style="color: var(--primary-color);"><strong>🤖 AI Fix:</strong> ${m.message}</span>
                                </li>
                            `).join('');
                        } else {
                            suggestions.innerHTML = `<li>AST Analysis aborted due to syntax errors.</li>`;
                        }
                    } else {
                        hasSyntaxErrors = false;
                        btnTranslate.style.opacity = '1';
                        btnTranslate.style.cursor = 'pointer';
                        syntaxEl.innerHTML = '<i class="fa-solid fa-check"></i> No syntax errors detected';
                        syntaxEl.className = 'result-value text-green';
                        document.getElementById('res-gap').textContent = 'Low Risk';
                        document.getElementById('res-score').textContent = '92%';
                        document.getElementById('res-time-complexity').textContent = result.timeComplexity || 'O(1)';
                        document.getElementById('res-space-complexity').textContent = result.spaceComplexity || 'O(1)';
                        
                        const suggestions = document.getElementById('res-suggestions');
                        suggestions.innerHTML = `
                            <li><strong>Time Complexity:</strong> ${result.timeExplanation || 'N/A'}</li>
                            <li><strong>Space Complexity:</strong> ${result.spaceExplanation || 'N/A'}</li>
                            <li><strong>Cyclomatic Complexity:</strong> ${result.cyclomaticComplexity || '1'} (Independent paths)</li>
                            <li><strong>Halstead Volume:</strong> ${result.halsteadVolume || '0.00'}</li>
                            <li><strong>Halstead Difficulty:</strong> ${result.halsteadDifficulty || '0.00'}</li>
                            <li><strong>Data Flow Analysis:</strong> ${result.dataFlow || 'Verified'}</li>
                            <li><strong>Dead Code:</strong> ${result.deadCode || 'None'}</li>
                        `;
                    }
                    
                    document.getElementById('res-confidence').textContent = '96%';

                    // Semantic Logic Breakdown
                    const logicList = document.getElementById('res-logic-breakdown');
                    if (logicList) {
                        logicList.innerHTML = result.breakdown.map(item => `<li>${item}</li>`).join('');
                    }
                    
                    // Smoothly scroll the dashboard into full view after everything is populated
                    setTimeout(() => {
                        dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 50);

                } else {
                    alert("Failed to connect to the server.");
                }
            } catch (e) {
                console.error("Analysis failed:", e);
                loadingOverlay.classList.add('hidden');
                alert("Error during analysis. Make sure the local server is running.");
            }
        });

        // Syn2Sem Engine Translate Button (Calls Backend /translate-code)
        btnTranslate.addEventListener('click', async () => {
            if (hasSyntaxErrors) {
                alert("Please fix the syntax errors in your code and re-analyze before translating!");
                return;
            }

            const inputCode = sourceEditor.getValue();
            if (!inputCode.trim()) {
                alert("Please enter code to translate!");
                return;
            }

            const sLang = sourceLang.value;
            const tLang = targetLang.value;

            loadingText.textContent = "AI Engine Translating...";
            loadingOverlay.classList.remove('hidden');

            try {
                const response = await fetch(`/translate-code?sourceLang=${sLang}&targetLang=${tLang}`, {
                    method: 'POST',
                    body: inputCode
                });

                loadingOverlay.classList.add('hidden');

                if (response.ok) {
                    const result = await response.json();
                    if (result.error) {
                        alert(result.message);
                        return;
                    }

                    // Render translated output in Monaco Editor
                    targetEditor.setValue(result.translatedCode || inputCode);

                    // Update HUD Dashboard Metrics with dynamic Syn2Sem AST scores
                    dashboard.classList.remove('hidden');
                    if (result.similarityScore) document.getElementById('res-score').textContent = result.similarityScore;
                    if (result.gapStatus) document.getElementById('res-gap').textContent = result.gapStatus;
                    if (result.confidence) document.getElementById('res-confidence').textContent = result.confidence;

                    // Auto-open Gap Analysis (Diff View) natively
                    isDiffView = true;
                    diffEditorContainer.classList.remove('hidden');
                    const diffHeader = document.getElementById('diff-header');
                    if (diffHeader) diffHeader.classList.remove('hidden');

                    const models = diffEditor.getModel();
                    if (models) {
                        monaco.editor.setModelLanguage(models.original, sLang);
                        monaco.editor.setModelLanguage(models.modified, tLang);
                        models.original.setValue(inputCode);
                        models.modified.setValue(result.translatedCode);
                    }
                    
                    setTimeout(() => {
                        if (diffEditor) diffEditor.layout();
                    }, 150);

                    // Save translation to history
                    saveHistory(inputCode, result.translatedCode || inputCode, sLang, tLang);

                    showToast("Translated using Syn2Sem AST Engine!");
                } else {
                    alert("Failed to connect to translation server.");
                }
            } catch (err) {
                console.error("Syn2Sem Translate failed:", err);
                loadingOverlay.classList.add('hidden');
                alert("Translation Error. Make sure local server is running ('node server.js').");
            }
        });

        // Clear Button
        const btnClear = document.getElementById('btn-clear');
        btnClear.addEventListener('click', () => {
            sourceEditor.setValue('');
            targetEditor.setValue('');
            if (isDiffView) {
                diffEditor.setModel({
                    original: monaco.editor.createModel('', sourceLang.value),
                    modified: monaco.editor.createModel('', targetLang.value)
                });
            }
            dashboard.classList.add('hidden');
        });

        // Copy Output
        const btnCopy = document.getElementById('btn-copy');
        btnCopy.addEventListener('click', () => {
            const val = targetEditor.getValue();
            if (!val) return;
            navigator.clipboard.writeText(val).then(() => {
                const icon = btnCopy.querySelector('i');
                icon.classList.remove('fa-copy');
                icon.classList.add('fa-check');
                icon.style.color = 'var(--success-color)';
                setTimeout(() => {
                    icon.classList.remove('fa-check');
                    icon.classList.add('fa-copy');
                    icon.style.color = '';
                }, 2000);
            });
        });

        // Open Output in Notepad (via server) or fallback to download
        const btnDownload = document.getElementById('btn-download');
        btnDownload.addEventListener('click', async () => {
            const val = targetEditor.getValue();
            if (!val) return;
            
            try {
                // Attempt to send to local server to open Notepad directly
                const response = await fetch('/open-notepad', {
                    method: 'POST',
                    body: val
                });
                
                if (response.ok) {
                    showToast("Opened directly in Notepad!");
                    return;
                } else {
                    alert("Failed to open Notepad. Is the server running?");
                }
            } catch (e) {
                console.error("Server connection failed:", e);
                alert("Error: Cannot open Notepad directly.\n\nYou are viewing this file directly in the browser (file://). To allow this app to open Notepad on your computer, you MUST run the local server by typing 'node server.js' in the terminal, and then open http://localhost:3000 in your browser.");
            }
        });

        // Generate PDF Report
        const btnDownloadPdf = document.getElementById('btn-download-pdf');
        if (btnDownloadPdf) {
            btnDownloadPdf.addEventListener('click', () => {
                const val = targetEditor.getValue();
                if (!val) {
                    alert("No code to export. Please translate something first!");
                    return;
                }
                
                try {
                    // Check if jsPDF is available
                    if (!window.jspdf) {
                        alert("PDF library is still loading or failed to load. Please wait a moment and try again.");
                        return;
                    }
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF();
                    
                    // Add Title
                    doc.setFontSize(22);
                    doc.setTextColor(30, 41, 59);
                    doc.text(`Translation Report`, 20, 20);
                    
                    // Add Metrics Section
                    doc.setFontSize(12);
                    doc.setTextColor(50, 50, 50);
                    doc.text("--- Analysis Metrics ---", 14, 30);
                    
                    const score = document.getElementById('res-score').textContent;
                    const syntax = document.getElementById('res-syntax').textContent;
                    const confidence = document.getElementById('res-confidence').textContent;
                    const gap = document.getElementById('res-gap').textContent;
                    
                    doc.setFontSize(10);
                    doc.text(`Semantic Similarity Score: ${score}`, 14, 40);
                    doc.text(`Syntax Status: ${syntax}`, 14, 48);
                    doc.text(`Translation Confidence: ${confidence}`, 14, 56);
                    doc.text(`Semantic Gap Prediction: ${gap}`, 14, 64);
                    
                    // Add Code Section
                    doc.setFontSize(12);
                    doc.setTextColor(50, 50, 50);
                    doc.text("--- Translated Output Code ---", 14, 76);
                    
                    doc.setFontSize(9);
                    doc.setFont("courier", "normal");
                    
                    // Split code into lines that fit on PDF pages
                    const splitCode = doc.splitTextToSize(val, 180);
                    doc.text(splitCode, 14, 86);
                    
                    doc.save("Syntax_to_Semantics_Report.pdf");
                    showToast("PDF Report Downloaded!");
                } catch (e) {
                    console.error("PDF Generation failed:", e);
                    alert("Error generating PDF. Make sure you are connected to the internet to load the PDF engine.");
                }
            });
        }

        // Open Output in VS Code (via server)
        const btnVscode = document.getElementById('btn-vscode');
        if (btnVscode) {
            btnVscode.addEventListener('click', async () => {
                const val = targetEditor.getValue();
                if (!val) return;
                
                // Map language to correct extension for syntax highlighting
                const langToExt = {
                    'python': '.py',
                    'java': '.java',
                    'c': '.c',
                    'cpp': '.cpp',
                    'javascript': '.js'
                };
                const ext = langToExt[targetLang.value] || '.txt';
                
                try {
                    const response = await fetch(`/open-vscode?ext=${ext}`, {
                        method: 'POST',
                        body: val
                    });
                    
                    if (response.ok) {
                        showToast("Opened directly in VS Code!");
                    } else {
                        alert("Failed to open VS Code. Is the server running?");
                    }
                } catch (e) {
                    console.error("Server connection failed:", e);
                    alert("Error: Cannot open VS Code directly. Make sure you are running 'node server.js' and viewing the app on http://localhost:3000.");
                }
            });
        }

        // Open Output in Antigravity IDE (via server)
        const btnAntigravity = document.getElementById('btn-antigravity');
        if (btnAntigravity) {
            btnAntigravity.addEventListener('click', async () => {
                const val = targetEditor.getValue();
                if (!val) return;
                
                const langToExt = {
                    'python': '.py',
                    'java': '.java',
                    'c': '.c',
                    'cpp': '.cpp',
                    'javascript': '.js'
                };
                const ext = langToExt[targetLang.value] || '.txt';
                
                try {
                    const response = await fetch(`/open-antigravity?ext=${ext}`, {
                        method: 'POST',
                        body: val
                    });
                    
                    if (response.ok) {
                        showToast("Opened directly in Antigravity IDE!");
                    } else {
                        alert("Failed to open Antigravity IDE. Is the server running?");
                    }
                } catch (e) {
                    console.error("Server connection failed:", e);
                    alert("Error: Cannot open Antigravity IDE directly. Make sure you are running 'node server.js' and viewing the app on http://localhost:3000.");
                }
            });
        }

        // Run Code in Console Output
        const btnRun = document.getElementById('btn-run');
        const consoleContainer = document.getElementById('console-output-container');
        const consoleContent = document.getElementById('console-output-content');
        const btnCloseConsole = document.getElementById('btn-close-console');

        if (btnCloseConsole) {
            btnCloseConsole.addEventListener('click', () => {
                consoleContainer.classList.add('hidden');
            });
        }

        if (btnRun) {
            btnRun.addEventListener('click', async () => {
                const val = targetEditor.getValue();
                if (!val) {
                    alert("No code to run!");
                    return;
                }
                
                consoleContainer.classList.remove('hidden');
                consoleContent.textContent = "Executing code...\n";
                
                try {
                    // Auto-detect target code language to avoid running with wrong runtime
                    let runUrl = `/run-code?lang=${targetLang.value}`;
                    try {
                        const detectedRunLang = autoDetectLanguage ? autoDetectLanguage(val) : null;
                        if (detectedRunLang && detectedRunLang !== targetLang.value) {
                            runUrl += `&autoDetectRun=true`;
                        }
                    } catch (e) { /* ignore detection errors */ }

                    const response = await fetch(runUrl, {
                        method: 'POST',
                        body: val
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        if (result.error) {
                            consoleContent.innerHTML = `<span class="text-red">${result.output}</span>`;
                        } else {
                            consoleContent.textContent = result.output || "Code executed successfully (no output).";
                        }
                    } else {
                        consoleContent.innerHTML = `<span class="text-red">Failed to execute. Is the server running?</span>`;
                    }
                } catch (e) {
                    console.error("Execution failed:", e);
                    consoleContent.innerHTML = `<span class="text-red">Connection error. You must run 'node server.js' and view on localhost:3000 to execute code.</span>`;
                }
                consoleContent.scrollIntoView({ behavior: 'smooth', block: 'end' });
            });
        }
        } catch (err) {
            alert("JS MONACO REQ ERROR:\n" + err.message + "\n" + err.stack);
        }
    }); // End Monaco Require

    // === 5. Mobile Share Feature ===
    const btnShare = document.getElementById('btn-share');
    if (btnShare) {
        btnShare.addEventListener('click', () => {
            const targetLang = document.getElementById('target-lang').value;
            // Get translated code value from target editor
            let translatedCode = "";
            if (typeof targetEditor !== 'undefined' && targetEditor) {
                translatedCode = targetEditor.getValue();
            }

            if (!translatedCode || translatedCode.trim() === "") {
                showToast("Translate some code first!");
                return;
            }

            if (navigator.share) {
                navigator.share({
                    title: `Syn2Sem Translated Code (${targetLang.toUpperCase()})`,
                    text: translatedCode,
                })
                .then(() => console.log('Successful share'))
                .catch((error) => console.log('Error sharing', error));
            } else {
                // Fallback: Copy to clipboard
                navigator.clipboard.writeText(translatedCode);
                showToast("Code copied to clipboard!");
            }
        });
    }

    // Toast Notification
    const toast = document.getElementById('toast');
    function showToast(message = "Translation Completed Successfully") {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
