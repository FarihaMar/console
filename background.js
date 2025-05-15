// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleRequest = async () => {
    try {
      if (request.action === "generateComment") {
        const result = await handleCommentGeneration(request);
        sendResponse(result);
      } else if (request.action === "generateMessage") {
        const result = await handleMessageGeneration(request);
        sendResponse(result);
      } else if (request.action === "generatePersonalDm") {
        const result = await getPersonalizedDm(request);
        sendResponse(result)
      } else if (request.action === "logError") {
        console.error('Client Error:', request.error);
        sendResponse({ status: 'logged' });
      }
    } catch (error) {
      console.error('Background Error:', error);
      sendResponse({
        error: error.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  };

  handleRequest();
  return true; // Keep message port open for async response
});

// ========== COMMENT GENERATION ========== //
async function handleCommentGeneration(request) {
  const { postText, config, aiSettings } = request;

  // Validate inputs
  if (!postText?.trim()) throw new Error('Post text is required');
  if (!config?.systemPrompt) throw new Error('System prompt is required');

  if (!aiSettings?.apiKey || !aiSettings?.apiUrl) {
    throw new Error('AI API key and URL are required for comment generation');
  }

  try {
    return await generateWithCustomAI(postText, config, aiSettings);
  } catch (error) {
    console.error('Comment Generation Failed:', error);
    throw new Error(`Failed to generate comment: ${error.message}`);
  }
}

async function generateWithCustomAI(postText, config, aiSettings) {
  const messages = [
    { role: "system", content: config.systemPrompt },
    { role: "user", content: `${config.userPrompt || 'Respond to this post:'}\n\n${postText}` }
  ];

  const payload = {
    model: aiSettings.model || "gpt-3.5-turbo",
    messages,
    temperature: config.temperature || 0.7,
    max_tokens: config.maxTokens || 500
  };

  const response = await fetchWithTimeout(aiSettings.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aiSettings.apiKey}`,
      'X-Request-Source': 'linkedin-extension'
    },
    body: JSON.stringify(payload)
  }, 15000);

  const data = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error(data.error?.message || 'Invalid response format from AI');
  }

  return { comment: data.choices[0].message.content.trim() };
}

// ========== FIRST MESSAGE GENERATION ========== //
async function handleMessageGeneration(request) {
  const { profileData, config, aiSettings } = request;

  if (!profileData) throw new Error('Profile data is required');
  if (!config?.systemPrompt) throw new Error('System prompt is required');

  try {
    if (aiSettings?.apiKey && aiSettings?.apiUrl) {
      return await generateMessageWithCustomAI(profileData, config, aiSettings);
    }

  } catch (error) {
    console.error('Message Generation Failed:', error);
    throw new Error(`Failed to generate message: ${error.message}`);
  }
}

async function generateMessageWithCustomAI(profileData, config, aiSettings) {
  const messages = [
    { role: "system", content: config.systemPrompt },
    { role: "user", content: `${config.userPrompt}\n\n${JSON.stringify(profileData)}` }
  ];

  const payload = {
    model: aiSettings.model || "gpt-3.5-turbo",
    messages,
    temperature: config.temperature || 0.7,
    max_tokens: config.maxTokens || 1000
  };

  const response = await fetchWithTimeout(aiSettings.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aiSettings.apiKey}`,
      'X-Request-Source': 'linkedin-extension'
    },
    body: JSON.stringify(payload)
  }, 15000);

  const data = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error(data.error?.message || 'Invalid response format from AI');
  }

  return { message: data.choices[0].message.content.trim() };
}

// ========== DM GENERATION ========== //
async function getPersonalizedDm(request) {
  const { participantData, config, aiSettings } = request;

  // Validate inputs
  if (!participantData?.participantName) throw new Error('Participant data is required');
  if (!config?.systemPrompt) throw new Error('System prompt is required');

  try {
    if (aiSettings?.apiKey && aiSettings?.apiUrl) {
      return await generateDmWithCustomAI(participantData, config, aiSettings);
    }

  } catch (error) {
    console.error('DM Generation Failed:', error);
    throw new Error(`Failed to generate DM: ${error.message}`);
  }
}

async function generateDmWithCustomAI(participantData, config, aiSettings) {
  // Format the conversation history for context
  const conversationContext = participantData.lastMessages
    ? participantData.lastMessages
      .map(msg => {
        const sender = msg.isCurrentUser
          ? 'Me'
          : (msg.sender || participantData.lastMessageSender || 'Them');
        return `${sender}: ${msg.message}`;
      })
      .join('\n')
    : 'No previous messages';

  const messages = [
    {
      role: "system",
      content: config.systemPrompt
    },
    {
      role: "user",
      content: `${config.userPrompt}\n\n` +
        `Recipient: ${participantData.participantName}\n` +
        `Replying to: ${participantData.lastMessageSender || 'N/A'}\n` +
        `Conversation Context:\n${conversationContext}`
    }
  ];

  const payload = {
    model: aiSettings.model || "gpt-3.5-turbo",
    messages,
    temperature: config.temperature || 0.7,
    max_tokens: config.maxTokens || 1000
  };

  const response = await fetchWithTimeout(aiSettings.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aiSettings.apiKey}`,
      'X-Request-Source': 'linkedin-extension'
    },
    body: JSON.stringify(payload)
  }, 15000);

  const data = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error(data.error?.message || 'Invalid response format from AI');
  }

  return { message: data.choices[0].message.content.trim() };
}



// ========== SHARED UTILITIES ========== //

async function fetchWithTimeout(url, options, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`${options.method || 'GET'} request to ${url} timed out`);
    }
    throw error;
  }
}

// Error tracking (optional)
function logErrorToService(error) {
  if (process.env.NODE_ENV === 'production') {
    fetch('https://error-tracking-service.com/log', {
      method: 'POST',
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        version: chrome.runtime.getManifest().version
      })
    }).catch(e => console.error('Failed to log error:', e));
  }
}