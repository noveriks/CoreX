const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  const w = new BrowserWindow({
    width: 400, height: 300, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'out/preload/index.js'),
      sandbox: false,
      spellcheck: false
    }
  });
  w.loadFile(path.join(__dirname, 'out/renderer/index.html'));
  w.webContents.once('dom-ready', async () => {
    try {
      const hasElectron = await w.webContents.executeJavaScript('typeof window.electron');
      console.log('window.electron type:', hasElectron);
      if (hasElectron !== 'undefined') {
        const result = await w.webContents.executeJavaScript('await invoke({channel:"get-system-info"})');
        console.log('get-system-info result:', JSON.stringify(result).substring(0, 300));
      } else {
        console.log('window.electron is NOT available!');
      }
    } catch(e) {
      console.log('JS error:', e.message);
    }
    w.close();
    setTimeout(() => app.quit(), 500);
  });
  w.webContents.on('did-fail-load', (e, code, desc) => {
    console.log('LOAD ERROR:', code, desc);
    setTimeout(() => app.quit(), 500);
  });
});

process.on('uncaughtException', (e) => {
  console.error('UNCAUGHT:', e.message);
  app.quit();
});
