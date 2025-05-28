// content.js - Enhanced LinkedIn Chat Enhancer with AI Response Generation
console.log('LinkedIn Chat Enhancer: Content script loaded');

class LinkedInChatEnhancer {
    constructor() {
        this.processedMessageBoxes = new WeakSet();
        this.currentUser = this.detectCurrentUser();
        this.chatContexts = new Map(); // Track contexts per chat
        this.activeChatId = null;
        this.observer = null;
        this.messageObserver = null;
        this.initStyles();
        this.initObservers();
        this.setupGlobalListeners();
        this.setupStorageListener();
        this.loadLiveLog();
        this.setupMessageHandlers();
    }

    detectCurrentUser() {
        const selectors = [
            '.global-nav__me-content .t-16',
            '.msg-s-message-group__name',
            '.feed-identity-module__actor-link',
            '.profile-rail-card__actor-link'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const name = element.textContent.trim();
                if (name && name.length > 0) {
                    return name.split('\n')[0].trim();
                }
            }
        }

        return 'You';
    }

    async loadLiveLog() {
        if (window.createLiveLog && window.updateLiveLog) return;

        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('livelog.js');
        await new Promise(resolve => {
            script.onload = resolve;
            (document.head || document.documentElement).appendChild(script);
        });
    }

    initStyles() {
        if (document.getElementById('dm-button-styles')) return;

        const style = document.createElement('style');
        style.id = 'dm-button-styles';
        style.textContent = `
            .dm-buttons-container {
                border: 1px solid #24268d;
                border-radius: 12px;
                padding: 12px;
                margin: 12px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                box-shadow: 0 0 8px rgba(100, 149, 237, 0.2);
                overflow: hidden;
                background: #ffffff;
                position: relative;
                max-width: 100%;
            }
            
            .dm-buttons-scrollable {
                display: flex;
                flex-wrap: nowrap;
                gap: 10px;
                overflow-x: auto;
                scroll-behavior: smooth;
                width: 100%;
                margin: 0;
                padding: 0 4px 4px 4px;
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            
            .dm-buttons-scrollable::-webkit-scrollbar {
                display: none;
            }

            .dm-template-btn {
                position: relative;
                overflow: hidden;
                background: #ffffff;
                color: rgb(0, 51, 204);
                border: 1px solid rgb(0, 51, 204);
                padding: 8px 16px;
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

            .dm-template-btn:hover {
                background: rgb(0, 51, 204);
                color: #ffffff;
            }

            .dm-template-btn:active {
                transform: scale(0.98);
            }

            .dm-template-btn::after {
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

            .dm-template-btn.active::after {
                width: 200px;
                height: 200px;
                opacity: 1;
                transition: width 0.5s ease-out, height 0.5s ease-out, opacity 1s ease;
            }

            .dm-template-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none !important;
                background: #24268d;
                border: 1px solid #24268d;
                color: #ffffff;
            }

            .powered-by {
                width: 100%;
                border-top: 1px solid #e5e7eb;
                padding-top: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                font-size: 14px;
                color: #24268d;
                margin-top: auto;
            }

            .agentlink-dm-wrapper {
                position: relative;
                z-index: 1;
            }

            .ai-loading-container {
                animation: fadeIn 0.3s ease-out;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                background: #f5f5f5;
                margin-bottom: 10px;
                width: 100%;
                padding: 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .ai-loading-message {
                font-size: 14px;
                color: #424242;
            }

            .stop-button {
                margin-left: 10px;
                padding: 3px 8px;
                font-size: 12px;
                background: #ffebee;
                color: #c62828;
                border: 1px solid #ef9a9a;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .stop-button:hover {
                background: #ffcdd2 !important;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .dm-error-message {
                color: #c62828;
                font-size: 14px;
                margin-top: 5px;
                text-align: center;
                width: 100%;
            }

            .scroll-arrow {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                width: 30px;
                height: 30px;
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 2;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transition: all 0.2s;
                opacity: 1;
                visibility: visible;
                transition: opacity 0.2s ease, visibility 0.2s ease;
            }

            .scroll-arrow.hidden {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
            }

            .scroll-arrow:hover {
                background: #f0f0f0;
            }

            .scroll-arrow.left {
                left: 5px;
            }

            .scroll-arrow.right {
                right: 5px;
            }

            .scroll-arrow svg {
                width: 16px;
                height: 16px;
                fill: #24268d;
            }

            .ai-status-popup {
                position: fixed;
                top: 100px;
                left: 100px;
                color: #e0e0ff;
                background: #1a1a2e;
                padding: 0;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(110, 46, 220, 0.3);
                z-index: 9999;
                font-family: 'Segoe UI', Roboto, sans-serif;
                width: 450px;
                max-height: 600px;
                display: flex;
                flex-direction: column;
                border: 1px solid #6e2edc;
                overflow: hidden;
                cursor: move;
            }

            .ai-status-header {
                background: linear-gradient(90deg, #0033cc, #6e2edc);
                color: white;
                padding: 12px 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: bold;
                font-size: 16px;
                user-select: none;
                border-bottom: 1px solid #6e2edc;
            }

            .ai-status-content {
                padding: 15px;
                overflow-y: auto;
                flex-grow: 1;
                background: #1a1a2e;
            }

            .status-message {
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #2a2a3a;
            }

            .status-message.error {
                border-left: 3px solid #ff4d4d;
                padding-left: 10px;
            }

            .status-message.success {
                border-left: 3px solid #4dff4d;
                padding-left: 10px;
            }

            .status-message.info {
                border-left: 3px solid #4d4dff;
                padding-left: 10px;
            }

            .status-message.ai-message {
                border-left: 3px solid #6e2edc;
                padding-left: 10px;
            }

            .status-meta {
                font-size: 12px;
                margin-bottom: 5px;
                font-weight: bold;
            }

            .status-text {
                font-size: 14px;
                line-height: 1.5;
                white-space: pre-wrap;
            }
        `;
        document.head.appendChild(style);
    }

    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (changes.buttonConfigs || changes.personalDmConfigs) {
                document.querySelectorAll('.dm-buttons-container').forEach(container => {
                    const messageContainer = container.nextElementSibling.closest('.msg-form__msg-content-container') || 
                                           container.parentNode.querySelector('.msg-form__msg-content-container');
                    if (messageContainer) {
                        container.remove();
                        this.processedMessageBoxes.delete(messageContainer);
                        this.injectButtons(messageContainer);
                    }
                });
            }
        });
    }

    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === "refreshButtons") {
                document.querySelectorAll('.dm-buttons-container').forEach(container => {
                    const messageContainer = container.nextElementSibling.closest('.msg-form__msg-content-container') || 
                                           container.parentNode.querySelector('.msg-form__msg-content-container');
                    if (messageContainer) {
                        container.remove();
                        this.processedMessageBoxes.delete(messageContainer);
                        this.injectButtons(messageContainer);
                    }
                });
            }
        });
    }

    createAgentLinkBranding() {
        const powered = document.createElement('div');
        powered.className = 'powered-by';
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
        return powered;
    }

    showError(message, container) {
        const existingError = container.querySelector('.dm-error-message');
        if (existingError) existingError.remove();

        const error = document.createElement('div');
        error.className = 'dm-error-message';
        error.textContent = `⚠️ ${message}`;
        
        const loadingContainer = container.querySelector('.ai-loading-container');
        if (loadingContainer) {
            loadingContainer.insertAdjacentElement('afterend', error);
        } else {
            container.insertBefore(error, container.firstChild);
        }

        setTimeout(() => error.remove(), 5000);
    }

    getChatId(messageContainer) {
        // Find the closest chat container and use its ID or participant name as identifier
        const chatContainer = messageContainer.closest('.msg-conversation-container, .msg-thread');
        if (!chatContainer) return 'default';

        // Try to get participant name first
        const participantName = chatContainer.querySelector('.msg-thread-breadcrumb__participant-name')?.textContent.trim() || 
                              chatContainer.querySelector('.msg-s-message-group__name')?.textContent.trim();
        
        if (participantName) return `chat-${participantName}`;

        // Fallback to data-id or generate a hash from the container
        const dataId = chatContainer.getAttribute('data-id');
        if (dataId) return `chat-${dataId}`;

        // Final fallback - hash the container's HTML
        return `chat-${Array.from(chatContainer.children).reduce((acc, child) => acc + child.textContent, '').hashCode()}`;
    }

    async injectButtons(messageContainer) {
        if (this.processedMessageBoxes.has(messageContainer)) return;
        this.processedMessageBoxes.add(messageContainer);

        let wrapper = messageContainer.previousElementSibling;
        if (wrapper && wrapper.classList.contains('agentlink-dm-wrapper')) {
            return;
        }

        wrapper = document.createElement('div');
        wrapper.className = 'agentlink-dm-wrapper';

        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'dm-buttons-container';

        const scrollableContainer = document.createElement('div');
        scrollableContainer.className = 'dm-buttons-scrollable';

        const poweredBy = this.createAgentLinkBranding();

        // Get both message and DM configs
        const { buttonConfigs = [], personalDmConfigs = [] } = await new Promise(resolve => {
            chrome.storage.local.get(['buttonConfigs', 'personalDmConfigs'], resolve);
        });

        // Combine both configs (or use just one depending on context)
        const allConfigs = [...buttonConfigs, ...personalDmConfigs];
        if (allConfigs.length === 0) return;

        // Create scroll arrows
        const leftArrow = document.createElement('button');
        leftArrow.className = 'scroll-arrow left hidden';
        leftArrow.innerHTML = `<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>`;
        leftArrow.addEventListener('click', (e) => {
            e.preventDefault();
            scrollableContainer.scrollBy({ left: -200, behavior: 'smooth' });
        });

        const rightArrow = document.createElement('button');
        rightArrow.className = 'scroll-arrow right';
        rightArrow.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>`;
        rightArrow.addEventListener('click', (e) => {
            e.preventDefault();
            scrollableContainer.scrollBy({ left: 200, behavior: 'smooth' });
        });

        // Add scroll event listener
        scrollableContainer.addEventListener('scroll', () => {
            this.updateArrowVisibility(scrollableContainer, leftArrow, rightArrow);
        });

        allConfigs.forEach(config => {
            const btn = document.createElement('button');
            btn.className = 'dm-template-btn';
            btn.textContent = config.name || config.label || 'Template';
            btn.setAttribute('data-original-text', config.name);
            btn.type = 'button';

            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (btn.disabled) return;

                const chatId = this.getChatId(messageContainer);
                const abortController = new AbortController();
                let isCancelled = false;

                const buttons = scrollableContainer.querySelectorAll('.dm-template-btn');
                const originalTexts = new Map(Array.from(buttons).map(btn => [btn, btn.textContent]));

                try {
                    // Disable all buttons during generation
                    buttons.forEach(btn => {
                        btn.disabled = true;
                        btn.textContent = 'Generating...';
                    });

                    // Get conversation context for this specific chat
                    await this.updateConversationContext(chatId);
                    const profileData = await this.gatherCompleteProfileData();
                    const aiSettings = await this.getAISettings();

                    // Get the context for this specific chat
                    const context = this.chatContexts.get(chatId) || {};
                    const participantName = context.participantName || 'Unknown';

                    // Get the last message that wasn't from the current user
                    const lastMessageFromThem = [...(context.lastMessages || [])].reverse().find(msg => !msg.isCurrentUser);
                    const lastMessageSender = lastMessageFromThem?.sender || participantName;

                    if (config.name === 'Clear') {
                        this.clearMessageText(messageContainer);
                        return;
                    }

                    const response = await chrome.runtime.sendMessage({
                        action: config.personal ? "generatePersonalDm" : "generateMessage",
                        participantData: {
                            participantName,
                            lastMessages: context.lastMessages || [],
                            lastMessageSender,
                            isReplyingToLastSender: !!lastMessageFromThem
                        },
                        profileData,
                        config,
                        aiSettings,
                        signal: abortController.signal,
                        conversationContext: {
                            lastMessages: context.lastMessages || [],
                            isNewConversation: (context.lastMessages || []).length === 0
                        }
                    });

                    if (isCancelled) throw new Error('Generation cancelled by user');
                    if (response?.error) throw new Error(response.error);
                    if (!response?.message) throw new Error('AI could not generate message');

                    this.insertMessage(response.message, messageContainer);
                } catch (err) {
                    console.error('Error generating AI message:', err);
                    this.showError(err.message || 'AI could not generate message', buttonWrapper);
                } finally {
                    // Restore buttons
                    buttons.forEach(btn => {
                        btn.disabled = false;
                        btn.textContent = originalTexts.get(btn) || btn.textContent;
                    });
                }
            });

            scrollableContainer.appendChild(btn);
        });

        // Initial arrow visibility check
        setTimeout(() => {
            this.updateArrowVisibility(scrollableContainer, leftArrow, rightArrow);
        }, 100);

        buttonWrapper.appendChild(leftArrow);
        buttonWrapper.appendChild(scrollableContainer);
        buttonWrapper.appendChild(rightArrow);
        buttonWrapper.appendChild(poweredBy);
        wrapper.appendChild(buttonWrapper);

        messageContainer.parentNode.insertBefore(wrapper, messageContainer);
    }

    updateArrowVisibility(scrollableContainer, leftArrow, rightArrow) {
        const scrollLeft = scrollableContainer.scrollLeft;
        const scrollWidth = scrollableContainer.scrollWidth;
        const clientWidth = scrollableContainer.clientWidth;

        if (scrollLeft <= 10) {
            leftArrow.classList.add('hidden');
        } else {
            leftArrow.classList.remove('hidden');
        }

        if (scrollLeft >= scrollWidth - clientWidth - 10) {
            rightArrow.classList.add('hidden');
        } else {
            rightArrow.classList.remove('hidden');
        }
    }

    async updateConversationContext(chatId = null) {
        try {
            if (!chatId) {
                // If no chatId provided, try to find the active chat
                const activeChat = document.querySelector('.msg-conversation-container[data-active="true"]') || 
                                 document.querySelector('.msg-thread[data-active="true"]') ||
                                 document.querySelector('.msg-conversation-container') || 
                                 document.querySelector('.msg-thread');
                
                if (activeChat) {
                    chatId = this.getChatId(activeChat);
                } else {
                    chatId = 'default';
                }
            }

            // Get the message list for this chat
            const messageList = document.querySelector(`#${chatId} .msg-s-message-list`) || 
                             document.querySelector(`#${chatId} .msg-thread`) ||
                             document.querySelector('.msg-s-message-list') || 
                             document.querySelector('.msg-thread');

            if (!messageList) {
                this.chatContexts.set(chatId, { lastMessages: [] });
                return;
            }

            // Extract the last 5 messages
            const lastMessages = this.extractMessages(messageList, 5);
            
            // Get participant name for this specific chat
            const participantName = messageList.closest('.msg-conversation-container')?.querySelector('.msg-thread-breadcrumb__participant-name')?.textContent.trim() || 
                                  messageList.querySelector('.msg-s-message-group__name')?.textContent.trim() || 
                                  'Unknown';
            
            const context = {
                participantName,
                lastMessages: lastMessages.map(msg => ({
                    ...msg,
                    isCurrentUser: msg.sender === this.currentUser
                }))
            };
            
            // Store context for this specific chat
            this.chatContexts.set(chatId, context);
            
            // Also update the active chat ID
            this.activeChatId = chatId;
            
        } catch (error) {
            console.error('Error updating conversation context:', error);
            this.chatContexts.set(chatId || 'default', { lastMessages: [] });
        }
    }

    extractMessages(messageContainer, limit = 5) {
        const messages = [];
        if (!messageContainer) return messages;

        // Variables to store the last known sender, time, and date
        let lastKnownSender = null;
        let lastKnownTime = null;
        let lastKnownDate = null;
        
        // Select all message list items within this container
        const messageItems = messageContainer.querySelectorAll('.msg-s-message-list__event, .msg-event');
        
        // Iterate over all message items
        messageItems.forEach(item => {
            // Extract date if available
            const dateHeading = item.querySelector('.msg-s-message-list__time-heading, .msg-time-heading');
            if (dateHeading) {
                lastKnownDate = dateHeading.textContent.trim();
            }
            
            // Extract all messages within this event
            const messageElements = item.querySelectorAll('.msg-s-event-listitem, .msg-event-listitem');
            
            messageElements.forEach(messageItem => {
                const senderElement = messageItem.querySelector('.msg-s-message-group__name, .msg-sender');
                const timeElement = messageItem.querySelector('.msg-s-message-group__timestamp, .msg-timestamp');
                const messageElement = messageItem.querySelector('.msg-s-event-listitem__body, .msg-content');
                
                // Use the last known sender, time, and date if current ones are missing
                const sender = senderElement ? senderElement.textContent.trim() : lastKnownSender;
                const time = timeElement ? timeElement.textContent.trim() : lastKnownTime;
                const message = messageElement ? messageElement.textContent.trim() : null;
                
                // Update last known sender, time, and date if current ones are valid
                if (senderElement) lastKnownSender = sender;
                if (timeElement) lastKnownTime = time;
                
                // Add the message to the array
                if (message) {
                    messages.push({
                        sender,
                        message,
                        time,
                        date: lastKnownDate,
                        isCurrentUser: sender === this.currentUser
                    });
                }
            });
        });
        
        // Return only the last `limit` messages
        return messages.slice(-limit);
    }

    insertMessage(message, messageContainer) {
        const messageBox = messageContainer.querySelector('.msg-form__contenteditable[contenteditable="true"]') || 
                         messageContainer.querySelector('div[role="textbox"][aria-label*="message"]') || 
                         messageContainer.querySelector('div.msg-form__contenteditable');
        
        if (messageBox) {
            messageBox.innerHTML = '<p><br></p>';
            messageBox.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, message);
            
            const inputEvent = new Event('input', { bubbles: true });
            const changeEvent = new Event('change', { bubbles: true });
            messageBox.dispatchEvent(inputEvent);
            messageBox.dispatchEvent(changeEvent);
        }
    }

    clearMessageText(messageContainer) {
        const textbox = messageContainer.querySelector('.msg-form__contenteditable[contenteditable="true"]') || 
                       messageContainer.querySelector('div[role="textbox"][aria-label*="message"]') || 
                       messageContainer.querySelector('div.msg-form__contenteditable');
        
        if (textbox) {
            textbox.innerHTML = '';
            textbox.dispatchEvent(new Event("input", { bubbles: true }));
        }
    }

    async getAISettings() {
        const { aiSettings = {} } = await chrome.storage.local.get(['aiSettings']);
        return aiSettings;
    }

    async gatherCompleteProfileData() {
        // If we're on a profile page, get detailed profile data
        if (window.location.href.includes('linkedin.com/in/')) {
            return {
                name: document.querySelector('h1')?.innerText.trim() || 'Name not found',
                designation: document.querySelector('.text-body-medium.break-words')?.innerText.trim() || 'Designation not found',
                location: document.querySelector('span.text-body-small.inline.t-black--light.break-words')?.innerText.trim() || 'Location not found',
                about: await this.getAboutSection(),
                experience: await this.extractExperienceData()
            };
        }
        
        // For messaging pages, try to get basic info from the conversation
        const participantName = document.querySelector('.msg-thread-breadcrumb__participant-name')?.textContent.trim() || 
                              document.querySelector('.msg-s-message-group__name')?.textContent.trim() || 
                              'Unknown';
        
        return {
            name: participantName,
            designation: '',
            location: '',
            about: '',
            experience: []
        };
    }

    async getAboutSection() {
        let aboutSection = document.querySelector('#about');
        if (aboutSection) {
            let section = aboutSection.closest('section');
            let contentDiv = section.querySelector('div.display-flex.ph5.pv3');
            
            if (contentDiv) {
                return Array.from(contentDiv.querySelectorAll('span:not(.visually-hidden)'))
                    .map(span => span.innerText.trim())
                    .join(' ');
            }
        }
        return "";
    }

    async extractExperienceData() {
        const experienceData = { experience: [] };
        const experienceHeading = [...document.querySelectorAll('h2')].find(h =>
            h.textContent.trim().includes('Experience')
        );

        if (experienceHeading) {
            const experienceSection = experienceHeading.closest('section');
            if (experienceSection) {
                const experienceItems = experienceSection.querySelectorAll('li.artdeco-list__item');

                experienceItems.forEach(item => {
                    let texts = [];
                    const allTextElements = item.querySelectorAll('.t-bold, .t-14.t-normal, .t-black--light, strong');

                    allTextElements.forEach(element => {
                        let text = element.textContent
                            .replace(/<!---->/g, '')
                            .replace(/\s+/g, ' ')
                            .trim();

                        if (text.length > 1) {
                            const halfLength = Math.floor(text.length / 2);
                            if (text.substring(0, halfLength) === text.substring(halfLength)) {
                                text = text.substring(0, halfLength);
                            }
                        }

                        if (text && !texts.includes(text)) {
                            texts.push(text);
                        }
                    });

                    texts = [...new Set(texts)].filter(text => text && text !== 'Experience');
                    if (texts.length > 0) experienceData.experience.push({ texts });
                });
            }
        }

        return experienceData;
    }

    setupGlobalListeners() {
        // Listen for message button clicks to open chat windows
        document.addEventListener('click', async (e) => {
            const messageButton = e.target.closest('button[aria-label*="Message"], button[aria-label*="message"]');
            if (messageButton) {
                setTimeout(() => {
                    // Find the newly opened chat and update its context
                    const newChat = document.querySelector('.msg-conversation-container[data-active="true"]') || 
                                   document.querySelector('.msg-thread[data-active="true"]');
                    if (newChat) {
                        const chatId = this.getChatId(newChat);
                        this.updateConversationContext(chatId);
                    }
                }, 1000);
            }
        });

        // Handle SPA navigation
        let lastUrl = location.href;
        new MutationObserver(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                this.updateConversationContext();
            }
        }).observe(document, { subtree: true, childList: true });
    }

    initObservers() {
        // Observer for message containers
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const messageContainer = node.querySelector('.msg-form__msg-content-container') || 
                                               node.closest('.msg-form__msg-content-container');
                        if (messageContainer) {
                            this.injectButtons(messageContainer);
                        }
                    }
                });
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Observer for message changes in active conversation
        this.messageObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                    // Find the closest chat container
                    const chatContainer = mutation.target.closest('.msg-conversation-container, .msg-thread');
                    if (chatContainer) {
                        const chatId = this.getChatId(chatContainer);
                        this.updateConversationContext(chatId);
                    }
                }
            });
        });

        // Observe all existing chat containers
        document.querySelectorAll('.msg-s-message-list, .msg-thread').forEach(messageList => {
            this.messageObserver.observe(messageList, {
                childList: true,
                subtree: true
            });
        });

        // Process existing message containers
        document.querySelectorAll('.msg-form__msg-content-container').forEach(container => {
            this.injectButtons(container);
        });
    }
}

// Initialize when on LinkedIn
if (window.location.hostname.includes('linkedin.com')) {
    const enhancer = new LinkedInChatEnhancer();
    
    // Make available globally for debugging
    window.LinkedInChatEnhancer = enhancer;
}
