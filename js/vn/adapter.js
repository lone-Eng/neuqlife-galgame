/**
 * ============================================================
 *  东秦校园人生 · 剧本适配层 (Galgame Adapter)
 *  ------------------------------------------------------------
 *  这一层是"原游戏逻辑"与"VN 演出引擎"之间的桥梁。
 *
 *  它做三件事：
 *    1) 文本解析：把原有散文化的剧本，解析成
 *       「旁白 / 角色台词」的节拍序列，自动识别说话人、
 *       自动切换背景、自动让角色立绘登场。
 *    2) 演出推断：根据日期 / 标题 / 正文，决定 CG、
 *       BGM、音效与特效的插入点。
 *    3) 覆盖渲染层：把原本写 HTML 字符串的 render* 函数，
 *       全部改写为驱动 VN 引擎的版本。
 *
 *  ⚠️ 本文件在 index.html 中最后加载，因此下面的
 *     同名函数会覆盖前面模块中的旧实现。
 * ============================================================
 */

/* ============================================================
   第一部分：解析与推断工具
   ============================================================ */
var VNA=(function(){
  'use strict';

  // ----------------------------------------------------------
  //  角色名 → 立绘 id 索引
  // ----------------------------------------------------------
  var NAME_KEYS=[];
  var NAME_ID={};
  var namesBuilt=false;

  function buildNames(){
    if(namesBuilt)return;
    namesBuilt=true;
    function add(name,id){
      if(!name||NAME_ID[name])return;
      NAME_ID[name]=id;NAME_KEYS.push(name);
    }
    if(typeof CLASSMATES!=='undefined'&&CLASSMATES){
      for(var k in CLASSMATES){
        if(CLASSMATES.hasOwnProperty(k))add(CLASSMATES[k].name,k);
      }
    }
    if(typeof TEACHER_NAMES!=='undefined'&&TEACHER_NAMES){
      for(var k2 in TEACHER_NAMES){
        if(TEACHER_NAMES.hasOwnProperty(k2))add(TEACHER_NAMES[k2],k2);
      }
    }
    // 复合称呼（比单名长，排序后优先匹配）
    add('韩鹏老师','hanpeng');add('韩杰老师','hanjie');
    add('周蕊老师','zhourui');add('史鉴明老师','shijianming');
    add('李心瑶老师','lixinyao');add('Tania老师','tania');
    add('Cherry老师','cherry');add('宋俊丽老师','songjunli');
    add('李国瑞老师','liguorui');
    // 无立绘但需要名字牌的
    add('教官','jingguan');add('辅导员','fudaoyuan');add('助导','zhudao');
    add('老妈','mom');add('学姐','xuejie');add('学长','xuezhang');
    add('班主任','banzhuren');add('主持人','zhuchiren');
    // 长名优先
    NAME_KEYS.sort(function(a,b){return b.length-a.length;});
  }

  /** 在引号前后文里找说话人 */
  function findSpeaker(before,after){
    buildNames();
    var b=String(before||'').slice(-26);
    var best=null,bestIdx=-1;
    for(var i=0;i<NAME_KEYS.length;i++){
      var nm=NAME_KEYS[i];
      var idx=b.lastIndexOf(nm);
      if(idx>=0&&idx>bestIdx){bestIdx=idx;best=NAME_ID[nm];}
    }
    if(best)return best;
    // 引号后紧跟"某某说/问/道"
    var a=String(after||'').slice(0,14).replace(/^[\s，,。：:、！!？?]*/,'');
    for(var j=0;j<NAME_KEYS.length;j++){
      var nm2=NAME_KEYS[j];
      if(a.indexOf(nm2)===0)return NAME_ID[nm2];
    }
    return null;
  }

  var QUOTE_RE=/[“「『]([^“”「」『』]{1,180})[”」』]/g;
  var STRAIGHT_RE=/"([^"]{1,150})"/g;

  function isMeaningful(s){
    return String(s||'').replace(/[\s，,。、；;：:—…\-—·（）()【】\[\]]/g,'').length>1;
  }

  /**
   * 把一段散文解析为 [{narr}|{who,text}] 的片段数组
   * 支持中文引号 “” 「」 『』 与西文引号 ""
   */
  function parseParagraph(para,focus){
    var out=[],last=0,m,re;
    // 先处理中文引号
    re=QUOTE_RE;re.lastIndex=0;
    var used=false;
    while((m=re.exec(para))!==null){
      used=true;
      var before=para.slice(last,m.index);
      var after=para.slice(re.lastIndex);
      if(isMeaningful(before))out.push({narr:before.trim()});
      out.push({who:findSpeaker(before,after)||focus||null,text:m[1]});
      last=re.lastIndex;
    }
    if(!used){
      // 再尝试西文引号
      var out2=[],last2=0,m2;
      STRAIGHT_RE.lastIndex=0;
      while((m2=STRAIGHT_RE.exec(para))!==null){
        var b2=para.slice(last2,m2.index);
        var a2=para.slice(STRAIGHT_RE.lastIndex);
        if(isMeaningful(b2))out2.push({narr:b2.trim()});
        out2.push({who:findSpeaker(b2,a2)||focus||null,text:m2[1]});
        last2=STRAIGHT_RE.lastIndex;
      }
      if(out2.length){
        if(isMeaningful(para.slice(last2)))out2.push({narr:para.slice(last2).trim()});
        return out2;
      }
      return [{narr:para.trim()}];
    }
    var tail=para.slice(last);
    if(isMeaningful(tail))out.push({narr:tail.trim()});
    return out.length?out:[{narr:para.trim()}];
  }

  /**
   * 把剧本正文转成一串 VN 节拍。
   * ctx: {focus, bg, emo}
   */
  function proseBeats(text,ctx){
    var beats=[];
    if(text==null)return beats;
    ctx=ctx||{};
    var str=String(text);
    if(!str.trim())return beats;
    var paras=str.split(/\n{2,}/);
    for(var i=0;i<paras.length;i++){
      var para=paras[i];
      if(!para.trim())continue;
      var segs=parseParagraph(para,ctx.focus);
      for(var j=0;j<segs.length;j++){
        var s=segs[j];
        if(s.narr){
          // 旁白内部若还有单换行，拆成多条，节奏更好
          var lines=s.narr.split(/\n+/);
          for(var L=0;L<lines.length;L++){
            var t=lines[L].replace(/\s+$/,'');
            if(t.trim())beats.push(VN.narr(t));
          }
        }else{
          var who=s.who||ctx.focus||null;
          if(who)ctx.focus=who;
          if(who)beats.push(VN.say(who,s.text,{emo:ctx.emo||null}));
          else beats.push(VN.narr('「'+s.text+'」'));
        }
      }
    }
    return beats;
  }

  // ----------------------------------------------------------
  //  背景推断
  // ----------------------------------------------------------
  var BG_RULES=[
    [/(录取通知书|烫金|邮件的文件)/,'home'],
    [/(樱花|花瓣雨)/,'sakura_path'],
    [/(军训|迷彩|军姿|队列|正步|拉歌|方阵|教官|操场|跑道|汇演|立正)/,'playground'],
    [/(图书馆|阅览室|书架|借书)/,'library'],
    [/(自习室|晚自习|刷题)/,'study_room'],
    [/(海边|沙滩|海浪|海风|看海|灯塔|北戴河)/,'sea_day'],
    [/(食堂|打饭|餐盘|打了一勺)/,'canteen'],
    [/(宿舍|寝室|鹏远公寓|床铺|被窝|室友)/,'dorm'],
    [/(报告厅|讲座|礼堂|宣讲)/,'lecture_hall'],
    [/(舞台|演出|聚光灯|话剧|Drama|合唱|彩排|谢幕|台下)/,'stage'],
    [/(办公室|辅导员|教务窗口|一站式)/,'office'],
    [/(实验室|机房|代码|编程|C\+\+|程序|调试)/,'lab'],
    [/(社团|活动室|体育馆|球场|文艺部)/,'gym'],
    [/(超市|便利店|货架)/,'supermarket'],
    [/(医务室|体检|医院|南校区)/,'infirmary'],
    [/(车站|火车|高铁|返程|候车)/,'station'],
    [/(回到家|家里|老妈|沙发|客厅|返乡)/,'home'],
    [/(公园|湖畔|凉亭|园林)/,'park'],
    [/(下雪|雪花|暴雪)/,'snow_path'],
    [/(黄昏|傍晚|夕阳|日落|余晖)/,'sunset_path'],
    [/(夜市|街道|路边摊|商场|闹市)/,'street_night'],
    [/(天台|楼顶)/,'rooftop'],
    [/(校门|报到|迎新|横幅|新生统一报到)/,'campus_gate'],
    [/(教室|课堂|上课|板书|黑板|讲台|点名|课桌)/,'classroom'],
    [/(林荫|小路|路上|校园里|校道|校园内)/,'campus_path'],
    [/(下雨|暴雨|雨里|雨中|撑着伞)/,'rain_street']
  ];

  var NIGHT_RE=/(夜晚|夜里|深夜|晚间|晚上|月光|月色|星空|繁星|入夜|灯下|半夜|凌晨|晚安|路灯)/;
  var NIGHT_VARIANT={
    playground:'playground_night',dorm:'dorm_night',classroom:'classroom_night',
    sea_day:'sea_night',campus_path:'street_night',campus_gate:'street_night',
    library:'study_room',lecture_hall:'study_room',office:'classroom_night',
    gym:'classroom_night',park:'street_night',canteen:'classroom_night'
  };

  function hasBg(key){
    return typeof BGS!=='undefined'&&BGS&&BGS.has&&BGS.has(key);
  }

  /** 根据阶段信息推断背景 key */
  function pickBg(ph,extra){
    var probe='';
    if(ph){
      probe=[ph.title||'',ph.tag||'',String(ph.text||ph.text_applied||'').slice(0,320)].join(' ');
    }
    if(extra)probe+=' '+extra;
    var bg=null;
    for(var i=0;i<BG_RULES.length;i++){
      if(BG_RULES[i][0].test(probe)){bg=BG_RULES[i][1];break;}
    }
    if(!bg)bg='campus_path';
    // 夜间变体
    if(NIGHT_RE.test(probe)){
      var v=NIGHT_VARIANT[bg];
      if(v&&hasBg(v))bg=v;
      else if(!/_night$/.test(bg)&&hasBg(bg+'_night'))bg=bg+'_night';
    }
    if(!hasBg(bg)){
      var fallback=bg.replace(/_night$/,'');
      if(hasBg(fallback))bg=fallback;
      else bg='black_soft';
    }
    if(!hasBg(bg))bg='black';
    return bg;
  }

  /** 背景 → BGM 情绪 */
  var BGM_RULES=[
    [/(sakura|sea_night|rooftop|sunset)/,'romantic'],
    [/(stage)/,'drama'],
    [/(playground)/,'daily'],
    [/(snow|rain|classroom_night|black_soft)/,'sad'],
    [/(lab|library|study_room)/,'daily'],
    [/(street_night)/,'daily']
  ];
  function pickBgm(bg,tone){
    if(tone)return tone;
    for(var i=0;i<BGM_RULES.length;i++){
      if(BGM_RULES[i][0].test(String(bg||'')))return BGM_RULES[i][1];
    }
    return 'daily';
  }

  /** 背景 → 天气粒子 */
  function pickWeather(bg){
    if(/snow/.test(bg))return 'snow';
    if(/rain/.test(bg))return 'rain';
    if(/sakura/.test(bg))return 'sakura';
    if(/sea_night|street_night|rooftop/.test(bg))return 'star';
    if(/park|sunset/.test(bg))return 'leaf';
    return null;
  }

  // ----------------------------------------------------------
  //  CG 触发规则
  //  匹配优先级：日期 + 标题关键字
  // ----------------------------------------------------------
  var CG_RULES=[
    {id:'cg_letter',     title:'录取通知书',
     when:function(dk,ph,key){return key==='prologue';}},
    {id:'cg_enroll',     title:'东秦报到日',
     when:function(dk,ph,key){return key==='sep7_stage1';}},
    {id:'cg_sakura',     title:'樱花树下',
     when:function(dk,ph){return dk==='2024-09-21'&&/关键节点|恋爱|表白|心动/.test((ph.title||'')+(ph.tag||''));}},
    {id:'cg_training',   title:'军训烈日',
     when:function(dk,ph){return dk==='2024-09-15'&&/军训第一天/.test(ph.title||'');}},
    {id:'cg_midautumn',  title:'中秋海月',
     when:function(dk,ph){return dk==='2024-09-15'&&/中秋月圆之夜/.test(ph.title||'');}},
    {id:'cg_confess',    title:'告白',
     when:function(dk,ph){return /表白|告白|心意/.test((ph.title||'')+(ph.tag||''))&&GS&&GS.gfUnlocked;}},
    {id:'cg_library',    title:'图书馆的午后',
     when:function(dk,ph){return /图书馆|自习/.test((ph.title||'')+(ph.tag||''));}},
    {id:'cg_rain',       title:'雨中的教学楼',
     when:function(dk,ph){return dk==='2024-10-14'&&/早晨|新的一天/.test(ph.title||'');}},
    {id:'cg_competition',title:'晨曦杯·赛场',
     when:function(dk,ph){return /ACM|选拔赛|晨曦杯|竞赛/.test((ph.title||'')+(ph.tag||''));}},
    {id:'cg_drama',      title:'Drama 舞台',
     when:function(dk,ph){return /Drama|话剧|暗恋桃花源/.test((ph.title||'')+(ph.tag||''));}},
    {id:'cg_night_talk', title:'宿舍楼下的夜谈',
     when:function(dk,ph){return /月下|夜谈|长椅|路灯下|散步/.test((ph.title||'')+(ph.tag||''))&&GS&&GS.gfUnlocked;}},
    {id:'cg_holiday',    title:'国庆旅途',
     when:function(dk,ph){return dk&&/^2024-10-0[1-7]$/.test(dk)&&GS&&GS.holidayRoute==='couple';}},
    {id:'cg_graduation', title:'毕业那天',
     when:function(dk,ph){return /毕业|结业|离别/.test((ph.title||'')+(ph.tag||''));}}
  ];

  function cgFor(dk,ph,key){
    if(typeof CGS==='undefined'||!CGS)return null;
    for(var i=0;i<CG_RULES.length;i++){
      var r=CG_RULES[i];
      try{
        if(r.when(dk,ph||{},key)&&CGS.has(r.id))return r;
      }catch(e){}
    }
    return null;
  }

  // ----------------------------------------------------------
  //  角色 id 辅助
  // ----------------------------------------------------------
  var ALIAS={
    '苏小暖':'suxiaonuan','虎爷':'huye','奶扣':'naikou','京爷':'jingye',
    '韩鹏':'hanpeng','Tania':'tania','史鉴明':'shijianming','周蕊':'zhourui',
    '韩杰':'hanjie','Cherry':'cherry','李国瑞':'liguorui','宋俊丽':'songjunli',
    '李心瑶':'lixinyao','老妈':'mom'
  };
  function charName(id){
    if(!id)return '';
    if(typeof SPRITES!=='undefined'&&SPRITES&&SPRITES.meta){
      var m=SPRITES.meta(id);
      if(m&&m.name)return m.name;
    }
    if(typeof CLASSMATES!=='undefined'&&CLASSMATES&&CLASSMATES[id])return CLASSMATES[id].name;
    if(typeof TEACHER_NAMES!=='undefined'&&TEACHER_NAMES&&TEACHER_NAMES[id])return TEACHER_NAMES[id];
    var ex={mom:'老妈',jingguan:'教官',fudaoyuan:'辅导员',zhudao:'助导',xuejie:'学姐',player:'我'};
    return ex[id]||id;
  }
  function gfId(){
    if(!GS)return 'suxiaonuan';
    if(GS.girlfriends&&GS.girlfriends.length>0)return GS.girlfriends[0].id;
    return GS.gfId||'suxiaonuan';
  }

  /** 判断角色是否有立绘 */
  function hasSprite(id){
    return typeof SPRITES!=='undefined'&&SPRITES&&SPRITES.has&&SPRITES.has(id);
  }

  /** 显示立绘（若存在），否则静默忽略 */
  function showIf(id,emo,pos){
    if(!id||!hasSprite(id))return VN.narr('');
    return VN.show(id,{emo:emo||'normal',pos:pos||'center'});
  }

  /** 生成"切换背景 + 天气"的节拍组 */
  function sceneBeats(bg,opt){
    opt=opt||{};
    var beats=[];
    beats.push(VN.bg(bg,{ms:opt.ms||560}));
    var w=opt.weather!==undefined?opt.weather:pickWeather(bg);
    beats.push(VN.weather(w,1));
    return beats;
  }

  /**
   * 扫描一段文本里提到的角色，按首次出现顺序返回 id 列表。
   * 用于"剧情涉及某角色时自动让其立绘登场"。
   */
  function castOf(text,limit){
    buildNames();
    var str=String(text||'');
    if(!str)return [];
    var found=[];
    for(var i=0;i<NAME_KEYS.length;i++){
      var nm=NAME_KEYS[i];
      var id=NAME_ID[nm];
      if(!id)continue;
      var at=str.indexOf(nm);
      if(at>=0)found.push({id:id,at:at});
    }
    found.sort(function(a,b){return a.at-b.at;});
    var out=[],seen={};
    for(var j=0;j<found.length;j++){
      if(seen[found[j].id])continue;
      seen[found[j].id]=1;
      out.push(found[j].id);
      if(out.length>=(limit||3))break;
    }
    return out;
  }

  return {
    buildNames:buildNames,
    castOf:castOf,
    proseBeats:proseBeats,
    parseParagraph:parseParagraph,
    pickBg:pickBg,
    pickBgm:pickBgm,
    pickWeather:pickWeather,
    cgFor:cgFor,
    charName:charName,
    gfId:gfId,
    hasSprite:hasSprite,
    showIf:showIf,
    sceneBeats:sceneBeats,
    ALIAS:ALIAS
  };
})();


