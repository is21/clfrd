let readabilityResult = null;

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['readability.js']
  });
});

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.message === "readability_result") {
      readabilityResult = request.result;
    }
  }
);

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.message === "get_readability_result") {
      sendResponse({ result: readabilityResult });
    }
  }
);