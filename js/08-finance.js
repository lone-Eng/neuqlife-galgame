// ===== 金融理财系统 =====
var STOCK_NAMES={niaoye:'鸟爷控股',benben:'笨笨传媒',bobi:'波比实业'};
var STOCK_VOLS={niaoye:1.0,benben:0.7,bobi:0.4};
var STOCK_INIT={niaoye:18,benben:12,bobi:8};

function updateStockPrices(){
  var dk=fmtDate(GS.year,GS.month,GS.day);
  if(GS.lastStockDay===dk)return;
  if(!isWeekday(GS.year,GS.month,GS.day))return;
  if(HOLIDAY_DAYS[dateKey(GS.year,GS.month,GS.day)])return;
  GS.stockPrevPrices={niaoye:GS.stockPrices.niaoye,benben:GS.stockPrices.benben,bobi:GS.stockPrices.bobi};
  // T+1: reset todayBought
  var syms3=['niaoye','benben','bobi'];for(var ri=0;ri<syms3.length;ri++){GS.holdings[syms3[ri]].todayBought=0;}
  GS.stockPrices.niaoye=genStockPrice(GS.stockPrices.niaoye,STOCK_VOLS.niaoye);
  GS.stockPrices.benben=genStockPrice(GS.stockPrices.benben,STOCK_VOLS.benben);
  GS.stockPrices.bobi=genStockPrice(GS.stockPrices.bobi,STOCK_VOLS.bobi);
  // Push to history (keep last 10)
  if(!GS.stockHistory)GS.stockHistory={niaoye:[],benben:[],bobi:[]};
  var syms2=['niaoye','benben','bobi'];
  for(var si=0;si<syms2.length;si++){var ss=syms2[si];GS.stockHistory[ss].push(GS.stockPrices[ss]);if(GS.stockHistory[ss].length>10)GS.stockHistory[ss].shift();}
  GS.lastStockDay=dk;
}
function genStockPrice(prev,vol){
  var r=(Math.random()*2-1)*vol*0.1;
  var np=prev*(1+r);
  np=Math.max(prev*0.9,Math.min(prev*1.1,np));
  return Math.round(np*100)/100;
}

function openStocks(){
  if(!GS.stocksUnlocked){showToast('金融市场尚未解锁，请等待相关剧情触发。');return;}
  updateStockPrices();
  renderStocksPanel();
}

