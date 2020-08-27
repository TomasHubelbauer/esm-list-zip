import listZip from './index.js';

window.addEventListener('load', () => {
  /** @type {HTMLInputElement} */
  const urlInput = document.querySelector('#urlInput');

  /** @type {HTMLButtonElement} */
  const goButton = document.querySelector('#goButton');

  /** @type {HTMLDivElement} */
  const exampleDiv = document.querySelector('#exampleDiv');

  function logMessage(/** @type {string} */ message) {
    const div = document.createElement('div');
    div.textContent = message;
    exampleDiv.append(div);
  }

  function printEntry(/** @type {{ name: string; offset: number; size: number; content: ArrayBuffer; }} */ entry) {
    logMessage(`${entry.name} (@${entry.offset}, size ${entry.size}${entry.content ? `, ${entry.content.byteLength} preloaded` : ', not preloaded'})`)
  }

  function onFetch(/** @type {number} */ start,/** @type {number} */ end,/** @type {string} */ target ) {
    logMessage(`Downloading range ${start}-${end} (${end - start} bytes) looking for ${target}`);
  }
  
  function onNoRange() {
    logMessage('Downloaded the entire archive as the server does not support range reqeusts and returned the whole archive');
  }

  goButton.addEventListener('click', async () => {
    exampleDiv.innerHTML = '';
    const url = urlInput.value || urlInput.placeholder;
    try {
      for await (const entry of listZip(url, onFetch, onNoRange)) {
        printEntry(entry);
      }
    } catch (error) {
      logMessage(error);
    }
  });
});
