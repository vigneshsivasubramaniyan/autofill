// Active key kept strictly in memory (never written to chrome.storage.local)
let activeSessionKey = "";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Update the in-memory API key
  if (request.type === "SET_ACTIVE_KEY") {
    activeSessionKey = request.apiKey;
    sendResponse({ success: true });
    return false;
  }

  // Check if an API key is set
  if (request.type === "CHECK_KEY") {
    sendResponse({ hasKey: Boolean(activeSessionKey) });
    return false;
  }

  // Parse Profile
  if (request.type === "PARSE_PROFILE") {
    const keyToUse = request.apiKey || activeSessionKey;
    if (!keyToUse) {
      sendResponse({ success: false, error: "No API Key provided. Enter your key above." });
      return false;
    }
    activeSessionKey = keyToUse; // update memory

    parseResumeWithAI(keyToUse, request.rawText)
      .then(profile => {
        // ONLY saves resume profile data, NEVER saves API key
        chrome.storage.local.set({
          rawResumeText: request.rawText,
          userProfile: profile
        }, () => sendResponse({ success: true, profile }));
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Autofill Field Matching
  if (request.type === "MATCH_FIELDS") {
    if (!activeSessionKey) {
      sendResponse({ success: false, error: "No active API Key. Please open the extension popup and submit your key." });
      return false;
    }

    chrome.storage.local.get(['userProfile'], async (data) => {
      if (!data.userProfile) {
        sendResponse({ success: false, error: "No profile found. Parse or save your profile first." });
        return;
      }
      try {
        const answers = await matchFormFieldsWithAI(activeSessionKey, data.userProfile, request.fields);
        sendResponse({ success: true, answers });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
  }
});

async function callGeminiDirect(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Google API [${response.status}]: ${responseText}`);
  }

  const json = JSON.parse(responseText);
  if (!json.candidates || !json.candidates[0]?.content?.parts?.[0]?.text) {
    throw new Error("Empty response from Gemini.");
  }

  let raw = json.candidates[0].content.parts[0].text;
  raw = raw.replace(/```json|```/gi, '').trim();
  return JSON.parse(raw);
}

async function parseResumeWithAI(apiKey, text) {
  const prompt = `Extract all details from the resume text into a structured JSON profile with keys: fullName, email, phone, location, linkedin, github, education, experience, skills.
Resume:
${text}
Respond ONLY with valid JSON. No markdown.`;

  return await callGeminiDirect(apiKey, prompt);
}

async function matchFormFieldsWithAI(apiKey, profile, fields) {
  const prompt = `You are an automated job application filler. Match each form field with the user's profile.

User Profile:
${JSON.stringify(profile)}

Detected Form Fields:
${JSON.stringify(fields)}

UNIVERSAL APPLICANT DEFAULT RULES:
1. WORK AUTHORIZATION: Pick "Yes", "Legally authorized", or "Authorized to work". For sponsorship required questions, pick "No".
2. RELOCATION: Default to "Yes" or willing to relocate / open to travel.
3. CONFIRMATIONS / AGREEMENTS: Return true.
4. DROPDOWN ("select"): Return the exact string matching one of the available options.
5. RADIOS: Return true for the intended affirmative option.
6. TEXT / TEXTAREA: Write concise, tailored professional answers using the profile.

Return ONLY a JSON array in this exact format:
[
  { "id": "field_id", "value": "matched_value_or_boolean" }
]`;

  return await callGeminiDirect(apiKey, prompt);
}