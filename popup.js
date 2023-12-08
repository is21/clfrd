let PROMPT = '';

fetch(chrome.runtime.getURL('prompt.txt'))
    .then(response => response.text())
    .then(data => {
        PROMPT = data;
    })
    .catch((error) => {
        console.error('Error:', error);
    });

document.addEventListener('DOMContentLoaded', function () {
    chrome.storage.sync.get('openai_api_key', function (data) {
        var openai_api_key = data.openai_api_key;

        if (!openai_api_key) {
            document.getElementById('apiKeyInput').innerHTML = `
        <p>To get started, input your OpenAI API key <br>
        <a id="apiLink" href="https://platform.openai.com/docs/" target="_blank">Learn how to create an API key at platform.openai.com/docs</a></p>
        <input type="text" id="openai_api_key" placeholder="API key">
        <button id="save">Save</button>`
            document.getElementById('save').addEventListener('click', function () {
                var openai_api_key = document.getElementById('openai_api_key').value;
                chrome.storage.sync.set({ openai_api_key: openai_api_key }, function () {
                    window.location.reload();
                });
            });
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['readability.js']
            }, function () {
                chrome.runtime.sendMessage({ message: "get_readability_result" }, function (response) {
                    if (response.result) {
                        let content = response.result.textContent;
                        let wordCount = content.split(' ').length;
                        let readingTime = Math.ceil(wordCount / 200) - 1;
                        document.getElementById('loadingMessage').innerHTML = "<div id='generating'>Generating summary<span>.</span><span>.</span><span>.</span></div><span id='readingTime'>This will save you approximately " + readingTime + " minutes of reading time.</span>";
                        let maxContentSize = 128000;

                        if (content.length > maxContentSize) {
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
                                    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
                                        let summary = data.choices[0].message.content.trim();
                                        document.getElementById('loadingMessage').style.display = 'none';
                                        document.getElementById('readability').innerHTML = summary;
                                    } else {
                                        console.log("Unexpected API response:", data);
                                        document.getElementById('readability').innerHTML = "<b>Error:</b>" + data.error.message ;
                                        document.getElementById('loadingMessage').style.display = 'none';
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