/* ============================================================
   第二部分：存档核心（消除原三处重复的字段清单）
   ============================================================ */
function collectSaveData(){
  var keys=['year','month','day','health','happiness','wisdom','charm','glory','money',
    'singing','performance','hasPengyuanCard','hasPhoneCard','talentPerformed','talentSuccess',
    'wonElection','tuanxiaoApplied','tuanxiaoAccepted','dachuangJoined','hanpengHaoGan',
    'cet4Applied','deskBought','clubApplied','clubType','keChuangUnlocked','sheTuanUnlocked',
    'tuanxiaoWeekBan','gfUnlocked','gfName','gfFavor','gfId','inventory','phase','currentNode',
    'currentDay','currentPhaseIdx','pengyuanBalance','tuanxiaoWisdomPending','teacherFavor',
    'classmateFavor','lastMealDay','breakupProb','courseGrades','courseUnlocked','taniaFavor','shijianmingFavor',
    'zhouruiFavor','hanpengUnlocked','taniaUnlocked','shijianmingUnlocked','zhouruiUnlocked',
    'weekendEventReduction','holidayRoute','hanjieFavor','cherryFavor','liguoruiFavor',
    'hanjieUnlocked','cherryUnlocked','liguoruiUnlocked','songjunliFavor','songjunliUnlocked',
    'lixinyaoFavor','lixinyaoUnlocked','acmRegistered','lastBonusDay','weather',
    'putonghuaRegistered','zhuchirenRegistered','stocksUnlocked','holdings','stockPrices',
    'lastStockDay','stockPrevPrices','stockHistory','stockTrades','zaocaoExempt','girlfriends',
    'storyLog','_dramaTeam','_dramaName','campusRunKm','phone','_weeklyActivityCount',
    '_phoneInitialized','_holidayGfId',
    // Drama 组队的中间进度：不存会导致读档后邀请名单与已邀人数丢失，
    // 玩家要重新邀请一遍全部同学。
    '_dramaAssembled','_dramaInvited','_dramaPending',
    // 立绘互动的每日次数
    '_spriteInteract',
    // 校园猫养成：各猫好感 / 今日出没 / 当日掷骰标记
    'cats','catsToday','_catDay',
    // 随堂测验的稳定判定结果（配合 condSkip 使用）
    '_cppQuizRoll','_moralQuizRoll','_taniaQuizRoll'];
  var d={v:4};
  if(!GS)return d;
  for(var i=0;i<keys.length;i++){
    var k=keys[i];
    if(typeof GS[k]!=='undefined')d[k]=GS[k];
  }
  return d;
}