function renderStocksPanel(){
  var prev=GS.stockPrevPrices;
  var cur=GS.stockPrices;
  var symbols=['niaoye','benben','bobi'];
  var totalCost=0,totalValue=0,totalPL=0,dayPL=0;
  var isTrade=isWeekday(GS.year,GS.month,GS.day)&&!HOLIDAY_DAYS[dateKey(GS.year,GS.month,GS.day)];

  var rows='';
  for(var i=0;i<symbols.length;i++){
    var s=symbols[i];
    var h=GS.holdings[s];
    var price=cur[s];
    var prevPrice=prev[s]||price;
    var change=price-prevPrice;
    var changePct=prevPrice>0?(change/prevPrice*100):0;
    var mv=h.shares*price;
    var pl=mv-h.costBasis;
    var dayPl=(price-prevPrice)*h.shares;
    totalCost+=h.costBasis;
    totalValue+=mv;
    totalPL+=pl;
    dayPL+=dayPl;
    var updown=change>=0?'pos':'neg';
    var sign=change>=0?'+':'';
    var isLimitUp=(price>=prevPrice*1.099);
    var isLimitDown=(price<=prevPrice*0.901);
    var chartId='stock-chart-'+s+'-'+Date.now()+Math.floor(Math.random()*1000);
    rows+='<div class="stock-item">'+
      '<div class="stock-row">'+
        '<div class="stock-info">'+
          '<div class="stock-name">'+STOCK_NAMES[s]+'</div>'+
          '<div class="stock-price">¥'+price.toFixed(2)+' <span class="stock-change '+updown+'">'+sign+change.toFixed(2)+' ('+sign+changePct.toFixed(1)+'%)</span></div>'+
          '<div class="stock-hold">持仓：<strong>'+(h.shares||0)+'股</strong> 成本：¥'+(h.costBasis||0).toFixed(2)+' 市值：¥'+mv.toFixed(2)+' 盈亏：<span class="'+(pl>=0?'pos':'neg')+'">'+(pl>=0?'+':'')+pl.toFixed(2)+'</span></div>'+
        '</div>'+
        '<div class="stock-actions">'+
          '<button onclick="buyStock(\''+s+'\')"'+(isLimitUp||!isTrade?' disabled':'')+'>买入1手</button>'+
          '<button onclick="sellStock(\''+s+'\')"'+(isLimitDown||!isTrade?' disabled':'')+(h.shares<10?' disabled':'')+'>卖出1手</button>'+
        '</div>'+
      '</div>'+
      '<div class="stock-bulk">'+
        '<input type="number" id="qty-'+s+'" value="10" min="10" step="10" style="width:55px;padding:3px 5px;font-size:.78em;border:1px solid #d5cfc6;border-radius:4px;font-family:inherit;"> 股'+
        '<button onclick="buyStock(\''+s+'\',document.getElementById(\'qty-'+s+'\').value)"'+(isLimitUp||!isTrade?' disabled':'')+'>批量买入</button>'+
        '<button onclick="sellStock(\''+s+'\',document.getElementById(\'qty-'+s+'\').value)"'+(isLimitDown||!isTrade?' disabled':'')+(h.shares<10?' disabled':'')+'>批量卖出</button>'+
      '</div>'+
      '<canvas id="'+chartId+'" class="stock-chart" width="320" height="100"></canvas>'+
    '</div>';
    // Store chart data for rendering after DOM insert
    if(!GS._stockChartQueue)GS._stockChartQueue=[];
    GS._stockChartQueue.push({id:chartId, sym:s});
  }

  var html='<div class="stocks-overlay" id="stocks-overlay" onclick="if(event.target===this)closeStocks()">'+
    '<div class="stocks-box" id="stocks-box">'+
      '<div class="stocks-title">📈 金融理财市场</div>'+
      '<div class="stocks-subtitle">当前金钱：<strong>¥'+GS.money+'</strong>　|　'+fmtDate(GS.year,GS.month,GS.day)+(isTrade?'　交易日':'　休市')+'</div>'+
      '<div class="stocks-summary">'+
        '<span>持仓成本：<strong>¥'+totalCost.toFixed(2)+'</strong></span>'+
        '<span>持仓市值：<strong>¥'+totalValue.toFixed(2)+'</strong></span>'+
        '<span>总盈亏：<strong class="'+(totalPL>=0?'pos':'neg')+'">'+(totalPL>=0?'+':'')+totalPL.toFixed(2)+'</strong></span>'+
        '<span>当日参考盈亏：<strong class="'+(dayPL>=0?'pos':'neg')+'">'+(dayPL>=0?'+':'')+dayPL.toFixed(2)+'</strong></span>'+
      '</div>'+
      rows+
      '<div class="stocks-rules">📋 规则：1手=10股 ｜ 买入手续费1% ｜ 卖出手续费1% ｜ 涨跌停±10% ｜ 工作日交易</div>'+
      '<button class="stocks-close" onclick="closeStocks()">关闭</button>'+
    '</div>'+
  '</div>';
  var existing=document.getElementById('stocks-overlay');
  if(existing)existing.parentNode.removeChild(existing);
  var div=document.createElement('div');
  div.innerHTML=html;
  document.body.appendChild(div.firstElementChild);
  // Draw charts after DOM insertion
  var chartQueue=GS._stockChartQueue;GS._stockChartQueue=null;
  if(chartQueue){for(var ci=0;ci<chartQueue.length;ci++){drawStockChart(chartQueue[ci].id,chartQueue[ci].sym);}}
}
function drawStockChart(canvasId,sym){
  var canvas=document.getElementById(canvasId);
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var hist=GS.stockHistory[sym];
  // 下方 xStep 的分母是 (hist.length-1)，长度为 0 或 1 时会除零 / 越界，
  // 因此要求至少两个点才能画出折线。
  if(!hist||hist.length<2)return;
  var w=canvas.width,h=canvas.height;
  var padL=42,padR=8,padT=16,padB=8;
  var xStep=(w-padL-padR)/(hist.length-1);
  var min=Math.min.apply(null,hist),max=Math.max.apply(null,hist);
  var expand=(max-min)*0.1||0.5;
  var yMin=min-expand,yMax=max+expand;
  var yRange=yMax-yMin||1;
  ctx.clearRect(0,0,w,h);
  // Y-axis 5 labels: yMax, max, mid, min, yMin
  ctx.fillStyle='#8b7d6b';ctx.font='8px sans-serif';ctx.textAlign='right';
  var yLabels=[yMax,max,(max+min)/2,min,yMin];
  var yPositions=[0,0.25,0.5,0.75,1];
  for(var gi=0;gi<5;gi++){
    var gy=padT+yPositions[gi]*(h-padT-padB);
    ctx.fillText('¥'+yLabels[gi].toFixed(1),padL-4,gy+3);
    ctx.strokeStyle='#e8e2d8';ctx.lineWidth=0.5;
    ctx.beginPath();ctx.moveTo(padL,gy);ctx.lineTo(w-padR,gy);ctx.stroke();
  }
  // Line
  ctx.strokeStyle='#1a3a5c';ctx.lineWidth=1.5;ctx.beginPath();
  for(var pi=0;pi<hist.length;pi++){
    var px=padL+pi*xStep;
    var py=padT+(h-padT-padB)*(1-(hist[pi]-yMin)/yRange);
    if(pi===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.stroke();
  // Dot at current
  var lastX=padL+(hist.length-1)*xStep;
  var lastY=padT+(h-padT-padB)*(1-(hist[hist.length-1]-yMin)/yRange);
  ctx.fillStyle=hist[hist.length-1]>=hist[hist.length-2]?'#c0392b':'#1e7e34';
  ctx.beginPath();ctx.arc(lastX,lastY,2.5,0,Math.PI*2);ctx.fill();
  // B/S/T markers
  var trades=GS.stockTrades&&GS.stockTrades[sym]?GS.stockTrades[sym]:[];
  var markers={};
  for(var ti=0;ti<trades.length;ti++){
    var tr=trades[ti];
    for(var hi=hist.length-1;hi>=0;hi--){
      if(Math.abs(hist[hi]-tr.price)<0.01){
        var mk=markers[hi]||'';
        if(tr.type==='B'&&mk.indexOf('B')<0)mk+='B';
        if(tr.type==='S'&&mk.indexOf('S')<0)mk+='S';
        markers[hi]=mk;
        break;
      }
    }
  }
  for(var mkHi in markers){
    if(!markers.hasOwnProperty(mkHi))continue;
    var mkLabel=markers[mkHi];
    var mkX=padL+parseInt(mkHi)*xStep;
    var mkY=padT+(h-padT-padB)*(1-(hist[parseInt(mkHi)]-yMin)/yRange);
    // White outline for visibility
    ctx.font='bold 10px sans-serif';ctx.textAlign='center';
    var label=mkLabel==='BS'||mkLabel==='SB'?'T':mkLabel;
    var lx=mkX,ly=mkY-12;
    ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.strokeText(label,lx,ly);
    if(label==='T')ctx.fillStyle='#e67e22';
    else if(label==='B')ctx.fillStyle='#c0392b';
    else ctx.fillStyle='#1e7e34';
    ctx.fillText(label,lx,ly);
  }
  // Clean old trades (outside 10-day window)
  if(trades.length>20){GS.stockTrades[sym]=trades.slice(-20);}
}

function closeStocks(){
  var el=document.getElementById('stocks-overlay');
  if(el)el.parentNode.removeChild(el);
}

function buyStock(sym,qty){
  updateStockPrices();
  var price=GS.stockPrices[sym];
  qty=parseInt(qty)||10;
  if(qty%10!==0||qty<10){showToast('数量必须为10的整数倍（1手=10股）');return;}
  var shares=qty;
  var cost=price*shares;
  var fee=cost*0.01;
  var total=cost+fee;
  var hands=shares/10;
  var limitUp=GS.stockPrevPrices[sym]?price>=GS.stockPrevPrices[sym]*1.099:false;
  if(limitUp){showToast('该股票已涨停，无法买入！');return;}
  if(GS.money<total){showToast('金钱不足！买入'+hands+'手需 ¥'+total.toFixed(2)+'（含1%手续费）');return;}
  if(!confirm('确认买入 '+STOCK_NAMES[sym]+' '+hands+'手（'+shares+'股）？\n价格：¥'+price.toFixed(2)+'/股\n手续费(1%)：¥'+fee.toFixed(2)+'\n合计：¥'+total.toFixed(2))){
    return;
  }
  GS.money=GS.money-total;
  var h=GS.holdings[sym];
  h.shares+=shares;
  h.costBasis+=total;
  h.todayBought=(h.todayBought||0)+shares;
  updatePanel();
  if(!GS.stockTrades)GS.stockTrades={niaoye:[],benben:[],bobi:[]};
  GS.stockTrades[sym].push({type:'B',price:price,date:fmtDate(GS.year,GS.month,GS.day)});
  showToast('✅ 成功买入 '+STOCK_NAMES[sym]+' '+hands+'手！');
  renderStocksPanel();
}

function sellStock(sym,qty){
  updateStockPrices();
  var price=GS.stockPrices[sym];
  var h=GS.holdings[sym];
  qty=parseInt(qty)||10;
  if(qty%10!==0||qty<10){showToast('数量必须为10的整数倍（1手=10股）');return;}
  var shares=qty;
  var sellable=h.shares-(h.todayBought||0);
  if(sellable<shares){showToast('T+1限制！今日买入的'+(h.todayBought||0)+'股需下个交易日才能卖出。当前可卖：'+sellable+'股');return;}
  var cost=price*shares;
  var fee=cost*0.01;
  var revenue=cost-fee;
  var hands=shares/10;
  var limitDown=GS.stockPrevPrices[sym]?price<=GS.stockPrevPrices[sym]*0.901:false;
  if(limitDown){showToast('该股票已跌停，无法卖出！');return;}
  if(!confirm('确认卖出 '+STOCK_NAMES[sym]+' '+hands+'手（'+shares+'股）？\n价格：¥'+price.toFixed(2)+'/股\n手续费(1%)：¥'+fee.toFixed(2)+'\n到账：¥'+revenue.toFixed(2))){
    return;
  }
  GS.money=GS.money+revenue;
  var avgCost=h.shares>0?h.costBasis/h.shares:0;
  h.shares-=shares;
  h.costBasis=Math.max(0,h.costBasis-avgCost*shares);
  updatePanel();
  if(!GS.stockTrades)GS.stockTrades={niaoye:[],benben:[],bobi:[]};
  GS.stockTrades[sym].push({type:'S',price:price,date:fmtDate(GS.year,GS.month,GS.day)});
  showToast('✅ 成功卖出 '+STOCK_NAMES[sym]+' '+hands+'手！');
  renderStocksPanel();
}
