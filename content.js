// Native Prototype Setter to bypass React/Vue/Angular property wrapping
function setNativeValue(element, value) {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function runAutofillProcess(onComplete) {
  if (!chrome.runtime?.id) {
    alert("Extension context invalidated. Please refresh this page first.");
    if (onComplete) onComplete("Refresh page");
    return;
  }

  const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select';
  const elements = Array.from(document.querySelectorAll(selector));

  if (!elements.length) {
    if (onComplete) onComplete("No fillable fields found.");
    return;
  }

  const fields = elements.map((el, idx) => {
    const uniqueId = el.id ? el.id : (el.name ? `${el.name}_${el.value || idx}` : `field_${idx}`);
    el.setAttribute('data-ai-fill-id', uniqueId);

    let labelText = "";
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) labelText = lbl.innerText;
    }
    if (!labelText && el.closest('label')) labelText = el.closest('label').innerText;
    if (!labelText && el.parentElement?.tagName.toLowerCase() === 'label') labelText = el.parentElement.innerText;
    if (!labelText && el.getAttribute('aria-label')) labelText = el.getAttribute('aria-label');
    if (!labelText && el.placeholder) labelText = el.placeholder;

    let groupQuestion = "";
    if (el.type === 'radio' && el.name) {
      const groupContainer = el.closest('div, fieldset');
      const prevHeading = groupContainer?.previousElementSibling || el.closest('div')?.querySelector('label');
      groupQuestion = prevHeading ? prevHeading.innerText : el.name;
    }

    const item = {
      id: uniqueId,
      name: el.name || '',
      tag: el.tagName.toLowerCase(),
      type: el.type || 'text',
      label: (labelText || '').replace(/\s+/g, ' ').trim(),
      groupQuestion: groupQuestion.trim(),
      placeholder: el.placeholder || ''
    };

    if (el.tagName.toLowerCase() === 'select') {
      item.options = Array.from(el.options)
        .filter(opt => opt.value !== "")
        .map(opt => ({ text: opt.text.trim(), value: opt.value }));
    }
    if (el.type === 'radio') {
      item.radioValue = el.value;
    }

    return item;
  });

  chrome.runtime.sendMessage({ type: "MATCH_FIELDS", fields }, (res) => {
    if (res?.success && Array.isArray(res.answers)) {
      res.answers.forEach(item => {
        const target = document.querySelector(`[data-ai-fill-id="${item.id}"]`);
        if (!target || item.value === undefined || item.value === null) return;

        target.focus();

        // 1. Dropdown handler
        if (target.tagName.toLowerCase() === 'select') {
          const valStr = String(item.value).toLowerCase().trim();
          let match = Array.from(target.options).find(opt =>
            opt.value.toLowerCase() === valStr ||
            opt.text.toLowerCase().trim() === valStr
          );

          if (!match && valStr !== "") {
            match = Array.from(target.options).find(opt =>
              opt.value !== "" && (
                opt.text.toLowerCase().includes(valStr) ||
                valStr.includes(opt.text.toLowerCase()) ||
                (valStr.includes("yes") && opt.text.toLowerCase().includes("yes")) ||
                (valStr.includes("authoriz") && opt.text.toLowerCase().includes("authoriz"))
              )
            );
          }

          if (match) {
            target.value = match.value;
            target.selectedIndex = match.index;
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        // 2. Checkbox handler
        else if (target.type === 'checkbox') {
          const isCheck = item.value === true || item.value === "true" || item.value === "yes";
          target.checked = isCheck;
          target.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // 3. Radio button handler
        else if (target.type === 'radio') {
          const shouldSelect = item.value === true || item.value === "true" || String(item.value).toLowerCase() === target.value.toLowerCase();
          if (shouldSelect) {
            target.checked = true;
            target.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        // 4. Text inputs & textareas
        else {
          setNativeValue(target, item.value);
        }

        target.blur();
      });
      if (onComplete) onComplete("Done!");
    } else {
      if (onComplete) onComplete("Failed: " + (res?.error || "Error"));
    }
  });
}

// In-Page Floating Button
function injectFloatingButton() {
  if (document.getElementById('ai-autofill-float-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'ai-autofill-float-btn';
  btn.innerHTML = '⚡ Autofill';
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '2147483647',
    padding: '10px 16px',
    backgroundColor: '#0066cc',
    color: '#ffffff',
    border: 'none',
    borderRadius: '24px',
    fontWeight: 'bold',
    fontSize: '12px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
    cursor: 'pointer',
    fontFamily: 'sans-serif'
  });

  btn.addEventListener('mouseenter', () => btn.style.backgroundColor = '#0052a3');
  btn.addEventListener('mouseleave', () => btn.style.backgroundColor = '#0066cc');

  btn.addEventListener('click', () => {
    btn.innerHTML = '⏳ Filling...';
    btn.disabled = true;
    runAutofillProcess((msg) => {
      btn.innerHTML = '✓ ' + msg;
      setTimeout(() => {
        btn.innerHTML = '⚡ Autofill';
        btn.disabled = false;
      }, 2000);
    });
  });

  document.body.appendChild(btn);
}

// Popup message listener
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "RUN_AUTOFILL") {
    runAutofillProcess((msg) => sendResponse({ status: msg }));
    return true;
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectFloatingButton);
} else {
  injectFloatingButton();
}