function applySaveData(d){
  if(!d)return;
  GS=defaultState();
  Object.assign(GS,d);
  GS.phase=d.phase||'daily';
  if(typeof VN!=='undefined'&&VN)VN.clearStage();
  var ap=document.getElementById('attr-panel');if(ap)ap.style.display='block';
  var bb=document.getElementById('bottom-bar');if(bb)bb.style.display='none';
  updatePanel();
  if(typeof renderBottomBar==='function')renderBottomBar();
  if(GS.phase==='story'&&GS.currentNode&&STORY_NODES[GS.currentNode]){
    renderStoryNode(STORY_NODES[GS.currentNode]);
  }else{
    processDay();
  }
}


/* ============================================================
   第三部分：覆盖渲染层
   ============================================================ */

// ---------- 阶段切换 ----------
function setPhase(p){
  GS.phase=p;
  var ap=document.getElementById('attr-panel');
  var hud=document.getElementById('vn-toolbar');
  var show=function(el,on){ if(el)el.style.display=on?'':'none'; };
  var inGame=(p==='story'||p==='daily');
  show(ap,inGame);
  show(hud,inGame);
  // 旧容器保持隐藏（兼容残留调用）
  var bb=document.getElementById('bottom-bar');
  if(bb)bb.style.display='none';
  var ma=document.getElementById('main-area');
  if(ma)ma.innerHTML='';
  var ca=document.getElementById('choices-area');
  if(ca)ca.innerHTML='';
}

// 旧的底部按钮条在 VN 中由工具栏取代
function renderBottomBar(){
  var bb=document.getElementById('bottom-bar');
  if(bb)bb.innerHTML='';
}

// 结果弹窗：统一走 VN 风格卡片
function showPopup(title,resultText,changes,hiddenInfo,callback,btnLabel){
  VN.popup(title,resultText,changes,hiddenInfo,callback,btnLabel);
}


/* ------------------------------------------------------------
   标题画面 / 开局
   ------------------------------------------------------------ */
function renderTitle(){
  GS=defaultState();
  setPhase('title');
  if(typeof VN!=='undefined'&&VN)VN.clearStage();
  var ap=document.getElementById('attr-panel');if(ap)ap.style.display='none';
  var tb=document.getElementById('vn-toolbar');if(tb)tb.style.display='none';
  // 注意：VN.bg / VN.weather / VN.bgm 是"节拍构造器"，只返回对象；
  // 必须交给 VN.run 才会真正执行。
  VN.run([
    VN.bg('campus_gate',{instant:true}),
    VN.weather('sakura',0.7),
    VN.bgm('title')
  ]);
  var host=document.getElementById('vn-title-screen');
  if(!host)return;
  var owned=VN.cgCount();
  var total=(typeof CGS!=='undefined'&&CGS&&CGS.list)?CGS.list().length:0;
  host.style.display='flex';
  host.innerHTML=
    '<div class="vts-inner">'+
      '<div class="vts-kicker">NEUQ · CAMPUS LIFE</div>'+
      '<h1 class="vts-title">东秦校园人生</h1>'+
      '<div class="vts-sub">—— 视觉小说 · 大学生涯模拟 ——</div>'+
      '<div class="vts-desc">你是一名东秦大学 2024 级本科新生。<br>'+
        '从收到录取通知书的那一刻起，<br>'+
        '你将在校园中度过充满选择与成长的四年时光。<br>'+
        '每一次选择，都将塑造独一无二的你。</div>'+
      '<div class="vts-btns">'+
        '<button class="vts-btn vts-main" id="vts-new">▶ 开始新游戏</button>'+
        '<button class="vts-btn" id="vts-load">📂 读取存档</button>'+
        '<button class="vts-btn" id="vts-gal">🎨 CG 鉴赏 <span class="vts-badge">'+owned+'/'+total+'</span></button>'+
        '<button class="vts-btn" id="vts-set">⚙️ 设置</button>'+
      '</div>'+
      '<div class="vts-foot">A 自动 · Ctrl 跳过 · H 隐藏界面 · L 回想<br>存档自动保存至浏览器本地</div>'+
    '</div>';
  var q=function(id){return host.querySelector('#'+id);};
  if(q('vts-new'))q('vts-new').addEventListener('click',function(){VN._se('confirm');startNewGame();});
  if(q('vts-load'))q('vts-load').addEventListener('click',function(){VN._se('click');VNHUD.openSlots('load');});
  if(q('vts-gal'))q('vts-gal').addEventListener('click',function(){VN._se('click');VNHUD.openGallery();});
  if(q('vts-set'))q('vts-set').addEventListener('click',function(){VN._se('click');VNHUD.openSettings();});
}

function startNewGame(){
  var host=document.getElementById('vn-title-screen');
  if(host)host.style.display='none';
  GS=defaultState();
  GS.phase='allocation';
  GS.health=30;GS.happiness=30;GS.wisdom=30;GS.charm=30;
  renderAllocation();
}

function renderAllocation(){
  setPhase('allocation');
  var ap=document.getElementById('attr-panel');if(ap)ap.style.display='none';
  var tb=document.getElementById('vn-toolbar');if(tb)tb.style.display='none';
  var host=document.getElementById('vn-title-screen');
  if(!host)return;
  VN.run([
    VN.bg('dorm',{instant:true}),
    VN.weather(null),
    VN.bgm('daily')
  ]);
  var rem=400-GS.health-GS.happiness-GS.wisdom-GS.charm;
  var attrs=[
    {key:'health',icon:'❤️',name:'健康',desc:'体魄与精力'},
    {key:'happiness',icon:'😊',name:'幸福',desc:'情绪与满足感'},
    {key:'wisdom',icon:'📖',name:'悟性',desc:'学习与理解力'},
    {key:'charm',icon:'✨',name:'魅力',desc:'社交与表达力'}
  ];
  var html='<div class="vts-inner vts-alloc">'+
    '<h2 class="vts-h2">📋 初始属性分配</h2>'+
    '<div class="vts-desc">四项核心属性初始总和为 400 点，请自由分配（单项最低 30 点）</div>'+
    '<div class="vts-remain">剩余可分配点数：<b id="remain-pts">'+rem+'</b></div>';
  for(var i=0;i<attrs.length;i++){
    var a=attrs[i];
    html+='<div class="vts-row">'+
      '<div class="vts-row-info"><span class="vts-row-icon">'+a.icon+'</span>'+
      '<div><div class="vts-row-name">'+a.name+'</div><div class="vts-row-desc">'+a.desc+'</div></div></div>'+
      '<div class="vts-row-ctl">'+
        '<button '+(GS[a.key]<=30?'disabled':'')+' data-k="'+a.key+'" data-d="-5">−</button>'+
        '<span class="vts-row-val" id="val-'+a.key+'">'+GS[a.key]+'</span>'+
        '<button '+(rem<=0?'disabled':'')+' data-k="'+a.key+'" data-d="5">＋</button>'+
      '</div></div>';
  }
  html+='<button class="vts-btn vts-main vts-confirm" id="confirm-alloc"'+(rem!==0?' disabled':'')+'>确认分配 · 开始大学生涯</button></div>';
  host.style.display='flex';
  host.innerHTML=html;
  host.querySelectorAll('.vts-row-ctl button').forEach(function(b){
    b.addEventListener('click',function(){
      adjustAttr(b.getAttribute('data-k'),parseInt(b.getAttribute('data-d'),10));
    });
  });
  var cf=host.querySelector('#confirm-alloc');
  if(cf)cf.addEventListener('click',function(){
    if(cf.disabled)return;
    VN._se('confirm');
    confirmAllocation();
  });
}

function adjustAttr(key,delta){
  var rem=400-GS.health-GS.happiness-GS.wisdom-GS.charm;
  var nv=GS[key]+delta;
  if(delta>0&&rem<=0)return;
  if(delta<0&&nv<30)return;
  if(delta>0&&rem<delta)return;
  GS[key]=nv;
  VN._se('click');
  renderAllocation();
}

function confirmAllocation(){
  if((GS.health+GS.happiness+GS.wisdom+GS.charm)!==400)return;
  var host=document.getElementById('vn-title-screen');
  if(host){host.style.display='none';host.innerHTML='';}
  GS.phase='story';GS.currentNode='prologue';
  GS.year=2024;GS.month=8;GS.day=15;
  var ap=document.getElementById('attr-panel');if(ap)ap.style.display='';
  var tb=document.getElementById('vn-toolbar');if(tb)tb.style.display='';
  updatePanel();
  renderStoryNode(STORY_NODES.prologue);
  saveGame();
}


/* ------------------------------------------------------------
   §3 故事节点（开学报到链）
   ------------------------------------------------------------ */
function renderStoryNode(node){
  if(!node)return;
  setPhase('story');
  if(node.date){GS.year=node.date[0];GS.month=node.date[1];GS.day=node.date[2];}
  updatePanel();

  var dk=dateKey(GS.year,GS.month,GS.day);
  var key=null;
  for(var k in STORY_NODES){
    if(STORY_NODES.hasOwnProperty(k)&&STORY_NODES[k]===node){key=k;break;}
  }
  if(!key&&GS.currentNode)key=GS.currentNode;

  var beats=[];
  var bg=VNA.pickBg(node,node.text);
  beats=beats.concat(VNA.sceneBeats(bg));
  beats.push(VN.bgm(key==='prologue'?'title':VNA.pickBgm(bg)));

  // 关键剧情 CG
  var cg=VNA.cgFor(dk,null,key);
  if(cg){
    beats.push(VN.cg(cg.id,{title:cg.title}));
    beats.push(VN.fx(cg.id==='cg_letter'?'flashGold':'flash'));
    beats.push(VN.cgHide());
  }

  beats.push(VN.title(node.title,fmtDate(GS.year,GS.month,GS.day)));

  // 前几幕让苏小暖以外的主角团登场
  if(key==='sep7_stage3'){
    beats.push(VN.narr('推开宿舍门，三个陌生的面孔同时抬起头来。'));
  }
  if(key==='sep7_stage3'&&VNA.hasSprite('huye'))beats.push(VN.show('huye',{emo:'happy',pos:'right'}));
  if(key==='sep7_stage3'&&VNA.hasSprite('naikou'))beats.push(VN.show('naikou',{emo:'normal',pos:'left'}));

  beats=beats.concat(VNA.proseBeats(node.text,{}));

  if(node.choices&&node.choices.length>0){
    beats.push(VN.choice('',node.choices.map(function(c,i){
      return {text:c.text,hint:choiceHint(c)};
    }),function(o,i){
      processSep7Choice(node,i);
    }));
    VN.run(beats);
    return;
  }

  beats.push(VN.call(function(){
    VN.hideAllNow();
  }));
  beats.push(VN.choice('',[{text:'继续 ▶',hint:''}],function(){
    if(node.dateJump){GS.year=node.dateJump[0];GS.month=node.dateJump[1];GS.day=node.dateJump[2];}
    if(node.enterDaily){enterScriptedDays();return;}
    if(node.autoNext){GS.currentNode=node.autoNext;renderStoryNode(STORY_NODES[node.autoNext]);saveGame();}
  }));
  VN.run(beats);
}

