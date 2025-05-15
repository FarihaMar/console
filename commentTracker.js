// commentTracker.js
class LinkedInCommentTracker {
    constructor() {
      this.initialize();
      console.log('[Comment Tracker] Initialized - Tracking comments/replies');
    }
  
    async initialize() {
      await this.initStorage();
      this.setupButtonListeners();
      this.setupCustomButtonListeners();
    }
  
    async initStorage() {
      const data = await chrome.storage.local.get('linkedinComments');
      if (!data.linkedinComments) {
        await chrome.storage.local.set({ linkedinComments: [] });
      }
    }
  
    setupButtonListeners() {
      // Listen for native LinkedIn comment/reply button clicks
      document.addEventListener('click', async (e) => {
        const button = e.target.closest('button.comments-comment-box__submit-button--cr');
        if (!button) return;
  
        const buttonText = button.querySelector('span.artdeco-button__text')?.textContent?.trim();
        if (!['Comment', 'Reply'].includes(buttonText)) return;
  
        await this.processCommentAction(button, buttonText === 'Reply');
      });
    }
  
    setupCustomButtonListeners() {
      // Listen for custom comment button clicks
      document.addEventListener('click', async (e) => {
        const button = e.target.closest('.comment-btn');
        if (!button) return;
  
        const commentBox = button.closest('.dynamic-comment-buttons')?.previousElementSibling;
        if (!commentBox?.classList.contains('comments-comment-box--cr')) return;
  
        await this.processCommentAction(button, false, button.dataset.originalText);
      });
    }
  
    async processCommentAction(button, isReply, presetType = null) {
      const commentBox = button.closest('.comments-comment-box--cr, .comments-comment-box--reply');
      const postContainer = commentBox?.closest('.feed-shared-update-v2, .update-components-update-v2');
      
      if (!postContainer || !commentBox) return;
  
      const commentContent = commentBox.querySelector('.ql-editor[contenteditable="true"]')?.textContent?.trim();
      if (!commentContent) return;
  
      const commentData = {
        ...this.extractPostData(postContainer),
        ...this.extractAuthorDetails(postContainer),
        ...this.extractTimestamps(postContainer),
        comment_id: `comment_${Date.now()}`,
        comment_content: commentContent,
        is_reply: isReply,
        replied_to: isReply ? this.extractRepliedToContent(commentBox) : null,
        commented_at: new Date().toISOString(),
        button_id: button.id,
        button_class: button.className,
        preset_type: presetType,
        ai_response: this.extractAIResponse(commentBox),
        engagement_metrics: this.extractEngagementMetrics(postContainer)
      };
  
      await this.saveComment(commentData);
      console.log('[Comment Tracker] Comment saved:', commentData);
    }
  
    extractPostData(postContainer) {
      return {
        post_id: postContainer.dataset.urn || postContainer.id || `post_${Date.now()}`,
        post_content: this.extractPostContent(postContainer),
        source: 'feed'
      };
    }
  
    extractAuthorDetails(postContainer) {
      const authorLink = postContainer.querySelector('.update-components-actor__meta-link');
      const authorName = authorLink?.querySelector('.update-components-actor__title .t-bold')?.textContent?.trim();
      const authorDegree = authorLink?.querySelector('.update-components-actor__supplementary-actor-info')?.textContent?.trim();
      const authorDescription = authorLink?.querySelector('.update-components-actor__description')?.textContent?.trim();
  
      return {
        author_id: authorLink?.href?.match(/in\/([^\/]+)/)?.[1] || null,
        author_name: authorName,
        author_degree: authorDegree,
        author_role: authorDescription?.split('||')[0]?.trim() || authorDescription,
        author_profile_link: authorLink?.href || null
      };
    }
  
    extractTimestamps(postContainer) {
      const timeElement = postContainer.querySelector('time');
      const postedText = postContainer.querySelector('[aria-hidden="true"]')?.textContent?.trim();
      
      return {
        posted_on: timeElement?.datetime || new Date().toISOString(),
        posted_text: postedText?.replace(/\s+/g, ' ')?.trim() || null
      };
    }
  
    extractPostContent(postContainer) {
      const contentElement = postContainer.querySelector(
        '.feed-shared-inline-show-more-text, ' +
        '.update-components-text, ' +
        '.break-words, ' +
        '[data-test-id="post-text"]'
      );
      return contentElement?.textContent?.trim() || null;
    }
  
    extractRepliedToContent(commentBox) {
      if (!commentBox.classList.contains('comments-comment-box--reply')) return null;
      return commentBox.closest('.comments-comment-item')
        ?.querySelector('.comments-comment-item__main-content')
        ?.textContent
        ?.trim() || null;
    }
  
    extractAIResponse(commentBox) {
      const paragraphs = commentBox.querySelectorAll('.ql-editor p');
      return Array.from(paragraphs).map(p => p.textContent.trim()).join('\n');
    }
  
    extractEngagementMetrics(postContainer) {
      return {
        likes: this.extractMetric(postContainer, 'like'),
        comments: this.extractMetric(postContainer, 'comment'),
        shares: this.extractMetric(postContainer, 'share')
      };
    }
  
    extractMetric(postContainer, type) {
      const button = postContainer.querySelector(`[data-control-name="${type}"]`);
      const count = button?.closest('button')?.querySelector('.social-details-social-counts__count')
        ?.textContent?.trim()?.replace(/\D/g, '');
      return count || null;
    }
  
    async saveComment(commentData) {
      const { linkedinComments = [] } = await chrome.storage.local.get('linkedinComments');
      linkedinComments.push(commentData);
      await chrome.storage.local.set({ linkedinComments });
    }
  }
  
  // Only activate on LinkedIn feed
  if (window.location.href.includes('linkedin.com/feed')) {
    new LinkedInCommentTracker();
  }