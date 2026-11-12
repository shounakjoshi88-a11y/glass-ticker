const {app,BrowserWindow,ipcMain,globalShortcut,Tray,Menu,shell,nativeImage}=require('electron');
const fs=require('fs'),path=require('path');
app.setAppUserModelId('com.shounak.glassticker');
if(!app.requestSingleInstanceLock()){app.quit();return}
let win,tray,toTray=false,quitting=false;
const pinnedWidgets=new Map(); let widgetSeq=0;
const icon=path.join(__dirname,'icon.png'),cfg=()=>path.join(app.getPath('userData'),'win.json');
const show=()=>{win.show();win.focus()};
function createWindow(){
  let c={};try{c=JSON.parse(fs.readFileSync(cfg()))}catch{}
  win=new BrowserWindow({width:c.width||1020,height:c.height||640,x:c.x,y:c.y,minWidth:460,minHeight:320,icon,
    frame:false,backgroundMaterial:'acrylic',backgroundColor:'#00000000',show:false,
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,sandbox:true}});
  win.loadFile('index.html');
  win.once('ready-to-show',()=>win.show());
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.on('close',e=>{try{fs.writeFileSync(cfg(),JSON.stringify(win.getBounds()))}catch{}
    if(toTray&&!quitting){e.preventDefault();win.hide()}});
}
ipcMain.handle('get',async(_,u)=>{
  if(!/^https:\/\/query[12]\.finance\.yahoo\.com\//.test(u))throw new Error('blocked');
  const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw new Error('HTTP '+r.status);return r.json();
});
ipcMain.handle('open',(_,u)=>{if(typeof u==='string'&&/^https:\/\//.test(u))shell.openExternal(u)});
ipcMain.handle('pin-widget',(event,payload,hideMain=false)=>{
  const point=require('electron').screen.getCursorScreenPoint();
  const id=String(++widgetSeq);
  const w=new BrowserWindow({width:300,height:190,x:Math.max(0,point.x-150),y:Math.max(0,point.y-70),
    frame:false,transparent:true,backgroundColor:'#00000000',resizable:true,minWidth:230,minHeight:145,
    alwaysOnTop:true,skipTaskbar:true,hasShadow:false,show:false,
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,sandbox:true}});
  w.setAlwaysOnTop(true,'floating'); w.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
  pinnedWidgets.set(id,w); w.loadFile('widget.html');
  w.webContents.once('did-finish-load',()=>{w.webContents.send('widget:data',payload);w.showInactive()});
  w.on('closed',()=>pinnedWidgets.delete(id)); if(hideMain)setTimeout(()=>{if(win&&!win.isDestroyed())win.hide()},120); return id;
});
ipcMain.on('widget-update',(_,payload)=>{for(const w of pinnedWidgets.values())if(!w.isDestroyed())w.webContents.send('widget:data',payload)});
ipcMain.handle('widget-close',event=>{const w=BrowserWindow.fromWebContents(event.sender);if(w&&w!==win)w.close()});
ipcMain.handle('win',(_,c,v)=>{
  if(c==='min')win.minimize();
  if(c==='max'){if(win.isMaximized())win.unmaximize();else win.maximize();}
  if(c==='close')win.close();
  if(c==='top')win.setAlwaysOnTop(!!v);
  if(c==='op')win.setOpacity(Math.min(1,Math.max(.4,+v||1)));
  if(c==='auto')app.setLoginItemSettings({openAtLogin:!!v});
  if(c==='tray')toTray=!!v;
  if(c==='tip'&&tray)tray.setToolTip('Glass Ticker  '+String(v).slice(0,100));
});
app.whenReady().then(()=>{
  createWindow();
  tray=new Tray(nativeImage.createFromPath(icon).resize({width:16,height:16}));
  tray.setToolTip('Glass Ticker');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'Show Glass Ticker',click:show},{label:'Quit',click:()=>{quitting=true;app.quit()}}]));
  tray.on('click',()=>win.isVisible()?win.hide():show());
  globalShortcut.register('Control+Shift+G',()=>win.isVisible()&&win.isFocused()?win.hide():show());
});
app.on('before-quit',()=>{quitting=true});
app.on('second-instance',()=>{win&&show()});
app.on('window-all-closed',()=>app.quit());
