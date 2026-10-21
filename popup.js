const statusDiv = document.getElementById('status');
const apiKeyInput = document.getElementById('apiKey');
const resumeTextInput = document.getElementById('resumeText');
const jsonEditor = document.getElementById('jsonEditor');

const tabRawBtn = document.getElementById('btn-tab-raw');
const tabJsonBtn = document.getElementById('btn-tab-json');
const tabRawSec = document.getElementById('tab-raw');
const tabJsonSec = document.getElementById('tab-json');

// Only load stored profile data (NEVER loads or stores apiKey)
chrome.storage.local.get(['userProfile', 'rawResumeText'], (data) => {
  if (data.rawResumeText) resumeTextInput.value = data.rawResumeText;
  if (data.userProfile) {
    jsonEditor.value = JSON.stringify(data.userProfile, null, 2);
  }
  // Check if an API key is currently active in memory
  chrome.runtime.sendMessage({ type: "CHECK_KEY" }, (res) => {
    if (res?.hasKey) {
      statusDiv.innerText = "✓ Active key is loaded in memory.";
    } else {
      statusDiv.innerText = "Please enter and submit an API key.";
    }
  });
});

// Submit / Update API Key on demand
document.getElementById('submit-key-btn').addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    statusDiv.innerText = "Error: Please paste an API key first.";
    return;
  }

  chrome.runtime.sendMessage({ type: "SET_ACTIVE_KEY", apiKey }, (res) => {
    if (res?.success) {
      statusDiv.innerText = "✓ Key updated in memory! (Not stored to disk)";
    }
  });
});

// Tab Switcher
tabRawBtn.addEventListener('click', () => {
  tabRawBtn.classList.add('active');
  tabJsonBtn.classList.remove('active');
  tabRawSec.style.display = 'block';
  tabJsonSec.style.display = 'none';
});

tabJsonBtn.addEventListener('click', () => {
  tabJsonBtn.classList.add('active');
  tabRawBtn.classList.remove('active');
  tabRawSec.style.display = 'none';
  tabJsonSec.style.display = 'block';
  chrome.storage.local.get(['userProfile'], (data) => {
    jsonEditor.value = JSON.stringify(data.userProfile || {}, null, 2);
  });
});

// Parse profile with AI (passes key directly)
document.getElementById('save-ai-btn').addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  const rawText = resumeTextInput.value.trim();

  if (!rawText) {
    statusDiv.innerText = "Please provide profile / resume text.";
    return;
  }

  statusDiv.innerText = "Parsing profile with AI...";
  chrome.runtime.sendMessage({ type: "PARSE_PROFILE", apiKey, rawText }, (res) => {
    if (res && res.success) {
      statusDiv.innerText = "✓ Profile parsed & saved!";
      jsonEditor.value = JSON.stringify(res.profile, null, 2);
    } else {
      statusDiv.innerText = "Error: " + (res?.error || "Check console.");
    }
  });
});

// Save JSON directly (Profile only)
document.getElementById('save-json-btn').addEventListener('click', () => {
  try {
    const parsed = JSON.parse(jsonEditor.value);
    chrome.storage.local.set({ userProfile: parsed }, () => {
      statusDiv.innerText = "✓ Profile updated locally!";
    });
  } catch (err) {
    statusDiv.innerText = "Invalid JSON: " + err.message;
  }
});

// Trigger Autofill
document.getElementById('autofill-btn').addEventListener('click', async () => {
  statusDiv.innerText = "Scanning page...";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: "RUN_AUTOFILL" }, (res) => {
    if (chrome.runtime.lastError) {
      statusDiv.innerText = "Error: Refresh target page first.";
    } else if (res?.status) {
      statusDiv.innerText = res.status;
    }
  });
});