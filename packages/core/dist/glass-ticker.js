/* Glass Ticker web component - MIT licensed, https://github.com/shounakjoshi88-a11y/glass-ticker */
var N=["1D","5D","1M","3M","6M","YTD","1Y","5Y","MAX"],w=class{constructor(i="/api"){this.base=i.replace(/\/+$/,"")}async get(i,t){let e=await fetch(`${this.base}${i}`,{signal:t,headers:{Accept:"application/json"}});if(!e.ok)throw new Error(`${i} failed with HTTP ${e.status}`);return await e.json()}quotes(i,t){let e=encodeURIComponent(i.join(","));return this.get(`/quotes?symbols=${e}`,t)}chart(i,t,e){return this.get(`/chart?symbol=${encodeURIComponent(i)}&range=${encodeURIComponent(t)}`,e)}search(i,t){return this.get(`/search?q=${encodeURIComponent(i)}`,t)}};var et="http://www.w3.org/2000/svg";function c(n,i){let t=document.createElementNS(et,n);for(let[e,r]of Object.entries(i))t.setAttribute(e,String(r));return t}function d(n,i=2){return n==null||Number.isNaN(n)?"--":n.toLocaleString("en-US",{minimumFractionDigits:i,maximumFractionDigits:i})}function p(n,i,t=2){return n==null?"--":({USD:"$",INR:"\u20B9",EUR:"\u20AC",GBP:"\xA3",JPY:"\xA5",CNY:"\xA5",KRW:"\u20A9",CAD:"C$",AUD:"A$"}[(i||"").toUpperCase()]||"")+d(n,t)}function L(n,i=2){return n==null?"--":`${n>=0?"+":"-"}${d(Math.abs(n),i)}%`}function rt(n){let i=Math.abs(n);return i>=1e3?d(n,0):i>=100?d(n,1):d(n,2)}function V(n,i){let t=new Date(n*1e3);return i==="1D"||i==="5D"?t.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):i==="5Y"||i==="MAX"?String(t.getFullYear()):t.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}var it=0;function W(n,i){let t=i.points??[];if(n.innerHTML="",!t.length){let s=document.createElement("div");return s.className="gt-empty",s.textContent="No data",n.appendChild(s),null}let e=n.clientWidth||480,r=n.clientHeight||240,a=6,o=e<340?44:56,l=10,$=20,m=Math.max(10,e-a-o),b=Math.max(10,r-l-$),k=1/0,E=-1/0;for(let s of t)s[1]<k&&(k=s[1]),s[1]>E&&(E=s[1]);let z=E-k||Math.abs(E)*.02||1,T=k-z*.14,P=E+z*.14,f=s=>a+(t.length===1?m/2:s/(t.length-1)*m),C=s=>l+b-(s-T)/(P-T)*b,X=t[0][1],U=t[t.length-1][1],J=i.previousClose??X,S=U>=J?i.upColor:i.downColor,g=c("svg",{viewBox:`0 0 ${e} ${r}`,width:e,height:r}),G=`gt-grad-${it+=1}`,Q=c("defs",{}),M=c("linearGradient",{id:G,x1:"0",y1:"0",x2:"0",y2:"1"});M.appendChild(c("stop",{offset:"0%","stop-color":S,"stop-opacity":"0.28"})),M.appendChild(c("stop",{offset:"100%","stop-color":S,"stop-opacity":"0"})),Q.appendChild(M),g.appendChild(Q);let B=5;for(let s=0;s<B;s+=1){let x=T+(P-T)*s/(B-1),u=C(x);g.appendChild(c("line",{class:"gt-grid",x1:a,y1:u,x2:a+m,y2:u}));let y=c("text",{class:"gt-label",x:a+m+7,y:u+3});y.textContent=rt(x),g.appendChild(y)}let H="";for(let s=0;s<t.length;s+=1)H+=`${s===0?"M":"L"}${f(s).toFixed(2)} ${C(t[s][1]).toFixed(2)}`;let Z=`${H}L${f(t.length-1).toFixed(2)} ${(l+b).toFixed(2)}L${f(0).toFixed(2)} ${(l+b).toFixed(2)}Z`;g.appendChild(c("path",{d:Z,fill:`url(#${G})`})),g.appendChild(c("path",{d:H,fill:"none",stroke:S,"stroke-width":"1.8","stroke-linejoin":"round","stroke-linecap":"round"}));let R=Math.min(4,t.length);for(let s=0;s<R;s+=1){let x=Math.round(s*(t.length-1)/Math.max(1,R-1)),u=s===0?"start":s===R-1?"end":"middle",y=c("text",{class:"gt-label",x:f(x),y:l+b+14,"text-anchor":u});y.textContent=V(t[x][0],i.range),g.appendChild(y)}let j=f(t.length-1),F=C(U);g.appendChild(c("circle",{cx:j,cy:F,r:6,fill:S,opacity:"0.2"})),g.appendChild(c("circle",{cx:j,cy:F,r:3,fill:S})),n.appendChild(g);let _={points:t,xAt:f,yAt:C,padL:a,padT:l,plotW:m,plotH:b},v=c("line",{class:"gt-cross",y1:l,y2:l+b,x1:0,x2:0});v.style.display="none",g.appendChild(v);let h=document.createElement("div");h.className="gt-tip",h.style.display="none",n.appendChild(h);let K=s=>{let x=n.getBoundingClientRect(),u=s.clientX-x.left;if(u<a-4||u>a+m+4){v.style.display="none",h.style.display="none";return}let y=(u-a)/m,Y=Math.max(0,Math.min(t.length-1,Math.round(y*(t.length-1)))),D=t[Y],I=f(Y),tt=C(D[1]);v.setAttribute("x1",String(I)),v.setAttribute("x2",String(I)),v.style.display="",h.innerHTML=`<b>${p(D[1],i.currency)}</b><br><i>${V(D[0],i.range)}</i>`,h.style.left=`${Math.min(Math.max(I,44),e-44)}px`,h.style.top=`${Math.max(tt,30)}px`,h.style.display=""},q=()=>{v.style.display="none",h.style.display="none"};return g.addEventListener("mousemove",K),g.addEventListener("mouseleave",q),_}var O=`
:host {
  --gt-bg: #0b0b0d;
  --gt-panel: #121316;
  --gt-panel-2: #17181c;
  --gt-line: rgba(255, 255, 255, 0.08);
  --gt-text: #f2f2f3;
  --gt-muted: #8b8d96;
  --gt-dim: #5c5e67;
  --gt-up: #5eeaa8;
  --gt-down: #ff7a6b;
  --gt-accent: #5eeaa8;
  --gt-radius: 14px;
  --gt-font: "Inter", "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, sans-serif;
  --gt-mono: "JetBrains Mono", "Cascadia Mono", Consolas, monospace;

  display: block;
  box-sizing: border-box;
  font-family: var(--gt-font);
  color: var(--gt-text);
  background: var(--gt-bg);
  border-radius: var(--gt-radius);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  container-type: inline-size;
}

:host([theme="light"]) {
  --gt-bg: #f4f5f8;
  --gt-panel: #ffffff;
  --gt-panel-2: #fafbfc;
  --gt-line: rgba(15, 20, 30, 0.1);
  --gt-text: #15171c;
  --gt-muted: #63666f;
  --gt-dim: #8a8d96;
}

:host([theme="glass"]) {
  --gt-bg: rgba(16, 18, 24, 0.62);
  --gt-panel: rgba(255, 255, 255, 0.05);
  --gt-panel-2: rgba(255, 255, 255, 0.03);
  --gt-line: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(26px) saturate(150%);
}

* { box-sizing: border-box; }

.gt-root { display: flex; flex-direction: column; height: 100%; min-height: 200px; }

/* header ------------------------------------------------------------------ */
.gt-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--gt-line);
  background: var(--gt-panel);
}
.gt-logo {
  width: 22px; height: 22px; border-radius: 7px; flex: none;
  display: grid; place-items: center;
  background: linear-gradient(140deg, var(--gt-accent), color-mix(in srgb, var(--gt-accent) 55%, #6ea8ff));
  color: #06120c; font-size: 11px; font-weight: 800;
}
.gt-title { font-size: 12.5px; font-weight: 650; letter-spacing: 0.2px; white-space: nowrap; }
.gt-search { position: relative; flex: 1 1 auto; min-width: 90px; }
.gt-search input {
  width: 100%; height: 28px; padding: 0 10px 0 26px;
  border: 1px solid var(--gt-line); border-radius: 9px;
  background: var(--gt-panel-2); color: var(--gt-text);
  font: inherit; font-size: 12px; outline: none;
}
.gt-search input:focus { border-color: color-mix(in srgb, var(--gt-accent) 60%, transparent); }
.gt-search svg { position: absolute; left: 8px; top: 7px; width: 13px; height: 13px; color: var(--gt-dim); pointer-events: none; }
.gt-results {
  position: absolute; top: 32px; left: 0; right: 0; z-index: 20; max-height: 240px; overflow-y: auto;
  border: 1px solid var(--gt-line); border-radius: 11px; background: var(--gt-panel);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45); padding: 4px; display: none;
}
.gt-results.open { display: block; }
.gt-hit { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 12px; }
.gt-hit:hover, .gt-hit.sel { background: color-mix(in srgb, var(--gt-accent) 16%, transparent); }
.gt-hit b { font-weight: 650; min-width: 56px; }
.gt-hit span { color: var(--gt-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* body -------------------------------------------------------------------- */
.gt-body { display: grid; grid-template-columns: 210px minmax(0, 1fr); flex: 1 1 auto; min-height: 0; }
@container (max-width: 430px) { .gt-body { grid-template-columns: minmax(0, 1fr); } .gt-list { display: none; } }

/* watchlist --------------------------------------------------------------- */
.gt-list { border-right: 1px solid var(--gt-line); overflow-y: auto; overflow-x: hidden; background: var(--gt-panel); }
.gt-row {
  display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 8px;
  padding: 8px 10px; cursor: pointer; border-left: 2px solid transparent; min-width: 0;
}
.gt-row > div { min-width: 0; }
.gt-row:hover { background: var(--gt-panel-2); }
.gt-row.sel { background: var(--gt-panel-2); border-left-color: var(--gt-accent); }
.gt-avatar {
  width: 22px; height: 22px; border-radius: 6px; object-fit: contain; background: var(--gt-panel-2);
  display: grid; place-items: center; overflow: hidden; flex: none;
  font-size: 9px; font-weight: 700; letter-spacing: 0.2px; color: var(--gt-muted);
}
.gt-mono { font-size: 11.5px; font-weight: 640; letter-spacing: 0.2px; }
.gt-sub { font-size: 10px; color: var(--gt-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gt-px { font-size: 12px; font-weight: 620; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.gt-ch { font-size: 10.5px; font-weight: 620; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.gt-up { color: var(--gt-up); }
.gt-down { color: var(--gt-down); }
.gt-flat { color: var(--gt-muted); }

/* chart ------------------------------------------------------------------- */
.gt-main { display: flex; flex-direction: column; min-width: 0; overflow-y: auto; }
.gt-quote { padding: 12px 14px 6px; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.gt-name { font-size: 15px; font-weight: 650; }
.gt-exchange { font-size: 10.5px; color: var(--gt-dim); }
.gt-price { font-size: 30px; font-weight: 660; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.gt-badge { padding: 3px 8px; border-radius: 8px; font-size: 12px; font-weight: 650; font-variant-numeric: tabular-nums; }
.gt-badge.up { background: color-mix(in srgb, var(--gt-up) 16%, transparent); color: var(--gt-up); }
.gt-badge.down { background: color-mix(in srgb, var(--gt-down) 16%, transparent); color: var(--gt-down); }
.gt-badge.flat { background: var(--gt-panel-2); color: var(--gt-muted); }
.gt-ranges { display: flex; gap: 3px; padding: 4px 14px 0; flex-wrap: wrap; }
.gt-range {
  padding: 3px 9px; border: 0; border-radius: 7px; background: transparent; color: var(--gt-muted);
  font: inherit; font-size: 11px; font-weight: 600; cursor: pointer;
}
.gt-range:hover { background: var(--gt-panel-2); color: var(--gt-text); }
.gt-range.active { background: color-mix(in srgb, var(--gt-accent) 16%, transparent); color: var(--gt-accent); }
.gt-chart { position: relative; height: var(--gt-chart-height, 240px); margin: 8px 14px 0; }
.gt-chart svg { display: block; width: 100%; height: 100%; }
.gt-grid { stroke: var(--gt-line); stroke-width: 1; }
.gt-label { fill: var(--gt-dim); font-size: 9.5px; font-family: var(--gt-font); }
.gt-cross { stroke: rgba(255, 255, 255, 0.28); stroke-width: 1; stroke-dasharray: 3 3; }
.gt-tip {
  position: absolute; pointer-events: none; padding: 5px 8px; border-radius: 8px;
  border: 1px solid var(--gt-line); background: var(--gt-panel); font-size: 11px; line-height: 1.45;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.4); white-space: nowrap; transform: translate(-50%, -130%);
}
.gt-tip b { font-variant-numeric: tabular-nums; }
.gt-tip i { color: var(--gt-muted); font-style: normal; }
.gt-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px;
  padding: 12px 14px 14px;
}
.gt-stat { border-top: 1px solid var(--gt-line); padding-top: 6px; }
.gt-stat span { display: block; font-size: 10px; color: var(--gt-dim); text-transform: uppercase; letter-spacing: 0.4px; }
.gt-stat b { font-size: 12.5px; font-weight: 620; font-variant-numeric: tabular-nums; }
.gt-empty { display: grid; place-items: center; height: 100%; color: var(--gt-dim); font-size: 12px; }
.gt-foot { padding: 7px 14px; border-top: 1px solid var(--gt-line); font-size: 10.5px; color: var(--gt-dim); display: flex; gap: 8px; }
`;var nt=["^NSEI","^BSESN","RELIANCE.NS","TCS.NS","AAPL","NVDA","BTC-USD"],A=class extends HTMLElement{constructor(){super();this.quotes=new Map;this.chartData=null;this.searchHits=[];this.searchIndex=-1;this.built=!1;this.onDocumentClick=t=>{t.composedPath().includes(this)||this.closeSearch()};this.api=new w(this.getAttribute("endpoint")||"/api")}static get observedAttributes(){return["symbols","symbol","range","theme","endpoint","height","title","accent","show-stats","refresh"]}get symbols(){let t=this.getAttribute("symbols");return t?t.split(",").map(e=>e.trim()).filter(Boolean):nt}set symbols(t){this.setAttribute("symbols",t.join(","))}get symbol(){return this.getAttribute("symbol")||this.symbols[0]||"NVDA"}set symbol(t){this.setAttribute("symbol",t)}get range(){let t=(this.getAttribute("range")||"1D").toUpperCase();return N.includes(t)?t:"1D"}set range(t){this.setAttribute("range",t)}get theme(){return this.getAttribute("theme")||"carbon"}set theme(t){this.setAttribute("theme",t)}get endpoint(){return this.getAttribute("endpoint")||"/api"}set endpoint(t){this.setAttribute("endpoint",t)}get apiClient(){return this.api}set apiClient(t){this.api=t}get title(){return this.getAttribute("title")||"Glass Ticker"}get refreshSeconds(){let t=Number(this.getAttribute("refresh"));return Number.isFinite(t)&&t>0?t:30}connectedCallback(){this.built||this.build(),this.applyTheme(),this.start()}disconnectedCallback(){var t;this.stop(),(t=this.abort)==null||t.abort()}attributeChangedCallback(t,e,r){if(e!==r){if(t==="endpoint"&&(this.api=new w(r||"/api")),t==="theme"){this.applyTheme();return}if(this.built){if(t==="height"){this.chartEl.style.setProperty("--gt-chart-height",`${Number(r)||240}px`),this.paintChart();return}if(t==="symbols"||t==="symbol"){this.load();return}t==="range"&&this.loadChart()}}}build(){this.built=!0;let t=this.attachShadow({mode:"open"}),e=document.createElement("style");e.textContent=O,t.appendChild(e);let r=document.createElement("div");r.className="gt-root",r.innerHTML=`
      <div class="gt-head">
        <div class="gt-logo">GT</div>
        <div class="gt-title"></div>
        <div class="gt-search">
          <svg viewBox="0 0 24 24" width="13" height="13"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input type="text" placeholder="Search symbol or company" autocomplete="off" spellcheck="false" aria-label="Search symbol or company">
          <div class="gt-results"></div>
        </div>
      </div>
      <div class="gt-body">
        <div class="gt-list"></div>
        <div class="gt-main">
          <div class="gt-quote"></div>
          <div class="gt-ranges"></div>
          <div class="gt-chart"></div>
          <div class="gt-stats"></div>
        </div>
      </div>
      <div class="gt-foot"></div>
    `,t.appendChild(r),this.listEl=r.querySelector(".gt-list"),this.mainEl=r.querySelector(".gt-main"),this.chartEl=r.querySelector(".gt-chart"),this.statsEl=r.querySelector(".gt-stats"),this.quoteEl=r.querySelector(".gt-quote"),this.rangesEl=r.querySelector(".gt-ranges"),this.resultsEl=r.querySelector(".gt-results"),this.searchInput=r.querySelector(".gt-search input"),this.footEl=r.querySelector(".gt-foot"),r.querySelector(".gt-title").textContent=this.title,this.chartEl.style.setProperty("--gt-chart-height",`${this.getAttribute("height")||240}px`),this.rangesEl.innerHTML=N.map(o=>`<button class="gt-range" data-range="${o}" type="button">${o}</button>`).join(""),this.rangesEl.addEventListener("click",o=>{let l=o.target.closest(".gt-range");l&&(this.range=l.dataset.range||"1D",this.dispatchEvent(new CustomEvent("range-change",{detail:{symbol:this.symbol,range:this.range},bubbles:!0})))}),this.listEl.addEventListener("click",o=>{let l=o.target.closest(".gt-row");l&&this.selectSymbol(l.dataset.symbol||"")}),this.resultsEl.addEventListener("click",o=>{let l=o.target.closest(".gt-hit");l&&this.pickSearch(Number(l.dataset.index))}),this.searchInput.addEventListener("input",()=>{window.clearTimeout(this.searchTimer);let o=this.searchInput.value.trim();if(!o){this.closeSearch();return}this.searchTimer=window.setTimeout(()=>this.runSearch(o),220)}),this.searchInput.addEventListener("keydown",o=>{o.key==="ArrowDown"?(o.preventDefault(),this.moveSearch(1)):o.key==="ArrowUp"?(o.preventDefault(),this.moveSearch(-1)):o.key==="Enter"?(o.preventDefault(),this.pickSearch(this.searchIndex>=0?this.searchIndex:0)):o.key==="Escape"&&this.closeSearch()}),document.addEventListener("click",this.onDocumentClick),new ResizeObserver(()=>{window.clearTimeout(this.resizeTimer),this.resizeTimer=window.setTimeout(()=>this.paintChart(),120)}).observe(this.chartEl)}applyTheme(){this.setAttribute("theme",this.theme)}start(){this.load(),window.clearInterval(this.pollTimer),this.pollTimer=window.setInterval(()=>this.load(),this.refreshSeconds*1e3)}stop(){window.clearInterval(this.pollTimer),this.pollTimer=void 0}async load(){await Promise.all([this.loadQuotes(),this.loadChart()])}async loadQuotes(){var e;let t=this.symbols;if(t.length){(e=this.abort)==null||e.abort(),this.abort=new AbortController;try{let r=await this.api.quotes(t,this.abort.signal);this.quotes=new Map(r.quotes.map(a=>[a.symbol,a])),this.paintList(),this.paintQuote(),this.dispatchEvent(new CustomEvent("quotes",{detail:{quotes:r.quotes},bubbles:!0}))}catch(r){r.name!=="AbortError"&&this.dispatchEvent(new CustomEvent("error",{detail:{error:r},bubbles:!0}))}}}async loadChart(){let t=this.symbol;try{let e=await this.api.chart(t,this.range);if(t!==this.symbol)return;this.chartData=e,this.paintChart(),this.dispatchEvent(new CustomEvent("chart",{detail:{symbol:t,range:this.range},bubbles:!0}))}catch(e){this.dispatchEvent(new CustomEvent("error",{detail:{error:e},bubbles:!0}))}}selectSymbol(t){t&&(this.symbol=t,this.closeSearch(),this.loadChart(),this.paintList(),this.paintQuote(),this.dispatchEvent(new CustomEvent("symbol-change",{detail:{symbol:t,quote:this.quotes.get(t)},bubbles:!0})))}paintList(){let t=this.symbol;this.listEl.innerHTML=this.symbols.map(e=>{let r=this.quotes.get(e),a=(r==null?void 0:r.changePercent)??null,o=a===null?"flat":a>0?"up":a<0?"down":"flat",l=a===null?"":a>0?"\u25B2":a<0?"\u25BC":"",$=r!=null&&r.logoUrl?`<img class="gt-avatar" src="${r.logoUrl}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode(''))">`:`<div class="gt-avatar gt-mono">${e.replace(/[^A-Za-z]/g,"").slice(0,2).toUpperCase()}</div>`;return`<div class="gt-row ${e===t?"sel":""}" data-symbol="${e}">
          ${$}
          <div>
            <div class="gt-mono">${e}</div>
            <div class="gt-sub">${(r==null?void 0:r.name)??""}</div>
          </div>
          <div>
            <div class="gt-px">${p((r==null?void 0:r.price)??null,(r==null?void 0:r.currency)??null)}</div>
            <div class="gt-ch gt-${o}">${l} ${L(a)}</div>
          </div>
        </div>`}).join("")}paintQuote(){let t=this.quotes.get(this.symbol),e=(t==null?void 0:t.changePercent)??null,r=e===null?"flat":e>0?"up":e<0?"down":"flat";if(this.quoteEl.innerHTML=`
      <div class="gt-name">${(t==null?void 0:t.name)??this.symbol}</div>
      <div class="gt-exchange">${this.symbol} \xB7 ${(t==null?void 0:t.exchange)??""}</div>
      <div class="gt-price">${p((t==null?void 0:t.price)??null,(t==null?void 0:t.currency)??null)}</div>
      <div class="gt-badge ${r}">${L(e)}</div>
    `,this.rangesEl.querySelectorAll(".gt-range").forEach(a=>{a.classList.toggle("active",a.dataset.range===this.range)}),this.getAttribute("show-stats")!=="false"){let a=[["Open",p((t==null?void 0:t.open)??null,(t==null?void 0:t.currency)??null)],["Day high",p((t==null?void 0:t.dayHigh)??null,(t==null?void 0:t.currency)??null)],["Day low",p((t==null?void 0:t.dayLow)??null,(t==null?void 0:t.currency)??null)],["Prev close",p((t==null?void 0:t.previousClose)??null,(t==null?void 0:t.currency)??null)],["52W high",p((t==null?void 0:t.week52High)??null,(t==null?void 0:t.currency)??null)],["52W low",p((t==null?void 0:t.week52Low)??null,(t==null?void 0:t.currency)??null)],["Volume",t!=null&&t.volume?d(t.volume,0):"--"],["Mkt cap",t!=null&&t.marketCap?d(t.marketCap/1e9,2)+"B":"--"],["P/E",d((t==null?void 0:t.trailingPE)??null)]];this.statsEl.innerHTML=a.map(([o,l])=>`<div class="gt-stat"><span>${o}</span><b>${l}</b></div>`).join("")}else this.statsEl.innerHTML=""}paintChart(){let t=this.chartData;if(!t)return;W(this.chartEl,{points:t.points,previousClose:t.previousClose,currency:t.currency,range:this.range,upColor:getComputedStyle(this).getPropertyValue("--gt-up").trim()||"#5eeaa8",downColor:getComputedStyle(this).getPropertyValue("--gt-down").trim()||"#ff7a6b"});let e=this.quotes.get(this.symbol);this.footEl.innerHTML=`<span>${t.marketState??""}</span><span>${(e==null?void 0:e.exchange)??""}</span>`}async runSearch(t){try{let e=await this.api.search(t);this.searchHits=e.results||[],this.searchIndex=-1,this.resultsEl.innerHTML=this.searchHits.length?this.searchHits.map((r,a)=>`<div class="gt-hit" data-index="${a}"><b>${r.symbol}</b><span>${r.name}</span></div>`).join(""):'<div class="gt-hit"><span>No matches</span></div>',this.resultsEl.classList.add("open")}catch(e){this.dispatchEvent(new CustomEvent("error",{detail:{error:e},bubbles:!0}))}}moveSearch(t){this.searchHits.length&&(this.searchIndex=(this.searchIndex+t+this.searchHits.length)%this.searchHits.length,this.resultsEl.querySelectorAll(".gt-hit").forEach((e,r)=>{e.classList.toggle("sel",r===this.searchIndex)}))}pickSearch(t){let e=this.searchHits[t];if(!e)return;this.searchInput.value="",this.closeSearch();let r=this.symbols.includes(e.symbol)?this.symbols:[...this.symbols,e.symbol];this.symbols=r,this.selectSymbol(e.symbol)}closeSearch(){this.resultsEl.classList.remove("open")}};typeof customElements<"u"&&!customElements.get("glass-ticker")&&customElements.define("glass-ticker",A);var bt=A;export{A as GlassTickerElement,w as TickerApi,bt as default,p as formatCurrency,d as formatNumber,L as formatPercent};
//# sourceMappingURL=glass-ticker.js.map
