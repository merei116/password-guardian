const t=e=>new Promise(o=>{chrome.storage.local.get(e,s=>o(s[e]))}),r=e=>new Promise(o=>chrome.storage.local.set(e,()=>o()));export{t as g,r as s};