/** 为选项生成一句提示（来自 effects / hidden） */
function choiceHint(c){
  if(!c)return '';
  var bits=[];
  if(c.effects){for(var k in c.effects){if(c.effects.hasOwnProperty(k)&&c.effects[k])bits.push(effLabel(k,c.effects[k]));}}
  if(c.sEffects){for(var k2 in c.sEffects){if(c.sEffects.hasOwnProperty(k2)&&c.sEffects[k2])bits.push(effLabel(k2,c.sEffects[k2]));}}
  if(c.hidden&&c.hidden.effects){for(var k3 in c.hidden.effects){if(c.hidden.effects.hasOwnProperty(k3)&&c.hidden.effects[k3])bits.push('？'+effLabel(k3,c.hidden.effects[k3]));}}
  if(c.risk)bits.push('⚠ 有风险');
  if(c.cond)bits.push('🎲 依属性判定');
  if(c.prob)bits.push('🎲 依概率判定');
  return bits.join(' · ');
}
function effLabel(k,v){
  var nm=(typeof ATTR!=='undefined'&&ATTR[k])||k;
  var ic=(typeof ICON!=='undefined'&&ICON[k])||'';
  return ic+' '+nm+(v>0?' +':' ')+v;
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
  _logCtx={choice:c.text};
  showPopup(node.title,rt,changes,hiddenInfo,function(){
    updatePanel();
    if(c.next&&STORY_NODES[c.next]){GS.currentNode=c.next;renderStoryNode(STORY_NODES[c.next]);saveGame();}
    else if(node.choices[0].next&&STORY_NODES[node.choices[0].next]){GS.currentNode=node.choices[0].next;renderStoryNode(STORY_NODES[node.choices[0].next]);saveGame();}
    else{ /* 无后继：留在原地 */ }
  });
}


/* ------------------------------------------------------------
   日常流程
   ------------------------------------------------------------ */
function renderDayTitle(dayData){
  var wd=weekday(GS.year,GS.month,GS.day);
  var dk=dateKey(GS.year,GS.month,GS.day);
  var bg=VNA.pickBg({title:dayData.title,text:''},'');
  var beats=VNA.sceneBeats(bg);
  beats.push(VN.title(dayData.title,fmtDate(GS.year,GS.month,GS.day)+'　星期'+wd));
  var nb=newsBeat(); if(nb)beats.push(nb);
  beats.push(VN.call(function(){
    if(GS.weather&&typeof FX!=='undefined'&&FX){
      // 天气粒子
      var w=GS.weather.key;
      if(w==='rain'||w==='thunderstorm')FX.weather('rain',1);
      else if(w==='snow'||w==='blizzard')FX.weather('snow',1);
      else FX.weather(null);
    }
    updatePanel();
  }));
  VN.run(beats);
}

function renderDayPhase(dayData,idx){
  if(!dayData||!dayData.phases){finishDay(dayData);return;}
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
  if(!ph){renderDayPhase(dayData,idx+1);return;}
  if(ph.condSkip&&ph.condSkip()){renderDayPhase(dayData,idx+1);return;}

  var dk=dateKey(GS.year,GS.month,GS.day);
  try{
    if(ph.type==='auto')       return vnAutoPhase(dayData,ph,idx,dk);
    if(ph.type==='conditional')return vnCondPhase(dayData,ph,idx,dk);
    if(ph.type==='random')     return vnRandomPhase(dayData,ph,idx,dk);
  }catch(e){
    if(window.console)console.error('[VN] phase error',e);
    renderDayPhase(dayData,idx+1);
    return;
  }
  // main / evening
  vnMainPhase(dayData,ph,idx,dk);
}

/**
 * 每日新闻节拍：新的一天开始时在屏幕中央播放当日校园快讯。
 * 没有当日新闻时返回 null（调用方自行忽略）。
 */
function newsBeat(){
  if(typeof DAILY_NEWS==='undefined'||!DAILY_NEWS||!GS)return null;
  var dk=dateKey(GS.year,GS.month,GS.day);
  var news=DAILY_NEWS[dk];
  if(!news)return null;
  return VN.news(news,{date:fmtDate(GS.year,GS.month,GS.day)+'　星期'+weekday(GS.year,GS.month,GS.day)});
}

/** 阶段入场：背景 + BGM + CG + 标题卡 */
function phaseIntro(ph,dk,opt){
  opt=opt||{};
  var probe=String(ph.text||ph.text_applied||'')+' '+(ph.title||'')+' '+(ph.tag||'');
  if(ph._textGen){try{probe+=' '+String(ph._textGen()||'').slice(0,200);}catch(e){}}
  var bg=opt.bg||VNA.pickBg(ph,probe);
  // 同步手机里的游戏内时钟，让"深夜打电话""查寝"等判定与本阶段时段一致
  if(typeof phoneSetClock==='function'){
    var h=10;
    if(/_night$|black_soft|street_night/.test(bg))h=22;
    else if(/sunset/.test(bg))h=18;
    else if(/早晨|清晨|早八/.test(probe))h=8;
    else if(/上午/.test(probe))h=10;
    else if(/下午|午间|午后/.test(probe))h=15;
    else if(/晚间|夜晚|夜|晚自习/.test(probe))h=21;
    phoneSetClock(h);
  }
  var beats=VNA.sceneBeats(bg);
  if(!opt.noBgm){
    // 校歌 / 合唱场景用真实录音（schoolmusic.mp3），其余走合成 BGM。
    // 这里用无条件 bgm 而非 bgmIf：合唱结束后下一个阶段才能把音乐切回来。
    // 只要正文/标题里出现"合唱"就算合唱场景 —— 军训每天晚上都有
    // 「晚间统一合唱活动」（CHORUS 模板），10.10 有「班级合唱训练」，
    // 10.11/10.12 有彩排与正式比赛。之前只匹配"合唱训练/合唱彩排/合唱比赛"
    // 这类具体说法，导致军训期间的晚间合唱**没有**切到校歌。
    // 唯一排除的是「中秋晚会合唱负责人选举」——那是选举，不是练歌。
    var songScene=/合唱|校歌|练歌|拉歌/.test(probe)
                  &&!/选举/.test(ph.title||'');
    beats.push(VN.bgm(songScene?'schoolsong':VNA.pickBgm(bg,opt.tone)));
  }
  // 场景氛围音：按背景与正文关键词挑一个环境音，让每个场景"有声音"
  var amb=null;
  if(/军训|队列|教官|军姿|正步|拉歌|汇演|方阵/.test(probe))amb='whistle';
  else if(/雷|暴雨/.test(probe))amb='thunder';
  else if(/下雨|雨天|雨幕|细雨/.test(probe))amb='rain';
  else if(/雪|寒风|刮风/.test(probe))amb='wind';
  else if(/海边|沙滩|海风|公园|银杏|樱花/.test(probe))amb='birds';
  else if(/食堂|夜市|人山人海|人群|操场.*比赛/.test(probe))amb='crowd';
  else if(/板书|黑板|讲台|笔记|听讲/.test(probe))amb='chalk';
  else if(/推门|敲门|回到宿舍|走进教室/.test(probe))amb='door';
  if(amb&&!opt.noAmb)beats.push(VN.se(amb));

  // ---- 立绘登场：本段剧情提到的角色自动上台 ----
  // 卡司按"首次被提到"的顺序取前 3 位；不在本场卡司里的立绘会被撤下，
  // 因此场景切换时画面自然更新，不会残留上一个场景的人。
  if(!opt.noCast){
    var cast=[],seen={},i;
    var cand=VNA.castOf(probe,5);
    var focusId=opt.focus||VNA.gfId();
    for(i=0;i<cand.length;i++){
      if(!VNA.hasSprite(cand[i]))continue;
      cast.push(cand[i]);
      seen[cand[i]]=1;
      if(cast.length>=3)break;
    }
    // 撤下不在本场卡司中的立绘
    var onstage=VN.activeSprites();
    for(i=0;i<onstage.length;i++){
      if(!seen[onstage[i]])beats.push(VN.hide(onstage[i]));
    }
    // 让本场角色登场（已在台上的只更新表情）
    var slot=0;
    for(i=0;i<cast.length;i++){
      var cid=cast[i];
      var pos;
      if(cid===focusId)pos='center';
      else pos=(slot%2===0)?'right':'left';
      slot++;
      if(VN.hasSpriteOn(cid))beats.push(VN.show(cid,{emo:'normal',pos:pos,se:false}));
      else beats.push(VN.show(cid,{emo:'normal',pos:pos,se:false}));
    }
  }
  // CG
  var cg=opt.noCg?null:VNA.cgFor(dk,ph,null);
  if(cg){
    beats.push(VN.cg(cg.id,{title:cg.title}));
    beats.push(VN.fx(/confess|sakura|midautumn|graduation/.test(cg.id)?'flashGold':'flash'));
    beats.push(VN.cgHide());
  }
  return beats;
}

