// §1.5 ==================== 游戏状态 & 存档 ====================
var GS;
function defaultState(){
  return {
    year:2024,month:8,day:15,
    health:100,happiness:100,wisdom:100,charm:100,
    glory:0,money:3700,singing:0,performance:0,
    hasPengyuanCard:false,hasPhoneCard:false,
    talentPerformed:false,talentSuccess:false,wonElection:false,
    tuanxiaoApplied:false,tuanxiaoAccepted:false,
    dachuangJoined:false,hanpengHaoGan:0,
    cet4Applied:false,deskBought:false,
    clubApplied:false,clubType:'',
    keChuangUnlocked:false,sheTuanUnlocked:false,tuanxiaoWeekBan:0,
    gfUnlocked:false,gfName:'',gfFavor:0,gfId:'',_popupSeq:0,
    inventory:[],phase:'title',currentNode:null,currentDay:null,currentPhaseIdx:0,
    pengyuanBalance:0,tuanxiaoWisdomPending:false,
    teacherFavor:80,
    lastMealDay:'',
    breakupProb:0,
    courseUnlocked:{},
    courseGrades:{academicLang:80,cppProg:80,advancedMath:80,pe:80,moralLaw:80,dataAnalysis:80,mentalHealth:80,careerPlan:80,xingshiZhengce:2,laborEducation:2},
    taniaFavor:80,shijianmingFavor:80,zhouruiFavor:80,
    hanpengUnlocked:false,taniaUnlocked:false,shijianmingUnlocked:false,zhouruiUnlocked:false,
    weekendEventReduction:0,
    holidayRoute:null,
    hanjieFavor:80,cherryFavor:80,liguoruiFavor:80,songjunliFavor:80,lixinyaoFavor:80,
    hanjieUnlocked:false,cherryUnlocked:false,liguoruiUnlocked:false,songjunliUnlocked:false,lixinyaoUnlocked:false,
    acmRegistered:false,lastBonusDay:'',weather:null,
    storyLog:[],
    putonghuaRegistered:false,zhuchirenRegistered:false,
    stocksUnlocked:false,
    holdings:{niaoye:{shares:0,costBasis:0,todayBought:0},benben:{shares:0,costBasis:0,todayBought:0},bobi:{shares:0,costBasis:0,todayBought:0}},
    stockPrices:{niaoye:18,benben:12,bobi:8},
    lastStockDay:'',stockPrevPrices:{niaoye:18,benben:12,bobi:8},
    stockHistory:{niaoye:[18,18,18,18,18,18,18,18,18,18],benben:[12,12,12,12,12,12,12,12,12,12],bobi:[8,8,8,8,8,8,8,8,8,8]},
    stockTrades:{niaoye:[],benben:[],bobi:[]},
    zaocaoExempt:false,
    _dramaTeam:[],_dramaName:'',
    campusRunKm:0,
    girlfriends:[],
    classmateFavor:{huye:80,naikou:80,jingye:80,langweifu:50,caomugai:50,zhihuanming:50,sukongfen:50,hannaotan:50,yinnaichun:50,yanhongjiu:50,shenyehuai:50,xiaogumai:50,nietuofei:50,guyiqi:50,tonghuke:50,xiataoming:50,jiaomudong:50,xuanliuqi:50,gantuofen:50,lihuayi:50,luoxu:50,qiebofeng:50,goutongmian:50,suxiaonuan:50,dilihei:40,shantanjing:40,hesijia:40,eryi:40,junqibang:40,zichunqian:40},
    phone:{battery:70,credit:50,data:5120,model:0,wallpaper:'default',appsOrder:['contacts','sms','wechat','jiaowu','campuslife','finance','shopping','calendar','food','gallery','navigation'],contacts:{},messages:[],moments:[],photos:[],secondHandItems:[],callLog:[],momReplied:false,momConsecutive:0,lastChargeDay:'',dataPlan:0,savedData:false,upgradeBought:0,depreciationDay:'',dormIssue:null,dormIssueDay:'',gameHour:10,gameMinute:0}
  };
}

