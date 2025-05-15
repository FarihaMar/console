class LinkedInProfileTracker {
  constructor() {
    console.log('[LinkedIn Tracker] Initializing tracker...');
    this.initialize();
  }

  async initialize() {
    await this.initStorage();
    this.setupLoadListener();
    console.log('[LinkedIn Tracker] Tracker initialized');
  }

  async initStorage() {
    console.log('[LinkedIn Tracker] Initializing storage...');
    const data = await chrome.storage.local.get('linkedinProfiles');
    if (!data.linkedinProfiles) {
      await chrome.storage.local.set({ linkedinProfiles: [] });
      console.log('[LinkedIn Tracker] Created new storage array');
    }
  }

  setupLoadListener() {
    console.log('[LinkedIn Tracker] Setting up load listeners...');
    
    const delayedProfileCapture = () => {
      console.log('[LinkedIn Tracker] Page loaded, waiting 5 seconds...');
      setTimeout(() => {
        console.log('[LinkedIn Tracker] 5 seconds elapsed, capturing profile');
        this.extractAndStoreProfile();
      }, 5000); // 5000ms = 5 seconds
    };
    
    // Run immediately if DOM is already loaded
    if (document.readyState === 'complete') {
      delayedProfileCapture();
    } 
    // Also listen for future load events
    window.addEventListener('load', delayedProfileCapture);
  }

  async extractAndStoreProfile() {
    console.log('[LinkedIn Tracker] Starting profile extraction...');
    try {
      const profileData = this.extractProfileData();
      
      if (profileData) {
        console.log('[LinkedIn Tracker] Extracted profile data:', profileData);
        const savedProfile = await this.saveProfile(profileData);
        console.log('[LinkedIn Tracker] Profile saved:', savedProfile);
        
        const allProfiles = await this.getAllProfiles();
        console.log('[LinkedIn Tracker] All stored profiles:', allProfiles);
      } else {
        console.log('[LinkedIn Tracker] No profile data found after delay');
        // Additional fallback selectors can be added here if needed
      }
    } catch (error) {
      console.error('[LinkedIn Tracker] Error:', error);
    }
  }

  extractProfileData() {
    // Try multiple profile card selectors with increased specificity
    const profileCard = document.querySelector('.profile-card-member-details, .scaffold-layout__aside .pv-text-details__left-panel');
    
    if (!profileCard) {
      console.log('[LinkedIn Tracker] Profile card not found, trying fallback selectors...');
      // Additional fallback selectors
      const fallbackCard = document.querySelector('.pv-text-details__left-panel, .pv-top-card');
      if (!fallbackCard) {
        console.log('[LinkedIn Tracker] No profile elements found with any selector');
        return null;
      }
      console.log('[LinkedIn Tracker] Found profile using fallback selector');
      return this.extractFromFallback(fallbackCard);
    }

    // Original extraction logic
    const getText = (selector, parent = document) => {
      const el = parent.querySelector(selector);
      return el ? el.textContent.trim() : null;
    };

    // Extract basic info
    const name = getText('.profile-card-name', profileCard);
    const designation = getText('.profile-card-headline', profileCard);
    const location = getText('.text-body-xsmall.t-black--light.mt1', profileCard);
    const profileLink = profileCard.querySelector('a')?.href || window.location.href;

    // Extract connections count
    let connections = null;
    const connectionsEl = document.querySelector('.feed-left-nav-growth-widgets__entity-list-item');
    if (connectionsEl) {
      const connectionsText = getText('.feed-identity-widget-item__stat strong', connectionsEl);
      connections = connectionsText ? connectionsText.replace(/\D/g, '') : null;
    }

    // Currently visible profile is the one we're extracting
    const about = getText('.pv-about-section .pv-about__summary-text');
    
    return {
      name,
      designation,
      location,
      connections,
      followers: null, // Keeping your original structure
      about,
      profile_link: profileLink.split('?')[0],
      timestamp: new Date().toISOString()
    };
  }

  extractFromFallback(fallbackCard) {
    console.log('[LinkedIn Tracker] Extracting from fallback element...');
    const getText = (selector, parent = document) => {
      const el = parent.querySelector(selector);
      return el ? el.textContent.trim() : null;
    };

    return {
      name: getText('.profile-card-name', fallbackCard),
      designation: getText('.profile-card-headline', fallbackCard),
      location: getText('.text-body-xsmall.t-black--light.mt1', fallbackCard),
      connections:getText('.feed-identity-widget-item__stat strong', fallbackCard), // May need different selector
      followers: null,
      about: getText('.pv-about__summary-text'),
      profile_link: window.location.href.split('?')[0],
      timestamp: new Date().toISOString()
    };
  }

  // ... (keep all your existing storage methods unchanged)
  async getAllProfiles() {
    const result = await chrome.storage.local.get('linkedinProfiles');
    return result.linkedinProfiles || [];
  }

  async findProfile(profileLink) {
    const profiles = await this.getAllProfiles();
    return profiles.find(p => p.profile_link === profileLink);
  }

  async addProfile(profile) {
    console.log('[LinkedIn Tracker] Adding new profile');
    const profiles = await this.getAllProfiles();
    const newProfile = {
      ...profile,
      created_at: new Date().toISOString()
    };
    profiles.push(newProfile);
    await chrome.storage.local.set({ linkedinProfiles: profiles });
    return newProfile;
  }

  async updateProfile(profileLink, updates) {
    console.log('[LinkedIn Tracker] Updating existing profile');
    const profiles = await this.getAllProfiles();
    const index = profiles.findIndex(p => p.profile_link === profileLink);
    if (index !== -1) {
      profiles[index] = { 
        ...profiles[index], 
        ...updates,
        created_at: profiles[index].created_at 
      };
      await chrome.storage.local.set({ linkedinProfiles: profiles });
      return profiles[index];
    }
    return null;
  }

  async saveProfile(profileData) {
    const existing = await this.findProfile(profileData.profile_link);
    if (existing) {
      return this.updateProfile(profileData.profile_link, profileData);
    } else {
      return this.addProfile(profileData);
    }
  }
}

if (window.location.hostname.includes('linkedin.com')) {
  console.log('[LinkedIn Tracker] LinkedIn detected, starting...');
  new LinkedInProfileTracker();
} else {
  console.log('[LinkedIn Tracker] Not on LinkedIn, skipping');
}
