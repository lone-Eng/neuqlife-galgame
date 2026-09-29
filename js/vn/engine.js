/**
 * ============================================================
 *  东秦校园人生 · Galgame 演出引擎
 *  ------------------------------------------------------------
 *  把原本"日志式"的文字养成界面，改造成标准的视觉小说舞台：
 *
 *    背景层  →  立绘层  →  CG层  →  特效层  →  暗角
 *                              ↓
 *                        对话框 / 选项 / 工具栏
 *
 *  剧本以「节拍(beat)」数组驱动，引擎顺序播放：
 *    VN.run([ VN.bg('classroom'), VN.say('suxiaonuan','…'), VN.choice(…) ])
 *
 *  依赖：SPRITES(立绘) / CGS(CG) / BGS(背景) / FX(特效) / AUDIO(音频)
 *        以上均为可选，缺失时引擎自动降级（不报错、不中断剧情）。
 *
 *  对外接口：VN.*
 * ============================================================
 */
var VN = (function(){
  'use strict';

  // ---------- 舞台 DOM ----------
  var stage=null, bgA=null, bgB=null, bgTop=null;
  var spriteLayer=null, cgLayer=null, titleCard=null;
  var dlg=null, nameBox=null, nameEl=null, textEl=null, nextEl=null;
  var choiceBox=null, overlayLayer=null, hudEl=null, toolbarEl=null;

  // ---------- 运行时状态 ----------
  var S={
    queue:[], running:false, waiting:false, finished:true,
    line:null, full:'', shown:0, typing:false,
    typeAcc:0, typeLast:0, rafId:null,
    speed:26,            // 每字毫秒
    auto:false, autoTimer:null, autoDelay:1500,
    skip:false, skipReadOnly:true,
    history:[],          // 回想记录 {name,text}
    read:null,           // 已读文本集合（用于跳过未读）
    speaker:null,
    sprites:{},          // id -> {el, pos, emo}
    cgShown:null,
    bgKey:null,
    uiHidden:false,
    choiceOpen:false,
    popupOpen:0,
    newsOpen:false,
    listeners:{spriteClick:[]},
    settings:null
  };

  var LS_SET='dongqin_vn_settings';
  var LS_GAL='dongqin_vn_gallery';
  var MAX_QUEUE=300;          // 待播节拍上限（安全阀，正常流程远低于此）

  // ============================================================
  //  设置持久化
  // ============================================================
  var DEFAULTS={speed:26,autoDelay:1500,skipReadOnly:true,bgmVolume:0.5,seVolume:0.7,enabled:true,uiScale:1};

  /** 把界面缩放系数写到 CSS 变量上（--ui 由 vn.css 的各处 calc() 消费） */
  function applyUiScale(v){
    var el=stage||document.getElementById('vn-stage')||document.documentElement;
    try{ el.style.setProperty('--ui',String(v)); }catch(e){}
  }

  function loadSettings(){
    var s={};
    try{
      var raw=localStorage.getItem(LS_SET);
      if(raw)s=JSON.parse(raw)||{};
    }catch(e){s={};}
    for(var k in DEFAULTS){
      if(DEFAULTS.hasOwnProperty(k)&&typeof s[k]==='undefined')s[k]=DEFAULTS[k];
    }
    S.settings=s;
    S.speed=s.speed;
    S.autoDelay=s.autoDelay;
    S.skipReadOnly=s.skipReadOnly;
    applyUiScale(s.uiScale);
    if(typeof AUDIO!=='undefined'&&AUDIO){
      try{
        AUDIO.setEnabled(s.enabled);
        AUDIO.setBgmVolume(s.bgmVolume);
        AUDIO.setSeVolume(s.seVolume);
      }catch(e){}
    }
    return s;
  }
  function saveSettings(){
    try{localStorage.setItem(LS_SET,JSON.stringify(S.settings));}catch(e){}
  }

  // ============================================================
  //  已读 / 画廊 持久化
  // ============================================================
  function loadRead(){
    if(S.read)return S.read;
    S.read={};
    try{
      var raw=localStorage.getItem('dongqin_vn_read');
      if(raw)S.read=JSON.parse(raw)||{};
    }catch(e){S.read={};}
    return S.read;
  }
  var _readDirty=false;
  function markRead(text){
    var r=loadRead();
    if(!r[text]){r[text]=1;_readDirty=true;}
  }
  function flushRead(){
    if(!_readDirty)return;
    _readDirty=false;
    try{localStorage.setItem('dongqin_vn_read',JSON.stringify(loadRead()));}catch(e){}
  }
  setInterval(flushRead,4000);
  // 关页前补存一次，避免最后几秒读过的文本丢失"已读"标记
  window.addEventListener('beforeunload',flushRead);
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden')flushRead();
  });

  function gallery(){
    var g={};
    try{
      var raw=localStorage.getItem(LS_GAL);
      if(raw)g=JSON.parse(raw)||{};
    }catch(e){g={};}
    return g;
  }
  function unlockCG(id,title){
    if(!id)return false;
    var g=gallery();
    if(g[id])return false;
    g[id]=Date.now();
    try{localStorage.setItem(LS_GAL,JSON.stringify(g));}catch(e){}
    return true;
  }
  function cgCount(){ return Object.keys(gallery()).length; }

  // ============================================================
  //  音频便捷封装（AUDIO 缺失时静默降级）
  // ============================================================
  function se(name,variant){
    if(typeof SFX!=='undefined'&&SFX&&name){try{SFX.play(name,variant);}catch(e){}}
  }
  function bgm(key){
    // 必须记录当前曲目：bgmIf 依赖 S.bgmKey 判断"是否已有 BGM 在播"，
    // 否则 bgmIf 每次都成立，会反复重置背景音乐。
    if(typeof BGM==='undefined'||!BGM)return;
    try{
      if(key===null||key===false){BGM.stop();S.bgmKey=null;}
      else if(key){BGM.play(key);S.bgmKey=key;}
    }catch(e){}
  }

  // ============================================================
  //  挂载
  // ============================================================
  function mount(){
    if(stage)return;
    stage=document.getElementById('vn-stage');
    if(!stage)return;
    bgA=document.getElementById('vn-bg-a');
    bgB=document.getElementById('vn-bg-b');
    spriteLayer=document.getElementById('vn-sprite-layer');
    cgLayer=document.getElementById('vn-cg-layer');
    titleCard=document.getElementById('vn-title-card');
    dlg=document.getElementById('vn-dialogue');
    nameBox=document.getElementById('vn-nameplate');
    nameEl=document.getElementById('vn-name');
    textEl=document.getElementById('vn-text');
    nextEl=document.getElementById('vn-next');
    choiceBox=document.getElementById('vn-choices');
    overlayLayer=document.getElementById('vn-overlay-layer');
    hudEl=document.getElementById('vn-hud');
    toolbarEl=document.getElementById('vn-toolbar');
    bgTop=bgA;                 // 双缓冲：bgTop 指向"下一次写入"的那一层
    loadSettings();
    loadRead();
    bindInput();
  }

  // ============================================================
  //  输入
  // ============================================================
  function bindInput(){
    if(!stage)return;
    stage.addEventListener('click',function(e){
      // 只响应"空旷处"的点击——UI 控件自行处理
      if(e.target.closest&&e.target.closest('.vn-ui'))return;
      if(S.choiceOpen)return;
      advance();
    });
    document.addEventListener('keydown',function(e){
      if(S.popupOpen>0)return;
      var tag=(e.target&&e.target.tagName||'').toLowerCase();
      if(tag==='input'||tag==='textarea')return;
      if(e.code==='Space'||e.code==='Enter'||e.code==='ArrowRight'||e.code==='NumpadEnter'){
        if(S.choiceOpen)return;
        e.preventDefault();advance();
      }else if(e.code==='ControlLeft'||e.code==='ControlRight'){
        setSkip(true);
      }else if(e.key==='a'||e.key==='A'){
        setAuto(!S.auto);
      }else if(e.key==='l'||e.key==='L'){
        if(typeof VNHUD!=='undefined'&&VNHUD)VNHUD.openBacklog();
      }else if(e.key==='h'||e.key==='H'){
        hideUI(!S.uiHidden);
      }
    });
    document.addEventListener('keyup',function(e){
      if(e.code==='ControlLeft'||e.code==='ControlRight')setSkip(false);
    });
    window.addEventListener('blur',function(){ setSkip(false); });
  }

  /** 点击立绘时的回调注册 */
  function onSpriteClick(fn){ S.listeners.spriteClick.push(fn); }
  function emitSpriteClick(id){
    for(var i=0;i<S.listeners.spriteClick.length;i++){
      try{S.listeners.spriteClick[i](id);}catch(e){}
    }
  }

  // ============================================================
  //  节拍构造器（返回 beat 对象，供 VN.run 使用）
  // ============================================================
  var B={
    bg:function(key,opt){return {t:'bg',key:key,opt:opt||{}};},
    show:function(id,opt){return {t:'show',id:id,opt:opt||{}};},
    hide:function(id,opt){return {t:'hide',id:id,opt:opt||{}};},
    hideAll:function(opt){return {t:'hideAll',opt:opt||{}};},
    say:function(who,text,opt){return {t:'say',who:who,text:text,opt:opt||{}};},
    narr:function(text,opt){return {t:'narr',text:text,opt:opt||{}};},
    cg:function(id,opt){return {t:'cg',id:id,opt:opt||{}};},
    cgHide:function(opt){return {t:'cgHide',opt:opt||{}};},
    fx:function(name,opt){return {t:'fx',name:name,opt:opt||{}};},
    se:function(name){return {t:'se',name:name};},
    bgm:function(key){return {t:'bgm',key:key};},
    weather:function(kind,intensity){return {t:'weather',kind:kind,intensity:intensity};},
    wait:function(ms){return {t:'wait',ms:ms};},
    title:function(title,sub){return {t:'title',title:title,sub:sub};},
    choice:function(prompt,options,cb){return {t:'choice',prompt:prompt,options:options,cb:cb};},
    call:function(fn){return {t:'call',fn:fn};},
    popup:function(a,b,c,d,e,f){return {t:'popup',args:[a,b,c,d,e,f]};},
    bgmIf:function(key){return {t:'bgmIf',key:key};},
    news:function(text,meta){return {t:'news',text:text,meta:meta||{}};}
  };

  // ============================================================
  //  主循环
  // ============================================================
  function run(beats,done){
    mount();
    // 追加语义是有意为之（例如点击立绘后的搭话要接在当前剧情之后），
    // 但不允许无限增长：超过上限时丢弃最旧的待播节拍，避免队列失控。
    S.queue=S.queue.concat(beats||[]);
    if(S.queue.length>MAX_QUEUE)S.queue.splice(0,S.queue.length-MAX_QUEUE);
    S.done=done||null;
    S.finished=false;
    S.running=true;
    if(!isBusy())pump();
  }
  function clearQueue(){ S.queue.length=0; }
  // 弹窗开着时同样算"忙"：阻止队列继续推进，
  // 否则 showPopup 回调里发起的 VN.run 会抢在弹窗关闭之前把下一段剧情播掉。
  function isBusy(){ return S.waiting||S.typing||S.choiceOpen||S.popupOpen>0; }

  function finish(){
    S.running=false;S.finished=true;
    var d=S.done;S.done=null;
    // 注意：不要在这里关掉自动 / 跳过。每日剧情是由多个阶段串起来的，
    // 每个阶段结束时队列都会短暂清空，若在此处复位，自动播放播放一个阶段
    // 就会自己关掉。这两个模式只应由玩家显式切换（选项中会主动暂停自动）。
    if(d){try{d();}catch(e){ if(window.console)console.error(e); }}
  }

  function pump(){
    if(S.choiceOpen)return;
    if(S.queue.length===0){ finish(); return; }
    var b=S.queue.shift();
    if(!b){ pump(); return; }        // 跳过无效节拍（例如误把返回值塞进 beats 的 undefined）
    try{ exec(b); }
    catch(e){
      if(window.console)console.error('[VN] beat error',b,e);
      pump();
    }
  }

  function exec(b){
    switch(b.t){
      case 'bg':     doBg(b.key,b.opt); pump(); break;
      case 'show':   doShow(b.id,b.opt); pump(); break;
      case 'hide':   doHide(b.id,b.opt,function(){pump();}); break;
      case 'hideAll':doHideAll(b.opt); pump(); break;
      case 'say':    doSay(b); break;
      case 'narr':   doSay({who:null,text:b.text,opt:b.opt||{}}); break;
      case 'cg':     doCg(b.id,b.opt); break;
      case 'cgHide': doCgHide(b.opt,function(){pump();}); break;
      case 'fx':     doFx(b.name,b.opt); pump(); break;
      case 'se':     se(b.name); pump(); break;
      case 'bgm':    bgm(b.key); pump(); break;
      case 'bgmIf':  if(!S.bgmKey)bgm(b.key); pump(); break;
      case 'news':   doNews(b.text,b.meta,function(){pump();}); break;
      case 'weather':doWeather(b.kind,b.intensity); pump(); break;
      case 'wait':   S.waiting=true;
                     setTimeout(function(){S.waiting=false;pump();},b.ms||400);
                     break;
      case 'title':  doTitle(b.title,b.sub,function(){pump();}); break;
      case 'choice': doChoice(b); break;
      case 'call':   if(b.fn){try{b.fn();}catch(e){if(window.console)console.error(e);}} pump(); break;
      case 'popup':  doPopup(b.args,function(){pump();}); break;
      default: pump();
    }
  }

  // ============================================================
  //  背景
  // ============================================================
  function bgMarkup(key){
    var svg=null;
    if(typeof BGS!=='undefined'&&BGS&&BGS.has&&BGS.has(key))svg=BGS.get(key);
    if(!svg){
      // 降级：纯色占位，保证不中断剧情
      var fallback={black:'#000',white:'#fff',dorm_night:'#141a2a',classroom_night:'#1a2030'};
      return '<div style="width:100%;height:100%;background:'+(fallback[key]||'#20304a')+'"></div>';
    }
    return svg;
  }

  function doBg(key,opt){
    if(!bgA||key===S.bgKey&&!opt.force)return;
    opt=opt||{};
    S.bgKey=key;
    var top=bgTop, bottom=(bgTop===bgA?bgB:bgA);
    top.innerHTML=bgMarkup(key);
    top.style.transition='none';
    top.style.opacity=opt.instant?'1':'0';
    // 强制重排后再过渡
    void top.offsetWidth;
    var ms=opt.instant?0:(opt.ms||620);
    top.style.transition='opacity '+ms+'ms ease';
    top.style.opacity='1';
    if(bottom)bottom.style.transition='opacity '+ms+'ms ease';
    if(bottom)bottom.style.opacity='0';
    // 交换
    bgTop=bottom;
    if(opt.se!==false)se('whoosh');
  }

  // ============================================================
  //  立绘
  // ============================================================
  var POS={'farleft':10,'left':22,'center-left':35,'center':50,'center-right':65,'right':78,'farright':90};

  function doShow(id,opt){
    if(!spriteLayer)return;
    opt=opt||{};
    var emo=opt.emo||'normal';
    var pos=opt.pos||'center';
    var x=(typeof pos==='number')?pos:(POS[pos]!=null?POS[pos]:50);
    var cur=S.sprites[id];

    if(cur){
      // 已在台上：只换表情 / 移动，不重新入场
      if(cur.emo!==emo)setEmotion(id,emo);
      cur.el.style.left=x+'%';
      cur.pos=x;cur.posKey=pos;
      if(opt.front)raise(id);
      return;
    }

    var svg=null;
    if(typeof SPRITES!=='undefined'&&SPRITES&&SPRITES.has&&SPRITES.has(id))svg=SPRITES.get(id,emo);
    if(!svg&&typeof SPRITES!=='undefined'&&SPRITES&&SPRITES.get)svg=SPRITES.get(id,emo);
    if(!svg){
      // 立绘缺失：降级为一块带名字的柔和色片，绝不中断剧情
      var meta=(typeof SPRITES!=='undefined'&&SPRITES&&SPRITES.meta)?SPRITES.meta(id):null;
      var nm=(meta&&meta.name)||id;
      svg='<div class="vn-sprite-fallback"><span>'+nm+'</span></div>';
    }

    var el=document.createElement('div');
    el.className='vn-sprite vn-ui';
    el.setAttribute('data-char',id);
    el.setAttribute('data-emo',emo||'normal');
    el.style.left=x+'%';
    el.style.zIndex=opt.front?60:20;
    el.innerHTML=svg;
    var inner=el.firstElementChild;
    if(inner&&inner.tagName&&inner.tagName.toLowerCase()==='svg'){
      inner.classList.add('vn-sprite-art');
    }
    el.classList.add('vn-sprite-enter');
    spriteLayer.appendChild(el);
    S.sprites[id]={el:el,pos:x,posKey:pos,emo:emo,id:id};
    setTimeout(function(){el.classList.remove('vn-sprite-enter');},460);

    el.addEventListener('click',function(ev){
      ev.stopPropagation();
      emitSpriteClick(id);
    });
    if(opt.se!==false)se('page');
  }

  function setEmotion(id,emo){
    var cur=S.sprites[id];if(!cur)return;
    var svg=null;
    if(typeof SPRITES!=='undefined'&&SPRITES&&SPRITES.get)svg=SPRITES.get(id,emo);
    if(!svg)return;
    var inner=cur.el.querySelector('.vn-sprite-art');
    // 情绪同时体现在"脸"和"身体语言"上（见 CSS [data-emo] 规则）
    cur.el.setAttribute('data-emo',emo);
    if(inner){
      // 原地替换图形，加一点淡入避免闪烁
      inner.style.opacity='0';
      setTimeout(function(){
        inner.outerHTML=svg;
        var n=cur.el.firstElementChild;
        // 替换后必须补回 class：vn-sprite-art 负责尺寸与表情动画，
        // 丢了它立绘会按 SVG 固有尺寸渲染（420×760，直接撑爆画面）。
        if(n&&n.tagName&&n.tagName.toLowerCase()==='svg'){
          n.classList.add('vn-sprite-art');
          n.style.opacity='1';
        }
      },110);
    }
    cur.emo=emo;
  }

  function raise(id){
    var cur=S.sprites[id];if(!cur)return;
    cur.el.style.zIndex=60;
    for(var k in S.sprites){
      if(S.sprites.hasOwnProperty(k)&&k!==id)S.sprites[k].el.style.zIndex=20;
    }
  }

  function doHide(id,opt,cb){
    var cur=S.sprites[id];
    if(!cur){if(cb)cb();return;}
    cur.el.style.transition='opacity .34s ease, transform .34s ease';
    cur.el.style.opacity='0';
    cur.el.style.transform='translateX(-50%) translateY(24px)';
    delete S.sprites[id];
    setTimeout(function(){if(cur.el.parentNode)cur.el.remove();if(cb)cb();},350);
  }

  function doHideAll(opt){
    for(var k in S.sprites){
      if(S.sprites.hasOwnProperty(k))doHide(k,opt);
    }
  }

  /** 说话人高亮：其他人变暗 */
  function highlight(id){
    for(var k in S.sprites){
      if(!S.sprites.hasOwnProperty(k))continue;
      var el=S.sprites[k].el;
      if(el.classList)el.classList.toggle('vn-sprite-dim',!!id&&k!==id);
    }
  }

  // ============================================================
  //  CG
  // ============================================================
  function doCg(id,opt){
    if(!cgLayer)return;
    opt=opt||{};
    var svg=null;
    if(typeof CGS!=='undefined'&&CGS&&CGS.get)svg=CGS.get(id);
    if(!svg){ pump(); return; }
    var isNew=unlockCG(id,opt.title);
    cgLayer.innerHTML='<div class="vn-cg-wrap vn-ui">'+svg+
      (opt.title?'<div class="vn-cg-caption">◆ '+opt.title+' ◆</div>':'')+'</div>';
    cgLayer.classList.add('vn-cg-visible');
    // 鉴赏 CG 时收起 HUD / 工具栏 / 对话框，让插图占满整个舞台
    if(stage)stage.classList.add('vn-cg-mode');
    S.cgShown=id;
    if(isNew){
      se('unlock');
      var t=opt.title||'';
      setTimeout(function(){ toast('🎨 鉴赏模式解锁新 CG：'+t); },420);
    }else{
      se('whoosh');
    }
    // CG 是"全屏插图"，需要玩家确认后继续
    S.waiting=true;
    S.line={cg:id};
    if(nextEl)nextEl.classList.add('vn-next-show');
    // 记录到回想
    S.history.push({name:'',text:'【CG】'+(opt.title||id),cg:id});
  }

  function doCgHide(opt,cb){
    if(!cgLayer){if(cb)cb();return;}
    cgLayer.classList.remove('vn-cg-visible');
    cgLayer.innerHTML='';
    if(stage)stage.classList.remove('vn-cg-mode');
    S.cgShown=null;
    if(nextEl)nextEl.classList.remove('vn-next-show');
    if(opt&&opt.se!==false)se('whoosh');
    setTimeout(function(){if(cb)cb();},300);
  }

  // ============================================================
  //  特效
  // ============================================================
  function doFx(name,opt){
    if(typeof FX==='undefined'||!FX)return;
    opt=opt||{};
    switch(name){
      case 'shake':     FX.shake(opt.power||7,opt.ms||460); break;
      case 'bigshake':  FX.shake(opt.power||14,opt.ms||620); break;
      case 'flash':     FX.flashWhite(opt.ms||420); break;
      case 'flashBlack':FX.flashBlack(opt.ms||420); break;
      case 'flashRed':  FX.flashRed(opt.ms||420); break;
      case 'flashGold': FX.flashGold(opt.ms||520); break;
      case 'pulse':     FX.pulse(opt.power||1.05,opt.ms||520); break;
      case 'speedlines':FX.speedLines(opt.ms||700); break;
      case 'hearts':    FX.hearts(opt.n||14); se('heart'); break;
      case 'star':      FX.burstAt('spark',opt.n||26,opt.el||spriteLayer); break;
      case 'spotlight': FX.spotlight(opt.x,opt.y,opt.r); break;
      case 'unspot':    FX.clearSpotlight(); break;
      case 'rain':      FX.weather('rain',1); break;
      case 'snow':      FX.weather('snow',1); break;
      case 'sakura':    FX.weather('sakura',1); break;
      case 'leaf':      FX.weather('leaf',1); break;
      case 'starfield': FX.weather('star',1); break;
      case 'fireflies': FX.weather('firefly',1); break;
      case 'clearFx':   FX.clear(); break;
    }
  }
  function doWeather(kind,intensity){
    if(typeof FX==='undefined'||!FX)return;
    FX.weather(kind,intensity);
  }

  // ============================================================
  //  标题卡
  // ============================================================
  function doTitle(title,sub,cb){
    if(!titleCard){if(cb)cb();return;}
    titleCard.innerHTML='<div class="vn-title-inner"><div class="vn-title-main">'+(title||'')+
      '</div>'+(sub?'<div class="vn-title-sub">'+sub+'</div>':'')+'<div class="vn-title-rule"></div></div>';
    titleCard.classList.add('vn-title-show');
    se('bell');
    var ms=1700;
    S.waiting=true;
    setTimeout(function(){
      titleCard.classList.remove('vn-title-show');
      setTimeout(function(){S.waiting=false;if(cb)cb();},520);
    },ms);
  }

  // ============================================================
  //  对话（打字机）
  // ============================================================
  function displayName(who){
    if(!who)return '';
    if(typeof SPRITES!=='undefined'&&SPRITES&&SPRITES.meta){
      var m=SPRITES.meta(who);
      if(m&&m.name)return m.name;
    }
    if(typeof CLASSMATES!=='undefined'&&CLASSMATES&&CLASSMATES[who])return CLASSMATES[who].name;
    if(typeof TEACHER_NAMES!=='undefined'&&TEACHER_NAMES&&TEACHER_NAMES[who])return TEACHER_NAMES[who];
    var extra={mom:'老妈',player:'我',narrator:'',teacher:'老师',classmate_f:'女同学',classmate_m:'男同学',jingguan:'教官',xuejie:'学姐'};
    return extra[who]||who;
  }

  function doSay(b){
    var who=b.who||null;
    var text=b.text==null?'':String(b.text);
    if(!text){ pump(); return; }
    var nm=displayName(who);

    if(dlg)dlg.classList.add('vn-dialogue-show');
    if(nameBox){
      if(nm){nameBox.style.display='inline-flex';nameEl.textContent=nm;}
      else{nameBox.style.display='none';}
    }
    if(dlg)dlg.setAttribute('data-who',who||'');

    // 说话人高亮 + 立绘自动登场
    highlight(who);
    S.speaker=who;

    S.line={who:who,text:text};
    S.full=text;S.shown=0;S.typing=true;
    if(textEl)textEl.textContent='';
    if(nextEl)nextEl.classList.remove('vn-next-show');

    S.history.push({name:nm,text:text});
    if(S.history.length>500)S.history.shift();
    markRead(text);

    // 若该角色有立绘但还没上台，自动登场（VN 常见处理）
    if(who&&typeof SPRITES!=='undefined'&&SPRITES&&SPRITES.has&&SPRITES.has(who)&&!S.sprites[who]){
      var autoPos=(who==='suxiaonuan')?'center':'right';
      doShow(who,{emo:b.opt&&b.opt.emo||'normal',pos:autoPos,se:false});
    }
    if(who&&S.sprites[who]&&b.opt&&b.opt.emo)setEmotion(who,b.opt.emo);

    S.waiting=true;
    if(S.skip||S.auto&&S.speed<=0){ completeLine(); return; }
    startTyping();
  }

  function startTyping(){
    if(S.rafId)cancelAnimationFrame(S.rafId);
    S.typeLast=performance.now();
    S.typeAcc=0;
    if(S.speed<=0){ completeLine(); return; }
    var step=function(now){
      if(!S.typing)return;
      var dt=now-S.typeLast;S.typeLast=now;
      S.typeAcc+=dt;
      var per=S.speed;
      var adv=0;
      while(S.typeAcc>=per&&S.shown<S.full.length){S.typeAcc-=per;adv++;}
      if(adv>0){
        S.shown=Math.min(S.full.length,S.shown+adv);
        if(textEl)textEl.textContent=S.full.slice(0,S.shown);
        // 打字音：每 3 个字响一次，避免嘈杂
        if(S.shown%3===0)se('typing');
      }
      if(S.shown>=S.full.length){ completeLine(); return; }
      S.rafId=requestAnimationFrame(step);
    };
    S.rafId=requestAnimationFrame(step);
  }

  function completeLine(){
    S.typing=false;
    if(S.rafId){cancelAnimationFrame(S.rafId);S.rafId=null;}
    S.shown=S.full.length;
    if(textEl)textEl.textContent=S.full;
    if(nextEl)nextEl.classList.add('vn-next-show');
    if(S.skip){ setTimeout(function(){ if(S.skip)advance(); },24); return; }
    if(S.auto&&!S.choiceOpen){
      clearTimeout(S.autoTimer);
      var wait=S.autoDelay+Math.min(2600,S.full.length*45);
      S.autoTimer=setTimeout(function(){ if(S.auto&&!S.choiceOpen)advance(); },wait);
    }
  }

  /** 推进：正在打字→立刻显示全句；已显示完→下一节拍 */
  function advance(){
    if(S.popupOpen>0)return;
    // 新闻卡：点一下提前收起
    if(S.newsOpen){ if(_newsClose)_newsClose(); pump(); return; }
    if(S.cgShown){
      // CG 展示中，点击关闭 CG 并继续
      S.waiting=false;
      doCgHide({},function(){pump();});
      return;
    }
    if(S.typing){completeLine();return;}
    if(!S.waiting)return;
    S.waiting=false;
    clearTimeout(S.autoTimer);
    if(nextEl)nextEl.classList.remove('vn-next-show');
    pump();
  }

  // ============================================================
  //  选项
  // ============================================================
  /* ------------------------------------------------------------
   *  选项音效
   *  ------------------------------------------------------------
   *  要求：**每次选择选项都要用不同的音效**。
   *
   *  用两个互不干扰的维度，保证任何一次选择都和上一次不同，
   *  而且不存在"取模互相抵消"导致音色退化的情况：
   *
   *    音色  PICK_BY_INDEX[选项序号]   → A/B/C/D 各用一种乐器
   *    变调  _pickRot++ % 5            → 每选一次音高就换一档
   *
   *  选项序号决定"哪一个"，选择计数决定"第几次"，
   *  两者都不会互相抵消 —— 无论玩家怎么点、点哪一项，
   *  相邻两次选择的声音必然不同。
   *
   *  ⚠️ 曾经把两者相加再取模（(基址+序号)%8），结果基址每次 +3、
   *  序号每次 +1，索引实际只前进 4，而 gcd(4,8)=4 ——
   *  音色退化到只剩 2 种。这类写法不要再用了。
   * ------------------------------------------------------------ */
  var PICK_BY_INDEX=['pickWood','pickBell','pickBlip','pickChime',
                     'pickPluck','pickPop','pickGlass','select'];
  var OPEN_SOUNDS=['choiceOpen','page','notification'];
  var _pickRot=0,_openRot=0;

  function doChoice(b){
    if(!choiceBox){ pump(); return; }
    S.choiceOpen=true;
    S.waiting=false;
    setAuto(false);
    S.history.push({name:'',text:'—— 做出选择 ——',choice:true});
    var opts=b.options||[];
    choiceBox.innerHTML='';
    if(b.prompt){
      var p=document.createElement('div');
      p.className='vn-choice-prompt';
      p.textContent=b.prompt;
      choiceBox.appendChild(p);
    }
    var wrap=document.createElement('div');
    wrap.className='vn-choice-list';
    choiceBox.appendChild(wrap);

    opts.forEach(function(o,i){
      var btn=document.createElement('button');
      btn.className='vn-choice-btn vn-ui';
      btn.style.animationDelay=(i*70)+'ms';
      var html='<span class="vn-choice-idx">'+String.fromCharCode(65+i)+'</span><span class="vn-choice-body"><span class="vn-choice-text">'+o.text+'</span>';
      if(o.hint)html+='<span class="vn-choice-hint">'+o.hint+'</span>';
      html+='</span>';
      btn.innerHTML=html;
      // 悬停音随选项序号改变音高 —— 每个选项听起来都不一样
      btn.addEventListener('mouseenter',function(){se('hesitate',i);});
      btn.addEventListener('click',function(ev){
        ev.stopPropagation();
        if(btn.disabled)return;
        var all=wrap.querySelectorAll('.vn-choice-btn');
        for(var k=0;k<all.length;k++){all[k].disabled=true;all[k].classList.add('vn-choice-locked');}
        btn.classList.add('vn-choice-picked');
        // 音色看"选的是哪一项"，变调看"这是第几次选择" —— 两者都不重样
        se(PICK_BY_INDEX[i%PICK_BY_INDEX.length],(_pickRot++)%5);
        S.history.push({name:'',text:'▸ '+o.text,choice:true});
        S.choiceOpen=false;
        setTimeout(function(){
          choiceBox.classList.remove('vn-choices-show');
          choiceBox.innerHTML='';
          if(b.cb){try{b.cb(o,i);}catch(e){if(window.console)console.error(e);}}
          pump();
        },300);
      });
      wrap.appendChild(btn);
    });
    choiceBox.classList.add('vn-choices-show');
    // 面板展开音也轮换，让每次出现选项的听感都有变化
    se(OPEN_SOUNDS[_openRot++%OPEN_SOUNDS.length]);
  }

  /** 程序化弹出一次选项（供非剧本流程复用） */
  function ask(prompt,options,cb){
    mount();
    S.queue.push({t:'choice',prompt:prompt,options:options,cb:cb});
    if(!S.running){S.running=true;}
    if(!isBusy())pump();
  }

  // ============================================================
  //  结果弹窗（替代原 showPopup，VN 风格卡片）
  // ============================================================
  function doPopup(args,cb){
    var title=args[0],resultText=args[1],changes=args[2],hiddenInfo=args[3],callback=args[4],btnLabel=args[5];
    // 先写走马灯日志（与原逻辑一致）
    // 用 try/finally 包住：即使写日志时抛异常，也必须清空 _logCtx，
    // 否则下一次弹窗会把这一条的选项重复记进走马灯。
    try{
      if(typeof _logCtx!=='undefined'&&_logCtx&&title&&typeof GS!=='undefined'&&GS){
        if(!GS.storyLog)GS.storyLog=[];
        var entry={date:fmtDate(GS.year,GS.month,GS.day),title:title,changes:{}};
        if(changes){for(var ck in changes){if(changes.hasOwnProperty(ck)&&changes[ck]!==0)entry.changes[ck]=changes[ck];}}
        if(_logCtx.choice)entry.choice=_logCtx.choice;
        if(resultText)entry.result=resultText;
        GS.storyLog.push(entry);
      }
    }catch(e){
      if(window.console)console.error('[VN] storyLog 写入失败',e);
    }finally{
      try{_logCtx=null;}catch(e2){}
    }
    if(!overlayLayer){ if(callback)callback(); if(cb)cb(); return; }
    S.popupOpen++;
    clearTimeout(S.autoTimer);           // 弹窗期间暂停自动推进
    var chg='';
    if(changes){
      for(var k in changes){
        if(!changes.hasOwnProperty(k)||changes[k]===0)continue;
        var cls=changes[k]>0?'pos':'neg';
        var sign=changes[k]>0?'+':'';
        var icon=(typeof ICON!=='undefined'&&ICON[k])||'';
        var nm=(typeof ATTR!=='undefined'&&ATTR[k])||k;
        chg+='<span class="chg-item '+cls+'">'+icon+' '+nm+' '+sign+changes[k]+'</span>';
      }
    }
    var el=document.createElement('div');
    el.className='vn-popup-overlay vn-ui';
    el.innerHTML='<div class="vn-popup-box">'+
      (title?'<div class="vn-popup-title">'+title+'</div>':'')+
      (resultText?'<div class="vn-popup-result">'+String(resultText).replace(/\n/g,'<br>')+'</div>':'')+
      (chg?'<div class="vn-popup-changes">'+chg+'</div>':'')+
      (hiddenInfo?'<div class="vn-popup-hidden">🔍 '+hiddenInfo+'</div>':'')+
      '<button class="vn-popup-btn">'+(btnLabel||'确定')+'</button></div>';
    overlayLayer.appendChild(el);        // 入场动画由 .vn-popup-box 的 animation 负责

    // 属性变化的即时演出
    if(changes){
      for(var k2 in changes){
        if(!changes.hasOwnProperty(k2)||changes[k2]===0)continue;
        se(changes[k2]>0?'confirm':'cancel');
        break;
      }
    }
    // 关闭必须是幂等的：按钮和遮罩都能触发关闭，且 220ms 淡出期间它们仍然可点。
    // 若不加保护，回调会被重复调用，后续节点被反复入队 —— 表现为剧情死循环。
    var closed=false;
    function close(){
      if(closed)return;
      closed=true;
      el.classList.add('vn-popup-out');
      setTimeout(function(){
        if(el.parentNode)el.remove();
        // 顺序很重要：先执行 callback（它通常会 VN.run 下一段剧情），
        // 此时 popupOpen 仍 > 0，isBusy() 为真，队列不会抢跑；
        // 之后再释放计数并推动队列。嵌套弹窗也能正确处理。
        //
        // try/finally 是必须的：popupOpen 参与 isBusy()，一旦 callback 抛异常
        // 而计数没有释放，引擎会永远判定"忙"，整个游戏直接卡死。
        try{
          if(callback)callback();
        }catch(e){
          if(window.console)console.error('[VN] 弹窗回调异常：',e);
        }finally{
          S.popupOpen=Math.max(0,S.popupOpen-1);
          if(cb)cb();
        }
      },220);
    }
    el.querySelector('.vn-popup-btn').addEventListener('click',function(ev){ev.stopPropagation();se('click');close();});
    el.addEventListener('click',function(ev){ if(ev.target===el){se('click');close();} });
  }

  /** 保留原签名的兼容入口 */
  function popup(title,resultText,changes,hiddenInfo,callback,btnLabel){
    mount();
    S.queue.push({t:'popup',args:[title,resultText,changes,hiddenInfo,callback,btnLabel]});
    if(!isBusy()){S.running=true;pump();}
  }

  // ============================================================
  //  每日新闻 · 屏幕中央卡片
  //  新的一天开始时播放，读完自动收起，也可以点击提前跳过。
  // ============================================================
  var _newsEl=null,_newsTimer=null,_newsClose=null;

  function doNews(text,meta,cb){
    if(!stage||!text){ if(cb)cb(); return; }
    if(!_newsEl){
      _newsEl=document.createElement('div');
      _newsEl.id='vn-news-card';
      _newsEl.className='vn-ui';
      stage.appendChild(_newsEl);
    }
    meta=meta||{};
    _newsEl.innerHTML=
      '<div class="vn-news-box">'+
        '<div class="vn-news-head">'+
          '<span class="vn-news-tag">📰 校园快讯</span>'+
          '<span class="vn-news-date">'+(meta.date||'')+'</span>'+
        '</div>'+
        '<div class="vn-news-body">'+String(text).replace(/\n/g,'<br>')+'</div>'+
        '<div class="vn-news-foot">点击继续</div>'+
      '</div>';
    _newsEl.classList.add('vn-news-show');
    se('notification');
    S.newsOpen=true;
    S.waiting=true;
    var closed=false;
    function close(){
      if(closed)return;
      closed=true;
      clearTimeout(_newsTimer);
      if(_newsEl)_newsEl.classList.remove('vn-news-show');
      S.newsOpen=false;
      S.waiting=false;
      _newsClose=null;
      if(cb)cb();
    }
    _newsClose=close;
    // 停留时长随文字长度增加；点击可提前跳过
    var ms=Math.min(7200,2400+String(text).length*62);
    _newsTimer=setTimeout(function(){ if(closed)return; close(); pump(); },ms);
  }

  // ============================================================
  //  属性变化 · 屏幕中央浮字（带音效与粒子）
  // ============================================================
  var _statAcc={},_statTimer=null,_statEl=null;

  /** 累加一批属性变化，稍后合并成一次浮字（避免连续结算时刷屏） */
  function statFloat(changes){
    if(!changes)return;
    var any=false;
    for(var k in changes){
      if(changes.hasOwnProperty(k)&&changes[k]){_statAcc[k]=(_statAcc[k]||0)+changes[k];any=true;}
    }
    if(!any)return;
    if(_statTimer)clearTimeout(_statTimer);
    _statTimer=setTimeout(flushStatFloat,150);
  }

  function flushStatFloat(){
    _statTimer=null;
    var acc=_statAcc;_statAcc={};
    var keys=[],k;
    for(k in acc){ if(acc.hasOwnProperty(k)&&acc[k])keys.push(k); }
    if(!keys.length||!stage)return;

    if(!_statEl){
      _statEl=document.createElement('div');
      _statEl.id='vn-statfloat';
      _statEl.className='vn-ui';
      stage.appendChild(_statEl);
    }
    var net=0,favorUp=false;
    var box=document.createElement('div');
    box.className='vn-stat-float';
    for(var i=0;i<keys.length;i++){
      var key=keys[i],v=acc[key];
      net+=v;
      if(/Fav$|favor$/i.test(key)&&v>0)favorUp=true;
      var ic=(typeof ICON!=='undefined'&&ICON[key])||'';
      var nm=(typeof ATTR!=='undefined'&&ATTR[key])||key;
      var chip=document.createElement('span');
      chip.className='vn-stat-chip '+(v>0?'pos':'neg');
      chip.style.animationDelay=(i*50)+'ms';
      chip.textContent=ic+' '+nm+' '+(v>0?'+':'')+v;
      box.appendChild(chip);
    }
    _statEl.innerHTML='';
    _statEl.appendChild(box);
    void box.offsetWidth;                 // 强制重排，确保入场动画触发
    box.classList.add('vn-stat-show');
    setTimeout(function(){if(box.parentNode)box.parentNode.removeChild(box);},1600);

    // 金钱单独给金币声；荣誉大涨给嘉奖声；其余按正负给确认 / 取消
    if(typeof acc.money==='number'&&acc.money!==0)se('coin');
    else if(typeof acc.glory==='number'&&acc.glory>=5)se('fanfare');
    else se(net>=0?'confirm':'cancel');
    if(typeof FX!=='undefined'&&FX){
      if(favorUp)FX.hearts(10);
      else if(net>0)FX.burst('spark',12);
    }
  }

  // ============================================================
  //  Toast / 顶栏提示
  // ============================================================
  var toastTimer=null;
  function toast(msg,ms){
    mount();
    var t=document.getElementById('vn-toast');
    if(!t){
      if(!overlayLayer)return;
      t=document.createElement('div');
      t.id='vn-toast';
      overlayLayer.appendChild(t);
    }
    t.textContent=msg;
    t.classList.add('vn-toast-show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(function(){t.classList.remove('vn-toast-show');},ms||2200);
  }

  // ============================================================
  //  模式控制
  // ============================================================
  function setAuto(v){
    S.auto=!!v;
    if(toolbarEl){
      var b=toolbarEl.querySelector('[data-act="auto"]');
      if(b)b.classList.toggle('vn-active',S.auto);
    }
    if(S.auto&&!S.typing&&S.waiting&&!S.choiceOpen){
      clearTimeout(S.autoTimer);
      S.autoTimer=setTimeout(function(){if(S.auto)advance();},S.autoDelay);
    }
    if(!S.auto)clearTimeout(S.autoTimer);
    return S.auto;
  }
  function setSkip(v){
    var nv=!!v;
    if(nv===S.skip)return S.skip;
    S.skip=nv;
    if(toolbarEl){
      var b=toolbarEl.querySelector('[data-act="skip"]');
      if(b)b.classList.toggle('vn-active',S.skip);
    }
    if(S.skip){
      setAuto(false);
      if(S.typing)completeLine();
      else if(S.waiting&&!S.choiceOpen)setTimeout(function(){if(S.skip)advance();},20);
    }
    return S.skip;
  }
  function isAuto(){return S.auto;}
  function isSkip(){return S.skip;}

  function hideUI(v){
    S.uiHidden=!!v;
    if(stage)stage.classList.toggle('vn-ui-hidden',S.uiHidden);
    return S.uiHidden;
  }

  /** 回到干净的舞台（切换流程前调用） */
  function clearStage(opt){
    opt=opt||{};
    clearQueue();
    S.waiting=false;S.typing=false;S.choiceOpen=false;S.popupOpen=0;
    if(S.rafId){cancelAnimationFrame(S.rafId);S.rafId=null;}
    clearTimeout(S.autoTimer);
    doHideAll();
    doCgHide({se:false});
    if(opt.keepBg!==true){ /* 背景保留，避免闪白 */ }
    if(choiceBox){choiceBox.classList.remove('vn-choices-show');choiceBox.innerHTML='';}
    // 清场时也要把新闻卡收掉，否则会残留到下一个场景
    S.newsOpen=false;
    clearTimeout(_newsTimer);
    _newsClose=null;
    if(_newsEl)_newsEl.classList.remove('vn-news-show');
    if(dlg)dlg.classList.remove('vn-dialogue-show');
    if(titleCard)titleCard.classList.remove('vn-title-show');
    if(typeof FX!=='undefined'&&FX)FX.clear();
    if(overlayLayer)overlayLayer.innerHTML='';
    setAuto(false);setSkip(false);
  }

  /** 只清对话与立绘，保留背景 */
  function resetDialogue(){
    if(dlg)dlg.classList.remove('vn-dialogue-show');
    if(nameBox)nameBox.style.display='none';
    if(textEl)textEl.textContent='';
    if(nextEl)nextEl.classList.remove('vn-next-show');
  }

  // ============================================================
  //  查询
  // ============================================================
  function activeSprites(){ return Object.keys(S.sprites); }
  function hasSpriteOn(id){ return !!S.sprites[id]; }
  function currentBg(){ return S.bgKey; }

  // ============================================================
  //  初始化
  // ============================================================
  /* 自愈：popupOpen 参与 isBusy()，一旦某次关闭没有走完（异常 / 中途被清空），
     引擎会永远判定"忙"，整个游戏卡死。这里定期校正：
     弹窗层里已经没有弹窗节点，但计数还在 —— 说明计数泄漏了，直接归零并推动队列。 */
  setInterval(function(){
    if(S.popupOpen>0&&overlayLayer&&overlayLayer.querySelectorAll('.vn-popup-overlay').length===0){
      if(window.console)console.warn('[VN] 检测到弹窗计数泄漏，已自动校正');
      S.popupOpen=0;
      if(!isBusy())pump();
    }
  },1200);

  function init(){
    mount();
    loadSettings();
    if(typeof FX!=='undefined'&&FX)setTimeout(function(){FX.resize();},60);
  }

  // ============================================================
  return {
    // 生命周期
    init:init, mount:mount, clearStage:clearStage, resetDialogue:resetDialogue,
    // 播放
    run:run, clearQueue:clearQueue, advance:advance,
    // 节拍构造器
    bg:B.bg, show:B.show, hide:B.hide, hideAll:B.hideAll,
    say:B.say, narr:B.narr, cg:B.cg, cgHide:B.cgHide,
    fx:B.fx, se:B.se, bgm:B.bgm, bgmIf:B.bgmIf, weather:B.weather, wait:B.wait,
    title:B.title, choice:B.choice, call:B.call, news:B.news,
    // 弹窗节拍构造器：把弹窗按顺序排进剧本里
    // （注意与下面的 VN.popup 区分：那个是"立即弹出"）
    popupBeat:B.popup,
    // 直接调用（立即弹出，不经过剧本队列）
    ask:ask, popup:popup, toast:toast, statFloat:statFloat,
    newsCard:function(text,meta,cb){ doNews(text,meta,cb||function(){}); },
    // 立绘操作
    showSprite:doShow, hideSprite:doHide, setEmotion:setEmotion,
    // 立即生效版（注意：VN.hide / VN.hideAll 只是"节拍构造器"，直接调用不会执行）
    hideNow:function(id){doHide(id,{});},
    hideAllNow:function(){doHideAll({});},
    onSpriteClick:onSpriteClick, activeSprites:activeSprites, hasSpriteOn:hasSpriteOn,
    // 模式
    setAuto:setAuto, setSkip:setSkip, isAuto:isAuto, isSkip:isSkip, hideUI:hideUI,
    // 状态
    history:function(){return S.history;},
    clearHistory:function(){S.history=[];},
    currentBg:currentBg,
    settings:function(){return S.settings;},
    applySettings:function(patch){
      for(var k in patch){ if(patch.hasOwnProperty(k))S.settings[k]=patch[k]; }
      S.speed=S.settings.speed;S.autoDelay=S.settings.autoDelay;S.skipReadOnly=S.settings.skipReadOnly;
      applyUiScale(S.settings.uiScale);
      if(typeof AUDIO!=='undefined'&&AUDIO){
        try{
          AUDIO.setEnabled(S.settings.enabled);
          AUDIO.setBgmVolume(S.settings.bgmVolume);
          AUDIO.setSeVolume(S.settings.seVolume);
        }catch(e){}
      }
      saveSettings();
      return S.settings;
    },
    // 画廊
    unlockCG:unlockCG, gallery:gallery, cgCount:cgCount,
    // 内部（供 HUD 复用）
    _state:S,
    _se:se, _bgm:bgm, _markup:bgMarkup
  };
})();
