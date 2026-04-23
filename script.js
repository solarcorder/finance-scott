const DB={
  KEY:'fin_v2',
  getAll(){try{return JSON.parse(localStorage.getItem(this.KEY))||[];}catch{return [];}},
  save(r){localStorage.setItem(this.KEY,JSON.stringify(r));},
  add(r){const all=this.getAll();r.id=Date.now().toString(36)+Math.random().toString(36).slice(2,4);r.at=new Date().toISOString();all.unshift(r);this.save(all);return r;},
  remove(id){this.save(this.getAll().filter(r=>r.id!==id));},
  setBucket(id,bucket){const all=this.getAll();const r=all.find(r=>r.id===id);if(r)r.bucket=bucket;this.save(all);},
  sum(type){return this.getAll().filter(r=>r.type===type).reduce((s,r)=>s+r.amount,0);},
  balance(){return this.getAll().reduce((s,r)=>r.type==='income'?s+r.amount:r.type==='expense'?s-r.amount:s,0);},
  byBucket(b){return this.getAll().filter(r=>r.bucket===b);},
  group(by){
    const map={};
    this.getAll().forEach(r=>{
      const d=new Date(r.date);
      let k;
      if(by==='week'){const w=new Date(d);w.setDate(d.getDate()-d.getDay());k=w.toISOString().slice(0,10);}
      else if(by==='month')k=r.date.slice(0,7);
      else k=r.date.slice(0,4);
      if(!map[k])map[k]={income:0,expense:0,asset:0,liability:0};
      map[k][r.type]=(map[k][r.type]||0)+r.amount;
    });
    return map;
  }
};

