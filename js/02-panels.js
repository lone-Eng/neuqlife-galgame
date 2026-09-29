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

// ===== 课程解锁 =====
// 课程随剧情推进依次开课，成绩面板只显示已经上过的课。
// 日期取自剧情里各门课的首次出现（9.30 开学第一课 / 10.8 起各科首课）。
var COURSE_UNLOCK={
  advancedMath:  [9,30],   // 9.30 周蕊·高数开学第一课
  dataAnalysis:  [9,30],   // 9.30 史鉴明·数据分析导论
  academicLang:  [9,30],   // 9.30 Tania·学术语言
  xingshiZhengce:[10,8],   // 10.8 韩杰·形势与政策首课
  cppProg:       [10,9],   // 10.9 李国瑞·C++ 首课
  pe:            [10,9],   // 10.9 体育课
  moralLaw:      [10,10],  // 10.10 宋俊丽·思想道德与法治首课
  laborEducation:[10,14],  // 10.14 劳动教育
  // 剧情中未单独开课，学期进入尾声后统一出现在成绩单上
  mentalHealth:  [10,16],
  careerPlan:    [10,16]
};
var COURSE_ORDER=['academicLang','cppProg','advancedMath','pe','moralLaw','dataAnalysis','mentalHealth','careerPlan','xingshiZhengce','laborEducation'];

/** 该门课是否已开课（显式标记优先，其次看日期是否已到） */
function isCourseUnlocked(key){
  if(!GS)return false;
  if(GS.courseUnlocked&&GS.courseUnlocked[key])return true;
  var d=COURSE_UNLOCK[key];
  if(!d)return true;
  if(GS.year>2024)return true;
  if(GS.month>d[0])return true;
  if(GS.month<d[0])return false;
  return GS.day>=d[1];
}
/** 只要这门课产生了任何成绩变动，就说明它已经在上了 */
function markCourseUnlocked(key){
  if(!GS)return;
  if(!GS.courseUnlocked)GS.courseUnlocked={};
  if(!GS.courseUnlocked[key])GS.courseUnlocked[key]=true;
}
function unlockedCourseCount(){
  var n=0;
  for(var i=0;i<COURSE_ORDER.length;i++){ if(isCourseUnlocked(COURSE_ORDER[i]))n++; }
  return n;
}

function showGrades(){
  var overlay=document.createElement('div');overlay.className='grades-overlay';
  var html='<div class="grades-box">';
  html+='<div class="grades-title">📊 课程成绩</div>';
  var got=unlockedCourseCount();
  html+='<div class="grades-subtitle">当前学期课程预估成绩 · 已开课 '+got+' / '+COURSE_ORDER.length+' 门</div>';
  var locked=[];
  for(var i=0;i<COURSE_ORDER.length;i++){
    var key=COURSE_ORDER[i];
    if(!isCourseUnlocked(key)){locked.push(key);continue;}
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
  if(locked.length){
    html+='<div class="grades-locked-title">🔒 尚未开课（随剧情推进解锁）</div>';
    for(var j=0;j<locked.length;j++){
      html+='<div class="grade-item grade-item-locked"><span class="grade-name">'+COURSE_NAMES[locked[j]]+'</span><span class="grade-val">未开课</span></div>';
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