function doEffects(eff){
  var ch={};
  for(var k in eff){
    if(eff.hasOwnProperty(k)&&GS.hasOwnProperty(k)&&typeof GS[k]==='number'){
      var old=GS[k];
      GS[k]=Math.max(0,GS[k]+eff[k]);
      ch[k]=GS[k]-old;
    }
  }
  // 属性 / 金钱发生变化时，在屏幕中央浮字 + 特效。
  // doEffects 是所有数值结算的唯一出口，挂在这里可以覆盖全局。
  if(typeof VN!=='undefined'&&VN&&VN.statFloat)VN.statFloat(ch);
  return ch;
}

function updatePanel(){
  $('date-display').textContent=fmtDate(GS.year,GS.month,GS.day);
  $('weekday-display').textContent='星期'+weekday(GS.year,GS.month,GS.day);
  $('val-health').textContent=GS.health;
  $('val-happy').textContent=GS.happiness;
  $('val-wisdom').textContent=GS.wisdom;
  $('val-charm').textContent=GS.charm;
  $('val-glory').textContent=GS.glory;
  $('val-money').textContent=GS.money;
  $('val-singing').textContent=GS.singing;
  $('val-performance').textContent=GS.performance;
  $('val-pengyuan').textContent=GS.pengyuanBalance;
  $('val-teacher-favor').textContent=GS.teacherFavor;
  $('val-classmate-favor').textContent=GS.classmateFavor;
  if(GS.girlfriends&&GS.girlfriends.length>0){
    $('love-row').style.display='flex';
    var gfNames=[],gfFavors=[];
    for(var gi2=0;gi2<GS.girlfriends.length;gi2++){
      gfNames.push(GS.girlfriends[gi2].name);
      gfFavors.push(GS.girlfriends[gi2].favor);
    }
    $('gf-name').textContent=gfNames.join('、');
    $('gf-favor').textContent=gfFavors.join(' / ');
  }else{$('love-row').style.display='none';}
  var b=['🐯虎爷:考试+10%','🍼奶扣:月末健康-5','🏅京爷:竞赛+10%'];
  if(GS.hasPengyuanCard)b.push('💳鹏远余额:'+GS.pengyuanBalance);
  if(GS.hasPhoneCard)b.push('📶电话卡(-49/月)');
  if(GS.wonElection)b.push('🎖️班委');
  if(GS.keChuangUnlocked)b.push('🔬科创');
  if(GS.sheTuanUnlocked)b.push('🎭社团');
  if(GS.tuanxiaoAccepted&&GS.tuanxiaoWeekBan>0){
    if(GS.month<10)b.push('⚠️团校集训(10月起，剩'+GS.tuanxiaoWeekBan+'周)');
    else if(GS.tuanxiaoWisdomPending)b.push('📖团校进行中('+GS.tuanxiaoWeekBan+'周)·悟性+100待领');
    else b.push('⚠️团校周末禁闭('+GS.tuanxiaoWeekBan+'周)');
  }
  if(GS.clubType)b.push('📋已报社团:'+GS.clubType);
  if(GS.gfUnlocked)b.push('💕恋爱中');
  if(GS.weekendEventReduction>0)b.push('🗳️周末事件-'+GS.weekendEventReduction);
  if(GS._dramaTeam&&GS._dramaTeam.length>0){
    var dtNames=[];for(var di=0;di<GS._dramaTeam.length;di++){var dm=CLASSMATES[GS._dramaTeam[di]];if(dm)dtNames.push(dm.name);}
    b.push('🎭 Drama：'+dtNames.join('、')+(GS._dramaName?' -《'+GS._dramaName+'》':''));
  }
  if(GS.campusRunKm>=60)b.push('🏃 校园健康跑：60/60km已完成');
  else if(GS.campusRunKm>0||GS.month>=10)b.push('🏃 校园健康跑：'+(GS.campusRunKm||0)+'/60km');
  if(GS.weather)b.push(GS.weather.icon+' '+GS.weather.name+(GS.weather.sleepBonus?' 💤+3':''));
  $('buff-row').innerHTML=b.map(function(x){return'<span>'+x+'</span>';}).join('');
  updateNewsTicker();
}
// 每日新闻已改为「新的一天开始时在屏幕中央以卡片播放」，
// 不再使用底部滚动条（见 js/vn/adapter.js 的 newsBeat()）。
// 这里只负责保证旧的底部容器始终隐藏，避免残留。
function updateNewsTicker(){
  var el=$('news-ticker');
  if(el)el.style.display='none';
}