function vnAutoPhase(dayData,ph,idx,dk){
  var eff=Object.assign({},ph.effects||{});
  if(ph.setFlags)Object.assign(GS,ph.setFlags);
  if(ph.gEffects){
    for(var gk in ph.gEffects){
      if(ph.gEffects.hasOwnProperty(gk)&&GS.courseGrades&&GS.courseGrades.hasOwnProperty(gk)){
        GS.courseGrades[gk]=Math.max(0,Math.min(100,GS.courseGrades[gk]+ph.gEffects[gk]));markCourseUnlocked(gk);
      }
    }
  }
  var changes=doEffects(eff);
  var txt=ph._textGen?ph._textGen():ph.text;

  var beats=phaseIntro(ph,dk,{});
  beats.push(VN.title(ph.title||'',ph.tag||''));
  beats=beats.concat(VNA.proseBeats(txt,{}));
  beats.push(VN.call(function(){
    updatePanel();
    _logCtx={choice:'（自动事件）'};
  }));
  beats.push(VN.popupBeat(ph.title||'','',changes,null,null,'我已知晓'));
  VN.run(beats,function(){renderDayPhase(dayData,idx+1);});
}

function vnCondPhase(dayData,ph,idx,dk){
  var condMet=true;
  if(ph.condCustom){try{condMet=!!ph.condCustom();}catch(e){condMet=false;}}
  else if(ph.condFlag){condMet=!!GS[ph.condFlag];}

  var text='',eff={},hiddenInfo=null;
  if(ph.isSpecial&&ph.specialType==='loveUnlock'){
    if(condMet){
      text=ph.text_applied;eff=Object.assign({},ph.sEffects||{});
      if(ph.sFlags)Object.assign(GS,ph.sFlags);
      if(ph.sHidden)hiddenInfo=ph.sHidden;
      text+='\n\n'+ph.sText;
    }else{
      text=ph.text_not;eff=Object.assign({},ph.fEffects||{});
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
        if(GS.clubType==='体育社团')eff={health:15,glory:8};
        else if(GS.clubType==='学院组织')eff={wisdom:12,glory:10};
        else if(GS.clubType==='图书管理员')eff={wisdom:14,happiness:9};
        else if(GS.clubType==='文艺部')eff={charm:13,singing:10};
      }else{text+='\n\n'+ph.fText;}
    }else{text=ph.text_not;}
  }else{
    if(condMet){
      text=ph.text_applied;
      var roll=Math.random();
      if(roll<ph.prob){
        eff=Object.assign({},ph.sEffects||{});
        text+='\n\n'+ph.sText;
        if(ph.sHidden)hiddenInfo=ph.sHidden;
        if(ph.sFlags)Object.assign(GS,ph.sFlags);
      }else{
        eff=Object.assign({},ph.fEffects||{});
        text+='\n\n'+ph.fText;
      }
    }else{
      text=ph.text_not||'你没有参与此事项。';
    }
  }
  var changes=doEffects(eff);
  var beats=phaseIntro(ph,dk,{tone:/雨课堂|签到|缺勤/.test(ph.title||'')?'tension':null});
  beats.push(VN.title(ph.title||'',ph.tag||''));
  beats=beats.concat(VNA.proseBeats(text,{}));
  beats.push(VN.call(function(){
    updatePanel();
    _logCtx={choice:'（系统判定）'};
  }));
  beats.push(VN.popupBeat(ph.title||'','',changes,hiddenInfo,null,'我已知晓'));
  VN.run(beats,function(){renderDayPhase(dayData,idx+1);});
}

function vnRandomPhase(dayData,ph,idx,dk){
  if(GS.tuanxiaoAccepted&&GS.tuanxiaoWeekBan>0&&isWeekend(GS.year,GS.month,GS.day)&&GS.month>=10&&!(GS.month===10&&GS.day>=1&&GS.day<=7)){
    VN.run([VN.narr('⚠️ 今天是周末，但因团校集训安排，随机事件不可用。')],
      function(){renderDayPhase(dayData,idx+1);});
    return;
  }
  var pool=RP[ph.pool];
  if(!pool||pool.length===0){renderDayPhase(dayData,idx+1);return;}
  var evt=pool[Math.floor(Math.random()*pool.length)];
  if(typeof evt==='function')evt=evt();
  if(!evt||!evt.choices){renderDayPhase(dayData,idx+1);return;}

  var beats=phaseIntro({title:evt.title,text:evt.text,tag:ph.tag},dk,{noCg:true});
  beats.push(VN.title(evt.title,ph.tag||'随机事件'));
  beats=beats.concat(VNA.proseBeats(evt.text,{}));
  beats.push(VN.choice('你打算怎么做？',evt.choices.map(function(ec){
    return {text:ec.text,hint:(ec.result?'':'')};
  }),function(o,ci){
    var ec=evt.choices[ci];
    var eff=Object.assign({},ec.effects||{});
    var changes=doEffects(eff);
    if(ec.cmFav){
      if(typeof ec.cmFav==='number'){
        var cmId=ec._cmId;
        if(cmId&&GS.classmateFavor&&GS.classmateFavor.hasOwnProperty(cmId)){
          var oldFav=GS.classmateFavor[cmId]||0;
          GS.classmateFavor[cmId]=Math.max(0,oldFav+ec.cmFav);
          changes[cmId+'Fav']=ec.cmFav;
        }
      }else{
        for(var id in ec.cmFav){
          if(ec.cmFav.hasOwnProperty(id)&&GS.classmateFavor&&GS.classmateFavor.hasOwnProperty(id)){
            var o2=GS.classmateFavor[id]||0;
            GS.classmateFavor[id]=Math.max(0,o2+ec.cmFav[id]);
            changes[id+'Fav']=ec.cmFav[id];
          }
        }
      }
    }
    _logCtx={choice:ec.text};
    showPopup(evt.title,ec.result||'',changes,null,function(){
      updatePanel();
      renderDayPhase(dayData,idx+1);
    });
  }));
  VN.run(beats);
}

function vnMainPhase(dayData,ph,idx,dk){
  var txt=ph._textGen?ph._textGen():ph.text;
  var chs=ph._choicesGen?ph._choicesGen():ph.choices;

  var beats=phaseIntro(ph,dk,{});
  beats.push(VN.title(ph.title||'',ph.tag||''));
  beats=beats.concat(VNA.proseBeats(txt,{focus:focusFor(ph)}));

  if(!chs||chs.length===0){
    beats.push(VN.call(function(){updatePanel();}));
    beats.push(VN.choice('',[{text:'我已知晓 ▶'}],function(){
      renderDayPhase(dayData,idx+1);
    }));
    VN.run(beats);
    return;
  }

  beats.push(VN.choice('你的选择是——',chs.map(function(pc){
    return {text:pc.text,hint:choiceHint(pc)};
  }),function(o,ci){
    vnApplyMainChoice(ph,chs[ci],ci,dayData,idx);
  }));
  VN.run(beats);
}

/** 主线选项的结算逻辑（与原实现保持一致） */
function vnApplyMainChoice(ph,pc,ci,dayData,idx){
  var eff=Object.assign({},pc.effects||{}),hiddenInfo=null;
  if(pc.hidden){
    hiddenInfo=pc.hidden.desc||'';
    if(pc.hidden.flags)Object.assign(GS,pc.hidden.flags);
    if(pc.hidden.effects)Object.assign(eff,pc.hidden.effects);
    if(pc.hidden.gEffects){
      for(var gk in pc.hidden.gEffects){
        if(pc.hidden.gEffects.hasOwnProperty(gk)&&GS.courseGrades&&GS.courseGrades.hasOwnProperty(gk)){
          GS.courseGrades[gk]=Math.max(0,Math.min(100,GS.courseGrades[gk]+pc.hidden.gEffects[gk]));markCourseUnlocked(gk);
        }
      }
    }
  }
  if(pc.flags)Object.assign(GS,pc.flags);
  var riskInfo=null;
  if(pc.risk&&Math.random()<pc.risk.chance){
    Object.assign(eff,pc.risk.effects||{});
    riskInfo=pc.risk.desc||'';
  }
  if(ph.quizCorrectIndex!==undefined){
    if(ci===ph.quizCorrectIndex){
      if(pc.correctEffects)Object.assign(eff,pc.correctEffects);
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
      Object.assign(eff,pc.sEffects||{});
      if(pc.sFlags)Object.assign(GS,pc.sFlags);
      if(pc.sHidden)hiddenInfo=hiddenInfo?hiddenInfo+' | '+pc.sHidden:pc.sHidden;
      pc._result=pc.sText;
    }else{
      Object.assign(eff,pc.fEffects||{});
      pc._result=pc.fText;
    }
  }
  if(pc.sleepBonus){
    var sb=getWeatherSleepBonus();
    if(Object.keys(sb).length>0){
      Object.assign(eff,sb);
      var br=pc._result||pc.result||'';
      pc._result=br+'\n\n🌧️ '+getWeatherSleepNarrative();
    }
  }
  // Drama 节目命名
  if(pc._dramaNamePrompt){
    var dramaName=prompt('请输入Drama节目名称：');
    if(!dramaName||dramaName.trim()==='')dramaName='未命名Drama';
    GS._dramaName=dramaName;
    pc._result='你们的Drama节目定名为：\n\n🎭 '+dramaName+'\n\n祝排练顺利，期末舞台大放光彩！';
  }
  // Drama 邀请
  if(pc._dramaCmId){
    if(!GS._dramaInvited)GS._dramaInvited=[];
    if(!GS._dramaPending)GS._dramaPending=[];
    GS._dramaInvited.push(pc._dramaCmId);
    var roll4=Math.random()*100;
    var succ2=roll4<pc._dramaRate;
    if(succ2)GS._dramaPending.push(pc._dramaCmId);
    var dramaResult='📨 邀请 '+CLASSMATES[pc._dramaCmId].name+'（好感'+pc._dramaFav+'，成功率'+Math.floor(pc._dramaRate)+'%，掷骰'+Math.floor(roll4)+'）\n→ '+(succ2?'✅ 接受了邀请！':'❌ 拒绝了邀请。')+'\n\n当前队伍：'+(GS._dramaPending.length||0)+'人 / 需4人';
    VN._se(succ2?'confirm':'cancel');
    showPopup('🎭 Drama组队',dramaResult,{},null,function(){
      updatePanel();renderDayPhase(dayData,idx);
    });
    return;
  }
  var allHidden=hiddenInfo;
  if(riskInfo)allHidden=allHidden?allHidden+' | '+riskInfo:riskInfo;
  var changes=doEffects(eff);
  if(pc.cmFav){
    if(typeof pc.cmFav==='number'){
      var cmIdP=pc._cmId;
      if(cmIdP&&GS.classmateFavor&&GS.classmateFavor.hasOwnProperty(cmIdP)){
        var oldFav4=GS.classmateFavor[cmIdP]||0;
        GS.classmateFavor[cmIdP]=Math.max(0,oldFav4+pc.cmFav);
        changes[cmIdP+'Fav']=pc.cmFav;
      }
    }else{
      for(var cmId2 in pc.cmFav){
        if(pc.cmFav.hasOwnProperty(cmId2)&&GS.classmateFavor&&GS.classmateFavor.hasOwnProperty(cmId2)){
          var old4=GS.classmateFavor[cmId2]||0;
          GS.classmateFavor[cmId2]=Math.max(0,old4+pc.cmFav[cmId2]);
          changes[cmId2+'Fav']=pc.cmFav[cmId2];
        }
      }
    }
  }
  _logCtx={choice:pc.text};
  showPopup(ph.title||'',pc._result||pc.result||'',changes,allHidden,function(){
    updatePanel();
    renderDayPhase(dayData,idx+1);
  });
}

