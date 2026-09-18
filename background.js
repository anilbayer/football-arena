chrome.action.onClicked.addListener(function () {
  var url = chrome.runtime.getURL("app.html");
  chrome.tabs.query({ url: url }, function (tabs) {
    if (tabs && tabs.length) {
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: url });
    }
  });
});
