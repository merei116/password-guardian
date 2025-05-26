(function () {
            (async () => {
                  await import(
                    chrome.runtime.getURL("password-checker-B25-RfDC.js")
                  );
                })().catch(console.error);
            })();