document.addEventListener('DOMContentLoaded', function () {
  // === DOM Elements for Templates ===
  const templateContainer = document.getElementById('template-container');
  const savedButtonsContainer = document.getElementById('saved-buttons');
  const addButton = document.getElementById('add-button');
  const templateNameInput = document.getElementById('template-name');
  const systemPromptInput = document.getElementById('system-prompt');
  const userPromptInput = document.getElementById('user-prompt');
  const saveButton = document.getElementById('save-button');
  const cancelButton = document.getElementById('cancel-button');
  const templateEditor = document.getElementById('template-editor');
  
  // === DOM Elements for Comments ===
  const savedCommentsContainer = document.getElementById('saved-comments');
  const addCommentButton = document.getElementById('add-comment-button');
  const commentNameInput = document.getElementById('comment-name');
  const commentSystemPromptInput = document.getElementById('comment-system-prompt');
  const commentUserPromptInput = document.getElementById('comment-user-prompt');
  const saveCommentButton = document.getElementById('save-comment-button');
  const cancelCommentButton = document.getElementById('cancel-comment-button');
  const commentEditor = document.getElementById('comment-editor');
  
  // === DOM Elements for AI Configuration ===
  const saveSettingsBtn = document.getElementById('save-settings');
  const aiModelInput = document.getElementById('ai-model');
  const apiKeyInput = document.getElementById('api-key');
  const apiUrlInput = document.getElementById('api-url');


  // === DOM Elements for Tab Switching ===
  const templateTab = document.getElementById('template-tab');
  const commentTab = document.getElementById('comment-tab');
  const personalDmTab = document.getElementById('personaldm-tab');
  const aiTab = document.getElementById('ai-tab');
  const criteriaTab = document.getElementById('criteria-tab');
  const templatePane = document.getElementById('template');
  const commentPane = document.getElementById('comment');
  const aiPane = document.getElementById('ai');
  const criteriaPane = document.getElementById('criteria');
  const personalDmPane = document.getElementById('personaldm');

  // === DOM Elements for Personal DM ===
  const savedPersonalDmsContainer = document.getElementById('saved-personaldms');
  const addPersonalDmButton = document.getElementById('add-personaldm-button');
  const personalDmNameInput = document.getElementById('personaldm-name');
  const personalDmSystemPromptInput = document.getElementById('personaldm-system-prompt');
  const personalDmUserPromptInput = document.getElementById('personaldm-user-prompt');
  const savePersonalDmButton = document.getElementById('save-personaldm-button');
  const cancelPersonalDmButton = document.getElementById('cancel-personaldm-button');
  const personalDmEditor = document.getElementById('personaldm-editor');
  

  // Default buttons for comments
const DEFAULT_COMMENT_BUTTONS = [
  {
    id: 'comment-1',
    name: "Short Reply",
    systemPrompt: "Write a short professional comment",
    userPrompt: "Create a 1-2 sentence comment"
  },
  {
    id: 'comment-2',
    name: "Friendly Reply",
    systemPrompt: "Write a friendly comment",
    userPrompt: "Create a warm 2-3 sentence comment"
  },
  {
    id: 'comment-3',
    name: "Professional Reply", 
    systemPrompt: "Write a formal professional comment",
    userPrompt: "Create a 3-4 sentence professional comment"
  },
  {
    id: 'comment-4',
    name: "Detailed Reply",
    systemPrompt: "Write a detailed insightful comment",
    userPrompt: "Create a 4-5 sentence thoughtful comment"
  }
];

// Default buttons for messages
const DEFAULT_MESSAGE_BUTTONS = [
  {
    id: 'message-1',
    name: "Short Message",
    systemPrompt: "Write a short professional message",
    userPrompt: "Create a 1-2 sentence message"
  },
  {
    id: 'message-2',
    name: "Friendly Message",
    systemPrompt: "Write a friendly message",
    userPrompt: "Create a warm 2-3 sentence message"
  },
  {
    id: 'message-3',
    name: "Professional Message",
    systemPrompt: "Write a formal professional message",
    userPrompt: "Create a 3-4 sentence professional message"
  },
  {
    id: 'message-4',
    name: "Detailed Message",
    systemPrompt: "Write a detailed insightful message",
    userPrompt: "Create a 4-5 sentence thoughtful message"
  }
];

// Default buttons for personal DMs
const DEFAULT_PERSONAL_DM_BUTTONS = [
  {
    id: 'dm-1',
    name: "Casual DM",
    systemPrompt: "Write a casual and friendly direct message",
    userPrompt: "Get me a reply for this message below. reply back casualy"
  },
  {
    id: 'dm-2',
    name: "Professional DM",
    systemPrompt: "Write a professional direct message",
    userPrompt: "Get me a reply for this message below. reply back Professionally"
  },
  {
    id: 'dm-3',
    name: "Follow-up DM",
    systemPrompt: "Write a follow-up direct message",
    userPrompt: "Get me a reply for this message below. its just a follow up dm"
  },
  {
    id: 'dm-4',
    name: "Thankyou DM",
    systemPrompt: "Write a thankyou direct message",
    userPrompt: "Get me a reply for this message below. Write a thankyou direct message"
  }
];
  
  // === State Variables ===
  let buttonConfigs = [];
  let commentConfigs = [];
  let personalDmConfigs = [];
  let aiSettings = {
    model: 'deepseek/deepseek-r1:free',
    apiKey: '',
    apiUrl: 'https://openrouter.ai/api/v1/chat/completions'
  };
  let currentEditingId = null;
  let currentEditingCommentId = null;

  // === Load Saved Data ===
 // === Load Saved Data ===
chrome.storage.local.get(['buttonConfigs', 'commentConfigs', 'personalDmConfigs', 'aiSettings'], function(result) {
  // Initialize comments
  if (!result.commentConfigs || result.commentConfigs.length === 0) {
    commentConfigs = DEFAULT_COMMENT_BUTTONS;
    chrome.storage.local.set({ commentConfigs });
  } else {
    commentConfigs = result.commentConfigs;
  }

  // Initialize messages (using buttonConfigs)
  if (!result.buttonConfigs || result.buttonConfigs.length === 0) {
    buttonConfigs = DEFAULT_MESSAGE_BUTTONS;
    chrome.storage.local.set({ buttonConfigs });
  } else {
    buttonConfigs = result.buttonConfigs;
  }

  // Initialize personal DMs
  if (!result.personalDmConfigs || result.personalDmConfigs.length === 0) {
    personalDmConfigs = DEFAULT_PERSONAL_DM_BUTTONS;
    chrome.storage.local.set({ personalDmConfigs });
  } else {
    personalDmConfigs = result.personalDmConfigs;
  }
  if (result.aiSettings) {
    aiSettings = result.aiSettings;
    aiModelInput.value = aiSettings.model;
    apiKeyInput.value = aiSettings.apiKey || '';
    apiUrlInput.value = aiSettings.apiUrl || '';
  }

  // Render everything
  renderSavedButtons(); // This shows message buttons
  renderSavedComments();
  renderSavedPersonalDms();
});

  // === Template Management ===
  addButton.addEventListener('click', function () {
    currentEditingId = null;
    templateNameInput.value = '';
    systemPromptInput.value = 'You are a helpful assistant that writes professional LinkedIn messages.';
    userPromptInput.value = 'Write a connection acceptance message';
    templateEditor.classList.add('active');
  });

  saveButton.addEventListener('click', function () {
    const name = templateNameInput.value.trim();
    const systemPrompt = systemPromptInput.value.trim();
    const userPrompt = userPromptInput.value.trim();
    
    if (!name) {
      alert('Please enter a template name');
      return;
    }
    
    // Check for duplicate template names
    const isDuplicate = buttonConfigs.some(config => 
      config.name.toLowerCase() === name.toLowerCase() && 
      config.id !== currentEditingId
    );
    
    if (isDuplicate) {
      alert('A template with this name already exists. Please use a different name.');
      return;
    }
    
    if (currentEditingId) {
      // Update existing template
      const index = buttonConfigs.findIndex(c => c.id === currentEditingId);
      if (index !== -1) {
        buttonConfigs[index] = {
          id: currentEditingId,
          name,
          systemPrompt,
          userPrompt
        };
      }
    } else {
      // Add new template
      buttonConfigs.push({
        id: Date.now().toString(),
        name,
        systemPrompt,
        userPrompt
      });
    }
    
    chrome.storage.local.set({ buttonConfigs }, function () {
      templateEditor.classList.remove('active');
      renderSavedButtons();
    });
  });

  cancelButton.addEventListener('click', function () {
    templateEditor.classList.remove('active');
  });

  function renderSavedButtons() {
    savedButtonsContainer.innerHTML = '';
    
    // Show default message if empty
    if (buttonConfigs.length === 0) {
      savedButtonsContainer.innerHTML = '<div class="empty-state">No message templates saved yet</div>';
      return;
    }
    
    // Render all message buttons
    buttonConfigs.forEach(config => {
      const btn = document.createElement('div');
      btn.className = 'saved-button';
      btn.innerHTML = `
        <span>${config.name}</span>
        <div class="button-actions">
          <span class="edit-btn">Edit</span>
          <span class="delete-btn">×</span>
        </div>
      `;
      
      // Add edit functionality
      btn.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        currentEditingId = config.id;
        templateNameInput.value = config.name;
        systemPromptInput.value = config.systemPrompt;
        userPromptInput.value = config.userPrompt;
        templateEditor.classList.add('active');
      });
      
      // Add delete functionality
      btn.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${config.name}"?`)) {
          buttonConfigs = buttonConfigs.filter(c => c.id !== config.id);
          chrome.storage.local.set({ buttonConfigs }, renderSavedButtons);
        }
      });
      
      savedButtonsContainer.appendChild(btn);
    });
  }

  // === Comment Management ===
  addCommentButton.addEventListener('click', function () {
    currentEditingCommentId = null;
    commentNameInput.value = '';
    commentSystemPromptInput.value = 'You are a helpful assistant that writes professional LinkedIn comments.';
    commentUserPromptInput.value = 'Write a thoughtful comment for this post';
    commentEditor.classList.add('active');
  });

  saveCommentButton.addEventListener('click', function () {
    const name = commentNameInput.value.trim();
    const systemPrompt = commentSystemPromptInput.value.trim();
    const userPrompt = commentUserPromptInput.value.trim();
    
    if (!name) {
      alert('Please enter a comment name');
      return;
    }
    
    // Check for duplicate comment names
    const isDuplicate = commentConfigs.some(config => 
      config.name.toLowerCase() === name.toLowerCase() && 
      config.id !== currentEditingCommentId
    );
    
    if (isDuplicate) {
      alert('A comment with this name already exists. Please use a different name.');
      return;
    }
    
    if (currentEditingCommentId) {
      // Update existing comment
      const index = commentConfigs.findIndex(c => c.id === currentEditingCommentId);
      if (index !== -1) {
        commentConfigs[index] = {
          id: currentEditingCommentId,
          name,
          systemPrompt,
          userPrompt
        };
      }
    } else {
      // Add new comment
      commentConfigs.push({
        id: Date.now().toString(),
        name,
        systemPrompt,
        userPrompt
      });
    }
    
    chrome.storage.local.set({ commentConfigs }, function () {
      commentEditor.classList.remove('active');
      renderSavedComments();
    });
  });

  cancelCommentButton.addEventListener('click', function () {
    commentEditor.classList.remove('active');
  });

  function renderSavedComments() {
    savedCommentsContainer.innerHTML = '';
    
    if (commentConfigs.length === 0) {
      savedCommentsContainer.innerHTML = '<div class="empty-state">No comments saved yet</div>';
      return;
    }
    
    commentConfigs.forEach(config => {
      const commentDiv = document.createElement('div');
      commentDiv.className = 'saved-button';
      commentDiv.innerHTML = `
        <span>${config.name}</span>
        <div class="saved-button-actions">
          <span class="saved-button-action edit-btn">EDIT</span>
          <span class="saved-button-action delete-btn">✕</span>
        </div>
      `;
      
      commentDiv.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        currentEditingCommentId = config.id;
        commentNameInput.value = config.name;
        commentSystemPromptInput.value = config.systemPrompt;
        commentUserPromptInput.value = config.userPrompt;
        commentEditor.classList.add('active');
      });
      
      commentDiv.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete comment "${config.name}"?`)) {
          commentConfigs = commentConfigs.filter(c => c.id !== config.id);
          chrome.storage.local.set({ commentConfigs }, renderSavedComments);
        }
      });
      
      commentDiv.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'useComment',
            config: config,
            aiSettings: aiSettings
          });
        });
      });
      
      savedCommentsContainer.appendChild(commentDiv);
    });
  }

  // === Personal DM Management ===
addPersonalDmButton.addEventListener('click', function () {
  currentEditingPersonalDmId = null;
  personalDmNameInput.value = '';
  personalDmSystemPromptInput.value = 'You are a helpful assistant that writes professional LinkedIn direct messages.';
  personalDmUserPromptInput.value = 'Write a personalized direct message for this person';
  personalDmEditor.classList.add('active');
});

// In the savePersonalDmButton click handler
savePersonalDmButton.addEventListener('click', function () {
    const name = personalDmNameInput.value.trim();
    const systemPrompt = personalDmSystemPromptInput.value.trim();
    const userPrompt = personalDmUserPromptInput.value.trim();
    
    if (!name) {
        alert('Please enter a DM template name');
        return;
    }
    
    // Check for duplicate names
    const isDuplicate = personalDmConfigs.some(config => 
        config.name.toLowerCase() === name.toLowerCase() && 
        config.id !== currentEditingPersonalDmId
    );
    
    if (isDuplicate) {
        alert('A DM template with this name already exists. Please use a different name.');
        return;
    }
    
    if (currentEditingPersonalDmId) {
        // Update existing template
        const index = personalDmConfigs.findIndex(c => c.id === currentEditingPersonalDmId);
        if (index !== -1) {
            personalDmConfigs[index] = {
                id: currentEditingPersonalDmId,
                name,
                systemPrompt,
                userPrompt,
                isDmTemplate: true // Add this flag to identify DM templates
            };
        }
    } else {
        // Add new template
        personalDmConfigs.push({
            id: Date.now().toString(),
            name,
            systemPrompt,
            userPrompt,
            isDmTemplate: true // Add this flag to identify DM templates
        });
    }
    
    chrome.storage.local.set({ personalDmConfigs }, function () {
        personalDmEditor.classList.remove('active');
        renderSavedPersonalDms();
        
        // Send message to content script to refresh buttons
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "refreshButtons"});
        });
    });
});

cancelPersonalDmButton.addEventListener('click', function () {
  personalDmEditor.classList.remove('active');
});

function renderSavedPersonalDms() {
  savedPersonalDmsContainer.innerHTML = '';
  
  if (personalDmConfigs.length === 0) {
    savedPersonalDmsContainer.innerHTML = '<div class="empty-state">No DM templates saved yet</div>';
    return;
  }
  
  personalDmConfigs.forEach(config => {
    const dmDiv = document.createElement('div');
    dmDiv.className = 'saved-button';
    dmDiv.innerHTML = `
      <span>${config.name}</span>
      <div class="saved-button-actions">
        <span class="saved-button-action edit-btn">EDIT</span>
        <span class="saved-button-action delete-btn">✕</span>
      </div>
    `;
    
    dmDiv.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      currentEditingPersonalDmId = config.id;
      personalDmNameInput.value = config.name;
      personalDmSystemPromptInput.value = config.systemPrompt;
      personalDmUserPromptInput.value = config.userPrompt;
      personalDmEditor.classList.add('active');
    });
    
    dmDiv.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete DM template "${config.name}"?`)) {
        personalDmConfigs = personalDmConfigs.filter(c => c.id !== config.id);
        chrome.storage.local.set({ personalDmConfigs }, renderSavedPersonalDms);
      }
    });
    
    dmDiv.addEventListener('click', function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'usePersonalDm',
          config: config,
          aiSettings: aiSettings
        });
      });
    });
    
    savedPersonalDmsContainer.appendChild(dmDiv);
  });
}

  // === AI Settings Management ===
  saveSettingsBtn.addEventListener('click', function () {
    aiSettings = {
      model: aiModelInput.value.trim(),
      apiKey: apiKeyInput.value.trim(),
      apiUrl: apiUrlInput.value.trim()
    };
    
    chrome.storage.local.set({ aiSettings }, function () {
      const alert = document.createElement('div');
      alert.textContent = 'Settings saved successfully!';
      alert.style.padding = '12px 16px';
      alert.style.marginTop = '12px';
      alert.style.background = '#222'; // dark background
      alert.style.color = '#fff'; // white text
      alert.style.border = '1px solid #444'; // subtle border
      alert.style.borderRadius = '6px'; // rounded corners
      alert.style.fontSize = '14px';
      alert.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)'; // soft shadow
      alert.style.transition = 'opacity 0.3s ease';
      alert.style.opacity = '1';
      aiPane.appendChild(alert);
      setTimeout(() => alert.remove(), 3000);
    });
  });

  // === Tab Switching ===
  templateTab.addEventListener('click', function () {
    templateTab.classList.add('active');
    commentTab.classList.remove('active');
    personalDmTab.classList.remove('active');
    aiTab.classList.remove('active');
    criteriaTab.classList.remove('active');
  
    templatePane.classList.add('active');
    commentPane.classList.remove('active');
    personalDmPane.classList.remove('active');
    aiPane.classList.remove('active');
    criteriaPane.classList.remove('active');
  });

  commentTab.addEventListener('click', function () {
    commentTab.classList.add('active');
    templateTab.classList.remove('active');
    personalDmTab.classList.remove('active');
    aiTab.classList.remove('active');
    criteriaTab.classList.remove('active');
  
    commentPane.classList.add('active');
    templatePane.classList.remove('active');
    personalDmPane.classList.remove('active');
    aiPane.classList.remove('active');
    criteriaPane.classList.remove('active');
  });

  personalDmTab.addEventListener('click', function () {
    personalDmTab.classList.add('active');
    templateTab.classList.remove('active');
    commentTab.classList.remove('active');
    aiTab.classList.remove('active');
    criteriaTab.classList.remove('active');
  
    personalDmPane.classList.add('active');
    templatePane.classList.remove('active');
    commentPane.classList.remove('active');
    aiPane.classList.remove('active');
    criteriaPane.classList.remove('active');
  });

  aiTab.addEventListener('click', function () {
    aiTab.classList.add('active');
    templateTab.classList.remove('active');
    commentTab.classList.remove('active');
    personalDmTab.classList.remove('active');
    criteriaTab.classList.remove('active');
  
    aiPane.classList.add('active');
    templatePane.classList.remove('active');
    commentPane.classList.remove('active');
    personalDmPane.classList.remove('active');
    criteriaPane.classList.remove('active');
  });
  // === Tab Switching ===
  criteriaTab.addEventListener('click', function () {
    criteriaTab.classList.add('active');
    templateTab.classList.remove('active');
    commentTab.classList.remove('active');
    personalDmTab.classList.remove('active');
    aiTab.classList.remove('active');
  
    criteriaPane.classList.add('active');
    templatePane.classList.remove('active');
    commentPane.classList.remove('active');
    personalDmPane.classList.remove('active');
    aiPane.classList.remove('active');
  });

  // === Animation ===
  function animateElements() {
    document.querySelectorAll('.form-group, .btn, .saved-button').forEach((el, i) => {
      setTimeout(() => el.classList.add('fade-in'), i * 50);
    });
  }
  setTimeout(animateElements, 300);
  templateTab.addEventListener('click', animateElements);
  commentTab.addEventListener('click', animateElements);
  aiTab.addEventListener('click', animateElements);
});


