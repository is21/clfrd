document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.sync.get('openai_api_key', function(data) {
      var openai_api_key = data.openai_api_key;
  
      // If the API key is set, prepopulate the input field
      if (openai_api_key) {
          document.getElementById('openai_api_key').value = openai_api_key;
      }
    });
  
    document.getElementById('save').addEventListener('click', function() {
      var openai_api_key = document.getElementById('openai_api_key').value;
      chrome.storage.sync.set({openai_api_key: openai_api_key});
    });
  });