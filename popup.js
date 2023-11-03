document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.sync.get('openai_api_key', function (data) {
    var openai_api_key = data.openai_api_key;

    // If the API key is not set, display the input field and save button
    if (!openai_api_key) {
      document.getElementById('apiKeyInput').style.display = 'block';
      document.getElementById('save').addEventListener('click', function () {
        var openai_api_key = document.getElementById('openai_api_key').value;
        chrome.storage.sync.set({ openai_api_key: openai_api_key }, function () {
          // Reload the popup to start the summary generation process
          window.location.reload();
        });
      });
      return;
    }

    // Hide the input field and save button
    document.getElementById('apiKeyInput').style.display = 'none';

    // Display the loading message only if the API key is present
    document.getElementById('loadingMessage').textContent = "Generating summary...";

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['readability.js']
      }, function () {
        chrome.runtime.sendMessage({ message: "get_readability_result" }, function (response) {
          // Check if response.result is not null
          if (response.result) {
            // Convert the readability result to a string
            let resultString = JSON.stringify(response.result);

            // Truncate the result string to 4000 characters
            let truncatedResult = resultString.substring(0, 4000);

            // Send the truncated readability object to the GPT API
            fetch('https://api.openai.com/v1/engines/text-davinci-002/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + openai_api_key
              },
              body: JSON.stringify({
                prompt: `
                Please generate a neutral and concise summary of the following article, focusing on the central arguments, findings, and conclusions. Exclude any supporting examples or details unless they are essential to understanding the main points. 
                Begin your summary with "Summary:" to clearly indicate the start of the summarized content.
                ${truncatedResult}
            `,
                max_tokens: 500
              }),
            })
              .then(response => response.json())
              .then(data => {
                // Hide the loading message
                document.getElementById('loadingMessage').style.display = 'none';

                // Display the API response in the popup
                document.getElementById('readability').innerHTML = data.choices[0].text.trim();
              })
              .catch(error => {
                console.log(error);
                // Display an error message
                document.getElementById('readability').textContent = "Could not get a response from the GPT API.";
              });
          } else {
            // Display an error message
            document.getElementById('readability').textContent = "Could not parse the page.";
          }
        });
      });
    });
  });
});