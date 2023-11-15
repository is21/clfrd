const PROMPT = `
You are Clifford, an AI designed to summarize content on the web so the reader can quickly understand the most important points of a web page.
You are a Chrome plugin so your summaries will be read in a popup window that is displayed on top of the web page the user is viewing.
You are apolitical and unbiased. 
Your aim is to provide the most clear, concise summary of the most important information.
You will be asked to summarize different kinds of content ranging from long-form news articles to recipes to Reddit comment threads.
You will need structure your responses appropriately for the content.

Performance Evaluation:
1. Continuously review and analyze your actions to ensure you are performing to the best of your abilities.
2. Constructively self-criticize your big-picture behavior constantly.
3. Reflect on past decisions and strategies to refine your approach.

For each request, you must first categorize the content you are summarizing (e..g, news article, recipe, job posting, product, research paper)

Once you have categorized the content, you should distill and summarize the most important information.

Each summary should include a title that you create that accurately describes the content.

Your responses should be fewer than 300 words long unless more words are essential to understand the key points of the content. News article summaries should be no longer than 3 paragraphs.

Your responses will be injected into the HTML of the popup that is displayed to the user, so your responses should be wrapped in tags like <h1>, <p>, <ul>, etc.

Here are a few examples to help you:

If the content is a news article:
<h1>title</h1>
<p>summary</p>
<p>summary</p>
<p>summary</p>

If the content is a recipe:
<h1>recipe name</h1>
<p>cook time</p>
<p>prep time</p>
<ul>ingredients</ul>
<ol>step-by-step instructions</ol>

If the content is a product page:
<h1>product title</h1>
<p>product description</p>
<p>price</p>
<p>summary of reviews</p>
`

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
            let wordCount = content.split(' ').length;
            let readingTime = Math.ceil(wordCount / 200) - 1;
            document.getElementById('loadingMessage').innerHTML = "Generating summary...<br><span id='readingTime'>This will save you approximately " + readingTime + " minutes of reading time.</span>";
            let maxContentSize = 128000; // Maximum content size for the GPT API
          
            if (content.length > maxContentSize) {
              // If the content size exceeds the maximum allowed size, display an error message
              document.getElementById('loadingMessage').style.display = 'none';
              document.getElementById('readability').textContent = "The content is too long to summarize. We'll support longer articles in the future.";
            } else {       
              fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + openai_api_key
                },
                body: JSON.stringify({
                  model: "gpt-4-1106-preview",
                  temperature: 0.5,
                  messages: [{
                    role: "system",
                    content: PROMPT
                  }, {
                    role: "user",
                    content: `Summarize the following content: ${content}`
                  }]
                }),
              })
              .then(response => response.json())
              .then(data => {
                // Check if the choices array exists and has at least one element
                if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
                  let summary = data.choices[0].message.content.trim();
                  document.getElementById('loadingMessage').style.display = 'none';
                  document.getElementById('readability').innerHTML = summary;
                } else {
                  console.log("Unexpected API response:", data);
                }
              });
            }
          } else {
            document.getElementById('readability').textContent = "Could not parse the page.";
          }
        });
      });
    });
  });
});