/** 判断某个阶段是否应该聚焦到女友身上 */
function focusFor(ph){
  var probe=String(ph.title||'')+String(ph.tag||'')+String(ph.text||'').slice(0,160);
  if(/苏小暖|女友/.test(probe)&&GS&&GS.gfUnlocked)return VNA.gfId();
  return null;
}


/* ------------------------------------------------------------
   用餐
   ------------------------------------------------------------ */
function renderMealChoice(dk,callback){
  GS.lastMealDay=dk;
  var choices=[
    {text:'点外卖',hint:'💰-15 · 😊+5（有 10% 概率被偷）',
     effects:{money:-15,happiness:5},
     result:'你在外卖App上精挑细选，点了一份热气腾腾的盖浇饭。外卖小哥准时送到宿舍楼下，你边追剧边享用，惬意十足。',
     bg:'dorm'},
    {text:'校内食堂',hint:'💰-10 · 经济实惠',
     effects:{money:-10},
     result:'你拿着饭卡来到校内食堂，打了一份两荤一素的套餐。味道中规中矩，但胜在经济实惠、营养搭配合理。吃完饭精神饱满，下午的学习效率都提高了。',
     bg:'canteen'}
  ];
  if(GS.hasPengyuanCard){
    choices.push({text:'鹏远食堂',hint:'💳-8 · 离宿舍最近',
      effects:{pengyuanBalance:-8},
      result:'你来到鹏远食堂，这里离宿舍最近。刷鹏远卡支付了8元，菜品比校内食堂精致不少——糖醋里脊、清炒时蔬、一碗热汤，环境也安静整洁。吃完饭走两分钟就回到宿舍，方便极了。',
      bg:'canteen'});
  }
  var beats=[VN.bg('campus_path'),VN.narr('到了用餐时间，今天你想吃什么？')];
  beats.push(VN.choice('🍽️ 今日用餐',choices.map(function(c){return {text:c.text,hint:c.hint};}),
    function(o,i){
      var c=choices[i];
      var eff=Object.assign({},c.effects);
      var resultText=c.result;
      var stolen=false;
      if(i===0&&Math.random()<0.1){
        eff={money:-15,happiness:-3,health:-3};
        resultText='你满怀期待地跑到楼下取外卖，却发现外卖已经不翼而飞——被人偷走了！你气得跳脚，肚子空空、心情低落。';
        stolen=true;
      }
      var changes=doEffects(eff);
      _logCtx={choice:c.text};
      var beats2=[
        VN.bg(c.bg,{ms:420}),
        VN.se(stolen?'fail':'page'),
        VN.narr(resultText)
      ];
      if(stolen)beats2.splice(2,0,VN.fx('shake',{power:9}));
      VN.run(beats2,function(){
        showPopup(stolen?'🚨 外卖被偷':'用餐',resultText,changes,null,function(){
          updatePanel();
          if(callback)callback();
        });
      });
    }));
  VN.run(beats);
}


/* ------------------------------------------------------------
   自由活动日：改用 🗺️ 校园地图（可操控玩法）
   ------------------------------------------------------------ */
function renderGenericDay(){
  var wd=weekday(GS.year,GS.month,GS.day),dStr=fmtDate(GS.year,GS.month,GS.day);
  var skipRandom=GS.tuanxiaoAccepted&&GS.tuanxiaoWeekBan>0&&isWeekend(GS.year,GS.month,GS.day)&&GS.month>=10&&!(GS.month===10&&GS.day>=1&&GS.day<=7);
  if(GS.weekendEventReduction>0&&isWeekend(GS.year,GS.month,GS.day))skipRandom=true;

  var beats=[VN.bgmIf('daily')];
  beats.push(VN.bg('campus_path',{ms:520}));
  beats.push(VN.title(dStr+'　星期'+wd,'自由活动日'));
  var nbG=newsBeat(); if(nbG)beats.push(nbG);

  if(GS.weather){
    beats.push(VN.narr(GS.weather.icon+' 今日天气：'+GS.weather.name+' · '+GS.weather.desc));
  }

  if(!skipRandom){
    var evt=GENERIC_EVENTS[Math.floor(Math.random()*GENERIC_EVENTS.length)];
    var evtChanges=doEffects(Object.assign({},evt.effects));
    beats.push(VN.narr('📌 '+evt.text));
    if(evtChanges&&Object.keys(evtChanges).length){
      beats.push(VN.call(function(){updatePanel();}));
      beats.push(VN.popupBeat('📌 今日事件','',evtChanges,null,null,'知道了'));
    }
  }else{
    beats.push(VN.narr('⚠️ 团校集训期间，周末随机事件不可用。'));
  }

  beats.push(VN.narr('今天想做点什么？'));
  beats.push(VN.call(function(){
    updatePanel();
    // 地图选择当天行动
    VNHUD.openMap(function(m){
      vnAfterAction(m,function(){
        vnGenericDayTail();
      });
    });
  }));
  VN.run(beats);
  saveGame();
}

/** 地图行动后的收尾：同伴事件 → 女友事件 → 下一天 */
function vnAfterAction(m,cb){
  triggerClassmateEvent(function(){
    renderDailyGfEvent(function(){
      cb();
    });
  });
}

function vnGenericDayTail(){
  var beats=[VN.narr('今天的行程结束了，夜色渐深。')];
  beats.push(VN.choice('',[{text:'→ 进入下一天'}],function(){
    advanceToNextDay();
  }));
  VN.run(beats);
  saveGame();
}

/** 保留旧接口：非女友路线时也走一次行动选择 */
function renderDailyActions(callback){
  var acts=(typeof DAILY_ACTIVITIES!=='undefined'&&DAILY_ACTIVITIES)||[];
  if(!acts.length){if(callback)callback();return;}
  var beats=[VN.narr('今天想做点什么？')];
  beats.push(VN.choice('今日行动',acts.map(function(a){
    var hint='';
    if(a.effects){var bits=[];for(var k in a.effects){if(a.effects.hasOwnProperty(k)&&a.effects[k])bits.push(effLabel(k,a.effects[k]));}hint=bits.join(' · ');}
    return {text:a.text,hint:hint};
  }),function(o,i){
    var act=acts[i];
    var eff=Object.assign({},act.effects);
    if(act.sleepBonus){
      var sb=getWeatherSleepBonus();
      if(Object.keys(sb).length>0)Object.assign(eff,sb);
    }
    var ch=doEffects(eff);
    var txt=act.text;
    if(act.sleepBonus&&Object.keys(getWeatherSleepBonus()).length>0)txt+='\n\n🌧️ '+getWeatherSleepNarrative();
    _logCtx={choice:act.text};
    VN.run([VN.narr(txt)],function(){
      showPopup('今日行动','',ch,null,function(){
        updatePanel();
        if(callback)callback();
      });
    });
  }));
  VN.run(beats);
}


/* ------------------------------------------------------------
   女友事件
   ------------------------------------------------------------ */
function renderGfEvent(dayData,afterCb){
  GS._gfEventFired=fmtDate(GS.year,GS.month,GS.day);
  var suGf=getGfById('suxiaonuan');
  if(suGf){GS.gfFavor=suGf.favor;}
  else{GS.gfFavor=GS.classmateFavor.suxiaonuan||GS.gfFavor;}
  function done(){if(afterCb){afterCb();}else{finishDay(dayData);}}

  var ge=dayData.gfEvent;
  if(!ge){done();return;}
  var who=GS.gfUnlocked?VNA.gfId():'suxiaonuan';
  var gfNm=VNA.charName(who);

  var beats=[];
  beats.push(VN.bgm('romantic'));
  beats.push(VN.bg('campus_path',{ms:600}));
  beats.push(VN.weather(VNA.pickWeather('campus_path'),1));
  beats.push(VN.title('💕 '+ge.title,gfNm));
  if(VNA.hasSprite(who))beats.push(VN.show(who,{emo:'smile',pos:'center'}));
  beats=beats.concat(VNA.proseBeats(ge.text,{focus:who,emo:'smile'}));

  beats.push(VN.choice('',ge.choices.map(function(gc){
    return {text:gc.text.replace(/女友/g,gfNm),hint:choiceHint(gc)};
  }),function(o,i){
    var gc=ge.choices[i];
    var eff=Object.assign({},gc.effects||{});
    var gfChanges={};
    var gf=getGfById(who);
    if(gc.gfEffects){
      for(var k2 in gc.gfEffects){
        if(!gc.gfEffects.hasOwnProperty(k2))continue;
        if(k2==='gfFavor'){
          if(gf){var oldFv=gf.favor;gf.favor=Math.max(0,gf.favor+gc.gfEffects[k2]);gfChanges.gfFavor=gf.favor-oldFv;}
        }else if(GS.hasOwnProperty(k2)&&typeof GS[k2]==='number'){
          var old2=GS[k2];GS[k2]=Math.max(0,GS[k2]+gc.gfEffects[k2]);gfChanges[k2]=GS[k2]-old2;
        }
      }
    }
    if(gf)GS.classmateFavor[gf.id]=gf.favor;
    var changes=doEffects(eff);
    for(var gk in gfChanges)changes[gk]=gfChanges[gk];
    if(changes.gfFavor>0)VN._se('heart');
    var resultText=(gc.result||'').replace(/女友/g,gfNm);
    _logCtx={choice:gc.text};
    var extra=[];
    if(changes.gfFavor>0)extra.push(VN.fx('hearts',{n:12}));
    VN.run(extra,function(){
      showPopup(ge.title,resultText,changes,null,function(){
        updatePanel();
        VN.hideNow(who);
        done();
      });
    });
  }));
  VN.run(beats);
}

