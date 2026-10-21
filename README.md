# ⚡ AI Form Autofill Assistant

An AI-driven Chrome extension built with Manifest V3 that automatically detects, matches, and fills out job application forms using Google's Gemini API. 

It handles standard inputs, open-ended behavioral questions, dropdown menus (`<select>`), radio button groups, and checkboxes—bypassing reactive state restrictions found in modern frameworks like React, Vue, and Angular.

---

## ✨ Features

- **Automated Resume Parsing**: Extracts unstructured resume text into a normalized JSON profile (contact info, work experience, skills, education) in one click.
- **Smart Form Field Detection**: Scans visible labels, input attributes, ARIA tags, and dropdown options to intelligently match fields to your background.
- **Modern SPA Compatibility**: Dispatches synthetic browser events using the native prototype property setter, ensuring forms built with React, Vue, and Angular persist values on submission.
- **Support for All Field Types**:
  - Text fields and long-form textareas.
  - `<select>` dropdowns (matches choices based on visible text and values).
  - Radio button groups (maps answers like relocation and availability without ID collision).
  - Checkboxes (auto-toggles confirmation and terms checkboxes).
- **Ephemeral API Key Security**: The API key is stored only in volatile session memory—it is never written to persistent disk storage, allowing keys to be updated or swapped at any time.
- **Dual-Mode Profile Management**: Switch seamlessly between one-click AI resume extraction and a direct, editable JSON view without burning unnecessary tokens.
- **In-Page Floating Action Button**: Trigger autofill directly from the web page via a persistent floating action pill without reopening the extension popup.

---

## 📁 Project Structure

```text
ai-autofill-extension/
├── manifest.json      # Extension configuration and permission declarations (Manifest V3)
├── popup.html         # User interface for setting API keys, profile data, and manual triggers
├── popup.js           # Logic for profile tab switching, key management, and UI messaging
├── background.js      # Service worker managing Gemini API calls and session key memory
├── content.js         # Injected script handling DOM scanning, input setting, and floating button
└── icon.png           # Extension icon
```

---

## 🚀 Getting Started

### Prerequisites

- Google Chrome (or any Chromium-based browser like Brave, Edge, or Arc).
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/).

### Installation

1. Clone or Download the Repository:
   ```bash
   git clone https://github.com/vigneshsivasubramaniyan/autofill.git
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the folder containing your project files.
6. *(Optional for local file testing)*: Click **Details** on the extension card and turn **ON** the toggle for **Allow access to file URLs**.

---

## 🛠️ Usage

### 1. Set Your API Key & Save Profile
1. Click the **AI Autofill Assistant** icon from your browser toolbar.
2. Paste your Gemini API key into the top field and click **Submit / Update Active Key**.
3. Under the **Resume Text** tab, paste your resume or career summary.
4. Click **Parse & Save with AI**.
5. Switch to the **Direct JSON** tab to inspect or manually edit any specific fields, then click **Save JSON Directly**.

### 2. Autofill Applications
1. Open any job application page (e.g., Workday, Lever, Greenhouse, or any custom form).
2. Click the floating **⚡ Autofill** button in the bottom-right corner of the page (or click **Autofill Current Page** in the popup).
3. The extension scans all visible fields, crafts answers, and populates the form automatically.

---

## ⚙️ Configuration & Defaults

The extension includes built-in applicant defaults in `background.js` when certain fields are not explicitly defined in the profile:
- **Work Authorization**: Defaults to authorized/eligible.
- **Visa Sponsorship**: Defaults to "No" if sponsorship is requested.
- **Relocation**: Defaults to open to relocation / travel.
- **Terms & Declarations**: Toggles confirmation checkboxes to true.

---

## 🔒 Privacy & Permissions

- `storage`: Used only to persist your parsed profile JSON locally on your machine.
- `activeTab` / `scripting`: Used to inspect form elements and insert answers on the page you are viewing.
- **API Key Handling**: API keys remain strictly in volatile memory during the active browser session and are never saved to disk storage.
- **No Third-Party Analytics**: Data is only transferred between your browser and the designated LLM endpoint (`generativelanguage.googleapis.com`).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).