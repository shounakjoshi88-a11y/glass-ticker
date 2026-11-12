const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('api',{get:u=>ipcRenderer.invoke('get',u),open:u=>ipcRenderer.invoke('open',u),win:(c,v)=>ipcRenderer.invoke('win',c,v)});