var _logCtx=null; // 走马灯日志上下文

// ===== 弹窗 =====
function showPopup(title,resultText,changes,hiddenInfo,callback,btnLabel){
  if(_logCtx&&title){
    if(!GS.storyLog)GS.storyLog=[];
    var entry={date:fmtDate(GS.year,GS.month,GS.day),title:title,changes:{}};
    if(changes){for(var ck in changes){if(changes.hasOwnProperty(ck)&&changes[ck]!==0)entry.changes[ck]=changes[ck];}}
    if(_logCtx.choice)entry.choice=_logCtx.choice;
    if(resultText)entry.result=resultText;
    GS.storyLog.push(entry);
    _logCtx=null;
  }
  var overlay=document.createElement('div');overlay.className='popup-overlay';
  var chgHtml='';
  if(changes&&Object.keys(changes).length>0){
    chgHtml='<div class="popup-changes">';
    for(var k in changes){
      if(changes.hasOwnProperty(k)&&changes[k]!==0){
        var cls=changes[k]>0?'pos':'neg';
        var sign=changes[k]>0?'+':'';
        chgHtml+='<span class="chg-item '+cls+'">'+(ICON[k]||'')+' '+(ATTR[k]||k)+' '+sign+changes[k]+'</span>';
      }
    }
    chgHtml+='</div>';
  }
  var hh=hiddenInfo?'<div class="popup-hidden">🔍 '+hiddenInfo+'</div>':'';
  var rt=resultText?resultText.replace(/\n/g,'<br>'):'';
  var popId='popup-ok-'+(++GS._popupSeq||(GS._popupSeq=1));
  overlay.innerHTML='<div class="popup-box"><div class="popup-title">'+title+'</div>'+(rt?'<div class="popup-result">'+rt+'</div>':'')+chgHtml+hh+'<button class="popup-btn" id="'+popId+'">'+(btnLabel||'确定')+'</button></div>';
  document.body.appendChild(overlay);
  var okBtn=document.getElementById(popId);
  if(okBtn)okBtn.onclick=function(){overlay.remove();if(callback)callback();};
  overlay.onclick=function(e){if(e.target===overlay){overlay.remove();if(callback)callback();}};
}

// ===== 渲染入口 =====
function setPhase(p){
  GS.phase=p;
  $('attr-panel').style.display=(p==='story'||p==='daily')?'block':'none';
  $('bottom-bar').style.display=(p==='story'||p==='daily')?'flex':'none';
  $('choices-area').innerHTML='';
  $('main-area').innerHTML='';
}

function renderBottomBar(){
  $('bottom-bar').innerHTML='<button onclick="exportSave()">📤 导出</button><button onclick="importSave()">📥 导入</button><button onclick="openSupermarket()">🏪 利生超市</button><button onclick="openStocks()">📈 金融理财</button><button onclick="showGrades()">📊 成绩</button><button onclick="showTeacherFavors()">👨‍🏫 教师好感</button><button onclick="openClassmates()">👥 同学</button><button onclick="openPhone()" style="background:#2c3e50;color:#f0e6d3;border-color:#34495e;">📱 手机</button><button onclick="openTimeline()">📜 走马灯</button><button onclick="resetToTitle()">🏠 标题</button>';
}
