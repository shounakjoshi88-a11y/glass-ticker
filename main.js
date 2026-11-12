const {app,BrowserWindow,ipcMain,globalShortcut,Tray,Menu,shell,nativeImage}=require('electron');
const fs=require('fs'),path=require('path');
app.setAppUserModelId('com.shounak.glassticker');
if(!app.requestSingleInstanceLock()){app.quit();return}
let win,tray,toTray=false,quitting=false;
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
ipcMain.handle('win',(_,c,v)=>{
  if(c==='min')win.minimize();
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
