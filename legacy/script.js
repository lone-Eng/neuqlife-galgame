/**
 * 东秦校园人生 - 重构版
 * ========================
 * 目录：
 *   §1  工具函数 & 常量数据    (ATTR, ICON, 天气, 状态)
 *   §2  引擎核心               (showPopup, updatePanel, processDay, renderDayPhase)
 *   §3  故事系统               (STORY_NODES, STORY_DAYS 9.07-10.15)
 *   §4  国庆假期               (HOLIDAY_DAYS, 路线, GF选择)
 *   §5  同学系统               (CLASSMATES, 随机事件, 聊天/赠礼/表白)
 *   §6  女友系统               (girlfriends, 事件池, 分手/多女友)
 *   §7  金融理财               (股票, 走势图, T+1)
 *   §8  Drama组队               (10.15 邀请系统)
 *   §9  走马灯 & 存档           (timeline, save/load, export/import)
 *   §10 初始化                  (renderTitle, init)
 */

// §1 ==================== 工具函数 & 常量数据 ====================
function $(id){return document.getElementById(id);}
function weekday(y,m,d){return ['日','一','二','三','四','五','六'][new Date(y,m-1,d).getDay()];}
function fmtDate(y,m,d){return y+'年'+m+'月'+d+'日';}
function dateKey(y,m,d){return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
function isWeekend(y,m,d){var w=new Date(y,m-1,d).getDay();return w===0||w===6;}
function isWeekday(y,m,d){return !isWeekend(y,m,d);}
function daysInMonth(y,m){if(m===2)return(y%4===0&&(y%100!==0||y%400===0))?29:28;return [31,28,31,30,31,30,31,31,30,31,30,31][m-1];}

var ATTR={health:'健康',happiness:'幸福',wisdom:'悟性',charm:'魅力',glory:'荣耀',money:'金钱',singing:'歌唱能力',performance:'表演能力',pengyuanBalance:'鹏远余额',gfFavor:'好感度',hanpengHaoGan:'韩鹏好感',teacherFavor:'教师好感',classmateFavor:'同学好感',taniaFavor:'Tania好感',shijianmingFavor:'史鉴明好感',zhouruiFavor:'周蕊好感',hanjieFavor:'韩杰好感',cherryFavor:'Cherry好感',liguoruiFavor:'李国瑞好感',songjunliFavor:'宋俊丽好感',lixinyaoFavor:'李心瑶好感',huyeFav:'虎爷好感',naikouFav:'奶扣好感',jingyeFav:'京爷好感'};
var ICON={health:'❤️',happiness:'😊',wisdom:'📖',charm:'✨',glory:'🏆',money:'💰',singing:'🎤',performance:'🎭',pengyuanBalance:'💳',gfFavor:'💕',hanpengHaoGan:'🤝',teacherFavor:'👨‍🏫',classmateFavor:'👥',taniaFavor:'👩‍🏫',shijianmingFavor:'👨‍🔬',zhouruiFavor:'👩‍🏫',hanjieFavor:'👨‍🏫',cherryFavor:'👩‍🏫',liguoruiFavor:'👨‍💻',songjunliFavor:'👩‍🏫',lixinyaoFavor:'👩‍🏫',huyeFav:'🐯',naikouFav:'🍼',jingyeFav:'🏅'};

var COURSE_NAMES={academicLang:'学术语言交流与沟通（中级）',cppProg:'C++程序设计基础',advancedMath:'高等数学建模A',pe:'体育',moralLaw:'思想道德与法治',dataAnalysis:'智能数据分析导论',mentalHealth:'心理健康教育',careerPlan:'大学生职业生涯规划',xingshiZhengce:'形势与政策',laborEducation:'劳动教育'};
var TEACHER_NAMES={hanpeng:'韩鹏',tania:'Tania',shijianming:'史鉴明',zhourui:'周蕊',hanjie:'韩杰',cherry:'Cherry',liguorui:'李国瑞',songjunli:'宋俊丽',lixinyao:'李心瑶'};

var HOLIDAY_ROUTES={
  home:{name:'返乡回家过节',dailyEffects:{money:-180,happiness:12,health:8},skipMeal:true,gfMod:{favorDecay:5}},
  campus:{name:'留守东秦校园',dailyEffects:{},skipMeal:false,gfMod:{},hasCampusEvents:true},
  couple:{name:'与女友短途出游',dailyEffects:{money:-160,happiness:15},skipMeal:false,gfMod:{favorBonus:18,specialChance:0.35},requiresGf:true},
  internship:{name:'前往鸟爷控股短期实习',dailyEffects:{money:100,health:-10},skipMeal:false,gfMod:{rejectExtra:5}},
  dorm:{name:'宿舍摆烂躺平',dailyEffects:{health:10,happiness:14,wisdom:-12},skipMeal:false,gfMod:{acceptPenalty:2}}
};

// ===== 天气系统 =====
var WEATHER_TYPES={
  sunny:{name:'晴天',icon:'☀️',desc:'阳光明媚，天光透亮，校园光线充足，气温舒适。',effects:{health:2,happiness:1},prob:0.28,seasons:'all'},
  cloudy:{name:'多云',icon:'⛅',desc:'云朵零散分布，阳光时隐时现，体感平和。',effects:{},prob:0.25,seasons:'all'},
  overcast:{name:'阴天',icon:'☁️',desc:'天空被乌云遮盖，光线昏暗，氛围沉闷。',effects:{happiness:-2},prob:0.18,seasons:'all'},
  fog:{name:'大雾',icon:'🌫️',desc:'浓雾笼罩校园，能见度降低，空气潮湿微凉。',effects:{wisdom:-1,health:-1},prob:0.08,seasons:'all'},
  rain:{name:'雨',icon:'🌧️',desc:'细雨连绵，地面潮湿，出行需撑伞，户外行动不便。',effects:{health:-1,wisdom:1},prob:0.12,seasons:'warm',sleepBonus:true},
  thunderstorm:{name:'雷雨',icon:'⛈️',desc:'乌云压顶，雷声阵阵，雨势急促，户外闷热压抑。',effects:{happiness:-2,wisdom:2},prob:0.09,seasons:'warm',sleepBonus:true},
  snow:{name:'雪',icon:'❄️',desc:'雪花飘落，地面覆上薄雪，气温走低，寒风相伴。',effects:{health:-1,happiness:1},prob:0.12,seasons:'cold',sleepBonus:true},
  blizzard:{name:'暴雪',icon:'🌨️',desc:'大雪纷飞，视野受阻，户外严寒刺骨，出行困难。',effects:{health:-3,happiness:-2},prob:0.09,seasons:'cold',sleepBonus:true}
};

function pickDailyWeather(){
  var m=GS.month;var season=(m>=4&&m<=10)?'warm':'cold';
  var pool=[];var totalProb=0;
  for(var wk in WEATHER_TYPES){
    if(!WEATHER_TYPES.hasOwnProperty(wk))continue;
    var wt=WEATHER_TYPES[wk];
    if(wt.seasons==='all'||wt.seasons===season){pool.push({key:wk,type:wt,prob:wt.prob});totalProb+=wt.prob;}
  }
  var roll=Math.random()*totalProb;var cum=0;
  for(var i=0;i<pool.length;i++){cum+=pool[i].prob;if(roll<cum)return{key:pool[i].key,name:pool[i].type.name,icon:pool[i].type.icon,desc:pool[i].type.desc,effects:pool[i].type.effects,sleepBonus:!!pool[i].type.sleepBonus};}
  return{key:'sunny',name:'晴天',icon:'☀️',desc:WEATHER_TYPES.sunny.desc,effects:WEATHER_TYPES.sunny.effects,sleepBonus:false};
}

function getWeatherSleepBonus(){
  if(GS.weather&&GS.weather.sleepBonus)return{happiness:3};
  return{};
}
function getWeatherSleepNarrative(){
  if(!GS.weather||!GS.weather.sleepBonus)return'';
  var k=GS.weather.key;
  if(k==='rain')return'窗外细雨绵绵，雨声簌簌伴你入眠。被窝里的暖意与雨天的静谧交织，这一觉睡得格外香甜。';
  if(k==='thunderstorm')return'窗外雷声隐隐、雨势急促，屋里却格外温暖安全。伴着雷雨声沉入梦乡，睡得分外踏实。';
  if(k==='snow')return'窗外雪花静静飘落，宿舍里暖意融融。雪天的被窝仿佛有魔力，让人睡得特别沉、特别香。';
  if(k==='blizzard')return'窗外暴雪呼啸，屋里暖气十足。这种天气窝在被子里睡觉简直是人间至福，幸福感在心中弥漫。';
  return'';
}

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
    phone:{battery:70,credit:50,data:5120,model:0,wallpaper:'default',appsOrder:['contacts','sms','wechat','jiaowu','campuslife','finance','shopping','calendar','food','gallery','navigation'],contacts:{},messages:[],moments:[],photos:[],secondHandItems:[],callLog:[],momReplied:false,momConsecutive:0,lastChargeDay:'',dataPlan:0,savedData:false,upgradeBought:0,depreciationDay:'',dormIssue:null,dormIssueDay:''}
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
function updateNewsTicker(){
  var dk=dateKey(GS.year,GS.month,GS.day);
  var news=DAILY_NEWS[dk];
  if(news){
    $('news-ticker').innerHTML='<div class="news-wrap"><span class="news-date">📰 '+fmtDate(GS.year,GS.month,GS.day)+'</span>'+news+'</div>';
    $('news-ticker').style.display='block';
  }else{
    $('news-ticker').style.display='none';
  }
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

// ===== 利生超市 =====
var SUPERMARKET_REGULAR=[
  {id:'qiaolezi',name:'巧乐兹',desc:'经典巧克力脆皮雪糕，一口甜蜜治愈疲惫',cost:8,effects:{happiness:5}},
  {id:'kaochang',name:'烤肠',desc:'热腾腾的烤肠，外焦里嫩，课间必备',cost:5,effects:{happiness:3}},
  {id:'gaozhi',name:'东秦草稿纸',desc:'印有东秦校徽的优质草稿纸，学习好帮手',cost:3,effects:{wisdom:3}}
];
var SUPERMARKET_MYSTERY_POOL=[
  {id:'myst1',name:'神秘零食大礼包',desc:'随机搭配的进口零食组合',cost:12,effects:{happiness:8,health:2}},
  {id:'myst2',name:'东秦纪念笔记本',desc:'限量版烫金硬壳笔记本，东秦校训印制',cost:15,effects:{wisdom:6,happiness:3}},
  {id:'myst3',name:'好运红牛',desc:'据说考试前喝一罐能带来好运',cost:10,effects:{health:5,charm:3}},
  {id:'myst4',name:'学霸二手教材',desc:'不知哪位学霸留下的珍贵专业课教材',cost:20,effects:{wisdom:10}},
  {id:'myst5',name:'校园风景明信片套装',desc:'手绘东秦十景，收藏或寄给远方好友',cost:8,effects:{happiness:4,charm:3}},
  {id:'myst6',name:'暖宝宝贴',desc:'冬日神器，贴在衣服里暖和一整天',cost:6,effects:{health:4,happiness:3}}
];

function isMysteryDay(){var d=GS.day;return d===1||d===10||d===20||d===30;}

function openSupermarket(){
  var overlay=document.createElement('div');overlay.className='supermarket-overlay';
  var html='<div class="supermarket-box">';
  html+='<div class="sm-title">🏪 利生超市</div>';
  html+='<div class="sm-subtitle">校园生活便利店 · 刷现金或鹏远卡均可支付</div>';
  html+='<div class="sm-payment"><span style="font-weight:600;">支付方式：</span>';
  html+='<label><input type="radio" name="sm-pay" value="money" checked> 💰 现金（余额：'+GS.money+'）</label>';
  if(GS.hasPengyuanCard){
    html+='<label><input type="radio" name="sm-pay" value="pengyuan"> 💳 鹏远卡（余额：'+GS.pengyuanBalance+'）</label>';
  }
  html+='</div>';
  html+='<div style="font-weight:600;color:#1a3a5c;margin-bottom:8px;">📦 常驻商品</div>';
  for(var i=0;i<SUPERMARKET_REGULAR.length;i++){
    html+=buildSmItemHtml(SUPERMARKET_REGULAR[i],false);
  }
  if(isMysteryDay()){
    var seed=GS.year*10000+GS.month*100+GS.day;
    var idx=seed%SUPERMARKET_MYSTERY_POOL.length;
    var mItem=SUPERMARKET_MYSTERY_POOL[idx];
    html+='<div style="font-weight:600;color:#c9a96e;margin:12px 0 8px;">🎁 今日神秘商品 <span style="font-size:.75em;font-weight:400;">（每月1/10/20/30日限时上架）</span></div>';
    html+=buildSmItemHtml(mItem,true);
  }
  html+='<button class="sm-close" id="sm-close-btn">关闭超市</button></div>';
  overlay.innerHTML=html;
  document.body.appendChild(overlay);
  $('sm-close-btn').onclick=function(){overlay.remove();};
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
  var buyBtns=overlay.querySelectorAll('.sm-buy-btn');
  for(var j=0;j<buyBtns.length;j++){
    (function(btnEl){
      btnEl.onclick=function(){
        var payMethod=overlay.querySelector('input[name="sm-pay"]:checked').value;
        var cost=parseInt(btnEl.getAttribute('data-cost'));
        var effStr=btnEl.getAttribute('data-effects');
        var name=btnEl.getAttribute('data-name');
        var effects=JSON.parse(effStr);
        if(payMethod==='money'&&GS.money<cost){showToast('现金不足！需要'+cost+'元，当前余额：'+GS.money+'元');return;}
        if(payMethod==='pengyuan'&&GS.pengyuanBalance<cost){showToast('鹏远余额不足！需要'+cost+'元，当前余额：'+GS.pengyuanBalance+'元');return;}
        if(payMethod==='money'){effects.money=(effects.money||0)-cost;}
        else{effects.pengyuanBalance=(effects.pengyuanBalance||0)-cost;}
        var changes=doEffects(effects);updatePanel();
        overlay.remove();
        showPopup('利生超市','你购买了【'+name+'】。'+(payMethod==='money'?'使用现金支付'+cost+'元。':'使用鹏远卡支付'+cost+'元。'),changes,null,null);
      };
    })(buyBtns[j]);
  }
}

function buildSmItemHtml(item,isMystery){
  var effStrs=[];
  for(var k in item.effects){
    if(item.effects.hasOwnProperty(k)){
      var sign2=item.effects[k]>0?'+':'';
      effStrs.push((ICON[k]||'')+' '+sign2+item.effects[k]);
    }
  }
  var cls=isMystery?'sm-item mystery':'sm-item';
  var tag=isMystery?'<span class="sm-mystery-tag">神秘</span>':'';
  return '<div class="'+cls+'"><div class="sm-info"><div class="sm-name">'+tag+item.name+'</div><div class="sm-desc">'+item.desc+'</div><div class="sm-effects">'+effStrs.join(' · ')+'</div></div><div class="sm-cost">¥'+item.cost+'</div><button class="sm-buy-btn" data-cost="'+item.cost+'" data-effects=\''+JSON.stringify(item.effects)+'\' data-name="'+item.name+'">购买</button></div>';
}

function showGrades(){
  var overlay=document.createElement('div');overlay.className='grades-overlay';
  var html='<div class="grades-box">';
  html+='<div class="grades-title">📊 课程成绩</div>';
  html+='<div class="grades-subtitle">当前学期课程预估成绩</div>';
  var courses=['academicLang','cppProg','advancedMath','pe','moralLaw','dataAnalysis','mentalHealth','careerPlan','xingshiZhengce','laborEducation'];
  for(var i=0;i<courses.length;i++){
    var key=courses[i];
    if(key==='xingshiZhengce'||key==='laborEducation'){
      var xzVal=GS.courseGrades[key];
      var xzText=xzVal>=2?'合格':(xzVal>=1?'合格(-)':'不合格');
      var xzCls=xzVal>=2?'high':(xzVal>=1?'medium':'low');
      html+='<div class="grade-item"><span class="grade-name">'+COURSE_NAMES[key]+'</span><span class="grade-val '+xzCls+'">'+xzText+'</span></div>';
    }else if(key==='pe'){
      var peBase=GS.courseGrades[key]||80;
      var peDisplay=peBase+Math.floor((GS.health-100)/10);
      var peCls=peDisplay>=90?'high':(peDisplay>=70?'medium':'low');
      html+='<div class="grade-item"><span class="grade-name">'+COURSE_NAMES[key]+'</span><span class="grade-val '+peCls+'">'+peDisplay+' 分</span></div>';
    }else{
      var score=GS.courseGrades[key]||80;
      var cls=score>=90?'high':(score>=70?'medium':'low');
      html+='<div class="grade-item"><span class="grade-name">'+COURSE_NAMES[key]+'</span><span class="grade-val '+cls+'">'+score+' 分</span></div>';
    }
  }
  html+='<button class="grades-close" id="grades-close-btn">关闭</button></div>';
  overlay.innerHTML=html;
  document.body.appendChild(overlay);
  $('grades-close-btn').onclick=function(){overlay.remove();};
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
}

function showTeacherFavors(){
  var overlay=document.createElement('div');overlay.className='teacher-favor-overlay';
  var html='<div class="teacher-favor-box">';
  html+='<div class="tf-title">👨‍🏫 教师好感度</div>';
  html+='<div class="tf-subtitle">已解锁教师的好感度一览</div>';
  var unlocked=[];
  if(GS.hanpengUnlocked)unlocked.push({key:'hanpeng',name:TEACHER_NAMES.hanpeng,favor:GS.hanpengHaoGan});
  if(GS.taniaUnlocked)unlocked.push({key:'tania',name:TEACHER_NAMES.tania,favor:GS.taniaFavor});
  if(GS.shijianmingUnlocked)unlocked.push({key:'shijianming',name:TEACHER_NAMES.shijianming,favor:GS.shijianmingFavor});
  if(GS.zhouruiUnlocked)unlocked.push({key:'zhourui',name:TEACHER_NAMES.zhourui,favor:GS.zhouruiFavor});
  if(GS.hanjieUnlocked)unlocked.push({key:'hanjie',name:TEACHER_NAMES.hanjie,favor:GS.hanjieFavor});
  if(GS.cherryUnlocked)unlocked.push({key:'cherry',name:TEACHER_NAMES.cherry,favor:GS.cherryFavor});
  if(GS.liguoruiUnlocked)unlocked.push({key:'liguorui',name:TEACHER_NAMES.liguorui,favor:GS.liguoruiFavor});
  if(GS.songjunliUnlocked)unlocked.push({key:'songjunli',name:TEACHER_NAMES.songjunli,favor:GS.songjunliFavor});
  if(GS.lixinyaoUnlocked)unlocked.push({key:'lixinyao',name:TEACHER_NAMES.lixinyao,favor:GS.lixinyaoFavor});
  if(unlocked.length===0){
    html+='<div class="tf-empty">暂无已解锁的教师<br><span style="font-size:.8em;">随剧情推进逐步解锁</span></div>';
  }else{
    for(var i=0;i<unlocked.length;i++){
      var t=unlocked[i];
      html+='<div class="tf-item"><span class="tf-name">'+t.name+' 老师</span><span class="tf-val">'+t.favor+' 好感度</span></div>';
    }
  }
  html+='<button class="tf-close" id="tf-close-btn">关闭</button></div>';
  overlay.innerHTML=html;
  document.body.appendChild(overlay);
  $('tf-close-btn').onclick=function(){overlay.remove();};
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
}

function renderTitle(){
  setPhase('title');
  $('attr-panel').style.display='none';
  $('bottom-bar').style.display='none';
  $('main-area').innerHTML='<div id="title-screen"><h1>东秦校园人生</h1><div class="subtitle">—— 文字养成 · 大学生涯模拟 ——</div><div class="desc">你是一名东秦大学2024级本科新生。<br>从收到录取通知书的那一刻起，<br>你将在校园中度过充满选择与成长的四年时光。<br>每一次选择，都将塑造独一无二的你。</div><button onclick="startNewGame()">开始新游戏</button><div style="margin-top:20px;"><button style="background:#8b7d6b;font-size:.85em;padding:10px 28px;" onclick="importSave()">导入存档</button></div><div style="margin-top:14px;font-size:.75em;color:#aaa;">存档自动保存至浏览器本地</div></div>';
}

function startNewGame(){
  GS=defaultState();
  GS.phase='allocation';
  GS.health=30;GS.happiness=30;GS.wisdom=30;GS.charm=30;
  renderAllocation();
}

// ===== 属性分配 =====
function renderAllocation(){
  setPhase('title');
  $('attr-panel').style.display='none';
  $('bottom-bar').style.display='none';
  var rem=400-GS.health-GS.happiness-GS.wisdom-GS.charm;
  var attrs=[
    {key:'health',icon:'❤️',name:'健康',desc:'体魄与精力'},
    {key:'happiness',icon:'😊',name:'幸福',desc:'情绪与满足感'},
    {key:'wisdom',icon:'📖',name:'悟性',desc:'学习与理解力'},
    {key:'charm',icon:'✨',name:'魅力',desc:'社交与表达力'}
  ];
  var html='<div id="allocation-screen"><h2>📋 初始属性分配</h2>';
  html+='<div class="alloc-desc">四项核心属性初始总和为400点，请自由分配（单项最低30点）</div>';
  html+='<div class="remaining">剩余可分配点数：<span id="remain-pts">'+rem+'</span></div>';
  for(var i=0;i<attrs.length;i++){
    var a=attrs[i];
    html+='<div class="alloc-row">';
    html+='<div class="info"><span class="icon">'+a.icon+'</span><div><div class="name">'+a.name+'</div><div class="desc">'+a.desc+'</div></div></div>';
    html+='<div class="controls">';
    html+='<button id="minus-'+a.key+'" onclick="adjustAttr(\''+a.key+'\',-5)"'+(GS[a.key]<=30?' disabled':'')+'>−</button>';
    html+='<span class="val" id="val-'+a.key+'">'+GS[a.key]+'</span>';
    html+='<button id="plus-'+a.key+'" onclick="adjustAttr(\''+a.key+'\',5)"'+(rem<=0?' disabled':'')+'>+</button>';
    html+='</div></div>';
  }
  html+='<button class="confirm-btn" id="confirm-alloc" onclick="confirmAllocation()"'+(rem!==0?' disabled':'')+'>确认分配 · 开始大学生涯</button>';
  html+='</div>';
  $('main-area').innerHTML=html;
}

function adjustAttr(key,delta){
  var rem=400-GS.health-GS.happiness-GS.wisdom-GS.charm;
  var nv=GS[key]+delta;
  if(delta>0&&rem<=0)return;
  if(delta<0&&nv<30)return;
  if(delta>0&&rem<delta)return;
  GS[key]=nv;
  renderAllocation();
}

function confirmAllocation(){
  if((GS.health+GS.happiness+GS.wisdom+GS.charm)!==400)return;
  GS.phase='story';GS.currentNode='prologue';
  GS.year=2024;GS.month=8;GS.day=15;
  $('attr-panel').style.display='block';
  $('bottom-bar').style.display='flex';
  updatePanel();
  renderStoryNode(STORY_NODES.prologue);
  renderBottomBar();
  saveGame();
}

// §3 ==================== 故事节点 9.7 入学 ====================
var STORY_NODES={
prologue:{date:[2024,8,15],title:'神秘邮件',text:'2024年8月，你的邮箱收到一封无发件人的EMA神秘邮件。\n\n带着疑惑拆开邮件后，一封烫金的东秦大学录取通知书静静躺在文件中。\n\n通知书清晰标注：2024年9月7日前往东秦大学指定地点完成新生入学报到。\n\n你的大学生涯，自此拉开序幕。',choices:[],autoNext:'sep7_stage1',dateJump:[2024,9,7]},
sep7_stage1:{date:[2024,9,7],title:'校园报到 · 鹏远卡办理',text:'2024年9月7日，你怀揣录取通知书踏入东秦大学校园，按照通知书指引前往东操场完成新生统一报到。\n\n完成基础信息登记后，在校志愿者一对一带领下，你前往校内鹏远公寓办理入住手续。抵达公寓服务中心后，工作人员提示你可以自愿办理官方鹏远一卡通。',choices:[
  {text:'办理鹏远通行卡（扣除1200元）',effects:{money:-1200,pengyuanBalance:700},flags:{hasPengyuanCard:true},result:'你选择办理鹏远通行卡，支付1200元后获得了通行卡一张、卡内余额700元、公寓专属水票100元。',next:'sep7_stage2'},
  {text:'不办理鹏远通行卡',effects:{},result:'你决定不办理。后续公寓出入、日常用水需自行临时付费，但并无大碍。',next:'sep7_stage2'}
]},
sep7_stage2:{date:[2024,9,7],title:'宿舍电话卡选择',text:'完成公寓入住手续后，你独自行走在校园主干道上，一名热心的高年级志愿者学长主动上前，向你介绍校园专属宿舍电话卡套餐，该套餐为宿舍唯一官方网络来源。',choices:[
  {text:'购买宿舍鹏远电话卡（每月自动扣费49元）',effects:{},flags:{hasPhoneCard:true},result:'你购买了宿舍鹏远电话卡。每月自动扣除49元，宿舍全屋高速网络已解锁。',next:'sep7_stage3'},
  {text:'拒绝购买电话卡',effects:{},result:'你婉拒了学长的推荐。宿舍暂无网络，但每月省下了这笔固定开销。',next:'sep7_stage3'}
]},
sep7_stage3:{date:[2024,9,7],title:'宿舍入住 · 三位室友',text:'办理完所有入住相关事宜，你正式入住鹏远公寓四人间宿舍。\n\n宿舍现阶段暂未安装空调，后续可通过校园事件、赚取荣耀值解锁空调安装权限。\n\n你正式认识了三位朝夕相处的室友：\n\n🛏️ 虎爷 —— 学习氛围极强。被动buff：你所有科目考试成绩永久提升10%\n\n🛏️ 奶扣 —— 作息不规律，熬夜习惯严重。被动debuff：每月月底自动扣除5点健康值\n\n🛏️ 京爷 —— 竞赛经验丰富。被动buff：你所有校园竞赛参与成功率永久提升10%\n\n这三位室友的被动buff/debuff将全程覆盖你的整个大学生涯。',choices:[],autoNext:'sep7_stage4'},
sep7_stage4:{date:[2024,9,7],title:'新生见面会 · 才艺展示',text:'当晚，学院助导统一组织全体新生前往教学楼开展新生见面会，流程依次为全员自我介绍、自愿才艺展示、班委竞选宣讲。\n\n自我介绍环节顺利结束后，主持人开启自愿才艺展示通道。台下同学们的目光纷纷投向舞台，你心中微动——要不要上去展示一下自己？',choices:[
  {text:'上台进行才艺展示',prob:true,probAttr:'charm',probDiv:200,probCap:0.9,sEffects:{charm:8},sText:'你在台上落落大方，才艺展示引来台下同学与助导的热烈掌声和欢呼！',fEffects:{charm:-5},fText:'表演中途出现了小失误，台下传来几声善意的笑声。你略显尴尬地鞠躬下台。',setFlagsOnAny:{talentPerformed:true},next:'sep7_stage5'},
  {text:'放弃才艺展示，安静在台下观看',effects:{},result:'你选择安静坐在台下，为上台表演的同学鼓掌喝彩。低调完成这一环节。',next:'sep7_stage5'}
]},
sep7_stage5:{date:[2024,9,7],title:'新生见面会 · 班委竞选',text:'才艺展示环节结束后，班级三大班委负责人（班长、团支书、学习委员）公开竞选环节正式开启。\n\n竞选结果完全取决于你的个人魅力与表达能力。你是否有足够的自信站上讲台？',choices:[
  {text:'报名参与班委负责人竞选',cond:true,condAttr:'charm',condTh:120,sEffects:{glory:10},sText:'凭借出色的表达能力与个人气质，你在竞选中脱颖而出，成功当选班委负责人！荣耀值+10。',sFlags:{wonElection:true},fEffects:{charm:-6},fText:'尽管你努力表达了自己的想法，但人气不足，最终遗憾落选。自信心小幅受挫。',next:'sep7_stage6'},
  {text:'放弃竞选班委负责人',effects:{},result:'你决定不参与竞选，专注于自身的大学生活。',next:'sep7_stage6'}
]},
sep7_stage6:{date:[2024,9,7],title:'晚间宿舍活动',text:'新生见面会正式结束，夜幕降临，你回到四人间宿舍。\n\n今晚没有晚自习，你可以自由安排睡前时间。三位室友各自在做自己的事情。',choices:[
  {text:'和三位室友一起出门散步、休闲游玩',effects:{charm:6,happiness:10},result:'你和室友们一起在校园里散步，吹着晚风聊着各自的高中趣事和对大学的憧憬。',next:'sep7_end'},
  {text:'留在宿舍独自自习学习',effects:{wisdom:12},result:'你翻开从家里带来的专业入门书籍，沉浸在知识的海洋中。',next:'sep7_end'}
]},
sep7_end:{date:[2024,9,7],title:'入学第一天 · 完结',text:'忙碌而充实的入学第一天画上了句号。\n\n你躺在床上，回顾今天的种种经历——报到、办卡、认识室友、新生见面会……每一件事都历历在目。\n\n这是你大学生涯的起点。从明天开始，你将正式开启在东秦大学的每一天。\n\n晚安，东秦。',choices:[],enterDaily:true}
};

function renderStoryNode(node){
  if(node.date){GS.year=node.date[0];GS.month=node.date[1];GS.day=node.date[2];}
  updatePanel();
  $('main-area').innerHTML='<div id="story-title">'+node.title+'</div><div id="story-text">'+node.text.replace(/\n/g,'<br>')+'</div>';
  $('choices-area').innerHTML='';
  if(node.choices.length===0){
    var btn=document.createElement('button');btn.className='primary';btn.textContent='继续';
    btn.onclick=function(){
      if(node.dateJump){GS.year=node.dateJump[0];GS.month=node.dateJump[1];GS.day=node.dateJump[2];}
      if(node.enterDaily){enterScriptedDays();return;}
      if(node.autoNext){renderStoryNode(STORY_NODES[node.autoNext]);saveGame();}
    };
    $('choices-area').appendChild(btn);
  }else{
    node.choices.forEach(function(c,i){
      var btn=document.createElement('button');btn.textContent=c.text;
      btn.onclick=function(){processSep7Choice(node,i);};
      $('choices-area').appendChild(btn);
    });
  }
}

function processSep7Choice(node,ci){
  var c=node.choices[ci],eff={},rt='',hiddenInfo=null;
  if(c.prob){
    var pv=GS[c.probAttr]||100;
    var prob=Math.min(c.probCap||0.9,(pv+(c.probBase||0))/(c.probDiv||200));
    if(Math.random()<prob){eff=Object.assign({},c.sEffects||{});rt=c.sText;GS.talentSuccess=true;}
    else{eff=Object.assign({},c.fEffects||{});rt=c.fText;GS.talentSuccess=false;}
    if(c.setFlagsOnAny)Object.assign(GS,c.setFlagsOnAny);
  }else if(c.cond){
    if((GS[c.condAttr]||0)>=c.condTh){eff=Object.assign({},c.sEffects||{});rt=c.sText;if(c.sFlags)Object.assign(GS,c.sFlags);}
    else{eff=Object.assign({},c.fEffects||{});rt=c.fText;}
  }else{eff=Object.assign({},c.effects||{});rt=c.result||'';}
  if(c.flags)Object.assign(GS,c.flags);
  var changes=doEffects(eff);
  showPopup(node.title,rt,changes,hiddenInfo,function(){
    updatePanel();
    if(c.next&&STORY_NODES[c.next]){renderStoryNode(STORY_NODES[c.next]);saveGame();}
    else if(node.choices[0].next&&STORY_NODES[node.choices[0].next]){renderStoryNode(STORY_NODES[node.choices[0].next]);saveGame();}
  });
}

// ==================== 随机事件池 ====================
var RP={
sep8:[
  function(){var cmId=pickRandomClassmate();var nm=cmId?CLASSMATES[cmId].name:'一位同班同学';return{title:'偶遇同班同学搭话',text:'你在回宿舍的路上偶遇了'+nm+'，对方热情地向你打招呼，想和你聊聊天。',choices:[
    {text:'热情闲聊',effects:{charm:7,happiness:4,health:-3},cmFav:4,_cmId:cmId,result:'你们聊得很投机，从家乡聊到高考，又聊到对大学生活的憧憬。虽然聊得口干舌燥，但彼此的距离拉近了许多。'},
    {text:'礼貌拒绝',effects:{happiness:6,charm:-3},cmFav:-3,_cmId:cmId,result:'你有礼貌地表示自己还有事，'+nm+'也表示理解。虽然避免了社交消耗，但错过了拉近关系的机会。'}
  ]};},
  {title:'校园二手书摆摊',text:'路过校园主干道时，你看到有大四学长学姐在摆摊卖二手教材和参考书。',choices:[
    {text:'买书',effects:{money:-40,wisdom:10},result:'你挑选了几本专业相关的二手参考书，学长还附送了一些课堂笔记。'},
    {text:'不买',effects:{},result:'你看了看就离开了。虽然省了钱，但错过了性价比极高的学习资料。'}
  ]},
  {title:'操场夜跑邀约',text:'傍晚时分，室友虎爷换上了运动装备，问你要不要一起去操场夜跑。',choices:[
    {text:'答应跑步',effects:{health:9,happiness:3,wisdom:-2},cmFav:{huye:5},result:'你和虎爷在操场跑了几圈，出了一身汗，整个人都精神了。'},
    {text:'拒绝邀约',effects:{},result:'你婉拒了虎爷，选择留在宿舍。'}
  ]},
  {title:'班委经验分享会旁听',text:'路过教学楼时，你看到一间教室里有高年级优秀班委在分享学生工作经验，门口写着"欢迎旁听"。',choices:[
    {text:'驻足倾听',effects:{wisdom:6,glory:2,happiness:-3},result:'你悄悄走进教室后排坐下，听了几位优秀学长学姐的分享。'},
    {text:'直接离开',effects:{},result:'你对班委工作兴趣不大，径直走过了教室。'}
  ]}
],
sep9:[
  {title:'食堂三餐选择',text:'到了饭点，你来到食堂。今天有健康轻食窗口和人气炸鸡窗口。',choices:[
    {text:'健康餐',effects:{health:8,happiness:-4},result:'你选择了清淡健康的蒸菜套餐，营养均衡。'},
    {text:'高热量餐',effects:{happiness:9,health:-5},result:'你选了炸鸡套餐配可乐，外酥里嫩，吃得非常满足！'}
  ]},
  {title:'图书馆自习',text:'下午有空闲时间，你决定去图书馆自习。',choices:[
    {text:'坚持自习',effects:{wisdom:12,health:-4},result:'你专注地学了整整一个下午，完成了不少预习任务。'},
    {text:'提前离场',effects:{happiness:6,wisdom:-5},result:'学了一个多小时后你觉得有些坐不住，收拾东西提前离开了。'}
  ]},
  {title:'校园短时志愿者招募',text:'校园公告栏前围了不少人，原来是学校在招募下午活动的临时志愿者。',choices:[
    {text:'报名志愿',effects:{glory:6,charm:4,happiness:-5},result:'你报名参加了志愿者服务，帮忙引导来访人员。获得了服务证书。'},
    {text:'拒绝志愿',effects:{},result:'你看了看招募通知，默默走开了。'}
  ]},
  {title:'宿舍小游戏邀请',text:'回到宿舍，奶扣正在招呼大家一起来玩一局桌游。',choices:[
    {text:'一起玩游戏',effects:{happiness:8,charm:3,wisdom:-4},cmFav:{naikou:5,huye:3,jingye:3},result:'你们四个人玩得不亦乐乎，笑声引来了隔壁宿舍的同学围观。'},
    {text:'拒绝游戏',effects:{},result:'你表示想自己看会儿书，奶扣没再劝你。'}
  ]}
],
sep10:[
  function(){var cmId=pickRandomClassmate();var nm=cmId?CLASSMATES[cmId].name:'一位同班同学';return{title:'同学请教学习难题',text:'课间休息时，'+nm+'拿着课本走过来，说有一道题不太明白。',choices:[
    {text:'耐心解答',effects:{wisdom:5,charm:4,health:-3},cmFav:4,_cmId:cmId,result:'你耐心地给'+nm+'讲解了两遍。教学相长，你自己对这道题的理解也更深刻了。'},
    {text:'委婉推脱',effects:{},cmFav:-3,_cmId:cmId,result:'你委婉地表示自己也还在消化，建议'+nm+'去问老师。'}
  ]};},
  {title:'小卖部零食促销',text:'路过宿舍楼下小卖部，看到门口贴着"新学期特惠"的海报。',choices:[
    {text:'购买零食',effects:{money:-35,happiness:7},result:'你买了一大袋零食和饮料，拎回宿舍和室友们分享。'},
    {text:'拒绝消费',effects:{},result:'你克制住了购物的冲动，默默走过了小卖部。'}
  ]},
  {title:'傍晚操场散步邀约',text:'京爷发消息问你要不要一起去操场散散步。',choices:[
    {text:'结伴散步',effects:{health:6,happiness:5,wisdom:-3},result:'你和京爷一边绕操场散步一边听他聊竞赛的趣事。'},
    {text:'独自散步',effects:{health:5},result:'你表示想一个人走走。独自在操场上吹着晚风也是一种享受。'}
  ]},
  {title:'查看校园公告栏',text:'路过校园公告栏时，你注意到上面贴满了各种通知。',choices:[
    {text:'仔细浏览',effects:{glory:3,wisdom:4,health:-2},result:'你从头到尾仔细看了一遍，记下了几个感兴趣的活动时间。'},
    {text:'直接路过',effects:{},result:'你匆匆瞥了一眼就继续赶路了。'}
  ]}
],
sep12:[
  {title:'咨询科创竞赛问题',text:'参观完双创基地后，你注意到韩鹏老师在旁边回答学生的问题。',choices:[
    {text:'主动咨询',effects:{wisdom:8,glory:3,happiness:-4},result:'你主动上前向韩鹏老师请教科创竞赛问题。韩鹏老师很耐心地解答。'},
    {text:'旁观路过',effects:{},result:'你在旁边听了一会儿别人的提问，便默默离开了。'}
  ]},
  {title:'和新生交流参观心得',text:'参观结束后，一群新生聚在一起讨论刚才看到的科创项目。',choices:[
    {text:'积极交流',effects:{charm:6,happiness:4},result:'你加入了讨论，分享了自己的想法。大家聊得很投机，还互加了微信。'},
    {text:'沉默倾听',effects:{charm:-2},result:'你默默站在旁边听了一会儿，没有发言。你感觉自己有些不合群。'}
  ]},
  {title:'参观后疲惫小憩',text:'走了一上午，你感到有些疲惫。回宿舍的路上经过学校的小花园。',choices:[
    {text:'原地休息',effects:{health:7,wisdom:-4},result:'你在长椅上坐下，闭目养神了半小时。温暖的阳光和微风让你恢复了不少精力。'},
    {text:'直接返校',effects:{},result:'你忍着疲惫直接走回了宿舍。'}
  ]},
  {title:'拍摄科创作品发朋友圈',text:'在双创基地里看到了几个非常酷的学生科创作品。',choices:[
    {text:'拍照分享',effects:{happiness:5},result:'你拍了几张照片发到朋友圈，很快收到了不少点赞和评论。'},
    {text:'专心学习',effects:{wisdom:6},result:'你收起手机，认真阅读每个作品旁边的介绍说明。'}
  ]}
],
sep14:[
  {title:'提前打探社团招新',text:'参观完一站式服务中心后，你注意到走廊里已经贴出了各社团的招新海报。',choices:[
    {text:'逐一咨询',effects:{charm:7,wisdom:3,health:-3},result:'你一个摊位一个摊位地咨询，拿了一大把宣传单，收获满满。'},
    {text:'简单观望',effects:{},result:'你粗略扫了一遍海报，心里大概有了数。'}
  ]},
  {title:'服务中心引导新生',text:'在一站式服务中心里，你看到有几位新生找不到方向。',choices:[
    {text:'主动帮忙',effects:{glory:5,charm:4,happiness:-3},result:'你主动上前帮忙指引，几位新生连声道谢。'},
    {text:'自顾办事',effects:{},result:'你办好自己的事情后就离开了。'}
  ]},
  {title:'购买社团相关书籍',text:'路过校园书店，橱窗里摆着一些社团推荐的入门书籍。',choices:[
    {text:'买书',effects:{money:-45,wisdom:9},result:'你挑了一本自己感兴趣方向的书。提前了解相关知识。'},
    {text:'不购买',effects:{},result:'你觉得等正式加入社团后再根据需要购买也不迟。'}
  ]},
  {title:'观察校园办事流程',text:'在一站式服务中心大厅里，你注意到每个窗口办理的业务类型都不一样。',choices:[
    {text:'认真观察',effects:{wisdom:6,glory:2},result:'你仔细记下了各个窗口的功能和办理时间。以后办事就知道该去哪了。'},
    {text:'直接离开',effects:{happiness:4,wisdom:-2},result:'你觉得以后需要的时候再来问就行。'}
  ]}
]
};

// ===== 10.10 午间随机事件池 =====
RP.oct13_midday=[
  {title:'阳光午后小憩',text:'午后的阳光透过窗户洒进宿舍，暖洋洋的光线让人昏昏欲睡。你躺在床上闭目养神，醒来后感觉浑身充满了电。',choices:[
    {text:'享受这片刻的宁静',effects:{health:5},result:'短短的小憩过后，你感觉精力充沛，整个人焕然一新。'}
  ]},
  {title:'食堂偶遇隐藏美食',text:'午饭时间你来到食堂，发现今天窗口推出了新品——一道你从未尝试过的特色菜。窗口前排着不短的队伍，但香味飘过来让你迈不动步子。',choices:[
    {text:'排队点一份尝尝鲜',effects:{happiness:5},result:'你耐心排了几分钟的队，终于端到了这份传说中的新菜品。一口下去——简直是惊喜！小小的美食发现给周日带来了大大的满足感。'}
  ]},
  {title:'图书馆翻阅杂志偶得启发',text:'你路过图书馆的报刊阅览区，随手翻开了一本学术期刊。一篇关于学习方法的文章引起了你的注意，里面的几个观点让你豁然开朗。',choices:[
    {text:'坐下来认真读完这篇文章',effects:{wisdom:5},result:'你花了几分钟认真读完了这篇短文。作者提出的学习方法让你对近期一直困惑的知识点有了新的理解思路。'}
  ]},
  function(){var cmId=pickRandomClassmate();var nm=cmId?CLASSMATES[cmId].name:'一位同学';return{title:'校园散步偶遇同学称赞',text:'午后你在校园里散步，迎面碰见'+nm+'和几个同班同学。'+nm+'笑着对你说："诶，你今天看起来气色特别好——是不是昨天合唱夺冠太高兴了？"',choices:[
    {text:'笑着聊了几句，心情愉悦地继续散步',effects:{charm:5},cmFav:3,_cmId:cmId,result:'你和'+nm+'站在路边聊了一会儿。被真诚地夸赞让整个人都更加自信了，走在路上步伐都轻快了几分。'}
  ]};},
];

RP.oct10=[
  {title:'社团宣传偶遇',text:'午休路过食堂门口，几个社团摊位前围满了人。音乐社的同学正在现场弹唱，吸引了不少人驻足围观。',choices:[
    {text:'停下来听一会儿，顺便了解社团信息',effects:{charm:4,happiness:3},result:'你挤进人群找了个好位置，听了一首完整的弹唱。旁边的社团成员热情地向你介绍了活动安排，你拿了张宣传单。'},
    {text:'匆匆路过，赶回宿舍休息',effects:{health:3},result:'你加快脚步穿过人群。虽然错过了一场不错的表演，但换来了一段宝贵的午休时间。'}
  ]},
  {title:'室友分享家乡特产',text:'回到宿舍，室友虎爷正在拆一个快递箱——他家里寄来了一大箱家乡特产零食。他热情地招呼你一起尝尝。',choices:[
    {text:'坐下一起品尝，和室友闲聊',effects:{happiness:5,charm:2},result:'你接过虎爷递来的特产零食，边吃边聊各自家乡的美食文化。特产味道确实不错，宿舍气氛其乐融融。'},
    {text:'客气地尝一口就回自己座位',effects:{happiness:2},result:'你礼貌性地尝了一小块，道了声谢就回到了自己的座位。虎爷没在意，继续和其他室友分享。'}
  ]},
  {title:'校园小路偶遇任课老师',text:'走在去食堂的路上，迎面碰见了Tania老师。她提着一袋书，笑着和你打招呼："Hello! How\'s your day going?"',choices:[
    {text:'停下来用英语和她聊几句',effects:{charm:3,wisdom:2},result:'你和Tania老师站在路边用英语聊了几分钟。她夸你口语有进步，还推荐了一本适合你水平的英文读物。意外的口语练习机会！'},
    {text:'微笑点头，简单问候后继续赶路',effects:{happiness:1},result:'你微笑着说了一句"Fine, thank you!"就继续走了。Tania老师也笑着挥了挥手。简单但温暖的短暂交流。'}
  ]},
  {title:'校园流浪猫拦路撒娇',text:'路过校园小花园时，一只橘色的校园流浪猫从灌木丛里钻了出来，挡在你面前就地一躺，露出肚皮喵喵叫。',choices:[
    {text:'蹲下来撸猫，陪它玩一会儿',effects:{happiness:6},result:'你蹲下来轻轻挠了挠橘猫的下巴。它舒服地眯起眼睛，发出咕噜咕噜的声音。周围路过的同学看到这一幕都忍不住笑了。'},
    {text:'绕开它继续走，不想耽误时间',effects:{},result:'你小心翼翼地绕过了拦路的橘猫。它翻了个身，用失望的眼神看了你一眼，然后继续躺平等待下一个路人。'}
  ]},
  {title:'自习室空调故障',text:'午休时段你来到自习室，发现空调出了故障，室内有些闷热。几个同学正商量着要不要换个地方。',choices:[
    {text:'留下来坚持自习，心静自然凉',effects:{wisdom:5,health:-2},result:'你找了个靠窗的位置坐下，打开窗户通风。虽然有些闷热，但专注学习后慢慢就忘了环境的不适。一个中午下来完成了不少复习任务。'},
    {text:'果断放弃，回宿舍吹风扇休息',effects:{health:3},result:'你觉得没必要受这个罪，收拾东西回了宿舍。风扇呼呼地吹着，比闷热的自习室舒服多了。'}
  ]}
];

// ===== 合唱模板 =====
var CHORUS={
  title:'晚间统一合唱活动',tag:'晚间固定',type:'evening',
  text:'每日晚间开展班级合唱排练，为闭幕式汇演做准备。你如何选择？',
  choices:[
    {text:'准时参加合唱排练',effects:{happiness:-5,singing:8},result:'你准时到达排练场地，认真跟随指挥练习每一段旋律。虽然辛苦，但歌唱水平在稳步提升。'},
    {text:'请假回宿舍打游戏',effects:{happiness:7},result:'你跟助导请了假，回到宿舍打开游戏。难得的放松时光让你心情大好。'},
    {text:'请假回宿舍自主学习',effects:{wisdom:8},result:'你跟助导请了假，回到宿舍翻开课本。利用这段时间默默提升自己的学业水平。'}
  ]
};

// ===== 晚间宿舍模板 =====
var EVENING_DORM={
  title:'晚间宿舍活动',tag:'晚间固定',type:'evening',
  text:'夜幕降临，你回到宿舍。三位室友各自忙着自己的事情——虎爷在看书，奶扣在打游戏，京爷在研究资料。',
  choices:[
    {text:'和室友游玩',effects:{charm:5,happiness:8},cmFav:{huye:3,jingye:3,naikou:3},result:'你和室友们一起度过了愉快的晚间时光，宿舍氛围更加融洽。'},
    {text:'独自学习',effects:{wisdom:9},result:'你翻开书本，沉浸在知识的海洋中。利用晚间时间提升自己，感觉很充实。'}
  ]
};

// ==================== 帮助函数 ====================
function makeAutoPhase(title,text,effects,flags){
  var p={type:'auto',tag:'军训基础',title:title,text:text,effects:effects||{}};
  if(flags)p.setFlags=flags;
  return p;
}
function makeMainPhase(tag,title,text,choices){
  return {type:'main',tag:tag,title:title,text:text,choices:choices};
}
function makeEveningPhase(){
  return {type:'evening',tag:'晚间固定',title:CHORUS.title,text:CHORUS.text,choices:CHORUS.choices};
}
function makeDormEvening(){
  return {type:'evening',tag:'晚间固定活动',title:EVENING_DORM.title,text:EVENING_DORM.text,choices:EVENING_DORM.choices};
}
function makeGfEvent(title,text,choice1text,choice1eff,choice1gf,choice1result,choice2text,choice2eff,choice2result){
  return {
    title:title,text:text,
    choices:[
      {text:choice1text,effects:choice1eff||{},gfEffects:choice1gf||{},result:choice1result},
      {text:choice2text,effects:choice2eff||{},result:choice2result}
    ]
  };
}

// §3.5 ==================== 故事日 9.8-9.29 军训 ====================
var STORY_DAYS={};

// 9.8
STORY_DAYS['2024-09-08']={title:'入学第二天',phases:[
  makeMainPhase('日间主线','新生知识讲座','今天是入学第二天，学院为全体新生组织了一场新生知识讲座，内容涵盖校规校纪、学分制度和校园资源使用指南。\n\n讲座在学术报告厅举行，助导在班级群里发了通知，要求全体新生参加。',[
    {text:'A. 参加讲座',effects:{wisdom:8},result:'你按时到达报告厅，认真听完了整场讲座。讲座内容很实用，你对学校的各项制度有了清晰的认识。'},
    {text:'B. 逃离讲座',effects:{happiness:7,health:5},risk:{chance:0.6,effects:{glory:-4},desc:'被辅导员点名发现，荣耀-4'},result:'你悄悄溜出了报告厅，在校园里自由自在地逛了一下午。不过辅导员在点名时发现有人缺席……'}
  ]),
  {type:'random',tag:'随机事件',pool:'sep8'},
  makeDormEvening()
]};
// 9.9
STORY_DAYS['2024-09-09']={title:'全天自由活动日',phases:[{type:'random',tag:'随机事件',pool:'sep9'}],noEvening:true};
// 9.10
STORY_DAYS['2024-09-10']={title:'自由活动日+团校报名',phases:[
  {type:'random',tag:'随机事件',pool:'sep10'},
  makeMainPhase('当日主线','团校报名选择','班级群里发来通知：东秦大学团校新一期学员开始报名。团校是培养优秀学生骨干的重要平台。\n\n报名截止时间为今晚12点，录取结果将于明天统一公示。',[
    {text:'是：报名团校',effects:{},flags:{tuanxiaoApplied:true},result:'你郑重地填写了团校报名表并提交。'},
    {text:'否：放弃报名',effects:{},result:'你决定不报名团校。'}
  ])
]};
// 9.11
STORY_DAYS['2024-09-11']={title:'清晨体检+团校结果+开学第一课',phases:[
  makeAutoPhase('固定剧情','清晨集体体检','凌晨5点，天还没亮，全体新生在鹏远公寓假山前集合，统一乘车前往南校区进行入学体检。\n\n虽然起得太早让人有些烦躁，但体检过程很顺利，各项指标正常。',{happiness:-5,health:5}),
  {type:'conditional',tag:'概率判定',title:'团校报名结果公示',condFlag:'tuanxiaoApplied',
   text_applied:'团校录取结果在公告栏和班级群同步公示。你紧张地滑动手机屏幕寻找自己的名字……',
   text_not:'团校录取结果在公告栏公示了。你因为没有报名，对此并不关心。',
   prob:0.2,sText:'恭喜！你在众多报名者中脱颖而出，被团校正式录取！\n\n通知中注明：团校学员需在十月的连续4个教学周末参加集训，完成全部集训后悟性将获得大幅提升（+100）。\n\n⚠️ 注意：集训期间周末随机事件全部关闭。',
   sEffects:{},sHidden:'⚠️ 10月起连续4个周末禁闭 · 完成后悟性+100',sFlags:{tuanxiaoAccepted:true,tuanxiaoWeekBan:4,tuanxiaoWisdomPending:true},
   fText:'很遗憾，你在团校录取中落选了。\n\n不过这也意味着你的周末时间完全自由。',fEffects:{}},
  makeMainPhase('主线剧情','史鉴明老师开学第一课','上午10点，史鉴明老师走进教室，为新生带来开学第一课。\n\n史老师讲课深入浅出，将枯燥的理论讲得生动有趣。课后，史老师拿出三样小礼品——U盘、水杯、钢笔，告诉同学们可以任选其一作为开学纪念。',[
    {text:'A. U盘',effects:{wisdom:5},result:'你选择了U盘。史老师笑着说："存知识，也存回忆。"'},
    {text:'B. 水杯',effects:{health:5},result:'你选择了水杯。史老师点点头："多喝水，保持健康。"'},
    {text:'C. 钢笔',effects:{happiness:5},result:'你选择了钢笔。握着这支钢笔，你感到一种莫名的仪式感和满足。'}
  ])
]};
// 9.12
STORY_DAYS['2024-09-12']={title:'参观双创基地+下午自由活动',phases:[
  makeMainPhase('主线剧情','参观大学生创新创业基地','学院组织全体新生参观东秦大学大学生创新创业基地。\n\n基地里陈列着历年学生的科创获奖作品——智能机器人、环保新材料、互联网+获奖项目……令人目不暇接。\n\n参观结束后，工作人员展示了一个微信群二维码："这是大创交流群，感兴趣的同学可以加一下，韩鹏老师也在群里。"',[
    {text:'添加大创群聊',effects:{wisdom:-20},hidden:{desc:'解锁科创系统，韩鹏老师好感度+10，教师好感度面板中韩鹏已解锁',flags:{dachuangJoined:true,keChuangUnlocked:true,hanpengUnlocked:true},effects:{hanpengHaoGan:10}},result:'你扫码加入了群聊。群里消息瞬间99+，各种竞赛通知、项目招募铺天盖地。'},
    {text:'不添加群聊',effects:{},result:'你决定暂时不加群。科创竞赛的事以后再说。'}
  ]),
  {type:'random',tag:'下午随机事件',pool:'sep12'}
]};
// 9.13
STORY_DAYS['2024-09-13']={title:'洗脑讲座+四六级报名+晚间活动',phases:[
  makeMainPhase('日间主线','校方教育讲座','学校组织了一场关于大学生理想信念教育的讲座，全体新生必须参加。',[
    {text:'A. 参加讲座',effects:{wisdom:8},result:'你认真听完了整场讲座。确实让你对大学的意义有了更多思考。'},
    {text:'B. 逃离讲座',effects:{happiness:7,health:5},risk:{chance:0.6,effects:{glory:-4},desc:'被巡查老师发现，荣耀-4'},result:'你趁人多悄悄溜了出去。自由的感觉真好，但你注意到有位老师在远处看了你一眼……'}
  ]),
  makeMainPhase('日间主线','英语四六级考试报名','班级群里发来通知：2024年下半年全国大学生英语四六级考试开始报名。报名费30元。',[
    {text:'报名（金钱-30）',effects:{money:-30},flags:{cet4Applied:true},result:'你缴纳了30元报名费，成功报名了英语四级考试。'},
    {text:'不报名',effects:{},result:'你决定这次先不报名。可以等下次再考。'}
  ]),
  makeDormEvening()
]};
// 9.14
STORY_DAYS['2024-09-14']={title:'参观一站式服务中心+社团解锁+宿舍改造',phases:[
  makeAutoPhase('主线剧情','参观一站式服务社区','学院组织全体新生参观学校一站式学生服务中心。推开玻璃大门，宽敞明亮的大厅映入眼帘——左手边是教务窗口，几个学长正在咨询选课问题；右手边是学工窗口，辅导员们在新生资料前忙碌；正前方是后勤服务区，校园卡充值、宿舍报修、水电缴费一字排开。\n\n你随队伍缓步走过一个个窗口，耳边是此起彼伏的叫号声和键盘敲击声。空气中飘着淡淡的咖啡香——大厅角落里有一台自助咖啡机，几个高年级学生正端着纸杯低声交谈。\n\n走到宣传区时，你的目光被一面巨大的社团海报墙吸引住了。色彩斑斓的海报几乎铺满了整面墙——体育社团的运动掠影、学院组织的活动剪影、图书管理员的静谧阅览室、文艺部的舞台聚光灯……每一张海报都讲述着不同的青春故事。\n\n你驻足良久，心中开始勾勒属于自己的大学生活蓝图。\n\n🎭 社团系统已永久解锁！\n📅 社团报名截止日期：2024年9月25日\n📋 可选社团：体育社团、学院组织、图书管理员、文艺部',{},{sheTuanUnlocked:true}),
  {type:'random',tag:'下午随机事件',pool:'sep14'},
  makeMainPhase('宿舍改造','宿舍改造·购买书桌','回到宿舍后，你发现宿舍里只有公共的桌子。学长在群里发了一个链接：有毕业生在出售二手电脑桌，九成新，只要90元。',[
    {text:'购买书桌（金钱-90）',effects:{money:-90},flags:{deskBought:true},hidden:{desc:'解锁电脑永久使用权限'},result:'你花了90元买下了这张书桌。从此在宿舍也有了属于自己的学习空间。'},
    {text:'不购买书桌',effects:{},result:'你决定暂时不买。公共桌子虽然不太方便，但也能凑合用。'}
  ])
]};

// ===== 9.15 军训第一天(中秋) =====
STORY_DAYS['2024-09-15']={title:'军训第一天·中秋节',phases:[
  makeAutoPhase('军训基础','军训第一天','清晨6:30，刺耳的起床哨划破了宿舍楼的宁静。你揉着惺忪的睡眼套上迷彩服，和室友们一起朝着东操场小跑而去。操场上已经集合了数百名新生，黑压压一片迷彩绿在晨光中晃动。\n\n教官身材挺拔、面容严肃，一口洪亮的东北口音让口令格外有穿透力。"全体都有——立正！"你下意识地挺直了腰板。\n\n今天恰逢中秋佳节，太阳依旧毒辣，汗水沿着额头滑落，浸湿了衣领。但教官在中场休息时难得地露出笑容，说了一句"中秋节快乐"，让整个连队的气氛一下子柔软了许多。你抬头看了看蓝天白云，心想——中秋在军训中度过，也许别有一番味道。\n\n（健康+12，幸福-10）',{health:12,happiness:-10}),
  makeMainPhase('请假选项','请假选择','你是否花费荣耀找李心瑶老师请假躲避今日军训？',[
    {text:'是：荣耀-15，幸福+12（不获得军训健康加成）',effects:{glory:-15,happiness:12,health:-12},result:'李心瑶老师批准了你的请假。你躲在宿舍里享受了一天的清闲，虽然避开了烈日，但也错过了和同学们一起过中秋的机会。'},
    {text:'否：正常参与全天军训',effects:{},result:'你决定不请假，和同学们一起完成军训。虽然辛苦，但这是大学生活的一部分。'}
  ]),
  makeMainPhase('下午剧情','中秋晚会合唱负责人选举','中秋当日下午无军训，班级QQ群开启中秋晚会合唱负责人公开选举，你是否报名参选？\n\n（判定标准：魅力+荣耀总值）',[
    {text:'是：报名参选',cond:true,condAttr:'charmPlusGlory',condTh:180,sEffects:{glory:12},sText:'凭借出色的魅力和荣耀积累，你成功当选中秋晚会合唱负责人！荣耀值+12。',fEffects:{charm:-6},fText:'你的魅力和荣耀总值不足，竞选失败。自信心小幅受挫，魅力-6。'},
    {text:'否：不报名参选',effects:{},result:'你选择不参选，安静地做一个参与者也不错。'}
  ]),
  makeMainPhase('晚间活动','中秋月圆之夜','忙碌一天结束，恰逢中秋月圆之夜，你今晚打算如何度过？',[
    {text:'和室友一起前往海边散步赏月、外出聚餐',effects:{happiness:10,health:6,money:-65},cmFav:{huye:4,jingye:4,naikou:4},result:'你们一行四人去了学校附近的海边，吹着海风吃着月饼，看着圆月倒映在海面上。这是你在大学度过的第一个中秋，虽然远离家乡，但有朋友相伴，心里暖暖的。'},
    {text:'留在宿舍躺平打游戏放松',effects:{happiness:9},result:'你躺在宿舍床上打了一晚上游戏，放松了紧绷了一天的神经。简单的快乐，未尝不可。'},
    {text:'留在宿舍安静自习学习',effects:{wisdom:10},result:'你翻开课本，趁着中秋夜的安静氛围认真学习。月亮透过窗户洒在书页上，学习效率意外地高。'}
  ])
]};

// ===== 通用军训日生成函数 =====
function makeTrainingDay(key,title,autoTitle,autoText,evt1title,evt1text,evt1choices,evt2title,evt2text,evt2choices,gfEvt){
  var phases=[
    makeAutoPhase('军训基础',autoTitle,autoText,{health:10,happiness:-8}),
    makeMainPhase('随机事件①',evt1title,evt1text,evt1choices),
    makeMainPhase('随机事件②',evt2title,evt2text,evt2choices),
    makeEveningPhase()
  ];
  var day={title:title,phases:phases};
  if(gfEvt)day.gfEvent=gfEvt;
  STORY_DAYS[key]=day;
}

// 9.16
makeTrainingDay('2024-09-16','军训第二天','日间固定军训','第二天的起床哨响起时，你发现自己比昨天快了半分钟——身体已经开始适应这个节奏了。晨光中，操场上回荡着整齐的脚步声和各连此起彼伏的口号。\n\n教官今天主训队列基础：立正、稍息、跨立、停止间转法。每一个看似简单的动作都要重复无数遍，直到肌肉形成记忆。汗水顺着脊背流下，迷彩服的后背已经湿透了一大片。\n\n（健康+10，幸福-8）',
  '烈日补水','正午烈日高悬，长时间站军姿让你口干舌燥、浑身燥热，你可以举手向教官申请短暂休息补水。',[
    {text:'举手申请休息补水',effects:{health:5,glory:-3},result:'你举手向教官申请休息。教官看了你一眼，点头同意了。虽然补充了水分，但在全排面前显得不够坚韧。'},
    {text:'咬牙坚持全程训练不休息',effects:{wisdom:4,glory:2,health:-2},result:'你咬紧牙关，全程没有申请休息。教官注意到你的坚持，在总结时点名表扬了你。'}
  ],
  '拉歌对抗赛','军训休息间隙，连队之间开展拉歌对抗赛，全场氛围热烈，需要同学主动起身领唱带动氛围。',[
    {text:'主动起身领唱带动班级氛围',effects:{singing:5,charm:6,happiness:-3},result:'你鼓起勇气站了起来，用嘹亮的歌声带领全班一起唱。虽然有些紧张，但全场气氛被推向了高潮！'},
    {text:'跟随集体一起合唱，不主动出头',effects:{singing:2},result:'你跟着大家的节奏一起唱，虽然不出彩，但也不出错。轻松无压力。'}
  ]
);

// 9.17
makeTrainingDay('2024-09-17','军训第三天','日间固定军训','第三天清晨，你发现自己已经不需要闹钟了——生物钟自动调到了军训模式。走出宿舍楼，清晨的凉风拂过脸颊，是九月里难得的舒适时刻。\n\n今天的训练重点是齐步走的步伐统一。教官吹着哨子，一排一排地纠正摆臂高度和步幅大小。"前后对正，左右标齐！"你在队列中努力调整着自己的节奏，试图和身边的同学踩在同一个拍子上。\n\n（健康+10，幸福-8）',
  '方阵标兵竞选','教官开始挑选身姿挺拔、动作标准的同学担任方阵前排标兵，前排标兵会被全校师生看到，训练强度也会更大。',[
    {text:'主动报名竞选军训标兵',effects:{glory:7,charm:4,health:-4},result:'你主动迈出一步报名竞选。凭借标准的动作和挺拔的身姿，你成功入选前排标兵！虽然训练量加倍，但你将成为全校师生目光的焦点。'},
    {text:'安稳留在队伍后排，不参与竞选',effects:{},result:'你选择留在后排。虽然少了曝光机会，但训练压力也小了很多。'}
  ],
  '帮忙整理内务','室友内务能力较差，叠出来的军被始终达不到豆腐块标准，眼看内务检查临近，室友请求你帮忙整理被子。',[
    {text:'热心帮忙室友整理内务',effects:{charm:3,happiness:2,wisdom:-3},result:'你花了半小时帮室友把被子叠成了标准的豆腐块。室友连声道谢，但你自己少了一些休息时间。'},
    {text:'委婉拒绝，专注自己休息',effects:{},result:'你表示自己也需要休息，室友有些失望但表示理解。'}
  ]
);

// 9.18
makeTrainingDay('2024-09-18','军训第四天','日间固定军训','第四天的太阳像发了狠似的，才上午九点地面就已经滚烫。操场边缘的几棵小树投下的阴影成了全连最奢侈的休息区。\n\n你已经连续四天高强度训练，小腿隐隐发酸，脚底磨出了薄薄的茧子。身边的同学们脸上也都写满了疲惫——有人偷偷揉腰，有人在喝水间隙长出一口气。但没有人退缩。教官说这是"疲劳期"，撑过去就好了。\n\n（健康+10，幸福-8）',
  '身体不适','长时间保持立正姿势，你体力不支，出现头晕、眼前发黑的轻微不适症状。',[
    {text:'原地蹲下短暂休整恢复体力',effects:{health:6,glory:-2},result:'你果断蹲下休息了几分钟，喝了口水。身体症状很快缓解，但教官在训练记录上标注了"体能待加强"。'},
    {text:'强忍身体不适，坚持完成训练',effects:{glory:3,health:-3},result:'你咬紧牙关坚持到了最后。教官注意到你脸色发白却没有倒下，对你竖起了大拇指。不过身体确实透支了不少。'}
  ],
  '班级破冰游戏','休息期间班委组织班级破冰小游戏，帮助新生之间互相熟悉，拉近同学关系。',[
    {text:'积极参与集体小游戏',effects:{charm:5,happiness:4,wisdom:-2},result:'你全身心投入到游戏中，和同学们笑成一团。大家对你的印象分大大提升，不过欢乐的时光总是飞快。'},
    {text:'坐在一旁闭目休息，旁观即可',effects:{health:3},result:'你选择坐在一旁闭目养神。看着大家玩得开心也是一种享受，而且恢复了体力。'}
  ]
);

// 9.19
makeTrainingDay('2024-09-19','军训第五天','日间固定军训','第五天，正步走训练正式开始。教官把动作拆解成了四个步骤——抬腿、绷脚、定位、落地，每一步都要悬在空中保持三秒。"一！"你的右腿悬在半空，大腿肌肉微微颤抖；"二！"脚背绷直，汗珠从额头滚落。\n\n这是最考验核心力量的训练科目。练了一上午，你的腹肌和大腿都在抗议。但当全班整齐划一地踢出正步时，那"啪"的一声齐响，让你觉得一切都值了。\n\n（健康+10，幸福-8）',
  '宿舍内务大检查','学校开展宿舍突击内务大检查，严查床铺、地面、桌面卫生，不合格宿舍会被全院通报批评。',[
    {text:'认真打扫宿舍每一处卫生',effects:{glory:5,wisdom:2,happiness:-4},result:'你花了一个多小时把宿舍的每个角落都擦得干干净净。检查顺利通过，室友们对你感激不尽。'},
    {text:'简单打扫敷衍应付检查',effects:{},result:'你简单扫了扫地面，擦了擦桌面。好在检查老师没有太仔细，勉强过关。'}
  ],
  '助导巡查','本班助导来到操场巡查全体新生军训状态，观察每位同学的参训态度与精神面貌。',[
    {text:'身姿端正认真参训，主动上前问好',effects:{glory:4,charm:3},result:'你保持标准的军姿，在休息时主动向助导问好。助导对你印象深刻，在班级日志上写了你的名字。'},
    {text:'正常参训，不刻意上前打招呼',effects:{},result:'你按部就班地完成训练，不想刻意表现。助导巡查了一圈就离开了。'}
  ]
);

// 9.20
makeTrainingDay('2024-09-20','军训第六天','日间固定军训','军训第六天，为期两周的军训即将过半。你对着手机前置摄像头看了一眼自己——脸和脖子已经不是一个色号了，手臂上也晒出了一条清晰的袖口分界线。这大概是军训最真实的"勋章"。\n\n但变化远不止肤色。你的站姿比一周前挺拔了许多，走路时下意识地挺胸收腹，连室友都说你"看起来精神了"。教官在训练间隙难得夸了一句"有点样子了"，全排都嘿嘿笑了起来。\n\n（健康+10，幸福-8）',
  '军训感悟征文','班委面向全班征集军训感悟短文，优质稿件将会刊登在校官方公众号，获得公开表彰。',[
    {text:'认真撰写走心感悟并按时上交',effects:{wisdom:6,glory:4,happiness:-3},result:'你花了一个晚上认真写了一篇800字的军训感悟，字字真情。第二天得知你的文章被选中了！'},
    {text:'敷衍上交或者直接不参与征集',effects:{},result:'你随便写了两句话交上去，或者干脆没交。省下来的时间做了别的事。'}
  ],
  '借用防晒霜','同行同学忘记携带防晒霜，连日暴晒皮肤已经严重晒伤，开口向你借用防晒用品。',[
    {text:'大方出借自己的防晒用品',effects:{charm:4,happiness:3,health:-2},result:'你毫不犹豫地借出了自己的防晒霜。同学非常感激，但你自己的防晒霜用得更快了。'},
    {text:'借口自身用量不足，拒绝对方请求',effects:{},result:'你委婉表示自己的防晒霜也快用完了。对方有些失望地走开了。'}
  ]
);

// 9.21 - 关键节点：恋爱解锁
STORY_DAYS['2024-09-21']={title:'军训第七天·关键节点',phases:[
  makeAutoPhase('军训基础','日间固定军训','军训第七天，一周的汗水没有白流。你的站姿笔直如松，正步踢得干净利落，连最难熬的站军姿也变得轻松了许多。\n\n更重要的是——你发现自己的意志力变强了。以前觉得做不到的事情，现在咬咬牙就扛过去了。教官说这就是军训的意义所在：不是为了折磨你们，而是为了让你们知道自己比想象中更强大。\n\n不过今天的气氛有些微妙——你注意到班里有个女生似乎总在休息时偷偷看你。\n\n（健康+10，幸福-8）',{health:10,happiness:-8}),
  makeMainPhase('随机事件①','教官单独指导','教官发现你队列动作存在细微瑕疵，特意留下你一人，单独手把手纠正动作细节。',[
    {text:'认真听从指导，反复练习打磨动作',effects:{glory:5,wisdom:3,happiness:-4},result:'你虚心接受教官的指导，一遍又一遍地练习，直到动作完美。教官满意地点了点头，在训练手册上给你加了分。'},
    {text:'快速改正动作，想要尽快结束训练休息',effects:{glory:2},result:'你快速调整了动作，教官检查后放你离开了。虽然节省了时间，但动作的细节没有打磨到最好。'}
  ]),
  makeMainPhase('随机事件②','小型才艺表演','休息时段班级自发举办小型才艺表演，缓解连日军训的疲惫，活跃现场氛围。',[
    {text:'主动上台进行才艺展示',effects:{charm:9,singing:3,happiness:-2},result:'你大方地上台展示了自己的才艺。歌声/表演引来阵阵掌声和欢呼，不少同学拿出手机录像。你在班级里的人气直线上升！'},
    {text:'安静坐在台下，观看他人表演',effects:{},result:'你坐在台下欣赏同学们的表演。有人唱歌、有人说相声，现场笑声不断。做一个观众也很惬意。'}
  ]),
  {type:'conditional',tag:'强制判定',title:'恋爱系统解锁判定',condCustom:function(){return GS.charm>130&&!isGf('suxiaonuan');},
   text_applied:'经过多日军训相处，你的外在气质和言行举止被班里一位女生悄悄关注。\n\n休息时间，一名同班女生红着脸走向你，羞涩地想要添加你的QQ联系方式。\n\n她叫苏小暖，扎着马尾辫，笑起来有两个浅浅的酒窝。',
   text_not:'经过多日军训相处，你在班里默默无闻。今天没有特别的社交事件发生。',
   sText:'你微笑着掏出手机，扫了她的二维码。苏小暖开心地笑了，说"以后可以一起上自习呀"。\n\n💕 恋爱系统已解锁！\n👤 女友：苏小暖\n❤️ 初始好感度：80\n📌 主页新增好感面板，每日固定-1好感\n⚠️ 好感低于30将触发分手风险',
   sHidden:'💕 恋爱系统解锁：每月被动魅力+20',sFlags:{gfUnlocked:true,gfName:'苏小暖',gfFavor:80,gfId:'suxiaonuan'},
   fText:'你委婉表示现在想专心军训，暂时不方便加好友。苏小暖有些失落地离开了。',
   fEffects:{charm:-5}},
  makeEveningPhase()
]};

// 9.22
makeTrainingDay('2024-09-22','军训第八天','日间固定军训','进入军训第二周，你发现一切变得不一样了。早起已经不需要挣扎，穿上迷彩服的动作行云流水，集合时第一个到达操场的人里总有你。\n\n身体已经完全适应了训练强度——小腿不再酸痛，呼吸不再急促，站军姿半小时也能纹丝不动。你甚至开始享受这种规律而充实的生活：每一个动作都有标准，每一天都在进步。\n\n（健康+10，幸福-8）',
  '冰镇饮料','操场门口小卖部售卖冰镇饮料、冰水，能够快速缓解军训带来的燥热疲惫。',[
    {text:'花钱购买冰水降温解暑',effects:{money:-25,health:7,happiness:5},result:'你买了一瓶冰镇矿泉水，冰凉的水流入喉咙，浑身舒畅！训练的疲惫一扫而空。'},
    {text:'忍住燥热，不花钱购买饮品',effects:{},result:'你忍住了消费冲动。虽然又热又渴，但省下了一笔钱。'}
  ],
  '帮忙拍摄照片','班委需要同学帮忙拍摄班级军训日常照片，留存班级军训纪念素材。',[
    {text:'主动帮忙来回走动拍摄照片',effects:{charm:4,glory:3,health:-3},result:'你拿着手机在操场上来回跑动，从不同角度抓拍了同学们训练的身影。班委对你的热心表示感谢。'},
    {text:'留在原地休息，拒绝帮忙拍照',effects:{},result:'你表示自己需要休息。班委找了其他同学帮忙。'}
  ],
  makeGfEvent('苏小暖每日事件','苏小暖军训一天身心疲惫，想要你陪她聊天开导心情。',
    '耐心陪伴聊天安慰',{money:-18},{gfFavor:6},'你耐心地听她倾诉了一天的烦恼，温柔地开导她。苏小暖的心情明显好转，发了一个可爱的表情包给你。',
    '借口疲惫拒绝陪伴',{happiness:-7},'你自己也很累，便找借口推掉了。苏小暖回复了一个"好吧"，你感觉心里有些愧疚。')
);

// 9.23
makeTrainingDay('2024-09-23','军训第九天','日间固定军训','分列式训练进入关键阶段！今天上午，所有连队第一次合在一起彩排闭幕式的完整流程。操场上的气氛明显紧张了起来——毕竟闭幕式那天，校长和全体师生都在主席台上看着。\n\n你的方阵排在第四个出场。从入场到整队到正步通过主席台，整套流程走下来要七八分钟。第一次彩排出了不少差错——有人抢拍、有人掉队、有人正步踢得歪歪扭扭。教官虽然皱着眉，但只是说"再来一遍"。\n\n（健康+10，幸福-8）',
  '分列式加练','分列式彩排正式开始，动作不标准的同学需要留在操场单独加练队列。',[
    {text:'主动留下来加练，完善自身动作',effects:{glory:6,wisdom:2,happiness:-5},result:'你主动留了下来，在教官的指导下反复练习。虽然比其他人晚了一个小时才吃上饭，但你的动作已经无可挑剔。'},
    {text:'跟随大部队准时结束训练离场',effects:{},result:'你的动作勉强过关，跟随大部队一起解散了。虽然轻松，但总觉得自己还可以做得更好。'}
  ],
  '闲聊大学规划','休息间隙，身边同学和你闲聊大学四年规划、选课学习、竞赛备考相关内容。',[
    {text:'主动交流，互换大学学习心得',effects:{wisdom:5,charm:3},result:'你们聊得很投机，交换了不少有用的信息。对方分享了一个超好用的学习资源网站，你也分享了自己的选课心得。'},
    {text:'闭目养神，不想参与闲聊',effects:{health:4},result:'你闭上眼睛靠在背包上休息。保存体力也是一种明智的选择。'}
  ],
  makeGfEvent('苏小暖每日事件','苏小暖想要和你一起拍军训合照留作纪念。',
    '花钱冲洗双人合照',{money:-26},{gfFavor:7},'你们在操场边拍了一张合照，你花了26元冲洗了两份。一人一张放在钱包里，苏小暖开心得眼睛眯成了月牙。',
    '拒绝拍照',{happiness:-6},'你推脱说今天太累了改天再拍。苏小暖收起了手机，默默走开了。')
);

// 9.24
STORY_DAYS['2024-09-24']={title:'军训第十天·社团报名',phases:[
  makeAutoPhase('军训基础','日间固定军训','军训第十天。现在的方阵和十天前简直判若两队——步伐整齐划一，口号震天响，连最难统一的正步节奏都磨合得天衣无缝。教官站在队列前，嘴角难得地微微上扬："这才像个样子。"\n\n但今天也是社团报名的最后一天。训练间隙，你不时看到有同学偷偷掏出手机查看社团信息。社团是大学生活的重要组成部分——错过了报名，就只能等下个学期了。\n\n（健康+10，幸福-8）',{health:10,happiness:-8}),
  makeMainPhase('随机事件①','军训慰问物资','学院为全体参训新生发放牛奶、面包等军训慰问物资，补充体能。',[
    {text:'正常领取属于自己的慰问物资',effects:{happiness:5,health:3},result:'你领到了牛奶和面包。一口牛奶一口面包，训练后的疲惫瞬间被治愈了。'},
    {text:'将物资让给身体不适的同学',effects:{charm:5,glory:4,happiness:-2},result:'你将物资让给了旁边脸色发白的一位同学。对方感激得差点哭出来，周围同学纷纷投来敬佩的目光。'}
  ]),
  makeMainPhase('随机事件②','口号比拼','全校各班开展军训口号比拼，比拼口号音量、气势与整齐度。',[
    {text:'用尽全身力气大声喊口号',effects:{singing:4,glory:3,health:-2},result:'你铆足了劲喊出最响亮的口号，嗓子都快冒烟了。你们班获得了全连第二名的好成绩！'},
    {text:'跟随队伍正常喊口号即可',effects:{},result:'你按正常音量喊了口号。不算出彩但也不拖后腿，安稳通过。'}
  ]),
  makeMainPhase('强制剧情','社团最终报名（今日截止，选定不可更改）','⚠️ 社团报名截止日期为今日！请从以下四个社团中选择一个报名，也可放弃报名。所有社团统一在9月29日晚间面试。\n\n1. 体育社团（面试考核：健康+魅力）\n2. 学院组织（面试考核：荣耀+悟性）\n3. 图书管理员（面试考核：悟性+幸福）\n4. 文艺部（面试考核：魅力+歌唱能力）\n5. 放弃所有社团报名',[
    {text:'1. 体育社团',effects:{},flags:{clubApplied:true,clubType:'体育社团'},result:'你正式报名了体育社团。面试将在9月29日晚间进行，考核项目：健康+魅力。'},
    {text:'2. 学院组织',effects:{},flags:{clubApplied:true,clubType:'学院组织'},result:'你正式报名了学院组织。面试将在9月29日晚间进行，考核项目：荣耀+悟性。'},
    {text:'3. 图书管理员',effects:{},flags:{clubApplied:true,clubType:'图书管理员'},result:'你正式报名了图书管理员。面试将在9月29日晚间进行，考核项目：悟性+幸福。'},
    {text:'4. 文艺部',effects:{},flags:{clubApplied:true,clubType:'文艺部'},result:'你正式报名了文艺部。面试将在9月29日晚间进行，考核项目：魅力+歌唱能力。'},
    {text:'5. 放弃所有社团报名',effects:{},flags:{clubApplied:false,clubType:''},result:'你选择不报名任何社团。大学不止社团一条路，你有自己的规划。'}
  ]),
  makeEveningPhase()
]};
STORY_DAYS['2024-09-24'].gfEvent=makeGfEvent('苏小暖每日事件','苏小暖军训晒伤，皮肤泛红刺痛，需要修护护肤品。',
  '花钱购买芦荟胶修护',{money:-30},{gfFavor:8},'你去学校超市买了一支芦荟胶送给她。苏小暖接过芦荟胶，感动得眼眶泛红，说你是最贴心的人。',
  '拒绝帮忙',{happiness:-7},'你表示晒伤过几天自己就好了。苏小暖沉默了一会儿，说了句"没事"就没有再提了。');

// 9.25
makeTrainingDay('2024-09-25','军训第十一天','日间固定军训','倒数第四天。也许是看出了大家的疲惫，教官今天的训练强度明显降低了——站军姿从半小时缩短到十五分钟，正步走练了三遍就让休息。\n\n更多的时间被分配给了闭幕式彩排。你站在方阵中，看着操场上各连队来来往往地走位、定点、合练，恍惚间意识到——这段每天流汗、喊口号、踢正步的日子，真的要结束了。\n\n（健康+10，幸福-8）',
  '清洗迷彩服','连日军训让迷彩服沾满汗水灰尘，衣服异味很重，你打算什么时候清洗衣物？',[
    {text:'晚上熬夜抽空清洗全套迷彩服',effects:{happiness:4,wisdom:-4},result:'你熬夜把迷彩服洗得干干净净。虽然牺牲了睡眠时间，但穿着清爽的衣服训练确实舒服多了。'},
    {text:'积攒衣物，等到休息日再统一清洗',effects:{},result:'你把脏衣服堆在一起，打算休息日再处理。虽然衣服有些味道，但忍一忍就过去了。'}
  ],
  '教官分享军旅经历','教官利用休息时间，分享自己真实的军旅经历和成长感悟，传授自律与坚持的意义。',[
    {text:'认真聆听教官分享，有所感悟',effects:{wisdom:7,glory:2},result:'教官的故事真挚感人。你第一次真正理解了军训的意义——不仅是体能的锻炼，更是意志的磨炼。'},
    {text:'低头玩手机，无心倾听分享',effects:{happiness:3,wisdom:-3},result:'你低头刷着手机，错过了教官精彩的分享。虽然短暂地放松了一下，但和周围认真听讲的同学形成了反差。'}
  ],
  makeGfEvent('苏小暖每日事件','苏小暖觉得食堂军训餐食口味太差，想要加餐。',
    '花钱点外卖加餐',{money:-42},{gfFavor:10},'你花42元点了一份丰盛的外卖。看着苏小暖吃得津津有味，你觉得这钱花得太值了。',
    '拒绝加餐',{happiness:-8},'你表示食堂的饭菜已经很好了。苏小暖有些失落，默默啃完了食堂的饭菜。')
);

// 9.26
makeTrainingDay('2024-09-26','军训第十二天','日间固定军训','军训进入倒计时第三天。操场边的倒计时牌上写着"距闭幕式还有3天"，每次路过都让人心里一紧。\n\n教官今天开始为闭幕式汇演挑选表演人员。除了分列式之外，闭幕式上还有合唱、军体拳、队列操等表演项目。教官在队列前踱步，目光从每个人脸上扫过，偶尔停下来说一句"你，出列"——被选中的人又兴奋又紧张，毕竟这意味着额外的排练。\n\n（健康+10，幸福-8）',
  '闭幕式汇演报名','学校开始筛选闭幕式汇演表演人员，入选后每天需要额外排练，晚会进行公开演出。',[
    {text:'主动报名闭幕式汇演排练',effects:{singing:10,charm:6,happiness:-6},result:'你报名参加了闭幕式汇演！虽然每天要额外排练两小时，但当聚光灯打在身上的那一刻，一切都值得。'},
    {text:'不报名汇演，正常参与日常军训',effects:{},result:'你选择不报名。并非所有人都适合站在聚光灯下，把日常训练做好也是一种选择。'}
  ],
  '搬运物资','班委招募志愿者，帮忙搬运军训横幅、饮用水、表演道具等沉重物资。',[
    {text:'主动报名帮忙搬运物资',effects:{glory:5,charm:3,health:-4},result:'你撸起袖子加入了搬运队伍。虽然汗流浃背，但看到物资整齐地摆放到位，满满的成就感。'},
    {text:'拒绝体力劳动，原地休息',effects:{},result:'你选择原地休息。体力活确实不是每个人都适合干的。'}
  ],
  makeGfEvent('苏小暖每日事件','苏小暖想听你唱歌缓解军训压力。',
    '温柔唱歌安抚对方',{money:-20},{gfFavor:6,singing:2},'你轻声哼唱了一首温柔的歌。苏小暖在电话那头安静地听完了整首歌，说这是她听过的最好听的声音。',
    '拒绝唱歌',{happiness:-6},'你推脱说嗓子不舒服不方便唱。苏小暖有些失望地挂了电话。')
);

// 9.27
makeTrainingDay('2024-09-27','军训第十三天','日间固定军训','倒数第二天，全流程模拟彩排。这一次所有方阵按照正式流程从头到尾走一遍，没有任何中断。\n\n天还没亮你就到了操场。晨雾中，各连队已经在各自的位置上列队完毕。当进行曲响起的那一刻，操场上所有人不约而同地屏住了呼吸——正步的齐响、口号的共鸣、转体的整齐划一，一切都流畅得不可思议。\n\n教官在彩排结束后难得地露出了笑容："明天保持这个状态，没问题。"全排掌声雷动。\n\n（健康+10，幸福-8）',
  '模拟彩排','军训开展闭幕式全流程模拟彩排，教官会针对每一位同学的表现打分记录。',[
    {text:'全神贯注认真完成全部彩排',effects:{glory:8,wisdom:3,happiness:-5},result:'你把这次彩排当作正式演出对待，每一个动作都力求完美。教官给你的评分是A+，在全排名列前茅！'},
    {text:'放松心态敷衍完成彩排流程',effects:{happiness:4,glory:-3},result:'你觉得不过是彩排而已，不用太认真。动作有些随意，教官皱了皱眉但没有说什么。'}
  ],
  '家人来电','远方家人打来电话，关心你近期军训是否辛苦、生活是否适应。',[
    {text:'耐心和家人长时间谈心沟通',effects:{happiness:8,wisdom:-2},result:'你在电话里和妈妈聊了很久，把这段时间的经历都分享了一遍。听到家人的声音，所有的疲惫都化作了温暖。'},
    {text:'简单寒暄后快速挂断电话',effects:{},result:'你简单说了几句就挂了。有些话电话里说不清，你打算等军训结束后再好好聊。'}
  ],
  makeGfEvent('苏小暖每日事件','苏小暖心情低落，想要晚间校园散步散心。',
    '陪同散步并购买小礼品',{money:-22},{gfFavor:6},'你陪她在校园里慢慢走着，路过小卖部时买了一个小发卡送给她。苏小暖惊喜地戴上了发卡，笑容重新回到了脸上。',
    '拒绝陪同散步',{happiness:-7},'你表示今晚合唱排练后太累了。苏小暖回复了"没关系，我自己去吧"，但你总觉得她有些失落。')
);

// 9.28
makeTrainingDay('2024-09-28','军训第十四天','日间固定军训','军训最后一个正式训练日。明天就是闭幕式，空气中弥漫着一种奇特的情绪——紧张、不舍、期待，全都搅在一起。\n\n上午的训练更像是最后的叮嘱：教官让大家把最容易出错的动作又练了三遍，然后集合全排围坐成一圈，第一次用轻松的语气和大家聊天。他讲了自己当年新兵连的故事，讲为什么军训不只是一门课，还讲了他对你们的期望——"好好做人，好好读书，别给咱们排丢脸。"\n\n你坐在地上，膝盖上满是操场上的碎草屑，听着教官的话，心里涌起一股暖流。\n\n（健康+10，幸福-8）',
  '军训优秀个人评选','班级开启军训优秀个人评选，结合日常参训表现、同学投票选出班级军训榜样。',[
    {text:'主动参与军训优秀个人竞选',effects:{charm:5,happiness:-3},result:'你鼓起勇气站上了竞选讲台，简短而有力地向全班同学陈述了自己两周来的努力。不论结果如何，你都已经证明了自己。'},
    {text:'直接放弃竞选，不争荣誉',effects:{},result:'你把机会让给了其他同学。有时候不争不抢也是一种智慧。'}
  ],
  '交流军训感悟','距离军训结束仅剩最后两天，身边同学纷纷感慨军训的辛苦与成长，交流内心感受。',[
    {text:'走心和同学交流军训感悟',effects:{charm:4,happiness:3},result:'你们围坐在一起，分享着两周来的酸甜苦辣。有人说军训这辈子不想再经历，但也不想忘记。大家都笑了，然后都沉默了——因为都懂。'},
    {text:'毫无感触，只想尽快结束军训',effects:{happiness:5,charm:-2},result:'你懒洋洋地表示军训终于要结束了。旁边的同学有些诧异地看着你，觉得你有些冷漠。'}
  ],
  makeGfEvent('苏小暖每日事件','苏小暖想要可爱小挂件当做军训纪念。',
    '花钱购买挂件',{money:-36},{gfFavor:9},'你挑了一个可爱的小兔子挂件送给她。苏小暖开心地把它挂在了书包上，说这是军训最美好的纪念。',
    '拒绝购买',{happiness:-6},'你说军训结束了就是最好的纪念。苏小暖没有反驳，但你看到她收起了期待的表情。')
);

// ===== 9.29 军训最后一天 =====
STORY_DAYS['2024-09-29']={title:'军训最后一天·闭幕式',phases:[
  makeAutoPhase('军训基础','日间固定军训','为期两周的军训，终于走到了最后一天。\n\n清晨6:30，你最后一次以军训学员的身份穿上迷彩服。看着镜中晒黑却精神十足的自己，你几乎认不出这是两周前那个站十分钟军姿就腿软的青涩新生。\n\n操场上，各连队已经列队完毕。阳光洒在迷彩绿上，反射出一片耀眼的光芒。空气中弥漫着一种庄严而神圣的气氛——今天，你们将用两周的汗水为这段青春记忆画上句号。\n\n（健康+10，幸福-8）',{health:10,happiness:-8}),
  makeMainPhase('随机事件①','闭幕式正式汇演','全校举办军训闭幕式最终正式汇演，全体新生上场展示两周军训成果，校方领导现场观看。',[
    {text:'全力以赴，完美完成最终汇演',effects:{glory:10,charm:4,health:-5},result:'你把两周来所有的汗水、坚持和成长都倾注在了最后的正步和口号中。走过主席台的那一刻，你清晰地听到了整齐的脚步声——那是你们共同的节奏。全场掌声雷动！'},
    {text:'正常发挥完成汇演即可',effects:{glory:4},result:'你稳稳地完成了汇演。虽然没有特别出彩的瞬间，但你为自己两周的坚持感到骄傲。'}
  ]),
  makeMainPhase('随机事件②','合影留念','军训彻底落幕，同学们互相拍照留念，记录为期两周的军训时光。',[
    {text:'主动和多位同学合影留念',effects:{charm:6,happiness:5},result:'你热情地和大家合影，留下了许多珍贵的照片。这些照片将成为你大学记忆中最珍贵的一部分。'},
    {text:'只和室友合影，不进行多余社交',effects:{happiness:3},result:'你和三位室友拍了一张四人合照。虽然不是最多照片的人，但和室友的兄弟情谊无需多说。'}
  ]),
  makeEveningPhase(),
  {type:'conditional',tag:'晚间②',title:'社团正式面试',condFlag:'clubApplied',
   text_applied:'晚间合唱结束后，你按照通知前往面试地点。轮到你了，面试官让你做自我介绍并回答专业问题。',
   text_not:'你没有报名任何社团，晚间合唱结束后直接回了宿舍。社团面试与你无关。',
   isSpecial:true,specialType:'clubInterview',
   sText:'面试官对你非常满意！所有问题你都对答如流，展现出了扎实的基础和良好的素养。恭喜通过面试！',sBonus:true,
   fText:'面试官感谢了你的参与，但认为现在的你还需要一些积累。虽然没有通过，但这次面试经历本身就是一种收获。',fEffects:{}}
]};
STORY_DAYS['2024-09-29'].gfEvent=makeGfEvent('苏小暖最后一次军训事件','苏小暖感慨军训结束，不舍这段一起相处的时光。',
  '用心安抚陪伴',{money:-45},{gfFavor:11},'你用心地陪她回忆了两周来的点点滴滴——第一次并肩站军姿、偷偷交换眼神、休息时一起喝水的瞬间……苏小暖靠在你肩上，轻声说这是她人生中最难忘的九月。',
  '敷衍回应',{happiness:-9},'你随口说了几句就回了宿舍。苏小暖站在原地，看着你离开的背影，久久没有离开。');

// 9.30 开学第一课·多系统解锁
STORY_DAYS['2024-09-30']={
  title:'开学第一课·多系统解锁',
  phases:[
    makeMainPhase('上午课程','学术语言交流与沟通（中级）·任课教师：Tania',
      '今天是正式上课第一天。你早早来到教室，发现讲台上站着一位金发碧眼的外教——Tania老师用流利的中文向全班问好。\n\n课堂伊始，Tania要求每位新生依次上台做英文自我介绍，快速互相认识。同学们陆续上台，眼看就要轮到你了……',
      [
        {text:'主动上台进行自我介绍',effects:{charm:-4,wisdom:6},
         flags:{taniaUnlocked:true},
         result:'你大方地走上讲台，用流利的英语介绍了自己的家乡和兴趣爱好。Tania对你微笑点头，在花名册上你的名字旁打了个勾。\n\n📌 系统提示：Tania 教师好感度系统已解锁，可在【教师好感度】面板查看。'},
        {text:'安静坐在座位上，放弃自我介绍',effects:{},
         flags:{taniaUnlocked:true},
         result:'你选择安静地坐在座位上。Tania的目光扫过你，但没有说什么。自我介绍环节在掌声中结束。\n\n📌 系统提示：Tania 教师好感度系统已解锁，可在【教师好感度】面板查看。'}
      ]),
    makeMainPhase('课间休息','第一节课下课·自由安排',
      '第一节课结束，距离下节课还有20分钟课间。你打算如何安排这段自由时间？',
      [
        {text:'返回宿舍补觉休息',effects:{health:7},sleepBonus:true,
         result:'你回到宿舍，一头倒在床上。20分钟的短暂小憩让你恢复了精力，醒来后精神焕发地走向下一间教室。'},
        {text:'回宿舍打开游戏放松',effects:{happiness:8},
         result:'你打开手机游戏打了两局。虽然时间不长，但游戏带来的快乐实实在在地驱散了早起的困意。'},
        {text:'留在教室继续自习',effects:{wisdom:9},
         result:'你没有离开座位，翻开课本继续预习下一节的内容。高效利用了碎片时间，感觉收获满满。'},
        {text:'前往大创中心拜访交流',effects:{},
         cond:true,condAttr:'keChuangUnlocked',condTh:1,
         sEffects:{hanpengHaoGan:5},sText:'你来到大创中心，韩鹏老师正在整理项目材料。看到你来了，他热情地招呼你坐下，聊了聊最近的科创比赛动向。韩鹏老师对你的主动性非常欣赏。',
         fText:'你来到大创中心门口，发现门锁着。看来今天韩鹏老师不在。也许下次再来吧。',
         result:'你来到大创中心门口，发现门锁着。看来今天韩鹏老师不在。也许下次再来吧。'}
      ]),
    makeMainPhase('下午课程①','智能数据分析导论·任课教师：史鉴明',
      '下午第一节课，史鉴明老师走进教室。和开学第一课时的亲切不同，今天的史老师显得格外严肃。\n\n他在黑板上写下一道关于伪代码的思考题，随后开始分发空白纸条："请每位同学在纸条上写下你的答案，写上名字，下课前上交。这是今天的课堂作业。"',
      [
        {text:'按要求认真作答并上交答题纸条',effects:{},
         flags:{shijianmingUnlocked:true},
         result:'你仔细阅读了黑板上的伪代码，经过短暂思考后在纸条上写下了自己的答案。史老师收纸条时对你点了点头。\n\n📌 系统提示：史鉴明 教师好感度系统已解锁。'},
        {text:'没有写纸条，未上交',effects:{},
         flags:{shijianmingUnlocked:true},
         hidden:{desc:'课程预估成绩-10，史鉴明好感度下降',effects:{shijianmingFavor:-5},gEffects:{dataAnalysis:-10}},
         result:'你觉得这道题太难，犹豫了半天还是没有下笔。下课时史老师收走了其他同学的纸条，看了你一眼，眼神中闪过一丝失望。\n\n⚠️ 智能数据分析导论 预估成绩 -10\n⚠️ 史鉴明好感度下降\n📌 系统提示：史鉴明 教师好感度系统已解锁。'}
      ]),
    makeMainPhase('下午课程②','高等数学建模A·任课教师：周蕊',
      '下午第二节课，年轻干练的周蕊老师走进教室。她推了推眼镜，在黑板上写下一道线性代数基础题：\n\n"已知向量 a=(2,1)，向量 b=(1,3)，求两个向量的数量积。"\n\n周蕊老师环顾教室，最终目光落在你身上："这位同学，你来回答一下。"',
      [
        {text:'起身作答：2×1 + 1×3 = 5',effects:{wisdom:5},
         flags:{zhouruiUnlocked:true},
         result:'"2×1 + 1×3 = 2 + 3 = 5。"你清晰地说出答案。周蕊老师满意地点了点头："完全正确。数量积的计算公式掌握得很好。"\n\n📌 系统提示：周蕊 教师好感度系统已解锁。'},
        {text:'起身作答：2×3 + 1×1 = 7',effects:{glory:-2},
         flags:{zhouruiUnlocked:true},
         result:'"7。"你说出了错误的答案。周蕊老师顿了顿："不对。数量积是横坐标乘横坐标加纵坐标乘纵坐标，应该是5。"几位同学偷偷笑了起来，你感到脸上有些发烫。\n\n📌 系统提示：周蕊 教师好感度系统已解锁。'}
      ]),
    makeMainPhase('晚间剧情','班级正式班委选举',
      '晚自习结束后，辅导员走进教室宣布：班级正式班委选举现在开始。本次竞选共有三个核心岗位——班长、团支书、学习委员。\n\n竞选成功者将获得荣耀+50的奖励，且在校期间周末随机事件永久减少一次。\n\n请选择你想要参选的岗位：',
      [
        {text:'参选班长（判定核心：魅力≥150）',cond:true,condAttr:'charm',condTh:150,
         sEffects:{glory:50},sFlags:{wonElection:true,weekendEventReduction:1},
         sHidden:'竞选成功！周末随机事件永久-1',
         sText:'你自信地走上讲台，用富有感染力的演讲阐述了自己的竞选理念。同学们报以热烈的掌声。投票环节结束，你以高票当选班长！荣耀+50。',
         fText:'尽管你努力表达了自己，但魅力和人气还不足以服众。竞选失败，但你从这次经历中学到了很多。'},
        {text:'参选团支书（判定核心：荣耀≥150）',cond:true,condAttr:'glory',condTh:150,
         sEffects:{glory:50},sFlags:{wonElection:true,weekendEventReduction:1},
         sHidden:'竞选成功！周末随机事件永久-1',
         sText:'你以丰富的履历和扎实的工作经验征服了全班同学。投票结果公布，你成功当选团支书！荣耀+50。',
         fText:'你的荣耀积累还不够。竞选失败，但班级同学认可了你的勇气。'},
        {text:'参选学习委员（判定核心：悟性≥150）',cond:true,condAttr:'wisdom',condTh:150,
         sEffects:{glory:50},sFlags:{wonElection:true,weekendEventReduction:1},
         sHidden:'竞选成功！周末随机事件永久-1',
         sText:'你以优异的学术素养和清晰的学业规划赢得了全班同学的信任。成功当选学习委员！荣耀+50。',
         fText:'你的悟性还不足以胜任。竞选失败，但同学们记住了你认真的态度。'},
        {text:'放弃参选，不参与本次班委竞选',effects:{},
         result:'你选择不参选。做一个普通同学也有普通同学的自在。你安静地坐在座位上，为每一位竞选者鼓掌加油。'}
      ])
  ],
  gfEvent:makeGfEvent('苏小暖当选宣传委员',
    '竞选结果公布后，你的女友苏小暖也参加了竞选并成功当上了班级宣传委员！她开心地跑来告诉你这个好消息，脸颊因为激动泛起了红晕。',
    '给她一个大大的拥抱，真心为她高兴',{},{gfFavor:10},
    '你给了她一个大大的拥抱。"我们都要加油啊。"苏小暖笑靥如花，用力点了点头。',
    '淡淡地说"恭喜"，没有过多表示',{happiness:-5},
    '你随口说了句"恭喜"就低头看手机了。苏小暖的笑容僵了一瞬，然后默默走开了。')
};

// ==================== 国庆七天假期 ====================
var HOLIDAY_DAYS={};

HOLIDAY_DAYS['2024-10-01']={
  dayNum:1,isSelection:true,
  bgText:'十月一日举国欢庆，学校东操场举办新生国庆升旗仪式，全体留校师生到场参加，面向国旗行注目礼、齐唱国歌。全校课程、团校活动全面暂停，七天长假正式开启。',
  campusEvents:[
    {title:'国庆红色主题大创项目征集',text:'学校结合国庆节点，开启红色科创专项赛道征集，贴合爱国主题的项目立项通过率更高。',choices:[
      {text:'A. 修改方案适配红色主题立项',effects:{wisdom:10,glory:5,health:-4,hanpengHaoGan:3},result:'你连夜修改项目方案，融入红色科创元素。虽然熬夜改方案很累，但看到焕然一新的项目计划书，成就感满满。'},
      {text:'B. 坚持原有项目方向，不参与专项征集',effects:{},result:'你决定坚持原有项目方向。不参与专项征集意味着少了额外支持，但保持了自己的研究节奏。'}
    ]},
    {title:'大创小组国庆线上团建+项目研讨',text:'小组借着国庆契机开展线上云团建，同时同步对接假期项目进度。',choices:[
      {text:'A. 全程参与团建与研讨',effects:{charm:4,wisdom:6,happiness:-3},result:'你全程参与了线上团建和项目研讨。增进了组员感情，项目进度也顺利推进，但占用了不少休闲时间。'},
      {text:'B. 只参与工作研讨，拒绝闲聊团建',effects:{wisdom:4},result:'你只参与了工作研讨部分，高效同步了项目进度。虽然没有参与闲聊，但项目工作一点没落下。'}
    ]}
  ],
  gfEvents:{
    home:makeGfEvent('异地思念','校园举办国庆升旗仪式，女友独自前往观礼。看着身边皆是结伴同行的同学，她倍感孤单，拍完国旗现场照片发给你，希望你发国庆红包安慰情绪。',
      '转账40元红包并耐心安慰',{money:-40},{gfFavor:10},'你立刻转账了40元红包，并附上大段安慰的话语。女友收到红包和消息后心情好了很多，回复了一连串可爱的表情包。',
      '仅口头安慰，不发红包',{happiness:-3},{},'你只回了句"别难过啦"却没有实际行动。女友看了看手机屏幕上你敷衍的回复，嘴角的笑容慢慢消失。'),
    campus:makeGfEvent('国旗打卡','清晨你们一同参加升旗仪式，结束后女友想在国旗打卡点合影留念，记录国庆首日。',
      '耐心配合拍照、修整图片',{charm:2},{gfFavor:7},'你耐心地帮她找了最佳角度，拍了十几张照片，还帮她修图调色。女友翻看着照片，开心地在朋友圈发了九宫格。',
      '觉得拍照麻烦，拒绝合影',{happiness:-6},{},'你觉得拍来拍去太麻烦，摆摆手说不想拍。女友收起手机，脸上的笑容消失了。'),
    couple:makeGfEvent('海边亲密合影','二人一同前往海边观看国庆升旗仪式，海风拂动红旗氛围感十足，女友希望在国旗旁拥抱合影。',
      '温柔配合亲密合影',{charm:3},{gfFavor:12},'你温柔地揽住她的肩膀，两人在国旗和朝阳的映衬下拍下了甜蜜的合照。海风拂过她的发梢，画面美得像电影海报。',
      '碍于路人目光，委婉拒绝亲密动作',{},{gfFavor:-3},'你觉得周围人太多有些不好意思，轻轻推开了她的手。女友虽然表示理解，但眼中闪过一丝失落。'),
    internship:makeGfEvent('错过升旗','你一早通勤上班错过升旗，女友分享现场画面，希望你下班之后陪她聊天解闷。',
      '承诺下班抽空陪伴聊天',{},{gfFavor:6},'你回复说下班后一定好好陪她。虽然工作很累，但想到有人等着自己，心里也暖暖的。',
      '上班劳累，直接拒绝',{happiness:-5},{},'你说太累了不想聊天。女友看着你冷淡的回复，沉默了很久没有再发消息过来。'),
    dorm:makeGfEvent('错过升旗','你睡懒觉错过升旗仪式，女友发来现场消息，想约你出门逛校园。',
      '起床陪同外出闲逛',{},{gfFavor:5},'你揉了揉眼睛从床上爬起来，陪她在校园里逛了一圈。虽然困意未消，但看到她开心的样子也值了。',
      '赖床不起，拒绝出门',{happiness:-4},{},'你翻了个身继续睡。女友等了半天没等到回复，一个人默默在校园里走了一圈。')
  }
};

HOLIDAY_DAYS['2024-10-02']={
  dayNum:2,
  bgText:'国庆出游迎来客流峰值，秦皇岛各大景区、商圈人潮涌动、道路拥堵。大部分学生已返乡或外出游玩，校园愈发安静。',
  campusEvents:[
    {title:'国庆主题调研问卷发放',text:'小组计划借助景区人流，线下发放国庆相关社会调研问卷。',choices:[
      {text:'A. 前往景区线下发放问卷',effects:{glory:6,charm:5,health:-4},result:'你带上问卷前往景区，在人流中穿行发放。虽然人群拥挤、奔波劳累，但回收了大量有效问卷，数据质量超出预期。'},
      {text:'B. 选择线上发放电子问卷',effects:{wisdom:5},result:'你选择在线上平台发放电子问卷，虽然样本量不如线下丰富，但效率更高、也更省力。'}
    ]},
    {title:'韩鹏老师留校值守·科创答疑',text:'韩鹏老师国庆留校值班，面向留校科创学生提供一对一项目答疑。',choices:[
      {text:'A. 预约线下当面答疑',effects:{hanpengHaoGan:6,wisdom:9,happiness:-4},result:'你预约了韩鹏老师的时间，当面请教了许多项目中遇到的难题。韩老师耐心解答，你收获满满。'},
      {text:'B. 仅线上简单提问',effects:{hanpengHaoGan:2},result:'你在微信上简单提了几个问题。韩老师很快回复了，但很多细节问题没来得及深入讨论。'}
    ]}
  ],
  gfEvents:{
    home:makeGfEvent('异地奶茶','校外景区人山人海，女友刷到朋友圈全是情侣出游动态，触景生情十分想念你，希望你帮忙点奶茶外卖送到宿舍。',
      '下单奶茶外卖',{money:-40},{gfFavor:10},'你立刻下单了她最爱的口味。半小时后外卖送到，女友捧着奶茶发来一张自拍，笑得像朵花。',
      '拒绝帮忙点单，让她自行购买',{happiness:-3},{},'你说"你自己点不就行了"。女友看着消息，默默打开外卖App自己下单了一杯便宜点的。'),
    campus:makeGfEvent('纪念徽章','校外游客太多，二人选择留在校内闲逛。路过校园文创小摊，女友想要一枚国庆纪念徽章。',
      '花钱买下徽章赠予对方',{money:-28},{gfFavor:8},'你掏钱买下了那枚精致的国庆纪念徽章，亲手别在她的衣领上。女友低头看着徽章，笑得眼睛弯弯的。',
      '认为饰品无用，拒绝购买',{happiness:-5},{},'你说"这种小东西买了也是浪费钱"。女友默默放下了手中的徽章，脸上的期待消失了。'),
    couple:makeGfEvent('排队买挂件','商圈内摆满国庆限定周边，女友想要收集全套国庆小挂件。',
      '排队买下全套挂件',{money:-50,charm:2},{gfFavor:15},'你陪她排了将近半小时的队，终于集齐了全套挂件。女友抱着挂件袋子开心得像个孩子，不停比划着要挂在哪里。',
      '不愿长时间排队，只选购一件',{},{gfFavor:5},'你看着长长的队伍皱起了眉头，最终只买了一件。女友虽然有点小失望，但还是把那一件小心地收进了包里。'),
    internship:makeGfEvent('下班接送','女友独自逛商圈，人多嘈杂心生不安，希望你下班之后接她回校。',
      '下班第一时间前往接送',{},{gfFavor:7},'你下班后一刻没耽搁，赶到商圈接上了她。看到她站在人群中的身影，你快步走过去牵起了她的手。',
      '身心疲惫，拒绝前往',{happiness:-6},{},'你说太累了不想再出门。女友在喧闹的人群中独自打车回了学校，一路上沉默不语。'),
    dorm:makeGfEvent('逛街邀约','女友想去校外国庆商圈游玩，邀约你一同出门。',
      '放下游戏陪同逛街',{},{gfFavor:5},'你关掉了游戏，换好衣服陪她出了门。虽然商场人很多，但两个人一起逛吃逛吃还挺开心的。',
      '不愿走动，留在宿舍',{happiness:-5},{},'你说不想出门，头也不回地继续打游戏。女友在宿舍楼下等了十分钟，最后一个人去了商圈。')
  }
};

HOLIDAY_DAYS['2024-10-03']={
  dayNum:3,
  bgText:'假期过半，中秋余温仍在。海边、校园湖畔开启双节主题花灯展，灯火连绵、光影璀璨，节日氛围达到顶峰。',
  campusEvents:[
    {title:'拍摄花灯夜景用作项目宣传素材',text:'夜晚花灯景色优美，适合拍摄实拍素材，丰富大创项目展示内容。',choices:[
      {text:'A. 夜晚外出拍摄素材',effects:{charm:5,wisdom:4,health:-3},result:'你带着相机来到湖边，花灯倒映在水面上，光影交错美不胜收。你拍下了大量高质量素材，项目的宣传材料有了着落。'},
      {text:'B. 仅白天室内拍摄，夜晚不外出',effects:{},result:'你选择白天在室内简单拍了几张。虽然没有花灯夜景的加持，但基本的素材也够用了。'}
    ]},
    {title:'观看国庆科技创新主题纪录片',text:'大创群组转发国家级科创发展纪录片，可供学习行业知识。',choices:[
      {text:'A. 完整观看并记录知识点',effects:{wisdom:11,glory:2},result:'你花了一个多小时认真看完了整部纪录片，做了满满三页笔记。国家科技发展的历程让你对自己的项目有了更深的思考。'},
      {text:'B. 跳过视频刷取娱乐内容',effects:{happiness:4,wisdom:-4},result:'你看了五分钟就关掉了，打开短视频App刷了一晚上。虽然当下很爽，但事后想起觉得自己浪费了不少时间。'}
    ]}
  ],
  gfEvents:{
    home:makeGfEvent('视频通话','女友独自前往海边观看花灯展，看着周围成双成对的游客内心落寞，想要和你长时间视频通话分享夜景。',
      '接通视频全程陪伴',{money:-40},{gfFavor:10},'你接通了视频电话，把手机支在桌前，陪她看了整整两个小时的花灯展。虽然异地相隔，但屏幕里的她笑容灿烂，仿佛你就在身旁。',
      '借口忙碌，简短挂断通话',{happiness:-4},{},'你说"现在有点忙"就匆匆挂断了。女友看着手机屏幕上不到两分钟的通话记录，心里一阵酸涩。'),
    campus:makeGfEvent('花灯长廊','校园湖畔花灯长廊景色迷人，女友邀约你夜晚一同散步赏灯。',
      '欣然陪同漫步赏灯',{health:3},{gfFavor:8},'夜晚的湖畔被花灯点缀得如同梦境。你们并肩漫步在花灯长廊下，五彩的灯光映在她的脸庞上，美得让人心动。',
      '不愿夜间出门，留在宿舍',{happiness:-6},{},'你说晚上不想出门。女友一个人走在花灯长廊下，身旁的位置空落落的，看着别人成双成对，心里很不是滋味。'),
    couple:makeGfEvent('花灯下的牵手','二人共赏海边大型花灯秀，灯火与红旗交相辉映，氛围暧昧，女友主动牵手，希望并肩看完整场演出。',
      '牵手陪伴全程',{charm:5},{gfFavor:16},'你紧紧牵住她的手，十指相扣。海风吹拂、花灯闪烁，你们并肩看完了整场花灯秀。她靠在你肩上，轻声说这是她度过的最浪漫的国庆节。',
      '人群喧闹保持距离，不愿牵手',{},{gfFavor:-2},'你觉得周围人太多，默默把手抽了回去，和她保持着一点距离。女友没有说什么，但整场演出下来，她的目光更多停留在你身上而不是花灯上。'),
    internship:makeGfEvent('下班陪伴','花灯展热闹非凡，女友独自观赏倍感孤单，希望你下班赶来陪伴。',
      '下班后赴约陪伴赏灯',{},{gfFavor:8},'你加班到八点，但还是赶去了湖边。远远看到她独自站在花灯旁的背影，你加快脚步跑了过去。她回头看见你，疲惫的脸上终于绽开了笑容。',
      '疲惫不堪，拒绝外出',{happiness:-7},{},'你说实在走不动了。女友在花灯展的人群中独自拍了张照片，发给你后你很久才回复了一个表情。'),
    dorm:makeGfEvent('花灯分享','女友发来花灯夜景照片，想和你聊天分享感受。',
      '放下游戏认真聊天',{},{gfFavor:4},'你暂时退出了游戏，认真回复她的每一张照片和每一条消息。聊着聊着竟也聊了一个多小时，感觉比打游戏充实多了。',
      '专注游戏，敷衍回复',{happiness:-3},{},'你一边打游戏一边随口回了几个"好看""嗯"。女友看着你越来越短的回复，发消息的频率也越来越低。')
  }
};

HOLIDAY_DAYS['2024-10-04']={
  dayNum:4,
  bgText:'假期进入倦怠阶段，出游疲惫、居家无聊成为常态，校园人流量小幅回升，节日热闹氛围逐步回落。',
  campusEvents:[
    {title:'项目代码出现漏洞',text:'组员分散各地，项目代码突发BUG，无法线下求助。',choices:[
      {text:'A. 独自熬夜排查修复代码',effects:{wisdom:12,happiness:-5},result:'你一个人对着屏幕排查到凌晨三点，终于在无数次的尝试后找到了BUG根源。代码重新跑通的那一刻，疲惫中涌起一阵难以言喻的满足。'},
      {text:'B. 搁置问题，等待开学再处理',effects:{wisdom:-5},result:'你决定暂时搁置。虽然现在轻松了，但问题不会自己消失，开学后还得花时间解决。'}
    ]},
    {title:'申请国庆专属独立实验室',text:'学校开放假期专属独立实验室，环境安静适合攻坚项目。',choices:[
      {text:'A. 提交申请使用专属工位',effects:{hanpengHaoGan:4,wisdom:7,happiness:-3},result:'你填写了申请表，如愿拿到了独立实验室的钥匙。安静的环境让工作效率翻倍，韩鹏老师也对你主动申请的态度表示赞赏。'},
      {text:'B. 使用公共工位，不申请专属房间',effects:{},result:'你觉得申请流程太麻烦，继续在公共工位工作。虽然人多嘈杂，但凑合也能用。'}
    ]}
  ],
  gfEvents:{
    home:makeGfEvent('敏感多疑','双方聊天频次减少，女友变得敏感多疑，认为你疏于关心，情绪低落，希望你发红包哄她开心。',
      '发红包安抚情绪',{money:-40},{gfFavor:10},'你发了一个红包并附上暖心的话。女友收到后情绪明显好转，回复的语气也轻快了许多。异地不易，一个红包换一份安心，值得。',
      '认为对方无理取闹，拒绝安抚',{happiness:-4},{},'你觉得她在无理取闹，回了句"你想多了"。女友看着你的消息，删掉了已经打好的大段倾诉，只回了一个"嗯"。'),
    campus:makeGfEvent('团圆餐','二人都陷入假期倦怠，女友邀约你去食堂品尝国庆限定团圆餐。',
      '陪同共进晚餐',{money:-30},{gfFavor:7},'你们一起去了食堂，点了两份国庆限定团圆餐。红烧肉的香气、热腾腾的米饭、对面坐着的人，简单的晚餐却吃出了家的味道。',
      '懒得走动，拒绝一同就餐',{happiness:-5},{},'你说不想动。女友一个人去了食堂，坐在角落里默默地吃完了那份本该两个人分享的团圆餐。'),
    couple:makeGfEvent('宅居追剧','连日旅途奔波身心俱疲，女友不想外出，只想和你在住处追剧休息。',
      '留下来安静陪伴追剧',{happiness:5},{gfFavor:10},'你依偎在她身边，两人窝在沙发上看了一整天的剧。没有景区的喧嚣和排队的疲惫，这种安静的陪伴反而更加珍贵。',
      '想出门闲逛，拒绝宅居',{},{gfFavor:-4},'你说闷在屋里太无聊，非要出门转转。女友虽然跟着你出了门，但一路上兴致不高，你们没逛多久就各自回了住处。'),
    internship:makeGfEvent('耐心沟通','你连日加班心态烦躁，回复消息愈发敷衍，女友希望和你认真沟通一次。',
      '耐心抽出时间沟通',{},{gfFavor:6},'你放下手头的工作，认真地和她通了一次长长的电话。聊完后两个人都轻松了很多——原来很多问题，只要愿意沟通就不是问题。',
      '心情烦躁，直接拒绝交流',{happiness:-8},{},'你说"我现在很烦，别来添乱"。女友默默挂掉了电话。这一晚，你们谁也没有再给对方发一条消息。'),
    dorm:makeGfEvent('认真回应','你作息混乱、回复消息拖沓，女友积攒委屈，希望你认真回应她的消息。',
      '放下游戏安抚对方',{},{gfFavor:4},'你放下手柄，给她打了一个电话。虽然只是简单的几句安慰，但电话那头她的声音明显放松了下来。',
      '依旧敷衍回复',{happiness:-4},{},'你继续打游戏，隔很久才回一两个字。女友看着对话框里你越来越敷衍的回复，把打好的话一行一行地删掉了。')
  }
};

HOLIDAY_DAYS['2024-10-05']={
  dayNum:5,
  bgText:'部分游客、学生提前返程，车站、高速迎来返程小高峰，返校人数增多，校园逐步恢复人气。',
  campusEvents:[
    {title:'返校学长分享国赛备赛经验',text:'参与国家级科创赛事的学长提前返校，可请教备赛技巧。',choices:[
      {text:'A. 主动上前请教经验',effects:{wisdom:10,glory:3},result:'你主动上前和学长攀谈，学长非常热情地分享了他的备赛经历和评委偏好。这些经验不是书本上能学到的，含金量极高。'},
      {text:'B. 擦肩而过，不予交流',effects:{},result:'你犹豫了一下没有上前。学长匆匆走过，一段潜在的学习机会就这样错过了。'}
    ]},
    {title:'完成假期项目初稿撰写',text:'小组要求在假期尾声提交完整项目初稿。',choices:[
      {text:'A. 用心打磨初稿内容',effects:{wisdom:8,glory:4},result:'你花了整整一天反复打磨初稿，从逻辑框架到数据呈现都力求完美。提交后组员纷纷点赞，说这是组里最用心的一份。'},
      {text:'B. 敷衍完成应付检查',effects:{wisdom:-3},result:'你随便拼凑了一篇交了上去。虽然暂时应付过去了，但自己心里清楚这份初稿的水分有多大。'}
    ]}
  ],
  gfEvents:{
    home:makeGfEvent('返程忙碌','返程车流拥堵，你忙于赶路迟迟不回消息，女友内心缺乏安全感，希望你发红包弥补冷落。',
      '发红包道歉安抚',{money:-40},{gfFavor:10},'你把车靠边停了一下，给她发了一个红包，附上一句"路上太堵了，回去好好陪你"。女友的焦虑被这句话瞬间化解。',
      '自认忙碌无需解释，拒绝道歉',{happiness:-4},{},'你说"路上堵车又不是我的错"。女友没有回复，但你已经能感受到屏幕那头传来的低气压。'),
    campus:makeGfEvent('超市采购','大批同学返校，女友邀约你去校园超市采购零食囤货。',
      '陪同采购零食',{money:-35},{gfFavor:7},'你们推着购物车在货架间穿梭，她往车里扔了一堆零食，你笑着帮她拎袋子。采购完回宿舍的路上，两个人各抱着一袋零食，边走边吃。',
      '不愿出门，直接拒绝',{happiness:-5},{},'你说"你自己去就行了"。女友只好一个人去了超市，结账时看着前面帮女朋友拎袋子的男生，轻轻叹了口气。'),
    couple:makeGfEvent('人群守护','景区人流再度拥挤，女友害怕人群冲撞，希望你全程牵住她保护她。',
      '全程贴身守护牵手同行',{charm:4},{gfFavor:13},'你牢牢牵住她的手，在人流中为她开辟出一条安全通道。她把你的手握得很紧，偶尔抬头看你的眼神里全是依赖和信任。',
      '自顾行走，无法时刻照看',{},{gfFavor:-3},'你专心看导航找路，没有注意到她在人群中好几次被挤得踉跄。她抿着嘴跟在你身后，一路沉默。'),
    internship:makeGfEvent('加班道歉','公司临时加班，你延后下班，错过了和女友的约定见面时间。',
      '主动道歉并购买小礼物赔罪',{money:-25},{gfFavor:7},'你在下班的路上买了一束小花，见到她时郑重地道了歉。女友接过花，脸上的委屈慢慢化成了笑意。',
      '认为加班身不由己，不作道歉',{happiness:-6},{},'你说"加班又不是我乐意的"。女友等了你两个小时，听到这句话后转身就走了。'),
    dorm:makeGfEvent('出门散步','室友陆续返校，女友看到他人成双成对心生羡慕，约你出门散步。',
      '出门陪同散步',{},{gfFavor:5},'你伸了个懒腰从床上起来，陪她在校园里走了一圈。夕阳下的操场很安静，你们一边走一边聊，感觉还不错。',
      '坚守宿舍，拒绝外出',{happiness:-5},{},'你说不想动。女友在操场边等了又等，最后发了一条消息："算了，我回去了。"')
  }
};

HOLIDAY_DAYS['2024-10-06']={
  dayNum:6,
  bgText:'假期临近尾声，绝大多数学生结束出行、返乡，陆续返回校园。大家开始收拾行李、调整心态，为恢复上课做准备。',
  campusEvents:[
    {title:'大创项目中期复盘会议',text:'开展假期项目中期复盘，总结七日工作进度与问题。',choices:[
      {text:'A. 认真整理资料、参与复盘',effects:{wisdom:9,glory:4},result:'你整理了假期所有的工作记录，在会上条理清晰地汇报了项目进展。组员们对你的总结能力刮目相看，团队协作效率明显提升。'},
      {text:'B. 敷衍应对，快速结束会议',effects:{wisdom:-3},result:'你随便说了几句就催着大家散会。会议草草结束，许多问题没有讨论清楚，给后续工作埋下了隐患。'}
    ]},
    {title:'归档假期科创资料',text:'需要将假期调研数据、学习文件统一分类归档。',choices:[
      {text:'A. 细心整理归档',effects:{wisdom:6},result:'你把假期所有资料分门别类整理好，建立了清晰的目录结构。韩鹏老师在群里看到后点了赞，说这是做科创项目应有的态度。'},
      {text:'B. 随意堆放，不做整理',effects:{},result:'你把资料随手塞进了文件夹。虽然现在省了一点时间，但开学后找资料时估计要头疼了。'}
    ]}
  ],
  gfEvents:{
    home:makeGfEvent('规划未来','假期即将结束，女友开始规划开学后的相处日常，滔滔不绝和你分享想法，希望你认真倾听回应，并准备一份心意红包。',
      '耐心倾听并发放心意红包',{money:-40},{gfFavor:10},'你认真听她一条一条地讲开学后的计划，然后发了一个红包，说"开学后每天都能见到你了"。女友开心地收下了红包，发来一长串"期待开学"的消息。',
      '敷衍应对，不在意对方规划',{happiness:-4},{},'你说"开学再说呗，现在想那么多干嘛"。女友的热情被你这盆冷水浇了个透，后面她没再提起任何计划。'),
    campus:makeGfEvent('梳理知识点','临近开学，女友担心课业跟不上，希望你帮忙梳理各科预习知识点。',
      '耐心协助梳理知识点',{wisdom:3},{gfFavor:8},'你拿出课本和她一起从头梳理了一遍。梳理的过程中你自己也理清了不少之前模糊的概念，两个人互相讨论、互相促进，效率很高。',
      '不愿动脑，拒绝帮忙',{happiness:-6},{},'你说"我还有自己的事要忙"。女友只好一个人对着课本发愁，密密麻麻的公式看得她头昏脑涨。'),
    couple:makeGfEvent('情侣写真','旅行即将结束，女友十分不舍，想要拍摄一组情侣合照留存假期回忆。',
      '认真拍摄情侣写真',{money:-40,charm:3},{gfFavor:14},'你请了路人帮忙，在景区最美的几个角落拍了一组情侣写真。每一张照片里你们都笑得很灿烂——这是这个假期最珍贵的纪念。',
      '嫌拍照麻烦，减少拍摄数量',{},{gfFavor:-4},'你说"拍几张就行了，别拍了"。女友默默收起了手机，那些想一起打卡的机位，最终只留在了她的收藏夹里。'),
    internship:makeGfEvent('晚间散步','实习临近收尾，工作压力加大，女友想约你晚间散步舒缓压力。',
      '放下工作陪同散步',{},{gfFavor:7},'你合上电脑，和她一起在操场上走了一圈又一圈。夜晚的凉风吹散了工作的烦躁，牵着她的手，你感到久违的放松。',
      '压力过大，没有心情外出',{happiness:-7},{},'你说"我现在压力很大，你别烦我"。女友没有再多说，默默帮你倒了一杯热水放在桌边。你很久以后才注意到那杯水已经凉透了。'),
    dorm:makeGfEvent('调整作息','女友劝说你调整作息，不要再熬夜打游戏，迎接开学。',
      '听从劝告，早睡调整作息',{health:5},{gfFavor:5},'你说"好吧，今天早点睡"。关了灯躺在床上，你发现原来早睡的感觉真的不错。女友收到你发的"晚安"后，安心地也睡了。',
      '拒绝改变，继续熬夜',{happiness:-4},{},'你说"我自己有数，不用你管"。女友没有再劝，但她知道明天开学你的状态一定很糟糕。')
  }
};

HOLIDAY_DAYS['2024-10-07']={
  dayNum:7,
  bgText:'国庆长假最后一日，所有学生基本完成返校。街头国庆装饰仍在，但节日氛围逐渐褪去，全员调整作息、收拾状态，明日将恢复早八课程、重启团校系统。',
  campusEvents:[
    {title:'提交假期全部项目成果',text:'向韩鹏老师上交七天假期的大创进度成果，等待点评。',choices:[
      {text:'A. 规整整理后完整提交',effects:{hanpengHaoGan:7,glory:5},result:'你将七天的工作成果精心整理成一份详实的报告提交了上去。韩鹏老师仔细审阅后给出了高度评价，说你是假期最用心的同学之一。'},
      {text:'B. 仓促提交，未做整理',effects:{hanpengHaoGan:-3},result:'你急急忙忙拼凑了一版交了上去。韩鹏老师看后微微皱眉，没有多说什么，但你知道他对你的期待打了折扣。'}
    ]},
    {title:'调整作息适配开学',text:'假期作息紊乱，需要调整生物钟，应对次日早八课程。',choices:[
      {text:'A. 早睡早起调整作息',effects:{health:8},result:'你晚上十点就关了手机上了床。虽然刚开始不太习惯，但第二天早上精神饱满地醒来，为开学做好了充分准备。'},
      {text:'B. 延续熬夜习惯',effects:{health:-6},result:'你忍不住又熬夜到了凌晨两点。等到第二天早上闹钟响的时候，你深刻地后悔了自己昨晚的选择。'}
    ]}
  ],
  gfEvents:{
    home:makeGfEvent('告别红包','你准备次日返校，长达七日的异地相处即将结束。女友感慨异地难熬，期盼线下见面，希望收到一份告别红包圆满收尾假期。',
      '发放红包并约定返校见面',{money:-40},{gfFavor:12},'你发了一个红包，和她约定明天一返校就第一时间见面。女友开心得像只小鸟，连着发了好几条"等你回来"。七天异地终于要结束了。',
      '仅口头约定，不发红包',{happiness:-3},{},'你说"明天就见到了还发什么红包"。女友虽然嘴上说没事，但心里还是有一点点小失落。'),
    campus:makeGfEvent('操场谈心','假期最后一晚，二人坐在操场吹晚风、看国旗，感慨假期短暂，期待开学朝夕相伴。女友想和你静坐整晚谈心。',
      '全程陪伴静坐聊天',{health:4},{gfFavor:9},'你们在操场的台阶上坐了很久，聊了很多——关于假期、关于未来、关于彼此。晚风很凉，但两颗心都很暖。',
      '夜间寒凉，想提前回宿舍',{happiness:-5},{},'你说"太冷了，我先回去了"。女友一个人又在操场坐了一会儿，看着天上的星星，心里有种说不出的空落。'),
    couple:makeGfEvent('旅途返程','旅途结束踏上返程，女友依偎在你身旁，不舍这段甜蜜假期，期待开学日常相伴。',
      '温柔安抚，承诺多陪伴对方',{charm:5},{gfFavor:18},'你搂着她的肩膀，轻声承诺开学后每天都会陪她。她靠在你身上，说这七天是她大学里最幸福的时光。车子驶入校园，你们的手仍然紧紧握在一起。',
      '旅途疲惫，沉默不语',{},{gfFavor:-3},'你太累了，一路几乎没怎么说话。女友几次想和你分享旅途的感受，看到你疲惫的样子又咽了回去。'),
    internship:makeGfEvent('实习结束','国庆实习正式结束，你终于摆脱加班劳累。女友心疼你七日辛苦，想好好陪伴你放松一天。',
      '接受陪伴，轻松相处',{},{gfFavor:8},'你终于放下了工作的担子。和她一起在校园里随便走走、吃个饭、看场电影——原来最简单的相处就是最好的放松。',
      '身心俱疲，想要独自休息',{happiness:-6},{},'你说"我想一个人静静"。女友虽然很想陪你，但还是尊重了你的选择，轻轻说了句"好好休息"。'),
    dorm:makeGfEvent('开学劝诫','假期摆烂生活即将结束，女友叮嘱你开学后减少游戏时间，多学习、多陪伴她。',
      '答应对方，愿意做出改变',{},{gfFavor:6},'你认真地点了点头，说开学后一定减少游戏时间，多花时间学习和陪她。女友开心地笑了，眼睛里藏着小小的期待。',
      '口头敷衍，不愿改变现状',{happiness:-3},{},'你说"知道了知道了"眼睛却没离开屏幕。女友叹了口气，不知道开学后你还能不能兑现这句敷衍的承诺。')
  }
};

// ==================== 10.8-10.9 开学剧情 ====================
STORY_DAYS['2024-10-08']={
  title:'开学第二天·形势与政策首课',
  phases:[
    makeMainPhase('上午课程','形势与政策 · 任课教师：韩杰',
      '国庆假期正式结束，今天恢复上课。第一节课是形势与政策，一位戴着金丝眼镜、气质儒雅的男老师走进教室——他叫韩杰，本学期的形势与政策课由他主讲。\n\n韩杰老师打开PPT，开始介绍本学期课程大纲和考核方式。教室里有些同学还带着假期残留的倦怠，哈欠声此起彼伏。你翻开课本，心里盘算着——这门课要不要认真听？',
      [
        {text:'端正坐好，认真听课',effects:{wisdom:2},
         hidden:{flags:{_attendedHanjie:true}},result:'你端正坐姿，翻开笔记本准备认真听讲。韩杰老师的课程内容紧跟时事、视野开阔，听起来比想象中有意思得多。'},
        {text:'趁还没点名，悄悄从后门溜走',effects:{health:5,happiness:4},
         result:'你趁韩杰老师低头翻PPT时悄悄从后门溜了出去。回到宿舍躺在床上刷手机——国庆后的第一天，还是对自己好一点吧。'}
      ]),
    {type:'main',tag:'课堂互动',title:'时政话题讨论',
     condSkip:function(){return !GS._attendedHanjie;},
     text:'课程进行到一半，韩杰老师抛出一个热点时政话题："近期国际形势风云变幻，哪位同学能结合新闻谈谈自己的看法？"\n\n他的目光扫过教室，最终停在了你的方向。全班同学的目光也随之转向你。',
     choices:[
       {text:'主动举手，结合新闻简要分析当前国际形势',effects:{wisdom:6},
        flags:{hanjieUnlocked:true},
        result:'你条理清晰地分析了近期国际局势的几点变化。韩杰老师频频点头，在投影屏上圈出了你提到的几个关键点，对你的见解给予了充分肯定。全班同学向你投来钦佩的目光。\n\n📌 系统提示：韩杰 教师好感度系统已解锁，可在【教师好感度】面板查看。'},
       {text:'低头回避眼神接触，假装在认真记笔记',effects:{wisdom:-4},
        flags:{hanjieUnlocked:true},
        hidden:{desc:'形势与政策评级降为合格(-)',gEffects:{xingshiZhengce:-1}},
        result:'你埋下头假装在笔记本上写着什么。韩杰老师的目光在你身上停留了两秒，然后若无其事地转向了另一位同学。你心里暗暗松了口气，但也感到一丝惭愧。\n\n⚠️ 形势与政策评级降为合格(-)\n📌 系统提示：韩杰 教师好感度系统已解锁。'}
     ]},
    {type:'auto',tag:'系统',title:'形势与政策·缺课记录',
     condSkip:function(){return GS._attendedHanjie;},
     text:'韩杰老师点完名后发现你不在教室，在考勤表上做了标记。课后辅导员在班级群里发了通知："今日形势与政策课有缺勤同学，请私下找导员说明情况。"\n\n你看着群消息，心里有些后悔——这门课似乎比想象中严格。',
     effects:{},gEffects:{xingshiZhengce:-1},setFlags:{hanjieUnlocked:true}},
    makeMainPhase('上午课程②','高等数学建模A · 任课教师：周蕊',
      '第二节课，周蕊老师抱着一摞教案走进教室。今天的内容是线性代数基础——二阶行列式的计算。\n\n周蕊老师翻开课本开始讲解行列式的定义和基本性质，黑板上渐渐写满了公式推导。课堂氛围认真而专注，周老师的讲解一如既往地清晰透彻。',
      [
        {text:'坚持上课，认真听讲做笔记',effects:{wisdom:8},
         hidden:{flags:{_attendedMath:true}},result:'你端正坐姿，跟着周蕊老师的节奏一步步推导行列式的计算过程。周老师的讲解清晰透彻，你感觉线性代数也没那么可怕。'},
        {text:'趁课间溜回宿舍补觉',effects:{health:7,happiness:6},sleepBonus:true,
         result:'你趁周老师转身写板书时悄悄从后门溜了出去。回到宿舍一头倒在床上——国庆假期后的早八实在太难顶了。不过被窝的温暖很快驱散了你的愧疚感。'}
      ]),
    {type:'conditional',tag:'系统',title:'雨课堂随机签到',
     condCustom:function(){return true;},prob:0.5,
     text_applied:'课讲到一半，周蕊老师突然停下板书，打开了雨课堂系统。投影屏上弹出签到二维码，周老师推了推眼镜："扫码签到，今天随机抽查课堂练习。"',
     sText:'点名系统启动了！屏幕上弹出了随堂练习题目。',sFlags:{_signinTriggered:true},
     fText:'雨课堂签到系统启动了，但今天运气不错——没有触发随机抽查。周蕊老师正常授课到下课。'},
    {type:'main',tag:'雨课堂',title:'雨课堂随堂测验',
     condSkip:function(){return !GS._signinTriggered||!GS._attendedMath;},
     text:'雨课堂签到系统弹出一道行列式计算题：\n\n计算二阶行列式 |1  2|\n               |4  3| 的值。\n\n请选择你的答案：',
     quizCorrectIndex:0,
     choices:[
       {text:'A. -5',effects:{},correctEffects:{wisdom:5},correctResult:'回答正确！二阶行列式 = 1×3 - 2×4 = 3 - 8 = -5。周蕊老师对你微笑点头。悟性+5。',wrongResult:'回答错误。二阶行列式 = 1×3 - 2×4 = 3 - 8 = -5，正确答案是A。本题无惩罚。'},
       {text:'B. 5',effects:{},wrongResult:'回答错误。二阶行列式计算为 ad-bc，即 1×3 - 2×4 = -5，正确答案是A。'},
       {text:'C. 11',effects:{},wrongResult:'回答错误。注意公式为 ad-bc = 1×3 - 2×4 = -5，正确答案是A。'},
       {text:'D. -11',effects:{},wrongResult:'回答错误。对角线相乘后相减：1×3 - 2×4 = -5，正确答案是A。'}
     ]},
    {type:'auto',tag:'系统',title:'雨课堂签到·缺席记录',
     condSkip:function(){return !GS._signinTriggered||GS._attendedMath;},
     text:'雨课堂签到触发——但你已经逃课了！周蕊老师发现你不在教室，在签到表上做了标记。\n\n课后辅导员找你谈话："刚放完假就逃课？下不为例。"你在辅导员办公室低着头听完了一通训话。',
     effects:{glory:-5,zhouruiFavor:-6},gEffects:{advancedMath:-5}},
    makeMainPhase('下午课程①','学术语言交流与沟通（初级）· 任课教师：Cherry',
      '下午第一节课，一位金发碧眼的年轻外教走进教室——Cherry老师，负责本学期的学术语言初级课程。她的中文带着可爱的外国口音，笑容极具感染力。\n\nCherry老师打开PPT，开始用中英双语介绍学术英语中常见的词汇和表达方式，课堂氛围轻松活泼。',
      [
        {text:'准时上课，积极参与课堂互动',effects:{wisdom:7,cherryFavor:5},
         flags:{cherryUnlocked:true},hidden:{flags:{_attendedCherry:true}},
         result:'你全程认真听讲，积极参与Cherry老师的互动环节。Cherry老师对你的表现很满意，还在你的课本上画了一个小小的笑脸。\n\n📌 系统提示：Cherry 教师好感度系统已解锁。'},
        {text:'这课没用，趁课间直接逃课',effects:{},sleepBonus:true,
         hidden:{desc:'Cherry好感大幅下降，课程成绩-2',effects:{cherryFavor:-8},gEffects:{academicLang:-2}},
         flags:{cherryUnlocked:true},
         result:'你觉得学术语言课没什么用，趁Cherry转身擦白板时悄悄溜走了。但你没想到Cherry在考勤表上做了详细记录。\n\n⚠️ Cherry好感度 -8\n⚠️ 学术语言课程预估成绩 -2\n📌 系统提示：Cherry 教师好感度系统已解锁。'}
      ]),
    {type:'conditional',tag:'系统',title:'Quizzz随堂测验',
     condCustom:function(){return true;},prob:0.5,
     text_applied:'课堂进行到一半，Cherry老师走到白板前写下一个单词：empirical。"This word will be very important in academic writing." 随后她打开了Quizzz随堂测验系统……',
     sText:'Quizzz系统随机抽取了一道词汇翻译题！',sFlags:{_quizzzTriggered:true},
     fText:'今天Quizzz系统没有触发随机测验。Cherry老师笑着说了句"Lucky you!"，继续按正常进度授课。'},
    {type:'main',tag:'Quizzz',title:'Quizzz词汇测验',
     condSkip:function(){return !GS._quizzzTriggered||!GS._attendedCherry;},
     text:'Quizzz系统弹出一道词汇翻译题：\n\n"empirical" 的中文翻译是什么？\n\n请选择正确答案：',
     quizCorrectIndex:1,
     choices:[
       {text:'A. 理论的、抽象的',effects:{},wrongResult:'回答错误。"empirical"的意思是"以观察或实验为依据的"，即实证的、经验主义的。正确答案是B。Cherry老师鼓励你再接再厉。'},
       {text:'B. 实证的、经验主义的',effects:{},correctEffects:{wisdom:4,cherryFavor:3},correctResult:'回答正确！"empirical"意为"以观察或实验为依据的"，即实证的、经验主义的。Cherry老师开心地对你竖起了大拇指。悟性+4，Cherry好感+3。',wrongResult:'回答错误。正确答案是B. 实证的、经验主义的。'},
       {text:'C. 假设的、猜想的',effects:{},wrongResult:'回答错误。"empirical"指的是基于实际观察和实验的，而非假设的。正确答案是B。'},
       {text:'D. 传统的、保守的',effects:{},wrongResult:'回答错误。"empirical"与"传统"无关，它强调的是以实证为基础。正确答案是B。'}
     ]},
    makeMainPhase('下午课后','自由活动时间',
      '一天的课程终于全部结束。下午四点，阳光透过教学楼走廊的窗户斜斜地洒在地面上。你有几个小时的自由时间，想做什么？',
      [
        {text:'回宿舍补觉休息',effects:{health:6},sleepBonus:true,result:'你回到宿舍一头倒在床上。国庆后第一天上课实在太累了，补一觉比什么都强。'},
        {text:'打开电脑打游戏放松',effects:{happiness:7},result:'你打开电脑，登录游戏，戴上耳机。几局下来，开学第一天的疲惫在虚拟世界中烟消云散。'},
        {text:'去教室安静自习',effects:{wisdom:5},result:'你来到教学楼找了一间空教室，翻开课本安安静静地学了两个小时。假期的浮躁在书页翻动间慢慢沉淀下来。'},
        {text:'前往大创中心拜访韩鹏老师',effects:{},
         cond:true,condAttr:'keChuangUnlocked',condTh:1,
         sEffects:{hanpengHaoGan:6},sText:'你来到大创中心，韩鹏老师正在整理国庆期间的科创项目材料。看到你来了，他热情地招呼你坐下，和你聊了很多关于项目的事情。韩鹏老师对你的积极性非常满意。',
         fText:'你来到大创中心门口，发现门锁着。看来韩鹏老师今天不在。也许下次再来吧。',
         result:'你来到大创中心门口，发现门锁着。看来韩鹏老师今天不在。'}
      ]),
    {type:'random',tag:'晚间随机事件',pool:'sep10'}
  ],
  gfEvent:makeGfEvent('开学疲惫',
    '漫长的一天终于结束了。苏小暖发来消息："第一天上课好累啊……你也是吧？我在操场散步吹风，要不要一起？"',
    '去操场陪她散步，聊聊今天的课',{health:3,happiness:3},{gfFavor:6},
    '你来到操场，苏小暖已经在跑道边等着了。你们并肩走了好几圈，聊着今天各自遇到的有趣老师，吐槽着早八的困意。晚风温柔，月光如水，开学第一天的疲惫在彼此的陪伴中慢慢消散。',
    '回复说太累了，想早点睡',{happiness:-4},
    '"好吧……晚安。"苏小暖的回复很简单。你躺在床上刷着手机，翻到她刚发的朋友圈——一张操场月光下的照片，配文是"一个人走完了一圈又一圈"。')
};

STORY_DAYS['2024-10-09']={
  title:'开学第三天·C++首课+ACM招新',
  phases:[
    makeMainPhase('上午课程','智能数据分析导论 · 任课教师：史鉴明',
      '上午第一节是史鉴明老师的智能数据分析导论课。史老师今天穿着一件深蓝色衬衫，精神矍铄。\n\n史老师打开PPT开始讲授数据分析的基本概念和方法论。他的讲课风格沉稳扎实，偶尔穿插一两个行业案例，课堂信息量很大。',
      [
        {text:'认真听讲，跟着老师的节奏做笔记',effects:{shijianmingFavor:5},
         hidden:{flags:{_attendedData:true}},result:'你翻开笔记本，跟着史老师的PPT一页页记录重点。数据分析这门课比想象中实用，很多案例都来自真实的商业场景。'},
        {text:'这节课没意思，趁课间直接逃课',effects:{health:6,happiness:5},sleepBonus:true,
         result:'你觉得这课太水了，趁史老师低头翻PPT时悄悄从后门溜了出去。回到宿舍躺在熟悉的床上，你长长地舒了一口气。'}
      ]),
    {type:'conditional',tag:'系统',title:'课堂纸条随机抽查',
     condCustom:function(){return true;},prob:0.8,
     text_applied:'课程进行到一半，史鉴明老师突然停下PPT，从公文包里拿出一叠纸条："今天来个临时小测验——请每位同学在纸条上写下你对大数据的理解，写上名字，下课前上交。计入平时成绩。"',
     sText:'史老师开始逐一查看上交的纸条——这次纸条上交情况要被记录了。',sFlags:{_paperTriggered:true},
     fText:'史老师收齐纸条后没有特别关注，继续正常授课到下课。'},
    {type:'main',tag:'课堂',title:'史鉴明老师走到你面前',
     condSkip:function(){return !GS._paperTriggered||!GS._attendedData;},
     text:'史鉴明老师走到了你的座位旁边，低头看了看桌面："你的纸条呢？"\n\n你这才意识到刚才光顾着听课，忘了写纸条！史老师的表情有些严肃。',
     choices:[
       {text:'赶紧道歉，当场补写纸条上交',effects:{shijianmingFavor:4},result:'你连忙道歉，飞速在纸条上写下答案双手递上。史老师接过纸条看了看，脸色缓和了一些："下次注意，不要忘了。"'},
       {text:'老实承认忘了写，没有补交',effects:{},hidden:{gEffects:{dataAnalysis:-10}},result:'你老实说忘了写。史老师没再说什么，但在花名册上你的名字旁边做了一个小小的标记。\n\n⚠️ 智能数据分析导论 预估成绩 -10'}
     ]},
    {type:'auto',tag:'系统',title:'纸条缺席记录',
     condSkip:function(){return !GS._paperTriggered||GS._attendedData;},
     text:'史鉴明老师发现你逃课且未交纸条，在平时成绩表上做了记录。\n\n班级群里助教发了通知："今日未交纸条的同学平时成绩扣除10分。"你看着群消息，心里有些后悔。',
     effects:{},gEffects:{dataAnalysis:-10}},
    makeMainPhase('上午课后','自由活动时间',
      '上午的课结束了，距离下午第一节体育课还有两个多小时。你打算怎么安排这段时间？',
      [
        {text:'回宿舍补觉休息',effects:{health:6},sleepBonus:true,result:'你回到宿舍一头倒在床上，利用午休时间美美地补了一觉。'},
        {text:'打开电脑打游戏放松',effects:{happiness:7},result:'你打开电脑打了几局游戏。虽然队友有点坑，但放松的效果拉满了。'},
        {text:'去教室安静自习',effects:{wisdom:5},result:'你来到教学楼找了一间空教室，趁着午后的安静时光预习了下午的课程。'},
        {text:'前往大创中心拜访韩鹏老师',effects:{},
         cond:true,condAttr:'keChuangUnlocked',condTh:1,
         sEffects:{hanpengHaoGan:6},sText:'你来到大创中心，韩鹏老师正在和几个学长讨论项目方案。他热情地招呼你一起参与讨论，你从中学到了不少实用的项目经验。',
         fText:'你来到大创中心门口，发现门锁着。韩鹏老师今天可能在上课。',
         result:'你来到大创中心门口，发现门锁着。韩鹏老师今天可能在上课。'}
      ]),
    makeMainPhase('下午课程','体育课',
      '下午第一节是体育课。十月的秦皇岛秋高气爽，操场上阳光明媚、凉风习习。体育老师吹响了集合哨。\n\n今天的主要内容是体能训练——800米跑+仰卧起坐+引体向上。体育老师特别强调："体能测试成绩将直接影响你们的体育课最终评估。"',
      [
        {text:'认真完成全部训练项目，全力以赴',effects:{happiness:-4,health:10},
         result:'你咬紧牙关完成了所有训练项目。800米跑到最后200米时双腿像灌了铅一样沉重，但你坚持冲过了终点线。体育老师拍了拍你的肩膀："不错，有点拼劲。"'},
        {text:'趁老师不注意摸鱼偷懒，敷衍了事',effects:{wisdom:-3,happiness:6},
         result:'你趁体育老师指导其他同学时悄悄减少了训练强度。800米慢悠悠地"跑"完，仰卧起坐也偷工减料。虽然轻松愉快，但体能没有得到什么锻炼。'}
      ]),
    makeMainPhase('下午课程②','学术语言交流与沟通（中级）· 任课教师：Tania',
      '下午第二节课，Tania老师笑盈盈地走进教室。她穿着一条碎花长裙，手里端着一杯热咖啡，整个人散发着轻松愉悦的气息。\n\nTania打开PPT，开始用英文讲解今天的课程内容。她的课堂向来气氛活跃，许多同学都积极回应着她的提问。',
      [
        {text:'认真上课，参与课堂互动',effects:{taniaFavor:5},hidden:{flags:{_attendedTania:true}},
         result:'你端正坐好准备认真听课。Tania老师对全班同学的出勤情况很满意，开始用生动的PPT讲解今天的课程内容。'},
        {text:'逃课回宿舍休息',effects:{health:5,happiness:4},sleepBonus:true,
         result:'你觉得英语课没什么压力，趁课间溜回了宿舍。躺在床上刷刷手机、看看视频，惬意无比。'}
      ]),
    {type:'main',tag:'课堂',title:'Tania的分享环节',
     condSkip:function(){return !GS._attendedTania;},
     text:'课程进行到互动环节，Tania老师笑着拍了拍手："今天课堂的主题是分享你的国庆假期——每位同学用英语简单描述假期中最难忘的一件事。"\n\n她的目光看向了你："How about you? Would you like to share something with the class?"\n\n全班同学的目光齐刷刷地转向你。',
     choices:[
       {text:'大方上台，用英语分享国庆假期经历',effects:{charm:-3,wisdom:6},
        result:'你深吸一口气走上讲台。虽然英语表达有些磕磕绊绊，但你真诚的分享赢得了全班的掌声。Tania老师笑着说："Excellent effort! Your speaking is improving!"'},
       {text:'微笑着摇头拒绝，表示自己没准备好',effects:{taniaFavor:-5},
        result:'你礼貌地摇了摇头。Tania老师表示理解，但能看出她眼中闪过一丝失望。另一位同学代替你上台做了分享。'}
     ]},
    {type:'conditional',tag:'系统',title:'Tania的课堂趣事',
     condCustom:function(){return true;},prob:0.8,
     text_applied:'课堂进行到一半，Tania老师突然笑着拍了拍手……',
     sText:'Tania开始分享她家狗狗Hugo的趣事——Hugo昨天把她备课的教案叼走藏到了沙发底下，她找了整整一个小时才找到。全班哄堂大笑。',sFlags:{_hugoTriggered:true},
     fText:'Tania老师按部就班地继续授课，今天的课堂氛围轻松而高效。'},
    {type:'main',tag:'课堂',title:'Hugo的趣事',
     condSkip:function(){return !GS._hugoTriggered||!GS._attendedTania;},
     text:'Tania老师讲得眉飞色舞，还翻出手机里Hugo的照片给大家看——一只憨态可掬的金毛犬，嘴里叼着一只拖鞋，无辜地看着镜头。\n\nTania注意到你似乎在走神，笑着问道："Are you listening？Do you like dogs？"',
     choices:[
       {text:'认真倾听，微笑回应说自己也很喜欢狗',effects:{taniaFavor:4,wisdom:-3},result:'你回过神，笑着点头说自己家里也养过一只金毛。Tania开心地和你聊了几句，课堂气氛变得更加轻松愉快。不过你确实因为聊狗而走神了几分钟……'},
       {text:'敷衍点头，低头刷手机',effects:{taniaFavor:-4,happiness:5},result:'你随口应付了一句就低头看手机了。Tania注意到你的态度，笑容淡了一些，转身继续和其他同学互动。'}
     ]},
    {type:'auto',tag:'晚间课程',title:'C++程序设计基础 · 任课教师：李国瑞',
     text:'晚上是C++程序设计基础课。一位戴着黑框眼镜、气质沉稳的年轻男老师走进教室——他叫李国瑞，负责本学期的C++课程。\n\n李国瑞老师话不多，开场就直奔主题："C++是你们专业最重要的一门语言。今晚我们从最基础的数据类型开始。"\n\n他在黑板上写下几行代码，然后打开了雨课堂："扫码签到，随堂小测验计入平时成绩。"',
     effects:{},setFlags:{_cppAttended:true}},
    {type:'main',tag:'雨课堂',title:'C++雨课堂随堂测验',
     condSkip:function(){return !GS._cppAttended;},
     text:'雨课堂系统弹出一道C++基础题：\n\n在C++中，用于定义整型变量的关键字是？\n\n请选择正确答案：',
     quizCorrectIndex:1,
     choices:[
       {text:'A. float',effects:{},flags:{liguoruiUnlocked:true},wrongResult:'回答错误。float是浮点型（小数）关键字。在C++中定义整型变量应使用 int。'},
       {text:'B. int',effects:{},correctEffects:{wisdom:6,liguoruiFavor:5},correctResult:'回答正确！int是C++中定义整型变量的关键字。李国瑞老师赞许地点了点头。悟性+6，李国瑞好感+5。',wrongResult:'回答错误。正确答案是B. int——C++中定义整型变量的关键字。',flags:{liguoruiUnlocked:true}},
       {text:'C. string',effects:{},flags:{liguoruiUnlocked:true},wrongResult:'回答错误。string是字符串类型。在C++中定义整型变量应使用 int。'},
       {text:'D. double',effects:{},flags:{liguoruiUnlocked:true},wrongResult:'回答错误。double是双精度浮点型。在C++中定义整型变量应使用 int。'}
     ]},
    makeMainPhase('晚间特殊事件','ACM俱乐部招新',
      '晚课结束后，你收拾书本准备离开教室，却在走廊里被一张巨大的海报吸引住了——ACM国际大学生程序设计竞赛（东秦站）俱乐部正在招新！\n\n海报上印着往届学长学姐在全国赛场上捧杯的照片，下方用醒目的字体写着："不限基础，只要你热爱编程！报名即送算法入门资料包。"\n\n几位俱乐部的学长在走廊里热情地发着传单。其中一个学长看到你驻足，立刻迎了上来："同学，对算法竞赛感兴趣吗？"',
      [
        {text:'报名加入ACM俱乐部！',effects:{},flags:{acmRegistered:true},
         result:'你接过报名表，郑重地填上了自己的名字和学号。学长热情地拍了拍你的肩膀："欢迎加入！每周三晚上集训，记得来。"你突然觉得大学生活又多了一份沉甸甸的期待。\n\n📌 系统提示：已报名ACM俱乐部。'},
        {text:'婉拒学长，暂时不想参加',effects:{},
         result:'你礼貌地摇了摇头，表示自己目前课业压力较大，暂时没有精力参加竞赛。学长表示理解，递给你一张传单："没关系，下学期还有春招，随时欢迎。"'}
      ]),
    {type:'random',tag:'晚间随机事件',pool:'sep9'}
  ],
  gfEvent:makeGfEvent('ACM的抉择',
    '回到宿舍后，苏小暖发来消息："听说ACM俱乐部今天在招新！你去看了吗？我有点纠结要不要报名……"\n\n她的语气中带着犹豫——她编程基础一般，但又不想错过这个机会。',
    '鼓励她一起报名，约定每周三一起去集训',{},{gfFavor:8},
    '你给她发了一大段鼓励的话。苏小暖被你的热情感染了："好！那我明天就去补报！说好了周三一起去哈～"隔着屏幕都能感受到她的开心和期待。',
    '劝她别报了，说竞赛太累不适合她',{happiness:-5},
    '"哦……好吧。"苏小暖的回复简短而失望。你后来才知道她其实很想参加，只是需要一点鼓励而已。')
};

// ==================== 10.10 全天沉浸式剧情 ====================
STORY_DAYS['2024-10-10']={
  title:'思想道德与法治首课·实验室考试通知',
  phases:[
    // Phase 1: 宋俊丽 思想道德与法治
    makeMainPhase('上午课程','思想道德与法治 · 任课教师：宋俊丽',
      '早八铃声准时划破校园清晨。秋日凉意渐浓，不少同学还赖在被窝里挣扎，节后的慵懒依旧未完全褪去。\n\n第一节是思想道德与法治课。教室座无虚席，宋俊丽老师走上讲台，一改往常纯理论讲解的模式，笑着和大家分享起个人经历。她提到自己曾受邀前往地方电视台参与专题访谈，随即投屏播放当时的现场视频，画面里记录着访谈全程与幕后花絮，课堂氛围轻松下来。老师示意全班一同观看视频。',
      [
        {text:'坐直身体，专注观看访谈视频',effects:{wisdom:5,songjunliFavor:4},
         flags:{songjunliUnlocked:true},
         result:'你认真观看了整段访谈视频。从老师的分享里收获不少见闻与感悟，宋俊丽老师在节目中的谈吐和见解令人印象深刻。课堂态度端正，老师对你投来赞许的目光。\n\n📌 系统提示：宋俊丽 教师好感度系统已解锁。'},
        {text:'低头走神，趴在桌上发呆刷手机',effects:{songjunliFavor:-4,happiness:5},
         flags:{songjunliUnlocked:true},
         result:'你趁着播放视频的空档趴在桌上发呆、刷手机，彻底放空自己。宋俊丽老师扫了一眼你所在的方向，微微皱了皱眉，但什么也没说。\n\n⚠️ 宋俊丽好感 -4\n📌 系统提示：宋俊丽 教师好感度系统已解锁。'}
      ]),
    // Phase 2: Cherry 学术语言初级
    makeMainPhase('上午课程②','学术语言交流与沟通（初级）· 任课教师：Cherry',
      '课间短暂休整后，双语课程如期开始。Cherry老师依旧热情满满，课堂侧重词汇积累与口语运用，她十分看重每一位学生的出勤状态。\n\n午后困意悄然袭来，你纠结是否前往课堂。去还是不去？',
      [
        {text:'准时前往教室上课',effects:{wisdom:6,cherryFavor:5},
         hidden:{flags:{_attendedCherry10:true}},result:'你按时抵达座位，配合老师的课堂节奏跟读单词、参与互动。Cherry老师看到全班出勤率不错，心情很好地多讲了几个有趣的词根故事。'},
        {text:'抵挡不住倦意，逃课留在宿舍',effects:{cherryFavor:-7},sleepBonus:true,
         hidden:{desc:'学术语言课程成绩-2',gEffects:{academicLang:-2}},
         result:'困意战胜了理智。你放弃本节课缩回被窝，考勤系统自动记录缺勤记录。下次见到Cherry老师恐怕要绕着走了。\n\n⚠️ Cherry好感 -7\n⚠️ 学术语言课程预估成绩 -2'}
      ]),
    // Phase 3: Quizzz trigger
    {type:'conditional',tag:'系统',title:'Quizzz随堂测验',
     condCustom:function(){return true;},prob:0.5,
     text_applied:'课堂中段，Cherry老师走到白板前开启线上单词随堂测："Let\'s do a quick vocabulary quiz——考察课内高频学术词汇，限时作答！"',
     sText:'Quizzz系统随机抽取了一道词汇翻译题！',sFlags:{_quizzzTriggered:true},
     fText:'今天Quizzz系统没有触发随机测验。Cherry老师笑着说了句"No quiz today——you guys got lucky!"继续按正常进度授课。'},
    // Phase 4: Quizzz quiz
    {type:'main',tag:'Quizzz',title:'Quizzz词汇测验',
     condSkip:function(){return !GS._quizzzTriggered||!GS._attendedCherry10;},
     text:'Quizzz系统弹出一道词汇翻译题：\n\n翻译单词 "analysis"\n\n请选择正确答案：',
     quizCorrectIndex:1,
     choices:[
       {text:'A. 总结',effects:{},wrongResult:'回答错误。"analysis"的意思是"分析"，不是"总结"。正确答案是B。Cherry老师鼓励道："Close! Keep trying!"'},
       {text:'B. 分析',effects:{},correctEffects:{wisdom:4,cherryFavor:3},correctResult:'回答正确！"analysis"即"分析"。Cherry老师开心地竖起大拇指："Perfect! You really know your vocabulary!"悟性+4，Cherry好感+3。',wrongResult:'回答错误。正确答案是B. 分析。Cherry老师微笑着让你下次注意。'},
       {text:'C. 规划',effects:{},wrongResult:'回答错误。"analysis"与"规划"(planning)无关，它的核心含义是"分析、解析"。正确答案是B。'},
       {text:'D. 汇报',effects:{},wrongResult:'回答错误。"analysis"不是"汇报"(report)，而是指对事物进行"分析"的过程。正确答案是B。'}
     ]},
    // Phase 5: 中午随机事件
    {type:'random',tag:'午间随机事件',pool:'oct10'},
    // Phase 6: 周蕊 高数
    makeMainPhase('下午课程','高等数学建模A · 任课教师：周蕊',
      '午休结束，重新回到课堂。本节课继续讲解线性代数相关知识点，黑板上写满矩阵运算习题，公式繁复。\n\n困意再次涌上，你在留在教室听课和回宿舍补觉之间犹豫不决。',
      [
        {text:'强打精神，坚持留在教室听课',effects:{wisdom:7},
         hidden:{flags:{_attendedMath10:true}},result:'你用冷水洗了把脸，重新坐回座位。周蕊老师今天讲的矩阵运算虽然复杂，但逻辑清晰。你跟着一步步推导，渐渐忘记了困意。'},
        {text:'索性放下课业，逃课回宿舍睡大觉',effects:{happiness:6,health:7},sleepBonus:true,
         result:'你实在扛不住困意，收拾书包悄悄从后门溜了。回到宿舍一头倒在床上——午后补觉的滋味，比任何咖啡都管用。'}
      ]),
    // Phase 7: 雨课堂 trigger
    {type:'conditional',tag:'系统',title:'雨课堂随机签到',
     condCustom:function(){return true;},prob:0.5,
     text_applied:'课讲到一半，周蕊老师突然停下板书。"大家拿出手机，雨课堂临时限时小测——题目围绕当堂线性代数知识点。"',
     sText:'手机弹出雨课堂答题界面！',sFlags:{_signinTriggered10:true},
     fText:'周蕊老师检查了雨课堂系统，发现今天没有触发随机测验。她笑了笑："看来今天运气不错——继续上课。"'},
    // Phase 8: 雨课堂 quiz
    {type:'main',tag:'雨课堂',title:'雨课堂随堂测验',
     condSkip:function(){return !GS._signinTriggered10||!GS._attendedMath10;},
     text:'雨课堂系统弹出一道行列式计算题：\n\n计算二阶行列式 |3  0|\n               |2  4| 的值。\n\n请选择你的答案：',
     quizCorrectIndex:0,
     choices:[
       {text:'A. 12',effects:{},correctEffects:{wisdom:5},correctResult:'回答正确！二阶行列式 = 3×4 - 0×2 = 12 - 0 = 12。周蕊老师赞许地点了点头。悟性+5。',wrongResult:'回答错误。二阶行列式 = 3×4 - 0×2 = 12，正确答案是A。本题无惩罚。'},
       {text:'B. 8',effects:{},wrongResult:'回答错误。行列式计算为 ad-bc = 3×4 - 0×2 = 12，正确答案是A。'},
       {text:'C. 6',effects:{},wrongResult:'回答错误。注意计算：3×4 - 0×2 = 12 - 0 = 12，正确答案是A。'},
       {text:'D. 10',effects:{},wrongResult:'回答错误。对角线相乘后相减：3×4 - 0×2 = 12，正确答案是A。'}
     ]},
    // Phase 9: 雨课堂 penalty
    {type:'auto',tag:'系统',title:'雨课堂签到·缺勤记录',
     condSkip:function(){return !GS._signinTriggered10||GS._attendedMath10;},
     text:'你正在宿舍休息，手机弹出雨课堂签到答题提醒——但你已经逃课了！缺勤、未完成答题的记录同步至教师后台，周蕊老师对你的出勤表现进行了标记。\n\n班级群里助教发了群公告："今日雨课堂未签到同学请注意，缺勤记录已备案。"',
     effects:{glory:-5,zhouruiFavor:-6},gEffects:{advancedMath:-5}},
    // Phase 10: 自由活动五选一
    {type:'main',tag:'自由活动',title:'下午自由时光',
     text:'下午第一节课结束后，今日白天课程全部结束。校园里的氛围变得轻松起来，阳光透过树叶洒在主干道上，微凉的秋风拂过脸颊。\n\n你拥有整块自由时间，打算如何安排这段时光？',
     choices:[
       {text:'回宿舍睡觉，缓解全天上课的疲惫',effects:{health:6},sleepBonus:true,result:'你回到宿舍一头倒在床上，闭上眼睛让自己彻底放松。今天课程排得确实紧凑，补一觉比什么都强。'},
       {text:'回宿舍打游戏，抛开课业压力',effects:{happiness:7},result:'你打开电脑，戴上耳机。几局游戏下来，今天所有上课的疲劳都在虚拟世界中烟消云散。'},
       {text:'留在教室学习，梳理今日各科知识点',effects:{wisdom:5},result:'你翻开笔记本，把今天各科的重点内容逐一复盘整理。看着满满当当的笔记，心里莫名有种踏实感。'},
       {text:'前往大创中心，和韩鹏老师交流项目进度',effects:{},
        cond:true,condAttr:'keChuangUnlocked',condTh:1,
        sEffects:{hanpengHaoGan:6},sText:'你来到大创中心，韩鹏老师正在调试一台新到的实验设备。看到你来，他热情地邀你一起动手操作，边做边讲解原理。一个下午下来收获远超预期。',
        fText:'你来到大创中心门口，发现门锁着。韩鹏老师今天可能外出开会了。',
        result:'你来到大创中心门口，发现门锁着。'},
       {text:'约女友出来，结伴漫步校园闲逛周边',effects:{},
        cond:true,condAttr:'gfUnlocked',condTh:1,
        sEffects:{gfFavor:8},sText:'你给女友发了条消息，两人约在图书馆门口碰头。你们并肩在校园里漫步，路过小花园、穿过林荫道，又去校门口的小吃街买了两杯奶茶。夕阳把你们的身影拉得很长，她说今天是她这周最开心的一天。',
        fText:'你突然想起自己还没有女朋友，苦笑了一下。',
        result:'你突然想起自己还没有女朋友，苦笑了一下。'}
     ]},
    // Phase 11: 水票特殊事件
    {type:'main',tag:'特殊事件',title:'大二学长收取鹏远水票',
     condSkip:function(){return !GS.hasPengyuanCard;},
     text:'你走在宿舍楼道里，迎面碰到几名大二学长。为首的一个手里拿着一张登记表，看到你便热情地迎了上来。\n\n"学弟！我们在回收鹏远公寓水票——你之前办鹏远卡的时候不是附赠了面额100的水票吗？现在可以以50金钱的价格把水票转给我们，你拿着钱买啥都行，水票放着不用也是浪费。"',
     choices:[
       {text:'同意出售水票，拿50金钱走人',effects:{money:50},
        result:'你点了点头，学长立刻在登记表上写了几笔。你收到了50元现金，水票正式易主。虽然以后打水要自掏腰包了，但50块钱拿在手里也挺实在。'},
       {text:'婉拒学长，保留水票自己用',effects:{},
        result:'你摆摆手表示不卖。学长也不勉强，笑着说"行，留着也行，打水方便"，转身去敲隔壁宿舍的门了。'}
     ]},
    // Phase 12: 实验室考试通知
    {type:'main',tag:'重要通知',title:'实验室考试通知',
     text:'公告栏和班级群同步下发了一份正式通知：\n\n━━━━━━━━━━━━━━\n📋 【实验室考试通知】\n\n⏰ 时间：10月25日之前完成\n🔗 方式：扫描文件内二维码登录系统答题\n👤 账号：个人学号\n🔑 初始密码：123456（登录后请自行修改）\n\n📝 规则：考试次数不限，系统取历史最高分作为最终成绩；试卷满分100分，90分及以上为及格。\n\n✍️ 补充要求：考试完成后必须线上签署诚信承诺书，才算考核完毕。\n\n⚠️ 惩处规则：未在规定时限完成考试，或最终成绩不及格，将永久失去实验室准入资格。\n\n📎 具体操作细则查看附件文档。\n━━━━━━━━━━━━━━',
     choices:[
       {text:'现在就扫码登录系统完成考试',effects:{wisdom:3},
        result:'你当场掏出手机扫码登录系统，认真完成了全部试题并提交。随后在线签署了诚信承诺书，系统显示"考核已完成，成绩：合格"。你长舒一口气——这件事从待办清单上划掉了。\n\n📌 实验室考试已完成，无需再跟进。'},
       {text:'暂时搁置，打算之后再安排时间处理',effects:{},
        result:'你把通知截了个图存进手机相册，打算过几天再处理。\n\n📌 事件已记录在待办列表，须在10月25日前完成。'}
     ]},
    // Phase 13: 晚间合唱训练
    {type:'main',tag:'晚间活动',title:'班级合唱训练',
     text:'夜幕降临，班级全员集结到指定场地开展合唱训练。班委在队伍前方大声提醒全体同学，声音传遍整个场地：\n\n"大家互相提醒一下班里同学哈！本次合唱训练服装统一穿着长袖长裤款军训服，各位抓紧找找自己的军训装备。如果有同学找不到、没有备用服装，看看身边室友、同学谁有多的，互相转借一下，保证全员着装统一！"\n\n全体同学开始翻找衣物、互相协调借服装。你环顾四周——有人从箱底翻出皱巴巴的军训服，有人正焦急地打电话借衣服。合唱训练即将正式开始。',
     choices:[
       {text:'积极帮忙协调，主动借出多余的军训服给需要的同学',effects:{charm:5,happiness:3},result:'你翻出箱子里的备用军训服递给了隔壁宿舍的同学。对方连声道谢，周围的同学也对你投来赞许的目光。训练开始后的合唱声格外响亮，班级凝聚力+1。'},
       {text:'安静整理好自己的服装，专注于合唱训练本身',effects:{happiness:4,singing:6},result:'你不慌不忙地穿好自己的军训服，安静地站到队列中。随着指挥的手势，你认真地跟着每一个节拍和音调。'},
       {text:'趁乱偷懒，躲在队伍后排摸鱼',effects:{happiness:8,singing:-3},result:'你趁大家都在忙乱时悄悄缩到了队伍后排。合唱时嘴皮子动动但没出声，虽然轻松，但指挥老师朝你这边看了好几眼。'}
     ]}
  ],
  gfEvent:makeGfEvent('忙碌的一天',
    '一整天的课程和合唱训练终于结束了。苏小暖在宿舍楼下等你，手里提着两瓶矿泉水。她把其中一瓶递给你："今天辛苦了——我看你课表排得满满的，晚上还合唱训练，嗓子都哑了吧？"',
    '接过水，和她一起在楼下长椅上坐一会儿',{health:2,happiness:4},{gfFavor:7},
    '你们并肩坐在宿舍楼下的长椅上。夜晚的校园格外安静，路灯昏黄的光洒在地面上。她聊着今天上课时发生的趣事，你讲着合唱训练时的混乱场面。秋夜微凉，但彼此的陪伴让心里格外温暖。',
    '接过水说了声谢谢就匆匆上楼了',{happiness:-4},
    '"嗯……晚安。"苏小暖站在原地，看着你头也不回地走进了宿舍楼。她低头看了看手中剩下的一瓶水——那是她给自己买的。在楼下站了一会儿，她才转身慢慢走回了自己的宿舍。')
};

STORY_DAYS['2024-10-11']={
  title:'开学第五天·普通话报名+晨曦杯+合唱彩排',
  phases:[
    // Phase 1: Tania 学术语言中级 上课/逃课
    makeMainPhase('上午课程①','学术语言交流与沟通（中级）· 任课教师：Tania',
      '早八课堂准时开始，Tania老师依旧温柔亲和地走进教室，手里端着一杯热拿铁。秋日的晨光透过窗帘洒在讲台上，课堂氛围轻松惬意。\n\nTania打开PPT，微笑着用英文向全班问好："Good morning everyone! Today we\'ll continue with our speaking practice——and I have something fun planned." 她顿了顿，目光扫过全班，"国庆假期刚过不久，我们来聊聊你们的假期生活。"',
      [
        {text:'前往教室上课，积极参与课堂互动',effects:{wisdom:7,taniaFavor:5},
         hidden:{flags:{_attendedTania11:true}},
         result:'你准时抵达教室入座，跟着Tania的课堂节奏一步步进行口语练习。Tania的讲课风格一如既往地轻松自然，你在互动环节主动用英文回答了几个问题，Tania对你的课堂表现很满意。'},
        {text:'贪恋温暖被窝，逃课在宿舍睡大觉',effects:{health:6,happiness:5},sleepBonus:true,
         result:'秋日早晨的被窝实在太有诱惑力了。你翻了个身，把被子裹得更紧了些——Tania的课虽然有趣，但早八的困意战胜了一切。你在宿舍安稳地补了一整个早上的觉。'}
      ]),
    // Phase 2: Tania 分享环节
    {type:'main',tag:'课堂互动',title:'Tania邀请你上台分享国庆生活',
     condSkip:function(){return !GS._attendedTania11;},
     text:'课堂互动环节进行到一半，Tania老师笑盈盈地走到讲台中央，随机点名——她的目光恰好落在了你身上。\n\n"How about you? Would you like to come up and share something about your National Day holiday? Just a few sentences——don\'t worry about being perfect!"\n\n全班同学的目光齐刷刷地转向你。Tania的眼神里满是鼓励和期待。',
     choices:[
       {text:'大方上台，用英文分享国庆假期经历',effects:{charm:-3,wisdom:6},
        result:'你深吸一口气，大方地走上讲台。虽然英文表达有些磕磕绊绊，有些单词还需要Tania帮忙补充，但你真诚的分享和毫不怯场的态度赢得了全班的掌声。Tania老师笑着说："Excellent! That took real courage——your speaking is improving every week!"'},
       {text:'腼腆摇头拒绝，不愿当众展示自己',effects:{taniaFavor:-5},
        result:'你腼腆地摇了摇头，小声说了句"Sorry, I\'m not ready." Tania老师表示理解，微笑着转向了另一位举手的同学。但你注意到她在花名册上你的名字旁边轻轻画了一个小小的记号——课堂积极性这一栏，今天恐怕要扣分了。'}
     ]},
    // Phase 3: Hugo趣事 trigger
    {type:'conditional',tag:'课堂趣事',title:'Tania分享Hugo老师日常趣事',
     condCustom:function(){return true;},prob:0.8,
     text_applied:'课堂闲聊放松环节到了。Tania老师突然笑出声来，拍了拍手示意全班安静："Okay, I have to tell you guys something funny——关于Hugo老师的！"\n\n全班同学顿时来了精神，大家都知道Tania老师家的金毛犬Hugo，也听说过Hugo老师的各种搞笑传闻。',
     sText:'Tania开始绘声绘色地讲起Hugo老师最近的糗事，全班笑成一团。',sFlags:{_hugoTriggered11:true},
     fText:'Tania老师看了看时间，决定今天不讲闲话了——课程进度有点紧，她直接切回了正课内容。'},
    // Phase 4: Hugo趣事 choice
    {type:'main',tag:'课堂趣事',title:'Tania的欢乐分享',
     condSkip:function(){return !GS._hugoTriggered11||!GS._attendedTania11;},
     text:'Tania老师讲得眉飞色舞，模仿Hugo老师的语调和动作，把全班逗得前仰后合。她注意到你也在笑着听，便冲你眨了眨眼："See? Teachers have funny lives too!"\n\n不过说实话，听老师闲聊虽然开心，但确实有点耽误课堂进度——你瞥了一眼黑板上还只写了一半的板书。',
     choices:[
       {text:'放下笔专注倾听，享受难得的轻松时刻',effects:{taniaFavor:4,wisdom:-3},
        result:'你索性合上课本，专心听Tania分享。教室里笑声不断，师生之间的距离在欢声笑语中拉近了不少。不过等Tania终于讲完回到正课时，你发现黑板上已经写满了新的知识点——刚才走神的那几分钟，可能需要课后花时间补回来了。'},
       {text:'低头翻看课本，不予倾听，抓紧时间自学',effects:{taniaFavor:-4,happiness:5},
        result:'你低下头，把注意力转回课本上。Tania注意到了你的冷淡反应，脸上闪过一丝失落，但她没有说什么，只是继续和其他认真听的同学互动。你利用这段时间多看了几页课本内容，心情莫名地轻松自在——偶尔做一次"不合群"的人，其实也挺舒服的。'}
     ]},
    // Phase 5: 自由活动五选一
    {type:'main',tag:'自由活动',title:'上午自由时光',
     text:'上午第一节课结束，第二节没有排课，整个上午后半段完全自由。秋日阳光透过教学楼走廊的窗户斜斜地洒在地面上，校园里的银杏叶开始泛黄，微凉的秋风裹挟着桂花的香气。\n\n你站在教学楼门口伸了个懒腰，打算如何安排这段自由时光？',
     choices:[
       {text:'回宿舍睡觉，享受秋日上午的慵懒',effects:{health:6},sleepBonus:true,
        result:'你回到宿舍一头倒在床上。上午没课的日子，补觉是性价比最高的选择——闭上眼睛，整个人陷在柔软的被子里，秋日凉爽的微风从半开的窗户吹进来，惬意至极。'},
       {text:'回宿舍打游戏，放松紧绷的神经',effects:{happiness:7},
        result:'你打开电脑，登录游戏，戴上耳机。几局下来，早八的疲惫和课堂的紧张在虚拟世界中烟消云散。虽然室友推门进来时投来了"又在打游戏"的眼神，但你毫不在意。'},
       {text:'留在教室安静学习，梳理今日课程',effects:{wisdom:5},
        result:'你找了一间没人的空教室，翻开笔记本把Tania课上讲的重点词汇和句型重新整理了一遍。安静的教室里只有笔尖划过纸面的沙沙声，专注的时光总是过得特别快。'},
       {text:'前往大创中心拜访韩鹏老师',effects:{},
        cond:true,condAttr:'keChuangUnlocked',condTh:1,
        sEffects:{hanpengHaoGan:6},sText:'你来到大创中心，韩鹏老师正在调试一台新到的3D打印机。看到你来，他热情地招手让你过去帮忙。你们一边调试设备一边聊着最近的科创比赛动向，韩老师还分享了不少实用的项目经验。一个上午的交流让你收获颇丰。',
        fText:'你来到大创中心门口，发现门锁着，里面空无一人。韩鹏老师今天可能外出开会了。也许下午再来看看？',
        result:'你来到大创中心门口，发现门锁着，里面空无一人。'},
       {text:'约女友出来，在校园里漫步闲逛',effects:{},
        cond:true,condAttr:'gfUnlocked',condTh:1,
        sEffects:{gfFavor:8},sText:'你给女友发了条消息，两人约在图书馆门口碰头。秋日的校园美得像一幅油画——银杏叶铺满小径，桂花香飘满空气。你们并肩走了很久，聊着这周的课、吐槽着早八的困、分享着各自遇到的趣事。她说这样的时光是忙碌学业里最好的充电方式。',
        fText:'你翻出手机通讯录——才想起来，你现在还是单身，哪来的女友？也许以后会有机会的。',
        result:'你翻出手机通讯录——才想起来，你现在还是单身。'}
     ]},
    // Phase 6: 普通话考试报名
    {type:'main',tag:'📢 通知',title:'全国普通话水平测试·校内统一报名',
     text:'班级群突然弹出一条官方通知，辅导员张银雪老师@了全体成员：\n\n📢 全国普通话水平测试（PSC）校内统一报名通道已开启！\n📅 考试时间：11月中旬（具体日期另行通知）\n💰 报名费用：25元/人\n📝 报名截止：10月18日17:00前\n⚠️ 逾期不予补报，请同学们相互转告！\n\n普通话水平等级证书是教师资格认定、公务员考试等重要环节的必备材料。你仔细看了看通知，考虑要不要趁这次统一报名的机会先把名报了。',
     choices:[
       {text:'果断报名，缴纳考试费用',effects:{money:-25},flags:{putonghuaRegistered:true},
        result:'你扫码支付了25元报名费，在群在线表格里填上了自己的名字。虽然还不确定普通话考试到底有多难，但多一张证书总没有坏处——何况25元的价格比外面自己报名还便宜了一些。\n\n📌 系统提示：普通话考试已报名，后续将解锁相关考核剧情。'},
       {text:'暂时不报名，以后再说',effects:{},
        result:'你想了想，觉得现在报名还太早——离截止日期还有一周呢，不急。你把通知截图存了下来，打算过几天再决定。'}
     ]},
    // Phase 7: 晨曦杯主持人大赛报名
    {type:'main',tag:'🎤 通知',title:'第二届"晨曦杯"主持人大赛·院内选拔',
     text:'普通话报名的事刚放下，又一条消息弹了出来——这次是学生会宣传部发的，排版花里胡哨、感叹号拉满：\n\n🎤百年征程自强不息，凝心聚力再创辉煌——第二届"晨曦杯"主持人大赛震撼来袭！！\n☀️一支话筒，便可挥斥方遒！\n让热爱绽放，让梦想启航！\n灯光已就位，舞台已搭好！\n快来秀出你的"十八般武艺"，\n我们期待才华横溢的你！✨\n【比赛奖励】：魅力加成与荣耀奖励\n⚠️活动现阶段为院内主持人选拔赛\n想要了解更多，请加入选拔赛群（870158441）\n具体赛制和时间将在群里通知( ⌯\' \'⌯)📣\n\n🌱风劲好扬帆，奋进正当时！机不可失，失不再来，快来成为万众瞩目的主角，在舞台上施展你那无穷的魅力与才华吧！',
     choices:[
       {text:'热血沸腾，果断报名参赛！',effects:{},flags:{zhuchirenRegistered:true},
        cond:true,condAttr:'singing',condTh:101,
        sEffects:{charm:10,glory:10},
        sText:'你毫不犹豫地填了报名表。站在镜子前试了一段即兴主持——声音洪亮、台风稳健、表情自然，连路过的室友都忍不住给你鼓掌。以你目前的歌唱与舞台功底，这次院内选拔简直是为你量身定做的舞台。\n\n✨ 歌唱能力>100，舞台表现力出众！魅力+10，荣耀+10',
        fEffects:{charm:-5,glory:-2},
        fText:'你怀着满腔热血填了报名表。然而站在镜子前试着练了一段开场白后，你发现自己的声音有些发颤、手势也不太自然……舞台这条路，似乎比想象中要难走不少。但不管怎样，迈出第一步总是好的。\n\n😥 歌唱能力≤100，初次登台表现青涩。魅力-5，荣耀-2'
       },
       {text:'有自知之明，放弃报名',effects:{},
        result:'你仔细想了想——主持人在聚光灯下被全校师生盯着看，万一忘词了岂不是社死现场？你默默关掉了通知，决定把舞台留给更有勇气的人。'}
     ]},
    // Phase 8: 史鉴明 数据分析 上课/逃课
    makeMainPhase('下午课程①','智能数据分析导论 · 任课教师：史鉴明',
      '午休过后，下午第一节是史鉴明老师的智能数据分析导论课。午后的困意如潮水般涌来，你在去教室和回宿舍之间做着艰难的思想斗争。\n\n史鉴明老师是出了名的课堂纪律严格——每节课都会布置随堂纸条作业，计入平时成绩，缺勤等同于双重扣分。但同时，他的课确实干货满满，对数据分析思维的培养非常有帮助。',
      [
        {text:'坚持前往教室上课，遵守课堂纪律',effects:{shijianmingFavor:5},
         hidden:{flags:{_attendedData11:true}},
         result:'你用冷水洗了把脸，强撑着精神走进了教室。史鉴明老师已经在讲台上调试PPT了——还好你来了，他的目光在教室里扫了一圈，在你的座位方向停留了一秒，微微点了点头。'},
        {text:'抵挡不住午后困意，逃课回宿舍睡觉',effects:{health:6,happiness:5},sleepBonus:true,
         result:'困意最终战胜了理智。你转身朝宿舍楼走去，一头倒在床上——午后的阳光透过窗帘洒在被子上，暖洋洋的。史鉴明老师的课？下次一定认真上……下次一定。'}
      ]),
    // Phase 9: 纸条 trigger
    {type:'conditional',tag:'课堂测验',title:'史鉴明老师发起随堂纸条答题',
     condCustom:function(){return true;},prob:0.8,
     text_applied:'课程进行到一半，史鉴明老师突然停下PPT，从公文包里拿出一叠空白纸条："每位同学在纸条上写下你对大数据的理解——不少于50字，署名后下课前上交。计入平时成绩，未交者按缺作业处理。"\n\n教室里顿时响起一片翻书声和窃窃私语。',
     sText:'史老师开始逐一查看上交的纸条——这次纸条作业要被记录了。',sFlags:{_paperTriggered11:true},
     fText:'今天史老师似乎心情不错，临时决定取消纸条作业。他摆了摆手："今天讲的内容比较多，纸条作业下次再说。"你松了一口气。'},
    // Phase 10: 纸条 choice
    {type:'main',tag:'课堂测验',title:'纸条作业——你对大数据的理解',
     condSkip:function(){return !GS._paperTriggered11||!GS._attendedData11;},
     text:'史鉴明老师走到了你的座位旁边，低头看了看你的桌面："你的纸条呢？"\n\n周围同学都埋着头奋笔疾书，你能感觉到史老师的目光正等待你的回应。',
     choices:[
       {text:'认真完成课堂习题，按时上交答题纸条',effects:{shijianmingFavor:4},
        result:'你迅速组织语言，在纸条上工整地写下了自己对大数据的理解——从数据采集到分析应用，把课上讲的知识点和自己的思考都写了进去。史老师接过纸条扫了一眼，微微点头，在你的名字旁边打了一个勾。"不错，有自己的见解。"'},
       {text:'偷懒敷衍，拒绝上交答题纸条',effects:{},
        hidden:{desc:'数据分析课程成绩-10',gEffects:{dataAnalysis:-10}},
        result:'你随口说了句"忘了写"。史老师没有多说什么，但在他转身离开时，你清楚地看到他在花名册上你的名字旁边画了一个叉。\n\n⚠️ 智能数据分析导论 预估成绩 -10'}
     ]},
    // Phase 11: 纸条缺席记录
    {type:'auto',tag:'系统',title:'纸条作业·缺交记录',
     condSkip:function(){return !GS._paperTriggered11||GS._attendedData11;},
     text:'史鉴明老师收齐纸条后核对了一遍花名册——你既不在教室，也没有交纸条。缺勤加缺作业，双重记录同步至教师后台。\n\n班级群里助教发了通知："今日未交纸条的同学平时成绩扣除10分。"你看着群消息，心里有些后悔。',
     effects:{},gEffects:{dataAnalysis:-10}},
    // Phase 12: 周蕊 高数 上课/逃课
    makeMainPhase('下午课程②','高等数学建模A · 任课教师：周蕊',
      '下午最后一节文化课，周蕊老师抱着一摞厚厚的教案走进教室。黑板上很快写满了线性代数的公式推导和矩阵运算习题——今天继续深入讲解行列式与矩阵的核心考点，公式一个比一个长，推导一步比一步繁复。\n\n午后疲惫感被满黑板的数学符号放大了十倍。你在听课和逃课之间反复横跳，内心天人交战。',
      [
        {text:'强撑精神坚持去教室听课',effects:{wisdom:7},
         hidden:{flags:{_attendedMath11:true}},
         result:'你咬紧牙关坐在教室里，跟着周蕊老师的板书一步步推导。虽然困得眼睛都快睁不开了，但周老师清晰的讲解让你硬是跟上了节奏。线性代数这东西，一旦理解了逻辑，其实也没那么可怕——至少今天的笔记记了满满三页。'},
        {text:'直接逃课回宿舍，逃避枯燥的数学课',effects:{happiness:6,health:7},sleepBonus:true,
         result:'你实在受不了了。趁周老师转身擦黑板时，你悄悄从后门溜了出去。回到宿舍一头倒在床上——远离了矩阵和行列式的世界，整个人都轻松了。至于周蕊老师会不会发现……这个问题留到明天再想吧。'}
      ]),
    // Phase 13: 雨课堂 trigger
    {type:'conditional',tag:'系统',title:'雨课堂随机签到',
     condCustom:function(){return true;},prob:0.5,
     text_applied:'课讲到一半，周蕊老师突然停下板书，打开了雨课堂系统。投影屏上弹出签到二维码，周老师推了推眼镜："扫码签到——今天系统会随机抽取一道课堂练习题，检验大家对刚才所讲内容的掌握程度。"',
     sText:'手机弹出雨课堂答题界面——随堂测验来了！',sFlags:{_signinTriggered11:true},
     fText:'雨课堂系统启动了，但今天运气不错——随机抽查没有抽到你们班。周蕊老师正常授课到下课。'},
    // Phase 14: 雨课堂 quiz (三阶单位矩阵)
    {type:'main',tag:'雨课堂',title:'雨课堂随堂测验',
     condSkip:function(){return !GS._signinTriggered11||!GS._attendedMath11;},
     text:'雨课堂系统弹出一道线性代数随堂练习题：\n\n已知三阶单位矩阵，其主对角线元素分别为？\n\nA. 1  1  1\nB. 0  0  0\nC. 1  0  0\nD. 0  1  0\n\n请选择你的答案：',
     quizCorrectIndex:0,
     choices:[
       {text:'A. 1  1  1',effects:{},correctEffects:{wisdom:5},correctResult:'回答正确！单位矩阵的主对角线元素全为1，其余位置全为0。三阶单位矩阵主对角线元素为1、1、1。周蕊老师对你微笑点头。悟性+5。',wrongResult:'回答错误。单位矩阵的定义是主对角线元素全为1、其余位置全为0。三阶单位矩阵的主对角线元素为1、1、1，正确答案是A。本题无惩罚。'},
       {text:'B. 0  0  0',effects:{},wrongResult:'回答错误。主对角线元素全为0的矩阵是零矩阵，不是单位矩阵。单位矩阵的主对角线元素全为1。正确答案是A。'},
       {text:'C. 1  0  0',effects:{},wrongResult:'回答错误。三阶矩阵主对角线有三个位置，分别是第1行第1列、第2行第2列、第3行第3列，三个元素都是1。正确答案是A。'},
       {text:'D. 0  1  0',effects:{},wrongResult:'回答错误。单位矩阵的每一个主对角线元素都是1，不存在0。三阶单位矩阵主对角线为1、1、1。正确答案是A。'}
     ]},
    // Phase 15: 雨课堂缺席
    {type:'auto',tag:'系统',title:'雨课堂签到·缺勤记录',
     condSkip:function(){return !GS._signinTriggered11||GS._attendedMath11;},
     text:'你正在宿舍休息，手机弹出雨课堂签到答题提醒——但你已经逃课了！缺勤、未完成随堂练习的记录同步至教师后台。\n\n班级群里助教发了群公告："今日雨课堂未签到同学请注意，缺勤记录已备案。"周蕊老师对你的出勤表现进行了标记。',
     effects:{glory:-5,zhouruiFavor:-6},gEffects:{advancedMath:-5}},
    // Phase 16: 合唱训练通知
    {type:'auto',tag:'📢 通知',title:'10.11合唱训练安排',
     text:'晚间时分，合唱团负责人发来今晚的正式训练通知：\n\n🌟10.11合唱安排🌟\n🔺集合时间：18:30\n🔺集合地点：科技楼正门内东侧\n集体紧密大队形，辛苦合唱负责人帮忙组织一下～\n🔺如需请假请于17:00前联系辅导员老师说明缘由，经同意后，请将请假记录发给纪检部负责人（878914510），截至17:30。\n\n🔴训练安排：学校彩排！！\n1.进行两次彩排，现场听从安排\n2.彩排空闲时间温习动作，完善细节\n\n🔴注意事项：\n1.彩排现场候场时保持安静\n2.举旗动作规范（可查看先前发布的图片/视频温习）\n\n⚠️渐入秋冬，天气愈加寒凉，夜晚更甚！！！请大家一定注意多添衣物以及秋冬外套！！！\n\n你看着手机上这条通知，默默裹紧了外套——十月的秦皇岛，晚上的风确实越来越硬了。',
     effects:{}},
    // Phase 17a: 文艺部冲突 - 文艺部成员
    {type:'auto',tag:'冲突事件',title:'文艺部学姐粗暴抢夺新生帽子',
     condSkip:function(){return GS.clubType!=='文艺部';},
     text:'全员在科技楼门口列队等待合唱彩排，现场人声嘈杂、秩序混乱。突然，人群中传来一阵骚动——一名文艺部学姐态度蛮横地走到一个新生面前，二话不说直接伸手抓向新生头上的帽子，动作粗暴无礼，新生被推得踉跄了一步。\n\n"你这帽子不符合合唱服装要求，给我摘下来！"学姐的声音又尖又响，周围所有同学都皱起了眉头。\n\n身为文艺部内部成员，你感到周围的同学纷纷向你投来不满的目光——部门人员的恶劣行为牵连到了你的个人声望。虽然你什么都没做，但"文艺部的人欺负新生"这句话已经在人群中传开了。',
     effects:{glory:-10},
     setFlags:{}},
    // Phase 17b: 文艺部冲突 - 非文艺部成员
    {type:'main',tag:'冲突事件',title:'文艺部学姐粗暴抢夺新生帽子',
     condSkip:function(){return GS.clubType==='文艺部';},
     text:'全员在科技楼门口列队等待合唱彩排，现场人声嘈杂、秩序混乱。突然，人群中传来一阵骚动——一名文艺部学姐态度蛮横地走到一个新生面前，二话不说直接伸手抓向新生头上的帽子，动作粗暴无礼，新生被推得踉跄了一步。\n\n"你这帽子不符合合唱服装要求，给我摘下来！"学姐的声音又尖又响。周围的同学面面相觑，有人小声嘀咕："这也太过分了吧……"不少人掏出了手机。\n\n现场气氛凝固了。你亲眼目睹了这一幕，手机就在口袋里。',
     choices:[
       {text:'将现场实拍照片发布至校园贴吧曝光',effects:{happiness:-5,wisdom:5},
        result:'你看不惯学姐的霸道行为，掏出手机拍下了现场照片，匿名发布到了校园贴吧。帖子很快被大量转发和评论，不少同学在评论区声援被欺负的新生。\n\n然而没过多久，辅导员张银雪就通过发帖IP找到了你。办公室里，张老师叹了口气："你的出发点是好的——但这种事应该先反映给老师，而不是直接发到网上。"经过一番长谈，你对校园事务的处理方式有了更成熟的认知。\n\n😔 幸福-5（被约谈的滋味不好受）\n📖 悟性+5（经过反思，心智得到提升）'},
       {text:'收起手机，视而不见，不去惹麻烦',effects:{happiness:-2},
        result:'你把手机塞回了口袋。虽然看不惯学姐的行为，但你不想惹麻烦——多一事不如少一事。\n\n合唱彩排如常进行，但你心里总觉得堵得慌。目睹不公却选择沉默，这种感觉比被冷风吹一晚上还难受。\n\n😔 幸福-2（目睹不公却未能发声）'}
     ]}
  ],
  gfEvent:makeGfEvent('合唱彩排后的夜晚',
    '漫长的合唱彩排终于结束了。你在科技楼门口站了一个多小时，嗓子喊哑了，腿也站麻了。苏小暖从人群中挤过来，手里端着一杯热乎乎的姜茶——不知道她从哪里搞来的。\n\n"快喝了吧，我从食堂阿姨那里讨的——天冷了，别感冒。"她把杯子塞到你手里，指尖冰凉，笑容却暖得不像话。',
    '接过姜茶，和她一起在校园里走一走',{health:2,happiness:3},{gfFavor:7},
    '你们并肩走在夜晚的校园里。银杏叶在路灯下泛着金色的光，呼出的白气在冷空气中凝成小小的雾团。她讲着今晚彩排的各种小插曲，你吐槽着文艺部学姐的恶劣行为。姜茶暖了胃，她的陪伴暖了心。走到她宿舍楼下时，她回头冲你笑了笑："明天见——记得多穿点！"',
    '接过姜茶说了声谢谢，匆匆赶回宿舍取暖',{happiness:-4},
    '"嗯……那你早点休息。"苏小暖站在原地，看着你的背影消失在宿舍楼门口。冷风吹过来，她把剩下那杯姜茶揣在怀里，一个人慢慢走回了自己的宿舍。那杯姜茶，她本来是打算两个人一起喝的。')
};

STORY_DAYS['2024-10-12']={
  title:'开学第六天·合唱比赛冠军+金融理财解锁',
  phases:[
    // Phase 1: 团校判定
    {type:'auto',tag:'团校',title:'团校学习活动',
     condSkip:function(){return !GS.tuanxiaoAccepted;},
     text:'清晨天光洒落校园，秋风微凉。今天上午虽无课程安排，但你按照团校安排准时前往指定教室参与学习、签到与集体活动。\n\n团校纪律严格，全程需保持专注、认真记录。整个上午的时间被团校活动填满，没有空余时间进行其他安排。你在笔记本上记下了满满的团校学习要点，虽然有些辛苦，但也算是充实的半天。',
     effects:{}},
    // Phase 2: 上午自由活动五选一
    {type:'main',tag:'自由活动',title:'上午自由时光',
     condSkip:function(){return GS.tuanxiaoAccepted;},
     text:'清晨天光洒落校园，秋风微凉。今日上午无课程安排，你拥有一整段完整的自由时间。阳光穿过银杏树的枝叶在主干道上投下斑驳光影，校园里行人稀少，难得的清闲时光。\n\n你站在宿舍楼下伸了个懒腰，打算如何安排这个上午？',
     choices:[
       {text:'回宿舍睡觉，消解连日上课的疲惫',effects:{health:6},sleepBonus:true,
        result:'你回到宿舍一头倒在床上。连日上课、排练合唱的疲惫终于有了补偿的机会——闭上眼睛，整个人陷在柔软的被子里，秋日凉爽的微风从半开的窗户吹进来，这一觉睡得天昏地暗，醒来时已是日上三竿。'},
       {text:'回宿舍打游戏，沉浸娱乐放松身心',effects:{happiness:7},
        result:'你打开电脑，登录游戏，戴上耳机。不用上课的上午，打游戏打得理直气壮。几局酣畅淋漓的对战下来，连日排练的疲惫一扫而空。'},
       {text:'留在教室学习，潜心温习各科知识点',effects:{wisdom:5},
        result:'你来到教学楼找了一间空教室坐下，翻开笔记本和课本。安静的教室里只有笔尖划过纸面的沙沙声——你把这周各科的重点内容重新梳理了一遍，心里踏实了不少。'},
       {text:'前往大创中心拜访韩鹏老师',effects:{},
        cond:true,condAttr:'keChuangUnlocked',condTh:1,
        sEffects:{hanpengHaoGan:6},sText:'你来到大创中心，韩鹏老师正在调试一台新的示波器。看到你来，他热情地招呼你过去一起研究。你们一边调试设备一边聊着最近的科创比赛动向，韩老师还分享了不少做项目的实用经验。充实而有收获的一个上午。',
        fText:'你来到大创中心门口，发现门锁着。看来韩鹏老师今天不在。也许下午再来看看？',
        result:'你来到大创中心门口，发现门锁着。'},
       {text:'约女友出来，相伴漫步校园',effects:{},
        cond:true,condAttr:'gfUnlocked',condTh:1,
        sEffects:{gfFavor:8},sText:'你给女友发了条消息，两人约在小花园碰头。秋日的校园美得醉人——你们并肩走过银杏大道，脚下踩着金黄的落叶，聊着各自的课表、吐槽着早八的困、分享着最近遇到的趣事。她说这种无所事事却有你陪伴的上午，是大学生活里最珍贵的片段。',
        fText:'你翻出手机通讯录，才想起来——你现在是单身。也许以后会有机会的。',
        result:'你翻出手机通讯录，才想起来你现在是单身。'}
     ]},
    // Phase 3: 偶遇亨利 → 解锁金融理财系统
    {type:'auto',tag:'偶遇',title:'午后偶遇·亨利与理财之道',
     text:'午后的校园步道上人来人往，阳光穿过枝叶洒下斑驳光影。你闲逛途中偶然撞见了亨利——他独自靠在路旁的树干上，整个人低着头，目光紧紧锁定手机屏幕，全然没有留意周遭来往的人群。\n\n正当你准备走过去打个招呼时，他的手机里接连传出清脆的提示音——一声声"支付宝到账"此起彼伏，在安静的路边格外引人注目。\n\n察觉到你的目光，亨利抬起头冲你笑了笑："哦，你也在啊。没什么——就是看了看最近的资产配置。"他简单与你攀谈了几句，聊起了资金打理与资产规划的门道。\n\n"你知道吗？校园里有不少人在玩模拟理财——虽然资金规模不大，但学到的投资思维才是关键。"亨利滑动着手机屏幕，向你展示了他手中几只"股票"的走势图，"鸟爷控股、笨笨传媒、波比实业——各有各的脾气。有兴趣的话，你也可以试试。"\n\n在他的引荐与讲解下，你对校园模拟理财产生了浓厚的兴趣。亨利帮你注册了模拟账户——从现在开始，你可以在每个工作日自由买卖这三支标的了。\n\n📌 系统提示：金融理财系统已解锁！右下角新增【📈 金融理财】按钮，点击即可进入交易页面。\n⚠️ 股市仅工作日开市，周末及节假日休市。投资有风险，入市需谨慎！',
     effects:{},setFlags:{stocksUnlocked:true}},
    // Phase 4: 合唱比赛通知
    {type:'auto',tag:'📢 通知',title:'10.12合唱比赛正式通知',
     text:'傍晚时分，合唱团负责人发来今晚正式比赛的最终通知：\n\n🌟 !! 10.12合唱比赛 !! 🌟\n🔺集合时间：18:10\n🔺集合地点：舞台背景板后侧的阶梯上\n集体紧密大队形，辛苦合唱负责人帮忙组织一下～\n🔴安排：正式比赛！\n1.比赛前完善细节\n2.比赛\n🔴注意事项：\n1.比赛现场候场时保持安静\n2.稍后会发布详细注意事项，请大家关注！\n🟡穿好【长袖长裤军训服+深色运动鞋】！！！！！！！\n🟡拿好小国旗！！！\n🟡大家都可以自愿化化妆哦💋\n🔥渐入秋冬，天气愈加寒凉！大家注意【在军训服里面】多添衣物！！！\n\n你读完通知，赶紧翻出柜子里的长袖军训服和深色运动鞋，把小国旗整整齐齐地叠好放进外套口袋。隔壁宿舍已经有同学在互相帮忙化妆了——今晚，是检验所有排练成果的最终时刻。',
     effects:{}},
    // Phase 5: 合唱正式比赛
    {type:'auto',tag:'🏆 合唱',title:'合唱正式比赛·荣耀夺冠',
     text:'暮色四合，赛场灯火通明。各个参赛队伍依次列队就位，科技楼前的广场上人山人海，舞台两侧的聚光灯将夜空照得如同白昼。\n\n你和班级同学身着整齐的长袖长裤军训服，脚踩深色运动鞋，不少人在队中互相帮忙整理仪容——有同学细致地化了淡妆，有人反复调整着衣领和袖口。每个人手中都紧握着一面鲜红的小国旗，按照提醒，大家都在军训服里面悄悄加穿了厚实的保暖衣物，抵御夜晚的寒凉。\n\n候场期间，全员严格保持安静。队形排列得紧凑整齐——你站在队列中，身边是同班同学沉稳的呼吸声。指挥站在最前方，低声提醒着每个声部的注意事项，大家互相提醒站位、彼此整理旗角，将连日来排练的每一个细节逐一巩固。\n\n轮到本班登场——指挥一个干脆利落的手势，全员迈着整齐的步伐走向舞台。聚光灯打在脸上有些刺眼，但你看到台下评委席上的老师们都在认真注视。\n\n伴奏缓缓响起。首先唱响的是东北大学校歌——嘹亮的歌声铿锵有力，饱含着对校园的归属感与青春热忱，每一个音符都掷地有声。台上的队列笔直如松，小国旗在灯光下整齐挥舞，台下的观众渐渐安静下来，有人轻轻跟着哼唱。\n\n一曲落幕，全场安静了一秒，紧接着旋律切换——《少年中国说》的前奏响起。少年意气、昂扬斗志透过歌声传递而出，"少年强则国强"的旋律振奋人心，全班的演唱配合默契、声线整齐划一，队列动作规范划一，连日来所有排练的成果在这一刻完美呈现。\n\n最后一个音符落下，全场爆发出雷鸣般的掌声。你看到评委席上的老师纷纷点头，有几位甚至站了起来。\n\n全部参赛队伍表演结束后，主持人手持话筒走到舞台中央，依次公布获奖名单。当念到你们班级的名字时，整个队伍瞬间沸腾——\n\n🏆 冠军！！！\n\n你们班斩获本次合唱比赛第一名！欢呼声、拥抱、雀跃——所有的辛苦排练、每一个夜晚的反复磨合，在这一刻全部得到了回报。你手中的小国旗在聚光灯下格外鲜艳，身边同学的眼眶都有些湿润。\n\n赛后辅导员笑着走过来拍了拍你的肩膀："干得漂亮！学校说了——冠军班级减免一个月早操！"周围的同学听到这话又是一阵欢呼。\n\n今晚的夜空格外清朗，星星似乎也比往常更亮。你站在科技楼门口，看着手中那面陪伴你走过整个合唱旅程的小国旗，心里涌起一股难以言喻的骄傲与感动。',
     effects:{glory:30},setFlags:{zaocaoExempt:true}}
  ],
  gfEvent:makeGfEvent('冠军之夜',
    '合唱比赛结束后，人群渐渐散去。你在舞台侧面的台阶上坐着，手里还攥着那面小国旗，嗓子有些沙哑，但脸上的笑容怎么都收不住。\n\n苏小暖从人群中找到了你。她今天也化了淡妆，军训服的拉链拉到最上面——里面显然穿了不止一件保暖衣。"恭喜冠军先生——"她笑着在你身边坐下，递过来一瓶温热的矿泉水，"我让食堂阿姨帮忙热了一下。你刚才在台上的时候，我在下面一直录视频——虽然手抖得不行，但你的声音真的好稳。"',
    '接过温水，和她并肩坐在台阶上分享这份喜悦',{health:2,happiness:6},{gfFavor:8},
    '你们并肩坐在舞台侧面的台阶上，周围是渐渐散去的人群和正在拆卸的设备。晚风微凉，但心里滚烫。她把手机递过来——视频里，聚光灯下的队列整齐划一，歌声嘹亮。画面最后定格在评委宣布冠军的那一刻，全班的欢呼声隔着屏幕都能感受到那份激动。\n\n"这个视频我要存一辈子。"她说。\n\n你笑着把水瓶递回给她："下次比赛，换我录你。"\n\n月亮从云层后面探出头来，洒在两个人肩头，像一层薄薄的银霜。',
    '接过水说了声谢谢，太累了想早点回去休息',{happiness:-4},
    '"嗯……好。今天确实太累了——回去好好休息。"苏小暖把水瓶塞到你手里，一个人坐在台阶上多待了一会儿。她把手机里录的视频从头到尾又看了一遍，在冷风中裹紧了军训服，才慢慢起身走回了宿舍。')
};

STORY_DAYS['2024-10-13']={
  title:'周日·ACM选拔赛+晚自习',
  phases:[
    // Phase 1: 上午五选一
    {type:'main',tag:'自由活动',title:'周日清晨·自由时光',
     text:'周日的清晨，秋日阳光温柔地洒进宿舍窗户。校园褪去工作日的忙碌，整栋宿舍楼格外安静——大部分同学都在睡懒觉。\n\n昨日合唱夺冠的喜悦仍在延续，你躺在床上回味着昨晚的舞台和掌声，嘴角不自觉地上扬。今天没有早课，ACM招新选拔赛下午才开赛，上午的时间完全属于你自己。',
     choices:[
       {text:'回宿舍赖床睡觉，享受周日慵懒',effects:{health:6},sleepBonus:true,
        result:'你翻了个身，把被子裹得更紧了些。周日不睡懒觉，天理难容。窗外偶尔传来几声鸟鸣，秋日的凉风从半开的窗户溜进来——这是属于周末的顶级享受。'},
       {text:'起床打游戏，难得的全天无课日',effects:{happiness:7},
        result:'你索性早起打游戏——毕竟没有课的周日最适合沉浸在虚拟世界里。戴上耳机，几局酣畅淋漓的对战下来，整个人神清气爽。'},
       {text:'去教室安静自习，为下周课程做准备',effects:{wisdom:5},
        result:'你洗了把脸来到教学楼。周末的教室空无一人，安静得能听见自己的呼吸声。你翻开课本把下周要学的内容预习了一遍，心里踏实了不少。'},
       {text:'前往大创中心拜访韩鹏老师',effects:{},
        cond:true,condAttr:'keChuangUnlocked',condTh:1,
        sEffects:{hanpengHaoGan:6},sText:'你来到大创中心，韩鹏老师居然也在——他说周末实验室安静，最适合专心调试设备。他热情地邀你一起动手操作一台新到的开发板，边做边讲解原理。周末的实验室没有旁人，一对一的交流让你收获颇丰。',
        fText:'你来到大创中心门口，周末门锁着——意料之中。韩鹏老师今天应该在家休息。',
        result:'你来到大创中心门口，周末门锁着。'},
       {text:'约女友出来，周末约会漫步校园',effects:{},
        cond:true,condAttr:'gfUnlocked',condTh:1,
        sEffects:{gfFavor:8},sText:'你给女友发了条消息："周日没课，出来走走？"两人约在小花园碰头，沿着银杏大道边走边聊。周末的校园像一座安静的大公园——整条路上只有你们两个人，踩在落叶上沙沙作响。她笑着说合唱比赛的时候在台下喊得嗓子都哑了，你说下次比赛换你给她加油。',
        fText:'你翻出手机通讯录——还是单身。周末约会的场景只能在想象中上演。',
        result:'你翻出手机通讯录——还是单身。'}
     ]},
    // Phase 2: 午间随机事件
    {type:'random',tag:'午间',pool:'oct13_midday'},
    // Phase 3: ACM 参赛决定
    {type:'main',tag:'ACM',title:'ACM俱乐部招新选拔赛',
     condSkip:function(){return !GS.acmRegistered;},
     text:'午后计算机机房座无虚席，ACM俱乐部招新选拔赛正式开赛。走廊里站满了来自各年级的参赛选手，不少人手里还拿着算法笔记在做最后的复习。\n\n你远远看到了苏小暖——她也报名了这次选拔，正在候场区安静地翻看笔记。她抬头看到了你，冲你微微笑了笑。\n\n赛场门口张贴着选拔规则：笔试+机试，综合评分前30%入选。监考学长已经开始组织签到入场了。',
     choices:[
       {text:'整理状态，进入赛场认真答题',effects:{},flags:{_wentACM:true},
        result:'你深吸一口气，走进了赛场。计算机机房里只剩键盘敲击声——题目比想象中要难，涵盖了基础算法和编程思维。你尽力答完了所有题目，提交后长舒一口气，在考场外等待最终成绩公示。'},
       {text:'犹豫再三，最终还是放弃参赛',effects:{},
        result:'你在机房门口站了一会儿，最终还是转身离开了。ACM的题目难度早有耳闻——你觉得自己准备得还不够充分，与其进去硬着头皮做题，不如把时间留给更擅长编程的同学。'}
     ]},
    // Phase 4a: 双入选（有女友，高悟性，高好感）
    {type:'auto',tag:'ACM',title:'ACM选拔赛·成绩公示',
     condSkip:function(){return !GS._wentACM||GS.wisdom<=150||!GS.gfUnlocked||GS.gfFavor<150;},
     text:'榜单张贴在机房门口的公告栏上，人群一阵骚动。你挤到前面一行一行地找自己的名字——\n\n找到了！你的名字赫然在列，成功入选ACM俱乐部集训队！\n\n与此同时，你注意到苏小暖也凑到了榜单前——她的名字同样出现在了入选名单上。她转过头看到了你，眼睛一下子亮了起来："太好了！我们都进了！"\n\n她主动走上前来，语气里满是欣喜："以后一起参加集训、一起刷题备赛吧——有个伴互相督促，进步会快很多！"你笑着点了点头。ACM的旅程，从今天正式起航。',
     effects:{glory:8,gfFavor:5}},
    // Phase 4b: 你入选 + 苏小暖落选（有女友，高悟性）
    {type:'auto',tag:'ACM',title:'ACM选拔赛·成绩公示',
     condSkip:function(){return !GS._wentACM||GS.wisdom<=150||!GS.gfUnlocked||(GS.gfUnlocked&&GS.gfFavor>=150);},
     text:'榜单张贴在机房门口的公告栏上，人群一阵骚动。你挤到前面一行一行地找自己的名字——\n\n找到了！你的名字赫然在列，成功入选ACM俱乐部集训队。凭借扎实的算法基础和逻辑思维能力，你在众多参赛选手中脱颖而出。\n\n然而你注意到苏小暖站在人群外围，神情有些失落。她的名字没有出现在入选名单上——这次选拔的难度超出了她的准备范围。她注意到你在看她，勉强挤出一个微笑，冲你简单点了点头，便转身独自走向了楼梯口。\n\n你本想追上去说点什么，但她的身影已经消失在了楼梯拐角。',
     effects:{glory:8,gfFavor:-4}},
    // Phase 4c: 你落选 + 苏小暖入选（有女友，低悟性，低好感）
    {type:'auto',tag:'ACM',title:'ACM选拔赛·成绩公示',
     condSkip:function(){return !GS._wentACM||GS.wisdom>150||!GS.gfUnlocked||(GS.gfUnlocked&&GS.gfFavor>=150);},
     text:'榜单张贴在机房门口的公告栏上，人群一阵骚动。你挤到前面一行一行地找自己的名字——\n\n没有。你反复看了两遍，确实没有。这次选拔的题目难度超出了你的准备，几道算法题做得并不理想。\n\n你正准备默默离开，苏小暖从人群中走了出来——她的名字在入选名单上。她一眼就看到了你脸上的失落，轻轻走到你身边："别太放在心上——这次题确实很难，很多人都没发挥好。你要是愿意的话，我可以把集训的笔记和题目分享给你，下次再战。"\n\n她真诚的语气让你心里好受了一些。虽然今天输了比赛，但身边有人在意的感觉，已经比什么都值得。',
     effects:{happiness:-4,gfFavor:6}},
    // Phase 4d: 双落选（有女友，低悟性，高好感）
    {type:'auto',tag:'ACM',title:'ACM选拔赛·成绩公示',
     condSkip:function(){return !GS._wentACM||GS.wisdom>150||!GS.gfUnlocked||(GS.gfUnlocked&&GS.gfFavor<150);},
     text:'榜单张贴在机房门口的公告栏上，人群一阵骚动。你挤到前面一行一行地找自己的名字——\n\n没有。又看了一遍，还是没有。这次选拔的难度确实很高，你没有能够进入前30%。\n\n你从人群中退出来，看到苏小暖也站在榜单前面，表情平静。她的名字同样没有出现在上面——这次比赛对你们俩来说都有些力不从心。\n\n你们隔着人群对视了一眼，各自微微一笑，没有多说什么。赛场人潮渐渐散去，你们也默默离开了机房。本就是点头之交罢了——今天的交集到此为止，各自继续各自的大学生活。',
     effects:{happiness:-2}},
    // Phase 4e: 无女友·高悟性入选
    {type:'auto',tag:'ACM',title:'ACM选拔赛·成绩公示',
     condSkip:function(){return !GS._wentACM||GS.wisdom<=150||GS.gfUnlocked;},
     text:'榜单张贴在机房门口的公告栏上，人群一阵骚动。你挤到前面一行一行地找自己的名字——\n\n找到了！你的名字赫然在列，成功入选ACM俱乐部集训队！凭借扎实的算法基础和逻辑思维能力，你在众多参赛选手中脱颖而出。\n\n周围入选的同学互相道贺、交换联系方式，你也收到了几条集训群的通知消息。走出机房时天色已近黄昏——ACM的旅程，从今天正式起航。未来的集训和比赛，全凭你自己的实力与坚持。',
     effects:{glory:8}},
    // Phase 4f: 无女友·落选
    {type:'auto',tag:'ACM',title:'ACM选拔赛·成绩公示',
     condSkip:function(){return !GS._wentACM||GS.wisdom>150||GS.gfUnlocked;},
     text:'榜单张贴在机房门口的公告栏上，人群一阵骚动。你挤到前面一行一行地找自己的名字——\n\n没有。又看了一遍，还是没有。这次选拔的题目难度超出了你的准备范围，几道算法题做得并不理想。\n\n你从人群中退出来，看着入选的同学们兴奋地互加好友，心里有一丝失落。不过话说回来——社团活动本就是锦上添花，大学生活还有很多其他精彩值得期待。\n\n你转身离开了机房。赛场人潮渐渐散去，黄昏的夕阳把操场染成了一片金色——一个人的路也很宽敞。',
     effects:{happiness:-2}},
    // Phase 5: 下午五选一（仅未参赛/弃赛可见）
    {type:'main',tag:'自由活动',title:'下午自由时光',
     condSkip:function(){return GS._wentACM;},
     text:'周日下午的阳光变得柔和了许多，校园里飘着桂花的余香。ACM赛场那边的喧闹与你无关——你拥有完整的下午空闲时间，可以随心安排自己的安排。',
     choices:[
       {text:'回宿舍睡觉，享受周日下午的慵懒',effects:{health:6},sleepBonus:true,
        result:'你回到宿舍一头倒在床上。周日下午的午觉是周末的终极仪式感——闭上眼睛，整个人陷在柔软的被子里，阳光透过窗帘洒在被子上。这一觉睡得天昏地暗，醒来时已是黄昏。'},
       {text:'回宿舍打游戏，难得的全天无课周末',effects:{happiness:7},
        result:'你打开电脑，登录游戏，戴上耳机。周末的服务器格外热闹，你连赢了好几局，心情大好。室友从旁边经过时竖了个大拇指："今天手感不错啊！"'},
       {text:'去教室安静自习，为下周课程蓄力',effects:{wisdom:5},
        result:'你找了间空教室坐下，翻开课本和笔记。周末的教室安静得像图书馆，你利用这段时间把下周要讲的内容提前预习了，还整理了一份学习计划。'},
       {text:'前往大创中心拜访韩鹏老师',effects:{},
        cond:true,condAttr:'keChuangUnlocked',condTh:1,
        sEffects:{hanpengHaoGan:6},sText:'你来到大创中心，韩鹏老师下午还在实验室里调试设备。看到你来，他放下手中的螺丝刀，招呼你坐下聊了起来。你们聊了很多——从科创比赛到未来规划，从项目经验到学习方法。韩鹏老师对技术的热情感染了你。',
        fText:'你再次来到大创中心门口——依然锁着。看来韩鹏老师今天真的不在。',
        result:'你来到大创中心门口——依然锁着。'},
       {text:'约女友出来，周末约会的完美下午',effects:{},
        cond:true,condAttr:'gfUnlocked',condTh:1,
        sEffects:{gfFavor:8},sText:'你给女友发了条消息，两人约在图书馆门口碰头。周末的校园悠闲惬意——你们在校门口的奶茶店买了两杯热饮，沿着小路慢慢逛，聊着这一周发生的各种趣事，从合唱夺冠到ACM选拔。她说和你在一起的周末，是忙碌学业里最期待的充电时光。',
        fText:'你翻出手机通讯录——还是单身。算了吧，一个人也挺好的。周末的自由时光，不需要向任何人报备。',
        result:'你翻出手机通讯录——还是单身。'}
     ]},
    // Phase 6: 晚自习
    {type:'main',tag:'晚间',title:'周日晚自习',
     text:'夜幕降临，教学楼灯火通明。周日晚间全院统一安排晚自习，班委正在教室门口清点出勤人数，辅导员张银雪也会不定时抽查各班的出勤情况。\n\n教室里已经坐了不少同学，安静得只能听见翻书声和偶尔的咳嗽声。你在教室门口站了一会儿——今天一整天下来已经有些累了，晚自习去还是不去？',
     choices:[
       {text:'准时参加晚自习，沉下心梳理一周知识点',effects:{happiness:-4,wisdom:7},
        result:'你找了个靠窗的位置坐下，翻开笔记本。安静的自习环境让思绪格外清晰，你把这一周各科的重点知识从头到尾梳理了一遍。虽然枯燥，但满满当当的笔记让人心里踏实——下周的课程心里有底了。'},
       {text:'缺席晚自习，回宿舍钻进被窝睡大觉',effects:{glory:-5,health:6,happiness:5},sleepBonus:true,
        result:'你趁班委不注意悄悄溜回了宿舍。缺勤记录被登记在册——辅导员张银雪明天早上大概率会找你谈话。但你躺在柔软的床上，全身肌肉逐渐放松，很快便沉入梦乡。比起在教室里枯坐两个小时，被窝的诱惑实在无法抵挡。\n\n⚠️ 荣耀-5（晚自习缺勤被登记）'}
     ]}
  ],
  gfEvent:makeGfEvent('周日夜晚·一周的尾声',
    '晚自习结束后走出教学楼，冷风吹得人精神一振。你远远看到苏小暖站在路灯下，双手插在外套口袋里，似乎在等什么人。\n\n看到你出来了，她小跑过来："终于等到你了——我刚才去小卖部买了热可可，多带了一杯给你。"她把冒着热气的纸杯递过来，笑容在路灯下显得格外温柔。"这一周发生了好多事情——从上课到合唱夺冠，感觉像过了一个月。"',
    '接过热可可，和她并肩在路灯下走一会儿',{health:2,happiness:4},{gfFavor:7},
    '你们捧着热可可慢慢走在夜晚的校园里。银杏叶在路灯下泛着金色的光，呼出的白气在冷空气中凝成小小的雾团。她细数着这一周各种难忘的瞬间——从ACM的紧张到合唱的激动，从课堂的趣事到此刻路灯下的热可可。\n\n走到她宿舍楼下，她转身冲你挥了挥手："下周见——晚安！"热可可喝完了，但心里那份暖意还在。',
    '接过热可可道了谢，说太晚了得赶紧回宿舍',{happiness:-3},
    '"嗯——那你路上慢点。晚安。"苏小暖把热可可塞到你手里，一个人站在路灯下目送你的背影消失在宿舍楼门口。夜风吹起她的发梢，她把外套的拉链拉到最上面，在路灯下又站了一会儿，才慢慢转身走回了自己的宿舍。')
};

// ==================== 10.14 剧情 ====================
STORY_DAYS['2024-10-14']={
  title:'C++·思法·学术语言·劳动教育',
  phases:[
    // Phase 1: 升旗取消
    {type:'auto',tag:'☔ 雨天',title:'晨间通知',
     text:'窗外淅淅沥沥的雨声将你从睡梦中唤醒。你揉了揉眼睛拿起手机——通知群里的@全体成员消息弹了出来："因今日持续降雨，晨间升旗仪式取消，请各位同学按时前往教室上课。"\n\n你长长地舒了一口气，把手机扔回枕头边。雨天不用早起升旗——大学生活偶尔还是有人性化的一面的。雨滴敲打窗棂的声音此刻听起来格外悦耳。',
     effects:{happiness:4}},

    // Phase 2: C++ 李国瑞
    makeMainPhase('上午①','C++程序设计基础 · 任课教师：李国瑞',
      '上午第一节是李国瑞老师的C++程序设计基础课。窗外雨声绵绵，被窝里残留的暖意让人格外不想动弹。\n\n李国瑞老师一向看重出勤率和课堂互动，雨课堂系统会随机抽取答题。你看了看窗外的雨幕——是撑伞赶去教室，还是趁雨天窝在宿舍多睡一会儿？',
      [
        {text:'撑伞前往教室上课',effects:{liguoruiFavor:5},
         flags:{_attendedCpp14:true},
         result:'你撑起伞冲进雨幕，一路小跑到了教学楼。教室里已经坐了大半——李国瑞老师正在调试PPT，看到你湿漉漉地走进来，冲你点了点头。你把伞靠在墙角，找了个前排位置坐好，翻开课本准备迎接今天的课程。'},
        {text:'雨天窝在宿舍睡觉，这节不去了',effects:{health:6,happiness:5},sleepBonus:true,
         result:'你看了看窗外的雨，又看了看温暖的被窝——去他的，今天这节不上了。你把被子往上拉了拉，听着雨声再次沉入梦乡。雨天睡懒觉，大概是大学生活里性价比最高的享受了。'}
      ]),
    // Phase 2b: 雨课堂答题
    {type:'main',tag:'系统',title:'雨课堂随堂答题',
     condSkip:function(){return !GS._attendedCpp14||Math.random()>=0.5;},
     text:'课堂进行到一半，李国瑞老师打开了雨课堂系统："来，抽一位同学回答一道基础题——考察上节课的内容。"投影屏上弹出了随机点名界面，全班同学的名字快速滚动。\n\n最终——屏幕停在了你的名字上。李国瑞老师推了推眼镜："来，这道题：在C++中，以下哪个关键字用于定义整型变量？"',
     choices:[
       {text:'A. float',effects:{},wrongResult:'"float是浮点型，不是整型。基础概念还需要再巩固一下。"李国瑞老师摇了摇头，在系统里记录了你答错的结果。\n\n⚠️ 悟性-3\n⚠️ 李国瑞好感-4'},
       {text:'B. int',correctEffects:{wisdom:5,liguoruiFavor:4},correctResult:'"回答正确！"李国瑞老师满意地点了点头，"基础打得不错，继续保持。"他在系统里给了你一个对钩，全班同学向你投来佩服的目光。\n\n✅ 悟性+5\n✅ 李国瑞好感+4'},
       {text:'C. char',effects:{},wrongResult:'"char是字符型。看来你需要回去翻翻课本第一章了。"李国瑞老师叹了口气。\n\n⚠️ 悟性-3\n⚠️ 李国瑞好感-4'},
       {text:'D. string',effects:{},wrongResult:'"string是字符串类，不是基本数据类型的关键字。"李国瑞老师的眉头皱得更紧了。\n\n⚠️ 悟性-3\n⚠️ 李国瑞好感-4'}
     ],
     quizCorrectIndex:1},

    // Phase 3: 思想道德与法治 宋俊丽
    makeMainPhase('上午②','思想道德与法治 · 任课教师：宋俊丽',
      '第二节是宋俊丽老师的思想道德与法治课。雨势稍缓，但天空依然阴沉沉的。\n\n宋俊丽老师的课堂风格轻松，她偶尔会在课上分享一些个人经历和视频资料。不过——雨天窝在宿舍的吸引力实在太大了。这节你打算去还是不去？',
      [
        {text:'准时前往教室上课',effects:{songjunliFavor:5},
         flags:{_attendedMoral14:true,songjunliUnlocked:true},
         result:'你准时抵达教室。宋俊丽老师已经在讲台上了，今天的PPT封面写着"法治与日常生活"。你找了个中间位置坐下，前排的同学回头冲你笑了笑——雨天的教室里，人虽然不多，但来的人都是真爱学习。'},
        {text:'雨声伴眠继续睡觉，这节课不去了',effects:{health:6,happiness:5},sleepBonus:true,
         result:'你看了看课表——思法课，嗯……不去应该问题不大。翻了个身，把被子裹得更紧了一些。雨水沿着窗户玻璃缓缓滑落，这种天气不睡觉简直暴殄天物。'}
      ]),
    // Phase 3b: 电视台访谈视频
    {type:'main',tag:'系统',title:'宋俊丽·电视台访谈',
     condSkip:function(){return !GS._attendedMoral14||Math.random()>=0.4;},
     text:'课堂过半，宋俊丽老师笑着拍了拍手："今天不讲纯理论了——给大家看一段我之前去地方电视台做专题访谈的视频，里面聊了不少贴近生活的法治案例。"她点开投影屏，画面里出现了访谈现场。\n\n教室里安静下来，同学们纷纷抬头看向屏幕。宋俊丽老师在节目中的谈吐稳健、见解深刻，和平时课堂上的亲切形象形成了有趣的反差。',
     choices:[
       {text:'坐直身体，认真观看访谈视频',effects:{wisdom:4,songjunliFavor:4},
        result:'你放下手机，端正坐姿认真看完了整段访谈。宋俊丽老师在节目中分析了几起贴近大学生活的真实案例——从校园贷陷阱到实习合同纠纷，每一个都让人警醒。看完后你在笔记本上记下了几个关键点。宋俊丽老师注意到你的专注，讲完后冲你微微一笑。'},
       {text:'低头走神，趴在桌上发呆刷手机',effects:{songjunliFavor:-4,happiness:4},
        result:'你趁着播放视频的空档趴在桌上刷手机。宋俊丽老师扫了一眼你所在的方向，微微皱了皱眉——但什么也没说，继续播放视频。两节课的时间在走神中过得飞快，等你回过神来，下课铃已经响了。'}
     ]},

    // Phase 4: 学术语言 Tania
    makeMainPhase('下午①','学术语言交流与沟通（中级）· 任课教师：Tania',
      '午后的雨还在淅淅沥沥地下着，空气里弥漫着潮湿的草木气息。下午第一节是Tania老师的学术语言交流与沟通课。\n\nTania老师一向热情洋溢，课堂互动频繁。不过——雨天总是给人一种"什么都不想干"的慵懒感。你站在宿舍门口，看着手中的雨伞，陷入了短暂的天人交战。',
      [
        {text:'打起精神，撑伞前往教室上课',effects:{taniaFavor:5},
         flags:{_attendedTania14:true},
         result:'你深吸一口气撑开伞走进雨中。到了教室门口，Tania老师已经站在讲台上了，看到你进来热情地打了声招呼："Good afternoon! Glad you made it through the rain!"你笑着回应了一句，找了个靠前的位置坐下。'},
        {text:'雨太大了不想动，这节课窝在宿舍休息',effects:{health:6,happiness:5},sleepBonus:true,
         result:'你站在宿舍门口看了看外面的雨——算了，学术语言中级，少去一节应该问题不大。你退回房间，关上门，雨声和暖意把你包围。翻出一包零食，打开一部一直想看的电影——嗯，这个下午的安排比上课舒服多了。'}
      ]),
    // Phase 4b: Tania 分享环节（必触发）
    {type:'main',tag:'🎤 分享',title:'Tania·国庆生活分享',
     condSkip:function(){return !GS._attendedTania14;},
     text:'课堂进行到中段，Tania老师拍了拍手，笑着用英语说道："Alright everyone——let\'s do a quick sharing session! Tell us about your National Day holiday. Where did you go? What did you do? Any interesting stories?"\n\n她环顾教室，目光最终落在了你的身上，嘴角上扬：\'How about you? Come up and share with us!"',
     choices:[
       {text:'大方上台，用英语分享国庆假期经历',effects:{charm:-3,wisdom:6},
        result:'你深吸一口气走上讲台。虽然英语表达有些磕磕绊绊，但你真诚地分享了国庆期间的各种经历——从海边赏月到合唱夺冠的激动时刻。全班同学听得津津有味，不时发出笑声和掌声。Tania老师频频点头："Excellent effort! Your speaking is really improving!"'},
       {text:'微笑着摇头拒绝，表示自己没准备好',effects:{taniaFavor:-5},
        result:'你礼貌地摇了摇头。Tania老师表示理解，但能看出她眼中闪过一丝失望。"Alright——maybe next time."她转身邀请了另一位同学上台。你坐在座位上心里有些后悔——其实上去说几句也没那么难。'}
     ]},
    // Phase 4c: Hugo 趣事（40%触发）
    {type:'main',tag:'系统',title:'Tania·Hugo的趣事',
     condSkip:function(){return !GS._attendedTania14||Math.random()>=0.4;},
     text:'课堂接近尾声，Tania老师突然笑着拍了拍手："Oh! Before we finish——I have to tell you about Hugo!"\n\n她拿出手机翻出一张照片投到屏幕上——是她家那只调皮的橘猫Hugo，正扒在书架上，半个身子探在外面，表情一脸无辜。"This is what I found when I got home yesterday. He knocked over my entire bookshelf!"全班哄堂大笑。',
     choices:[
       {text:'认真倾听，被Hugo的趣事逗得开怀大笑',effects:{taniaFavor:4,wisdom:-3},
        result:'你被Tania老师绘声绘色的讲述彻底逗乐了。她描述了Hugo如何从书架上"越狱"的全过程，还模仿了Hugo被当场抓获时的无辜表情。全班笑声不断——不过你注意到下课时间已经过了五分钟，Tania老师似乎完全沉浸在分享中忘记了下课铃。'},
       {text:'不予理会，趁这个空档放松一下走神休息',effects:{taniaFavor:-4,happiness:5},
        result:'你趁着大家都在听Hugo的故事，悄悄靠在椅背上闭目养神。Tania老师讲得眉飞色舞，但你实在有些累了——学术英语课的内容量大，脑子已经有些转不动了。虽然错过了老师分享的快乐，但这几分钟的放空让你的精神恢复了不少。'}
     ]},

    // Phase 5: 劳动教育 李心瑶
    makeMainPhase('下午②','劳动教育 · 任课教师：李心瑶',
      '下午第二节是李心瑶老师的劳动教育课。这是本学期新增的课程，据说比较注重课堂参与和实践体验。\n\n雨势终于小了一些，但天色依然阴沉。你看了看课表——劳动教育，一门全新的课程，对李心瑶老师也还不太了解。是去认识一下新老师，还是继续在宿舍享受雨天？',
      [
        {text:'准时前往教室上课，认识新老师',effects:{},
         flags:{_attendedLabor14:true,lixinyaoUnlocked:true},
         result:'你准时抵达教室。李心瑶老师比想象中年轻——扎着马尾、戴着黑框眼镜，笑起来很有亲和力。她在黑板上一笔一画地写下"劳动教育"四个大字，转身对大家说："劳动教育不是让你们去扫地搬砖——我们要聊的是劳动的价值、劳动者的权益，以及作为大学生该如何理解和尊重劳动。"\n\n📌 系统提示：李心瑶 教师好感度系统已解锁。'},
        {text:'雨太大不想出门，这节课在宿舍休息',effects:{health:6,happiness:5},sleepBonus:true,
         result:'劳动教育——听起来就是那种"水课"。你心安理得地窝在宿舍里，翻了几页闲书。窗外的雨势起起落落，你在半梦半醒之间度过了这四十五分钟。至于李心瑶老师是什么风格——下次上课再了解也不迟。'}
      ]),
    // Phase 5b: 随堂测试
    {type:'main',tag:'系统',title:'劳动教育·随堂测试',
     condSkip:function(){return !GS._attendedLabor14;},
     text:'课堂过半，李心瑶老师拿出一叠随堂测试卷："今天讲的内容不多，但我想看看大家对劳动权益基本概念的了解程度——来做一个小测试，不记名，但我会根据大家的作答情况调整后续课程的难度。"\n\n她走到你旁边，把一张测试卷轻轻放在你的桌上。卷面上是几道关于劳动者基本权益的选择题和一道简短的论述题。',
     choices:[
       {text:'主动作答，认真完成随堂测试',effects:{wisdom:5},
        result:'你拿起笔仔细审题，凭借平时积累的社会常识和课堂上的讲解逐题作答。论述题你结合最近看到的一则关于外卖骑手权益的新闻，从多个角度分析了劳动者权益保护的重要性。\n\n李心瑶老师收卷时看到你工整的字迹和详细的论述，冲你赞许地点了点头。"写得不错——很有自己的思考。"'},
       {text:'消极回避，把测试卷推到一边不作答',effects:{wisdom:-4},
        hidden:{desc:'劳动教育预估成绩变更为合格(-)',gEffects:{laborEducation:-1}},
        result:'你瞥了一眼卷面上的题目——有些概念确实不太清楚，算了。你把测试卷推到桌子角落，低头玩起了手机。\n\n李心瑶老师收卷时注意到你的空白卷子，微微叹了口气，在名单上你的名字旁边做了一个不易察觉的标记。\n\n⚠️ 劳动教育预估成绩变更为合格(-)'}
     ]},

    // Phase 6: 晚自习
    {type:'main',tag:'晚间',title:'晚间晚自习',
     text:'一天的课程终于结束了。雨不知什么时候停了下来，空气里弥漫着雨后特有的清新。教学楼灯火通明，各班晚自习按时进行。\n\n今天经历了不少事情——从早上的升旗取消到下午四节课，你感到有些疲惫。晚自习是去教室安静学习还是回宿舍休息？',
     choices:[
       {text:'准时参加晚自习，沉下心学习',effects:{happiness:-4,wisdom:7},
        result:'你找了个靠窗的位置坐下，翻开笔记本开始整理今天各科的重点内容。C++的int关键字、思法课的法治案例、Tania教的学术词汇、劳动教育课上关于劳动者权益的论述——一天下来知识点还真不少。自习室里沙沙的翻书声和写字声让人格外专注。'},
       {text:'缺席晚自习，回宿舍钻进被窝睡觉',effects:{glory:-5,health:6,happiness:5},sleepBonus:true,
        result:'你趁值班老师不注意悄悄溜回了宿舍。虽然缺勤记录被登记在册——但躺在柔软的床上，全身肌肉逐渐放松，雨后的清新空气从窗户缝隙里钻进来。比起在教室里枯坐两个小时，被窝的诱惑实在无法抵挡。\n\n⚠️ 荣耀-5（晚自习缺勤被登记）'}
     ]}
  ],
  gfEvent:makeGfEvent('雨夜·热可可的暖意',
    '晚自习结束后走出教学楼，雨后清新的空气里夹杂着泥土和草木的清香。你远远看到苏小暖站在路灯下，双手捧着一杯热饮，白色的水汽在夜里袅袅升起。\n\n看到你出来，她快步走过来："终于等到你了！雨天一整天都闷在宿舍，特意来给你送杯热可可——路上小心别着凉了。"她把冒着热气的杯子递过来，路灯下她的笑容驱散了雨天带来的所有阴郁。',
    '接过热可可，和她并肩在雨后夜色中走一会儿',{health:2,happiness:4},{gfFavor:7},
    '你们捧着热可可慢慢走在雨后的校园。积水的地面映着路灯的光，踩上去发出细微的水花声。银杏叶被雨水洗得发亮，空气里弥漫着清新的草木气息。她聊起今天在宿舍听雨看书的悠闲，又问你今天上课累不累。\n\n走到她宿舍楼下，她把空杯子扔进垃圾桶，转身冲你挥了挥手："明天见——热可可够甜吗？"路灯的光洒在她身上，雨后的夜晚突然变得不那么冷了。',
    '接过热可可道了谢，说太晚了得赶紧回去',{happiness:-3},
    '"嗯——那你路上慢点。晚安。"苏小暖把热可可塞到你手里，一个人站在路灯下目送你的背影消失在雨后的夜色中。她把外套的拉链拉到最上面，在路灯下又站了一会儿，才慢慢转身走回了自己的宿舍。')
};

// ==================== 10.15 剧情 ====================
STORY_DAYS['2024-10-15']={
  title:'形势与政策·高数·学术语言·Drama组队',
  phases:[
    // Phase 1: Morning opening
    {type:'auto',tag:'☀️ 早晨',title:'新的一天',
     text:'清晨天色渐亮，校园慢慢恢复喧闹。你收拾妥当走出宿舍，新一天的校园生活正式开启。十月的晨风带着微凉，走廊里陆续响起脚步声——早八的课表在等着你。心绪随着周遭氛围慢慢活络起来。',
     effects:{}},
    // Phase 2: 形势与政策 韩杰
    makeMainPhase('上午①','形势与政策 · 任课教师：韩杰',
      '上午第一节是韩杰老师的形势与政策课。韩老师戴着金丝眼镜，一如既往地儒雅沉稳。\n\n你站在教学楼门口犹豫了一下——秋日早晨的被窝余温还在身上，这一节是去还是不去？',
      [
        {text:'准时前往教室上课',effects:{},
         flags:{_attendedHanjie15:true},
         result:'你推开教室门，韩杰老师已经站在讲台上调试PPT了。教室里稀稀拉拉坐了十几个人——早八的课，总是有人迟到。你找了个靠前的位置坐下，翻开笔记本。'},
        {text:'赖在被窝里酣睡，彻底放空身心',effects:{happiness:5,health:6},
         hidden:{desc:'形势与政策评级下降',gEffects:{xingshiZhengce:-1}},
         result:'你翻了个身，把被子裹得更紧。韩杰老师的课——偶尔缺席一次应该问题不大。你在温暖的被窝里沉沉睡去，彻底放空了身心。\n\n⚠️ 形势与政策评级下降'}
      ]),
    // Phase 2b: 随堂测试
    {type:'main',tag:'课堂',title:'韩杰·随堂测试提问',
     condSkip:function(){return !GS._attendedHanjie15;},
     text:'课堂行进中途，韩杰老师突然合上书本，推了推眼镜："刚才讲的内容——找一位同学来回答一下。"\n\n他的目光扫过教室，最终停在了你的方向。教室里安静下来，周围的同学纷纷低头避开眼神接触。',
     choices:[
       {text:'主动起身，认真梳理思路完成解答',effects:{wisdom:6},
        result:'你站起身，将刚才韩老师讲的核心论点重新组织了一遍，条理清晰地完成了回答。韩杰老师频频点头，在花名册上你的名字旁画了一个圈。全班同学投来佩服的目光。'},
       {text:'低头保持沉默，不参与作答',effects:{wisdom:-4},
        hidden:{desc:'形势与政策评级下降',gEffects:{xingshiZhengce:-1}},
        result:'你埋下头假装在笔记本上写着什么。韩杰老师的目光在你身上停留了几秒，然后转向另一位同学。课堂继续，但你感到一丝惭愧。\n\n⚠️ 形势与政策评级下降'}
     ]},
    // Phase 3: 高等数学 周蕊
    makeMainPhase('上午②','高等数学建模A · 任课教师：周蕊',
      '第二节是周蕊老师的高等数学课。黑板上已经写满了上节课留下的公式推导。\n\n周蕊老师抱着一摞教案走进教室，推了推眼镜："今天继续矩阵运算——大家先把上节课的作业拿出来对一下。"\n\n你站在走廊里，看着窗外的阳光——去还是不去？',
      [
        {text:'走进教室落座，投入课堂学习',effects:{wisdom:7},
         flags:{_attendedMath15:true},
         result:'你找了靠窗的位置坐下。周蕊老师的板书一如既往地工整清晰——行列式展开、矩阵转置，一步步推导下来，思路格外顺畅。两节课下来笔记本记了满满五页。'},
        {text:'继续卧床休息，不前往课堂',effects:{happiness:5,health:6},sleepBonus:true,
         result:'你果断转身回了宿舍。高等数学——少去一节问题不大，反正可以借同学的笔记补。你躺回床上，享受着秋日上午的慵懒时光。'}
      ]),
    // Phase 3b: 雨课堂触发
    {type:'conditional',tag:'系统',title:'雨课堂随机签到',
     condCustom:function(){return true;},prob:0.5,
     text_applied:'课讲到一半，周蕊老师突然停下板书，打开了雨课堂系统。"扫码签到——今天系统会随机抽取一道课堂练习题。"',
     sText:'手机弹出雨课堂答题界面——随堂测验来了！',sFlags:{_signinTriggered15:true},
     fText:'雨课堂系统启动了，但今天运气不错——随机抽查没有抽到你们班。'},
    // Phase 3c: 雨课堂quiz
    {type:'main',tag:'雨课堂',title:'雨课堂随堂测验',
     condSkip:function(){return !GS._signinTriggered15||!GS._attendedMath15;},
     text:'雨课堂系统弹出一道函数计算题：\n\n已知函数 y = 2x² + 3x - 1，求 x=2 时的函数计算结果。\n\n请选择你的答案：',
     quizCorrectIndex:2,
     choices:[
       {text:'A. 9',effects:{},wrongResult:'回答错误。y = 2×4 + 3×2 - 1 = 8 + 6 - 1 = 13，正确答案是C。'},
       {text:'B. 11',effects:{},wrongResult:'回答错误。y = 2×4 + 3×2 - 1 = 8 + 6 - 1 = 13，正确答案是C。'},
       {text:'C. 13',effects:{},correctEffects:{wisdom:5},correctResult:'回答正确！x=2时，y = 2×2² + 3×2 - 1 = 2×4 + 6 - 1 = 8 + 6 - 1 = 13。周蕊老师赞许地点了点头。悟性+5。',wrongResult:'回答错误。正确答案是C. 13。'},
       {text:'D. 15',effects:{},wrongResult:'回答错误。y = 2×4 + 3×2 - 1 = 8 + 6 - 1 = 13，正确答案是C。'}
     ]},
    // Phase 3d: 雨课堂缺席惩罚
    {type:'auto',tag:'系统',title:'雨课堂签到·缺勤记录',
     condSkip:function(){return !GS._signinTriggered15||GS._attendedMath15;},
     text:'你正在宿舍休息，手机弹出雨课堂签到答题提醒——但你已经逃课了！缺勤记录同步至教师后台。\n\n班级群里助教发了消息："今日雨课堂未签到同学请注意，缺勤记录已备案。"',
     effects:{glory:-4,zhouruiFavor:-5},gEffects:{advancedMath:-5}},
    // Phase 4: 学术语言 Tania
    makeMainPhase('下午①','学术语言交流与沟通（中级）· 任课教师：Tania',
      '下午第一节，Tania老师端着一杯热拿铁走进教室，脸上挂着标志性的微笑。\n\n"Good afternoon everyone! Hope you had a productive morning." 她的课堂向来氛围轻松，但互动频率也高——随时可能被点名上去分享。',
      [
        {text:'按时来到课堂，融入课堂氛围',effects:{taniaFavor:5},
         flags:{_attendedTania15:true},
         result:'你找了个中间位置坐下。Tania老师在讲台上调试PPT，看到你进门冲你笑了笑。课堂氛围轻松活泼，几个同学已经在用英语聊天了。'},
        {text:'留在宿舍休息，远离课堂节奏',effects:{health:6,happiness:5},sleepBonus:true,
         result:'你站在宿舍门口想了想——学术语言中级，少去一节问题不大。退回房间关上门，打开一部电影。下午的时光在休闲中缓缓流淌。'}
      ]),
    // Phase 4b: 分享环节
    {type:'main',tag:'🎤 分享',title:'Tania·近期生活分享',
     condSkip:function(){return !GS._attendedTania15;},
     text:'课堂进行到互动环节，Tania老师拍了拍手："Alright——let\'s do a quick sharing! Tell us something interesting that happened recently. Anything——a funny story, a new discovery, a random thought."\n\n她的目光扫过全班，最终带着笑意停在了你身上。',
     choices:[
       {text:'大方上台，简单分享近期的日常与趣事',effects:{charm:-3,wisdom:6},
        result:'你走上讲台，用英语分享了最近几天的一些小趣事——食堂新出的菜品、昨天看的一部电影、今天早上差点迟到的经历。虽然表达有些磕绊，但全班同学听得津津有味，Tania老师频频点头。'},
       {text:'礼貌推辞，委婉拒绝分享邀请',effects:{taniaFavor:-5},
        result:'你摆了摆手，用英语说了句"Maybe next time"。Tania老师笑着点了点头，但你能看出她眼中闪过一丝失望。她转身邀请了另一位举手的同学。'}
     ]},
    // Phase 4c: Hugo趣事
    {type:'conditional',tag:'系统',title:'Tania·Hugo的趣事',
     condCustom:function(){return true;},prob:0.4,
     text_applied:'课堂接近尾声，Tania老师突然笑着拍了拍手："Oh! Before we finish——I have to tell you what Hugo did yesterday!"',
     sText:'Tania开始分享Hugo的最新糗事。',sFlags:{_hugoTriggered15:true},
     fText:'Tania老师看了看时间，决定今天不讲闲话了。她直接切回了正课内容。'},
    // Phase 4d: Hugo choice
    {type:'main',tag:'系统',title:'Tania·Hugo的趣事',
     condSkip:function(){return !GS._hugoTriggered15||!GS._attendedTania15;},
     text:'Tania老师讲得眉飞色舞——Hugo昨天趁她不在家，把沙发上的抱枕拖到了后院，在上面滚来滚去，白色的枕套变成了泥巴色。她翻出手机里的"罪证"照片投到屏幕上，全班哄堂大笑。\n\nTania注意到你也笑着在看，冲你眨了眨眼。',
     choices:[
       {text:'安静聆听，配合互动，被逗得开怀大笑',effects:{taniaFavor:4,wisdom:-3},
        result:'你完全被Tania绘声绘色的讲述吸引住了。她模仿Hugo被发现时的无辜表情，全班笑得前仰后合。不过等你回过神来，下课时间已经过了五分钟，Tania似乎完全沉浸在分享中忘掉了下课铃。'},
       {text:'不予理会，趁这个空档自顾自休憩放松',effects:{taniaFavor:-4,happiness:5},
        result:'你趁着大家都在听Hugo的故事，悄悄靠在椅背上闭目养神。Tania老师讲得眉飞色舞，但你实在有些累了。虽然错过了老师的快乐分享，但这几分钟的放空让你的精神恢复了不少。'}
     ]},
    // Phase 5: Drama通知
    {type:'auto',tag:'📢 通知',title:'Drama舞台考试·组队通知',
     text:'下午课程间隙，班级QQ通知群突然弹出一条消息：\n\n📢 【Drama舞台考试通知】\n🎭 本学期英语Drama舞台考试正式启动！\n👥 要求：自由组队，每组5人\n📝 任务：编排英语剧目，期末进行舞台表演考核\n⏰ 组队截止：10月18日\n⚠️ 注意事项：每位同学必须加入一个小组，未组队者系统将随机分配。\n\n请尽快联系同学组建你的Drama小队！',
     effects:{}},
    // Phase 6: Drama手动组队
    {type:'main',tag:'🎭 Drama',title:'Drama小队·手动邀请组队',
     _textGen:function(){
       if(!GS){return'Drama组队数据加载中……';}
       if(GS._dramaAssembled)return 'Drama小队组建完成！';
       if(!GS._dramaInvited)GS._dramaInvited=[];
       if(!GS._dramaPending)GS._dramaPending=[];
       var pool2=[];for(var cid3 in CLASSMATES){if(!CLASSMATES.hasOwnProperty(cid3))continue;if(GS._dramaInvited.indexOf(cid3)>=0)continue;pool2.push(cid3);}
       if(pool2.length===0||GS._dramaPending.length>=4){
         GS._dramaTeam=GS._dramaPending.slice();
         if(GS._dramaTeam.length<4){
           var fillPool=[];for(var cid4 in CLASSMATES){if(!CLASSMATES.hasOwnProperty(cid4))continue;if(GS._dramaTeam.indexOf(cid4)>=0)continue;fillPool.push(cid4);}
           while(GS._dramaTeam.length<4&&fillPool.length>0){var ri4=Math.floor(Math.random()*fillPool.length);GS._dramaTeam.push(fillPool.splice(ri4,1)[0]);}
         }
         GS._dramaAssembled=1;GS._dramaInvited=[];GS._dramaPending=[];
         return '所有同学已邀请完毕！\n\n你的Drama小队成员：\n'+GS._dramaTeam.map(function(id){return '• '+CLASSMATES[id].name;}).join('\n')+'\n\n✅ 组队完成！共'+GS._dramaTeam.length+'名队员。';
       }
       var txt='当前已接受邀请：'+(GS._dramaPending.length||0)+'人 / 需4人\n已尝试邀请：'+GS._dramaInvited.length+'人\n\n请选择下一位要邀请的同学：';
       return txt;
     },
     _choicesGen:function(){
       if(!GS)return[{text:'加载中……',effects:{}}];
       if(GS._dramaAssembled)return [{text:'组队已完成，继续',effects:{}}];
       if(!GS._dramaInvited)GS._dramaInvited=[];
       if(!GS._dramaPending)GS._dramaPending=[];
       if(GS._dramaPending.length>=4)return [{text:'组队已完成，继续',effects:{}}];
       var pool2=[];for(var cid3 in CLASSMATES){if(!CLASSMATES.hasOwnProperty(cid3))continue;if(GS._dramaInvited.indexOf(cid3)>=0)continue;pool2.push(cid3);}
       if(pool2.length===0)return [{text:'无更多同学可邀请，自动补齐',effects:{}}];
       var opts=[];
       for(var si=0;si<pool2.length;si++){var cid5=pool2[si];var cmData3=CLASSMATES[cid5];var fav3=GS.classmateFavor[cid5]||0;var rate3=Math.min(100,Math.max(0,fav3));opts.push({text:cmData3.name+'（好感'+fav3+'，成功率'+Math.floor(rate3)+'%）',effects:{},_dramaCmId:cid5,_dramaFav:fav3,_dramaRate:rate3});}
       return opts;
     }
    },
    // Phase 6b: Drama名称输入
    {type:'main',tag:'🎭 Drama',title:'Drama节目名称',
     condSkip:function(){return !GS._dramaAssembled;},
     _textGen:function(){
       if(!GS||!GS._dramaTeam)return'Drama名称加载中……';
       return '你的Drama小队已经组建完成！\n\n队伍成员：'+GS._dramaTeam.map(function(id){return CLASSMATES[id]?CLASSMATES[id].name:id;}).join('、')+'\n\n请为你们的Drama节目取一个响亮的名字：';
     },
     choices:[
       {text:'输入Drama节目名称',effects:{},_dramaNamePrompt:true,
        result:''}
     ]},
    // Phase 7: 下午自由活动
    {type:'main',tag:'自由活动',title:'下午自由时光',
     text:'Drama组队的忙乱终于告一段落。下午第二节没有排课，你拥有一整段自由时间。秋日阳光透过走廊窗户斜斜洒在地面上，窗外的银杏叶黄了大半。',
     choices:[
       {text:'回宿舍睡觉，补足精力',effects:{health:7},sleepBonus:true,
        result:'你回到宿舍一头倒在床上。下午的空闲时间最适合补觉——闭上眼睛，整个人陷在柔软的被子里，秋日凉风从半开的窗户吹进来，这一觉睡得格外踏实。'},
       {text:'回宿舍打游戏，沉浸在休闲氛围中',effects:{happiness:8},
        result:'你打开电脑登录游戏，戴上耳机。下午没课的时光，打游戏打得理直气壮。几局酣畅淋漓的对战下来，整个人神清气爽。'},
       {text:'留在教室学习，刷题复盘知识点',effects:{wisdom:7},
        result:'你找了间空教室坐下，翻开课本和笔记。利用这段时间把今天各科的重点内容从头梳理了一遍。安静的环境让思维格外清晰，几道高数题在反复推导后终于彻底弄懂了。'},
       {text:'前往大创中心做客，和韩鹏碰面闲谈',effects:{},
        cond:true,condAttr:'keChuangUnlocked',condTh:1,
        sEffects:{hanpengHaoGan:6},sText:'你来到大创中心，韩鹏老师正在调试一台新到的开发板。看到你来，他热情地招呼你坐下，聊了聊最近的科创比赛动向。韩老师还分享了不少做项目的实用经验，一个下午的交流让你收获不少。',
        fText:'你来到大创中心门口，发现门锁着。韩鹏老师今天可能外出开会了。',
        result:'你来到大创中心门口，发现门锁着。'},
       {text:'约女友出去散步闲聊，共度闲暇时光',effects:{},
        cond:true,condAttr:'gfUnlocked',condTh:1,
        sEffects:{gfFavor:4},sText:'你给女友发了条消息，两人约在小花园碰头。秋日的校园美得醉人——你们并肩走过银杏大道，脚下踩着金黄的落叶，聊着今天的课、吐槽着早八的困。她说和你在一起的慵懒下午，是最好的充电方式。',
        fText:'你翻出手机通讯录——还是单身。不过一个人也挺自在的。',
        result:'你翻出手机通讯录——还是单身。'},
       {text:'和Drama小队汇合排练，打磨剧目',effects:{wisdom:4,performance:6},
        cond:true,condAttr:'_dramaAssembled',condTh:1,
        sText:'你联系了Drama小队的成员，大家约在空教室碰头。你们开始分配角色、对台词、走位排练。虽然只是第一次排练还有些生疏，但团队的默契在一点点建立。',
        fText:'你还没有完成Drama组队。先找齐队友再来排练吧。',
        result:'你还没有完成Drama组队。'}
     ]},
    // Phase 8: 晚自习
    {type:'main',tag:'晚间',title:'晚间晚自习',
     text:'夜幕降临，教学楼灯火通明。纪检部工作人员正在逐班清点晚自习出勤人数，手电筒的光束在走廊里扫来扫去。\n\n教室里已经坐了不少同学，安静得只能听见翻书声和偶尔的咳嗽声。你在教室门口站了一会儿——今天一整天下来已经有些累了。',
     choices:[
       {text:'准时参加晚自习，沉下心学习',effects:{happiness:-4,wisdom:7},
        result:'你找了个靠窗的位置坐下，翻开笔记本开始整理今天各科的重点内容。形势与政策课的时政要点、高数课的矩阵运算、学术英语的词汇积累——安静的自习环境让思绪格外清晰。虽然枯燥，但满满当当的笔记让人心里踏实。'},
       {text:'缺席晚自习，回宿舍钻进被窝睡大觉',effects:{glory:-5,health:6,happiness:5},sleepBonus:true,
        result:'你趁纪检部不注意悄悄溜回了宿舍。缺勤记录被登记在册——但你躺在柔软的床上，全身肌肉逐渐放松，很快便沉入梦乡。比起在教室里枯坐两个小时，被窝的诱惑实在无法抵挡。\n\n⚠️ 荣耀-5（晚自习缺勤被登记）'}
     ]}
  ],
};

// ==================== 10.16 剧情 ====================
STORY_DAYS['2024-10-16']={
  title:'数据分析·体育·学术语言·C++·双赛报名',
  phases:[
    {type:'auto',tag:'☀️ 早晨',title:'新的一天',
     text:'秋风掠过鹏远公寓楼宇，凉意漫过校园街道，食堂飘出早餐香气，来往学生步履匆匆奔赴教学楼。你整理完毕走出宿舍，崭新一天的校园日程正式开启。',
     effects:{}},
    // 史鉴明 数据分析
    makeMainPhase('上午①','智能数据分析导论 · 任课教师：史鉴明',
      '上午第一节是史鉴明老师的智能数据分析导论课。史老师今天穿着深色衬衫，一如既往地沉稳严肃。\n\n教室里已经坐了不少人——史鉴明老师的课，缺勤会直接影响平时成绩。你站在教室门口，秋风吹得人有些发凉。',
      [
        {text:'走进教室，顺利落座听课',effects:{shijianmingFavor:4},
         flags:{_attendedData16:true},
         result:'你推开教室门，找了个靠前的位置坐下。史鉴明老师正在调试PPT，看到你进门微微点头。课堂内容紧凑充实——数据分析的案例一个接一个，你手中的笔几乎没停过。'},
        {text:'蜷卧床铺，安稳休憩不去上课',effects:{health:5,happiness:5},sleepBonus:true,
         result:'你站在教室门口犹豫了几秒，最终还是转身回了宿舍。史鉴明老师的课固然重要——但被窝的温暖在这个秋日早晨实在难以抗拒。你把被子裹紧，沉沉睡去。'}
      ]),
    // 纸条触发
    {type:'conditional',tag:'课堂',title:'史鉴明·随堂收纸条',
     condCustom:function(){return true;},prob:0.8,
     text_applied:'课程过半，史鉴明老师突然停下PPT，从公文包里取出一叠空白纸条："今天临时小测验——请每位同学在纸条上写下你对数据分析的理解，署名上交。计入平时成绩。"',
     sText:'教室里响起一片翻书声。史老师开始逐一收纸条。',sFlags:{_paperTriggered16:true},
     fText:'史老师看了看时间，决定今天不搞纸条测验了。他摆了摆手继续讲课。'},
    // 纸条选择
    {type:'main',tag:'课堂',title:'纸条作业',
     condSkip:function(){return !GS._paperTriggered16||!GS._attendedData16;},
     text:'史鉴明老师走到你的座位旁边，伸手等待你的纸条。\n\n周围同学都已经写好了——有的写了满满一张，有的至少写了几行字。你的桌面目前还是空的。',
     choices:[
       {text:'认真写完内容上交',effects:{shijianmingFavor:3},
        result:'你迅速组织语言，在纸条上工整地写下对数据分析的理解——从数据采集、清洗到建模分析，条理清晰。史老师接过纸条看了看，微微点头。'},
       {text:'空白不交，敷衍置之',effects:{},
        hidden:{desc:'数据分析课程成绩-10',gEffects:{dataAnalysis:-10}},
        result:'你摊手表示没写。史老师没有多说什么，但在花名册上你的名字旁画了一个标记。\n\n⚠️ 智能数据分析导论 预估成绩 -10'}
     ]},
    // 纸条缺席
    {type:'auto',tag:'系统',title:'纸条作业·缺勤记录',
     condSkip:function(){return !GS._paperTriggered16||GS._attendedData16;},
     text:'史鉴明老师收齐纸条后核对花名册——你既不在教室也没有交纸条。缺勤加缺作业，双重记录同步至教师后台。\n\n班级群助教发了通知："今日未交纸条同学平时成绩扣除10分。"',
     effects:{},gEffects:{dataAnalysis:-10}},
    // 课后自由六选一
    {type:'main',tag:'自由活动',title:'课间自由时光',
     text:'第一节课结束，距离下节课还有一段自由时间。秋日阳光透过走廊窗户洒在地面上，你站在教学楼门口伸了个懒腰。',
     choices:[
       {text:'回宿舍睡觉，卧床休整',effects:{health:6},sleepBonus:true,result:'回到宿舍一头倒在床上。课间的短暂休憩是给自己充电的最好方式。'},
       {text:'回宿舍打游戏，休闲娱乐放松',effects:{happiness:7},result:'打开电脑登录游戏，戴上耳机。几局酣畅淋漓的对战下来，整个人神清气爽。'},
       {text:'留在教室自习，深耕课业梳理知识点',effects:{wisdom:6},result:'翻开笔记本把刚才史老师讲的重点重新整理了一遍。安静的教室里笔尖划过纸面的沙沙声格外让人专注。'},
       {text:'前往大创中心做客，偶遇韩鹏闲谈',effects:{},
        cond:true,condAttr:'keChuangUnlocked',condTh:1,
        sEffects:{hanpengHaoGan:5},sText:'来到大创中心，韩鹏老师正在整理项目材料。看到你来，他热情地聊了聊最近的科创比赛动向。',
        fText:'大创中心门锁着。韩鹏老师今天可能外出开会了。',result:'大创中心门锁着。'},
       {text:'和女友外出闲逛，结伴散步闲谈',effects:{},
        cond:true,condAttr:'gfUnlocked',condTh:1,
        sEffects:{gfFavor:3},sText:'给女友发了消息，两人约在小花园碰头。秋日校园美得醉人——银杏叶铺满小径，你们边走边聊，说这样的时光是最好的充电方式。',
        fText:'翻出通讯录——还是单身。一个人也挺自在。',result:'翻出通讯录——还是单身。'},
       {text:'和Drama小队排练，磨合剧目',effects:{wisdom:4,performance:5},
        cond:true,condAttr:'_dramaAssembled',condTh:1,
        sText:'联系Drama小队成员约在空教室碰头。你们开始对台词、走位排练，团队的默契在一点点建立。',
        fText:'还没完成Drama组队。先找齐队友再来排练吧。',result:'还没完成Drama组队。'}
     ]},
    // 体育课
    makeMainPhase('下午①','体育课',
      '下午第一节是体育课。十月的秦皇岛秋高气爽，西田径场上阳光明媚、凉风习习。体育老师吹响了集合哨。\n\n今天的主要内容是体能训练——耐力跑+力量练习+柔韧性训练。体育老师特别提醒："体测马上要来了，大家认真对待每次训练！"',
      [
        {text:'认真全程参训，刻苦完成各项训练',effects:{happiness:-3,health:8},
         result:'你咬紧牙关完成了所有训练项目——1000米耐力跑、俯卧撑、仰卧起坐、坐位体前屈。汗水浸透了运动服，但身体的每一次酸痛都是进步的证明。体育老师在花名册上给你画了一个对钩。'},
        {text:'全程浑水摸鱼，躲避训练自在摸鱼',effects:{wisdom:-3,happiness:6},
         result:'你趁体育老师指导其他同学时悄悄减少了训练强度。跑步时慢悠悠地跟在队伍最后面，力量练习也只做了半程。虽然轻松愉快，但体能确实没得到什么锻炼。'}
      ]),
    // 体测通知
    {type:'auto',tag:'📢 通知',title:'国家学生体质健康标准·体测通知',
     text:'课后，班级群弹出一条官方通知：\n\n📢 【2023、2024级《国家学生体质健康标准》体测通知】\n\n👤 测试对象：2024级全体男生\n📅 测试时间：10月20日、26日、27日\n📍 测试地点：西田径场\n📋 测试项目：身高体重、肺活量、坐位体前屈、立定跳远、50米跑、引体向上、1000米跑\n⏰ 到场要求：提前15分钟前往西篮球场集合热身\n🪪 必备证件：校园卡，无证件不予测试\n👕 着装：全套运动服饰、运动鞋\n⚠️ 严禁代测、冒名顶替、陪跑作弊；缺任意项目成绩直接作废\n🏥 免测：10月17日前提交正规医院诊断证明+免测申请表\n🔄 缓测：轻微伤病、课程冲突可申请改期\n📌 体测成绩直接挂钩评奖评优、学位授予资格',
     effects:{}},
    // 校园跑通知
    {type:'auto',tag:'📢 通知',title:'校园健康跑·实施方案',
     text:'紧接着又是一条官方通知：\n\n🏃 【2024-2025学年第一学期校园跑实施方案】\n\n👤 对象：选修常规体育课男生（保健班豁免）\n📅 周期：第6周至第16周（10月14日—12月29日）\n⏰ 有效时段：6:00–7:40、14:30–16:50、18:40–22:00\n📏 里程：总计60公里，单次2公里，合计30次打卡\n⚡ 配速：每公里4分钟～10分钟\n📊 分值：占体育平时分20分，跑完60km得满分\n🚫 禁止替跑、摇步作弊，违规清零\n⚠️ 雨雪/大风/雾霾暂停；身体不适立即就医\n\n从今天起，每晚可选择是否参加校园跑。',
     effects:{}},
    // Tania 学术语言
    makeMainPhase('下午②','学术语言交流与沟通（中级）· 任课教师：Tania',
      '下午第二节，Tania老师端着一杯热拿铁走进教室，脸上挂着标志性的微笑。"Good afternoon everyone!"\n\n她的课堂向来氛围轻松，但互动频率也高——随时可能被点名分享。',
      [
        {text:'准时到场参与课程',effects:{taniaFavor:5},
         flags:{_attendedTania16:true},
         result:'你找了个中间位置坐下。Tania老师调试PPT时冲你笑了笑。课堂氛围轻松活泼，几个同学已经在用英语聊天了。'},
        {text:'宿舍卧床自在休憩',effects:{health:5,happiness:5},sleepBonus:true,
         result:'想了想——学术语言中级，少去一节问题不大。退回房间关上门，下午的时光在休闲中缓缓流淌。'}
      ]),
    // Tania 分享
    {type:'main',tag:'🎤 分享',title:'Tania·体育课日常分享',
     condSkip:function(){return !GS._attendedTania16;},
     text:'课堂互动环节，Tania老师拍了拍手："Alright——let\'s do a quick sharing! Tell us about your PE class today. What did you do? How did you feel?"\n\n她的目光扫过全班，最终停在了你身上。',
     choices:[
       {text:'从容上台，讲述体育课的经历与趣事',effects:{charm:-3,wisdom:5},
        result:'你走上讲台，用英语分享了今天体育课的内容——耐力跑、力量训练、柔韧性练习，还讲了体测通知的事。全班同学听得津津有味，Tania老师频频点头。'},
       {text:'委婉推辞，礼貌回绝发言请求',effects:{taniaFavor:-4},
        result:'你摆了摆手用英语婉拒。Tania老师笑着表示理解，但能看出眼中闪过一丝失望。她转身邀请了另一位举手的同学。'}
     ]},
    // Hugo 触发 (80%)
    {type:'conditional',tag:'系统',title:'Tania·Hugo趣事',
     condCustom:function(){return true;},prob:0.8,
     text_applied:'课堂接近尾声，Tania老师突然笑着拍了拍手："Oh! Before we finish——Hugo did something hilarious yesterday!"',
     sText:'Tania开始分享Hugo的最新糗事。',sFlags:{_hugoTriggered16:true},
     fText:'Tania老师看了时间，决定直接下课。'},
    // Hugo choice
    {type:'main',tag:'系统',title:'Tania·Hugo的趣事',
     condSkip:function(){return !GS._hugoTriggered16||!GS._attendedTania16;},
     text:'Tania老师讲得眉飞色舞——Hugo昨天把她的瑜伽垫当成了巨型猫抓板，在上面滚来滚去，垫子上全是爪印。她翻出照片投到屏幕上，全班哄堂大笑。',
     choices:[
       {text:'认真倾听，被趣事逗得开怀大笑',effects:{taniaFavor:4,wisdom:-3},
        result:'你完全被Tania绘声绘色的讲述吸引住了。教室里笑声不断——不过等你回过神来，已经过了下课时间五分钟。'},
       {text:'自顾走神不理，低头发呆无视对话',effects:{taniaFavor:-4,happiness:4},
        result:'你趁大家在听故事时靠在椅背上闭目养神。虽然错过了Hugo的趣事，但这几分钟的放空让精神恢复了不少。'}
     ]},
    // C++ 晚间课
    {type:'auto',tag:'晚间课程',title:'C++程序设计基础 · 任课教师：李国瑞',
     text:'晚上是李国瑞老师的C++程序设计基础课。李老师依旧戴着黑框眼镜，话不多但字字珠玑。\n\n他在黑板上写下几行代码，然后打开了雨课堂："扫码签到——今天有两道小测验，检验大家对基础语法的掌握程度。"',
     effects:{},setFlags:{liguoruiUnlocked:true}},
    // C++ 随堂测验
    {type:'main',tag:'雨课堂',title:'C++雨课堂随堂测验',
     text:'雨课堂系统弹出两道C++基础题：\n\n① 使用cout控制台输出语句，需要引入哪个标准头文件？\n② 普通32位编译环境中，int整型变量占用几个字节内存？\n\n请选择正确答案：',
     quizCorrectIndex:0,
     choices:[
       {text:'A. iostream，4字节',effects:{},correctEffects:{wisdom:4,liguoruiFavor:3},correctResult:'全部答对！①引入iostream头文件，②int占4字节。李国瑞老师赞许地点了点头。悟性+4，李国瑞好感+3。\n\n📌 系统提示：李国瑞 教师好感度系统已解锁。',wrongResult:'回答错误。正确答案是A：iostream头文件 + int占4字节。'},
       {text:'B. iostream，2字节',effects:{},wrongResult:'回答错误。int在32位环境占4字节而非2字节。正确答案是A。\n⚠️ 悟性-3，李国瑞好感-3'},
       {text:'C. stdio.h，4字节',effects:{},wrongResult:'回答错误。C++使用iostream而非stdio.h。正确答案是A。\n⚠️ 悟性-3，李国瑞好感-3'},
       {text:'D. stdio.h，2字节',effects:{},wrongResult:'回答错误。头文件和字节数都不对。正确答案是A。\n⚠️ 悟性-3，李国瑞好感-3'}
     ]},
    // 晨曦杯报名
    {type:'auto',tag:'📢 通知',title:'第二届"晨曦杯"主持人大赛',
     text:'晚课结束后，班级群弹出一条赛事通知：\n\n🎤百年征程自强不息，凝心聚力再创辉煌——第二届"晨曦杯"主持人大赛震撼来袭！！\n☀️一支话筒，便可挥斥方遒！让热爱绽放，让梦想启航！\n灯光已就位，舞台已搭好！快来秀出你的"十八般武艺"！✨\n【主办】东北大学秦皇岛分校大学生艺术团\n【决赛】2024年11月3日 大学会馆三楼报告厅\n🌱风劲好扬帆，奋进正当时！',
     effects:{}},
    // 晨曦杯选择
    {type:'main',tag:'🎤 报名',title:'晨曦杯·报名参赛',
     text:'你仔细看了看通知——主持人大赛，需要当众演讲、临场发挥、台风稳健。如果歌唱能力出众，舞台表现力会大大加分。',
     choices:[
       {text:'报名参赛！',effects:{},flags:{zhuchirenRegistered:true},
        cond:true,condAttr:'singing',condTh:101,
        sEffects:{charm:10,glory:10},sText:'你果断填了报名表。站在镜子前试了一段即兴主持——声音洪亮、台风稳健，连室友都鼓掌叫好。\n✨ 魅力+10，荣耀+10',
        fEffects:{charm:-5,glory:-2},fText:'你怀着热血填了报名表。但对着镜子练了一段开场白后发现——声音有些发颤、手势也不太自然。不过迈出第一步总是好的。\n😥 魅力-5，荣耀-2'},
       {text:'放弃报名',effects:{},result:'你默默关掉通知。聚光灯下的舞台——还是留给更有勇气的人吧。'}
     ]},
    // 暗恋桃花源
    {type:'auto',tag:'📢 通知',title:'《暗恋桃花源》话剧演员全校招募',
     text:'又一条消息弹了出来——话龙剧社的招募启事：\n\n🌸 《暗恋桃花源》话剧演员招募 ❗️\n🎉现面向全校师生招募演员！\n🎭梦想舞台，等你绽放！\n\n✍️剧情简介："暗恋"是一出现代悲剧——江滨柳和云之凡因战乱相遇又离散，再见已各自成家、白发苍苍；"桃花源"是一出古装喜剧——武陵人老陶发现妻子出轨，离家捕鱼却意外到达桃花源……两个故事，一悲一喜，一古一今，互相干扰，又互相成就。\n\n📍招募要求：对戏剧有热情、有表演基础、良好团队合作精神\n📅 报名：10月13日至10月20日\n📋 报名QQ群：875376559',
     effects:{}},
    // 暗恋桃花源选择
    {type:'main',tag:'🎭 报名',title:'《暗恋桃花源》·报名参演',
     text:'你看完招募启事——经典话剧、全校公演、需要表演基础。如果你有表演能力积累，这将是一个展示自己的绝佳舞台。',
     choices:[
       {text:'报名参演！',effects:{},
        cond:true,condAttr:'performance',condTh:1,
        sEffects:{charm:10,glory:10},sText:'你扫码加入了招募群。群里的学长学姐热情地发了欢迎消息——接下来就是等待面试通知了。\n✨ 魅力+10，荣耀+10',
        fEffects:{charm:-5,glory:-2},fText:'你填了报名表加入招募群。但群里其他报名者发的自我介绍一个比一个厉害——你突然觉得自己的舞台经验还差得远。\n😥 魅力-5，荣耀-2'},
       {text:'放弃报名',effects:{},result:'你关掉招募启事。舞台剧需要大量排练时间——现阶段还是以学业为重吧。'}
     ]}
  ]
};

// ==================== 国庆假期渲染 ====================
function renderCampusEvent(evt,callback){
  var storyEl=$('story-text');
  var ft='<span class="phase-tag main">🔬 大创事件</span><br><strong>'+evt.title+'</strong>\n\n'+evt.text;
  storyEl.innerHTML=storyEl.innerHTML+'<br><br>'+ft.replace(/\n/g,'<br>');
  updatePanel();
  $('choices-area').innerHTML='';
  for(var i=0;i<evt.choices.length;i++){
    var ec=evt.choices[i];
    var btn=document.createElement('button');btn.textContent=ec.text;
    (function(ec){
      btn.onclick=function(){
        var changes=doEffects(Object.assign({},ec.effects||{}));
        $('choices-area').innerHTML='';
        _logCtx={choice:ec.text};
        showPopup(evt.title,ec.result||'',changes,null,function(){
          updatePanel();if(callback)callback();
        });
      };
    })(ec);
    $('choices-area').appendChild(btn);
  }
}

function renderHolidayDay(dk){
  var hd=HOLIDAY_DAYS[dk];
  if(!hd)return;
  var wd=weekday(GS.year,GS.month,GS.day);
  var dStr=fmtDate(GS.year,GS.month,GS.day);
  var routeKey=GS.holidayRoute;
  var route=routeKey?HOLIDAY_ROUTES[routeKey]:null;

  if(hd.isSelection&&!routeKey){
    // Oct 1: route selection first
    $('main-area').innerHTML='<div id="story-title">📅 '+dStr+'　星期'+wd+' · 国庆第1天</div><div id="story-text">'+hd.bgText.replace(/\n/g,'<br>')+'<br><br><div style="color:#8b7d6b;font-size:.85em;">👇 请选择你的七日过节路线（选定后10.2-10.7不可更改）</div></div>';
    updatePanel();
    $('choices-area').innerHTML='';
    var routeKeys=['home','campus','couple','internship','dorm'];
    for(var r=0;r<routeKeys.length;r++){
      var rk=routeKeys[r];
      var rd=HOLIDAY_ROUTES[rk];
      if(rd.requiresGf&&!GS.gfUnlocked)continue;
      var btn=document.createElement('button');btn.textContent=rd.name;
      (function(rk,rd){
        btn.onclick=function(){
        if(rk==='couple'&&GS.girlfriends&&GS.girlfriends.length>1){
          showHolidayGfSelect(hd,dk,function(){finishHolidayDay();});
        }else{
          GS.holidayRoute=rk;
          applyHolidayDay(hd,dk,rk,function(){finishHolidayDay();});
        }
      };
      })(rk,rd);
      $('choices-area').appendChild(btn);
    }
    return;
  }

  if(!routeKey){GS.holidayRoute='campus';routeKey='campus';route=HOLIDAY_ROUTES.campus;}
  applyHolidayDay(hd,dk,routeKey,function(){finishHolidayDay();});
}

function showHolidayGfSelect(hd,dk,callback){
  var wd=weekday(GS.year,GS.month,GS.day);
  var dStr=fmtDate(GS.year,GS.month,GS.day);
  $('main-area').innerHTML='<div id="story-title">📅 '+dStr+'　星期'+wd+' · 国庆出行</div><div id="story-text">'+hd.bgText.replace(/\n/g,'<br>')+'<br><br><div style="color:#8b7d6b;font-size:.85em;">💕 你有'+GS.girlfriends.length+'名女友，请选择同行出游的一位：</div></div>';
  updatePanel();
  $('choices-area').innerHTML='';
  for(var i=0;i<GS.girlfriends.length;i++){
    var gf=GS.girlfriends[i];
    var btn=document.createElement('button');btn.textContent='💕 '+gf.name+'（好感：'+gf.favor+'）';
    (function(gf){
      btn.onclick=function(){
        GS.holidayRoute='couple';
        GS._holidayGfId=gf.id;
        applyHolidayDay(hd,dk,'couple',callback);
      };
    })(gf);
    $('choices-area').appendChild(btn);
  }
}

function applyHolidayDay(hd,dk,routeKey,callback){
  var route=HOLIDAY_ROUTES[routeKey];
  var wd=weekday(GS.year,GS.month,GS.day);
  var dStr=fmtDate(GS.year,GS.month,GS.day);

  // Apply daily route effects
  if(route.dailyEffects){
    var routeChanges=doEffects(Object.assign({},route.dailyEffects));
    if(routeKey==='home'&&GS.gfUnlocked){
      GS.gfFavor=Math.max(0,GS.gfFavor-5);
    }
    if(routeKey==='couple'&&GS.gfUnlocked){
      var holGf2=getGfById(GS._holidayGfId);
      if(holGf2){holGf2.favor=Math.max(0,holGf2.favor+18);GS.classmateFavor[holGf2.id]=holGf2.favor;if(GS.girlfriends[0].id===holGf2.id)GS.gfFavor=holGf2.favor;}
      else{GS.gfFavor=Math.max(0,GS.gfFavor+18);}
    }
    updatePanel();
  }

  var storyEl=$('story-text');
  var titleHtml='<div id="story-title">📅 '+dStr+'　星期'+wd+' · 国庆第'+hd.dayNum+'天</div>';
  var bgHtml=hd.bgText.replace(/\n/g,'<br>');
  var routeLabel='<br><span style="color:#1a3a5c;font-size:.85em;">🏷️ 当前路线：'+route.name+'</span>';
  storyEl.innerHTML=titleHtml+'<div id="story-text">'+bgHtml+routeLabel+'</div>';
  updatePanel();
  $('choices-area').innerHTML='';

  // Campus events
  if(routeKey==='campus'&&hd.campusEvents&&hd.campusEvents.length>0){
    var evtIdx=0;
    function nextCampusEvent(){
      if(evtIdx>=hd.campusEvents.length){
        showHolidayGfOrFinish(hd,routeKey,callback);
        return;
      }
      renderCampusEvent(hd.campusEvents[evtIdx],function(){
        evtIdx++;nextCampusEvent();
      });
    }
    nextCampusEvent();
    return;
  }

  showHolidayGfOrFinish(hd,routeKey,callback);
}

function showHolidayGfOrFinish(hd,routeKey,callback){
  if(GS.gfUnlocked&&hd.gfEvents&&hd.gfEvents[routeKey]){
    var ge=hd.gfEvents[routeKey];
    var gfName=(GS._holidayGfId&&getGfById(GS._holidayGfId))?getGfById(GS._holidayGfId).name:(GS.gfName||'女友');
    var displayText=ge.text.replace(/女友/g,gfName);
    var storyEl=$('story-text');
    var ft='<span class="phase-tag love">💕 女友事件</span><br><strong>'+ge.title+'</strong>\n\n'+displayText;
    storyEl.innerHTML=storyEl.innerHTML+'<br><br>'+ft.replace(/\n/g,'<br>');
    updatePanel();
    $('choices-area').innerHTML='';
    renderHolidayGfChoices(ge,routeKey,function(){if(callback)callback();},gfName);
  }else{
    if((GS.girlfriends&&GS.girlfriends.length>0)||GS.gfUnlocked){
      renderDailyGfEvent(function(){if(callback)callback();});
    }else{
      if(callback)callback();
    }
  }
}

function renderHolidayGfChoices(ge,routeKey,callback,gfName){
  gfName=gfName||(GS.gfName||'女友');
  var routeMod=HOLIDAY_ROUTES[routeKey].gfMod||{};
  for(var i=0;i<ge.choices.length;i++){
    var gc=ge.choices[i];
    var btn=document.createElement('button');btn.textContent=gc.text.replace(/女友/g,gfName);
    (function(gc,idx){
      btn.onclick=function(){
        var eff=Object.assign({},gc.effects||{});
        var gfChanges={};
        if(gc.gfEffects){
          var holGf=getGfById(GS._holidayGfId);
          if(holGf){
            if((gc.gfEffects.gfFavor||0)>0)GS.breakupProb=0;
            var adj2=gc.gfEffects.gfFavor||0;
            if(routeMod.acceptPenalty)adj2=Math.max(0,adj2-routeMod.acceptPenalty);
            var oldFv2=holGf.favor;holGf.favor=Math.max(0,holGf.favor+adj2);
            gfChanges.gfFavor=holGf.favor-oldFv2;
            GS.classmateFavor[holGf.id]=holGf.favor;
            if(GS.girlfriends[0].id===holGf.id)GS.gfFavor=holGf.favor;
          }else{
            GS.breakupProb=0;
            for(var k2 in gc.gfEffects){
              if(gc.gfEffects.hasOwnProperty(k2)&&GS.hasOwnProperty(k2)&&typeof GS[k2]==='number'){
                var adj=gc.gfEffects[k2];
                if(k2==='gfFavor'&&routeMod.acceptPenalty)adj=Math.max(0,adj-routeMod.acceptPenalty);
                var old2=GS[k2];GS[k2]=Math.max(0,GS[k2]+adj);gfChanges[k2]=GS[k2]-old2;
              }
            }
            if(GS.girlfriends&&GS.girlfriends.length>0){GS.girlfriends[0].favor=GS.gfFavor;GS.classmateFavor[GS.girlfriends[0].id]=GS.gfFavor;}
          }
          if(routeKey==='couple'&&routeMod.specialChance&&Math.random()<routeMod.specialChance){
            gfChanges.charm=(gfChanges.charm||0)+3;GS.charm+=3;
            gfChanges.happiness=(gfChanges.happiness||0)+5;GS.happiness+=5;
          }
        }else if(idx===1){
          var extra=routeMod.rejectExtra||0;
          GS.breakupProb+=10+extra;
        }
        var changes=doEffects(eff);
        for(var k3 in gfChanges){if(gfChanges.hasOwnProperty(k3))changes[k3]=gfChanges[k3];}
        $('choices-area').innerHTML='';
        var resultText=(gc.result||'').replace(/女友/g,gfName);
        if(routeKey==='couple'&&gc.gfEffects&&routeMod.specialChance&&Math.random()<routeMod.specialChance){
          resultText+='\n\n🌙 暧昧隐藏剧情触发：夜幕低垂，灯火阑珊。'+gfName+'悄悄靠近你，在你耳边轻声说了一句只有你们两人能听见的话。这个国庆注定难忘。';
        }
        if(idx===1&&GS.breakupProb>=100){
          updatePanel();
          showBreakupPopup(function(){updatePanel();if(callback)callback();});
        }else if(idx===1&&GS.breakupProb>0&&Math.random()*100<GS.breakupProb){
          updatePanel();
          showBreakupPopup(function(){updatePanel();if(callback)callback();});
        }else{
          _logCtx={choice:gc.text.replace(/女友/g,gfName)};
          showPopup(ge.title,resultText,changes,null,function(){updatePanel();if(callback)callback();});
        }
      };
    })(gc,i);
    $('choices-area').appendChild(btn);
  }
}

function finishHolidayDay(){
  $('choices-area').innerHTML='';
  var nb=document.createElement('button');nb.className='primary';nb.textContent='→ 下一天';
  nb.onclick=function(){advanceToNextDay();};
  $('choices-area').appendChild(nb);saveGame();
}

// ==================== 日常模式引擎 ====================
function enterScriptedDays(){
  GS.phase='daily';GS.year=2024;GS.month=9;GS.day=8;
  updatePanel();
  $('attr-panel').style.display='block';
  $('bottom-bar').style.display='flex';
  renderBottomBar();
  processDay();
}

function processDay(){
  var dk=dateKey(GS.year,GS.month,GS.day);
  // Phone initialization on first daily entry
  if(!GS._phoneInitialized){GS._phoneInitialized=true;phoneInitOnStart();}
  // Phone daily processing
  processPhoneDaily();
  var tmpFlags=['_attendedHanjie','_attendedMath','_signinTriggered','_attendedCherry','_quizzzTriggered','_attendedData','_paperTriggered','_attendedTania','_hugoTriggered','_cppAttended','_attendedCherry10','_attendedMath10','_signinTriggered10','_attendedTania11','_attendedData11','_paperTriggered11','_attendedMath11','_signinTriggered11','_hugoTriggered11','_wentACM','_attendedCpp14','_attendedMoral14','_attendedTania14','_attendedLabor14','_attendedHanjie15','_attendedMath15','_signinTriggered15','_attendedTania15','_hugoTriggered15','_dailyInteractIds','_gfEventFired','_campusRunPrompted'];
  for(var tf=0;tf<tmpFlags.length;tf++){delete GS[tmpFlags[tf]];}
  GS._dailyInteractIds={};
  if(dk==='2024-10-14'){GS.weather=WEATHER_TYPES.rain;}
  else{GS.weather=pickDailyWeather();}
  doEffects(GS.weather.effects);
  if(GS.stocksUnlocked)updateStockPrices();
  if(GS.day===1)applyMonthly();
  var isHoliday=HOLIDAY_DAYS[dk]?true:false;
  if(!isHoliday&&GS.girlfriends&&GS.girlfriends.length>0){
    for(var gi=GS.girlfriends.length-1;gi>=0;gi--){
      var gfObj=GS.girlfriends[gi];
      if(gfObj.coolingDays===0){gfObj.favor=Math.max(0,gfObj.favor-1);GS.classmateFavor[gfObj.id]=gfObj.favor;}
      if(gfObj.favor<30&&Math.random()<0.15&&gfObj.coolingDays===0){
        var gfn=gfObj.name;
        GS.classmateFavor[gfObj.id]=Math.max(0,gfObj.favor-20);
        removeGf(gfObj.id);
        updatePanel();
        showPopup('💔 分手',gfn+'提出了分手。你们的关系走到了尽头，恋爱关系已解除。',null,null,function(){updatePanel();});}
    }
    if(GS.girlfriends.length>0){
      GS.gfUnlocked=true;GS.gfName=GS.girlfriends[0].name;GS.gfFavor=GS.girlfriends[0].favor;
    }
    processCoolingDays();
  }
  updatePanel();
  if(isHoliday&&(GS.holidayRoute==='home'||GS.holidayRoute==='couple'||GS.holidayRoute==='internship')){
    processDayContinue(dk);
  }else if(GS.lastMealDay!==dk){
    renderMealChoice(dk,function(){processDayContinue(dk);});
  }else{
    processDayContinue(dk);
  }
}

function processDayContinue(dk){
  if(GS.lastBonusDay!==dk){
    GS.lastBonusDay=dk;
    var evt=DAILY_BONUS_EVENTS[Math.floor(Math.random()*DAILY_BONUS_EVENTS.length)];
    var changes=doEffects(Object.assign({},evt.effects));
    updatePanel();
    _logCtx={choice:'（每日小幸运）'};
    showPopup('✨ 今日小幸运',evt.text,changes,null,function(){
      updatePanel();
      processDayContinueInner(dk);
    });
    return;
  }
  processDayContinueInner(dk);
}
function processDayContinueInner(dk){
  checkMultiGfDiscovery(function(){
    processDayContinueInner2(dk);
  });
}
function processDayContinueInner2(dk){
  if(HOLIDAY_DAYS[dk]){
    renderHolidayDay(dk);return;
  }
  var sd=STORY_DAYS[dk];
  if(sd){
    GS.currentDay=dk;GS.currentPhaseIdx=0;
    renderDayTitle(sd);
    if(GS.weather){
      $('story-text').innerHTML='<div style="color:#6b5f50;font-size:.85em;margin-bottom:6px;">'+GS.weather.icon+' 今日天气：'+GS.weather.name+' · '+GS.weather.desc+'</div>';
    }
    if(GS.gfUnlocked){
      triggerClassmateEvent(function(){renderDayPhase(sd,0);});
    }else{
      renderDayPhase(sd,0);
    }
  }else{
    renderGenericDay();
  }
}

function renderMealChoice(dk,callback){
  GS.lastMealDay=dk;
  $('main-area').innerHTML='<div id="story-title">🍽️ 今日用餐</div><div id="story-text">到了用餐时间，今天你想吃什么？</div>';
  $('choices-area').innerHTML='';
  var choices=[
    {text:'A. 点外卖 — 在宿舍舒舒服服点一份外卖，方便美味（金钱-15，幸福+5）',effects:{money:-15,happiness:5},result:'你在外卖App上精挑细选，点了一份热气腾腾的盖浇饭。外卖小哥准时送到宿舍楼下，你边追剧边享用，惬意十足。'},
    {text:'B. 校内食堂 — 去校内食堂吃一顿经济实惠、营养均衡的午餐（金钱-10）',effects:{money:-10},result:'你拿着饭卡来到校内食堂，打了一份两荤一素的套餐。味道中规中矩，但胜在经济实惠、营养搭配合理。吃完饭精神饱满，下午的学习效率都提高了。'}
  ];
  if(GS.hasPengyuanCard){
    choices.push({text:'C. 鹏远食堂 — 在鹏远公寓食堂刷卡用餐，离宿舍最近（鹏远余额-8）',effects:{pengyuanBalance:-8},result:'你来到鹏远食堂，这里离宿舍最近。刷鹏远卡支付了8元，菜品比校内食堂精致不少——糖醋里脊、清炒时蔬、一碗热汤，环境也安静整洁。吃完饭走两分钟就回到宿舍，方便极了。'});
  }
  for(var i=0;i<choices.length;i++){
    var c=choices[i];
    var btn=document.createElement('button');
    btn.textContent=c.text;
    (function(ci,isDelivery){
      btn.onclick=function(){
        var eff=Object.assign({},ci.effects);
        var resultText=ci.result;
        var stolen=false;
        if(isDelivery&&Math.random()<0.1){
          eff={money:-15,happiness:-3,health:-3};
          resultText='你满怀期待地跑到楼下取外卖，却发现外卖已经不翼而飞——被人偷走了！你气得跳脚，肚子空空、心情低落。';
          stolen=true;
        }
        var changes=doEffects(eff);
        $('choices-area').innerHTML='';
        var title=stolen?'🚨 外卖被偷':'用餐';
        _logCtx={choice:c.text};
        showPopup(title,resultText,changes,null,function(){
          updatePanel();
          if(callback)callback();
        });
      };
    })(c,i===0);
    $('choices-area').appendChild(btn);
  }
}

function renderDayTitle(dayData){
  var wd=weekday(GS.year,GS.month,GS.day);
  $('main-area').innerHTML='<div id="story-title">📅 '+fmtDate(GS.year,GS.month,GS.day)+' 星期'+wd+' · '+dayData.title+'</div><div id="story-text"></div>';
  $('choices-area').innerHTML='';
}

function renderDayPhase(dayData,idx){
  if(idx>=dayData.phases.length){
    try{
      if(dayData.gfEvent&&GS.gfUnlocked){renderGfEvent(dayData,function(){renderDailyGfEvent(function(){finishDay(dayData);},'suxiaonuan');});}
      else if(GS.girlfriends&&GS.girlfriends.length>0){renderDailyGfEvent(function(){finishDay(dayData);});}
      else if(GS.gfUnlocked){renderDailyGfEvent(function(){finishDay(dayData);});}
      else{triggerClassmateEvent(function(){finishDay(dayData);});}
    }catch(e){finishDay(dayData);}
    return;
  }
  GS.currentPhaseIdx=idx;
  var ph=dayData.phases[idx];
  if(ph.condSkip&&ph.condSkip()){renderDayPhase(dayData,idx+1);return;}
  var tagHtml=ph.tag?'<span class="phase-tag '+(ph.type||'main')+'">'+ph.tag+'</span><br>':'';
  var storyEl=$('story-text');
  var cur=storyEl.innerHTML;

  if(ph.type==='auto'){
    var eff=ph.effects||{};
    if(ph.setFlags)Object.assign(GS,ph.setFlags);
    if(ph.gEffects){
      for(var gk2 in ph.gEffects){
        if(ph.gEffects.hasOwnProperty(gk2)&&GS.courseGrades&&GS.courseGrades.hasOwnProperty(gk2)){
          GS.courseGrades[gk2]=Math.max(0,Math.min(100,GS.courseGrades[gk2]+ph.gEffects[gk2]));
        }
      }
    }
    var changes=doEffects(eff);
    var phText=ph._textGen?ph._textGen():ph.text;
    var ft=(tagHtml+'<strong>'+ph.title+'</strong>\n\n'+phText).replace(/\n/g,'<br>');
    storyEl.innerHTML=cur+'<br><br>'+ft;
    updatePanel();
    _logCtx={choice:'（自动事件）'};
    showPopup(ph.title,'',changes,null,function(){renderDayPhase(dayData,idx+1);},'我已知晓');
    return;
  }

  if(ph.type==='conditional'){
    var condMet=true;
    if(ph.condCustom){condMet=ph.condCustom();}
    else if(ph.condFlag){condMet=!!GS[ph.condFlag];}
    var text='',eff2={},hiddenInfo=null;
    if(ph.isSpecial&&ph.specialType==='loveUnlock'){
      if(condMet){
        text=ph.text_applied;eff2=Object.assign({},ph.sEffects||{});
        if(ph.sFlags)Object.assign(GS,ph.sFlags);
        if(ph.sHidden)hiddenInfo=ph.sHidden;
        text+='\n\n'+ph.sText;
      }else{
        text=ph.text_not;eff2=Object.assign({},ph.fEffects||{});
        text+='\n\n'+ph.fText;
      }
    }else if(ph.isSpecial&&ph.specialType==='clubInterview'){
      if(condMet){
        text=ph.text_applied;
        var pass=false;
        if(GS.clubType==='体育社团')pass=(GS.health+GS.charm)>=180;
        else if(GS.clubType==='学院组织')pass=(GS.glory+GS.wisdom)>=180;
        else if(GS.clubType==='图书管理员')pass=(GS.wisdom+GS.happiness)>=180;
        else if(GS.clubType==='文艺部')pass=(GS.charm+GS.singing)>=180;
        if(pass){
          text+='\n\n'+ph.sText;
          if(GS.clubType==='体育社团')eff2={health:15,glory:8};
          else if(GS.clubType==='学院组织')eff2={wisdom:12,glory:10};
          else if(GS.clubType==='图书管理员')eff2={wisdom:14,happiness:9};
          else if(GS.clubType==='文艺部')eff2={charm:13,singing:10};
        }else{text+='\n\n'+ph.fText;}
      }else{text=ph.text_not;}
    }else{
      if(condMet){
        text=ph.text_applied;var roll=Math.random();
        if(roll<ph.prob){eff2=Object.assign({},ph.sEffects||{});text+='\n\n'+ph.sText;if(ph.sHidden)hiddenInfo=ph.sHidden;if(ph.sFlags)Object.assign(GS,ph.sFlags);}
        else{eff2=Object.assign({},ph.fEffects||{});text+='\n\n'+ph.fText;}
      }else{text=ph.text_not||'你没有参与此事项。';}
    }
    var ft2=(tagHtml+'<strong>'+ph.title+'</strong>\n\n'+text).replace(/\n/g,'<br>');
    storyEl.innerHTML=cur+'<br><br>'+ft2;
    var changes2=doEffects(eff2);updatePanel();
    _logCtx={choice:'（系统判定）'};
    showPopup(ph.title,'',changes2,hiddenInfo,function(){renderDayPhase(dayData,idx+1);},'我已知晓');
    return;
  }

  if(ph.type==='random'){
    if(GS.tuanxiaoAccepted&&GS.tuanxiaoWeekBan>0&&isWeekend(GS.year,GS.month,GS.day)&&GS.month>=10&&!(GS.month===10&&GS.day>=1&&GS.day<=7)){
      storyEl.innerHTML=cur+'<br><br><span style="color:#c0392b;">⚠️ 今天是周末，但因团校集训安排，随机事件不可用。</span>';
      updatePanel();renderDayPhase(dayData,idx+1);return;
    }
    var pool=RP[ph.pool];
    if(!pool||pool.length===0){renderDayPhase(dayData,idx+1);return;}
    var evt=pool[Math.floor(Math.random()*pool.length)];
    if(typeof evt==='function')evt=evt();
    var ft3=(tagHtml+'<strong>'+evt.title+'</strong>\n\n'+evt.text).replace(/\n/g,'<br>');
    storyEl.innerHTML=cur+'<br><br>'+ft3;updatePanel();
    $('choices-area').innerHTML='';
    evt.choices.forEach(function(ec){
      var btn=document.createElement('button');btn.textContent=ec.text;
      btn.onclick=function(){
        var eff3=Object.assign({},ec.effects||{});
        var changes3=doEffects(eff3);
        if(ec.cmFav){if(typeof ec.cmFav==='number'){var cmId3=ec._cmId;if(cmId3&&GS.classmateFavor&&GS.classmateFavor.hasOwnProperty(cmId3)){var oldFav3=GS.classmateFavor[cmId3]||0;GS.classmateFavor[cmId3]=Math.max(0,oldFav3+ec.cmFav);changes3[cmId3+'Fav']=ec.cmFav;}}else{for(var cmId in ec.cmFav){if(ec.cmFav.hasOwnProperty(cmId)&&GS.classmateFavor&&GS.classmateFavor.hasOwnProperty(cmId)){var oldFav3=GS.classmateFavor[cmId]||0;GS.classmateFavor[cmId]=Math.max(0,oldFav3+ec.cmFav[cmId]);changes3[cmId+'Fav']=ec.cmFav[cmId];}}}}
        $('choices-area').innerHTML='';
        _logCtx={choice:ec.text};
        showPopup(evt.title,ec.result||'',changes3,null,function(){updatePanel();renderDayPhase(dayData,idx+1);});
      };
      $('choices-area').appendChild(btn);
    });return;
  }

  // main/evening 类型
  var phText2=ph._textGen?ph._textGen():ph.text;
  var phChoices=ph._choicesGen?ph._choicesGen():ph.choices;
  var ft4=(tagHtml+'<strong>'+(ph.title||'')+'</strong>\n\n'+(phText2||'')).replace(/\n/g,'<br>');
  storyEl.innerHTML=cur+'<br><br>'+ft4;updatePanel();
  $('choices-area').innerHTML='';
  if(!phChoices||phChoices.length===0){
    var btn4=document.createElement('button');btn4.className='primary';btn4.textContent='我已知晓';
    btn4.onclick=function(){renderDayPhase(dayData,idx+1);};
    $('choices-area').appendChild(btn4);return;
  }
  phChoices.forEach(function(pc,ci){
    var btn=document.createElement('button');btn.textContent=pc.text;
    btn.onclick=function(){
      var eff4=Object.assign({},pc.effects||{}),hiddenInfo4=null;
      if(pc.hidden){
        hiddenInfo4=pc.hidden.desc||'';
        if(pc.hidden.flags)Object.assign(GS,pc.hidden.flags);
        if(pc.hidden.effects)Object.assign(eff4,pc.hidden.effects);
        if(pc.hidden.gEffects){
          for(var gk in pc.hidden.gEffects){
            if(pc.hidden.gEffects.hasOwnProperty(gk)&&GS.courseGrades&&GS.courseGrades.hasOwnProperty(gk)){
              GS.courseGrades[gk]=Math.max(0,Math.min(100,GS.courseGrades[gk]+pc.hidden.gEffects[gk]));
            }
          }
        }
      }
      if(pc.flags)Object.assign(GS,pc.flags);
      var riskInfo=null;
      if(pc.risk){if(Math.random()<pc.risk.chance){Object.assign(eff4,pc.risk.effects||{});riskInfo=pc.risk.desc||'';}}
      if(ph.quizCorrectIndex!==undefined){
        if(ci===ph.quizCorrectIndex){
          if(pc.correctEffects)Object.assign(eff4,pc.correctEffects);
          pc._result=pc.correctResult||pc._result;
        }else{
          pc._result=pc.wrongResult||pc._result;
        }
      }
      if(pc.cond){
        var val=0;
        if(pc.condAttr==='charmPlusGlory')val=GS.charm+GS.glory;
        else val=GS[pc.condAttr]||0;
        if(val>=pc.condTh){
          Object.assign(eff4,pc.sEffects||{});
          if(pc.sFlags)Object.assign(GS,pc.sFlags);
          if(pc.sHidden)hiddenInfo4=hiddenInfo4?hiddenInfo4+' | '+pc.sHidden:pc.sHidden;
          pc._result=pc.sText;
        }
        else{Object.assign(eff4,pc.fEffects||{});pc._result=pc.fText;}
      }
      if(pc.sleepBonus){
        var sb=getWeatherSleepBonus();
        if(Object.keys(sb).length>0){
          Object.assign(eff4,sb);
          var br=pc._result||pc.result||'';
          pc._result=br+'\n\n🌧️ '+getWeatherSleepNarrative();
        }
      }
      // Drama name input
      if(pc._dramaNamePrompt){
        var dramaName=prompt('请输入Drama节目名称：');
        if(!dramaName||dramaName.trim()==='')dramaName='未命名Drama';
        GS._dramaName=dramaName;
        pc._result='你们的Drama节目定名为：\n\n🎭 '+dramaName+'\n\n祝排练顺利，期末舞台大放光彩！';
      }
      // Drama invite handling
      if(pc._dramaCmId){
        if(!GS._dramaInvited)GS._dramaInvited=[];
        if(!GS._dramaPending)GS._dramaPending=[];
        GS._dramaInvited.push(pc._dramaCmId);
        var roll4=Math.random()*100;
        var succ2=roll4<pc._dramaRate;
        if(succ2)GS._dramaPending.push(pc._dramaCmId);
        var dramaResult='📨 邀请 '+CLASSMATES[pc._dramaCmId].name+'（好感'+pc._dramaFav+'，成功率'+Math.floor(pc._dramaRate)+'%，掷骰'+Math.floor(roll4)+'）\n→ '+(succ2?'✅ 接受了邀请！':'❌ 拒绝了邀请。')+'\n\n当前队伍：'+(GS._dramaPending.length||0)+'人 / 需4人';
        $('choices-area').innerHTML='';
        showPopup('🎭 Drama组队',dramaResult,{},null,function(){updatePanel();renderDayPhase(dayData,idx);});
        return;
      }
      var allHidden=hiddenInfo4;if(riskInfo)allHidden=allHidden?allHidden+' | '+riskInfo:riskInfo;
      var changes4=doEffects(eff4);
      if(pc.cmFav){if(typeof pc.cmFav==='number'){var cmIdP=pc._cmId;if(cmIdP&&GS.classmateFavor&&GS.classmateFavor.hasOwnProperty(cmIdP)){var oldFav4=GS.classmateFavor[cmIdP]||0;GS.classmateFavor[cmIdP]=Math.max(0,oldFav4+pc.cmFav);changes4[cmIdP+'Fav']=pc.cmFav;}}else{for(var cmId2 in pc.cmFav){if(pc.cmFav.hasOwnProperty(cmId2)&&GS.classmateFavor&&GS.classmateFavor.hasOwnProperty(cmId2)){var oldFav4=GS.classmateFavor[cmId2]||0;GS.classmateFavor[cmId2]=Math.max(0,oldFav4+pc.cmFav[cmId2]);changes4[cmId2+'Fav']=pc.cmFav[cmId2];}}}}
      $('choices-area').innerHTML='';
      _logCtx={choice:pc.text};
      showPopup(ph.title||'',pc._result||pc.result||'',changes4,allHidden,function(){
        updatePanel();renderDayPhase(dayData,idx+1);
      });
    };
    $('choices-area').appendChild(btn);
  });
}

function renderGfEvent(dayData,afterCb){
  GS._gfEventFired=fmtDate(GS.year,GS.month,GS.day);
  // Story GF events always target 苏小暖 - sync her favor
  var suGf=getGfById('suxiaonuan');
  if(suGf){GS.gfFavor=suGf.favor;}
  else{GS.gfFavor=GS.classmateFavor.suxiaonuan||GS.gfFavor;}
  function done(){if(afterCb){afterCb();}else{finishDay(dayData);}}
  var ge=dayData.gfEvent;
  var storyEl=$('story-text');
  var ft='<span class="phase-tag love">💕 女友事件</span><br><strong>'+ge.title+'</strong>\n\n'+ge.text;
  storyEl.innerHTML=storyEl.innerHTML+'<br><br>'+ft.replace(/\n/g,'<br>');
  updatePanel();
  $('choices-area').innerHTML='';
  for(var i=0;i<ge.choices.length;i++){
    var gc=ge.choices[i];
    var btn=document.createElement('button');btn.textContent=gc.text;
    (function(gc,idx){
      btn.onclick=function(){
        var eff=Object.assign({},gc.effects||{});
        var gfChanges={};
        if(gc.gfEffects){
          GS.breakupProb=0;
          for(var k2 in gc.gfEffects){
            if(gc.gfEffects.hasOwnProperty(k2)&&GS.hasOwnProperty(k2)&&typeof GS[k2]==='number'){
              var old2=GS[k2];GS[k2]=Math.max(0,GS[k2]+gc.gfEffects[k2]);gfChanges[k2]=GS[k2]-old2;
            }
          }
          // Story GF events are always 苏小暖
          var gfGf=getGfById('suxiaonuan');
          if(gfGf){gfGf.favor=GS.gfFavor;GS.classmateFavor.suxiaonuan=GS.gfFavor;}
          else{GS.classmateFavor.suxiaonuan=GS.gfFavor;}
        }else if(idx===1){
          GS.breakupProb+=10;
        }
        var changes=doEffects(eff);
        for(var k3 in gfChanges){if(gfChanges.hasOwnProperty(k3))changes[k3]=gfChanges[k3];}
        if(gfChanges.gfFavor){changes.suxiaonuanFav=gfChanges.gfFavor;delete changes.gfFavor;}
        $('choices-area').innerHTML='';
        if(idx===1&&GS.breakupProb>0&&Math.random()*100<GS.breakupProb){
          updatePanel();
          showBreakupPopup(function(){updatePanel();done();});
        }else{
          _logCtx={choice:gc.text};
          showPopup(ge.title,gc.result||'',changes,null,function(){
            updatePanel();done();
          });
        }
      };
    })(gc,i);
    $('choices-area').appendChild(btn);
  }
}


function showBreakupPopup(callback){
  var seq3=++GS._popupSeq||(GS._popupSeq=1);
  var overlay=document.createElement('div');overlay.className='popup-overlay';
  overlay.innerHTML='<div class="popup-box"><div class="popup-title">💔 感情危机</div><div class="popup-result">你多次拒绝了女友，她感到非常失望和伤心。你们的感情出现了严重危机……</div><div style="display:flex;flex-direction:column;gap:8px;margin-top:16px;"><button class="popup-btn" id="bp-reconcile-'+seq3+'" style="background:#c0392b;">花费150元买礼物和好（金钱-150）</button><button class="popup-btn" id="bp-breakup-'+seq3+'" style="background:#8b7d6b;">分手吧</button></div></div>';
  document.body.appendChild(overlay);
  document.getElementById('bp-reconcile-'+seq3).onclick=function(){
    overlay.remove();
    if(GS.money>=150){
      GS.money-=150;GS.breakupProb=0;updatePanel();
      showPopup('和好','你花了150元买了一份精心准备的礼物送给女友，诚恳地道歉。她的眼泪还没干，但嘴角已经微微上扬。你们和好如初。',{money:-150},null,callback);
    }else{
      GS.gfUnlocked=false;GS.gfName='';GS.gfFavor=0;GS.breakupProb=0;
      updatePanel();
      showPopup('分手','你的余额不足150元，无法购买礼物挽回。你们最终还是分手了。恋爱面板已清空。',null,null,callback);
    }
  };
  document.getElementById('bp-breakup-'+seq3).onclick=function(){
    overlay.remove();
    GS.gfUnlocked=false;GS.gfName='';GS.gfFavor=0;GS.breakupProb=0;
    updatePanel();
    showPopup('分手','你选择了分手。从此天各一方，各生欢喜。恋爱面板已清空。',null,null,callback);
  };
  overlay.onclick=function(e){if(e.target===overlay){overlay.remove();if(callback)callback();}};
}

function finishDay(dayData){
  // If GF exists but gfEvent hasn't fired yet today, fire it now
  if((GS.girlfriends&&GS.girlfriends.length>0)||GS.gfUnlocked){
    var alreadyFired=GS._gfEventFired||'';
    var today=fmtDate(GS.year,GS.month,GS.day);
    if(alreadyFired!==today){
      GS._gfEventFired=today;
      renderDailyGfEvent(function(){showNextDayBtn();});
      return;
    }
  }
  showNextDayBtn();
  function showNextDayBtn(){
    $('choices-area').innerHTML='';
    var btn=document.createElement('button');btn.className='primary';btn.textContent='→ 下一天';
    btn.onclick=function(){advanceToNextDay();};
    $('choices-area').appendChild(btn);
    saveGame();
  }
}

function advanceToNextDay(){
  var lastDay=daysInMonth(GS.year,GS.month);
  if(GS.day===lastDay){
    GS.health=Math.max(0,GS.health-5);
    var se=$('story-text');if(se)se.innerHTML+='<br><span style="color:#c0392b;font-size:.85em;">🍼 室友奶扣熬夜习惯影响：健康 -5（月末扣除）</span>';
  }
  if(GS.tuanxiaoAccepted&&GS.tuanxiaoWeekBan>0&&isWeekend(GS.year,GS.month,GS.day)&&GS.month>=10&&!(GS.month===10&&GS.day>=1&&GS.day<=7)){
    var wd2=new Date(GS.year,GS.month-1,GS.day).getDay();
    if(wd2===0){
      GS.tuanxiaoWeekBan--;
      if(GS.tuanxiaoWeekBan<=0){
        GS.tuanxiaoWeekBan=0;
        if(GS.tuanxiaoWisdomPending){
          GS.wisdom+=100;
          GS.tuanxiaoWisdomPending=false;
          updatePanel();
          showPopup('🎓 团校结业','为期四周的团校集训终于结束了！\n\n你顺利完成了全部培训课程和社会实践活动。结业仪式上，你从老师手中接过团校结业证书，回想起四个周末的奔波与付出，心中充满了成就感。\n\n这段时间的系统学习让你的视野和思维方式都有了质的飞跃。',{wisdom:100},null,null);
        }
      }
    }
    if(GS.tuanxiaoWeekBan<0)GS.tuanxiaoWeekBan=0;
  }
  var dim=daysInMonth(GS.year,GS.month);
  if(GS.day>=dim){
    var wasLast=GS.day;
    GS.day=1;
    if(GS.month>=12){GS.month=1;GS.year++;}
    else{GS.month++;}
    if(GS.girlfriends&&GS.girlfriends.length>0&&wasLast===dim){GS.charm+=GS.girlfriends.length*20;}
  }else{GS.day++;}
  if(GS.month===10&&GS.day===8&&GS.holidayRoute){GS.holidayRoute=null;delete GS._holidayGfId;}
  updatePanel();processDay();
}

// ===== 通用日常 =====
var DAILY_ACTIVITIES=[
  {text:'📚 去图书馆自习',effects:{wisdom:8}},
  {text:'🏃 去操场运动锻炼',effects:{health:8}},
  {text:'🎭 参加社团活动',effects:{charm:6,happiness:6}},
  {text:'🏠 在宿舍休息放松',effects:{health:4,happiness:4},sleepBonus:true},
  {text:'💼 做兼职赚取零花钱',effects:{money:100,health:-3}},
  {text:'🎓 参加学术讲座',effects:{wisdom:6,glory:3}}
];

// ===== 全班同学数据 =====
var CLASSMATES={
  huye:{name:'虎爷',gender:'male',tags:['roommate'],initFavor:80},
  naikou:{name:'奶扣',gender:'male',tags:['roommate'],initFavor:80},
  jingye:{name:'京爷',gender:'male',tags:['roommate'],initFavor:80},
  langweifu:{name:'琅威福',gender:'male',tags:[],initFavor:50},
  caomugai:{name:'草木改',gender:'male',tags:[],initFavor:50},
  zhihuanming:{name:'智焕明',gender:'male',tags:[],initFavor:50},
  sukongfen:{name:'苏孔氛',gender:'male',tags:[],initFavor:50},
  hannaotan:{name:'韩瑙谭',gender:'male',tags:[],initFavor:50},
  yinnaichun:{name:'殷乃春',gender:'male',tags:[],initFavor:50},
  yanhongjiu:{name:'延宏玖',gender:'male',tags:[],initFavor:50},
  shenyehuai:{name:'神叶怀',gender:'male',tags:[],initFavor:50},
  xiaogumai:{name:'肖古麦',gender:'male',tags:[],initFavor:50},
  nietuofei:{name:'聂陀飞',gender:'male',tags:[],initFavor:50},
  guyiqi:{name:'古一七',gender:'male',tags:[],initFavor:50},
  tonghuke:{name:'佟胡克',gender:'male',tags:[],initFavor:50},
  xiataoming:{name:'夏涛明',gender:'male',tags:[],initFavor:50},
  jiaomudong:{name:'角目冬',gender:'male',tags:[],initFavor:50},
  xuanliuqi:{name:'宣刘琪',gender:'male',tags:[],initFavor:50},
  gantuofen:{name:'干拓分',gender:'male',tags:[],initFavor:50},
  lihuayi:{name:'李华裔',gender:'male',tags:[],initFavor:50},
  luoxu:{name:'罗旭',gender:'male',tags:[],initFavor:50},
  qiebofeng:{name:'妾波峰',gender:'male',tags:[],initFavor:50},
  goutongmian:{name:'构童面·朝苏',gender:'male',tags:[],initFavor:50},
  suxiaonuan:{name:'苏小暖',gender:'female',tags:[],initFavor:50},
  dilihei:{name:'迪丽·黑',gender:'female',tags:[],initFavor:40},
  shantanjing:{name:'单谭晶',gender:'female',tags:[],initFavor:40},
  hesijia:{name:'何思嘉',gender:'female',tags:[],initFavor:40},
  eryi:{name:'洱一',gender:'female',tags:[],initFavor:40},
  junqibang:{name:'郡祺邦',gender:'female',tags:[],initFavor:40},
  zichunqian:{name:'自舂乾·付崴嫚',gender:'female',tags:[],initFavor:40}
};

// 动态生成所有同学的ATTR/ICON显示条目
(function(){
  var roomIcons={huye:'🐯',naikou:'🍼',jingye:'🏅'};
  for(var cmKey in CLASSMATES){
    if(!CLASSMATES.hasOwnProperty(cmKey))continue;
    var cmData=CLASSMATES[cmKey];
    var attrKey=cmKey+'Fav';
    ATTR[attrKey]=cmData.name+'好感';
    if(roomIcons[cmKey]){ICON[attrKey]=roomIcons[cmKey];}
    else if(cmKey==='suxiaonuan'){ICON[attrKey]='💕';}
    else{ICON[attrKey]=cmData.gender==='male'?'👤':'👩';}
  }
})();

// ===== 女友系统辅助函数 =====
function getGfCount(){return GS.girlfriends?GS.girlfriends.length:0;}
function getGfById(id){if(!GS.girlfriends)return null;for(var i=0;i<GS.girlfriends.length;i++){if(GS.girlfriends[i].id===id)return GS.girlfriends[i];}return null;}
function isGf(id){return getGfById(id)!==null;}
function getAllGfIds(){if(!GS.girlfriends)return[];var ids=[];for(var i=0;i<GS.girlfriends.length;i++){ids.push(GS.girlfriends[i].id);}return ids;}
function addGf(id,name,favor){if(!GS.girlfriends)GS.girlfriends=[];GS.girlfriends.push({id:id,name:name,favor:favor,coolingDays:0});GS.gfUnlocked=true;GS.gfName=name;GS.gfFavor=favor;GS.gfId=id;}
function removeGf(id){if(!GS.girlfriends)return;GS.girlfriends=GS.girlfriends.filter(function(g){return g.id!==id;});if(GS.girlfriends.length===0){GS.gfUnlocked=false;GS.gfName='';GS.gfFavor=0;}else{var p=GS.girlfriends[0];GS.gfName=p.name;GS.gfFavor=p.favor;}}
function syncGfFavor(id,delta){var gf=getGfById(id);if(gf){gf.favor=Math.max(0,gf.favor+delta);if(GS.girlfriends[0].id===id){GS.gfFavor=gf.favor;}}else if(GS.gfUnlocked&&(!GS.girlfriends||GS.girlfriends.length===0||id===GS.gfId)){GS.gfFavor=Math.max(0,GS.gfFavor+delta);}}
function syncGfFromClassmate(cmId){if(isGf(cmId)){var gf=getGfById(cmId);var cmFav=GS.classmateFavor[cmId]||0;gf.favor=cmFav;if(GS.girlfriends[0].id===cmId){GS.gfFavor=cmFav;}}}
function syncClassmateFromGf(cmId){if(isGf(cmId)){var gf=getGfById(cmId);GS.classmateFavor[cmId]=gf.favor;}}

// ===== 聊天系统数据 =====
var CHAT_GENERAL=[
  {text:'今天上课好累啊',c1:'确实，专业课压力很大',f1:2,c2:'还好吧，我觉得一般',f2:-1},
  {text:'待会打算去食堂吃饭吗',c1:'一起去吧',f1:3,c2:'我打算回宿舍吃',f2:0},
  {text:'最近天气一直下雨好烦',c1:'确实雨天很压抑',f1:2,c2:'下雨也挺安静的',f2:1},
  {text:'你C++代码写明白了吗',c1:'不太懂，有点难',f1:1,c2:'早就写完了，很简单',f2:-2},
  {text:'周末打算去哪里玩',c1:'还没想好，你有推荐吗',f1:3,c2:'打算一直在宿舍躺着',f2:0},
  {text:'晚自习要不要一起占座',c1:'可以，准时过去',f1:3,c2:'我今晚不去晚自习',f2:-1},
  {text:'今天老师讲课有点快跟不上',c1:'我也是，课后可以一起复盘',f1:3,c2:'还好我跟上了',f2:-1},
  {text:'最近熬夜好困',c1:'早点休息别熬夜了',f1:2,c2:'年轻人熬夜很正常',f2:0},
  {text:'食堂今天哪个窗口好吃',c1:'三楼窗口菜品不错',f1:2,c2:'都一般般',f2:-1},
  {text:'最近要不要一起去操场散步',c1:'可以，傍晚刚好合适',f1:3,c2:'我不爱出门走动',f2:-1},
  {text:'作业你写完了吗',c1:'写完了，有不会的可以问我',f1:2,c2:'还没写，摆烂中',f2:0},
  {text:'感觉最近课程越来越难',c1:'确实，学业压力变大了',f1:2,c2:'多刷题就没问题',f2:0},
  {text:'你平时喜欢玩什么游戏',c1:'可以一起组队玩',f1:3,c2:'随便玩玩而已',f2:0},
  {text:'宿舍最近氛围怎么样',c1:'宿舍相处很融洽',f1:2,c2:'宿舍有点吵',f2:-1},
  {text:'要不要一起去图书馆自习',c1:'可以一起学习',f1:3,c2:'我不想去图书馆',f2:-1},
  {text:'今天上课点名了吗',c1:'点名了，差点迟到',f1:2,c2:'没注意',f2:0},
  {text:'最近有没有什么好看的剧',c1:'有，我可以推荐给你',f1:3,c2:'我不看剧',f2:-1},
  {text:'早上起不来好痛苦',c1:'我也是，早起太难了',f1:2,c2:'早睡就能早起',f2:0},
  {text:'班级活动你想参加吗',c1:'可以参加，凑个热闹',f1:2,c2:'不想参加活动',f2:-1},
  {text:'你平时喜欢运动吗',c1:'喜欢，经常跑步运动',f1:2,c2:'不喜欢运动',f2:0},
  {text:'马上要小测了有点紧张',c1:'放平心态，正常发挥就好',f1:3,c2:'小测而已不用紧张',f2:0},
  {text:'最近花钱有点快',c1:'我也是开销挺大',f1:2,c2:'合理规划开销就好',f2:0},
  {text:'外卖有没有好吃的店铺推荐',c1:'我有很多宝藏店铺',f1:3,c2:'我很少点外卖',f2:-1},
  {text:'教室空调温度合适吗',c1:'温度刚刚好',f1:2,c2:'太冷/太热了',f2:-1},
  {text:'你周末会早起吗',c1:'周末偶尔早起',f1:1,c2:'周末睡到中午',f2:0},
  {text:'笔记可以借我参考一下吗',c1:'没问题直接发给你',f1:3,c2:'我的笔记很乱不好看',f2:0},
  {text:'感觉大学时间过得好快',c1:'确实，一转眼学期过半',f1:2,c2:'还好，没什么感觉',f2:-1},
  {text:'你以后打算考研吗',c1:'有这个打算',f1:1,c2:'还没有规划',f2:0},
  {text:'今天风好大出门好冷',c1:'注意多穿衣服保暖',f1:3,c2:'还好能接受',f2:0},
  {text:'小组作业你想怎么分工',c1:'我们可以商量分配',f1:3,c2:'随便都行',f2:-1},
  {text:'上课你一般坐前排还是后排',c1:'坐前排认真听课',f1:2,c2:'一直坐后排',f2:-1},
  {text:'最近心情有点一般',c1:'怎么啦，可以和我说说',f1:3,c2:'慢慢调整就好了',f2:0},
  {text:'你喜欢晴天还是雨天',c1:'晴天心情更好',f1:1,c2:'雨天比较安静舒服',f2:1},
  {text:'水杯不小心弄丢了',c1:'没事下次我帮你留意',f1:2,c2:'再买一个就好了',f2:0},
  {text:'要不要一起去取快递',c1:'现在就可以一起去',f1:3,c2:'我暂时没有快递',f2:-1},
  {text:'食堂人好多排队好久',c1:'确实每天都要排队',f1:2,c2:'错开时间就好了',f2:0},
  {text:'课堂回答问题好社恐',c1:'我也很害怕当众发言',f1:2,c2:'习惯就好了',f2:0},
  {text:'想买新东西纠结款式',c1:'我帮你参考挑选',f1:3,c2:'跟着自己喜好选就行',f2:0},
  {text:'宿舍停水太麻烦了',c1:'确实很影响日常起居',f1:2,c2:'只能暂时将就一下',f2:0},
  {text:'你喜欢甜食还是咸食',c1:'我也喜欢同款口味',f1:2,c2:'口味和你相反',f2:-1},
  {text:'马上要换季了',c1:'记得及时增减衣物',f1:3,c2:'换季无所谓',f2:-1},
  {text:'刷题刷不动好累',c1:'休息一会再继续',f1:2,c2:'坚持坚持就做完了',f2:0},
  {text:'路上看到一只很可爱的小猫',c1:'哇，小猫超级可爱',f1:3,c2:'小动物一般般',f2:-1},
  {text:'社团活动占用好多时间',c1:'确实很耽误学习休息',f1:2,c2:'社团也能锻炼自己',f2:0},
  {text:'手机马上没电了',c1:'赶紧找地方充电',f1:2,c2:'没电刚好放下手机',f2:0},
  {text:'今天穿搭好不好看',c1:'特别好看，很适合你',f1:3,c2:'还行吧',f2:-1},
  {text:'想出门散心',c1:'我可以陪你一起散心',f1:3,c2:'自己出去走走也不错',f2:0},
  {text:'错题太多心态崩了',c1:'慢慢来一点点整理就好',f1:3,c2:'多刷题就能弥补',f2:0},
  {text:'晚上宿舍会不会断电',c1:'会断电，早点准备充电',f1:2,c2:'不清楚宿舍规则',f2:-1},
  {text:'认识这么久很开心',c1:'我也是，很开心认识你',f1:4,c2:'还好啦',f2:0}
];
var CHAT_FEMALE=[
  {text:'最近护肤品用完了好纠结',c1:'可以慢慢挑选适合自己的',f1:4,c2:'护肤品没必要买太多',f2:-2},
  {text:'头发好难打理',c1:'打理头发确实很费时间',f1:3,c2:'短发就不用麻烦打理',f2:-1},
  {text:'看到好看的包包忍不住想买',c1:'喜欢就入手，取悦自己最重要',f1:4,c2:'没必要乱花钱',f2:-2},
  {text:'拍照总是不上镜',c1:'你本人比照片好看很多',f1:5,c2:'角度问题而已',f2:0},
  {text:'经期肚子有点不舒服',c1:'多喝热水好好休息，照顾好自己',f1:4,c2:'忍一忍就过去了',f2:-3},
  {text:'想看新上映的电影',c1:'有空可以一起去看电影',f1:5,c2:'线上看就行不用去影院',f2:-1},
  {text:'最近长胖了一点好焦虑',c1:'完全看不出来，不用焦虑',f1:4,c2:'可以适当运动减脂',f2:0},
  {text:'闺蜜之间闹了一点小矛盾',c1:'耐心沟通很快就能和好',f1:3,c2:'朋友吵架很正常',f2:-1},
  {text:'喜欢喝奶茶但是怕长胖',c1:'偶尔喝一次没关系的',f1:4,c2:'为了身材尽量少喝',f2:-2},
  {text:'明天不知道穿什么衣服',c1:'我觉得你穿什么都好看',f1:5,c2:'随便穿一套就行',f2:-1}
];

// ===== 赠礼系统数据 =====
var GIFT_ITEMS=[
  {name:'瓶装矿泉水',cost:10,favor:1},
  {name:'基础零食礼包',cost:30,favor:4},
  {name:'一杯奶茶',cost:15,favor:2},
  {name:'精品笔记本',cost:50,favor:6},
  {name:'可爱钥匙扣',cost:40,favor:5},
  {name:'鲜花小花束',cost:80,favor:9},
  {name:'网红小玩偶',cost:100,favor:11},
  {name:'精致手链',cost:150,favor:17},
  {name:'轻奢口红',cost:300,favor:35},
  {name:'机械键盘',cost:500,favor:62}
];

function pickRandomClassmate(gender){
  var pool=[];
  var gfIds=getAllGfIds();
  for(var id in CLASSMATES){
    if(CLASSMATES[id].gender!==(gender||CLASSMATES[id].gender))continue;
    if(gfIds.indexOf(id)>=0)continue;
    pool.push(id);
  }
  if(pool.length===0)return null;
  return pool[Math.floor(Math.random()*pool.length)];
}

function getSortedClassmates(gender){
  var list=[];
  for(var id in CLASSMATES){
    if(CLASSMATES[id].gender!==gender)continue;
    var fv=GS.classmateFavor[id]||0;
    list.push({id:id,name:CLASSMATES[id].name,favor:fv,tags:CLASSMATES[id].tags||[]});
  }
  var gfIds=getAllGfIds();
  list.sort(function(a,b){
    var aGf=gfIds.indexOf(a.id)>=0;
    var bGf=gfIds.indexOf(b.id)>=0;
    if(aGf&&!bGf)return -1;
    if(!aGf&&bGf)return 1;
    if(a.favor!==b.favor)return b.favor-a.favor;
    var aR=a.tags.indexOf('roommate')>=0;
    var bR=b.tags.indexOf('roommate')>=0;
    if(aR&&!bR)return -1;
    if(!aR&&bR)return 1;
    return 0;
  });
  return list;
}

// ===== 班级随机事件系统 =====
var CM_GOOD=[
  function(id,nm){return{title:'路遇搬运窘境',text:'赶路途中，你撞见'+nm+'抱着一堆书本和快递，步履踉跄、快要拿不住。',choices:[
    {text:'主动上前帮忙搬运',effects:{charm:4},cmFav:4,result:'你快步上前接过'+nm+'手中摇摇欲坠的快递盒，帮'+nm+'一路搬到宿舍楼下。'+nm+'连声道谢，笑着夸你人真好。'},
    {text:'礼貌问候后径直离开',effects:{charm:3},cmFav:3,result:'你冲'+nm+'点了点头打了个招呼，脚步没停。虽然没帮忙，但'+nm+'也笑了笑表示理解。'}
  ]};},
  function(id,nm){return{title:'自习室笔记分享',text:'你在自习室刷题，'+nm+'主动坐到你旁边，拿出工整的课堂笔记示意可以借你翻看。',choices:[
    {text:'欣然借阅、认真道谢',effects:{wisdom:4},cmFav:4,result:'你接过笔记认真翻看起来——'+nm+'的字迹工整得让人羡慕，几处标注恰好解答了你一直困惑的知识点。你郑重道谢，'+nm+'笑着说"以后有不懂的一起讨论"。'},
    {text:'婉言谢绝、专注自学',effects:{wisdom:3},cmFav:3,result:'你礼貌地摆了摆手，示意自己在集中精力刷题。'+nm+'点了点头收起笔记，没有打扰你。虽然拒绝了帮助，但专注自学也别有收获。'}
  ]};},
  function(id,nm){return{title:'食堂偶遇结伴',text:'饭点食堂人满为患，'+nm+'看到你独自排队，主动上前询问是否一起拼桌用餐。',choices:[
    {text:'开心答应、结伴就餐',effects:{happiness:4},cmFav:4,result:'你和'+nm+'端着餐盘找了张双人桌坐下。边吃边聊各自家乡的美食文化，一顿饭的功夫彼此熟悉了不少，饭也比平时吃得更香了。'},
    {text:'礼貌推脱、独自用餐',effects:{happiness:3},cmFav:3,result:'你笑着说了句"今天想一个人待会儿"，'+nm+'表示理解，端着餐盘去了别的桌。独自安静用餐也是一种享受。'}
  ]};},
  function(id,nm){return{title:'雨天共伞同行',text:'放学突降大雨，你没带伞站在教学楼门口发愁。'+nm+'撑伞路过，主动提出顺路载你一程。',choices:[
    {text:'欣然接受、并肩避雨',effects:{happiness:4},cmFav:4,result:'你钻到'+nm+'的伞下，两人并肩走在雨中。雨滴打在伞面上发出清脆的声响，'+nm+'尽量把伞往你这边倾了一些。短短一段路，你们聊着天气和课程，温馨又自然。'},
    {text:'委婉道谢、等雨变小',effects:{happiness:3},cmFav:3,result:'你冲'+nm+'笑了笑说不用了，想等雨小一点再走。'+nm+'点点头撑着伞离开了。雨确实没多久就变小了，你快步跑回了宿舍。'}
  ]};},
  function(id,nm){return{title:'行路险些滑倒',text:'走廊地面刚拖过有些湿滑，你走路不慎脚下一滑身形踉跄。一旁的'+nm+'眼疾手快立刻伸手搀扶住你。',choices:[
    {text:'真诚道谢、主动寒暄',effects:{health:4},cmFav:4,result:'你站稳后连声道谢，顺势和'+nm+'聊了几句。'+nm+'摆了摆手说"举手之劳"，但脸上带着笑意。一次小小的搀扶让两人的距离拉近了不少。'},
    {text:'简单致谢、低调离开',effects:{health:3},cmFav:3,result:'你稳住身形后轻声道了句谢，整理了一下衣服就继续赶路了。虽然交流不多，但'+nm+'及时援手的善意让你心里一暖。'}
  ]};},
  function(id,nm){return{title:'课堂缺文具救助',text:'上课做题时你翻遍笔袋才发现忘带笔和橡皮，正手足无措之际，'+nm+'默默从笔袋里抽出一支备用笔递了过来。',choices:[
    {text:'课后主动归还并认真道谢',effects:{wisdom:4},cmFav:4,result:'你接过笔顺利完成了课堂练习。下课后你第一时间把笔还给'+nm+'，还加了一句真诚的"谢谢你救了我一命"。'+nm+'被你的郑重逗笑了。'},
    {text:'当堂道谢、认真做题',effects:{wisdom:3},cmFav:3,result:'你小声说了句"谢了"，接过笔赶紧低头做题。虽然只是简单的互动，但'+nm+'的善意让你整节课的心情都变好了。'}
  ]};},
  function(id,nm){return{title:'班级活动组队协作',text:'班级集体活动自由组队，'+nm+'穿过人群第一时间走到你面前，邀请你组队合作完成任务。',choices:[
    {text:'爽快答应、积极配合',effects:{glory:4},cmFav:4,result:'你毫不犹豫地点头答应了。两人分工明确、配合默契，任务完成得又快又好。活动结束后'+nm+'感慨道："跟你组队真省心！"'},
    {text:'谨慎同意、稳妥配合',effects:{glory:3},cmFav:3,result:'你点了点头加入了'+nm+'的队伍，全程稳妥推进任务。虽然没有惊艳的发挥，但可靠的配合让'+nm+'觉得你是个值得信赖的队友。'}
  ]};},
  function(id,nm){return{title:'情绪低落被开导',text:'你因琐事心情低落、神色沉闷地坐在教室里。'+nm+'察觉到了你的异常，走过来坐在你旁边主动安慰你。',choices:[
    {text:'敞开心扉、认真倾听',effects:{happiness:4},cmFav:4,result:'你把心里的烦闷一股脑倒了出来。'+nm+'安静地听完，说了几句真诚的话让你豁然开朗——有时候陌生人的理解比熟人的安慰更有力量。'},
    {text:'礼貌回应、慢慢释怀',effects:{happiness:3},cmFav:3,result:'你轻轻说了句"没事，过一会儿就好了"。'+nm+'没有追问，只是安静地坐在旁边陪了你一会儿。虽然没说太多，但那份默默的陪伴让你心里好受了一些。'}
  ]};},
  function(id,nm){return{title:'楼道偶遇寒暄',text:'课间楼道人潮涌动，'+nm+'迎面走来，远远看到你便微笑着主动问好，态度温和友善。',choices:[
    {text:'热情回应、主动搭话',effects:{charm:4},cmFav:4,result:'你满面笑容地迎了上去，主动和'+nm+'聊起今天的课程和校园里的新鲜事。楼道里的偶遇变成了一段愉快的课间时光。'},
    {text:'微笑点头、礼貌回应',effects:{charm:3},cmFav:3,result:'你微笑着冲'+nm+'点了点头，简短回应了一句就继续赶路了。虽然交流不多，但彼此间的友善已经足够温暖。'}
  ]};},
  function(id,nm){return{title:'遗落物品被归还',text:'你昨天把随身物品遗落在教室，今天一早'+nm+'在教室门口等你，手里拿着你丢的东西："昨天看到就帮你收好了——怕丢了。"',choices:[
    {text:'郑重道谢、加深交好',effects:{glory:4},cmFav:4,result:'你郑重地双手接过物品，认真向'+nm+'道谢。'+nm+'挠了挠头说"不用客气，换别人也会这么做的"。但你知道——不是每个人都会这么细心。'},
    {text:'简单致谢、收下物品',effects:{glory:3},cmFav:3,result:'你道了声谢接过物品。虽然没说太多感激的话，但'+nm+'的这份细心让你在心里默默记了一笔。'}
  ]};}
];
var CM_BAD=[
  function(id,nm){return{title:'赶路相撞散落物品',text:'你和'+nm+'在走廊拐角匆忙赶路，不慎迎面相撞——书本、文具哗啦啦散落一地，场面一片狼藉。',choices:[
    {text:'主动道歉、帮忙捡拾',effects:{health:-2},cmFav:-3,result:'你赶紧蹲下来帮忙捡散落的书本，边捡边道歉。虽然'+nm+'也说了句"没事"，但两人都有些不痛快。捡完东西后，各自匆匆离开了。'},
    {text:'沉默收拾、略显不悦',effects:{health:-4},cmFav:-5,result:'你皱起眉头，一言不发地蹲下捡自己的东西。'+nm+'感受到了你的不悦，也没再说话。走廊里的气氛降到了冰点。'}
  ]};},
  function(id,nm){return{title:'被对方冷漠回避',text:'你远远看到'+nm+'迎面走来，主动抬手准备打招呼——但'+nm+'看了你一眼后却侧过头去，刻意加快了脚步从你身边绕了过去。',choices:[
    {text:'坦然释怀、不再在意',effects:{happiness:-2},cmFav:-3,result:'你放下了抬到一半的手，心想也许'+nm+'今天心情不好。不纠结于别人的冷淡，你把注意力转回了自己的事情上。'},
    {text:'心生尴尬、暗自介意',effects:{happiness:-4},cmFav:-5,result:'你尴尬地收回了手，心里反复琢磨是不是自己做错了什么。虽然表面装作不在意，但整节课都在想这件事。'}
  ]};},
  function(id,nm){return{title:'自习被声响打扰',text:'你正在自习室专注学习，身旁的'+nm+'频繁翻书、小声交谈、手机震动，各种声响不断打乱你的学习节奏。',choices:[
    {text:'轻声提醒、友好沟通',effects:{wisdom:-2},cmFav:-3,result:'你侧过身小声对'+nm+'说"不好意思，能稍微安静一点吗"。'+nm+'愣了一下，有些尴尬地说了句抱歉，收拾东西换了个位置。虽然解决了问题，但两人之间多了几分微妙的尴尬。'},
    {text:'隐忍不发、心态受扰',effects:{wisdom:-4},cmFav:-5,result:'你把不满压在心里没有开口。但持续的噪音让你完全无法集中精力，一道题翻来覆去看了好几遍都没做出来。你收拾东西起身离开了自习室，心情糟透了。'}
  ]};},
  function(id,nm){return{title:'排队无意起矛盾',text:'食堂排队时，'+nm+'无意间往前靠了靠，让你误以为对方在插队。你皱起眉头，气氛有些微妙。',choices:[
    {text:'耐心询问、化解误会',effects:{charm:-2},cmFav:-3,result:'你深吸一口气，客气地问了句"同学你是不是不小心往前挪了一下"。'+nm+'连忙解释自己在看菜单没注意，赶紧退了回去。误会解开了，但多多少少还是有些不好意思。'},
    {text:'语气生硬、直接指责',effects:{charm:-4},cmFav:-5,result:'你不客气地说了句"别插队行吗"。'+nm+'的脸一下子红了，周围的人也纷纷侧目。后来你才知道'+nm+'只是没注意，并非故意——但两人之间的气氛已经很难补救。'}
  ]};},
  function(id,nm){return{title:'请教问题被敷衍',text:'你遇到一道难题主动向'+nm+'请教。'+nm+'瞥了一眼题目，语气敷衍地含糊说了几句话，明显不愿认真给你讲解。',choices:[
    {text:'礼貌道谢、自行钻研',effects:{wisdom:-2},cmFav:-3,result:'你勉强挤出微笑说了句"谢谢"，收起了题目。虽然心里不太舒服，但你靠自己硬啃下来反而对知识点理解得更透彻了。'},
    {text:'面露失落、略显不满',effects:{wisdom:-4},cmFav:-5,result:'你的表情明显暗了下来。'+nm+'察觉到了你的失望，但也没有多解释。两人之间的气氛变得有些微妙，之后几天都不太主动说话了。'}
  ]};},
  function(id,nm){return{title:'观点相悖起争执',text:'课间闲聊时，你和'+nm+'在一个话题上观点完全相悖，两人各执一词、互不相让，气氛逐渐升温。',choices:[
    {text:'及时收口、尊重差异',effects:{glory:-2},cmFav:-3,result:'你意识到继续争下去没有意义，轻叹一声说"各有各的道理吧"。'+nm+'也识趣地停了嘴。虽然观点不同，但至少保持了体面。'},
    {text:'持续争辩、僵持不下',effects:{glory:-4},cmFav:-5,result:'两人越说越激动，声音逐渐升高，周围同学都投来了目光。最后'+nm+'冷冷说了句"随你怎么想吧"就转身走了。你站在原地，心里堵得慌。'}
  ]};},
  function(id,nm){return{title:'被水渍溅湿课本',text:'课间'+nm+'走过你座位旁时不慎打翻了手中的水杯，水渍溅到你的课本上，好几页笔记的字迹被浸得模糊不清。',choices:[
    {text:'表示无妨、大方原谅',effects:{happiness:-2},cmFav:-3,result:'你伸手抽了张纸巾擦拭课本，对'+nm+'说了句"没事，还能看"。'+nm+'松了口气，连声道歉，从包里掏出纸巾帮你一起擦。虽然笔记花了，但好在你拍了照片备份。'},
    {text:'面露不悦、心情大受影响',effects:{happiness:-4},cmFav:-5,result:'你皱紧眉头看了'+nm+'一眼。'+nm+'慌乱地道歉，但你没有回应，只是默默地一页一页检查课本的受损程度。那几页笔记是你上周花了好几个小时整理的——这个下午的心情全毁了。'}
  ]};},
  function(id,nm){return{title:'被刻意绕道避开',text:'放学的路上，你远远看到'+nm+'出现在前方——但'+nm+'似乎也发现了你，随即改变方向刻意绕了一条远路，明显在避开你的碰面。',choices:[
    {text:'坦然看淡、正常行走',effects:{charm:-2},cmFav:-3,result:'你心里微微咯噔了一下，但表面上不动声色继续走自己的路。也许'+nm+'只是赶时间，也许有别的原因——无论怎样，你选择不让这件事影响你的心情。'},
    {text:'内心别扭、耿耿于怀',effects:{charm:-4},cmFav:-5,result:'你停下脚步，望着'+nm+'的背影消失在另一条路上。整个晚上你都在回想：是不是之前哪句话说错了？还是哪件事让对方记了仇？越想越不是滋味。'}
  ]};}
];
var CM_NEUTRAL=[
  function(id,nm){return{title:'相撞双向道歉',text:'你和'+nm+'迎面匆匆相撞，两人同时开口——"对不起！"，话音完全重叠，瞬间陷入微妙的安静。',choices:[
    {text:'一笑而过、快速离场',effects:{},cmFav:-2,result:'你们愣了一秒后不约而同地笑了出来。摆了摆手各自说了句"没事没事"，就匆匆各走各的路了。尴尬只持续了不到三秒。'},
    {text:'略显局促、默默走开',effects:{},cmFav:-2,result:'两人眼神闪烁了一下，各自低着头侧身走开。谁也没再多说一个字。虽然解决了，但那种淡淡的尴尬在空气里停留了好一会儿。'}
  ]};},
  function(id,nm){return{title:'打招呼被无视',text:'你远远看到'+nm+'走来，抬手准备打个招呼——但'+nm+'正专注走路，眼睛盯着前方，径直从你身边走了过去，完全没注意到你的手势。',choices:[
    {text:'淡然放下、不予纠结',effects:{},cmFav:-2,result:'你放下手，心想'+nm+'大概走神了。反正也不是什么大事——下次碰到再打招呼就是了。'},
    {text:'略显窘迫、暗自尴尬',effects:{},cmFav:-2,result:'你讪讪地放下手，假装整理了一下头发。虽然知道'+nm+'应该只是没看到，但心里还是有一丝轻微的尴尬。'}
  ]};},
  function(id,nm){return{title:'当众认错人',text:'你远远看到一个身影，冲着那个方向大声喊出了'+nm+'的名字。等走近才发现——认错人了，那人只是背影有点像'+nm+'而已。周围几个同学都扭头看了过来。',choices:[
    {text:'诚恳致歉、化解尴尬',effects:{},cmFav:-2,result:'你赶紧向被认错的人解释了一下，对方大度地摆了摆手说"没关系"。你转身快步离开，心里默默记下：下次看清楚再喊。'},
    {text:'快速退场、掩饰窘迫',effects:{},cmFav:-2,result:'你假装在看手机，迅速往反方向走了。虽然跑得快，但耳朵还是红了好一会儿。但愿下周'+nm+'不会从别人嘴里听说这件事。'}
  ]};},
  function(id,nm){return{title:'独处气氛拘谨',text:'教室里稀稀拉拉走了大半，最后只剩你和'+nm+'两个人。没有人说话，空气安静得能听见日光灯的嗡嗡声，气氛不自觉变得有些拘谨。',choices:[
    {text:'尝试简单破冰',effects:{},cmFav:-2,result:'你咳了一声随口说了句"今天课真多啊"。'+nm+'抬头应了一句，两人礼貌性地交换了几句话后又陷入了安静。不过至少——空气没那么凝固了。'},
    {text:'安静独处、各做各事',effects:{},cmFav:-2,result:'你低头继续做自己的事情。'+nm+'也没有开口的意思。两人默契地保持安静，享受着这份"互不打扰"的独处。虽然安静得有些微妙，但也算不上不愉快。'}
  ]};},
  function(id,nm){return{title:'躲闪闲谈被发现',text:'你路过走廊听到'+nm+'正和几人闲聊，你不想加入正打算悄悄绕开——但'+nm+'恰好转头看到了你，四目相对，场面一度静止。',choices:[
    {text:'坦然解释、并无恶意',effects:{},cmFav:-2,result:'你干脆走过去解释道："没事，就是路过，你们聊！"'+nm+'点了点头，气氛迅速恢复正常。坦诚应对比偷偷摸摸好多了。'},
    {text:'略显慌张、仓促离开',effects:{},cmFav:-2,result:'你张了张嘴、又闭上，脚步不自觉地加快了。身后传来低低的笑声——不知道是不是在笑你。你后悔自己反应过了头。'}
  ]};},
  function(id,nm){return{title:'搭话后陷入冷场',text:'你主动和'+nm+'开口搭话寒暄了几句后，话题迅速消耗殆尽，两人同时陷入了沉默，眼神都不知往哪儿放。',choices:[
    {text:'礼貌收尾、结束对话',effects:{},cmFav:-2,result:'你自然地说了句"那我先去上课啦，回头聊！"给这场短暂的对话画上了一个得体的句号。虽然聊得不长，但不失礼貌。'},
    {text:'略显局促、沉默离场',effects:{},cmFav:-2,result:'你支吾了一下，最后只是点了点头就转身走了。回到座位后还在回想刚才的冷场——下次主动和人搭话之前，得先想好几个备选话题。'}
  ]};}
];

function triggerClassmateEvent(callback){
  var cmId=pickRandomClassmate();
  if(!cmId){if(callback)callback();return;}
  var cmName=CLASSMATES[cmId].name;
  var roll=Math.random();
  var pool=roll<0.4?CM_GOOD:(roll<0.7?CM_BAD:CM_NEUTRAL);
  var tpl=pool[Math.floor(Math.random()*pool.length)];
  var evt=tpl(cmId,cmName);
  var storyEl=$('story-text');
  var tagLabel=roll<0.4?'好事':(roll<0.7?'坏事':'尴尬');
  storyEl.innerHTML=storyEl.innerHTML+'<br><br><span class="phase-tag '+(roll<0.4?'auto':(roll<0.7?'random':'evening'))+'">👤 班级'+tagLabel+'</span><br><strong>'+evt.title+'</strong><br>'+evt.text.replace(/\n/g,'<br>');
  updatePanel();
  $('choices-area').innerHTML='';
  evt.choices.forEach(function(ch){
    var btn=document.createElement('button');btn.textContent=ch.text;
    btn.onclick=function(){
      var changes=doEffects(ch.effects||{});
      if(ch.cmFav&&GS.classmateFavor.hasOwnProperty(cmId)){
        var oldFav=GS.classmateFavor[cmId]||0;
        GS.classmateFavor[cmId]=Math.max(0,oldFav+ch.cmFav);
        changes[cmId+'Fav']=ch.cmFav;
        if(isGf(cmId))syncGfFromClassmate(cmId);
      }
      $('choices-area').innerHTML='';
      _logCtx={choice:ch.text};
      showPopup(evt.title,ch.result||'',changes,null,function(){
        updatePanel();if(callback)callback();
      });
    };
    $('choices-area').appendChild(btn);
  });
}

var GENERIC_EVENTS=[
  {text:'你在校园里闲逛时发现了一个安静的自习角落。',effects:{wisdom:3,happiness:2}},
  {text:'食堂今天推出了新菜品，意外地好吃！',effects:{happiness:4}},
  {text:'换季时节，你不小心着凉感冒了。',effects:{health:-5}},
  {text:'在路上捡到小钱包交给了失物招领处。',effects:{glory:2,happiness:3}},
  {text:'室友过生日，大家一起凑钱买蛋糕庆祝。',effects:{happiness:6,money:-30}},
  {text:'收到家人从老家寄来的特产大礼包。',effects:{happiness:5,money:50}},
  {text:'课堂上答对了教授的难题获得表扬。',effects:{wisdom:5,glory:3}},
  {text:'突然下起大雨忘了带伞。',effects:{health:-3}},
  {text:'学校请来行业大咖开讲座，内容精彩。',effects:{wisdom:4,glory:2}},
  {text:'和室友去小吃街扫荡了一圈。',effects:{happiness:5,health:2,money:-25}}
];

function _gfe(title,text,c1,e1,f1,r1,c2,e2,f2,r2){return{title:title,text:text,c1:c1,e1:e1||{},f1:f1||0,r1:r1,c2:c2,e2:e2||{},f2:f2||0,r2:r2};}
var GF_EVENT_POOL=[
_gfe('晚风偶遇独处的她','夜色渐深，校园路灯暖黄明亮，晚自习散场人流散去大半，你路过操场旁林荫道，看见【女友姓名】独自站在树下吹风，低头看着手机，神情略显落寞，像是在发呆散心。','轻轻上前打招呼，主动停下脚步陪她，轻声询问她是不是心情不好，耐心陪伴闲聊',{happiness:3,charm:1},3,'你放慢脚步走了过去。她抬头看到是你，眼神亮了一下。"没什么，就是觉得今晚风很舒服——想多站一会儿。"你索性陪她一起靠在树边，有一搭没一搭地聊着，直到她脸上重新浮起笑意。','简单挥手示意，随口问一句没事吧，不等回应便径直返回宿舍',{happiness:1},-2,'你远远挥了挥手，脚步没停。她张了张嘴似乎想说什么，但你已经走出好几米了。路灯下，她独自站了很久才离开。'),
_gfe('分享一天细碎趣事','晚间空闲时段，【女友姓名】主动发来消息，兴致勃勃地和你分享今日校园细碎日常：课堂上老师的趣味发言、食堂新开窗口的美食、和同学的搞笑互动，琐事满满，满眼都是想和你分享的心意。','逐条认真回应，主动接梗互动，追问细节，耐心倾听她的所有分享',{happiness:4},3,'你一条一条地回复她的消息，在她说"食堂三楼新开的麻辣烫超好吃"时追问道"明天一起去？"，在她吐槽老师口误时发了一串哈哈哈。不知不觉聊了一个多小时，她发来最后一个表情包时说："和你聊天真的好开心。"','全程敷衍回复，仅用"挺好""不错""哈哈"简短应付，不接话题、不互动',{happiness:2},-2,'她发了好几条长长的消息，你只回了个"挺好"。又发了一条，你回"哈哈"。再发一条，你干脆没看。过了很久她发来一条："你是不是不想聊天……"'),
_gfe('温柔关切你的日常状态','结束了一天的课业与忙碌，【女友姓名】贴心发来问候，细致询问你今日上课是否顺利、有没有遇到难题、身心是否疲惫，满眼皆是细心的牵挂。','坦诚分享自己的一日见闻，诉说忙碌与小收获，双向走心交流日常',{charm:2},3,'你把今天的经历和她娓娓道来——上午的课有点难但听懂了，中午食堂排队差点迟到，下午做完了一道超难的习题。她认真看完每一条，发来一个抱抱的表情："辛苦啦！明天也要加油哦。"','敷衍回应"还行，没什么事"，快速结束对话，不愿多沟通',{},-2,'你打出三个字："还行吧。"她等了一会儿，又问了一句。你又回了两个字："没事。"她没再追问，聊天界面归于沉寂。'),
_gfe('晚自习专属等候奔赴','今晚晚风微凉，天色暗沉，【女友姓名】特意提前结束自习，一直在教学楼门口驻足等候，避开拥挤人流，只为第一时间见到你、陪你返程。','快步上前展露笑意，温柔道谢，主动接过她手里的书本，并肩慢行返程',{happiness:4},4,'你一出教学楼就看到她站在路灯下，怀里抱着两本书，踮着脚往门口张望。看到你的一瞬间，她的眼睛亮了起来。"等很久了吧？"你接过她手里的书，"走——我送你回去。"她抿嘴笑了笑，跟在你身边慢慢走着，晚风也变得温柔了。','面露疲惫，随口告知自己身心劳累，想独自快速回宿舍休息',{happiness:2},-3,'你低着头走出门口，她迎了上来。你摆了摆手说今天太累了想一个人走。她愣在原地，看着你匆匆离去的背影，慢慢把怀里的书抱紧了一些。'),
_gfe('课业难题虚心求教','晚间复盘课业时，【女友姓名】遇到几道重难点题型，反复钻研仍毫无头绪，整理好题目截图认真请教你，希望能得到细致讲解，攻克学习难点。','耐心梳理解题思路，拆分步骤细致讲解，结合知识点举一反三，帮她彻底弄懂',{wisdom:3},4,'你点开截图一道一道地讲——先把题目拆成几个步骤，然后画了个简图解释原理，最后出了一道变式题让她试试。她跟着你的思路一步步推下来，突然兴奋地说："我懂了！原来这么简单！谢谢你——你讲得比老师还清楚！"','直接发送标准答案，懒得拆解讲解，敷衍告知照着答案看懂就行',{wisdom:1},-2,'你看了一眼题目，把答案拍照发了过去，附了一句"照着看就行"。她发来一个问号："可是……这个步骤是怎么得出来的？"你回："就是那样算的呗。"她没再问了。'),
_gfe('学业压力情绪倾诉','近期课程密集、作业繁多，叠加小测压力，【女友姓名】积攒了不少负面情绪，晚间忍不住向你倾诉内心的焦虑与疲惫，渴望得到你的安慰与理解。','温柔耐心倾听情绪，共情她的压力，暖心开导、安抚情绪，给予鼓励与陪伴',{happiness:3},4,'你放下手头的事，认真地听她把心里的焦虑一件一件说完——作业堆了三天没写完、下周有三门小测、感觉怎么学都跟不上。你说："你不是一个人——我们周末一起去图书馆，我陪你一起复习。"她沉默了一会儿，回了一句带着哭腔的"谢谢你……有你真好。"','轻描淡写劝说学业压力人人都有，让她自行忍耐、慢慢适应',{},-3,'"压力大很正常啊——大家都这样，习惯就好了。"你随口回了一句，继续刷自己的题。她看着屏幕上的这句话，把本来打了一半的长文一个字一个字删掉了。'),
_gfe('规划周末休闲时光','一周课业即将结束，【女友姓名】主动询问你的周末安排，满心期待能和你一起度过闲暇时光，摆脱连日的学习忙碌。','主动规划行程，邀约她一起逛校园、吃美食、散步放松，专属二人休闲时光',{happiness:3},4,'你说："周六下午校门口新开了家甜品店——我们先去吃，然后去湖边散步，晚上再看场电影。"她秒回："好！！！！！"五个感叹号。你笑了笑又发了一条："周日早上一起去图书馆自习，中午我请你吃饭。"她发来一个哭唧唧的表情包："你怎么这么会安排……"','告知自己打算宅在宿舍休息，拒绝外出，无意安排二人行程',{happiness:2},-2,'"周末我就在宿舍待着——懒得动。"她等了半天只等来这一句。"哦……好吧。"她的兴致肉眼可见地低了。周末那两天，她一条消息都没再发来。'),
_gfe('邀约夜游校园散心','今夜月色温柔、晚风清爽，褪去了白日的燥热与喧嚣，【女友姓名】主动邀约你夜游校园，漫步林荫道，避开人群安静散心。','欣然应允，放下琐事陪她慢行，闲谈风月、舒缓整日疲惫',{health:2},3,'你合上笔记本出了宿舍。她已经在楼下等着了，披着一件薄外套，冲你招了招手。你们沿着林荫道慢慢走——月光透过树叶洒在地上，远处隐约传来操场上夜跑人群的笑声。谁也没说话，但并肩而行的那种安静，比任何语言都舒服。','以疲惫为由拒绝邀约，只想早点回宿舍躺平休息',{health:1},-2,'"太累了不想去。"你回复得很快。她回了个"好吧"，然后一个人沿着林荫道走了一圈。月亮很圆、晚风很舒服——但身边少了一个人。'),
_gfe('贴心准备专属小零食','【女友姓名】记得你平日爱吃的小零食，晚间特意预留了奶茶、小点心，专程带给你，是专属你的细碎温柔与心意。','满心欢喜收下礼物，真诚道谢，夸赞她细心贴心，暖心回应这份偏爱',{happiness:3},3,'她把袋子递过来的时候还有点不好意思："上次你说这个饼干好吃，我今天路过刚好看到就买了——还有这杯奶茶，是你最喜欢的口味。"你接过袋子，打开一看整整齐齐摆了好几样。"你也太细心了吧！"她低头笑了笑，脸红了。','客气推脱拒绝，声称自己不需要，辜负对方的用心准备',{},-2,'"不用了，我最近减肥。"她递过来的手僵在半空中，然后又慢慢收了回去。袋子的提手在她手心里攥了很久才松开。'),
_gfe('降温贴心叮嘱保暖','夜间气温骤降，晚风带着凉意，细心的【女友姓名】第一时间提醒你添衣保暖，叮嘱你不要贪凉、避免感冒，事事惦记着你的状态。','温柔回应关心，告知自己会注意保暖，反过来叮嘱她也要照顾好自己',{charm:2},3,'你看了看窗外——风确实刮起来了。回她："收到！已经在衣柜里翻出厚外套了。你别光顾着叮嘱我——你自己上次不是说喉咙不舒服吗？多喝热水，别着凉了。"她秒回："嘻嘻——知道啦。"','随口敷衍知晓了，不在意降温，觉得对方小题大做',{},-2,'"知道了知道了——又不冷。"你随手回了一句，继续穿着短袖在宿舍待着。第二天你打了好几个喷嚏，手机里她发来的那条"记得加衣服"的消息还挂在最上面——已读，未回。'),
_gfe('分享治愈夜景瞬间','【女友姓名】夜晚散步时，拍到了绝美月色、晚霞或校园夜景，第一时间分享给你，想把所有美好瞬间都与你共享。','认真夸赞画面好看，共情她的浪漫心意，主动和她探讨夜景细节',{happiness:2,charm:1},3,'照片拍得真好——圆月挂在教学楼尖顶上，灯光的轮廓柔和得像一幅油画。你放大看了好几遍，回道："这也太好看了！你在哪里拍的？下次带我去——我也要拍一张同款。"她发来一个得意的表情："嘿嘿——在图书馆后面那个小坡上！下次一起去！"','简单回复"还行"，无视她的浪漫分享，态度冷淡敷衍',{},-2,'你扫了一眼照片，打了两个字："还行。"她等了等，又发来一张更好看的。你还是："还行。"她默默关掉了相册。'),
_gfe('主动帮你整理学习笔记','晚间复盘课业时，【女友姓名】细心整理了今日课堂重点笔记，排版清晰、重点齐全，主动分享给你，方便你查漏补缺、高效复习。','满心感激收下笔记，认真道谢，夸赞她细心认真、超级靠谱',{wisdom:2},3,'你点开PDF一看——每一章的重点都用不同颜色标了，页边密密麻麻写满了补充注解，最后还附了一张思维导图。"你这笔记也太专业了吧！"你惊叹道。她回得很快："嘿嘿——希望对你有用！"','平淡收下无回应，觉得笔记可有可无，不珍惜对方的用心',{},-2,'你随手保存了文件，没打开看。两天后她小心翼翼地问："那个笔记……有用吗？"你想了半天才记起来："哦——还没看。"'),
_gfe('纠结穿搭寻求建议','【女友姓名】准备挑选明日出门穿搭，纠结两套风格不同的衣服，难以抉择，专门拍照发给你，寻求你的审美建议。','认真对比两套穿搭，细致分析优缺点，真诚给出贴合她气质的建议',{charm:2},4,'你仔细看了看两张照片——一件是碎花连衣裙配白色帆布鞋，一件是牛仔裤搭针织开衫。"第一套适合明天天晴穿，清新好看；第二套如果降温穿刚好，知性又温柔。不过我觉得——你穿哪套都好看。"她发来一长串害羞的表情包："你太会说了！！那我选第一套！"','随意回复"都差不多"，敷衍了事，不愿认真帮忙参考',{},-2,'你看都没仔细看就回了句："都差不多——随便穿一套就行了。"她等了很久——最后选了没人帮她参考的那一套。'),
_gfe('健身运动邀约同行','夜晚空气清新、温度适宜，【女友姓名】打算去操场慢跑放松，主动邀约你一同运动，劳逸结合、舒缓压力。','爽快答应，陪她一起慢跑运动，边运动边闲聊放松身心',{health:4},3,'你换上运动服从宿舍跑出来。她已经拉伸好了在操场门口等。慢跑三圈后你们改成了快走，一边走一边聊——从体育课的体测聊到各自的八百米最好成绩。出完一身汗，浑身轻松——她说下次还约你一起。','懒得动弹，拒绝运动，只想宅着休息',{health:1},-2,'"不去——太累了，今天只想躺着。"她回了个"好吧"，自己去了操场。跑完步后她发来了一张操场月亮的照片——只有一个人看。'),
_gfe('纠结晚餐口味选择','临近晚餐时段，【女友姓名】纠结不知道吃什么，选择困难，特意询问你的口味偏好，想和你一起搭配用餐。','耐心询问她的喜好，结合双方口味推荐美食，主动敲定用餐选择',{happiness:3},3,'"你今天是想吃辣的还是清淡的？"你问道。她说"有点想吃辣但又怕上火"。你想了想："三号窗口的麻辣香锅微辣版——配一份绿豆汤刚好，解辣又不上火。"她发来一个星星眼表情："你怎么比我自己还懂我想吃什么！"','表示自己随便、无所谓，让她自己决定，不愿费心参与',{},-2,'"随便——你想吃啥就吃啥。"她纠结了半天也没定下来，最后一个人去食堂随便打了份饭菜。'),
_gfe('课堂趣事专属吐槽','今日课堂发生了不少有趣又无语的小事，老师的趣味发言、同学的搞笑举动，【女友姓名】积攒满肚子趣事，晚间专门和你吐槽分享。','全程认真倾听，积极互动接梗，陪她一起吐槽说笑',{happiness:3},3,'她一口气说了三件事——今天高数老师把"导数"说成了"倒数"，全班愣了五秒；前排同学上课睡着了打呼噜被老师点起来回答问题；食堂阿姨今天手特别抖。你笑得不行，又补了一件你自己今天碰到的糗事。两人在屏幕两端笑成了一团。','一边忙自己的事一边敷衍听着，偶尔敷衍回应',{happiness:1},-2,'她兴致勃勃地发了一条又一条，你隔了五分钟才回了个"哈哈"。她又发了一条更好笑的——你这次隔了八分钟。她不再发了。'),
_gfe('主动关心你的学业进度','【女友姓名】贴心询问你今日作业、课业任务是否完成，担心你堆积任务、熬夜赶工，细致关心你的学习节奏。','如实分享学业进度，和她交流学习心得，互相督促进步',{wisdom:2},3,'你把今天的todo list发给她看——打了三个勾，还剩两个。"C++那个题有点难，不过我打算等下再试试。"她说她今天也遇到了同样的题，两人交换了解题思路。你发现她提供的一个思路特别巧妙——"你太聪明了！"她回："嘻嘻——互相帮忙嘛。"','不耐烦回应，告知不用她操心自己的事情',{},-3,'"我自己有安排——不用你操心。"这条消息发出去之后，对面沉默了很久。她最后只回了一个字："好。"'),
_gfe('偶遇难题自我怀疑','晚间刷题时，【女友姓名】接连遇到重难点错题，心态受挫、自我怀疑，情绪低落，陷入学习焦虑，渴望得到你的鼓励。','温柔安抚受挫情绪，帮她分析错题原因，耐心鼓励、给予信心',{wisdom:2},4,'你一看——原来她是卡在同一类型的题目上了。"这不是你笨——是这个题型有个小技巧，我以前也老错，后来发现只要记住第一步的转换公式后面全通了。来，我带着你走一遍。"讲完之后她把那道题独立做出来了。"做出来了！"她打了三个惊叹号——信心重新回来了。','直言是她不够认真，简单指责她粗心大意',{},-3,'"你肯定上课没好好听——这些题老师都讲过的。"你说得轻飘飘的。她咬了咬牙：“知道了。”接下来的好几天，她再也没问过你学习上的任何问题。'),
_gfe('分享治愈音乐歌单','【女友姓名】晚间听到几首温柔治愈的歌曲，觉得十分贴合心境，特意整理分享歌单给你，想让你也感受这份温柔。','认真倾听歌曲，和她交流听歌感受，夸赞她的音乐品味',{happiness:3},2,'你点开她分享的歌单——第一首是温柔的钢琴独奏，第二首是民谣，第三首是轻快的英文歌。"这歌单太好听了！第三首我收藏了——你品味太绝了吧！"她特别开心地说："对吧对吧！我就知道你也会喜欢！"','表示自己不爱听歌，直接无视她的分享',{},-2,'"我不怎么听歌。"打完这行字后你没再看那个链接。她看着自己花了一个小时整理好的歌单，默默删掉了那段已经写好的推荐语。'),
_gfe('主动分享生活小烦恼','【女友姓名】遇到一点生活琐碎烦心事，心里略有憋屈，晚间主动和你倾诉，不求解决办法，只求你的理解和陪伴。','耐心倾听、共情情绪，温柔开导，站在她的角度理解她的委屈',{happiness:2},4,'她把事情说完后，你说："这事换谁都会不舒服——你完全没错。来，跟我一起——深吸一口气，把坏心情呼出去。"她跟着你做了一遍，发来一个喷笑的表情："你还真会哄人。"','觉得小事不值一提，劝说她不要矫情、胡思乱想',{},-3,'"这也叫事儿？你想太多了，别那么敏感。"这句话发出去之后，她沉默了。过了很久，她发来两个字："没事了。"'),
_gfe('邀约图书馆静心陪伴','晚间图书馆安静舒适，适合静心学习，【女友姓名】邀约你一同前往自习，不用刻意交流，安静陪伴、共同进步。','欣然赴约，陪她图书馆自习，互不打扰、双向陪伴',{wisdom:4},3,'你拎着书包去了图书馆。她已经在靠窗的位置坐好了，对面留了一个空位给你——桌角还放了一杯温水。你坐下的瞬间她抬头冲你笑了一下，然后又低头继续看书。两个多小时里只有翻书声和偶尔交换的笔记本——安静、专注、踏实的陪伴。','不想久坐学习，拒绝邀约，选择自由放松',{happiness:2},-2,'"不去——我今天不想学了。"她回了个"好吧"，自己去了图书馆。靠窗的座位那里，对面的空位始终没有人来。'),
_gfe('贴心帮你规避琐事麻烦','【女友姓名】留意到班级通知、作业截止、课堂安排等重要信息，特意整理汇总提醒你，避免你遗漏事项、耽误课业。','真诚道谢，夸赞她细心靠谱，铭记她的贴心付出',{charm:2},3,'你打开她发的消息——一条一条列得清清楚楚：明天高数课前交作业、周三形势与政策课调教室了、辅导员让填的那个表截止日是周五。"你真的太靠谱了——要不是你提醒我绝对漏掉！"她发来一个得意的表情："嘿嘿——以后我就当你的专属备忘小秘书。"','理所当然接受提醒，无任何感谢与回应',{},-2,'你扫了一眼消息，一个字没回。隔了两天你熬夜赶作业的时候翻聊天记录，才注意到她那天提醒的所有事情——一件都没记。'),
_gfe('畅想未来校园生活','夜深人静，氛围温柔，【女友姓名】主动和你畅想后续校园生活、课余计划、假期安排，满心期待和你共度更多时光。','认真回应畅想，积极规划二人后续时光，贴合彼此心意',{happiness:3},4,'"下学期我们可以选同一门选修课——然后周末一起去学校旁边的那个公园，听说春天樱花开了特别好看。暑假的话——我们可以先各自回家，然后中间约一趟旅行。"她发来的畅想一条接一条，你一条一条认真回，还加了好多自己的计划。不知不觉聊到凌晨——未来有了彼此，期待都变多了。','态度敷衍，对未来毫无规划，消极回应话题',{},-2,'"想那么远干嘛——先把这周过完再说吧。"她看着这行文字，把刚才打好的"暑假旅行攻略"悄悄删掉了。'),
_gfe('轻微吃醋试探心意','白天看到你和其他同学正常交流相处，【女友姓名】心里略有小醋意，晚间故作随意试探你的态度，想确认自己的特殊位置。','温柔安抚她的小情绪，耐心解释清楚，明确她的专属偏爱',{charm:3},4,'你一眼就看出她话里话外的小醋意。没等她问第二遍，你直接说："今天那个只是班里同学——普通同学。在我这里——你有专属头衔：最重要的那个人。"她过了半天才回："真的吗？"你说："真的。从来都是。"她的语气一下子就软了。','觉得她无理取闹、小题大做，不耐烦辩解',{},-3,'"我跟谁说话你都要管？你是不是太闲了？"这几句话像刀子一样扎了过去。她看着屏幕，一个字也打不出来。过了很久她没有再发任何消息。'),
_gfe('身体不适寻求关心','【女友姓名】晚间轻微身体不适，头晕乏力、肠胃不适，状态不佳，主动告知你，渴望得到你的关心问候。','细致询问身体状况，贴心叮嘱休息、多喝热水，全程温柔关心',{happiness:2,charm:1},4,'"什么时候开始的？有没有吃药？"你连着问了好几个问题，然后一条一条叮嘱——先喝杯温水，躺下休息，别再看手机了，明早如果还不好就去看校医。她说："被你关心的感觉——比吃药还管用。"你又说："少来——先把热水喝了再来跟我耍嘴皮子。"','简单一句多休息，不在意她的身体状态，敷衍了事',{},-3,'"哦——那早点睡吧。"这是你唯一的回复。她蜷在被子里——难受是真的，但更难受的是你这句话里的冷淡。'),
_gfe('精心挑选小礼物询问意见','【女友姓名】打算入手小饰品、小摆件等精致好物，看中几款款式难以抉择，专门询问你的审美意见。','认真对比款式，结合她的风格真诚推荐，细致说明理由',{charm:2},3,'你挨个看了她发来的几张图——一个简约银手链、一个复古风耳钉、一个小猫摆件。"手链最适合你——简约风搭什么都好看，而且你手腕细，戴着肯定特别精致。耳钉偏成熟不太适合日常，摆件可爱但实用度不如手链。"她立刻拍板："就手链了！你的眼光我信！"','随便说都好看，敷衍应对，不愿认真参考',{},-2,'"都挺好看的——你随便买一个。"她纠结了很久，最后买了一个——但她不知道你是不是真的觉得好看。'),
_gfe('渴望专属陪伴聊天','夜晚独处时分，【女友姓名】略显孤单，想和你好好聊天谈心，打发闲暇时光，享受二人专属陪伴。','放下琐事，专心陪她彻夜闲聊，倾听她的心声',{happiness:4},3,'你关掉了正在看的视频，把手机亮度调到最舒服的档位，专心听她说。她聊起了小时候的梦想、高中最想念的老师、对未来的小小迷茫与期待。你跟着她的情绪起起伏伏，深夜的屏幕两头——两颗心越靠越近。天快亮了你们才互道晚安。','以忙碌、疲惫为由，草草结束聊天',{happiness:1},-2,'"今天太累了——改天再聊吧。"你看了眼时间——其实才九点。她回了个"好"，然后对着空荡荡的对话框发了很久的呆。'),
_gfe('考试考前紧张焦虑','临近随堂测试或小考，【女友姓名】心态紧张、焦虑不安，担心发挥失常，晚间心神不宁，需要你的安抚与鼓励。','耐心安抚紧张情绪，帮她梳理知识点，暖心加油打气',{wisdom:2},4,'你放下手头所有事情，一条一条帮她过重点。每过一个知识点就鼓励她一遍。"你看——这一章你明明掌握得很好，只是太紧张了。深呼吸，相信自己。你平时那么认真——考试绝对没问题！"她慢慢从焦虑中冷静下来，重新打开了课本。','告知她紧张无用，考试全看运气，消极敷衍安慰',{},-3,'你轻飘飘地说了一句："紧张也没用——考试这种东西全看运气，复习再多也没用。"她看着这行字，手里的笔慢慢放下了。心里的紧张没有消散——反而多了一层失落。'),
_gfe('分享运动后的畅快心情','【女友姓名】晚间坚持运动锻炼，出汗过后身心舒畅，特意和你分享运动后的轻松状态与愉悦心情。','认真夸赞她自律坚持，鼓励她继续保持，为她开心',{health:2},3,'"你太自律了吧！我躺床上刷手机的时候你居然已经跑了三圈——向你学习！"你发完这句又补了一句："明天我也去跑，咱们可以一边跑一边语音——互相监督。"她特别开心地说："好！一言为定——明天操场见！"','平淡回应，觉得运动没必要，不认可她的坚持',{},-2,'"运动有什么好的——累得要死。"她看着你的回复，绑好的鞋带又松开了。'),
_gfe('纠结追剧观影选择','晚间闲暇，【女友姓名】想追剧放松，面对多部剧集难以选择，询问你的观影偏好，想参考你的意见。','主动了解剧集内容，结合她的喜好真诚推荐，耐心讨论剧情',{happiness:3},2,'她列了三个选项——一部悬疑、一部爱情、一部搞笑。你分析道："悬疑太费脑今天不适合，爱情片那个据说前面甜后面虐，你今天心情好不适合虐——搞笑这部我看过，从头笑到尾，就它了！"她采纳了你的建议，两个小时后兴奋地跑来跟你分享最好笑的片段。','表示自己不追剧，让她随便选，不愿参与话题',{},-2,'"我不看剧——你自己选。"她对着那三部剧的介绍发了好一会儿愣，最后一部也没选——关掉了页面。'),
_gfe('主动反思日常小不足','【女友姓名】复盘一天的言行，发现自己些许小不足，主动和你坦诚反思，希望变得更好、更贴合你。','温柔安慰包容她，告知她无需完美，在你眼里足够优秀',{charm:2},4,'"你说什么傻话呢——你在我眼里已经够好了。今天的事根本不是你的错，换任何人都可能那样处理。你不是有不足——你只是对自己要求太高了。"她看完这段话，眼眶热热的。"谢谢你一直这么包容我。"','顺势指出她的缺点，加重她的自我否定情绪',{},-3,'"你确实有时候太较真了——上次那件事也是，别人都没当回事就你一直纠结。"她本来只是想求一句安慰，却被你的话重重地推了回去。'),
_gfe('雨天晚间专属陪伴','夜间下起淅淅沥沥的小雨，氛围静谧温柔，【女友姓名】不喜雨天独处的冷清，希望能和你聊天陪伴、驱散孤单。','全程耐心陪伴聊天，分享暖心话题，温柔治愈雨天冷清',{happiness:3},4,'窗外雨声滴滴答答——你给她发了张窗外的照片："听——雨声很好听，像天然的白噪音。"她回了张自己的窗外。你们就这样隔着屏幕一起听雨、一起聊天——你讲了你小时候下雨天出去玩被妈妈骂的糗事，她笑了很久。雨不知不觉停了，她的孤单也散了。','告知雨天无聊早点休息，快速结束对话',{happiness:1},-2,'"下雨天不睡觉干嘛——早点睡吧。"她一个人听着窗外的雨声，把手机放在了枕头边。'),
_gfe('分享家乡趣味趣事','晚间氛围闲适，【女友姓名】敞开心扉，和你分享家乡风俗、童年趣事、成长经历，慢慢诉说过往。','认真倾听、积极互动，主动追问细节，深入了解她的过往',{charm:2},3,'她说她小时候每年过年外婆都会做一种叫"糖环"的糕点，她可以一个人吃掉一大半。你问那个东西长什么样——她跑去翻了一张老照片发给你，圆圆的、炸得金黄的、特别可爱。你说："下次放假带我去你家乡——我要吃这个。"她回："好——我让外婆亲手给你做。"','左耳进右耳出，敷衍回应，不在意她的过往分享',{},-2,'她讲了很久——童年的夏天、外婆家的院子、让她哭了一整个暑假的小狗。你看完了，打了两个字："哦哦。"她停了一下——把剩下的故事全部咽了回去。'),
_gfe('想要一起打卡学习','【女友姓名】想要自律提升自己，提议和你晚间线上打卡学习，互相监督、共同进步，一起攻克课业难点。','爽快答应打卡约定，认真配合学习监督，双向自律成长',{wisdom:3},3,'你说："好主意！每天晚上九点互相报今日进度——完成任务的人可以给没完成的人布置一个课后题。谁也别想偷懒。"她特别兴奋地说："一言为定！flag已立！"从那以后，你们的学习效率肉眼可见地提高了——她说这是"恋爱+学霸"双赢模式。','拒绝打卡约束，声称学习随意就好，不想刻意自律',{},-2,'"打卡太麻烦了——想学的时候就学呗，不用那么刻意。"她默默地关掉了那个已经写好的每日打卡计划表。'),
_gfe('夸赞你的闪光点','【女友姓名】晚间认真细数你的优点，夸赞你的性格、能力、品行，真心觉得和你相处十分舒服安心。','温柔回应她的偏爱，同样夸赞她的美好，双向奔赴认可',{charm:3},3,'"被你这么一夸——我都快飘起来了。不过要论温柔善良，你才是我见过最闪闪发光的人。你身上有很多你自己都没意识到的美好——恰好我一条一条都记着。"她看得眼眶微热。"我们这是在互相吹彩虹屁吗？""嗯——而且这个彩虹屁我打算吹一辈子。"','骄傲自大、不以为然，态度敷衍嚣张',{},-3,'"知道就好——我本来就这么优秀。"你回得洋洋得意。她没有接话——那句原本想说的"和你在一起真的很幸福"停在了输入框里，再也没有发出去。'),
_gfe('纠结社团活动参与选择','面对后续社团活动、课余竞赛，【女友姓名】难以抉择是否参与，担心占用学习时间，特意征求你的建议。','耐心帮她分析利弊，结合她的特长与时间，给出合理规划',{wisdom:2},3,'你仔细问了她几个问题——活动大概要多久、她的课表空闲时间有多少、这个竞赛对她以后有没有用。然后帮她做了一个简单的利弊分析表。"我觉得你可以参加——时间虽然紧但完全可以安排开，而且这个经历对你简历有帮助。"她看完后坚定了信心："好——我报名！谢谢你帮我想得这么清楚。"','随意让她自己决定，不帮忙分析、不给予建议',{},-2,'"你自己看着办——我又不了解。"她盯着那堆活动通知看了很久，最后因为无人商量——全部选择了放弃。'),
_gfe('晚间饿了纠结宵夜选择','夜深腹空，【女友姓名】有点想吃宵夜，却纠结品类选择，担心长胖又想吃美食，陷入两难。','温柔帮她权衡利弊，推荐健康美味的宵夜，贴心迁就她的喜好',{happiness:3},3,'你说："别纠结了——想吃就吃！一杯热牛奶配全麦面包，健康又顶饿，热量也不高。如果实在管不住嘴——明天我们操场多跑一圈，我陪你。"她发来一个感动到哭的表情："你也太好了——从来没人这样迁就我。"她开心地去热了牛奶——吃完后安稳地睡着了。','直接制止她吃宵夜，强硬告知长胖不好、毫无包容',{},-2,'"现在吃东西肯定长胖——忍一忍就过去了，别这么没自制力。"她放下了已经拿起的牛奶——空腹翻来覆去折腾到半夜才睡着。'),
_gfe('怀念初识的美好时光','【女友姓名】晚间翻看初识时的聊天记录、相处瞬间，满心感慨，和你诉说初识的心动与美好，怀念过往时光。','共情她的感慨，一同回忆美好过往，珍惜当下相处时光',{happiness:4},4,'她发来一张截图——是你们第一次聊天那天的记录。"你看看那时候——你发的消息好正经！跟你现在的语气完全不一样。"你翻了一下也笑了半天。"那时候谁知道后来会变成这样——每天不跟你聊几句就睡不着。"她安静了一会儿，发来一句："谢谢你一直在我身边。"你说："以后也在。"','觉得回忆无用，态度冷淡，不愿共情她的情绪',{},-3,'"老翻那些干嘛——人应该往前看。"她默默关掉了那个存了好几个月的聊天记录文件夹。往前看她当然知道——只是偶尔她也需要一句：那些美好我也记得。'),
_gfe('主动规划假期行程','临近假期，【女友姓名】主动和你讨论假期安排，满心期待能和你一起出行、共度闲暇假期。','积极配合规划行程，主动预留二人独处时光，期待相伴出行',{happiness:3},3,'你翻出一张地图——圈了几个离学校不远的小城市。"国庆我们可以去这里——第一天古镇逛吃逛吃，第二天爬山看日出，第三天回家补觉。"她发来一大串感叹号："你怎么把攻略都做好了！！我本来还在纠结怎么开口问你！"你笑着说："因为我比你还期待。"','表示假期只想宅家独处，无意和你结伴出行',{},-2,'"放假就想在家睡个够——不想出门。"她打好的旅行攻略链接还停留在对话框里，最终——发送键没有按下去。'),
_gfe('虚心请教生活小技巧','面对生活琐事、收纳整理、时间规划等问题，【女友姓名】经验不足，专门请教你的实用技巧与方法。','耐心分享实用技巧，细致讲解步骤，手把手帮她规避问题',{charm:2},3,'她问的每一个问题你都给出了详细的方案——收拾桌面："先分类后分区，每天早上花五分钟归位"。时间管理："用手机日历设三个提醒——课前、作业截止、复习周期"。她一边听一边认真记笔记，发来一张写得满满当当的截图："你太万能了——生活导师+学习搭子！"','敷衍告知网上都有，让她自行查阅，不愿费心分享',{},-2,'"这些网上都有——自己搜一下不就行了。"她打开搜索引擎，面对海量的杂乱信息——最终什么都没找到。'),
_gfe('情绪低落渴望陪伴','莫名的情绪低落涌上心头，【女友姓名】晚间心情沉闷、毫无兴致，不开心却不愿多说原因，只想要你的陪伴。','安静温柔陪伴，耐心开导、慢慢治愈她的低落情绪',{happiness:2},4,'你不追问原因——只是安静地陪着她。你发了一张宿舍窗外的星星照片，说"今晚的月亮旁边有一颗特别亮的星"。她沉默了很久，最后说："谢谢你没有逼我说——就这样陪着我，就够了。"你说："我不走——你想聊就聊，不想聊我就安静地在这儿。整晚都在。"','嫌弃她情绪矫情，催促她尽快调整好心情',{},-3,'"又怎么啦——动不动就心情不好，你也太敏感了。自己调整调整——睡一觉就好了。"她拉上了窗帘，关掉了手机——今晚的月光照不进她的房间。'),
_gfe('分享新学的小技能','【女友姓名】近日自学了拍照、剪辑、手工等新技能，晚间特意展示成果给你，想得到你的认可与夸赞。','真心夸赞她多才多艺、认真努力，全力认可她的成果',{charm:2},3,'她发来一个自己剪辑的短视频——转场流畅、背景音乐卡点完美、字幕也做得好。"这是你自己剪的？！你这水平可以直接去当UP主了！"她发来一连串害羞的表情："真的吗真的吗？我学了两个星期——剪废了好几个版本。"你说："每一个废掉的版本都是通往这个成品的阶梯——你太厉害了。"','平淡看待成果，觉得普通一般，刻意泼冷水',{},-2,'"还行吧——不过这种水平网上到处都是。"她看着自己花了两个星期、剪废了无数次才做出来的作品——把软件关掉了。'),
_gfe('担心相处节奏不合适','【女友姓名】偶尔会担心二人相处节奏、沟通方式不够契合，晚间坦诚说出内心顾虑，想和你磨合相处模式。','认真倾听顾虑，主动沟通磨合，承诺用心经营相处',{charm:3},4,'你说："谢谢你愿意说出来——这是最重要的一步。接下来我们一起调整——以后有什么不舒服就告诉我，我也是。我们不是天生完美契合——但我们愿意为彼此慢慢变成刚刚好的那个人。"她看完这段话沉默了很久——最后发来一句带着鼻音的"好"。','觉得她胡思乱想，告知相处随意就好，无需刻意磨合',{},-3,'"你又想多了——两个人在一起不就随便处着吗，哪来那么多讲究。"她把打了一大半的心里话全部删掉——从此再也没有提起这个话题。'),
_gfe('想要解锁新的相处方式','【女友姓名】觉得日常相处略显单调，想要尝试新的互动方式，比如一起打卡、互道晚安、趣味互动等。','积极配合她的想法，主动解锁新互动，丰富二人相处日常',{happiness:4},3,'你说："来——我们一项一项来。从今晚开始：每晚睡觉前必须互道晚安加今日最佳瞬间。每天中午分享一句看到的搞笑弹幕或者段子。每周日留出两个小时专属深夜聊天档——不被打扰的那种。"她看着这一长串提议，笑得合不拢嘴："你什么时候偷偷想了这么多！"','懒得改变现状，觉得现在相处就够了，不愿折腾',{},-2,'"现在这样不是挺好的吗——折腾那么多干嘛，怪累的。"她默默地关掉了那个写满了新鲜想法的备忘录。'),
_gfe('夸赞你的穿搭与状态','【女友姓名】晚间回忆你今日的穿搭、精神状态，真心夸赞你干净清爽、气质出众，满心欢喜。','温柔致谢，反过来夸赞她更加好看，双向甜蜜互动',{charm:2},3,'你说："你今天也超好看——那件白色卫衣特别适合你，衬得你整个人都在发光。今天上课的时候我旁边的兄弟都说：你女朋友怎么一天比一天好看。"她脸红了——发来一长串捂脸表情。"你旁边的兄弟真的这么说？""真的——不信明天你去问他。不过关键是你本来就好看——穿什么都好看。"','坦然接受夸赞，毫无回应、不懂双向奔赴',{},-2,'"嗯——谢谢。"你简单回了一句。她等了一会儿——期待的那句回夸并没有来。'),
_gfe('纠结兴趣爱好取舍','【女友姓名】有多项兴趣爱好，但学业繁忙难以兼顾，纠结取舍，想听听你的客观建议。','结合她的时间、特长细心分析，给出贴合她的最优建议',{wisdom:2},3,'你帮她画了个小表格——列出每项爱好的时间成本、收获感和她自己的擅长程度。画画时间最优、舞蹈需要稳定场地、摄影可以配合日常随身练习。"我建议保留画画和摄影——一个释放创造力，一个记录生活，互相不冲突。舞蹈等以后时间充裕了再捡起来也不迟。"她看着这张表——一下子豁然开朗了。','敷衍回应随便取舍即可，不愿认真思考帮忙',{},-2,'"你随便选一个就行了——哪个不都一样。"她看着自己的三个爱好——一个都舍不得放弃，但最终因为没人帮忙分析——全部搁置了。'),
_gfe('晚间犯困渴望晚安陪伴','夜深人静，【女友姓名】身心疲惫、睡意来袭，想要和你好好道别，接收你的温柔晚安祝福再入睡。','温柔道晚安，暖心叮嘱早睡好梦，给予满满的安全感',{happiness:3},3,'"晚安——今天辛苦啦。好好睡一觉，明天的太阳会叫你起床的。梦里有星星、有月亮、有明天食堂好吃的早餐——还有我。好梦。"她抱着手机把这段话反复看了好几遍，心满意足地放下了手机，闭上眼睛的时候嘴角还挂着笑。','简单发晚安二字，毫无温度，快速结束对话',{},-2,'"晚安。"就两个字——没有叮嘱、没有温柔、没有任何额外的温度。她看着这行字——把手机放到了一边，翻了个身，过了很久才睡着。'),
_gfe('主动为你考虑学业前程','【女友姓名】真心为你着想，晚间和你探讨学业规划、未来发展，鼓励你努力提升自己、奔赴更好的未来。','认真倾听规划，感谢她的用心考量，和她共同奔赴成长',{wisdom:3},4,'她把搜集到的考研信息、实习渠道、竞赛时间表整理得清清楚楚发给你——每一条都标注了你的优势和适合度。"你做这些花了多久？"你问。她说："没事，就是想帮你看看。"你心里一暖，认真地和她讨论起来——规划、方向、时间线。"有你在身边帮我想这些——我觉得未来清晰了好多。谢谢你。"','不以为然，觉得未来遥远无需多虑，消极敷衍',{},-3,'"现在想这些太早了吧——以后再说。"她看着自己花了好几个晚上整理的那份规划文档——按下了删除键。'),
_gfe('分享治愈日常小美好','【女友姓名】善于发现生活美好，把今日遇到的温柔小事、治愈瞬间一一分享给你，想把所有温柔都带给你。','认真倾听感受美好，共情她的温柔，夸赞她热爱生活',{happiness:3,charm:1},3,'她发了三张照片：一张是教学楼窗外的云、一张是食堂阿姨多给她打的菜、一张是图书馆窗台上晒太阳的猫。你说："你的眼睛真的是美好探测器——这些小事别人根本注意不到。和你在一起久了，感觉我也能看见更多美好的东西了。"她说："因为想把全世界所有温柔都分你一半。"','麻木无感，觉得都是琐碎小事，无视她的温柔分享',{},-2,'"不就是几朵云和一只猫吗——天天见。"她那三张精心拍好的照片在相册里蒙了灰——以后看到的那些美好，很久很久都没有再分享给你。'),
_gfe('坦诚满心皆是偏爱','相处日久，【女友姓名】愈发笃定心意，晚间坦诚告诉你，和你相处的每一天都很安心，满心满眼都是对你的偏爱与在意。','真诚回应心意，坦言自己同样满心偏爱她，双向奔赴、温柔相守',{happiness:5,charm:2},5,'你愣了一下——然后打了一大段话发过去："其实我一直觉得自己很幸运。遇到你之前我不知道谈恋爱可以这么踏实——不需要伪装、不需要讨好，你让我觉得做自己就足够被爱。所以别说什么偏爱不偏爱了——你的存在对我来说就是全部。以后每一天，我们就这样——你在、我在。好吗？"她看完这段话，眼泪掉在屏幕上——是甜的。','平淡回应，态度冷漠，不表露自己的心意与偏爱',{},-4,'"嗯——知道了。"她看着这行字——那些满心的偏爱、那些准备说出口的温柔，全部卡在了喉咙里。她把打了一大段的话一个字一个字删掉，最后只发了两个字："晚安。"')];

function promptCampusRun(callback){
  if(GS.campusRunKm>=60||GS._campusRunPrompted||GS.month<10||(GS.month===10&&GS.day<16)){if(callback)callback();return;}
  GS._campusRunPrompted=true;
  var st=$('story-text');if(st)st.innerHTML+='<br><br><span class="phase-tag auto">🏃 校园跑</span><br><strong>今日校园健康跑</strong><br>晚间校园跑时段已到，是否参加今日的2公里校园健康跑？当前累计：'+(GS.campusRunKm||0)+'/60km';
  updatePanel();
  $('choices-area').innerHTML='';
  var btn1=document.createElement('button');btn1.textContent='参加校园跑（健康-3，幸福-2，里程+2km）';
  var btn3=document.createElement('button');btn3.textContent='花费4金钱找同学代跑（里程+2km，2%被抓扣10km）';
  var btn2=document.createElement('button');btn2.textContent='不参加';
  btn1.onclick=function(){
    GS.health=Math.max(0,GS.health-3);GS.happiness=Math.max(0,GS.happiness-2);
    GS.campusRunKm=(GS.campusRunKm||0)+2;
    showPopup('🏃 校园跑','你完成了今日的2公里校园健康跑。\n当前累计里程：'+GS.campusRunKm+'/60km',{health:-3,happiness:-2},null,function(){updatePanel();if(callback)callback();});
  };
  btn3.onclick=function(){
    if(GS.money<4){showToast('金钱不足！需要4元。');return;}
    GS.money-=4;GS.campusRunKm=(GS.campusRunKm||0)+2;
    var caught=Math.random()<0.02;
    if(caught){
      GS.campusRunKm=Math.max(0,GS.campusRunKm-10);
      showPopup('🏃 校园跑','你花了4元找了同学代跑。\n\n不幸的是——学校体育部在抽查中发现了你的代跑行为！\n⚠️ 累计里程扣除10km！\n当前累计里程：'+GS.campusRunKm+'/60km',{money:-4},null,function(){updatePanel();if(callback)callback();});
    }else{
      showPopup('🏃 校园跑','你花了4元找了同学代跑。\n顺利蒙混过关！里程+2km。\n当前累计里程：'+GS.campusRunKm+'/60km',{money:-4},null,function(){updatePanel();if(callback)callback();});
    }
  };
  btn2.onclick=function(){showPopup('🏃 校园跑','你选择休息一天。',{},null,function(){updatePanel();if(callback)callback();});};
  $('choices-area').appendChild(btn1);$('choices-area').appendChild(btn3);$('choices-area').appendChild(btn2);
}

function renderDailyGfEvent(callback,excludeId){
  GS._gfEventFired=fmtDate(GS.year,GS.month,GS.day);
  if(!callback)callback=function(){};
  promptCampusRun(function(){_renderDailyGfEvent(callback,excludeId);});
}
function _renderDailyGfEvent(callback,excludeId){
  // Ensure girlfriends array exists
  if((!GS.girlfriends||GS.girlfriends.length===0)&&GS.gfUnlocked&&GS.gfFavor>0){
    GS.girlfriends=[{id:GS.gfId||'suxiaonuan',name:GS.gfName||'女友',favor:GS.gfFavor,coolingDays:0}];
    GS.classmateFavor[GS.gfId||'suxiaonuan']=GS.gfFavor;
  }
  var gfs=GS.girlfriends;
  if(!gfs||gfs.length===0){callback();return;}

  var gfIdx=0;
  function nextGf(){
    // Skip excluded GF
    while(gfIdx<gfs.length&&excludeId&&gfs[gfIdx].id===excludeId){gfIdx++;}
    if(gfIdx>=gfs.length){callback();return;}
    var gf=gfs[gfIdx];gfIdx++;
    var nm=gf.name;
    var tpl=(typeof GF_EVENT_POOL!=='undefined'&&GF_EVENT_POOL&&GF_EVENT_POOL.length)?GF_EVENT_POOL[Math.floor(Math.random()*GF_EVENT_POOL.length)]:null;

    var title=tpl?tpl.title:'晚间的温柔';
    var text=tpl?tpl.text.replace(/【女友姓名】/g,nm):'夜色渐深，'+nm+'发来消息，和你道了一声晚安，叮嘱你早点休息。';
    var c1text=tpl?tpl.c1:'温柔回应';
    var c2text=tpl?tpl.c2:'简单回复';
    var c1fv=tpl?tpl.f1:3;
    var c2fv=tpl?tpl.f2:-2;
    var c1eff=tpl?tpl.e1:{};
    var c2eff=tpl?tpl.e2:{};
    var c1res=tpl?tpl.r1.replace(/【女友姓名】/g,nm):'你认真回应了'+nm+'的消息，两人聊得很开心。';
    var c2res=tpl?tpl.r2.replace(/【女友姓名】/g,nm):'你简短回复了一句，'+nm+'似乎有些失落。';

    var tag=GS.girlfriends.length>1?'【'+nm+'】':'';
    var st=$('story-text');
    var html='<br><br><span class="phase-tag love">💕 女友事件'+tag+'</span><br><strong>'+title+'</strong><br>'+text.replace(/\n/g,'<br>');
    if(st)st.innerHTML+=html;
    updatePanel();
    $('choices-area').innerHTML='';

    var btn1=document.createElement('button');btn1.textContent=c1text;
    var btn2=document.createElement('button');btn2.textContent=c2text;

    btn1.onclick=function(){
      if(c1fv>0)GS.breakupProb=0;
      gf.favor=Math.max(0,gf.favor+c1fv);
      GS.classmateFavor[gf.id]=gf.favor;
      if(GS.girlfriends&&GS.girlfriends[0]&&GS.girlfriends[0].id===gf.id)GS.gfFavor=gf.favor;
      var ch1=doEffects(c1eff);
      if(c1fv)ch1[gf.id+'Fav']=c1fv;
      $('choices-area').innerHTML='';
      showPopup(title,c1res,ch1,null,function(){updatePanel();nextGf();});
    };
    btn2.onclick=function(){
      if(c2fv===0)GS.breakupProb+=10;
      gf.favor=Math.max(0,gf.favor+c2fv);
      GS.classmateFavor[gf.id]=gf.favor;
      if(GS.girlfriends&&GS.girlfriends[0]&&GS.girlfriends[0].id===gf.id)GS.gfFavor=gf.favor;
      var ch2=doEffects(c2eff);
      if(c2fv)ch2[gf.id+'Fav']=c2fv;
      $('choices-area').innerHTML='';
      if(c2fv===0&&GS.breakupProb>0&&Math.random()*100<GS.breakupProb){
        showBreakupPopup(function(){updatePanel();nextGf();});
      }else{
        showPopup(title,c2res,ch2,null,function(){updatePanel();nextGf();});
      }
    };
    $('choices-area').appendChild(btn1);
    $('choices-area').appendChild(btn2);
  }
  nextGf();
}

var DAILY_BONUS_EVENTS=[
  {text:'清晨阳光洒进窗户，你感到精力充沛，浑身充满活力。',effects:{health:3}},
  {text:'路上捡到一枚硬币，虽然不多但小小的幸运让人心情愉快。',effects:{money:5}},
  {text:'今天食堂阿姨手不抖，多给你打了一勺菜，倍感温暖。',effects:{happiness:3}},
  {text:'课前预习时灵光一闪，突然理解了之前一直困惑的知识点。',effects:{wisdom:3}},
  {text:'同学主动和你打招呼，称赞你今天的穿搭很好看。',effects:{charm:3}},
  {text:'校园广播里放了你最喜欢的歌，心情瞬间明朗起来。',effects:{happiness:2,charm:1}},
  {text:'路过公告栏看到自己的名字出现在院级表扬名单上。',effects:{glory:2}},
  {text:'在教室捡到一支很好用的笔，学习效率似乎都提高了。',effects:{wisdom:2,happiness:1}}
];

function renderGenericDay(){
  var wd=weekday(GS.year,GS.month,GS.day),dStr=fmtDate(GS.year,GS.month,GS.day);
  var skipRandom=GS.tuanxiaoAccepted&&GS.tuanxiaoWeekBan>0&&isWeekend(GS.year,GS.month,GS.day)&&GS.month>=10&&!(GS.month===10&&GS.day>=1&&GS.day<=7);
  if(GS.weekendEventReduction>0&&isWeekend(GS.year,GS.month,GS.day))skipRandom=true;
  var evt=null,evtChanges=null;
  if(!skipRandom){
    evt=GENERIC_EVENTS[Math.floor(Math.random()*GENERIC_EVENTS.length)];
    evtChanges=doEffects(Object.assign({},evt.effects));
  }
  var evtHtml='';
  if(skipRandom){evtHtml='<div style="color:#c0392b;margin-bottom:10px;">⚠️ 团校集训期间，周末随机事件不可用</div>';}
  else if(evt){
    evtHtml='<div style="color:#8b7d6b;font-size:.85em;margin-bottom:10px;">📌 今日事件</div>'+evt.text+'<br>';
    if(evtChanges){for(var k4 in evtChanges){if(evtChanges.hasOwnProperty(k4)&&evtChanges[k4]!==0){var s2=evtChanges[k4]>0?'+':'';evtHtml+='<span style="color:'+(evtChanges[k4]>0?'#1e7e34':'#c0392b')+';font-size:.85em;">'+(ICON[k4]||'')+' '+(ATTR[k4]||k4)+' '+s2+evtChanges[k4]+' </span>';}}}
  }
  var weatherHtml='';
  if(GS.weather)weatherHtml='<div style="color:#6b5f50;font-size:.85em;margin-bottom:6px;">'+GS.weather.icon+' 今日天气：'+GS.weather.name+' · '+GS.weather.desc+'</div>';
  if(GS.gfUnlocked||(GS.girlfriends&&GS.girlfriends.length>0)){
    $('main-area').innerHTML='<div id="story-title">📅 '+dStr+'　星期'+wd+'</div><div id="story-text">'+weatherHtml+evtHtml+'<br><div style="color:#8b7d6b;font-size:.85em;">👇 点击开始今日活动</div></div>';
    updatePanel();
    $('choices-area').innerHTML='';
    var startBtn=document.createElement('button');startBtn.className='primary';startBtn.textContent='开始今日活动';
    startBtn.onclick=function(){
      triggerClassmateEvent(function(){
        renderDailyActions(function(){
          renderDailyGfEvent(function(){
            var nb=document.createElement('button');nb.className='primary';nb.textContent='→ 下一天';
            nb.onclick=function(){advanceToNextDay();};
            $('choices-area').appendChild(nb);saveGame();
          });
        });
      });
    };
    $('choices-area').appendChild(startBtn);
  }else{
    $('main-area').innerHTML='<div id="story-title">📅 '+dStr+'　星期'+wd+'</div><div id="story-text">'+weatherHtml+evtHtml+'<br><div style="color:#8b7d6b;font-size:.85em;">👇 选择今天的行动</div></div>';
    updatePanel();
    $('choices-area').innerHTML='';
    DAILY_ACTIVITIES.forEach(function(act){
      var btn=document.createElement('button');btn.textContent=act.text;
      btn.onclick=function(){
        var eff5=Object.assign({},act.effects);
        if(act.sleepBonus){var sb2=getWeatherSleepBonus();if(Object.keys(sb2).length>0){Object.assign(eff5,sb2);}}
        var ch=doEffects(eff5);
        var popText2=act.text;
        if(act.sleepBonus&&Object.keys(getWeatherSleepBonus()).length>0)popText2+='\n\n🌧️ '+getWeatherSleepNarrative();
        _logCtx={choice:act.text};
        showPopup('今日行动',popText2,ch,null,function(){
          updatePanel();
          $('story-text').innerHTML+='<br><strong>✅ '+act.text+'</strong>';
          $('choices-area').innerHTML='';
          triggerClassmateEvent(function(){
            var nb=document.createElement('button');nb.className='primary';nb.textContent='→ 下一天';
            nb.onclick=function(){advanceToNextDay();};
            $('choices-area').appendChild(nb);saveGame();
          });
        });
      };
      $('choices-area').appendChild(btn);
    });
  }
  saveGame();
}

function renderDailyActions(callback){
  $('story-text').innerHTML+='<br><div style="color:#8b7d6b;font-size:.85em;">👇 选择今天的行动</div>';
  $('choices-area').innerHTML='';
  DAILY_ACTIVITIES.forEach(function(act){
    var btn=document.createElement('button');btn.textContent=act.text;
    btn.onclick=function(){
      var eff5=Object.assign({},act.effects);
      if(act.sleepBonus){var sb2=getWeatherSleepBonus();if(Object.keys(sb2).length>0){Object.assign(eff5,sb2);}}
      var ch=doEffects(eff5);
      var popText2=act.text;
      if(act.sleepBonus&&Object.keys(getWeatherSleepBonus()).length>0)popText2+='\n\n🌧️ '+getWeatherSleepNarrative();
      _logCtx={choice:act.text};
      showPopup('今日行动',popText2,ch,null,function(){
        updatePanel();
        $('story-text').innerHTML+='<br><strong>✅ '+act.text+'</strong>';
        $('choices-area').innerHTML='';
        if(callback)callback();
      });
    };
    $('choices-area').appendChild(btn);
  });
}

function applyMonthly(){GS.money+=2500;}

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
  if(!hist||hist.length===0)return;
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

// ===== 同学系统 =====
function openClassmates(){
  renderClassmatesPanel();
}
function renderClassmatesPanel(){
  var males=getSortedClassmates('male');
  var females=getSortedClassmates('female');
  var gfIds=getAllGfIds();
  var mRows='',fRows='';
  for(var i=0;i<males.length;i++){
    var m=males[i];
    var isGf2m=gfIds.indexOf(m.id)>=0;
    var isRm=m.tags&&m.tags.indexOf('roommate')>=0;
    mRows+='<div class="cm-item'+(isGf2m?' cm-gf':'')+(isRm?' cm-rm':'')+'" onclick="closeClassmates();openClassmateDetail(\''+m.id+'\')" style="cursor:pointer;"><span class="cm-name">'+(isGf2m?'💕 ':'')+(isRm?'🏠 ':'')+m.name+'</span><span class="cm-favor">'+m.favor+'</span></div>';
  }
  for(var j=0;j<females.length;j++){
    var f=females[j];
    var isGf2f=gfIds.indexOf(f.id)>=0;
    fRows+='<div class="cm-item'+(isGf2f?' cm-gf':'')+'" onclick="closeClassmates();openClassmateDetail(\''+f.id+'\')" style="cursor:pointer;"><span class="cm-name">'+(isGf2f?'💕 ':'')+f.name+'</span><span class="cm-favor">'+f.favor+'</span></div>';
  }
  var html='<div class="cm-overlay" id="cm-overlay" onclick="if(event.target===this)closeClassmates()">'+
    '<div class="cm-box" id="cm-box">'+
      '<div class="cm-title">👥 全班同学好感度</div>'+
      '<div class="cm-section"><div class="cm-section-title">🚹 男生（23人）</div><div class="cm-list">'+mRows+'</div></div>'+
      '<div class="cm-section"><div class="cm-section-title">🚺 女生（7人）</div><div class="cm-list">'+fRows+'</div></div>'+
      '<button class="cm-close" onclick="closeClassmates()">关闭</button>'+
    '</div>'+
  '</div>';
  var existing=document.getElementById('cm-overlay');
  if(existing)existing.parentNode.removeChild(existing);
  var div=document.createElement('div');
  div.innerHTML=html;
  document.body.appendChild(div.firstElementChild);
}
function closeClassmates(){
  var el=document.getElementById('cm-overlay');
  if(el)el.parentNode.removeChild(el);
}

// ===== 同学详情面板（聊天/赠礼/表白/分手） =====
function openClassmateDetail(cmId){
  var cm=CLASSMATES[cmId];if(!cm)return;
  var fav=GS.classmateFavor[cmId]||0;
  var gf=getGfById(cmId);
  var isFemale=cm.gender==='female';
  var html='<div class="cm-detail-overlay" id="cm-detail-overlay" onclick="if(event.target===this)closeClassmateDetail()">'+
    '<div class="cm-detail-box"><div class="cm-detail-title">'+(gf?'💕 ':'')+cm.name+'</div>'+
    '<div class="cm-detail-favor">好感度：<span style="color:'+(fav>=100?'#c0392b':(fav>=60?'#1a3a5c':'#8b7d6b'))+';">'+fav+'</span></div>'+
    '<div class="cm-detail-btns">'+
      '<button id="cm-btn-chat">💬 聊天</button>'+
      '<button id="cm-btn-gift">🎁 赠礼</button>';
  if(isFemale&&!gf&&fav>100)html+='<button id="cm-btn-confess" style="background:#e74c3c;color:#fff;">💌 表白</button>';
  if(gf)html+='<button id="cm-btn-break" style="background:#c0392b;color:#fff;">💔 分手'+(gf.coolingDays>0?' (冷静期 '+gf.coolingDays+'/5)':'')+'</button>';
  html+='</div><button class="cm-detail-close" onclick="closeClassmateDetail()">关闭</button></div></div>';
  var existing=document.getElementById('cm-detail-overlay');
  if(existing)existing.parentNode.removeChild(existing);
  var div=document.createElement('div');div.innerHTML=html;
  document.body.appendChild(div.firstElementChild);
  var btnChat=document.getElementById('cm-btn-chat');
  var btnGift=document.getElementById('cm-btn-gift');
  var btnConfess=document.getElementById('cm-btn-confess');
  var btnBreak=document.getElementById('cm-btn-break');
  if(btnChat)btnChat.onclick=function(){doChat(cmId);};
  if(btnGift)btnGift.onclick=function(){doGift(cmId);};
  if(btnConfess)btnConfess.onclick=function(){doConfess(cmId);};
  if(btnBreak)btnBreak.onclick=function(){doBreakup(cmId);};
}
function closeClassmateDetail(){
  var el=document.getElementById('cm-detail-overlay');
  if(el)el.parentNode.removeChild(el);
}

// ----- 聊天 -----
function doChat(cmId){
  var cm=CLASSMATES[cmId];if(!cm)return;
  if(!GS._dailyInteractIds)GS._dailyInteractIds={};
  var curCount=GS._dailyInteractIds[cmId]||0;
  var totalIds=0;for(var dik in GS._dailyInteractIds){if(GS._dailyInteractIds.hasOwnProperty(dik))totalIds++;}
  if(totalIds>=2&&curCount<=0){showToast('今日已与2名同学交互，无法再与更多同学互动');return;}
  if(curCount>=2){showToast('今日与该同学已交互2次，无法继续互动');return;}
  closeClassmateDetail();
  var pool=CHAT_GENERAL.slice();
  if(cm.gender==='female')pool=pool.concat(CHAT_FEMALE);
  var dlg=pool[Math.floor(Math.random()*pool.length)];
  var overlay=document.createElement('div');overlay.className='popup-overlay';
  overlay.innerHTML='<div class="popup-box">'+
    '<div class="popup-title">💬 与'+cm.name+'聊天</div>'+
    '<div class="popup-result" style="font-size:.88em;color:#6b5f50;margin-bottom:12px;">'+cm.name+'：'+dlg.text+'</div>'+
    '<button class="popup-btn chat-opt" data-v="1" style="margin-bottom:6px;">'+dlg.c1+'</button>'+
    '<button class="popup-btn chat-opt" data-v="2">'+dlg.c2+'</button></div>';
  document.body.appendChild(overlay);
  overlay.querySelectorAll('.chat-opt').forEach(function(b){
    b.onclick=function(){
      overlay.remove();
      var choice=parseInt(b.getAttribute('data-v'));
      var favDelta=choice===1?dlg.f1:dlg.f2;
      var optText=choice===1?dlg.c1:dlg.c2;
      GS.classmateFavor[cmId]=Math.max(0,(GS.classmateFavor[cmId]||0)+favDelta);
      GS._dailyInteractIds[cmId]=(GS._dailyInteractIds[cmId]||0)+1;
      if(isGf(cmId))syncGfFromClassmate(cmId);
      showPopup('💬 聊天','你选择了「'+optText+'」',{[cmId+'Fav']:favDelta},null,function(){updatePanel();});
    };
  });
  overlay.onclick=function(e){if(e.target===overlay){overlay.remove();}};
}

// ----- 赠礼 -----
function doGift(cmId){
  var cm=CLASSMATES[cmId];if(!cm)return;
  if(!GS._dailyInteractIds)GS._dailyInteractIds={};
  var curCount2=GS._dailyInteractIds[cmId]||0;
  var totalIds2=0;for(var dik2 in GS._dailyInteractIds){if(GS._dailyInteractIds.hasOwnProperty(dik2))totalIds2++;}
  if(totalIds2>=2&&curCount2<=0){showToast('今日已与2名同学交互，无法再与更多同学互动');return;}
  if(curCount2>=2){showToast('今日与该同学已交互2次，无法继续互动');return;}
  closeClassmateDetail();
  var overlay=document.createElement('div');overlay.className='supermarket-overlay';
  var html='<div class="gift-box"><div class="gift-title">🎁 赠送礼物给'+cm.name+'</div>';
  html+='<div class="gift-subtitle">当前好感：'+(GS.classmateFavor[cmId]||0)+'　|　💰 余额：'+GS.money+'</div>';
  for(var i=0;i<GIFT_ITEMS.length;i++){
    var g=GIFT_ITEMS[i];
    var canBuy=GS.money>=g.cost;
    html+='<div class="gift-item'+(canBuy?'':' gift-disabled')+'"><div class="gift-info"><span class="gift-name">'+g.name+'</span><span class="gift-effect">好感+'+g.favor+'</span></div><span class="gift-cost">¥'+g.cost+'</span><button class="gift-btn" '+(canBuy?'':'disabled')+' data-idx="'+i+'">赠送</button></div>';
  }
  html+='<button class="gift-close" id="gift-close">关闭</button></div>';
  overlay.innerHTML=html;
  document.body.appendChild(overlay);
  document.getElementById('gift-close').onclick=function(){overlay.remove();};
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
  overlay.querySelectorAll('.gift-btn').forEach(function(b){
    b.onclick=function(){
      var idx=parseInt(b.getAttribute('data-idx'));
      var g=GIFT_ITEMS[idx];
      if(GS.money<g.cost){showToast('金钱不足！');return;}
      GS.money-=g.cost;
      GS.classmateFavor[cmId]=Math.max(0,(GS.classmateFavor[cmId]||0)+g.favor);
      GS._dailyInteractIds[cmId]=(GS._dailyInteractIds[cmId]||0)+1;
      if(isGf(cmId))syncGfFromClassmate(cmId);
      overlay.remove();
      showPopup('🎁 赠礼','你赠送了「'+g.name+'」给'+cm.name+'。',{[cmId+'Fav']:g.favor},null,function(){updatePanel();});
    };
  });
}

// ----- 表白 -----
function doConfess(cmId){
  var cm=CLASSMATES[cmId];if(!cm)return;
  var fav=GS.classmateFavor[cmId]||0;
  var rate=30+(fav-100);
  if(rate>100)rate=100;if(rate<0)rate=0;
  var roll=Math.random()*100;
  var success=roll<rate;
  if(success){
    addGf(cmId,cm.name,fav);
    GS.classmateFavor[cmId]=fav;
    showPopup('💌 表白成功','你鼓起勇气，单独约'+cm.name+'来到安静的校园操场晚风之下。天色渐暗，校园路灯柔和亮起。你认真说出内心心意，坦诚自己长久以来的好感，正式向'+cm.name+'告白。\n\n'+cm.name+'脸颊微红，沉默片刻后，点头答应了你的告白。自此双方正式确立恋爱关系，'+cm.name+'置顶成为女友，开启全部女友专属剧情。\n\n📌 表白成功率：'+Math.floor(rate)+'%（实际掷骰：'+Math.floor(roll)+'）',{'charm':3},null,function(){updatePanel();});
  }else{
    GS.classmateFavor[cmId]=Math.max(0,fav-5);
    showPopup('💌 表白失败',cm.name+'礼貌拒绝了你的告白，表示目前只想维持普通同学关系，不想更进一步。氛围变得尴尬，双方寒暄过后各自离开。\n\n⚠️ 好感度-5\n📌 表白成功率：'+Math.floor(rate)+'%（实际掷骰：'+Math.floor(roll)+'）',{[cmId+'Fav']:-5},null,function(){updatePanel();});
  }
}

// ----- 分手 -----
function doBreakup(cmId){
  var gf=getGfById(cmId);if(!gf)return;
  if(gf.coolingDays>0){
    showPopup('💔 分手','冷静期进行中（'+gf.coolingDays+'/5天），请等待冷静期结束后再操作。',null,null,null);
    return;
  }
  gf.coolingDays=1;
  gf.coolingApplied=false;
  showPopup('💔 分手冷静期','你已发起对'+gf.name+'的分手申请。\n\n进入5天冷静期：\n• 每日自动扣除10点好感度\n• 冷静期内无法撤回\n• 5天后二次确认是否正式分手\n\n当前好感度：'+gf.favor,'',null,null,function(){updatePanel();});
}

// 每日冷静期处理（在processDay中调用）
function processCoolingDays(){
  if(!GS.girlfriends)return;
  for(var i=GS.girlfriends.length-1;i>=0;i--){
    var gf=GS.girlfriends[i];
    if(gf.coolingDays>0&&gf.coolingDays<5){
      gf.coolingDays++;
      gf.favor=Math.max(0,gf.favor-10);
      GS.classmateFavor[gf.id]=gf.favor;
      if(GS.girlfriends[0].id===gf.id){GS.gfFavor=gf.favor;}
      if(gf.coolingDays>=5){
        showBreakupConfirm(gf);
      }
    }
  }
}
function showBreakupConfirm(gf){
  var seq2=++GS._popupSeq||(GS._popupSeq=1);
  var overlay=document.createElement('div');overlay.className='popup-overlay';
  overlay.innerHTML='<div class="popup-box"><div class="popup-title">💔 冷静期结束</div><div class="popup-result">5天冷静期已结束。\n\n与'+gf.name+'的关系：好感度已降至'+gf.favor+'。\n\n是否确认正式分手？\n• 确认分手：立即扣除30点好感，解除恋爱关系\n• 取消分手：恢复正常恋人关系，每日好感扣除停止</div><button class="popup-btn" id="breakup-yes-'+seq2+'" style="background:#c0392b;color:#fff;margin-bottom:6px;">是，正式分手</button><button class="popup-btn" id="breakup-no-'+seq2+'">否，取消分手</button></div>';
  document.body.appendChild(overlay);
  document.getElementById('breakup-yes-'+seq2).onclick=function(){
    overlay.remove();
    gf.favor=Math.max(0,gf.favor-30);
    GS.classmateFavor[gf.id]=gf.favor;
    removeGf(gf.id);
    showPopup('💔 分手确认','你确认了与'+gf.name+'的分手。\n\n⚠️ 好感度-30（累计）\n• 双向好感同步已解除\n• '+gf.name+'回归普通同学列表\n• 取消女友置顶标识',{[gf.id+'Fav']:-30},null,function(){updatePanel();});
  };
  document.getElementById('breakup-no-'+seq2).onclick=function(){
    overlay.remove();
    gf.coolingDays=0;
    showPopup('💔 取消分手','你取消了与'+gf.name+'的分手申请。\n\n恢复正常恋人关系，每日好感扣除停止。当前好感度：'+gf.favor,'',null,null,function(){updatePanel();});
  };
  overlay.onclick=function(e){if(e.target===overlay){overlay.remove();updatePanel();}};
}

// ===== 多女友被发现系统 =====
function checkMultiGfDiscovery(callback){
  var count=getGfCount();
  if(count<2){if(callback)callback();return;}
  var prob=10+(count-1)*10;
  if(Math.random()*100>=prob){if(callback)callback();return;}
  var seq4=++GS._popupSeq||(GS._popupSeq=1);
  var overlay=document.createElement('div');overlay.className='popup-overlay';
  overlay.innerHTML='<div class="popup-box"><div class="popup-title">🚨 出轨被发现！</div><div class="popup-result">你同时交往'+count+'名女友的事情被发现了！\n\n几位女友聚在一起，气氛剑拔弩张。你必须立刻做出选择：\n\n• 💰 花费'+(count*100)+'金钱安抚所有女友，化解矛盾\n• 💔 立即强制分手一名女友（无冷静期，扣除30好感）</div><button class="popup-btn" id="multi-pay-'+seq4+'" style="margin-bottom:6px;">💰 花费'+(count*100)+'金钱安抚</button><button class="popup-btn" id="multi-force-'+seq4+'" style="background:#c0392b;color:#fff;">💔 强制分手一名女友</button></div>';
  document.body.appendChild(overlay);
  document.getElementById('multi-pay-'+seq4).onclick=function(){
    overlay.remove();
    var payCost=count*100;
    if(GS.money<payCost){showToast('金钱不足（需'+payCost+'）！自动转入强制分手。');showForceBreakupSelect(callback);return;}
    GS.money-=payCost;
    for(var pi=0;pi<GS.girlfriends.length;pi++){
      GS.girlfriends[pi].favor=Math.max(0,GS.girlfriends[pi].favor-10);
      GS.classmateFavor[GS.girlfriends[pi].id]=GS.girlfriends[pi].favor;
    }
    if(GS.girlfriends.length>0&&GS.girlfriends[0].id===GS.girlfriends[0].id)GS.gfFavor=GS.girlfriends[0].favor;
    showPopup('💰 破财消灾','你掏出'+payCost+'金钱，带着所有女友去校外高级餐厅大吃了一顿，又每人送了一份精心挑选的礼物。\n\n虽然钱包大出血，但女友们的脸色总算缓和了下来。不过她们心里多少还是有些芥蒂——每名女友好感度 -10。\n本次无事发生——但下次就不好说了。',{money:-payCost},null,function(){updatePanel();if(callback)callback();});
  };
  document.getElementById('multi-force-'+seq4).onclick=function(){
    overlay.remove();
    showForceBreakupSelect(callback);
  };
  overlay.onclick=function(e){if(e.target===overlay){overlay.remove();if(callback)callback();}};
}
function showForceBreakupSelect(callback){
  var overlay=document.createElement('div');overlay.className='popup-overlay';
  var btns='';
  for(var i=0;i<GS.girlfriends.length;i++){
    var g=GS.girlfriends[i];
    btns+='<button class="popup-btn force-gf-btn" data-id="'+g.id+'" style="margin-bottom:4px;">'+g.name+'（好感：'+g.favor+'）</button>';
  }
  overlay.innerHTML='<div class="popup-box"><div class="popup-title">💔 选择强制分手的女友</div><div class="popup-result">选择一名女友立即分手：\n• 无冷静期，立即解除关系\n• 扣除30点好感度\n• 对方回归普通同学列表</div>'+btns+'</div>';
  document.body.appendChild(overlay);
  overlay.querySelectorAll('.force-gf-btn').forEach(function(b){
    b.onclick=function(){
      overlay.remove();
      var id=b.getAttribute('data-id');
      var gf=getGfById(id);
      if(gf){
        gf.favor=Math.max(0,gf.favor-30);
        GS.classmateFavor[id]=gf.favor;
        removeGf(id);
        showPopup('💔 强制分手','你选择了与'+gf.name+'强制分手。\n\n⚠️ 好感度-30\n• 双向好感同步已解除\n• '+gf.name+'回归普通同学列表',{[id+'Fav']:-30},null,function(){updatePanel();if(callback)callback();});
      }
    };
  });
  overlay.onclick=function(e){if(e.target===overlay){overlay.remove();if(callback)callback();}};
}

function dormInteract(type){
  var eff={},fav={};
  if(type==='game'){eff={happiness:6};fav={huye:3,jingye:3,naikou:3};}
  else if(type==='run'){eff={health:5};fav={huye:5};}
  else if(type==='play'){eff={happiness:5};fav={naikou:5};}
  else if(type==='chat'){eff={wisdom:3};fav={jingye:5};}
  for(var k in fav){
    if(fav.hasOwnProperty(k)&&GS.classmateFavor.hasOwnProperty(k)){
      GS.classmateFavor[k]=(GS.classmateFavor[k]||0)+fav[k];
    }
  }
  if(GS.gfUnlocked&&GS.gfName==='苏小暖'&&fav.suxiaonuan!==undefined){
    GS.gfFavor=Math.max(0,GS.gfFavor+(fav.suxiaonuan||0));
  }
  var changes=doEffects(eff);
  updatePanel();
  showPopup('宿舍互动','',changes,null,function(){updatePanel();renderClassmatesPanel();});
}

// ===== 存档 =====
function openTimeline(){
  if(!GS.storyLog||GS.storyLog.length===0){
    var overlay=document.createElement('div');overlay.className='timeline-overlay';
    overlay.innerHTML='<div class="timeline-box"><div class="timeline-title">📜 走马灯</div><div class="timeline-empty">暂无剧情记录<br><span style="font-size:.8em;">开始游戏后，每次选择和事件将自动记录在此</span></div><button class="timeline-close" id="tl-close">关闭</button></div>';
    document.body.appendChild(overlay);
    document.getElementById('tl-close').onclick=function(){overlay.remove();};
    overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
    return;
  }
  renderTimeline();
}

function renderTimeline(){
  var groups={},dates=[];
  for(var i=0;i<GS.storyLog.length;i++){
    var entry=GS.storyLog[i];
    if(!groups[entry.date]){groups[entry.date]=[];dates.push(entry.date);}
    groups[entry.date].push(entry);
  }
  var html='<div class="timeline-box"><div class="timeline-title">📜 走马灯</div><div class="timeline-subtitle">共 '+dates.length+' 天 · '+GS.storyLog.length+' 条记录</div>';
  for(var d=dates.length-1;d>=0;d--){
    var date=dates[d];
    html+='<div class="timeline-date-group"><div class="timeline-date-header">📅 '+date+' （'+(groups[date].length)+'条）</div>';
    for(var j=groups[date].length-1;j>=0;j--){
      var e=groups[date][j];
      html+='<div class="timeline-entry"><div class="timeline-entry-title">'+e.title+'</div>';
      if(e.choice)html+='<div class="timeline-entry-choice">▸ '+e.choice+'</div>';
      if(e.changes&&Object.keys(e.changes).length>0){
        html+='<div class="timeline-entry-changes">';
        for(var ck in e.changes){
          if(e.changes.hasOwnProperty(ck)&&e.changes[ck]!==0){
            var cls2=e.changes[ck]>0?'pos':'neg';
            var sign2=e.changes[ck]>0?'+':'';
            html+='<span class="chg-item '+cls2+'" style="font-size:1em;">'+(ICON[ck]||'')+' '+(ATTR[ck]||ck)+' '+sign2+e.changes[ck]+'</span>';
          }
        }
        html+='</div>';
      }
      if(e.result)html+='<div class="timeline-entry-result">'+e.result.replace(/\n/g,'<br>')+'</div>';
      html+='</div>';
    }
    html+='</div>';
  }
  html+='<button class="timeline-close" id="tl-close">关闭</button></div>';
  var overlay=document.createElement('div');overlay.className='timeline-overlay';
  overlay.innerHTML=html;
  document.body.appendChild(overlay);
  document.getElementById('tl-close').onclick=function(){overlay.remove();};
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
}

function saveGame(){
  if(!GS||GS.phase==='title'||GS.phase==='allocation')return;
  var data={
    v:4,year:GS.year,month:GS.month,day:GS.day,
    health:GS.health,happiness:GS.happiness,wisdom:GS.wisdom,charm:GS.charm,
    glory:GS.glory,money:GS.money,singing:GS.singing,performance:GS.performance,
    hasPengyuanCard:GS.hasPengyuanCard,hasPhoneCard:GS.hasPhoneCard,
    talentPerformed:GS.talentPerformed,talentSuccess:GS.talentSuccess,wonElection:GS.wonElection,
    tuanxiaoApplied:GS.tuanxiaoApplied,tuanxiaoAccepted:GS.tuanxiaoAccepted,
    dachuangJoined:GS.dachuangJoined,hanpengHaoGan:GS.hanpengHaoGan,
    cet4Applied:GS.cet4Applied,deskBought:GS.deskBought,
    clubApplied:GS.clubApplied,clubType:GS.clubType,
    keChuangUnlocked:GS.keChuangUnlocked,sheTuanUnlocked:GS.sheTuanUnlocked,tuanxiaoWeekBan:GS.tuanxiaoWeekBan,
    gfUnlocked:GS.gfUnlocked,gfName:GS.gfName,gfFavor:GS.gfFavor,
    inventory:GS.inventory,phase:GS.phase,currentNode:GS.currentNode,
    currentDay:GS.currentDay,currentPhaseIdx:GS.currentPhaseIdx,
    pengyuanBalance:GS.pengyuanBalance,tuanxiaoWisdomPending:GS.tuanxiaoWisdomPending,
    teacherFavor:GS.teacherFavor,classmateFavor:GS.classmateFavor,
    lastMealDay:GS.lastMealDay,
    breakupProb:GS.breakupProb,courseGrades:GS.courseGrades,
    taniaFavor:GS.taniaFavor,shijianmingFavor:GS.shijianmingFavor,zhouruiFavor:GS.zhouruiFavor,
    hanpengUnlocked:GS.hanpengUnlocked,taniaUnlocked:GS.taniaUnlocked,
    shijianmingUnlocked:GS.shijianmingUnlocked,zhouruiUnlocked:GS.zhouruiUnlocked,
    weekendEventReduction:GS.weekendEventReduction,
    holidayRoute:GS.holidayRoute,
    hanjieFavor:GS.hanjieFavor,cherryFavor:GS.cherryFavor,liguoruiFavor:GS.liguoruiFavor,
    hanjieUnlocked:GS.hanjieUnlocked,cherryUnlocked:GS.cherryUnlocked,liguoruiUnlocked:GS.liguoruiUnlocked,
    songjunliFavor:GS.songjunliFavor,songjunliUnlocked:GS.songjunliUnlocked,
    lixinyaoFavor:GS.lixinyaoFavor,lixinyaoUnlocked:GS.lixinyaoUnlocked,
    acmRegistered:GS.acmRegistered,lastBonusDay:GS.lastBonusDay,weather:GS.weather,
    putonghuaRegistered:GS.putonghuaRegistered,zhuchirenRegistered:GS.zhuchirenRegistered,
    stocksUnlocked:GS.stocksUnlocked,holdings:GS.holdings,stockPrices:GS.stockPrices,
    lastStockDay:GS.lastStockDay,stockPrevPrices:GS.stockPrevPrices,stockHistory:GS.stockHistory,stockTrades:GS.stockTrades,zaocaoExempt:GS.zaocaoExempt,
    girlfriends:GS.girlfriends,
    storyLog:GS.storyLog,
    _dramaTeam:GS._dramaTeam,_dramaName:GS._dramaName,
    campusRunKm:GS.campusRunKm,
    phone:GS.phone,
    _weeklyActivityCount:GS._weeklyActivityCount,
    _phoneInitialized:GS._phoneInitialized
  };
  try{localStorage.setItem('dongqin_save4',JSON.stringify(data));}catch(e){}
}

function loadGame(){
  try{
    var raw=localStorage.getItem('dongqin_save4');
    if(!raw){showToast('没有找到存档');return;}
    var d=JSON.parse(raw);GS=defaultState();Object.assign(GS,d);
    GS.phase=d.phase||'daily';
    $('attr-panel').style.display='block';$('bottom-bar').style.display='flex';
    updatePanel();renderBottomBar();
    if(GS.phase==='story'&&GS.currentNode&&STORY_NODES[GS.currentNode]){renderStoryNode(STORY_NODES[GS.currentNode]);}
    else{processDay();}
    showToast('存档读取成功');
  }catch(e){showToast('存档读取失败:'+e.message);}
}

function resetToTitle(){GS=defaultState();renderTitle();}

function exportSave(){
  if(!GS||GS.phase==='title'||GS.phase==='allocation'){showToast('无存档可导出');return;}
  var data={v:4,year:GS.year,month:GS.month,day:GS.day,health:GS.health,happiness:GS.happiness,wisdom:GS.wisdom,charm:GS.charm,glory:GS.glory,money:GS.money,singing:GS.singing,performance:GS.performance,hasPengyuanCard:GS.hasPengyuanCard,hasPhoneCard:GS.hasPhoneCard,talentPerformed:GS.talentPerformed,talentSuccess:GS.talentSuccess,wonElection:GS.wonElection,tuanxiaoApplied:GS.tuanxiaoApplied,tuanxiaoAccepted:GS.tuanxiaoAccepted,dachuangJoined:GS.dachuangJoined,hanpengHaoGan:GS.hanpengHaoGan,cet4Applied:GS.cet4Applied,deskBought:GS.deskBought,clubApplied:GS.clubApplied,clubType:GS.clubType,keChuangUnlocked:GS.keChuangUnlocked,sheTuanUnlocked:GS.sheTuanUnlocked,tuanxiaoWeekBan:GS.tuanxiaoWeekBan,gfUnlocked:GS.gfUnlocked,gfName:GS.gfName,gfFavor:GS.gfFavor,inventory:GS.inventory,phase:GS.phase,currentNode:GS.currentNode,currentDay:GS.currentDay,currentPhaseIdx:GS.currentPhaseIdx,pengyuanBalance:GS.pengyuanBalance,tuanxiaoWisdomPending:GS.tuanxiaoWisdomPending,teacherFavor:GS.teacherFavor,classmateFavor:GS.classmateFavor,lastMealDay:GS.lastMealDay,breakupProb:GS.breakupProb,courseGrades:GS.courseGrades,taniaFavor:GS.taniaFavor,shijianmingFavor:GS.shijianmingFavor,zhouruiFavor:GS.zhouruiFavor,hanpengUnlocked:GS.hanpengUnlocked,taniaUnlocked:GS.taniaUnlocked,shijianmingUnlocked:GS.shijianmingUnlocked,zhouruiUnlocked:GS.zhouruiUnlocked,weekendEventReduction:GS.weekendEventReduction,holidayRoute:GS.holidayRoute,hanjieFavor:GS.hanjieFavor,cherryFavor:GS.cherryFavor,liguoruiFavor:GS.liguoruiFavor,hanjieUnlocked:GS.hanjieUnlocked,cherryUnlocked:GS.cherryUnlocked,liguoruiUnlocked:GS.liguoruiUnlocked,songjunliFavor:GS.songjunliFavor,songjunliUnlocked:GS.songjunliUnlocked,lixinyaoFavor:GS.lixinyaoFavor,lixinyaoUnlocked:GS.lixinyaoUnlocked,acmRegistered:GS.acmRegistered,lastBonusDay:GS.lastBonusDay,weather:GS.weather,putonghuaRegistered:GS.putonghuaRegistered,zhuchirenRegistered:GS.zhuchirenRegistered,stocksUnlocked:GS.stocksUnlocked,holdings:GS.holdings,stockPrices:GS.stockPrices,lastStockDay:GS.lastStockDay,stockPrevPrices:GS.stockPrevPrices,stockHistory:GS.stockHistory,stockTrades:GS.stockTrades,zaocaoExempt:GS.zaocaoExempt,tuanxiaoWisdomPending:GS.tuanxiaoWisdomPending,girlfriends:GS.girlfriends,storyLog:GS.storyLog,_dramaTeam:GS._dramaTeam,_dramaName:GS._dramaName,campusRunKm:GS.campusRunKm,phone:GS.phone,_weeklyActivityCount:GS._weeklyActivityCount,_phoneInitialized:GS._phoneInitialized};
  var str=JSON.stringify(data);
  var overlay=document.createElement('div');overlay.className='supermarket-overlay';
  overlay.innerHTML='<div class="save-export-box"><div class="se-title">📤 导出存档</div><textarea readonly id="se-textarea">'+str+'</textarea><div class="se-btns"><button class="se-btn-copy" id="se-copy">📋 一键复制</button><button class="se-btn-close" id="se-close">关闭</button></div></div>';
  document.body.appendChild(overlay);
  $('se-copy').onclick=function(){var ta=$('se-textarea');ta.select();document.execCommand('copy');showToast('存档已复制到剪贴板');};
  $('se-close').onclick=function(){overlay.remove();};
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
}

function importSave(){
  var overlay=document.createElement('div');overlay.className='supermarket-overlay';
  overlay.innerHTML='<div class="save-import-box"><div class="si-title">📥 导入存档</div><div style="font-size:.8em;color:#8b7d6b;text-align:center;margin-bottom:10px;">粘贴存档字符串到下方文本框，点击确认导入</div><textarea id="si-textarea" placeholder="在此粘贴存档字符串..."></textarea><div class="si-btns"><button class="si-btn-confirm" id="si-confirm">✅ 确认导入</button><button class="si-btn-close" id="si-close2">关闭</button></div></div>';
  document.body.appendChild(overlay);
  $('si-confirm').onclick=function(){
    var raw=$('si-textarea').value.trim();
    if(!raw){showToast('请粘贴存档字符串');return;}
    try{
      var d=JSON.parse(raw);
      if(typeof d.v!=='number'){showToast('无效的存档格式');return;}
      GS=defaultState();Object.assign(GS,d);
      GS.phase=d.phase||'daily';
      $('attr-panel').style.display='block';$('bottom-bar').style.display='flex';
      updatePanel();renderBottomBar();
      if(GS.phase==='story'&&GS.currentNode&&STORY_NODES[GS.currentNode]){renderStoryNode(STORY_NODES[GS.currentNode]);}
      else{processDay();}
      overlay.remove();
      showToast('存档导入成功！');
    }catch(e){showToast('存档解析失败：'+e.message);}
  };
  $('si-close2').onclick=function(){overlay.remove();};
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
}

function showToast(msg){
  var e=document.getElementById('toast');if(e)e.remove();
  var t=document.createElement('div');t.id='toast';t.textContent=msg;
  t.style.cssText='position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1a3a5c;color:#f0e6d3;padding:10px 24px;border-radius:20px;font-size:.9em;z-index:999;opacity:0;transition:opacity .3s ease;pointer-events:none;';
  document.body.appendChild(t);
  requestAnimationFrame(function(){t.style.opacity='1';});
  setTimeout(function(){t.style.opacity='0';setTimeout(function(){if(t.parentNode)t.remove();},300);},1800);
}

// ===== 初始化 =====
function init(){
  GS=defaultState();
  try{
    var raw=localStorage.getItem('dongqin_save4');
    if(raw){
      var d=JSON.parse(raw);
      if(d.phase&&d.phase!=='title'&&d.phase!=='allocation'){
        GS=defaultState();Object.assign(GS,d);
        GS.phase=d.phase||'daily';
        $('attr-panel').style.display='block';$('bottom-bar').style.display='flex';updatePanel();renderBottomBar();
        if(GS.phase==='story'&&GS.currentNode&&STORY_NODES[GS.currentNode]){renderStoryNode(STORY_NODES[GS.currentNode]);}
        else{processDay();}
        return;
      }
    }
  }catch(e){}
  renderTitle();
}
// §11 ==================== 手机系统 ====================
// --- 手机数据辅助函数 ---
function ph(){return GS.phone||(GS.phone=defaultState().phone);}
function phSave(){if(!GS.phone)GS.phone=defaultState().phone;}

// --- 手机话费/流量扣费 ---
function phDeductSMS(){phSave();ph().credit=Math.max(-50,ph().credit-0.1);}
function phDeductCall(mins){phSave();ph().credit=Math.max(-50,ph().credit-0.5*mins);}
function phDeductData(mb){phSave();ph().data=Math.max(0,ph().data-mb);}
function phCheckOverData(){var p=ph();if(p.data<=0&&p.credit>0){var gbOver=Math.ceil(Math.abs(p.data)/1024);var penalty=gbOver*10;p.credit=Math.max(0,p.credit-penalty);p.data=0;showToast('⚠️ 流量超限'+gbOver+'GB！自动扣费¥'+penalty);}}

// --- 手机状态栏渲染 ---
function renderPhoneStatusBar(){
  var p=ph();if(!p)return'';
  var batteryIcon='';var bat=p.battery||0;
  if(bat>=80)batteryIcon='🔋';else if(bat>=50)batteryIcon='🔋';else if(bat>=20)batteryIcon='🪫';else batteryIcon='🪫';
  var creditCls=p.credit<=0?' style="color:#e74c3c;"':'';
  var dataCls=p.data<=0?' style="color:#e74c3c;"':'';
  var signalBars='📶';
  return '<div class="ph-status-bar"><span>'+signalBars+' 中国移动</span><span>'+batteryIcon+' '+(bat||0)+'%</span><span'+creditCls+'>¥'+(p.credit||0).toFixed(0)+'</span><span'+dataCls+'>'+(p.data||0).toFixed(0)+'MB</span></div>';
}

// --- 手机桌面图标 ---
var PHONE_APPS={
  contacts:{icon:'📞',name:'通讯录',color:'#4CAF50'},
  sms:{icon:'💬',name:'短信',color:'#2196F3'},
  wechat:{icon:'💚',name:'微信',color:'#2ecc71'},
  jiaowu:{icon:'📚',name:'教务',color:'#e74c3c'},
  campuslife:{icon:'🏃',name:'校园生活',color:'#ff9800'},
  finance:{icon:'💰',name:'理财',color:'#f39c12'},
  shopping:{icon:'🛒',name:'购物',color:'#e91e63'},
  calendar:{icon:'📅',name:'日历',color:'#9c27b0'},
  food:{icon:'🍔',name:'外卖',color:'#ff5722'},
  gallery:{icon:'📷',name:'相册',color:'#795548'},
  navigation:{icon:'🗺️',name:'出行导航',color:'#607d8b'}
};

function renderPhoneHomeScreen(){
  var p=ph();if(!p)return'<div class="ph-screen-pad"></div>';
  var order=p.appsOrder||defaultState().phone.appsOrder;
  var html='<div class="ph-home-screen">';
  html+='<div class="ph-time-big">'+fmtDate(GS.year,GS.month,GS.day)+' 星期'+weekday(GS.year,GS.month,GS.day)+'</div>';
  // Wallpaper handling
  var wp=p.wallpaper||'default';
  html+='<div class="ph-app-grid" style="'+(wp==='couple'?'background:linear-gradient(135deg,rgba(255,182,193,.3),rgba(255,255,255,.2));':(wp==='stage'?'background:linear-gradient(135deg,rgba(255,215,0,.2),rgba(255,255,255,.2));':(wp==='drama'?'background:linear-gradient(135deg,rgba(192,57,43,.15),rgba(255,255,255,.2));':'')))+'">';
  for(var i=0;i<order.length;i++){
    var appId=order[i];var app=PHONE_APPS[appId];if(!app)continue;
    // Badge for SMS
    var badge='';
    if(appId==='sms'){
      var unread=0;var msgs=p.messages||[];
      for(var mi=0;mi<msgs.length;mi++){if(!msgs[mi].read&&msgs[mi].to==='player')unread++;}
      if(unread>0)badge='<span class="ph-badge">'+(unread>9?'9+':unread)+'</span>';
    }
    html+='<div class="ph-app-icon" onclick="navigatePhoneApp(\''+appId+'\')" style="background:'+app.color+';">'+app.icon+'</div><div class="ph-app-label">'+badge+app.name+'</div>';
  }
  html+='</div>';
  // Bottom dock
  html+='<div class="ph-dock"><div class="ph-dock-item" onclick="navigatePhoneApp(\'contacts\')"><span>📞</span></div><div class="ph-dock-item" onclick="navigatePhoneApp(\'sms\')"><span>💬</span></div><div class="ph-dock-item" onclick="navigatePhoneApp(\'wechat\')"><span>💚</span></div><div class="ph-dock-item" onclick="navigatePhoneApp(\'jiaowu\')"><span>📚</span></div></div>';
  html+='</div>';
  return html;
}

// --- 锁屏 ---
function renderPhoneLockScreen(){
  var p=ph();if(!p)return'';
  var d=new Date();
  return '<div class="ph-lock-screen" onclick="unlockPhone()">'+
    '<div class="ph-lock-time">'+String(GS.year).slice(2)+'/'+String(GS.month).padStart(2,'0')+'/'+String(GS.day).padStart(2,'0')+'</div>'+
    '<div class="ph-lock-date">星期'+weekday(GS.year,GS.month,GS.day)+'</div>'+
    '<div class="ph-lock-weather">'+(GS.weather?GS.weather.icon+' '+GS.weather.name:'☀️ 晴天')+'</div>'+
    '<div class="ph-lock-hint">⬆️ 上滑解锁</div>'+
    '<div class="ph-lock-charge">🔋 '+(p.battery||0)+'%</div>'+
  '</div>';
}

// --- 手机主框架 ---
var _phoneAppHistory=[];
function openPhone(){
  phSave();
  // Check if dead
  if(ph().battery<=0){showToast('📱 手机没电了！请充电后再使用。');return;}
  var overlay=document.createElement('div');overlay.className='phone-overlay';
  overlay.id='phone-overlay';
  overlay.innerHTML='<div class="phone-frame" id="phone-frame">'+
    renderPhoneStatusBar()+
    '<div class="phone-screen" id="phone-screen">'+renderPhoneLockScreen()+'</div>'+
    '<div class="phone-home-bar"><div class="ph-home-indicator"></div></div>'+
  '</div>';
  document.body.appendChild(overlay);
  overlay.onclick=function(e){if(e.target===overlay)closePhone();};
  _phoneAppHistory=[];
}
function closePhone(){
  var el=document.getElementById('phone-overlay');if(el)el.remove();
  _phoneAppHistory=[];
}
function unlockPhone(){
  document.getElementById('phone-screen').innerHTML=renderPhoneHomeScreen();
  updatePhoneStatusBar();
  _phoneAppHistory=['home'];
}
function updatePhoneStatusBar(){
  var f=document.getElementById('phone-frame');if(!f)return;
  var sb=f.querySelector('.ph-status-bar');if(sb)sb.outerHTML=renderPhoneStatusBar();
}
function phoneGoBack(){
  if(_phoneAppHistory.length<=1){closePhone();return;}
  _phoneAppHistory.pop();
  var prev=_phoneAppHistory[_phoneAppHistory.length-1];
  if(prev==='home'){document.getElementById('phone-screen').innerHTML=renderPhoneHomeScreen();}
  else{navigatePhoneApp(prev,true);}
}
function navigatePhoneApp(appId,noHistory){
  phSave();phDeductData(1);phCheckOverData();
  if(!noHistory&&_phoneAppHistory[_phoneAppHistory.length-1]!==appId)_phoneAppHistory.push(appId);
  var html='';
  switch(appId){
    case 'contacts':html=renderContactsApp();break;
    case 'sms':html=renderSMSApp();break;
    case 'wechat':html=renderWechatApp();break;
    case 'jiaowu':html=renderJiaowuApp();break;
    case 'campuslife':html=renderCampusLifeApp();break;
    case 'finance':html=renderFinanceApp();break;
    case 'shopping':html=renderShoppingApp();break;
    case 'calendar':html=renderCalendarApp();break;
    case 'food':html=renderFoodApp();break;
    case 'gallery':html=renderGalleryApp();break;
    case 'navigation':html=renderNavigationApp();break;
    default:html=renderPhoneHomeScreen();break;
  }
  document.getElementById('phone-screen').innerHTML=html;
  updatePhoneStatusBar();
}

// ==================== 1. 通讯录 APP ====================
function getPhoneContacts(){
  var list=[];var p=ph();if(!p)return list;
  // Roommates always included
  var roommates=[
    {id:'huye',name:'虎爷',phone:'13800000001',source:'室友',cls:'roommate'},
    {id:'naikou',name:'奶扣',phone:'13800000002',source:'室友',cls:'roommate'},
    {id:'jingye',name:'京爷',phone:'13800000003',source:'室友',cls:'roommate'}
  ];
  for(var ri=0;ri<roommates.length;ri++){list.push(roommates[ri]);}
  // Girlfriends
  if(GS.girlfriends){for(var gi=0;gi<GS.girlfriends.length;gi++){var g=GS.girlfriends[gi];list.push({id:g.id,name:g.name,phone:'1390000000'+(gi+1),source:'女友',cls:'gf'});}}
  // Unlocked classmates (favor >= 20)
  for(var ck in GS.classmateFavor){if(GS.classmateFavor.hasOwnProperty(ck)&&GS.classmateFavor[ck]>=20&&CLASSMATES[ck]){
    var already=false;for(var ai=0;ai<list.length;ai++){if(list[ai].id===ck){already=true;break;}}
    if(!already)list.push({id:ck,name:CLASSMATES[ck].name,phone:'未显示',source:'同学',cls:'classmate'});
  }}
  // Unlocked teachers
  var teachers=[
    {id:'hanpeng',name:'韩鹏',unlock:'hanpengUnlocked'},
    {id:'tania',name:'Tania',unlock:'taniaUnlocked'},
    {id:'shijianming',name:'史鉴明',unlock:'shijianmingUnlocked'},
    {id:'zhourui',name:'周蕊',unlock:'zhouruiUnlocked'},
    {id:'hanjie',name:'韩杰',unlock:'hanjieUnlocked'},
    {id:'cherry',name:'Cherry',unlock:'cherryUnlocked'},
    {id:'liguorui',name:'李国瑞',unlock:'liguoruiUnlocked'},
    {id:'songjunli',name:'宋俊丽',unlock:'songjunliUnlocked'},
    {id:'lixinyao',name:'李心瑶',unlock:'lixinyaoUnlocked'}
  ];
  for(var ti=0;ti<teachers.length;ti++){if(GS[teachers[ti].unlock])list.push({id:teachers[ti].id,name:teachers[ti].name+' 老师',phone:'教师专线',source:'教师',cls:'teacher'});}
  // Apply saved contacts (notes & custom data)
  var savedContacts=p.contacts||{};
  for(var si=0;si<list.length;si++){
    if(savedContacts[list[si].id]){
      if(savedContacts[list[si].id].note)list[si].note=savedContacts[list[si].id].note;
      if(savedContacts[list[si].id].phone)list[si].phone=savedContacts[list[si].id].phone;
    }
  }
  return list;
}

function renderContactsApp(){
  var contacts=getPhoneContacts();var p=ph();
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="phoneGoBack()">← 返回</button><span class="ph-nav-title">📞 通讯录</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content"><div class="ph-search-bar"><input type="text" placeholder="🔍 搜索联系人..." oninput="filterContacts(this.value)" id="ph-contact-search"></div><div id="ph-contact-list">';
  // Group by source
  var groups={};for(var i=0;i<contacts.length;i++){var c=contacts[i];var src=c.source||'其他';if(!groups[src])groups[src]=[];groups[src].push(c);}
  var groupOrder=['室友','女友','教师','同学'];
  for(var go=0;go<groupOrder.length;go++){var gk=groupOrder[go];if(!groups[gk]||groups[gk].length===0)continue;
    html+='<div class="ph-section-title">'+gk+' ('+groups[gk].length+'人)</div>';
    for(var gi=0;gi<groups[gk].length;gi++){
      var ct=groups[gk][gi];
      var grayed=(ct.cls==='classmate'&&(GS.classmateFavor[ct.id]||0)<20)||(ct.cls==='teacher'&&!GS[ct.unlock||'']);
      html+='<div class="ph-contact-item'+(grayed?' ph-grayed':'')+'" onclick="'+(grayed?'showToast(\'你们还不够熟，无法查看联系方式\')':'openPhoneContactDetail(\''+ct.id+'\')')+'"><span class="ph-contact-avatar">'+(ct.cls==='gf'?'💕':(ct.cls==='roommate'?'🏠':(ct.cls==='teacher'?'👨‍🏫':'👤')))+'</span><div><div class="ph-contact-name">'+ct.name+(ct.note?' <span style="font-size:.7em;color:#999;">('+ct.note+')</span>':'')+'</div><div class="ph-contact-phone">'+(grayed?'•••••••••••':(ct.phone||'未知'))+'</div></div></div>';
    }
  }
  html+='</div></div></div>';
  return html;
}
function filterContacts(query){
  var list=document.getElementById('ph-contact-list');if(!list)return;
  var items=list.querySelectorAll('.ph-contact-item');
  var q=(query||'').toLowerCase();
  for(var i=0;i<items.length;i++){
    var text=items[i].textContent.toLowerCase();
    items[i].style.display=text.indexOf(q)>=0?'flex':'none';
  }
}
function openPhoneContactDetail(cmId){
  var ct=null;var contacts=getPhoneContacts();
  for(var i=0;i<contacts.length;i++){if(contacts[i].id===cmId){ct=contacts[i];break;}}
  if(!ct)return;
  var fav=GS.classmateFavor[cmId]||0;var isGf=isGf(cmId);var p=ph();
  var overlay=document.createElement('div');overlay.className='popup-overlay';
  overlay.style.zIndex='10002';
  var noteStr=p.contacts[cmId]&&p.contacts[cmId].note?p.contacts[cmId].note:'';
  overlay.innerHTML='<div class="popup-box" style="max-width:360px;"><div class="popup-title">'+ct.name+'</div>'+
    '<div style="text-align:center;font-size:.85em;color:#8b7d6b;margin-bottom:4px;">📱 '+(ct.phone||'未知')+'</div>'+
    '<div style="text-align:center;font-size:.85em;color:#8b7d6b;margin-bottom:12px;">好感度：'+fav+'</div>'+
    '<div style="margin-bottom:8px;"><input type="text" id="ph-note-input" placeholder="添加备注（如：虎爷-室友卷王）" value="'+noteStr+'" style="width:100%;padding:8px;border:1px solid #d5cfc6;border-radius:6px;font-size:.85em;font-family:inherit;"></div>'+
    '<button class="popup-btn" id="ph-save-note" style="margin-bottom:4px;">💾 保存备注</button>'+
    '<button class="popup-btn" id="ph-call-contact" style="margin-bottom:4px;background:#e74c3c;">📞 拨打电话</button>'+
    '<button class="popup-btn" id="ph-sms-contact">💬 发送短信</button>'+
    '<button class="popup-btn" style="background:#8b7d6b;margin-top:6px;" id="ph-close-detail">关闭</button></div>';
  document.body.appendChild(overlay);
  document.getElementById('ph-save-note').onclick=function(){
    phSave();if(!p.contacts[cmId])p.contacts[cmId]={};p.contacts[cmId].note=document.getElementById('ph-note-input').value;
    overlay.remove();showToast('备注已保存');closePhone();openPhone();navigatePhoneApp('contacts');
  };
  document.getElementById('ph-call-contact').onclick=function(){overlay.remove();makePhoneCall(cmId);};
  document.getElementById('ph-sms-contact').onclick=function(){overlay.remove();openPhoneSMSConversation(cmId);};
  document.getElementById('ph-close-detail').onclick=function(){overlay.remove();};
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
}

// ==================== 2. 短信 APP ====================
function renderSMSApp(){
  var p=ph();var msgs=p.messages||[];
  // Group by conversation
  var threads={};
  for(var i=msgs.length-1;i>=0;i--){
    var m=msgs[i];var other=m.from==='player'?m.to:m.from;
    if(!threads[other])threads[other]={msgs:[],unread:0,lastTime:''};
    threads[other].msgs.push(m);
    if(!m.read&&m.from!=='player')threads[other].unread++;
    if(!threads[other].lastTime||m.time>threads[other].lastTime)threads[other].lastTime=m.time;
  }
  var threadKeys=Object.keys(threads);
  // Sort by last message time
  threadKeys.sort(function(a,b){return (threads[b].lastTime||'').localeCompare(threads[a].lastTime||'');});
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="phoneGoBack()">← 返回</button><span class="ph-nav-title">💬 短信</span><button class="ph-back-btn" onclick="openPhoneNewSMS()" style="font-size:1.2em;">➕</button></div>'+
    '<div class="ph-app-content">';
  if(threadKeys.length===0){
    html+='<div style="text-align:center;color:#8b7d6b;padding:40px;">暂无消息<br><span style="font-size:.8em;">通讯录中好感≥20的联系人会出现在这里</span></div>';
  }else{
    for(var ti=0;ti<threadKeys.length;ti++){
      var tk=threadKeys[ti];var th=threads[tk];
      var lastMsg=th.msgs[th.msgs.length-1];
      var preview=(lastMsg.text||'').substring(0,20)+(lastMsg.text&&lastMsg.text.length>20?'…':'');
      html+='<div class="ph-sms-thread'+(th.unread>0?' ph-unread':'')+'" onclick="openPhoneSMSConversation(\''+tk.replace(/'/g,"\\'")+'\')">'+
        '<span style="font-size:1.8em;">'+(tk==='老妈'?'👩':(tk.indexOf('群')>=0?'👥':'💬'))+'</span>'+
        '<div style="flex:1;min-width:0;"><div style="font-weight:600;">'+tk+(th.unread>0?' <span class="ph-badge">'+th.unread+'</span>':'')+'</div><div style="font-size:.75em;color:#8b7d6b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+preview+'</div></div>'+
        '<div style="font-size:.7em;color:#999;">'+(th.lastTime||'').substring(5)+'</div></div>';
    }
  }
  html+='</div></div>';
  return html;
}

function openPhoneNewSMS(){
  var contacts=getPhoneContacts();var filtered=[];
  for(var i=0;i<contacts.length;i++){if((GS.classmateFavor[contacts[i].id]||0)>=20)filtered.push(contacts[i]);}
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'sms\',true)">← 返回</button><span class="ph-nav-title">新短信</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">';
  for(var j=0;j<filtered.length;j++){
    var ct=filtered[j];
    html+='<div class="ph-sms-thread" onclick="openPhoneSMSConversation(\''+ct.id+'\')"><span style="font-size:1.5em;">👤</span><div><div style="font-weight:600;">'+ct.name+'</div><div style="font-size:.75em;color:#8b7d6b;">'+ct.source+'</div></div></div>';
  }
  html+='</div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}

function openPhoneSMSConversation(contactId,backTo){
  backTo=backTo||'sms';
  var p=ph();var msgs=p.messages||[];
  var contactName=contactId;var contactType='classmate';
  if(contactId==='老妈'){contactName='老妈';contactType='mom';}
  else if(contactId.indexOf('群')>=0){contactName=contactId;contactType='group';}
  else if(CLASSMATES[contactId]){contactName=CLASSMATES[contactId].name;contactType=CLASSMATES[contactId].gender==='female'?'female':'male';}
  // Check if teacher
  var teacherKeys=['hanpeng','tania','shijianming','zhourui','hanjie','cherry','liguorui','songjunli','lixinyao'];
  if(teacherKeys.indexOf(contactId)>=0){contactType='teacher';contactName=contactName.replace(' 老师','')+' 老师';}
  // Check if girlfriend
  var gfMatch=null;if(GS.girlfriends){for(var gi2=0;gi2<GS.girlfriends.length;gi2++){if(GS.girlfriends[gi2].id===contactId){gfMatch=GS.girlfriends[gi2];break;}}}
  if(gfMatch)contactType='gf';
  // Check if roommate
  if(contactId==='huye'||contactId==='naikou'||contactId==='jingye')contactType='roommate';
  // Mark as read
  for(var mi=0;mi<msgs.length;mi++){if(msgs[mi].to==='player'&&msgs[mi].from===contactId)msgs[mi].read=true;}
  var convMsgs=[];for(var ci=0;ci<msgs.length;ci++){if(msgs[ci].from===contactId||msgs[ci].to===contactId)convMsgs.push(msgs[ci]);}
  if(contactId==='老妈'){for(var ci2=0;ci2<msgs.length;ci2++){if(msgs[ci2].from==='老妈'||msgs[ci2].to==='老妈')convMsgs.push(msgs[ci2]);}}
  var seen={};var deduped=[];for(var di=convMsgs.length-1;di>=0;di--){var key=convMsgs[di].time+convMsgs[di].text;if(!seen[key]){seen[key]=true;deduped.unshift(convMsgs[di]);}}
  convMsgs=deduped;
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\''+backTo+'\',true)">← 返回</button><span class="ph-nav-title">'+contactName+'</span><button class="ph-back-btn" onclick="openPhoneCallFromSMS(\''+contactId.replace(/'/g,"\\'")+'\')">📞</button></div>'+
    '<div class="ph-chat-area" id="ph-chat-area">';
  for(var ci3=0;ci3<convMsgs.length;ci3++){
    var m=convMsgs[ci3];var isMe=m.from==='player';
    html+='<div class="ph-msg-bubble'+(isMe?' ph-msg-me':' ph-msg-them')+'"><div class="ph-msg-text">'+m.text+'</div><div class="ph-msg-time">'+m.time+'</div></div>';
  }
  html+='</div><div class="ph-chat-input">';
  // Quick replies by contact type
  var replies=[];
  if(contactType==='mom'){replies=[['💬 报平安','妈，我在这边一切都好，放心吧！'],['💰 求支援','妈，最近手头有点紧...'],['🏠 想家了','妈，有点想家了，家里还好吗？'],['📚 学习汇报','妈，最近学习还行，你放心吧']];}
  else if(contactType==='gf'){replies=[['💕 想你了','今天课好累，想你了'],['🍽️ 一起吃饭','待会一起去食堂吃饭吧？'],['🎬 周末约会','周末要不要一起出去逛逛？'],['📖 一起自习','晚上一起去图书馆自习吗？'],['💬 聊聊天','今天心情怎么样？'],['🌙 晚安','晚安，早点休息～']];}
  else if(contactType==='roommate'){replies=[['🎮 开黑吗','开黑吗？来一局'],['🍔 帮忙带饭','去食堂的话帮我带份饭呗'],['📝 借笔记','笔记借我看看，有个地方没跟上'],['🏃 一起去跑步','晚上要不要去操场跑几圈？'],['💤 该睡了','早点睡吧，明天还有课'],['🤝 帮个忙','有空吗？帮我个忙']];}
  else if(contactType==='teacher'){replies=[['📖 请教问题','老师，我有个知识点不太明白，能请教一下吗？'],['📝 咨询考试','老师，想问一下考试范围和重点'],['🔬 科创咨询','老师，我对科创项目很感兴趣，想了解一下'],['📋 请假申请','老师，我身体不太舒服，想请个假'],['🙏 感谢指导','谢谢老师的指导，收获很多！']];}
  else if(contactType==='female'){replies=[['📖 一起自习','一起自习吗？'],['🍽️ 食堂约饭','待会一起去食堂吗？'],['📝 借笔记','笔记能借我看看吗？'],['🎵 聊聊兴趣','你平时喜欢听什么音乐？'],['☕ 喝杯奶茶','请你喝杯奶茶吧']];}
  else{replies=[['📖 一起自习','一起自习吗？'],['🎮 打一把','来一把游戏？'],['🍽️ 食堂约饭','一起吃饭去？'],['📝 借笔记','作业写完了吗借我参考下'],['🏀 运动吗','打球去不去？']];}
  for(var ri=0;ri<replies.length;ri++){
    var r=replies[ri];var safeId=contactId.replace(/'/g,"\\'");var safeText=r[1].replace(/'/g,"\\'");
    html+='<button class="ph-quick-reply" onclick="phoneSendSMS(\''+safeId+'\',\''+safeText+'\')">'+r[0]+'</button>';
  }
  html+='</div></div>';
  document.getElementById('phone-screen').innerHTML=html;
  setTimeout(function(){var ca=document.getElementById('ph-chat-area');if(ca)ca.scrollTop=ca.scrollHeight;},100);
}

function phoneSendSMS(to,text){
  phSave();phDeductSMS();
  var now=fmtDate(GS.year,GS.month,GS.day)+' '+String(new Date().getHours()).padStart(2,'0')+':'+String(new Date().getMinutes()).padStart(2,'0');
  ph().messages.push({from:'player',to:to,text:text,time:now,read:true});
  // Effects
  phCheckOverData();
  // If replying to mom
  if(to==='老妈'){ph().momReplied=true;ph().momConsecutive=0;showToast('✅ 短信已发送（话费 -0.1元）');}
  else if(to.indexOf('群')>=0){showToast('✅ 群发已发送（话费 -0.1元）');}
  else{
    // Invitation logic
    var fav=GS.classmateFavor[to]||0;var hour=new Date().getHours();
    var baseRate=60;var favBonus=Math.floor(fav/10)*2;var nightPenalty=(hour>=23||hour<5)?15:0;
    var successRate=baseRate+favBonus-nightPenalty;
    var success=Math.random()*100<successRate;
    if(success){showToast('✅ 短信已发送！邀约成功率：'+successRate+'% — 对方接受了你的邀请！');}
    else{showToast('✅ 短信已发送。对方暂时没有回复…');}
    if(GS.girlfriends){for(var gi=0;gi<GS.girlfriends.length;gi++){if(GS.girlfriends[gi].id===to){syncGfFavor(to,1);updatePanel();break;}}}
  }
  updatePhoneStatusBar();
  openPhoneSMSConversation(to);
}

function openPhoneCallFromSMS(contactId){if(contactId.indexOf('群')>=0){showToast('群聊无法拨打电话');return;}
  makePhoneCall(contactId);
}

// ==================== 3. 电话 ====================
function makePhoneCall(contactId){
  var contactName=contactId;if(CLASSMATES[contactId])contactName=CLASSMATES[contactId].name;
  var overlay=document.createElement('div');overlay.className='popup-overlay';overlay.style.zIndex='10002';
  overlay.innerHTML='<div class="popup-box" style="max-width:360px;text-align:center;">'+
    '<div class="popup-title">📞 正在呼叫...</div>'+
    '<div style="font-size:1.5em;font-weight:700;margin:20px 0;">'+contactName+'</div>'+
    '<div style="color:#8b7d6b;margin-bottom:20px;">话费：¥'+ph().credit.toFixed(2)+'（0.5元/分钟）</div>'+
    '<input type="number" id="ph-call-mins" value="3" min="1" max="30" style="width:80px;padding:6px;border:1px solid #d5cfc6;border-radius:6px;font-size:1em;text-align:center;margin-bottom:10px;"> <span>分钟</span>'+
    '<div style="display:flex;gap:10px;justify-content:center;margin-top:10px;">'+
      '<button class="popup-btn" id="ph-call-start" style="background:#1e7e34;flex:1;">📞 拨打</button>'+
      '<button class="popup-btn" id="ph-call-cancel" style="background:#8b7d6b;flex:1;">取消</button>'+
    '</div></div>';
  document.body.appendChild(overlay);
  document.getElementById('ph-call-start').onclick=function(){
    var mins=parseInt(document.getElementById('ph-call-mins').value)||3;
    overlay.remove();
    var cost=mins*0.5;ph().credit=Math.max(-50,ph().credit-cost);
    ph().callLog.push({to:contactId,name:contactName,mins:mins,cost:cost,time:fmtDate(GS.year,GS.month,GS.day)});
    // Effects
    var hour=new Date().getHours();var isNight=hour>=23||hour<5;
    var isDormCheck=(hour>=21&&hour<23);
    var changes={};var resultText='';
    if(isNight&&GS.girlfriends){var isGfCall=false;for(var gi=0;gi<GS.girlfriends.length;gi++){if(GS.girlfriends[gi].id===contactId){isGfCall=true;break;}}
      if(isGfCall&&Math.random()<0.3){changes={};syncGfFavor(contactId,-3);resultText='深夜的电话把'+contactName+'吵醒了，她不太高兴。好感 -3。';}
      else{resultText='通话顺利结束。虽然时间有点晚，但对方还是接了。';}
    }
    if(isDormCheck&&Math.random()<0.1){changes.glory=(changes.glory||0)-5;resultText=(resultText||'通话结束。')+' 宿管巡查发现你在晚自习时间打电话，荣耀 -5。';}
    if(!resultText)resultText='通话顺利结束，你们聊了'+mins+'分钟。话费 -'+cost.toFixed(1)+'元。';
    // Higher success rate for calls
    var favBonus=0;if(GS.girlfriends){for(var gi2=0;gi2<GS.girlfriends.length;gi2++){if(GS.girlfriends[gi2].id===contactId){favBonus=2;syncGfFavor(contactId,2);break;}}}
    doEffects(changes);updatePanel();updatePhoneStatusBar();
    showPopup('📞 通话结束',resultText,changes,null,null);
  };
  document.getElementById('ph-call-cancel').onclick=function(){overlay.remove();};
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
}

// ==================== 4. 微信 APP ====================
function renderWechatApp(){
  var p=ph();
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="phoneGoBack()">← 返回</button><span class="ph-nav-title">💚 微信</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">'+
    '<div class="ph-wechat-menu">'+
      '<div class="ph-wechat-item" onclick="renderWechatMoments()">🟢 朋友圈</div>'+
      '<div class="ph-wechat-item" onclick="renderWechatRedPacket()">🧧 转账红包</div>'+
      '<div class="ph-wechat-item" onclick="renderWechatGroups()">👥 群聊</div>'+
    '</div></div></div>';
  return html;
}

// 朋友圈
function renderWechatMoments(){
  var p=ph();var moments=p.moments||[];
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'wechat\',true)">← 返回</button><span class="ph-nav-title">🟢 朋友圈</span><button class="ph-back-btn" onclick="phonePostMoment()">✏️</button></div>'+
    '<div class="ph-app-content">';
  if(moments.length===0){
    html+='<div style="text-align:center;color:#8b7d6b;padding:40px;">暂时没有动态<br><span style="font-size:.8em;">NPC会随机发布朋友圈</span></div>';
  }else{
    for(var i=moments.length-1;i>=0;i--){
      var mo=moments[i];
      html+='<div class="ph-moment-item">'+
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span style="font-size:1.5em;">👤</span><span style="font-weight:600;">'+mo.author+'</span><span style="font-size:.7em;color:#999;">'+mo.time+'</span></div>'+
        '<div style="margin-bottom:6px;">'+mo.content+'</div>'+
        '<div style="display:flex;gap:12px;font-size:.8em;">'+
          '<span onclick="phoneLikeMoment('+i+')" style="cursor:pointer;color:'+(mo.liked?'#e74c3c':'#8b7d6b')+';">❤️ '+(mo.likes||0)+'</span>'+
          '<span onclick="phoneCommentMoment('+i+')" style="cursor:pointer;color:#8b7d6b;">💬 评论</span>'+
        '</div>';
      if(mo.comments&&mo.comments.length>0){
        for(var ci=0;ci<mo.comments.length;ci++){
          html+='<div style="font-size:.75em;background:#f5f5f5;padding:4px 8px;border-radius:4px;margin-top:4px;">'+mo.comments[ci]+'</div>';
        }
      }
      html+='</div>';
    }
  }
  html+='</div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}

function phoneLikeMoment(idx){
  phSave();var p=ph();if(!p.moments[idx])return;
  if(p.moments[idx].liked)return;
  p.moments[idx].likes=(p.moments[idx].likes||0)+1;
  p.moments[idx].liked=true;
  // GF liking bonus
  var author=p.moments[idx].author;
  if(GS.girlfriends){for(var gi=0;gi<GS.girlfriends.length;gi++){if(GS.girlfriends[gi].name===author){syncGfFavor(GS.girlfriends[gi].id,1);break;}}}
  phDeductData(0.05);renderWechatMoments();updatePanel();
}

function phoneCommentMoment(idx){
  phSave();var p=ph();if(!p.moments[idx])return;
  var options=['加油！','看起来好好吃','我陪你聊聊','太棒了！','羡慕~','哈哈哈哈'];
  var btnsHtml='';for(var i=0;i<options.length;i++){btnsHtml+='<button class="popup-btn com-opt-btn" data-c="'+options[i]+'" style="margin-bottom:4px;">'+options[i]+'</button>';}
  var overlay=document.createElement('div');overlay.className='popup-overlay';overlay.style.zIndex='10002';
  overlay.innerHTML='<div class="popup-box" style="max-width:360px;"><div class="popup-title">💬 评论</div>'+btnsHtml+'</div>';
  document.body.appendChild(overlay);
  overlay.querySelectorAll('.com-opt-btn').forEach(function(b){
    b.onclick=function(){
      var cmt=b.getAttribute('data-c');
      if(!p.moments[idx].comments)p.moments[idx].comments=[];
      p.moments[idx].comments.push('你：'+cmt);
      overlay.remove();
      // GF comment bonus
      var author=p.moments[idx].author;
      if(GS.girlfriends){for(var gi2=0;gi2<GS.girlfriends.length;gi2++){if(GS.girlfriends[gi2].name===author){syncGfFavor(GS.girlfriends[gi2].id,2);break;}}}
      phDeductData(0.05);renderWechatMoments();updatePanel();
    };
  });
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
}

function phonePostMoment(){
  var overlay=document.createElement('div');overlay.className='popup-overlay';overlay.style.zIndex='10002';
  overlay.innerHTML='<div class="popup-box" style="max-width:360px;"><div class="popup-title">✏️ 发朋友圈</div>'+
    '<textarea id="ph-post-text" placeholder="说点什么吧..." style="width:100%;height:80px;padding:8px;border:1px solid #d5cfc6;border-radius:6px;font-size:.9em;font-family:inherit;resize:none;margin-bottom:10px;"></textarea>'+
    '<button class="popup-btn" id="ph-post-send">📤 发布（消耗流量0.1MB）</button></div>';
  document.body.appendChild(overlay);
  document.getElementById('ph-post-send').onclick=function(){
    var text=document.getElementById('ph-post-text').value.trim();
    if(!text){showToast('请输入内容');return;}
    phSave();phDeductData(0.1);
    var now=fmtDate(GS.year,GS.month,GS.day);
    ph().moments.push({author:'我',content:text,time:now,likes:0,liked:false,comments:[]});
    overlay.remove();
    doEffects({happiness:3});updatePanel();
    showToast('✅ 朋友圈已发布，心情 +3');renderWechatMoments();
  };
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
}

// 红包
function renderWechatRedPacket(){
  var contacts=getPhoneContacts();var filtered=[];
  for(var i=0;i<contacts.length;i++){if((GS.classmateFavor[contacts[i].id]||0)>=20)filtered.push(contacts[i]);}
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'wechat\',true)">← 返回</button><span class="ph-nav-title">🧧 转账红包</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content"><div style="text-align:center;color:#6b5f50;margin-bottom:12px;">💰 当前余额：¥'+GS.money+'</div>';
  for(var j=0;j<filtered.length;j++){
    var ct=filtered[j];if(ct.cls==='teacher'||ct.cls==='mom')continue;
    html+='<div class="ph-sms-thread" onclick="phoneSendRedPacket(\''+ct.id+'\')"><span style="font-size:1.5em;">🧧</span><div><div style="font-weight:600;">'+ct.name+'</div><div style="font-size:.75em;color:#8b7d6b;">好感度：'+(GS.classmateFavor[ct.id]||0)+'</div></div></div>';
  }
  html+='</div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}

function phoneSendRedPacket(to){
  var ctName=CLASSMATES[to]?CLASSMATES[to].name:to;
  var overlay=document.createElement('div');overlay.className='popup-overlay';overlay.style.zIndex='10002';
  overlay.innerHTML='<div class="popup-box" style="max-width:360px;"><div class="popup-title">🧧 发送红包给 '+ctName+'</div>'+
    '<div style="text-align:center;color:#6b5f50;margin-bottom:12px;">💰 余额：¥'+GS.money+' · 好感加成=金额/10（上限+20）</div>'+
    '<input type="number" id="ph-rp-amount" value="10" min="1" max="200" style="width:100%;padding:10px;border:1px solid #d5cfc6;border-radius:6px;font-size:1.2em;text-align:center;margin-bottom:10px;">'+
    '<button class="popup-btn" id="ph-rp-send" style="background:#e74c3c;">🧧 发送红包</button></div>';
  document.body.appendChild(overlay);
  document.getElementById('ph-rp-send').onclick=function(){
    var amt=parseInt(document.getElementById('ph-rp-amount').value)||10;
    if(amt>GS.money){showToast('金钱不足！');return;}
    if(amt>200){showToast('单次红包上限200元');return;}
    GS.money-=amt;
    var favGain=Math.min(20,Math.floor(amt/10));
    GS.classmateFavor[to]=Math.max(0,(GS.classmateFavor[to]||0)+favGain);
    if(isGf(to))syncGfFromClassmate(to);
    overlay.remove();updatePanel();
    // Special holiday bonus
    var isSpecial=(GS.month===2&&GS.day===14)||(GS.month===8&&GS.day===25)||(amt===52||amt===131||amt===520||amt===1314);
    if(isSpecial){GS.classmateFavor[to]=Math.max(0,(GS.classmateFavor[to]||0)+10);if(isGf(to))syncGfFromClassmate(to);}
    showPopup('🧧 红包已发送','你给'+ctName+'发送了¥'+amt+'红包。好感 +'+favGain+(isSpecial?'（节日加成额外+10）':''),{[to+'Fav']:favGain+(isSpecial?10:0)},null,function(){updatePanel();});
  };
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
}

// 群聊
function renderWechatGroups(){
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'wechat\',true)">← 返回</button><span class="ph-nav-title">👥 群聊</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">'+
    '<div class="ph-sms-thread" onclick="openPhoneSMSConversation(\'班级群\')"><span style="font-size:1.5em;">📚</span><div><div style="font-weight:600;">班级群</div><div style="font-size:.75em;color:#8b7d6b;">2024级新生群 · 通知、活动</div></div></div>';
  if(GS.tuanxiaoAccepted||GS.sheTuanUnlocked){
    html+='<div class="ph-sms-thread" onclick="openPhoneSMSConversation(\'社团群\')"><span style="font-size:1.5em;">🎭</span><div><div style="font-weight:600;">社团群</div><div style="font-size:.75em;color:#8b7d6b;">团建活动、通知</div></div></div>';
  }
  if(GS._dramaTeam&&GS._dramaTeam.length>0){
    html+='<div class="ph-sms-thread" onclick="openPhoneSMSConversation(\'Drama小队群\')"><span style="font-size:1.5em;">🎬</span><div><div style="font-weight:600;">Drama小队群</div><div style="font-size:.75em;color:#8b7d6b;">排练讨论</div></div></div>';
  }
  html+='</div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}

// ==================== 5. 教务 APP ====================
function renderJiaowuApp(){
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="phoneGoBack()">← 返回</button><span class="ph-nav-title">📚 教务系统</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">'+
    '<div class="ph-menu-grid">'+
      '<div class="ph-menu-item" onclick="renderJiaowuGrades()">📊<br>成绩查询</div>'+
      '<div class="ph-menu-item" onclick="renderJiaowuSchedule()">📅<br>课程表</div>'+
      '<div class="ph-menu-item" onclick="renderJiaowuExams()">📝<br>考试报名</div>'+
      '<div class="ph-menu-item" onclick="renderJiaowuZongce()">🏆<br>综测明细</div>'+
      '<div class="ph-menu-item" onclick="renderJiaowuRetake()">🔄<br>补考/网课</div>'+
    '</div></div></div>';
  return html;
}

function renderJiaowuGrades(){
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'jiaowu\',true)">← 返回</button><span class="ph-nav-title">📊 成绩查询</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">';
  var courses=['academicLang','cppProg','advancedMath','pe','moralLaw','dataAnalysis','mentalHealth','careerPlan','xingshiZhengce','laborEducation'];
  for(var i=0;i<courses.length;i++){
    var key=courses[i];var name=COURSE_NAMES[key]||key;
    if(key==='xingshiZhengce'||key==='laborEducation'){
      var xzVal=GS.courseGrades[key]||0;var xzText=xzVal>=2?'合格':(xzVal>=1?'合格(-)':'不合格');
      html+='<div class="ph-info-row"><span>'+name+'</span><span style="color:'+(xzVal>=2?'#1e7e34':'#c0392b')+';">'+xzText+'</span></div>';
    }else if(key==='pe'){
      var peScore=(GS.courseGrades[key]||80)+Math.floor((GS.health-100)/10);
      html+='<div class="ph-info-row"><span>'+name+'</span><span>'+peScore+' 分</span></div>';
    }else{
      var score=GS.courseGrades[key]||80;
      html+='<div class="ph-info-row"><span>'+name+'</span><span style="color:'+(score>=90?'#1e7e34':(score>=60?'#1a3a5c':'#c0392b'))+';">'+score+' 分</span></div>';
    }
  }
  html+='</div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}

function renderJiaowuSchedule(){
  var weekNum=GS.month>=9?Math.max(4,Math.floor((GS.month-9)*4.3+GS.day/7)):1;
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'jiaowu\',true)">← 返回</button><span class="ph-nav-title">📅 课程表</span><span style="font-size:.7em;">第'+weekNum+'周</span></div>'+
    '<div class="ph-app-content" style="padding:4px;">'+
    '<div style="text-align:center;font-size:.7em;color:#8b7d6b;margin:4px 0;">'+fmtDate(GS.year,GS.month,GS.day)+' 星期'+weekday(GS.year,GS.month,GS.day)+'</div>';
  // Compact weekly grid
  var days=['一','二','三','四','五','六','日'];
  var slots=['1-2节','3-4节','5-6节','7-8节','9-10节','11-12节'];
  // Course schedule data: [课程名, 教室, 周次, 颜色]
  var schedule={
    '一':{'1-2节':['C++程序设计基础','工学馆111','4-17','#3498db'],
         '3-4节':['思想道德与法治','工学馆xxx','4-11,13','#e74c3c'],
         '5-6节':['学术语言与沟通(中级)','','4-17','#2ecc71'],
         '7-8节':['劳动教育/职业规划','','5-8/17','#f39c12']},
    '二':{'1-2节':['形势与政策+C++','工304','4-7','#9b59b6'],
         '3-4节':['高等数学建模(一)','新校区6062','4-6,9-17','#e67e22'],
         '5-6节':['学术语言与沟通(中级)','','4-17','#2ecc71'],
         '7-8节':['智能数据分析导论','录播','8','#1abc9c']},
    '三':{'1-2节':['数据分析导论/心理健康','','4-7/10-17','#1abc9c'],
         '3-4节':['职业生涯与发展规划','','9-15','#f39c12'],
         '5-6节':['🏃 体育课','操场','全周','#e74c3c'],
         '7-8节':['学术语言与沟通(中级)','','4-17','#2ecc71'],
         '9-10节':['C++程序设计基础','','4-17','#3498db']},
    '四':{'1-2节':['思想道德与法治','工230','4-8,11-13','#e74c3c'],
         '3-4节':['学术语言与沟通(中级)','','4-17','#2ecc71'],
         '5-6节':['高等数学建模(一)','','4-8,9-16','#e67e22'],
         '7-8节':['—— 无课 ——','','','#ccc']},
    '五':{'1-2节':['学术语言与沟通(中级)','','4-17','#2ecc71'],
         '3-4节':['心理健康教育','','10-17','#e91e63'],
         '5-6节':['数据分析导论/学术语言','','','#1abc9c'],
         '7-8节':['高等数学建模(一)','','4-8,9-16','#e67e22']},
    '六':{'9-10节':['C++程序设计实验','综合楼1108','9-12,14','#3498db']},
    '日':{'7-8节':['学术语言与沟通(中级)','','6','#2ecc71'],
         '9-10节':['C++程序设计实验','综合楼1208','11','#3498db']}
  };
  html+='<div style="overflow-x:auto;"><table class="ph-schedule-table"><thead><tr><th style="width:30px;"></th>';
  for(var di=0;di<days.length;di++){
    var todayCls=(weekday(GS.year,GS.month,GS.day)===days[di])?' style="background:#1a3a5c;color:#fff;border-radius:4px;"':'';
    html+='<th'+todayCls+'>'+days[di]+'</th>';
  }
  html+='</tr></thead><tbody>';
  for(var si=0;si<slots.length;si++){
    var slot=slots[si];
    html+='<tr><td class="ph-slot-label">'+slot+'</td>';
    for(var dj=0;dj<days.length;dj++){
      var day=days[dj];var cell=schedule[day]&&schedule[day][slot];
      if(cell){
        html+='<td class="ph-sched-cell" style="background:'+cell[3]+'15;border-left:3px solid '+cell[3]+';"><div class="ph-sched-name">'+cell[0]+'</div>'+(cell[1]?'<div class="ph-sched-room">'+cell[1]+'</div>':'')+'<div class="ph-sched-week">'+cell[2]+'周</div></td>';
      }else{
        html+='<td class="ph-sched-empty"></td>';
      }
    }
    html+='</tr>';
  }
  html+='</tbody></table></div>';
  html+='<div style="font-size:.6em;color:#999;text-align:center;padding:4px;">📌 第4周起开课 | 18周考试周 | 部分教室按周次调整</div>';
  html+='</div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}

function renderJiaowuExams(){
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'jiaowu\',true)">← 返回</button><span class="ph-nav-title">📝 考试报名</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">'+
    '<div class="ph-info-row" onclick="phoneRegisterExam(\'cet4\')"><span>📝 英语四级 CET-4</span><span>'+(GS.cet4Applied?'✅ 已报名':'¥30 报名')+'</span></div>'+
    '<div class="ph-info-row"><span>📝 英语六级 CET-6</span><span>暂未开放</span></div>'+
    '<div class="ph-info-row" onclick="phoneRegisterExam(\'putonghua\')"><span>🗣️ 普通话水平测试</span><span>'+(GS.putonghuaRegistered?'✅ 已报名':'¥25 报名')+'</span></div>'+
    '<div class="ph-info-row"><span>💻 计算机二级</span><span>¥80 报名</span></div>'+
    '<div class="ph-info-row"><span>👨‍🏫 教师资格证</span><span>¥70 报名</span></div>'+
    '</div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}
function phoneRegisterExam(type){
  if(type==='cet4'&&!GS.cet4Applied){if(GS.money<30){showToast('金钱不足！需要30元');return;}GS.money-=30;GS.cet4Applied=true;updatePanel();showToast('✅ 英语四级报名成功！费用30元');}
  else if(type==='putonghua'&&!GS.putonghuaRegistered){if(GS.money<25){showToast('金钱不足！需要25元');return;}GS.money-=25;GS.putonghuaRegistered=true;updatePanel();showToast('✅ 普通话测试报名成功！费用25元');}
  else{showToast('已报名或暂不支持');}
  renderJiaowuExams();
}

function renderJiaowuZongce(){
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'jiaowu\',true)">← 返回</button><span class="ph-nav-title">🏆 综测明细</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">'+
    '<div class="ph-info-row"><span>🏆 荣耀值</span><span>'+GS.glory+'</span></div>'+
    '<div class="ph-info-row"><span>🏃 校园健康跑</span><span>'+(GS.campusRunKm||0)+'/60 km</span></div>'+
    '<div class="ph-info-row"><span>📋 科创参与</span><span>'+(GS.dachuangJoined?'✅':'❌')+'</span></div>'+
    '<div class="ph-info-row"><span>🎖️ 班委</span><span>'+(GS.wonElection?'✅':'❌')+'</span></div>'+
    '<div class="ph-info-row"><span>📖 团校</span><span>'+(GS.tuanxiaoAccepted?'进行中':'未参加')+'</span></div>'+
    '<div class="ph-info-row"><span>🎭 社团</span><span>'+(GS.clubType||'未参加')+'</span></div>'+
    '<div class="ph-info-row"><span>🏅 竞赛报名</span><span>'+(GS.acmRegistered?'ACM已报':'未报名')+'</span></div>'+
    '</div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}

function renderJiaowuRetake(){
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'jiaowu\',true)">← 返回</button><span class="ph-nav-title">🔄 补考/网课</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">'+
    '<div style="text-align:center;color:#999;margin:16px;">当前无挂科记录</div>'+
    '<div class="ph-info-row" onclick="phoneBuyOnlineCourse()"><span>💻 网课代刷</span><span>¥30/门</span></div>'+
    '<div style="text-align:center;color:#c0392b;font-size:.75em;margin:8px;">⚠️ 代刷有10%概率被教务处抽查</div></div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}
function phoneBuyOnlineCourse(){
  if(GS.money<30){showToast('金钱不足！需要30元');return;}
  if(!confirm('确认花费30元代刷网课？\n⚠️ 有10%概率被教务处抽查到，荣耀-10并取消成绩。'))return;
  GS.money-=30;updatePanel();
  if(Math.random()<0.1){doEffects({glory:-10});updatePanel();showPopup('⚠️ 网课代刷','不幸被教务处抽查到了！荣耀 -10，成绩作废。',{glory:-10},null,null);}
  else{showToast('✅ 网课代刷完成，请等待成绩更新');}
}

// ==================== 6. 校园生活 APP ====================
function renderCampusLifeApp(){
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="phoneGoBack()">← 返回</button><span class="ph-nav-title">🏃 校园生活</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">'+
    '<div class="ph-menu-grid">'+
      '<div class="ph-menu-item" onclick="renderCampusRun()">🏃<br>健康跑<br><span style="font-size:.65em;">'+(GS.campusRunKm||0)+'/60km</span></div>'+
      '<div class="ph-menu-item" onclick="renderCampusRepair()">🔧<br>宿舍报修</div>'+
      '<div class="ph-menu-item" onclick="renderCampusCanteen()">🍽️<br>食堂外卖</div>'+
      '<div class="ph-menu-item" onclick="renderCampusWork()">💼<br>勤工助学</div>'+
      '<div class="ph-menu-item" onclick="renderCampusVolunteer()">🤝<br>志愿活动</div>'+
    '</div></div></div>';
  return html;
}

function renderCampusRun(){
  var km=GS.campusRunKm||0;
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'campuslife\',true)">← 返回</button><span class="ph-nav-title">🏃 健康跑</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content"><div style="text-align:center;padding:20px;">'+
    '<div style="font-size:2em;font-weight:700;margin:12px;">'+km+' / 60 km</div>'+
    '<div style="color:#8b7d6b;margin-bottom:6px;">累计里程</div>'+
    '<div style="margin:12px 0;">'+(km>=60?'🎉 已完成本学期目标！':'还需'+(60-km)+'km')+'</div>'+
    '<div style="color:#8b7d6b;font-size:.8em;padding:12px;background:#f8f8f8;border-radius:8px;">📋 健康跑需在<strong>每日晚间</strong>通过主界面弹窗参与<br>（跑步/代跑/不参加）<br>此处仅查看累计进度</div>'+
    '</div></div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}

function renderCampusRepair(){
  var p=ph();var issue=p.dormIssue;
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'campuslife\',true)">← 返回</button><span class="ph-nav-title">🔧 宿舍报修</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">';
  if(issue){
    html+='<div style="background:#fff3e0;border:2px solid #e67e22;border-radius:12px;padding:16px;margin-bottom:12px;">'+
      '<div style="font-weight:700;color:#e67e22;margin-bottom:4px;">⚠️ 当前待处理</div>'+
      '<div style="font-size:1.5em;margin:8px 0;">'+(issue.icon||'🔧')+' '+issue.name+'</div>'+
      '<div style="color:#6b5f50;font-size:.82em;margin-bottom:10px;">'+issue.desc+'</div>'+
      '<div style="font-size:.78em;color:#999;margin-bottom:4px;">已持续 '+(Math.max(1,Math.floor((new Date(dateKey(GS.year,GS.month,GS.day).replace(/-/g,'/'))-new Date((issue.dormIssueDay||dateKey(GS.year,GS.month,GS.day)).replace(/-/g,'/')))/(1000*60*60*24))||1))+' 天 · 未修复每日幸福-2</div>'+
      '<button class="popup-btn" onclick="phoneRepairIssue()">🔧 立即报修（¥'+(issue.cost||50)+'）</button></div>';
  }else{
    html+='<div style="text-align:center;color:#1e7e34;padding:30px;font-size:1.2em;">✅ 宿舍一切正常<br><span style="font-size:.7em;color:#999;">暂无需要报修的问题</span></div>';
  }
  // Historical/common repairs
  html+='<div class="ph-section-title">📋 常见报修项目</div>'+
    '<div class="ph-info-row"><span>🚰 水龙头漏水</span><span>¥50</span></div>'+
    '<div class="ph-info-row"><span>🚽 马桶堵塞</span><span>¥40</span></div>'+
    '<div class="ph-info-row"><span>💡 灯管更换</span><span>¥20</span></div>'+
    '<div class="ph-info-row"><span>🔐 门锁维修</span><span>¥60</span></div>'+
    '<div class="ph-info-row"><span>🌡️ 暖气维修</span><span>¥80</span></div>'+
    '<div style="text-align:center;color:#999;font-size:.75em;margin:12px;">突发事件随机触发 · 报修后即刻解决</div></div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}
function phoneRepairIssue(){
  var p=ph();var issue=p.dormIssue;if(!issue)return;
  var cost=issue.cost||50;
  if(GS.money<cost){showToast('金钱不足！需要¥'+cost);return;}
  if(!confirm('确认花费¥'+cost+'报修「'+issue.name+'」？\n报修后即刻解决。'))return;
  GS.money-=cost;p.dormIssue=null;p.dormIssueDay='';updatePanel();
  showToast('✅ '+issue.name+'已修复！花费¥'+cost);
  renderCampusRepair();
}

function renderCampusCanteen(){
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'campuslife\',true)">← 返回</button><span class="ph-nav-title">🍽️ 食堂外卖</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">'+
    '<div class="ph-info-row" onclick="phoneOrderCanteen(\'健康轻食套餐\',15)"><span>🥗 健康轻食套餐</span><span>¥15+3配送</span></div>'+
    '<div class="ph-info-row" onclick="phoneOrderCanteen(\'人气炸鸡饭\',18)"><span>🍗 人气炸鸡饭</span><span>¥18+3配送</span></div>'+
    '<div class="ph-info-row" onclick="phoneOrderCanteen(\'麻辣香锅\',22)"><span>🌶️ 麻辣香锅</span><span>¥22+3配送</span></div>'+
    '<div class="ph-info-row" onclick="phoneOrderCanteen(\'牛肉拉面\',14)"><span>🍜 牛肉拉面</span><span>¥14+3配送</span></div>'+
    '<div style="text-align:center;color:#999;font-size:.75em;margin:12px;">配送费¥3/单 · 送餐到宿舍</div></div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}
function phoneOrderCanteen(name,cost){
  var total=cost+3;
  if(GS.money<total){showToast('金钱不足！需要¥'+total);return;}
  GS.money-=total;doEffects({happiness:2});updatePanel();showToast('✅ '+name+'已下单！预计30分钟送达 · 花费¥'+total);
}

// 勤工/志愿周限辅助
function getWeekKey(){return GS.year+'-W'+Math.ceil((GS.month-1)*4.35+GS.day/7);}
function getWeeklyActivityLimit(){
  var isMonitor=!!GS.wonElection;
  var isTuanxiao=!!(GS.tuanxiaoAccepted&&GS.tuanxiaoWeekBan>0);
  if(isMonitor&&isTuanxiao)return 0;
  if(isMonitor||isTuanxiao)return 1;
  return 2;
}
function checkWeekendAndLimit(){
  if(!isWeekend(GS.year,GS.month,GS.day)){showToast('⏰ 勤工俭学和志愿服务仅限周末进行！');return false;}
  if(!GS._weeklyActivityCount)GS._weeklyActivityCount={};var wk=getWeekKey();
  if(!GS._weeklyActivityCount[wk])GS._weeklyActivityCount[wk]=0;
  var limit=getWeeklyActivityLimit();
  if(limit===0){showToast('🚫 班委+团校进行中，本周无法参与勤工/志愿！');return false;}
  if(GS._weeklyActivityCount[wk]>=limit){showToast('🚫 本周勤工/志愿已达上限（'+limit+'次）！下周再来。');return false;}
  GS._weeklyActivityCount[wk]++;return true;
}

function renderCampusWork(){
  var wk=getWeekKey();var done=GS._weeklyActivityCount&&GS._weeklyActivityCount[wk]?GS._weeklyActivityCount[wk]:0;
  var limit=getWeeklyActivityLimit();
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'campuslife\',true)">← 返回</button><span class="ph-nav-title">💼 勤工助学</span><span style="font-size:.65em;">本周'+done+'/'+limit+'次</span></div>'+
    '<div class="ph-app-content">';
  if(!isWeekend(GS.year,GS.month,GS.day)){
    html+='<div style="text-align:center;color:#e67e22;padding:16px;background:#fff3e0;border-radius:8px;margin:10px;">📅 仅限<strong>周末</strong>申请<br><span style="font-size:.75em;">今天是星期'+weekday(GS.year,GS.month,GS.day)+'</span></div>';
  }else if(limit===0){
    html+='<div style="text-align:center;color:#c0392b;padding:16px;background:#fdecea;border-radius:8px;margin:10px;">🚫 班委+团校并行，本周无法参与</div>';
  }else if(done>=limit){
    html+='<div style="text-align:center;color:#8b7d6b;padding:16px;background:#f8f8f8;border-radius:8px;margin:10px;">✅ 本周次数已用完</div>';
  }
  html+='<div class="ph-info-row" onclick="phoneApplyWork(\'图书馆整理\',180,80)"><span>📚 图书馆整理</span><span>¥180/天<br><small>需悟性≥80</small></span></div>'+
    '<div class="ph-info-row" onclick="phoneApplyWork(\'实验室助理\',260,90)"><span>🔬 实验室助理</span><span>¥260/天<br><small>需悟性≥90</small></span></div>'+
    '<div class="ph-info-row" onclick="phoneApplyWork(\'辅导员助理\',350,100)"><span>👨‍💼 辅导员助理</span><span>¥350/天<br><small>需魅力≥100</small></span></div>'+
    '<div style="text-align:center;color:#999;font-size:.7em;margin:8px;">'+(GS.wonElection?'⚠️ 班委：每周限1次 ':'')+(GS.tuanxiaoAccepted&&GS.tuanxiaoWeekBan>0?'⚠️ 团校：每周限1次':'')+'</div>'+
    '</div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}
function phoneApplyWork(name,salary,req){
  if(!checkWeekendAndLimit())return;
  var attr=name==='辅导员助理'?'charm':'wisdom';var cur=GS[attr]||0;
  if(cur<req){showToast('条件不足！需要'+(attr==='charm'?'魅力':'悟性')+'≥'+req+'，当前：'+cur);return;}
  GS.money+=salary;doEffects({happiness:1,wisdom:-1});updatePanel();
  showToast('✅ '+name+'完成！获得¥'+salary);renderCampusWork();
}

function renderCampusVolunteer(){
  var wk=getWeekKey();var done=GS._weeklyActivityCount&&GS._weeklyActivityCount[wk]?GS._weeklyActivityCount[wk]:0;
  var limit=getWeeklyActivityLimit();
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'campuslife\',true)">← 返回</button><span class="ph-nav-title">🤝 志愿活动</span><span style="font-size:.65em;">本周'+done+'/'+limit+'次</span></div>'+
    '<div class="ph-app-content">';
  if(!isWeekend(GS.year,GS.month,GS.day)){
    html+='<div style="text-align:center;color:#e67e22;padding:16px;background:#fff3e0;border-radius:8px;margin:10px;">📅 仅限<strong>周末</strong>参与<br><span style="font-size:.75em;">今天是星期'+weekday(GS.year,GS.month,GS.day)+'</span></div>';
  }else if(limit===0){
    html+='<div style="text-align:center;color:#c0392b;padding:16px;background:#fdecea;border-radius:8px;margin:10px;">🚫 班委+团校并行，本周无法参与</div>';
  }else if(done>=limit){
    html+='<div style="text-align:center;color:#8b7d6b;padding:16px;background:#f8f8f8;border-radius:8px;margin:10px;">✅ 本周次数已用完</div>';
  }
  html+='<div class="ph-info-row" onclick="phoneDoVolunteer(\'校园马拉松志愿者\',4,80)"><span>🏃 校园马拉松志愿者</span><span>荣耀+4, ¥80</span></div>'+
    '<div class="ph-info-row" onclick="phoneDoVolunteer(\'迎新志愿者\',5,30)"><span>🎓 迎新志愿者</span><span>荣耀+5, ¥30</span></div>'+
    '<div class="ph-info-row" onclick="phoneDoVolunteer(\'图书馆义工\',2,0)"><span>📚 图书馆义工</span><span>荣耀+2</span></div>'+
    '<div style="text-align:center;color:#999;font-size:.7em;margin:8px;">'+(GS.wonElection?'⚠️ 班委：每周限1次 ':'')+(GS.tuanxiaoAccepted&&GS.tuanxiaoWeekBan>0?'⚠️ 团校：每周限1次':'')+'</div>'+
    '</div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}
function phoneDoVolunteer(name,glory,money){
  if(!checkWeekendAndLimit())return;
  var eff={glory:glory};if(money>0)eff.money=money;
  doEffects(eff);updatePanel();showPopup('🤝 志愿活动','你完成了「'+name+'」！',eff,null,null);
  renderCampusVolunteer();
}

// ==================== 7. 理财 APP ====================
function renderFinanceApp(){
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="phoneGoBack()">← 返回</button><span class="ph-nav-title">💰 理财</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">'+
    '<div class="ph-menu-grid">'+
      '<div class="ph-menu-item" onclick="closePhone();openStocks();">📈<br>股票交易</div>'+
      '<div class="ph-menu-item" onclick="renderYuebao()">🏦<br>余额宝</div>'+
      '<div class="ph-menu-item" onclick="renderPhoneRecharge()">📱<br>话费充值</div>'+
      '<div class="ph-menu-item" onclick="renderDataPlan()">📶<br>流量套餐</div>'+
    '</div></div></div>';
  return html;
}

function renderYuebao(){
  var p=ph();var yb=p.yuebaoBalance||0;var interest=Math.floor(yb*0.0005);
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'finance\',true)">← 返回</button><span class="ph-nav-title">🏦 余额宝</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content"><div style="text-align:center;padding:20px;">'+
    '<div style="font-size:1.5em;font-weight:700;">余额：¥'+(yb||0).toFixed(0)+'</div>'+
    '<div style="color:#8b7d6b;">日利率 0.05% · 今日利息：¥'+interest+'</div>'+
    '<div style="color:#999;font-size:.75em;">上限¥10000 · 每日凌晨结算</div>'+
    '<div style="margin:16px 0;">现金：¥'+GS.money+'</div>'+
    '<input type="number" id="ph-yb-amt" value="100" min="1" style="width:100%;padding:10px;border:1px solid #d5cfc6;border-radius:6px;font-size:1em;text-align:center;margin-bottom:6px;">'+
    '<button class="popup-btn" onclick="phoneYuebaoDeposit()" style="margin-bottom:4px;">📥 存入</button>'+
    '<button class="popup-btn" onclick="phoneYuebaoWithdraw()">📤 取出</button>'+
    '</div></div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}
function phoneYuebaoDeposit(){
  var amt=parseInt(document.getElementById('ph-yb-amt').value)||0;
  if(amt<=0||amt>GS.money){showToast('金额无效或不足！');return;}
  if(!ph().yuebaoBalance)ph().yuebaoBalance=0;
  if(ph().yuebaoBalance+amt>10000){showToast('超出余额宝上限¥10000！');return;}
  GS.money-=amt;ph().yuebaoBalance+=amt;updatePanel();renderYuebao();
  showToast('✅ 已存入¥'+amt);
}
function phoneYuebaoWithdraw(){
  var amt=parseInt(document.getElementById('ph-yb-amt').value)||0;
  if(amt<=0||amt>(ph().yuebaoBalance||0)){showToast('金额无效或余额不足！');return;}
  ph().yuebaoBalance-=amt;GS.money+=amt;updatePanel();renderYuebao();
  showToast('✅ 已取出¥'+amt);
}

function renderPhoneRecharge(){
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'finance\',true)">← 返回</button><span class="ph-nav-title">📱 话费充值</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content"><div style="text-align:center;padding:20px;">'+
    '<div style="font-size:1.2em;">当前话费：¥'+ph().credit.toFixed(1)+'</div>'+
    '<div style="margin:16px 0;">现金：¥'+GS.money+'</div>'+
    '<button class="popup-btn" onclick="phoneRecharge(10)" style="margin-bottom:4px;">💵 ¥10 充值</button>'+
    '<button class="popup-btn" onclick="phoneRecharge(30)" style="margin-bottom:4px;">💵 ¥30 充值</button>'+
    '<button class="popup-btn" onclick="phoneRecharge(50)">💵 ¥50 充值</button>'+
    '</div></div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}
function phoneRecharge(amt){
  if(GS.money<amt){showToast('金钱不足！');return;}
  GS.money-=amt;ph().credit+=amt;updatePanel();updatePhoneStatusBar();renderPhoneRecharge();
  showToast('✅ 话费充值¥'+amt+'成功！');
}

function renderDataPlan(){
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'finance\',true)">← 返回</button><span class="ph-nav-title">📶 流量套餐</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content"><div style="text-align:center;padding:20px;">'+
    '<div style="font-size:1.2em;">当前流量：'+ph().data.toFixed(0)+'MB</div>'+
    '<div style="font-size:.8em;color:#999;margin-bottom:12px;">套餐：'+(ph().dataPlan===0?'基础 5GB':(ph().dataPlan===1?'畅玩 20GB':'无限流量 50GB'))+'</div>'+
    '<div style="margin:16px 0;">现金：¥'+GS.money+'</div>'+
    '<button class="popup-btn" onclick="phoneBuyDataPlan(0)" style="margin-bottom:4px;">📶 基础套餐 5GB（免费）</button>'+
    '<button class="popup-btn" onclick="phoneBuyDataPlan(1)" style="margin-bottom:4px;">📶 畅玩套餐 20GB（¥20/月）</button>'+
    '<button class="popup-btn" onclick="phoneBuyDataPlan(2)" style="margin-bottom:8px;">📶 无限流量 50GB（¥50/月）</button>'+
    '<button class="popup-btn" onclick="phoneBuyDataPack()">📦 流量加油包 1GB（¥1）</button>'+
    '</div></div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}
function phoneBuyDataPlan(plan){
  var costs=[0,20,50];var datas=[5120,20480,51200];
  if(GS.money<costs[plan]){showToast('金钱不足！');return;}
  GS.money-=costs[plan];ph().dataPlan=plan;ph().data=datas[plan];updatePanel();updatePhoneStatusBar();renderDataPlan();
  showToast('✅ 套餐已变更为'+(plan===0?'基础':(plan===1?'畅玩':'无限流量'))+'套餐');
}
function phoneBuyDataPack(){
  if(GS.money<1){showToast('金钱不足！需要¥1');return;}
  GS.money-=1;ph().data+=1024;updatePanel();updatePhoneStatusBar();renderDataPlan();
  showToast('✅ 流量加油包1GB已到账（¥1/GB）');
}

// ==================== 8. 购物 APP ====================
function renderShoppingApp(){
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="phoneGoBack()">← 返回</button><span class="ph-nav-title">🛒 购物</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">'+
    '<div class="ph-menu-grid">'+
      '<div class="ph-menu-item" onclick="closePhone();openSupermarket();">🏪<br>线上超市</div>'+
      '<div class="ph-menu-item" onclick="renderSecondHand()">🔄<br>二手集市</div>'+
      '<div class="ph-menu-item" onclick="renderPhoneUpgrade()">📱<br>手机升级</div>'+
    '</div></div></div>';
  return html;
}

function renderSecondHand(){
  var p=ph();var items=p.secondHandItems||[];
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'shopping\',true)">← 返回</button><span class="ph-nav-title">🔄 二手集市</span><button class="ph-back-btn" onclick="phoneSellSecondHand()">➕卖</button></div>'+
    '<div class="ph-app-content">';
  // My listings
  if(items.length>0){
    html+='<div class="ph-section-title">📦 我的在售</div>';
    for(var i=0;i<items.length;i++){
      var it=items[i];
      html+='<div class="ph-info-row"><span>'+it.name+'</span><span>¥'+it.price+' <small>'+it.status+'</small></span></div>';
    }
  }
  // Daily marketplace (refreshes each day with varied items)
  var seed=GS.year*10000+GS.month*100+GS.day;
  var marketPool=[
    {name:'二手教材《C++ Primer》',cost:28,eff:{wisdom:3},desc:'九成新，笔记工整'},
    {name:'二手教材《高等数学》',cost:25,eff:{wisdom:3},desc:'轻微使用痕迹'},
    {name:'学霸笔记(全套)',cost:35,eff:{wisdom:6},desc:'专业课课堂笔记整理'},
    {name:'东秦纪念笔记本',cost:12,eff:{wisdom:2,happiness:1},desc:'限量版烫金硬壳'},
    {name:'二手台灯',cost:18,eff:{health:1},desc:'LED护眼灯，宿舍必备'},
    {name:'二手键盘(机械)',cost:45,eff:{happiness:3},desc:'青轴，打字编程利器'},
    {name:'校园明信片套装',cost:8,eff:{happiness:3,charm:1},desc:'手绘东秦十景'},
    {name:'二手蓝牙耳机',cost:38,eff:{happiness:4},desc:'续航正常，音质不错'},
    {name:'二手电热水壶',cost:22,eff:{health:2},desc:'1.5L，宿舍烧水泡面'},
    {name:'考试复习资料包',cost:15,eff:{wisdom:5},desc:'去年期末真题+答案'},
    {name:'二手收纳箱',cost:10,eff:{happiness:1},desc:'塑料大号，整理杂物'},
    {name:'二手暖宝宝(10片装)',cost:6,eff:{health:3},desc:'冬天贴衣服里超暖和'},
    {name:'二手书架',cost:20,eff:{wisdom:1,happiness:1},desc:'桌面小书架，三层'},
    {name:'二手零食大礼包',cost:16,eff:{happiness:5},desc:'各种进口零食混装'},
    {name:'校园网加速器账号',cost:30,eff:{happiness:2},desc:'一学期有效'},
    {name:'二手吉他',cost:88,eff:{happiness:6,charm:3},desc:'入门级，配琴包和调音器'},
    {name:'二手相机(胶片)',cost:120,eff:{happiness:8,charm:5},desc:'复古胶片机，文艺青年必备'},
    {name:'二手数位板',cost:65,eff:{wisdom:4},desc:'绘画设计用，轻微使用'}
  ];
  var idx1=seed%marketPool.length;
  var idx2=(seed*3+7)%marketPool.length;
  var idx3=(seed*5+13)%marketPool.length;
  if(idx2===idx1)idx2=(idx2+1)%marketPool.length;
  if(idx3===idx1||idx3===idx2)idx3=(idx3+2)%marketPool.length;
  var dailyItems=[marketPool[idx1],marketPool[idx2],marketPool[idx3]];
  html+='<div class="ph-section-title">🛒 今日精选（每日刷新）</div>';
  for(var di2=0;di2<dailyItems.length;di2++){
    var dItem=dailyItems[di2];
    html+='<div class="ph-info-row" onclick="phoneBuySecondHand(\''+dItem.name.replace(/'/g,"\\'")+'\','+dItem.cost+','+JSON.stringify(dItem.eff)+')"><span>'+dItem.name+'</span><div style="text-align:right;"><div style="font-weight:600;color:#c0392b;">¥'+dItem.cost+'</div><div style="font-size:.65em;color:#999;">'+dItem.desc+'</div></div></div>';
  }
  html+='</div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}
function phoneSellSecondHand(){
  var overlay=document.createElement('div');overlay.className='popup-overlay';overlay.style.zIndex='10002';
  overlay.innerHTML='<div class="popup-box" style="max-width:360px;"><div class="popup-title">➕ 出售闲置</div>'+
    '<input type="text" id="ph-sh-name" placeholder="物品名称" style="width:100%;padding:8px;border:1px solid #d5cfc6;border-radius:6px;margin-bottom:6px;font-family:inherit;">'+
    '<input type="number" id="ph-sh-price" placeholder="价格" min="1" style="width:100%;padding:8px;border:1px solid #d5cfc6;border-radius:6px;margin-bottom:10px;font-family:inherit;">'+
    '<button class="popup-btn" id="ph-sh-list">📋 上架</button></div>';
  document.body.appendChild(overlay);
  document.getElementById('ph-sh-list').onclick=function(){
    var name=document.getElementById('ph-sh-name').value.trim();
    var price=parseInt(document.getElementById('ph-sh-price').value)||0;
    if(!name||price<=0){showToast('请填写完整信息');return;}
    phSave();if(!ph().secondHandItems)ph().secondHandItems=[];
    ph().secondHandItems.push({name:name,price:price,status:'在售'});
    overlay.remove();renderSecondHand();showToast('✅ 物品已上架');
  };
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
}
function phoneBuySecondHand(name,cost,eff){
  if(GS.money<cost){showToast('金钱不足！');return;}
  GS.money-=cost;doEffects(eff);updatePanel();showToast('✅ 购买了'+name+' · 花费¥'+cost);
}

function renderPhoneUpgrade(){
  var p=ph();var model=p.model||0;
  var models=[
    {name:'入门智能机',cost:0,desc:'基础功能，无加成',bonus:'默认'},
    {name:'中端智能机',cost:2000,desc:'点赞加成+20%，二手费率降至5%',bonus:'社交优化'},
    {name:'高端智能机',cost:4000,desc:'外卖月3张¥10券，教务无广告',bonus:'生活便利'},
    {name:'旗舰智能机',cost:6000,desc:'全APP交互加成，限量优先购',bonus:'尊享体验'}
  ];
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="navigatePhoneApp(\'shopping\',true)">← 返回</button><span class="ph-nav-title">📱 手机升级</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content"><div style="text-align:center;color:#8b7d6b;margin-bottom:8px;">当前：'+models[model].name+'</div>';
  for(var i=0;i<models.length;i++){
    var m=models[i];var owned=i===model;
    html+='<div class="ph-info-row" style="'+(owned?'background:#e8f5e9;':'')+'"><div><div style="font-weight:600;">'+m.name+'</div><div style="font-size:.7em;color:#8b7d6b;">'+m.desc+'</div></div><span>'+(owned?'✅ 使用中':('¥'+m.cost))+'</span>'+(owned||i<=model?'':'<button onclick="phoneBuyUpgrade('+i+')" style="padding:4px 8px;font-size:.75em;">购买</button>')+'</div>';
  }
  html+='</div></div>';
  document.getElementById('phone-screen').innerHTML=html;
}
function phoneBuyUpgrade(model){
  var costs=[0,2000,4000,6000];
  if(GS.money<costs[model]){showToast('金钱不足！需要¥'+costs[model]);return;}
  if(!confirm('确认购买？花费¥'+costs[model]+'\n手机使用半年后会自动折旧一档。'))return;
  GS.money-=costs[model];ph().model=model;ph().upgradeBought=(ph().upgradeBought||0)+1;
  ph().depreciationDay=dateKey(GS.year,GS.month+6,GS.day);
  updatePanel();renderPhoneUpgrade();showToast('✅ 手机升级成功！');
}

// ==================== 9. 日历 APP ====================
function renderCalendarApp(){
  var events=[];
  // Auto events
  if(GS.putonghuaRegistered)events.push({date:'考试日',name:'普通话水平测试',type:'exam'});
  if(GS.cet4Applied)events.push({date:'12月中旬',name:'英语四级考试',type:'exam'});
  if(GS.girlfriends&&GS.girlfriends.length>0){
    var gf=GS.girlfriends[0];
    events.push({date:fmtDate(GS.year,GS.month,GS.day+15),name:gf.name+'的提醒',type:'love'});
  }
  // Holidays
  if(GS.month===9&&GS.day>=10)events.push({date:'2024年10月1日',name:'国庆假期',type:'holiday'});
  if(GS.month===12)events.push({date:'2024年12月25日',name:'圣诞节',type:'holiday'});
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="phoneGoBack()">← 返回</button><span class="ph-nav-title">📅 日历</span><button class="ph-back-btn" onclick="phoneAddTodo()">➕</button></div>'+
    '<div class="ph-app-content"><div style="text-align:center;font-size:1.2em;font-weight:700;margin-bottom:12px;">'+fmtDate(GS.year,GS.month,GS.day)+' 星期'+weekday(GS.year,GS.month,GS.day)+'</div>';
  if(events.length===0){
    html+='<div style="text-align:center;color:#8b7d6b;padding:20px;">暂无待办事项</div>';
  }else{
    for(var i=0;i<events.length;i++){
      var ev=events[i];
      html+='<div class="ph-info-row"><span>'+(ev.type==='exam'?'📝':(ev.type==='love'?'💕':'📅'))+' '+ev.name+'</span><span style="font-size:.75em;">'+ev.date+'</span></div>';
    }
  }
  html+='</div></div>';
  return html;
}
function phoneAddTodo(){
  var overlay=document.createElement('div');overlay.className='popup-overlay';overlay.style.zIndex='10002';
  overlay.innerHTML='<div class="popup-box" style="max-width:360px;"><div class="popup-title">➕ 添加待办</div>'+
    '<input type="text" id="ph-todo-text" placeholder="事项（如：自习、兼职、约会）" style="width:100%;padding:8px;border:1px solid #d5cfc6;border-radius:6px;margin-bottom:10px;font-family:inherit;">'+
    '<button class="popup-btn" id="ph-todo-add">✅ 添加</button></div>';
  document.body.appendChild(overlay);
  document.getElementById('ph-todo-add').onclick=function(){
    var text=document.getElementById('ph-todo-text').value.trim();
    if(!text){showToast('请输入事项');return;}
    overlay.remove();
    doEffects({happiness:2});updatePanel();
    if(text.indexOf('自习')>=0)doEffects({wisdom:1});
    if(text.indexOf('兼职')>=0)doEffects({money:20});
    showPopup('📅 待办完成','你完成了「'+text+'」！心情 +2',{happiness:2},null,null);
  };
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
}

// ==================== 10. 外卖 APP ====================
function renderFoodApp(){
  var isRain=GS.weather&&(GS.weather.key==='rain'||GS.weather.key==='thunderstorm');
  var deliveryFee=isRain?6:3;
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="phoneGoBack()">← 返回</button><span class="ph-nav-title">🍔 外卖</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">'+(isRain?'<div style="text-align:center;color:#e67e22;font-size:.8em;padding:6px;">🌧️ 雨天配送费×2，延迟30分钟</div>':'')+
    '<div class="ph-info-row" onclick="phoneOrderFood(\'炸鸡套餐\',25,\'重油\')"><span>🍗 炸鸡套餐</span><span>¥25+¥'+deliveryFee+'</span></div>'+
    '<div class="ph-info-row" onclick="phoneOrderFood(\'烧烤拼盘\',35,\'重油\')"><span>🥩 烧烤拼盘</span><span>¥35+¥'+deliveryFee+'</span></div>'+
    '<div class="ph-info-row" onclick="phoneOrderFood(\'麻辣烫\',18,\'普通\')"><span>🌶️ 麻辣烫</span><span>¥18+¥'+deliveryFee+'</span></div>'+
    '<div class="ph-info-row" onclick="phoneOrderFood(\'寿司套餐\',28,\'健康\')"><span>🍣 寿司套餐</span><span>¥28+¥'+deliveryFee+'</span></div>'+
    '<div class="ph-info-row" onclick="phoneOrderFood(\'沙拉轻食\',22,\'健康\')"><span>🥗 沙拉轻食</span><span>¥22+¥'+deliveryFee+'</span></div>'+
    '<div class="ph-info-row" onclick="phoneOrderFoodPintuan()"><span>👥 拼单（与室友）</span><span>省30%</span></div>'+
    '</div></div>';
  return html;
}
function phoneOrderFood(name,cost,type){
  var isRain=GS.weather&&(GS.weather.key==='rain'||GS.weather.key==='thunderstorm');
  var deliveryFee=isRain?6:3;
  var total=cost+deliveryFee;
  if(GS.money<total){showToast('金钱不足！需要¥'+total);return;}
  GS.money-=total;updatePanel();
  var fc=ph().foodConsecutive||0;
  if(type==='重油'){fc++;ph().foodConsecutive=fc;if(fc>=3){doEffects({health:-2,happiness:3});showToast('⚠️ 连续3天重油外卖！健康-2，心情+3');}}
  else{ph().foodConsecutive=0;}
  showToast('✅ '+name+'已下单！预计'+(isRain?'60':'30')+'分钟送达 · ¥'+total);
}

function phoneOrderFoodPintuan(){
  var cost=20;var share=Math.floor(cost*0.7);
  if(GS.money<share){showToast('金钱不足！需要¥'+share);return;}
  if(!confirm('与室友拼单？\n原价¥'+cost+' → 拼单价¥'+share+'（省30%）\n室友好感+2'))return;
  GS.money-=share;
  GS.classmateFavor.huye=(GS.classmateFavor.huye||50)+2;
  GS.classmateFavor.naikou=(GS.classmateFavor.naikou||50)+2;
  GS.classmateFavor.jingye=(GS.classmateFavor.jingye||50)+2;
  doEffects({happiness:3});updatePanel();showToast('✅ 拼单成功！花费¥'+share+'，室友好感+2');
}

// ==================== 11. 相册 APP ====================
function renderGalleryApp(){
  var p=ph();var photos=p.photos||[];
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="phoneGoBack()">← 返回</button><span class="ph-nav-title">📷 相册</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">';
  if(photos.length===0){
    html+='<div style="text-align:center;color:#8b7d6b;padding:40px;">相册为空<br><span style="font-size:.8em;">剧情中的特殊时刻会自动存入照片</span></div>';
  }else{
    html+='<div class="ph-photo-grid">';
    for(var i=0;i<photos.length;i++){
      var pho=photos[i];
      html+='<div class="ph-photo-item" onclick="phoneViewPhoto('+i+')"><div style="font-size:2em;">📷</div><div style="font-size:.7em;">'+pho.name+'</div><div style="font-size:.6em;color:#999;">'+pho.date+'</div></div>';
    }
    html+='</div>';
  }
  html+='</div></div>';
  return html;
}
function phoneViewPhoto(idx){
  var p=ph();if(!p.photos||!p.photos[idx])return;
  var pho=p.photos[idx];
  var overlay=document.createElement('div');overlay.className='popup-overlay';overlay.style.zIndex='10002';
  overlay.innerHTML='<div class="popup-box" style="max-width:360px;text-align:center;">'+
    '<div class="popup-title">📷 '+pho.name+'</div>'+
    '<div style="font-size:3em;margin:20px;">📷</div>'+
    '<div style="color:#8b7d6b;">'+pho.desc+'</div>'+
    '<div style="color:#999;font-size:.8em;">'+pho.date+'</div>'+
    '<button class="popup-btn" onclick="phonePrintPhoto('+idx+')" style="margin-top:10px;background:#795548;">🖼️ 冲印照片（¥20）</button>'+
    '<button class="popup-btn" style="background:#8b7d6b;margin-top:4px;" id="ph-photo-close">关闭</button></div>';
  document.body.appendChild(overlay);
  document.getElementById('ph-photo-close').onclick=function(){overlay.remove();};
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
}
function phonePrintPhoto(idx){
  if(GS.money<20){showToast('金钱不足！需要¥20');return;}
  GS.money-=20;updatePanel();
  // Find related NPC and give favor bonus
  var pho=ph().photos[idx];
  var favorTarget=null;if(GS.girlfriends&&GS.girlfriends.length>0)favorTarget=GS.girlfriends[0].id;
  if(favorTarget){GS.classmateFavor[favorTarget]=(GS.classmateFavor[favorTarget]||0)+8;if(isGf(favorTarget))syncGfFromClassmate(favorTarget);}
  showPopup('🖼️ 冲印完成','照片已冲印成实体！'+(favorTarget?'好感+8':''),favorTarget?{[favorTarget+'Fav']:8}:{},null,function(){updatePanel();});
}
// Add photo helper
function phoneAddPhoto(name,desc){
  phSave();if(!ph().photos)ph().photos=[];
  ph().photos.push({name:name,desc:desc,date:fmtDate(GS.year,GS.month,GS.day)});
}

// ==================== 12. 出行导航 APP ====================
function renderNavigationApp(){
  var html='<div class="ph-app-container">'+
    '<div class="ph-nav-bar"><button class="ph-back-btn" onclick="phoneGoBack()">← 返回</button><span class="ph-nav-title">🗺️ 出行导航</span><span style="width:40px;"></span></div>'+
    '<div class="ph-app-content">'+
    '<div class="ph-section-title">🏖️ 周末周边游</div>'+
    '<div class="ph-info-row" onclick="phoneGoTrip(\'北戴河\',200,15,5)"><span>🏖️ 北戴河</span><span>¥200</span></div>'+
    '<div class="ph-info-row" onclick="phoneGoTrip(\'山海关\',250,15,5)"><span>🏯 山海关</span><span>¥250</span></div>'+
    '<div class="ph-info-row" onclick="phoneGoTrip(\'老龙头\',180,12,4)"><span>🌊 老龙头</span><span>¥180</span></div>'+
    '<div class="ph-section-title">🏠 校外租房</div>'+
    '<div style="text-align:center;color:#999;font-size:.75em;padding:10px;">'+(GS.month>=9&&GS.year>=2025?'大二及以上可申请':'大二起可申请')+'<br>定金¥1000 · 月租¥600</div>';
  if(GS.month>=9&&GS.year>=2025){
    html+='<button class="popup-btn" onclick="phoneRentHouse()" style="margin:10px;">🏠 查看房源</button>';
  }
  html+='</div></div>';
  return html;
}
function phoneGoTrip(place,cost,happiness,health){
  if(GS.money<cost){showToast('金钱不足！需要¥'+cost);return;}
  if(!confirm('预订前往'+place+'的行程？\n费用：¥'+cost+'（车票+民宿）\n获得：心情+'+happiness+'，健康+'+health))return;
  GS.money-=cost;
  if(Math.random()<0.05){GS.money-=20;showPopup('🗺️ '+place+'之旅','途中遭遇堵车，额外花费¥20。但旅途仍然愉快！',{money:-(cost+20),happiness:happiness,health:health},null,function(){updatePanel();});}
  else{doEffects({happiness:happiness,health:health});updatePanel();showPopup('🗺️ '+place+'之旅','愉快的'+place+'之旅！心情+'+happiness+'，健康+'+health,{happiness:happiness,health:health},null,null);}
}
function phoneRentHouse(){
  if(GS.money<1000){showToast('金钱不足！需要定金¥1000');return;}
  if(!confirm('确认校外租房？\n定金¥1000 + 月租¥600/月\n好处：无宿管查寝，可熬夜\n代价：每月多花¥600'))return;
  GS.money-=1000;updatePanel();showToast('✅ 已签约校外租房！每月1日自动扣月租¥600');
}

// ==================== 每日手机处理 ====================
function processPhoneDaily(){
  phSave();var p=ph();
  // Battery drain and recharge
  if(p.lastChargeDay!==dateKey(GS.year,GS.month,GS.day)){
    p.battery=Math.min(100,p.battery+30); // Recharge overnight
    p.lastChargeDay=dateKey(GS.year,GS.month,GS.day);
  }
  // Random battery drain during day
  var drain=5+Math.floor(Math.random()*10);
  p.battery=Math.max(0,p.battery-drain);

  // Yuebao daily interest
  if(p.yuebaoBalance&&p.yuebaoBalance>0){
    var interest=Math.floor(p.yuebaoBalance*0.0005);
    if(interest>0){GS.money+=interest;if(GS.storyLog)GS.storyLog.push({date:fmtDate(GS.year,GS.month,GS.day),title:'🏦 余额宝',result:'今日利息 +¥'+interest});}
  }

  // Monthly rent deduction
  if(p.rented&&GS.day===1){GS.money=Math.max(0,GS.money-600);}

  // Monthly data plan renewal
  if(GS.day===1&&p.dataPlan>0){
    var costs=[0,20,50];var datas=[5120,20480,51200];
    if(GS.money>=costs[p.dataPlan]){GS.money-=costs[p.dataPlan];p.data=datas[p.dataPlan];}
    else{p.dataPlan=0;p.data=5120;showToast('⚠️ 流量套餐续费失败，自动切换为基础套餐');}
  }

  // 鹏远电话卡月租扣费（从话费余额扣49元）
  if(GS.day===1&&GS.hasPhoneCard){
    p.credit-=49;
    if(p.credit<0){showToast('⚠️ 鹏远电话卡扣费¥49，话费已欠费！请及时充值。');}
    else{showToast('📶 鹏远电话卡月租已扣 ¥49，当前话费 ¥'+p.credit.toFixed(1));}
  }

  // Mom SMS on 1st of month (applyMonthly() handles actual money changes)
  if(GS.day===1){
    var moneyMsg='儿子/闺女，这个月生活费打过去了（+¥2500），在学校好好照顾自己！';
    p.messages.push({from:'老妈',to:'player',text:moneyMsg,time:fmtDate(GS.year,GS.month,GS.day)+' 08:00',read:false});
    if(!p.momReplied&&p.momConsecutive>0){GS.money-=50;showToast('⚠️ 上月未回老妈消息，生活费-50');}
    if(!p.momReplied){p.momConsecutive=(p.momConsecutive||0)+1;}
    else{p.momConsecutive=0;}
    p.momReplied=false;
    // Holiday red envelopes
    if((GS.month===1&&GS.day===1)||(GS.month===2&&GS.day===14)||(GS.month===8&&GS.day===25)){
      var bonus=20+Math.floor(Math.random()*80);
      GS.money+=bonus;
      p.messages.push({from:'老妈',to:'player',text:'节日快乐！给你发了个小红包~🧧',time:fmtDate(GS.year,GS.month,GS.day)+' 09:00',read:false});
    }
  }

  // GF daily message
  if(GS.girlfriends&&GS.girlfriends.length>0&&Math.random()<0.7){
    var gf=GS.girlfriends[0];
    var gfMsgs=['今天课好累😫','食堂出了新菜你尝了吗？','外面天气好好想去散步','作业写完了吗一起讨论？','刚看到一个好笑的段子分享给你','今天心情不错～','好想你啊','今天老师讲的你听懂了吗'];
    var gfMsg=gfMsgs[Math.floor(Math.random()*gfMsgs.length)];
    p.messages.push({from:gf.id,to:'player',text:gfMsg,time:fmtDate(GS.year,GS.month,GS.day)+' '+String(10+Math.floor(Math.random()*12)).padStart(2,'0')+':'+String(Math.floor(Math.random()*60)).padStart(2,'0'),read:false});
  }

  // Class group notifications
  if(Math.random()<0.3){
    var notices=[
      '📢 通知：请各位同学及时完成校园健康跑打卡',
      '📢 提醒：下周有随堂测验，请做好准备',
      '📢 选课通知：公选课即将开放选课',
      '📢 体测安排已出，请查看教务系统',
      '📢 竞赛报名即将截止，有意者请尽快提交材料'
    ];
    p.messages.push({from:'班级群',to:'player',text:notices[Math.floor(Math.random()*notices.length)],time:fmtDate(GS.year,GS.month,GS.day)+' '+String(8+Math.floor(Math.random()*10)).padStart(2,'0')+':00',read:false});
  }

  // NPC random moments (teachers + classmates, 0~3 per day)
  var momentCount=Math.floor(Math.random()*4);
  for(var mci=0;mci<momentCount;mci++){
    var posterPool=[];
    // Add unlocked teachers
    if(GS.hanpengUnlocked)posterPool.push({name:'韩鹏老师',id:'hanpeng',type:'teacher'});
    if(GS.taniaUnlocked)posterPool.push({name:'Tania老师',id:'tania',type:'teacher'});
    if(GS.shijianmingUnlocked)posterPool.push({name:'史鉴明老师',id:'shijianming',type:'teacher'});
    if(GS.lixinyaoUnlocked)posterPool.push({name:'李心瑶老师',id:'lixinyao',type:'teacher'});
    // Add girlfriend
    if(GS.girlfriends&&GS.girlfriends.length>0){
      for(var gfi=0;gfi<GS.girlfriends.length;gfi++){posterPool.push({name:GS.girlfriends[gfi].name,id:GS.girlfriends[gfi].id,type:'gf'});}
    }
    // Add random classmates
    var cmKeys=Object.keys(CLASSMATES);
    for(var ci=0;ci<3;ci++){var rk=cmKeys[Math.floor(Math.random()*cmKeys.length)];posterPool.push({name:CLASSMATES[rk].name,id:rk,type:'classmate'});}
    // Pick a poster
    var poster=posterPool[Math.floor(Math.random()*posterPool.length)];
    // Generate content by type
    var teacherMoments=[
      '今天课堂上同学们都很积极，看到大家认真思考的样子，作为老师很欣慰。📚',
      '批了一下午作业，有些同学的解题思路让人眼前一亮！继续加油💪',
      '周末在办公室备课中~有什么问题可以随时来问',
      '推荐一本这个领域的入门好书，感兴趣的同学可以看看',
      '学术会议刚结束，带回来一些新思路，下周课堂上分享给大家',
      '看到毕业的学生发来的好消息，这就是当老师最大的幸福吧'
    ];
    var gfMoments=[
      '今天天气好好呀，想出去走走☀️','食堂出了新菜，一起去尝尝？',
      '在图书馆自习中，有人一起吗？📖','刚看到一个超好笑的段子哈哈哈哈哈',
      '今天有点累，不过想到你就开心了💕','新买了一件衣服，纠结要不要退…',
      '室友又带了好吃的回来，太幸福了','好想去海边看日落🌅'
    ];
    var classmateMoments=[
      '今天在图书馆泡了一天，充实！📚','终于搞懂了这道难题！成就感爆棚',
      '食堂新窗口太赞了！排队排了二十分钟也值🍜','外卖踩雷了…含泪吃完',
      '排练中，期待正式演出！🎭','社团活动累并快乐着',
      '今天心情特别好～','有点emo…想家了😢',
      '大学真美好啊','考试周前的最后疯狂…','今天操场跑步碰到一群打篮球的，氛围真好',
      'C++大作业肝到凌晨三点，终于跑通了！','周末有没有人一起出去玩？',
      '突然发现学校小花园的猫又生了小猫🐱','体测跑步差点断气…',
      '抢到了最后一杯奶茶，今日幸运⭐','这学期的课表谁排的，周三五节课要命了'
    ];
    var posterMoments=poster.type==='teacher'?teacherMoments:(poster.type==='gf'?gfMoments:classmateMoments);
    var content=posterMoments[Math.floor(Math.random()*posterMoments.length)];
    p.moments.push({author:poster.name,content:content,time:fmtDate(GS.year,GS.month,GS.day),likes:Math.floor(Math.random()*7),liked:false,comments:[]});
  }
  // Mutual interaction: classmates react to player's recent posts
  if(p.moments.length>0){
    for(var mj=p.moments.length-1;mj>=0&&mj>=p.moments.length-3;mj--){
      var pm=p.moments[mj];
      if(pm.author==='我'&&!pm._interacted){
        pm._interacted=true;
        var reactors=[];
        if(GS.girlfriends){for(var gk=0;gk<GS.girlfriends.length;gk++){reactors.push({name:GS.girlfriends[gk].name,id:GS.girlfriends[gk].id,favor:GS.girlfriends[gk].favor});}}
        var cmKeys2=Object.keys(CLASSMATES);
        for(var cr=0;cr<3;cr++){var rk2=cmKeys2[Math.floor(Math.random()*cmKeys2.length)];reactors.push({name:CLASSMATES[rk2].name,id:rk2,favor:GS.classmateFavor[rk2]||50});}
        for(var ri=0;ri<reactors.length;ri++){
          var r=reactors[ri];var rate=30+(r.favor-50)*0.6;
          if(Math.random()*100<rate){
            pm.likes=(pm.likes||0)+1;
            var commentChance=20+(r.favor-50)*0.4;
            if(Math.random()*100<commentChance){
              var cmts=['👍👍','厉害！','羡慕~','太赞了','哈哈哈','+1','有品位','好棒！','爱了爱了','mark'];
              if(!pm.comments)pm.comments=[];
              pm.comments.push(r.name+'：'+cmts[Math.floor(Math.random()*cmts.length)]);
            }
          }
        }
      }
    }
  }
  // Limit moments
  if(p.moments.length>30)p.moments=p.moments.slice(-30);

  // Negative events
  processPhoneNegativeEvents();

  // Save
  saveGame();
}

// ==================== 负面随机事件 ====================
function processPhoneNegativeEvents(){
  var p=ph();if(!p)return;
  // 欠费 check
  if(p.credit<=0){}
  // 没电 (2% daily)
  if(Math.random()<0.02){p.battery=0;showToast('📱⚠️ 手机没电了！今日无法使用手机。');}
  // 丢失 (1% monthly)
  if(GS.day===1&&Math.random()<0.01){
    var lost=50+Math.floor(Math.random()*150);
    GS.money=Math.max(0,GS.money-lost);
    showPopup('📱 手机丢失','手机不慎丢失！损失零钱¥'+lost+'。需花¥500补办新机恢复功能。',{money:-lost},null,function(){updatePanel();});
  }
  // 垃圾短信 (exam period 20%)
  if((GS.putonghuaRegistered||GS.cet4Applied)&&Math.random()<0.2){
    showToast('📱 收到垃圾短信骚扰，今日自习效率减半');
  }
  // 夜间被没收 (10% after熄灯)
  if(Math.random()<0.1&&new Date().getHours()>=22){
    p.battery=0;showToast('📱⚠️ 深夜玩手机被查寝没收！手机停用1天。');
  }
  // 宿舍突发事件 (每天8%概率)
  if(!p.dormIssue&&Math.random()<0.08){
    var issues=[
      {id:'tap',name:'水龙头漏水',desc:'宿舍水龙头关不紧，滴滴答答不停，地面已经积了一小滩水。',cost:50,icon:'🚰'},
      {id:'toilet',name:'马桶堵塞',desc:'马桶冲水不畅，水位居高不下，室友们都很头疼。',cost:40,icon:'🚽'},
      {id:'light',name:'灯管坏了',desc:'宿舍顶灯忽明忽暗，昨晚彻底不亮了，晚上只能靠台灯。',cost:20,icon:'💡'},
      {id:'lock',name:'门锁故障',desc:'宿舍门锁卡住了，每次开门都要折腾半天。',cost:60,icon:'🔐'},
      {id:'heater',name:'暖气不热',desc:'暖气片摸上去只有微温，宿舍里冷得穿棉袄都不够。',cost:80,icon:'🌡️',winterOnly:true}
    ];
    var valid=[];for(var ii=0;ii<issues.length;ii++){if(!issues[ii].winterOnly||(GS.month>=11||GS.month<=3))valid.push(issues[ii]);}
    var issue=valid[Math.floor(Math.random()*valid.length)];
    p.dormIssue=issue;p.dormIssueDay=dateKey(GS.year,GS.month,GS.day);
    p.messages.push({from:'系统',to:'player',text:'🔧 宿舍报修提醒：'+issue.name+' — '+issue.desc+' 请在手机「校园生活→宿舍报修」中报修。',time:fmtDate(GS.year,GS.month,GS.day)+' 09:00',read:false});
    showToast('🔧 宿舍突发问题：'+issue.name+'！请用手机报修');
  }
  // 未修复惩罚
  if(p.dormIssue&&p.dormIssueDay!==dateKey(GS.year,GS.month,GS.day)){
    doEffects({happiness:-2});showToast('😞 宿舍'+p.dormIssue.name+'仍未修复，幸福-2');
  }
}

// ==================== 壁纸系统 ====================
function phoneCheckWallpaper(){
  if(!GS.phone)return;
  // Couple wallpaper: GF favor >= 90
  if(GS.girlfriends&&GS.girlfriends.length>0&&GS.girlfriends[0].favor>=90){
    if(GS.phone.wallpaper==='default')GS.phone.wallpaper='couple';
  }
  // Other wallpapers could be unlocked via story events
}

// ==================== 手机插入初始化 ====================
// Called after sep7_end to distribute phone
function phoneInitOnStart(){
  phSave();
  // 鹏远电话卡：220GB流量
  if(GS.hasPhoneCard){ph().data=225280;}
  if(!GS.phone||!GS.phone.messages||GS.phone.messages.length===0){
    var initMsg='🎉 恭喜获得入门智能机！话费50元';
    if(GS.hasPhoneCard){initMsg+='，鹏远电话卡220GB流量已激活';}
    else{initMsg+='，流量5GB';}
    initMsg+='。欢迎使用东秦校园手机系统！';
    GS.phone.messages.push({from:'系统',to:'player',text:initMsg,time:fmtDate(GS.year,GS.month,GS.day)+' 20:00',read:false});
  }
}

// Phone init hook: called at start of processDay if not yet initialized
// _phoneInitialized now on GS, set by defaultState/default

document.addEventListener('DOMContentLoaded',init);
