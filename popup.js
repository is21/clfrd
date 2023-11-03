document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get('openai_api_key', function(data) {
    var openai_api_key = data.openai_api_key;

    if (!openai_api_key) {
        document.getElementById('apiKeyInput').style.display = 'block';
        document.getElementById('save').addEventListener('click', function() {
          var openai_api_key = document.getElementById('openai_api_key').value;
          chrome.storage.sync.set({openai_api_key: openai_api_key}, function() {
            window.location.reload();
          });
        });
        return;
    }

    document.getElementById('apiKeyInput').style.display = 'none';
    document.getElementById('loadingMessage').textContent = "Generating summary...";

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['readability.js']
      }, function() {
        chrome.runtime.sendMessage({message: "get_readability_result"}, function(response) {
          if (response.result) {
            let content = response.result.textContent;
            let contentLength = content.length;
            let maxRequestSize = 4096; // Adjust this to the maximum request size for the API
            let numChunks = Math.ceil(contentLength / maxRequestSize);
            let chunkSize = Math.ceil(contentLength / numChunks);
            let contentParts = content.match(new RegExp('.{1,' + chunkSize + '}', 'g'));
            let summaries = [];
            let promises = contentParts.map(part => {
              return fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + openai_api_key
                },
                body: JSON.stringify({
                  model: "gpt-3.5-turbo",
                  temperature: 0.5,
                  messages: [{
                    role: "system",
                    content: "You are a helpful assistant."
                  }, {
                    role: "user",
                    content: `Summarize the following text in a single paragraph: ${part}`
                  }]
                }),
              })
              .then(response => response.json())
              .then(data => {
                console.log(data);
                // Check if the choices array exists and has at least one element
                if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
                  let summary = data.choices[0].message.content.trim();
                  summaries.push(summary);
                } else {
                  console.log("Unexpected API response:", data);
                }
              });
            });

            Promise.all(promises)
            .then(() => {
              let combinedSummary = summaries.join(' ');
              return fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + openai_api_key
                },
                body: JSON.stringify({
                  model: "gpt-3.5-turbo",
                  temperature: 0.5,
                  messages: [{
                    role: "system",
                    content: "You are a helpful assistant."
                  }, {
                    role: "user",
                    content: `Summarize the following text prefaced with "Text:"
                    The summary should contain a summarized title wrapped in an H1 tag.
                    The body should be broken into easily digestible paragraphs wrapped in P tags.
                    The body of the summary should be no more than 3 paragraphs
                     Text: ${combinedSummary}`
                  }]
                }),
              });
            })
            .then(response => response.json())
            .then(data => {
              // Check if the choices array exists and has at least one element
              if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
                let finalSummary = data.choices[0].message.content.trim();
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('readability').innerHTML = finalSummary;
              } else {
                console.log("Unexpected API response:", data);
              }
            })
          } else {
            document.getElementById('readability').textContent = "Could not parse the page.";
          }
        });
      });
    });
  });
});