function renderDailyGfEvent(callback,excludeId){
  GS._gfEventFired=fmtDate(GS.year,GS.month,GS.day);
  if(!callback)callback=function(){};
  promptCampusRun(function(){_renderDailyGfEvent(callback,excludeId);});
}

function _renderDailyGfEvent(callback,excludeId){
  if((!GS.girlfriends||GS.girlfriends.length===0)&&GS.gfUnlocked&&GS.gfFavor>0){
    GS.girlfriends=[{id:GS.gfId||'suxiaonuan',name:GS.gfName||'女友',favor:GS.gfFavor,coolingDays:0}];
    GS.classmateFavor[GS.gfId||'suxiaonuan']=GS.gfFavor;
  }
  var gfs=GS.girlfriends;
  if(!gfs||gfs.length===0){callback();return;}

  var gfIdx=0;
  function nextGf(){
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

    var isNight=true;
    var beats=[];
    beats.push(VN.bgm('romantic'));
    beats.push(VN.bg('street_night',{ms:600}));
    beats.push(VN.weather('star',1));
    beats.push(VN.title('💕 '+title,nm));
    if(VNA.hasSprite(gf.id))beats.push(VN.show(gf.id,{emo:'smile',pos:'center'}));
    beats=beats.concat(VNA.proseBeats(text,{focus:gf.id,emo:'smile'}));

    beats.push(VN.choice('',[
      {text:c1text,hint:c1fv?('💕 好感 '+(c1fv>0?'+':'')+c1fv):''},
      {text:c2text,hint:c2fv?('💕 好感 '+(c2fv>0?'+':'')+c2fv):'⚠ 可能引发感情危机'}
    ],function(o,ci){
      var eff=ci===0?c1eff:c2eff;
      var fv=ci===0?c1fv:c2fv;
      var res=ci===0?c1res:c2res;
      if(ci===0){ if(c1fv>0)GS.breakupProb=0; }
      else { if(c2fv===0)GS.breakupProb+=10; }
      gf.favor=Math.max(0,gf.favor+fv);
      GS.classmateFavor[gf.id]=gf.favor;
      if(GS.girlfriends&&GS.girlfriends[0]&&GS.girlfriends[0].id===gf.id)GS.gfFavor=gf.favor;
      var ch=doEffects(eff);
      if(fv)ch[gf.id+'Fav']=fv;
      _logCtx={choice:ci===0?c1text:c2text};
      var pre=[];
      if(fv>0)pre.push(VN.fx('hearts',{n:10}));
      VN.run(pre,function(){
        if(ci===1&&c2fv===0&&GS.breakupProb>0&&Math.random()*100<GS.breakupProb){
          VN.hideNow(gf.id);
          showBreakupPopup(function(){updatePanel();nextGf();});
          return;
        }
        showPopup(title,res,ch,null,function(){
          updatePanel();
          VN.hideNow(gf.id);
          nextGf();
        });
      });
    }));
    VN.run(beats);
  }
  nextGf();
}


/* ------------------------------------------------------------
   班级随机事件
   ------------------------------------------------------------ */
function triggerClassmateEvent(callback){
  if(typeof CLASSMATES==='undefined'||!CLASSMATES){if(callback)callback();return;}
  var cmId=pickRandomClassmate();
  if(!cmId||!CLASSMATES[cmId]){if(callback)callback();return;}
  var cmName=CLASSMATES[cmId].name;
  var roll=Math.random();
  var pool=roll<0.4?CM_GOOD:(roll<0.7?CM_BAD:CM_NEUTRAL);
  var tpl=pool[Math.floor(Math.random()*pool.length)];
  var evt=tpl(cmId,cmName);
  var tagLabel=roll<0.4?'好事':(roll<0.7?'坏事':'尴尬');
  var tone=roll<0.4?'daily':(roll<0.7?'sad':'daily');

  // 用无条件 bgm（而不是 bgmIf）：合唱场景刚放完校歌，
  // 紧跟着的班级事件要把音乐换回自己的情绪，不能被校歌"卡住"。
  var beats=[VN.bgm(tone)];
  var bg=(roll<0.7)?'campus_path':'dorm';
  beats.push(VN.bg(bg,{ms:520}));
  beats.push(VN.title(evt.title,cmName+' · '+tagLabel));
  if(VNA.hasSprite(cmId))beats.push(VN.show(cmId,{emo:roll<0.4?'happy':'normal',pos:'right'}));
  beats=beats.concat(VNA.proseBeats(evt.text,{focus:cmId}));

  beats.push(VN.choice('',evt.choices.map(function(ch){
    return {text:ch.text,hint:choiceHint(ch)};
  }),function(o,i){
    var ch=evt.choices[i];
    var changes=doEffects(ch.effects||{});
    if(ch.cmFav){
      if(typeof ch.cmFav==='number'){
        var oldFav=GS.classmateFavor[cmId]||0;
        GS.classmateFavor[cmId]=Math.max(0,oldFav+ch.cmFav);
        changes[cmId+'Fav']=ch.cmFav;
      }else{
        for(var id in ch.cmFav){
          if(ch.cmFav.hasOwnProperty(id)&&GS.classmateFavor&&GS.classmateFavor.hasOwnProperty(id)){
            var o2=GS.classmateFavor[id]||0;
            GS.classmateFavor[id]=Math.max(0,o2+ch.cmFav[id]);
            changes[id+'Fav']=ch.cmFav[id];
          }
        }
      }
    }
    _logCtx={choice:ch.text};
    VN.run([VN.hide(cmId)],function(){
      showPopup(evt.title,ch.result||'',changes,null,function(){
        updatePanel();
        if(callback)callback();
      });
    });
  }));
  VN.run(beats);
}


/* ------------------------------------------------------------
   校园健康跑
   ------------------------------------------------------------ */
function promptCampusRun(callback){
  if(!callback)callback=function(){};
  if(!GS||GS.campusRunKm>=60){callback();return;}
  if(GS.month<10&&GS.day<20){callback();return;}

  var beats=[
    VN.bg('playground_night',{ms:520}),
    VN.title('🏃 校园健康跑','累计 '+GS.campusRunKm+'/60 km'),
    VN.narr('晚间校园跑时段已到，是否参加今日的 2 公里校园健康跑？')
  ];
  beats.push(VN.choice('',[
    {text:'参加校园跑',hint:'❤️-3 · 😊-2 · 里程+2km'},
    {text:'花 4 元找同学代跑',hint:'💰-4 · 里程+2km · ⚠2% 被抓扣 10km'},
    {text:'今天不参加',hint:''}
  ],function(o,i){
    if(i===2){
      showPopup('🏃 校园跑','你选择休息一天。',{},null,function(){updatePanel();callback();});
      return;
    }
    if(i===0){
      var ch=doEffects({health:-3,happiness:-2});
      GS.campusRunKm=(GS.campusRunKm||0)+2;
      VN.run([
        VN.narr('你换上跑鞋，沿着操场跑完了两公里。夜风很凉，汗水却很热。')
      ],function(){
        showPopup('🏃 校园跑','你完成了今日的 2 公里校园健康跑。\n当前累计里程：'+GS.campusRunKm+'/60km',
          ch,null,function(){updatePanel();callback();});
      });
      return;
    }
    // 代跑
    var caught=Math.random()<0.02;
    var eff={money:-4};
    if(caught){GS.campusRunKm=Math.max(0,(GS.campusRunKm||0)-10);}
    else{GS.campusRunKm=(GS.campusRunKm||0)+2;}
    var ch2=doEffects(eff);
    VN.run([
      VN.narr(caught?'你找了同学代跑，结果被体育部的同学认了出来……':'你花了 4 元找了同学代跑，顺利蒙混过关。')
    ],function(){
      showPopup('🏃 校园跑',
        (caught?'被发现了！里程 -10km。':'里程 +2km。')+'\n当前累计里程：'+GS.campusRunKm+'/60km',
        ch2,null,function(){updatePanel();callback();});
    });
  }));
  VN.run(beats);
}


/* ------------------------------------------------------------
   一天的收尾
   ------------------------------------------------------------ */
function finishDay(dayData){
  if((GS.girlfriends&&GS.girlfriends.length>0)||GS.gfUnlocked){
    var alreadyFired=GS._gfEventFired||'';
    var today=fmtDate(GS.year,GS.month,GS.day);
    if(alreadyFired!==today){
      GS._gfEventFired=today;
      renderDailyGfEvent(function(){vnNextDayBtn();});
      return;
    }
  }
  vnNextDayBtn();
}

function vnNextDayBtn(){
  VN.run([
    VN.weather(null),
    VN.choice('',[{text:'→ 进入下一天'}],function(){advanceToNextDay();})
  ]);
  saveGame();
}

