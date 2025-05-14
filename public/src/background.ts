import { get, set, clear } from './shared/storage';

chrome.runtime.onInstalled.addListener(async () => {
  const done = await get('pg_done');
  if (!done) chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((req, _sender, send) => {
  if (req.type === 'getUserData')
    get(['keywords', 'hasPersonalModel']).then(send);
  else if (req.type === 'wipeAll') {
    clear().then(() => {
      chrome.runtime.reload();
      send(true);
    });
  } else if (req.type === 'modelUpdated') {
    chrome.tabs.query({}, (tabs) =>
      tabs.forEach((t) =>
        chrome.tabs.sendMessage(t.id!, { type: 'hotReloadModel' })
      )
    );
    send(true);
  }
  return true;
});