const App={
  charts:{},

  show(name){
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('panel-'+name).classList.add('active');
    document.getElementById('btn-'+name).classList.add('active');
    const renders={
      records:()=>this.renderRecords(),
      balance:()=>this.renderBalance(),
      nws:()=>this.renderNWS(),
      dashboard:()=>this.renderDash()
    };
    if(renders[name])renders[name]();
  },

  fmt(n){return '₹'+Math.abs(n).toLocaleString('en-IN',{maximumFractionDigits:0});},
  fmtK(n){const a=Math.abs(n);return a>=1000?'₹'+(a/1000).toFixed(1)+'k':'₹'+Math.round(a);},
  esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');},

  // ── Chat flow ─────────────────────────────────────────
  flow:{step:0,desc:'',type:'',amount:'',date:''},

  flowReset(){
    this.flow={step:0,desc:'',type:'',amount:'',date:''};
    this.flowRender();
  },

  flowRender(){
    const f=this.flow;
    const chips=document.getElementById('chatChips');
    const prompt=document.getElementById('chatPrompt');
    const body=document.getElementById('chatBody');
    if(!chips)return;

    chips.innerHTML=[
      f.desc   ?`<span class="chip desc">${this.esc(f.desc)}</span>`:'',
      f.type   ?`<span class="chip ${f.type}">${f.type}</span>`:'',
      f.amount ?`<span class="chip amt">₹${f.amount}</span>`:'',
      f.date   ?`<span class="chip dt">${f.date}</span>`:'',
    ].join('');
    chips.style.padding=chips.innerHTML?'14px 16px 0':'0';

    if(f.step===0){
      prompt.textContent="What's the description?";
      body.innerHTML=`<div class="chat-input-row no-border">
        <input class="chat-input" id="chatInput" type="text"
          placeholder="e.g. Salary from TCS" autocomplete="off"
          value="${this.esc(f.desc)}"/>
        <span class="chat-hint">press , to continue</span>
      </div>`;
    }else if(f.step===1){
      prompt.textContent='What type of transaction?';
      body.innerHTML=`<div class="chat-type-options">
        <button class="type-opt" onclick="App.flowSelectType('income')">
          <span class="type-opt-dot income"></span>Income</button>
        <button class="type-opt" onclick="App.flowSelectType('expense')">
          <span class="type-opt-dot expense"></span>Expense</button>
        <button class="type-opt" onclick="App.flowSelectType('asset')">
          <span class="type-opt-dot asset"></span>Asset</button>
        <button class="type-opt" onclick="App.flowSelectType('liability')">
          <span class="type-opt-dot liability"></span>Liability</button>
      </div>`;
    }else if(f.step===2){
      prompt.textContent='How much?';
      body.innerHTML=`<div class="chat-input-row no-border">
        <input class="chat-input" id="chatInput" type="number"
          placeholder="Amount in ₹" min="0" step="any" value="${f.amount}"/>
        <span class="chat-hint">press , to continue</span>
      </div>`;
    }else if(f.step===3){
      prompt.textContent='What date?';
      body.innerHTML=`<div class="chat-input-row no-border">
        <input class="chat-input" id="chatInput" type="date"
          value="${f.date||new Date().toISOString().slice(0,10)}"/>
        <span class="chat-hint">press , to finish</span>
      </div>`;
    }else if(f.step===4){
      prompt.textContent='All set.';
      body.innerHTML=`<div class="chat-input-row no-border">
        <button class="chat-add-btn" onclick="App.flowCommit()"
          style="width:100%;border-radius:0 0 3px 3px">Add record</button>
      </div>`;
      return;
    }

    setTimeout(()=>{
      const inp=document.getElementById('chatInput');
      if(!inp)return;
      inp.focus();
      inp.addEventListener('keydown',e=>this.flowKey(e));
    },10);
  },

  flowKey(e){
    const inp=e.target;
    const val=inp.value.trim();
    const f=this.flow;

    if(e.key===','){
      e.preventDefault();
      if(f.step===0){
        if(!val)return;
        f.desc=val;f.step=1;this.flowRender();
      }else if(f.step===2){
        const amt=parseFloat(val);
        if(!val||isNaN(amt)||amt<=0){
          inp.style.outline='1px solid var(--red)';
          setTimeout(()=>inp.style.outline='',600);
          return;
        }
        f.amount=val;f.step=3;this.flowRender();
      }else if(f.step===3){
        if(!inp.value)return;
        f.date=inp.value;f.step=4;this.flowRender();
      }
    }else if(e.key==='Backspace'&&inp.value===''){
      e.preventDefault();
      this.flowBack();
    }else if(e.key==='Enter'){
      if(f.step===4)this.flowCommit();
    }
  },

  flowSelectType(type){
    this.flow.type=type;
    this.flow.step=2;
    this.flowRender();
  },

  flowBack(){
    const f=this.flow;
    if(f.step===0)return;
    if(f.step===1){f.type='';f.step=0;}
    else if(f.step===2){f.amount='';f.step=1;}
    else if(f.step===3){f.date='';f.step=2;}
    else if(f.step===4){f.step=3;}
    this.flowRender();
  },

  flowCommit(){
    const f=this.flow;
    if(!f.desc||!f.type||!f.amount||!f.date)return;
    DB.add({label:f.desc,amount:parseFloat(f.amount),type:f.type,bucket:'',date:f.date});
    this.flowReset();
    this.renderRecords();
  },

  // ── Records ───────────────────────────────────────────
  deleteRecord(id){DB.remove(id);this.renderRecords();},

  renderRecords(){
    const all=DB.getAll();
    const el=document.getElementById('recList');
    if(!all.length){el.innerHTML='<div class="empty">No transactions yet.</div>';return;}
    el.innerHTML=all.map(r=>{
      const sign=r.type==='income'?'+':r.type==='expense'?'−':'';
      const tag=r.bucket?` · ${r.bucket}`:'';
      return `<div class="rec-item">
        <div class="rec-dot ${r.type}"></div>
        <div class="rec-info">
          <div class="rec-label">${this.esc(r.label)}</div>
          <div class="rec-sub">${r.date} · ${r.type}${tag}</div>
        </div>
        <div class="rec-amt ${r.type}">${sign}${this.fmt(r.amount)}</div>
        <button class="del" onclick="App.deleteRecord('${r.id}')">×</button>
      </div>`;
    }).join('');
  },

  // ── Balance ───────────────────────────────────────────
  setBalance(){
    const target=parseFloat(document.getElementById('balTarget').value);
    if(isNaN(target))return;
    const diff=target-DB.balance();
    if(Math.abs(diff)<0.01)return;
    DB.add({label:'Balance adjustment',amount:Math.abs(diff),type:diff>0?'income':'expense',bucket:'',date:new Date().toISOString().slice(0,10)});
    document.getElementById('balTarget').value='';
    this.renderBalance();
  },

  renderBalance(){
    const bal=DB.balance(),inc=DB.sum('income'),exp=DB.sum('expense');
    const el=document.getElementById('balBig');
    el.textContent=this.fmt(bal);
    el.className='bal-big '+(bal>=0?'pos':'neg');
    document.getElementById('balSub').textContent=`from ${DB.getAll().length} transactions`;
    document.getElementById('bStatIn').textContent=this.fmt(inc);
    document.getElementById('bStatOut').textContent=this.fmt(exp);
    document.getElementById('bStatRate').textContent=inc>0?Math.round((inc-exp)/inc*100)+'%':'—';
  },

  // ── Classification (NWS) ──────────────────────────────
  toggleDrawer(bucket){
    document.getElementById('drawer-'+bucket).classList.toggle('open');
  },

  tagRecord(id,bucket){
    const all=DB.getAll();
    const r=all.find(r=>r.id===id);
    if(!r)return;
    r.bucket=bucket;
    DB.save(all);
    this.renderNWS();
  },

  untagRecord(id){
    const all=DB.getAll();
    const r=all.find(r=>r.id===id);
    if(!r)return;
    r.bucket='';
    DB.save(all);
    this.renderNWS();
  },

  renderNWS(){
    const all=DB.getAll().filter(r=>r.type!=='income');
    const buckets=['needs','wants','saves'];
    const colors={needs:'var(--red)',wants:'var(--gold)',saves:'var(--green)'};
    const totals={needs:0,wants:0,saves:0};
    all.forEach(r=>{if(r.bucket&&totals[r.bucket]!==undefined)totals[r.bucket]+=r.amount;});
    const untagged=all.filter(r=>!r.bucket);

    document.getElementById('nws-needs-amt').textContent=this.fmt(totals.needs);
    document.getElementById('nws-wants-amt').textContent=this.fmt(totals.wants);
    document.getElementById('nws-saves-amt').textContent=this.fmt(totals.saves);
    document.getElementById('nws-untagged-count').textContent=untagged.length;

    // Drawers
    buckets.forEach(b=>{
      const items=all.filter(r=>r.bucket===b);
      const body=document.getElementById(`drawer-${b}-body`);
      body.innerHTML=items.length?items.map(r=>`
        <div class="nws-tx-item in-drawer">
          <div class="nws-tx-dot ${r.type}"></div>
          <div class="nws-tx-info">
            <div class="nws-tx-label">${this.esc(r.label)}</div>
            <div class="nws-tx-sub">${r.date} · ${r.type}</div>
          </div>
          <div class="nws-tx-amt">${this.fmt(r.amount)}</div>
          <button class="nws-untag-btn" onclick="App.untagRecord('${r.id}')">remove</button>
        </div>`).join(''):'<div class="nws-drawer-empty">Nothing tagged yet.</div>';
    });

    // Bars
    const grand=Object.values(totals).reduce((s,v)=>s+v,0);
    document.getElementById('nwsBars').innerHTML=buckets.map(b=>{
      const pct=grand>0?Math.round(totals[b]/grand*100):0;
      return `<div class="nws-bar-row">
        <div class="nws-bar-label">${b}</div>
        <div class="nws-bar-track"><div class="nws-bar-fill" style="width:${pct}%;background:${colors[b]}"></div></div>
        <div class="nws-bar-pct">${pct}%</div>
      </div>`;
    }).join('');

    // Untagged list
    const labelEl=document.getElementById('nwsUntaggedLabel');
    const listEl=document.getElementById('nwsTxList');
    if(!all.length){
      labelEl.style.display='none';
      listEl.innerHTML='<div class="empty">No transactions yet. Add from Transactions.</div>';
      return;
    }
    labelEl.style.display=untagged.length?'':'none';
    if(!untagged.length){listEl.innerHTML='';return;}
    listEl.innerHTML=untagged.map(r=>{
      const tags=buckets.map(b=>
        `<button class="nws-tag" onclick="App.tagRecord('${r.id}','${b}')">${b[0].toUpperCase()+b.slice(1)}</button>`
      ).join('');
      return `<div class="nws-tx-item">
        <div class="nws-tx-dot ${r.type}"></div>
        <div class="nws-tx-info">
          <div class="nws-tx-label">${this.esc(r.label)}</div>
          <div class="nws-tx-sub">${r.date} · ${r.type}</div>
        </div>
        <div class="nws-tx-amt">${this.fmt(r.amount)}</div>
        <div class="nws-tags">${tags}</div>
      </div>`;
    }).join('');
  },

  // ── Dashboard ─────────────────────────────────────────
  mkChart(id,type,labels,data,colors){
    if(this.charts[id])this.charts[id].destroy();
    const ctx=document.getElementById(id);
    if(!ctx)return;
    this.charts[id]=new Chart(ctx,{
      type,
      data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:0,borderRadius:type==='bar'?3:0}]},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{display:type==='doughnut',labels:{color:'#8a7d6a',font:{size:10},boxWidth:8,padding:6}},
          tooltip:{callbacks:{label:i=>' '+this.fmtK(i.raw)}}
        },
        scales:type==='bar'?{
          x:{ticks:{color:'#8a7d6a',font:{size:10}},grid:{color:'rgba(70,58,42,0.07)'}},
          y:{ticks:{color:'#8a7d6a',font:{size:10},callback:v=>this.fmtK(v)},grid:{color:'rgba(70,58,42,0.07)'}}
        }:{}
      }
    });
  },

  renderDash(){
    const all=DB.getAll();
    const inc=DB.sum('income'),exp=DB.sum('expense'),ass=DB.sum('asset'),lia=DB.sum('liability');

    document.getElementById('d-inc').textContent=this.fmtK(inc);
    document.getElementById('d-exp').textContent=this.fmtK(exp);
    document.getElementById('d-ass').textContent=this.fmtK(ass);
    document.getElementById('d-lia').textContent=this.fmtK(lia);

    const nw=ass-lia;
    const nwEl=document.getElementById('d-nw');
    nwEl.textContent=this.fmtK(nw);
    nwEl.className='stat-card-val '+(nw>=0?'g':'r');
    document.getElementById('d-sr').textContent=inc>0?Math.round((inc-exp)/inc*100)+'%':'—';
    document.getElementById('d-tx').textContent=all.length;

    // Charts
    this.mkChart('cPillars','doughnut',
      ['Income','Expenses','Assets','Liabilities'],
      [inc||0,exp||0,ass||0,lia||0],
      ['#2c5c3f','#7a2424','#1a3358','#6b5010']
    );

    const incRecs=all.filter(r=>r.type==='income');
    const src={};
    incRecs.forEach(r=>{src[r.label]=(src[r.label]||0)+r.amount;});
    const top=Object.entries(src).sort((a,b)=>b[1]-a[1]).slice(0,5);
    this.mkChart('cIncome','doughnut',
      top.length?top.map(e=>e[0]):['No income'],
      top.length?top.map(e=>e[1]):[1],
      top.length?['#2c5c3f','#3d7a55','#4e9a6b','#5fb882','#70d099'].slice(0,top.length):['#e4dfd4']
    );

    const nwsVals=['needs','wants','saves'].map(b=>DB.byBucket(b).reduce((s,r)=>s+r.amount,0));
    this.mkChart('cSpend','bar',['Needs','Wants','Saves'],nwsVals,['#7a2424','#6b5010','#2c5c3f']);

    // Monthly flow
    if(this.charts['cMonthly'])this.charts['cMonthly'].destroy();
    const mmap=DB.group('month');
    const mkeys=Object.keys(mmap).sort().slice(-6);
    const mCtx=document.getElementById('cMonthly');
    if(mCtx){
      this.charts['cMonthly']=new Chart(mCtx,{
        type:'bar',
        data:{
          labels:mkeys.map(k=>{const d=new Date(k+'-01');return d.toLocaleString('default',{month:'short',year:'2-digit'});}),
          datasets:[
            {label:'Income',data:mkeys.map(k=>mmap[k].income||0),backgroundColor:'#2c5c3f',borderWidth:0,borderRadius:3},
            {label:'Expenses',data:mkeys.map(k=>mmap[k].expense||0),backgroundColor:'#7a2424',borderWidth:0,borderRadius:3}
          ]
        },
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{legend:{labels:{color:'#8a7d6a',font:{size:10},boxWidth:8,padding:6}}},
          scales:{
            x:{ticks:{color:'#8a7d6a',font:{size:9}},grid:{color:'rgba(70,58,42,0.07)'}},
            y:{ticks:{color:'#8a7d6a',font:{size:9},callback:v=>this.fmtK(v)},grid:{color:'rgba(70,58,42,0.07)'}}
          }
        }
      });
    }

    // Asset & liability lists
    const aRecs=all.filter(r=>r.type==='asset');
    const lRecs=all.filter(r=>r.type==='liability');
    document.getElementById('assetList').innerHTML=aRecs.length
      ?aRecs.map(r=>`<div class="port-item"><span>${this.esc(r.label)}</span><span>${this.fmtK(r.amount)}</span></div>`).join('')
      :'<div class="port-empty">No assets recorded yet</div>';
    document.getElementById('liabList').innerHTML=lRecs.length
      ?lRecs.map(r=>`<div class="port-item"><span>${this.esc(r.label)}</span><span>${this.fmtK(r.amount)}</span></div>`).join('')
      :'<div class="port-empty">No liabilities recorded yet</div>';

    // Weekly table
    const now=new Date();
    document.getElementById('weekBody').innerHTML=Array.from({length:8},(_,i)=>{
      const ws=new Date(now);ws.setDate(now.getDate()-now.getDay()-i*7);
      const we=new Date(ws);we.setDate(ws.getDate()+6);
      const recs=all.filter(r=>{const d=new Date(r.date);return d>=ws&&d<=we;});
      const wi=recs.filter(r=>r.type==='income').reduce((s,r)=>s+r.amount,0);
      const we2=recs.filter(r=>r.type==='expense').reduce((s,r)=>s+r.amount,0);
      const wa=recs.filter(r=>r.type==='asset').reduce((s,r)=>s+r.amount,0);
      const wn=wi-we2;
      const label=i===0?'This week':i===1?'Last week':`${i} weeks ago`;
      const f=v=>v===0?'—':this.fmtK(v);
      const nc=wn>0?' pos':wn<0?' neg':'';
      return `<tr class="${i===0?'hi':''}"><td>${label}</td><td>${f(wi)}</td><td>${f(we2)}</td><td>${f(wa)}</td><td class="${nc}">${wi===0&&we2===0?'—':this.fmtK(wn)}</td></tr>`;
    }).join('');

    // Monthly table
    const mmap2=DB.group('month');
    const mk2=Object.keys(mmap2).sort().reverse().slice(0,12);
    const f2=v=>v?this.fmtK(v):'—';
    document.getElementById('monthBody').innerHTML=mk2.length
      ?mk2.map(k=>{
          const m=mmap2[k];const d=new Date(k+'-01');
          return `<tr><td>${d.toLocaleString('default',{month:'short',year:'numeric'})}</td><td>${f2(m.income)}</td><td>${f2(m.expense)}</td><td>${f2(m.asset)}</td><td>${f2(m.liability)}</td></tr>`;
        }).join('')
      :'<tr><td colspan="5" style="color:var(--muted2);font-style:italic;text-align:center;padding:16px">No data yet</td></tr>';

    // Yearly table
    const ymap=DB.group('year');
    const yk=Object.keys(ymap).sort().reverse();
    document.getElementById('yearBody').innerHTML=yk.length
      ?yk.map(k=>{
          const y=ymap[k];
          return `<tr><td>${k}</td><td>${f2(y.income)}</td><td>${f2(y.expense)}</td><td>${f2(y.asset)}</td><td>${f2(y.liability)}</td></tr>`;
        }).join('')
      :'<tr><td colspan="5" style="color:var(--muted2);font-style:italic;text-align:center;padding:16px">No data yet</td></tr>';
  },

  init(){
    this.flowReset();
    this.renderRecords();
  }
};

App.init();