document.addEventListener('DOMContentLoaded', function () {
  
  // === DOM Elements for Criteria === 
  const titlesContainer = document.getElementById('titlesContainer');
  const institutionsContainer = document.getElementById('institutionsContainer');
  const titleInput = document.getElementById('titleInput');
  const institutionInput = document.getElementById('institutionInput');
  const minConnectionsInput = document.getElementById('minConnections');
  const batchLimitInput = document.getElementById('batchLimit');
  const testingModeInput = document.getElementById('testingMode');
  const saveCriteriaButton = document.getElementById('saveCriteria');
  
  // === State Variables ===
  let relevantTitles = [];
  let relevantInstitutions = [];
  let minMutualConnections = 0;
  let batchLimit = 10;
  
  // === Load Saved Data ===
  chrome.storage.local.get(['criteria'], function (result) {
    if (result.criteria) {
      relevantTitles = result.criteria.relevantTitles || [];
      relevantInstitutions = result.criteria.relevantInstitutions || [];
      minMutualConnections = result.criteria.minMutualConnections || 0;
      batchLimit = result.criteria.batchLimit || 10;
      
      updateTagsUI(titlesContainer, relevantTitles);
      updateTagsUI(institutionsContainer, relevantInstitutions);
      minConnectionsInput.value = minMutualConnections;
      batchLimitInput.value = batchLimit;
      testingModeInput.checked = result.criteria.testingMode !== false;
      
      console.log('Loaded saved criteria:', {
        titles: relevantTitles,
        institutions: relevantInstitutions,
        connections: minMutualConnections,
        batchLimit: batchLimit,
        testingMode: testingModeInput.checked
      });
    } else {
      // Set default values if no saved criteria
      relevantTitles = ['Data Analyst', 'Software Engineer', 'Developer', 'student', 'python'];
      relevantInstitutions = ['wcc', 'sdnb'];
      minMutualConnections = 0;
      batchLimit = 10;
      testingModeInput.checked = true;
      
      updateTagsUI(titlesContainer, relevantTitles);
      updateTagsUI(institutionsContainer, relevantInstitutions);
      minConnectionsInput.value = minMutualConnections;
      batchLimitInput.value = batchLimit;
      
      saveCriteria();
    }

    setupTagInput(titleInput, titlesContainer, relevantTitles);
    setupTagInput(institutionInput, institutionsContainer, relevantInstitutions);
  });

  // === Criteria Management Functions ===
  function createTag(text, container, array) {
    const tag = document.createElement('div');
    tag.className = 'tag-item';
    tag.innerHTML = `${text}<span class="tag-remove">&times;</span>`;
    
    tag.querySelector('.tag-remove').addEventListener('click', () => {
      container.removeChild(tag);
      const index = array.indexOf(text);
      if (index > -1) {
        array.splice(index, 1);
        saveCriteria();
      }
    });
    
    container.appendChild(tag);
  }

  function updateTagsUI(container, items) {
    container.innerHTML = '';
    items.forEach(item => createTag(item, container, items));
  }

  function setupTagInput(input, container, array) {
    input.addEventListener('keyup', function(e) {
      if (e.key === 'Enter' && input.value.trim() !== '') {
        const value = input.value.trim();
        if (!array.includes(value)) {
          array.push(value);
          createTag(value, container, array);
          saveCriteria();
        }
        input.value = '';
      }
    });
  }

  // Function to save invitation criteria
  function saveCriteria() {
    const criteria = {
      relevantTitles,
      relevantInstitutions,
      minMutualConnections: parseInt(minConnectionsInput.value) || 0,
      batchLimit: parseInt(batchLimitInput.value) || 10,
      testingMode: testingModeInput.checked
    };
    batchLimit = criteria.batchLimit;
    chrome.storage.local.set({ criteria }, function() {
      console.log('Saved criteria:', criteria);
      saveCriteriaButton.textContent = 'Saved!';
      setTimeout(() => {
        saveCriteriaButton.textContent = 'Save Criteria';
      }, 2000);
    });
  }

  // Attach criteria event listeners
  saveCriteriaButton.addEventListener('click', saveCriteria);
  minConnectionsInput.addEventListener('change', saveCriteria);
  batchLimitInput.addEventListener('change', saveCriteria);
  testingModeInput.addEventListener('change', saveCriteria);
});