function advanceToNextDay(){
  var lastDay=daysInMonth(GS.year,GS.month);
  var notes=[];
  if(GS.day===lastDay){
    GS.health=Math.max(0,GS.health-5);
    notes.push('🍼 室友奶扣熬夜习惯影响：健康 -5（月末扣除）');
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

  if(notes.length){
    for(var i=0;i<notes.length;i++)VN.toast(notes[i]);
  }
  if(GS.month===10&&GS.day===8&&GS.holidayRoute){GS.holidayRoute=null;delete GS._holidayGfId;}
  updatePanel();
  VN.clearStage();
  VN.run([VN.weather(null)]);
  processDay();
}


/* ------------------------------------------------------------
   国庆假期
   ------------------------------------------------------------ */
function renderHolidayDay(dk){
  var hd=HOLIDAY_DAYS[dk];
  if(!hd){renderGenericDay();return;}
  var wd=weekday(GS.year,GS.month,GS.day);
  var dStr=fmtDate(GS.year,GS.month,GS.day);
  var routeKey=GS.holidayRoute;
  var route=routeKey?HOLIDAY_ROUTES[routeKey]:null;

  // 10.1 首次进入：先选路线
  if(hd.isSelection&&!routeKey){
    var routes=['home','campus','couple','internship','dorm'];
    var opts=[];
    for(var r=0;r<routes.length;r++){
      var rd=HOLIDAY_ROUTES[routes[r]];
      if(rd.requiresGf&&!GS.gfUnlocked)continue;
      opts.push({text:rd.name,hint:routeHint(routes[r])});
    }
    var beats=[VN.bgm('festival')];
    beats.push(VN.bg('campus_path',{ms:560}));
    beats.push(VN.weather('leaf',1));
    beats.push(VN.title('🎉 国庆假期 · 第一天',dStr+'　星期'+wd));
    var nbH=newsBeat(); if(nbH)beats.push(nbH);
    beats=beats.concat(VNA.proseBeats(hd.bgText,{}));
    beats.push(VN.narr('请选择你的七日过节路线（选定后 10.2 - 10.7 不可更改）'));
    beats.push(VN.choice('选择路线',opts,function(o,i){
      var avail=routes.filter(function(x){return !HOLIDAY_ROUTES[x].requiresGf||GS.gfUnlocked;});
      var rk=avail[i];
      if(rk==='couple'&&GS.girlfriends&&GS.girlfriends.length>1){
        showHolidayGfSelect(hd,dk,function(){finishHolidayDay();});
      }else{
        GS.holidayRoute=rk;
        updatePanel();
        applyHolidayDay(hd,dk,rk,function(){finishHolidayDay();});
      }
    }));
    VN.run(beats);
    return;
  }

  if(!routeKey){GS.holidayRoute='campus';routeKey='campus';route=HOLIDAY_ROUTES.campus;}
  applyHolidayDay(hd,dk,routeKey,function(){finishHolidayDay();});
}

function routeHint(rk){
  var m={home:'💰-180 · 😊+12 · ❤️+8',campus:'留在校园，自由安排',
         couple:'与女友同行 · 💰-160 · 😊+15',internship:'🐦实习 · 💰+100 · ❤️-10',
         dorm:'躺平 · ❤️+10 · 😊+14 · 📖-12'};
  return m[rk]||'';
}

function showHolidayGfSelect(hd,dk,callback){
  var gfs=GS.girlfriends||[];
  if(!gfs.length){if(callback)callback();return;}
  var opts=gfs.map(function(g){return {text:'💕 '+g.name,hint:'当前好感 '+g.favor};});
  VN.run([
    VN.title('💕 选择同行的人','你有 '+gfs.length+' 名女友'),
    VN.narr('这个假期，你想和谁一起度过？'),
    VN.choice('',opts,function(o,i){
      GS.holidayRoute='couple';
      GS._holidayGfId=gfs[i].id;
      applyHolidayDay(hd,dk,'couple',callback);
    })
  ]);
}

function applyHolidayDay(hd,dk,routeKey,callback){
  var route=HOLIDAY_ROUTES[routeKey];
  if(!route){renderGenericDay();return;}
  var wd=weekday(GS.year,GS.month,GS.day);
  var dStr=fmtDate(GS.year,GS.month,GS.day);

  // 路线每日效果
  var routeChanges=doEffects(Object.assign({},route.dailyEffects));
  if(routeKey==='home'&&GS.gfUnlocked){
    GS.gfFavor=Math.max(0,GS.gfFavor-5);
  }
  if(routeKey==='couple'&&GS.gfUnlocked){
    var holGf2=getGfById(GS._holidayGfId);
    if(holGf2){
      holGf2.favor=Math.max(0,holGf2.favor+18);
      GS.classmateFavor[holGf2.id]=holGf2.favor;
      if(GS.girlfriends[0]&&GS.girlfriends[0].id===holGf2.id)GS.gfFavor=holGf2.favor;
    }else{
      GS.gfFavor=Math.max(0,GS.gfFavor+18);
    }
  }
  updatePanel();

  var bgMap={home:'home',campus:'campus_path',couple:'sea_day',internship:'office',dorm:'dorm'};
  var bg=bgMap[routeKey]||'campus_path';
  var beats=[VN.bgm(routeKey==='couple'?'romantic':'festival')];
  beats.push(VN.bg(bg,{ms:620}));
  beats.push(VN.weather(VNA.pickWeather(bg),0.8));
  beats.push(VN.title('📅 国庆第'+hd.dayNum+'天',dStr+'　星期'+wd+' · '+route.name));
  beats=beats.concat(VNA.proseBeats(hd.bgText,{}));
  beats.push(VN.call(function(){updatePanel();}));
  beats.push(VN.popupBeat('假期路线：'+route.name,'',routeChanges,null,null,'继续'));

  if(routeKey==='campus'&&hd.campusEvents&&hd.campusEvents.length>0){
    var evtIdx=0;
    function nextCampusEvent(){
      if(evtIdx>=hd.campusEvents.length){showHolidayGfOrFinish(hd,routeKey,callback);return;}
      renderCampusEvent(hd.campusEvents[evtIdx],function(){evtIdx++;nextCampusEvent();});
    }
    VN.run(beats,nextCampusEvent);
    return;
  }
  VN.run(beats,function(){showHolidayGfOrFinish(hd,routeKey,callback);});
}

function renderCampusEvent(evt,callback){
  var beats=[VN.title(evt.title,'🔬 大创事件')];
  beats=beats.concat(VNA.proseBeats(evt.text,{}));
  beats.push(VN.choice('',evt.choices.map(function(ec){
    return {text:ec.text,hint:choiceHint(ec)};
  }),function(o,i){
    var ec=evt.choices[i];
    var changes=doEffects(Object.assign({},ec.effects||{}));
    _logCtx={choice:ec.text};
    VN.run([],function(){
      showPopup(evt.title,ec.result||'',changes,null,function(){
        updatePanel();
        if(callback)callback();
      });
    });
  }));
  VN.run(beats);
}

function showHolidayGfOrFinish(hd,routeKey,callback){
  if(GS.gfUnlocked&&hd.gfEvents&&hd.gfEvents[routeKey]){
    var ge=hd.gfEvents[routeKey];
    var gfName=(GS._holidayGfId&&getGfById(GS._holidayGfId))?getGfById(GS._holidayGfId).name:(GS.gfName||'女友');
    var displayText=String(ge.text).replace(/女友/g,gfName);
    var who=GS._holidayGfId||VNA.gfId();

    var beats=[VN.bgm('romantic')];
    beats.push(VN.bg(routeKey==='couple'?'sea_night':'campus_path',{ms:600}));
    beats.push(VN.weather(routeKey==='couple'?'star':'leaf',0.8));
    beats.push(VN.title('💕 '+ge.title,gfName));
    if(VNA.hasSprite(who))beats.push(VN.show(who,{emo:'smile',pos:'center'}));
    beats=beats.concat(VNA.proseBeats(displayText,{focus:who,emo:'smile'}));
    beats.push(VN.choice('',ge.choices.map(function(gc){
      return {text:String(gc.text).replace(/女友/g,gfName),hint:choiceHint(gc)};
    }),function(o,i){
      renderHolidayGfChoices(ge,ge.choices[i],routeKey,callback,gfName,who);
    }));
    VN.run(beats);
    return;
  }
  if((GS.girlfriends&&GS.girlfriends.length>0)||GS.gfUnlocked){
    renderDailyGfEvent(function(){if(callback)callback();});
  }else{
    if(callback)callback();
  }
}

function renderHolidayGfChoices(ge,gc,routeKey,callback,gfName,who){
  gfName=gfName||(GS.gfName||'女友');
  var routeMod=(HOLIDAY_ROUTES[routeKey].gfMod)||{};
  var eff=Object.assign({},gc.effects||{});
  var gfChanges={};
  if(gc.gfEffects){
    for(var k2 in gc.gfEffects){
      if(!gc.gfEffects.hasOwnProperty(k2))continue;
      if(k2==='gfFavor'){
        var holGf=getGfById(GS._holidayGfId);
        if(holGf){
          var adj2=gc.gfEffects.gfFavor||0;
          var oldFv2=holGf.favor;
          holGf.favor=Math.max(0,holGf.favor+adj2);
          gfChanges.gfFavor=holGf.favor-oldFv2;
          GS.classmateFavor[holGf.id]=holGf.favor;
        }else{
          var o3=GS.gfFavor;
          GS.gfFavor=Math.max(0,GS.gfFavor+(gc.gfEffects.gfFavor||0));
          gfChanges.gfFavor=GS.gfFavor-o3;
        }
      }else if(GS.hasOwnProperty(k2)&&typeof GS[k2]==='number'){
        var adj=gc.gfEffects[k2];
        var old2=GS[k2];
        GS[k2]=Math.max(0,GS[k2]+adj);
        gfChanges[k2]=GS[k2]-old2;
      }
    }
  }else if(routeMod.rejectExtra&&/拒绝|不去|留下/.test(gc.text||'')){
    eff.happiness=(eff.happiness||0)-routeMod.rejectExtra;
  }
  var changes=doEffects(eff);
  for(var gk in gfChanges)changes[gk]=gfChanges[gk];
  if(changes.gfFavor>0)VN._se('heart');
  var resultText=String(gc.result||'').replace(/女友/g,gfName);
  _logCtx={choice:String(gc.text).replace(/女友/g,gfName)};
  var pre=[];
  if(changes.gfFavor>0)pre.push(VN.fx('hearts',{n:14}));
  VN.run(pre,function(){
    showPopup(ge.title||'💕 假期时光',resultText,changes,null,function(){
      updatePanel();
      VN.hideNow(who);
      if(callback)callback();
    });
  });
}

function finishHolidayDay(){
  VN.run([
    VN.weather(null),
    VN.choice('',[{text:'→ 进入下一天'}],function(){advanceToNextDay();})
  ]);
  saveGame();
}
