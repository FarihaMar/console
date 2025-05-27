// background.js - Updated with real AI API calls
chrome.runtime.onInstalled.addListener(() => {
  console.log("AgentLink LinkedIn Assistant Extension Installed");
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "generateMessage" || request.action === "generatePersonalDm") {
    try {
      // Get AI settings from storage
      const { aiSettings = {} } = await chrome.storage.local.get(['aiSettings']);
      
      // Construct the AI prompt
      const messages = [
        {
          role: "system",
          content: request.config.systemPrompt || 
                  "You are a professional LinkedIn assistant. Generate concise, natural messages."
        },
        {
          role: "user",
          content: buildUserPrompt(request)
        }
      ];

      // Call OpenRouter API
      const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${aiSettings.apiKey || request.aiSettings?.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: aiSettings.model || "mistralai/mistral-7b-instruct",
          messages
        })
      });

      const data = await aiResponse.json();
      const generatedMessage = data.choices?.[0]?.message?.content;

      if (!generatedMessage) throw new Error("AI failed to generate message");
      
      sendResponse({ message: generatedMessage });
    } catch (error) {
      console.error("AI generation error:", error);
      sendResponse({ 
        error: error.message || "Failed to generate message",
        fallback: generateFallbackMessage(request) 
      });
    }
    return true; // Keep the message channel open
  }
});

// Helper function to build the prompt
function buildUserPrompt(request) {
  const { participantData, profileData, config } = request;
  
  return `
    **Template:** ${config.name || "General Message"}
    **Recipient:** ${profileData.name} (${profileData.designation || "No title"})
    **About Them:** ${profileData.about || "No bio available"}
    **Last Messages:** ${JSON.stringify(participantData.lastMessages || [])}
    
    Generate a professional LinkedIn message using the above context. Keep it natural and concise.
  `;
}

// Fallback if API fails
function generateFallbackMessage(request) {
  const { profileData, config } = request;
  return `Hi ${profileData.name.split(' ')[0]}, I came across your profile and wanted to connect. ${config.name === "Professional DM" ? "I think we could mutually benefit from connecting." : ""}`;
}