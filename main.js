const {app,BrowserWindow,ipcMain,globalShortcut,Tray,Menu,shell,nativeImage}=require('electron');
const fs=require('fs'),path=require('path');
// Windows gets the acrylic backdrop, macOS the vibrancy material, and
// Linux a plain transparent window where the CSS glass does the work.
const windowChrome=()=>{
  if(process.platform==='darwin')return{vibrancy:'under-window',visualEffectState:'active',transparent:false,backgroundColor:'#00000000'};
  if(process.platform==='win32')return{backgroundMaterial:'acrylic',transparent:true,backgroundColor:'#00000000'};
  return{transparent:true,backgroundColor:'#00000000'};
};
// 'screen-saver' only exists on Windows - macOS rejects it outright.
const topLevel=process.platform==='win32'?'screen-saver':'floating';
app.setAppUserModelId('com.shounak.glassticker');
if(!app.requestSingleInstanceLock()){app.quit();return}
let win,tray,toTray=false,quitting=false;
const pinnedWidgets=new Map(); let widgetSeq=0;
const icon=path.join(__dirname,'icon.png'),cfg=()=>path.join(app.getPath('userData'),'win.json');
let island=null,lastIsland=null,curOp=1,islandPinned=true,islandPos='top-center',islandInteractive=false;
function fade(w,to,ms,cb){const from=w.getOpacity(),t0=Date.now(),iv=setInterval(()=>{if(w.isDestroyed())return clearInterval(iv);const k=Math.min(1,(Date.now()-t0)/ms);w.setOpacity(from+(to-from)*k);if(k>=1){clearInterval(iv);cb&&cb()}},16)}
const closeIsland=()=>{const isl=island;island=null;if(isl&&!isl.isDestroyed()){isl.webContents.send('island:bye');setTimeout(()=>{if(!isl.isDestroyed())isl.close()},240)}};
const show=()=>{closeIsland();win.setOpacity(0);win.show();win.focus();fade(win,curOp,220)};
function openIsland(p){
  if(p)lastIsland=p;
  if(island&&!island.isDestroyed())return;
  const {screen}=require('electron'),wa=screen.getDisplayMatching(win.getBounds()).workArea,IW=440,IH=300;
  island=new BrowserWindow({width:IW,height:IH,x:Math.round(wa.x+(wa.width-IW)/2),y:wa.y,frame:false,transparent:true,backgroundColor:'#00000000',resizable:false,movable:true,minimizable:false,maximizable:false,alwaysOnTop:true,skipTaskbar:true,hasShadow:false,focusable:true,show:false,
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,sandbox:true}});
  island.setAlwaysOnTop(true,topLevel);island.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
  island.setIgnoreMouseEvents(true,{forward:true});
  island.loadFile('island.html');
  island.webContents.once('did-finish-load',()=>{if(lastIsland)island.webContents.send('island:data',lastIsland);island.showInactive();fade(win,0,170,()=>{win.hide();win.setOpacity(curOp)})});
  {const me=island;me.on('closed',()=>{if(island===me)island=null})}
}
ipcMain.handle('island-open',(_,p)=>openIsland(p));
ipcMain.on('island-update',(_,p)=>{lastIsland=p;if(island&&!island.isDestroyed())island.webContents.send('island:data',p)});
ipcMain.on('island-ignore',(_,b)=>{if(island&&!island.isDestroyed())island.setIgnoreMouseEvents(!!b,{forward:true})});
ipcMain.handle('island-restore',()=>show());
ipcMain.handle('island-close',()=>{closeIsland();return true;});
// When the island is sent behind the other windows it cannot be clicked, so
// this hotkey brings it back to the front.
ipcMain.handle('island-toggle-front',()=>{if(!island||island.isDestroyed())return false;islandPinned=!islandPinned;island.setAlwaysOnTop(islandPinned,topLevel);if(islandPinned)island.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});island.webContents.send('island:state',{pinned:islandPinned,position:islandPos});return islandPinned;});
// The island can be pushed behind other windows, brought back in front, and
// moved out of the way of whatever is being used.
ipcMain.handle('island-interactive',(_,on)=>{if(island&&!island.isDestroyed()){island.setIgnoreMouseEvents(!on,{forward:true});if(on)island.focus();}});
ipcMain.handle('island-pin',(_,on)=>{islandPinned=!!on;if(island&&!island.isDestroyed()){island.setAlwaysOnTop(islandPinned,topLevel);if(islandPinned)island.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});}return islandPinned;});
ipcMain.handle('island-move',(_,p)=>{if(island&&!island.isDestroyed()){const wa=require('electron').screen.getDisplayMatching(island.getBounds()).workArea,b=island.getBounds();const x=Math.round(Math.min(Math.max(p.x,wa.x),wa.x+wa.width-b.width)),y=Math.round(Math.min(Math.max(p.y,wa.y),wa.y+wa.height-b.height));island.setPosition(x,y);}});
ipcMain.handle('island-position',(_,pos)=>{placeIsland(pos);return pos;});
ipcMain.handle('island-state',()=>({pinned:islandPinned,position:islandPos,interactive:islandInteractive}));
ipcMain.handle('island-menu',()=>{
  if(!island||island.isDestroyed())return null;
  const {Menu}=require('electron');
  const place=(label,pos)=>label.replace('•',islandPos===pos?'•':' ').trim();
  const menu=Menu.buildFromTemplate([
    {label:islandPinned?'Always on front':'Send to back',click:()=>{islandPinned=!islandPinned;island.setAlwaysOnTop(islandPinned,topLevel);if(islandPinned)island.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});}},
    {type:'separator'},
    {label:'Position',submenu:[
      {label:place('Top centre','top-center'),click:()=>placeIsland('top-center')},
      {label:place('Top left','top-left'),click:()=>placeIsland('top-left')},
      {label:place('Top right','top-right'),click:()=>placeIsland('top-right')},
      {label:place('Bottom centre','bottom-center'),click:()=>placeIsland('bottom-center')},
      {label:place('Bottom left','bottom-left'),click:()=>placeIsland('bottom-left')},
      {label:place('Bottom right','bottom-right'),click:()=>placeIsland('bottom-right')},
    ]},
    {label:'Reset position',click:()=>placeIsland('top-center')},
    {type:'separator'},
    {label:'Hide island',click:()=>closeIsland()},
  ]);
  menu.popup({window:island});
  return true;
});
function placeIsland(pos){
  islandPos=pos;
  if(!island||island.isDestroyed())return;
  const wa=require('electron').screen.getDisplayMatching(island.getBounds()).workArea,b=island.getBounds();
  const w=b.width,h=b.height;
  let x=wa.x+Math.round((wa.width-w)/2),y=wa.y;
  if(pos==='top-left'){x=wa.x+16;y=wa.y+8;}
  else if(pos==='top-right'){x=wa.x+wa.width-w-16;y=wa.y+8;}
  else if(pos==='bottom-center'){x=wa.x+Math.round((wa.width-w)/2);y=wa.y+wa.height-h-16;}
  else if(pos==='bottom-left'){x=wa.x+16;y=wa.y+wa.height-h-16;}
  else if(pos==='bottom-right'){x=wa.x+wa.width-w-16;y=wa.y+wa.height-h-16;}
  island.setPosition(x,y);
}
function createWindow(){
  let c={};try{c=JSON.parse(fs.readFileSync(cfg()))}catch{}
  win=new BrowserWindow({width:c.width||1020,height:c.height||640,x:c.x,y:c.y,minWidth:460,minHeight:320,icon,
    frame:false,...windowChrome(),show:false,
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,sandbox:true}});
  win.loadFile('index.html');
  win.once('ready-to-show',()=>{if(c.max)win.maximize();win.show()});
  const st=()=>{if(win&&!win.isDestroyed())win.webContents.send('ws',{max:win.isMaximized()})};win.on('maximize',st);win.on('unmaximize',st);win.webContents.on('did-finish-load',st);
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.on('close',e=>{try{fs.writeFileSync(cfg(),JSON.stringify({...win.getNormalBounds(),max:win.isMaximized()}))}catch{}
    if(toTray&&!quitting){e.preventDefault();win.hide()}});
}
ipcMain.handle('get',async(_,u)=>{
  if(!/^https:\/\/query[12]\.finance\.yahoo\.com\//.test(u))throw new Error('blocked');
  const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw new Error('HTTP '+r.status);return r.json();
});
ipcMain.handle('open',(_,u)=>{if(typeof u==='string'&&/^https:\/\//.test(u))shell.openExternal(u)});
ipcMain.handle('pin-widget',(event,payload,hideMain=false,onlyOutside=false)=>{
  const point=require('electron').screen.getCursorScreenPoint();
  if(onlyOutside&&win&&!win.isDestroyed()){const b=win.getBounds();if(point.x>=b.x&&point.x<=b.x+b.width&&point.y>=b.y&&point.y<=b.y+b.height)return null}
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
  if(c==='op'){curOp=Math.min(1,Math.max(.4,+v||1));win.setOpacity(curOp)}
  if(c==='auto'){if(process.platform!=='linux')app.setLoginItemSettings({openAtLogin:!!v});}
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
  globalShortcut.register('Control+Shift+I',()=>{if(!island||island.isDestroyed())return;islandPinned=!islandPinned;island.setAlwaysOnTop(islandPinned,topLevel);if(islandPinned)island.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});island.webContents.send('island:state',{pinned:islandPinned,position:islandPos});});
});
app.on('before-quit',()=>{quitting=true});
app.on('second-instance',()=>{win&&show()});
app.on('window-all-closed',()=>app.quit());
