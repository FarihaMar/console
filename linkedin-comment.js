// ========== LINKEDIN COMMENT AUTOMATION ========== //
(function() {
    if (!window.location.href.includes('linkedin.com/feed')) return;

    // First load livelog.js
    const loadLiveLog = () => {
        return new Promise((resolve) => {
            if (window.createLiveLog && window.updateLiveLog) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('livelog.js');
            script.onload = resolve;
            (document.head || document.documentElement).appendChild(script);
        });
    };

    // Main initialization
    (async function init() {
        try {
            console.log('Ready to comment', 1);


            const processedCommentBoxes = new WeakSet();
            const MAX_RETRIES = 3;
            const RETRY_DELAY = 500;

            function createStyles() {
                console.log('Initializing comment styles', 1);
                if (document.getElementById('dynamic-comment-styles')) return;

                const style = document.createElement('style');
                style.id = 'dynamic-comment-styles';
                style.textContent = `
                    .dynamic-comment-buttons {
                        border: 1px solid #24268d;
                        border-radius: 12px;
                        padding: 10px;
                        margin-top: 15px;
                        margin-left: 56px;
                        margin-right: 15px;
                        margin-bottom: 10px;
                        display: flex;
                        flex-wrap: wrap;
                        gap: 10px;
                        box-shadow: 0 0 8px rgba(100, 149, 237, 0.2);
                        overflow-x: auto;
                        background: #ffffff;
                        justify-content: flex-start;
                    }

                    .dynamic-comment-buttons, .comment-btn {
                        box-sizing: border-box;
                    }

                    .comment-btn {
                        position: relative;
                        overflow: hidden;
                        background: #ffffff;
                        color: rgb(0, 51, 204);
                        border: 1px solid rgb(0, 51, 204);
                        padding: 5px 10px;
                        border-radius: 50px;
                        font-size: 14px;
                        font-weight: normal;
                        cursor: pointer;
                        white-space: nowrap;
                        flex-shrink: 0;
                        min-width: unset;
                        text-align: center;
                        transition: all 0.4s ease;
                    }
            
                    .comment-btn:hover {
                        background: rgb(0, 51, 204);
                        color: #ffffff;
                    }
            
                    .comment-btn:active {
                        transform: scale(0.98);
                    }
            
                    .comment-btn::after {
                        content: '';
                        position: absolute;
                        top: var(--y);
                        left: var(--x);
                        width: 0;
                        height: 0;
                        background: rgba(255, 255, 255, 0.3);
                        border-radius: 50%;
                        transform: translate(-50%, -50%);
                        opacity: 0;
                    }
                    .comment-btn.active::after {
                        width: 200px;
                        height: 200px;
                        opacity: 1;
                        transition: width 0.5s ease-out, height 0.5s ease-out, opacity 1s ease;
                    }
            
                    .comment-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none !important;
                        background: #24268d;
                        border: 1px solid #24268d;
                        color: #ffffff;
                    }

                    .ai-loading-message {
                        animation: pulse 1.5s infinite;
                        font-size: 14px;
                        margin: 10px 0;
                    }
                    @keyframes pulse {
                        0% { opacity: 0.6; }
                        50% { opacity: 1; }
                        100% { opacity: 0.6; }
                    }

                    .ai-loading-container {
                        animation: fadeIn 0.3s ease-out;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        background: #f5f5f5;
                        margin-bottom: 10px;
                    }
                    .ai-loading-message {
                        font-size: 14px;
                        color: #424242;
                    }
                    .stop-button:hover {
                        background: #ffcdd2 !important;
                    }
            
                    .dynamic-comment-error {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        background: #ffebee;
                        color: #c62828;
                        padding: 12px 16px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                        z-index: 9999;
                        max-width: 300px;
                        animation: fadeIn 0.3s;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `;
                document.head.appendChild(style);
            }

            // Add ripple effect JavaScript
            document.addEventListener('DOMContentLoaded', function() {
                document.querySelectorAll('.comment-btn').forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        const rect = this.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        
                        this.style.setProperty('--x', x + 'px');
                        this.style.setProperty('--y', y + 'px');
                        
                        this.classList.add('active');
                        
                        setTimeout(() => {
                            this.classList.remove('active');
                        }, 1000);
                    });
                });
            });

            function showError(message) {
                console.log(`Error: ${message}`, 0);
                const existing = document.querySelector('.dynamic-comment-error');
                if (existing) existing.remove();
                
                const error = document.createElement('div');
                error.className = 'dynamic-comment-error';
                error.textContent = `⚠️ ${message}`;
                document.body.appendChild(error);
                
                setTimeout(() => error.remove(), 5000);
            }

            async function extractPostText(postContainer) {
                console.log('Analyzing post content', 1);
                const selectors = [
                    '.feed-shared-inline-show-more-text',
                    '.update-components-text',
                    '.break-words',
                    '[data-test-id="post-text"]',
                    '.main-feed .occludable-update'
                ];
                
                for (const selector of selectors) {
                    const element = postContainer.querySelector(selector);
                    if (element) {
                        return (element.innerText || element.textContent)
                            .replace(/\s+/g, ' ')
                            .trim();
                    }
                }
                return null;
            }

            async function pasteComment(commentText, commentBox) {
                console.log('Inserting comment', 2);
                try {
                    commentBox.focus();
                    await new Promise(resolve => setTimeout(resolve, 200));
            
                    const mentions = Array.from(commentBox.querySelectorAll('a.ql-mention'));
                    commentBox.innerHTML = '';
                    mentions.forEach(mention => {
                        commentBox.appendChild(mention);
                        commentBox.appendChild(document.createTextNode(' '));
                    });
            
                    const p = document.createElement('p');
                    p.textContent = commentText;
                    commentBox.appendChild(p);
            
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(commentBox);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
            
                    ['input', 'change', 'keydown', 'keyup', 'blur', 'focus'].forEach(eventType => {
                        commentBox.dispatchEvent(new Event(eventType, { bubbles: true }));
                    });

                    console.log('Comment inserted successfully', 1);
                    return true;
                } catch (error) {
                    console.log(`Failed to paste: ${error.message}`, 0);
                    console.error("Paste Comment Error:", error);
                    showError("Failed to paste comment - please ensure comment box is open");
                    return false;
                }
            }

            async function getAISettings() {
                console.log('Loading AI settings', 0);
                return new Promise(resolve => {
                    chrome.storage.local.get(['aiSettings'], (result) => {
                        resolve(result.aiSettings || {});
                    });
                });
            }

            async function handleButtonClick(button, config, commentBox, postContainer) {
                const container = button.closest('.dynamic-comment-buttons');
                const buttons = container ? container.querySelectorAll('.comment-btn') : [button];
                const originalTexts = new Map(Array.from(buttons).map(btn => [btn, btn.textContent]));
                
                // Create abort controller for cancellation
                const abortController = new AbortController();
                let isCancelled = false;
            
                try {
                    // Hide all buttons and show loading message with stop button
                    const loadingContainer = document.createElement('div');
                    loadingContainer.className = 'ai-loading-container';
                    loadingContainer.style.display = 'flex';
                    loadingContainer.style.alignItems = 'center';
                    loadingContainer.style.justifyContent = 'space-between';
                    loadingContainer.style.width = '100%';
                    loadingContainer.style.padding = '10px';
                    
                    const loadingMessage = document.createElement('div');
                    loadingMessage.className = 'ai-loading-message';

                    loadingMessage.innerHTML = `
                    <span style="display:inline-flex;align-items:center;">
                      <svg width="20" height="20" viewBox="0 0 50 50" style="margin-right:8px;">
                        <circle cx="25" cy="25" r="20" fill="none" stroke="#7f00ff" stroke-width="5" stroke-linecap="round" stroke-dasharray="31.4 31.4" transform="rotate(-90 25 25)">
                          <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/>
                        </circle>
                      </svg>
                      AgentLink is generating your reply...
                    </span>
                  `;                           
                    const stopButton = document.createElement('button');
                    stopButton.className = 'stop-button';
                    stopButton.innerHTML = '✕ Stop';
                    stopButton.style.marginLeft = '10px';
                    stopButton.style.padding = '3px 8px';
                    stopButton.style.fontSize = '12px';
                    stopButton.style.background = '#ffebee';
                    stopButton.style.color = '#c62828';
                    stopButton.style.border = '1px solid #ef9a9a';
                    stopButton.style.borderRadius = '4px';
                    stopButton.style.cursor = 'pointer';
                    stopButton.style.transition = 'all 0.2s';
                    
                    stopButton.onmouseover = () => {
                        stopButton.style.background = '#ffcdd2';
                    };
                    stopButton.onmouseout = () => {
                        stopButton.style.background = '#ffebee';
                    };
                    
                    stopButton.onclick = () => {
                        isCancelled = true;
                        abortController.abort();
                        loadingMessage.textContent = '⏹️ Stopping generation...';
                        stopButton.disabled = true;
                    };
                    
                    loadingContainer.appendChild(loadingMessage);
                    loadingContainer.appendChild(stopButton);
                    
                    // Hide all buttons
                    buttons.forEach(btn => {
                        btn.style.display = 'none';
                    });
                    
                    // Insert loading container
                    container.insertBefore(loadingContainer, container.firstChild);
                    
                    console.log('Extracting post text', 1);
                    const postText = await extractPostText(postContainer);
                    if (!postText) throw new Error('No post text found');
            
                    if (isCancelled) throw new Error('Generation cancelled by user');
            
                    console.log('Generating AI response', 2);
                    const response = await chrome.runtime.sendMessage({
                        action: "generateComment",
                        postText,
                        config,
                        aiSettings: await getAISettings(),
                        signal: abortController.signal
                    });
            
                    if (isCancelled) throw new Error('Generation cancelled by user');
                    if (response?.error) throw new Error(response.error);
                    if (!response?.comment) throw new Error('Failed to generate comment');
            
                    console.log('Posting comment', 2);
                    let commentInserted = false;
                    for (let i = 0; i < MAX_RETRIES; i++) {
                        if (isCancelled) break;
                        commentInserted = await pasteComment(response.comment, commentBox);
                        if (commentInserted) break;
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
                    }
            
                    if (isCancelled) throw new Error('Generation cancelled by user');
                    console.log('Comment posted!', 1);
            
                    if (!commentInserted) throw new Error('Could not paste comment');
            
                } catch (error) {
                    console.log(`Error: ${error.message}`, 0);
                    
                    if (error.message !== 'Generation cancelled by user') {
                        console.error('Comment Error:', error);
                        showError(error.message);
                    }
                    
                    // Show cancellation/error state
                    const loadingContainer = container.querySelector('.ai-loading-container');
                    if (loadingContainer) {
                        const loadingMessage = loadingContainer.querySelector('.ai-loading-message');
                        const stopButton = loadingContainer.querySelector('.stop-button');
                        
                        if (isCancelled) {
                            loadingMessage.textContent = '❌ Generation stopped';
                            loadingMessage.style.color = '#c62828';
                        } else {
                            loadingMessage.textContent = '❌ Error generating reply';
                            loadingMessage.style.color = '#c62828';
                        }
                        
                        if (stopButton) stopButton.remove();
                        
                        setTimeout(() => {
                            loadingContainer.remove();
                            buttons.forEach(btn => {
                                btn.style.display = '';
                                btn.textContent = originalTexts.get(btn);
                            });
                        }, isCancelled ? 1000 : 2000);
                    }
                    
                    if (!isCancelled) {
                        chrome.runtime.sendMessage({
                            action: "logError",
                            error: error.message,
                            context: "handleButtonClick"
                        });
                    }
                } finally {
                    if (!isCancelled) {
                        // Remove loading container and restore buttons
                        const loadingContainer = container.querySelector('.ai-loading-container');
                        if (loadingContainer) {
                            loadingContainer.remove();
                        }
                        
                        buttons.forEach(btn => {
                            btn.style.display = '';
                            btn.disabled = false;
                            btn.textContent = originalTexts.get(btn) || btn.getAttribute('data-original-text') || config.name;
                        });
                    }
                }
            }

            async function addDynamicButtonsToCommentBox(commentBox) {
                if (processedCommentBoxes.has(commentBox)) return;
                
                // Skip reply boxes (they have 'comments-comment-box--reply' class)
                if (commentBox.classList.contains('comments-comment-box--reply')) {
                    console.log('Skipping reply comment box', 0);
                    return;
                }
                
                processedCommentBoxes.add(commentBox);
                createStyles();
                
                const { commentConfigs = [] } = await new Promise(resolve => {
                    chrome.storage.local.get(['commentConfigs'], resolve);
                });
                
                if (commentConfigs.length === 0) return;
                
                // Remove any existing buttons first
                const existing = commentBox.querySelector('.dynamic-comment-buttons');
                if (existing) existing.remove();
                
                const container = document.createElement('div');
                container.className = 'dynamic-comment-buttons';
                
                commentConfigs.forEach(config => {
                    const button = document.createElement('button');
                    button.className = 'comment-btn';
                    button.textContent = config.name;
                    button.setAttribute('data-original-text', config.name);
                    
                    const postContainer = commentBox.closest(
                        '.feed-shared-update-v2, ' +
                        '.update-components-update-v2, ' +
                        '.scaffold-finite-scroll__content > div > div'
                    );
                    
                    button.addEventListener('click', () => {
                        const commentEditor = commentBox.querySelector('.ql-editor[contenteditable="true"]') || 
                                             commentBox.querySelector('[role="textbox"][contenteditable="true"]');
                        if (commentEditor) {
                            handleButtonClick(button, config, commentEditor, postContainer);
                        }
                    });
                    
                    container.appendChild(button);
                });

                // Add Powered by AgentLink section
                const powered = document.createElement('div');
                powered.style.width = '100%';
                powered.style.borderTop = '1px solid #e5e7eb';
                powered.style.paddingTop = '8px';
                powered.style.display = 'flex';
                powered.style.alignItems = 'center';
                powered.style.justifyContent = 'center';
                powered.style.gap = '6px';
                powered.style.fontSize = '14px';
                powered.style.color = '#24268d';
                powered.innerHTML = `
                <span style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:linear-gradient(to right,#4d7cfe,#9f7aea);border-radius:5px;">
                    <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none'>
                    <path d='M12 8V4H8' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                    <rect width='16' height='12' x='4' y='8' rx='2' stroke='white' stroke-width='2'/>
                    <path d='M2 14h2' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                    <path d='M20 14h2' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                    <path d='M15 13v2' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                    <path d='M9 13v2' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                    </svg>
                </span>
                <span style="font-weight:500;">Powered by AgentLink</span>
                `;
                container.appendChild(powered);
    
                // Insert after the comment box form
                const commentBoxParent = commentBox.parentNode;
                if (commentBoxParent) {
                    commentBoxParent.insertBefore(container, commentBox.nextSibling);
                } else {
                    commentBox.appendChild(container);
                }
                
                console.log('Buttons added below comment box', 0);
            }

            function initObserver() {
                
                const observer = new MutationObserver(mutations => {
                    mutations.forEach(mutation => {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Check for main comment box
                                if (node.matches('.comments-comment-box--cr:not(.comments-comment-box--reply)')) {
                                    addDynamicButtonsToCommentBox(node);
                                }
                                // Check for nested comment boxes
                                const commentBoxes = node.querySelectorAll?.('.comments-comment-box--cr:not(.comments-comment-box--reply)') || [];
                                commentBoxes.forEach(box => addDynamicButtonsToCommentBox(box));
                            }
                        });
                    });
                });
                
                // Also observe when comment button is clicked to show the comment box
                document.addEventListener('click', (event) => {
                    if (event.target.matches('button[aria-label*="Comment"], button[aria-label*="comment"], button[data-control-name="comment"]')) {
                        // Wait for the comment box to appear
                        setTimeout(() => {
                            const commentBox = document.querySelector('.comments-comment-box--cr:not(.comments-comment-box--reply)');
                            if (commentBox) {
                                addDynamicButtonsToCommentBox(commentBox);
                            }
                        }, 500);
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                // Process existing comment boxes
                document.querySelectorAll('.comments-comment-box--cr:not(.comments-comment-box--reply)').forEach(commentBox => {
                    addDynamicButtonsToCommentBox(commentBox);
                });
                
                return observer;
            }
            // Initialize observer
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initObserver);
            } else {
                initObserver();
            }

        } catch (error) {
            console.error('Initialization error:', error);
        }
    })();
})();