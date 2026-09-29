/**
 * ============================================================
 *  东秦校园人生 · VN 界面层 (HUD)
 *  ------------------------------------------------------------
 *  视觉小说外壳上的所有可交互界面：
 *    · 右上角属性面板（沿用原 #val-* 等 id，updatePanel 无需改动）
 *    · 底部工具栏：自动 / 跳过 / 回想 / 存档 / 读档 / 设置 / 隐藏 / 鉴赏 / 菜单
 *    · 回想（Backlog）
 *    · 设置（文字速度 / 音量 / 跳过策略）
 *    · CG 鉴赏画廊
 *    · 多槽位存档
 *    · 🗺️ 校园地图（可操控玩法：自由选择当天去处）
 *    · 立绘互动（点击角色触发反应）
 *
 *  依赖：VN / SPRITES / CGS / FX / AUDIO
 * ============================================================
 */
var VNHUD=(function(){
  'use strict';

  var root=null, attrPanel=null;

  // ============================================================
  //  属性面板
  // ============================================================
  function buildAttrPanel(){
    var el=document.createElement('div');
    el.id='attr-panel';
    el.className='vn-ui';
    el.innerHTML=
      '<div class="vn-hud-head">'+
        '<div class="vn-hud-date"><span class="date-main" id="date-display"></span><span class="date-sub" id="weekday-display"></span></div>'+
        '<button class="vn-hud-toggle" id="vn-hud-toggle" title="收起/展开">▾</button>'+
      '</div>'+
      '<div class="vn-hud-body">'+
        '<div class="attrs">'+
          '<div class="attr-item"><span class="attr-icon">❤️</span><span class="attr-name">健康</span><span class="attr-val" id="val-health"></span></div>'+
          '<div class="attr-item"><span class="attr-icon">😊</span><span class="attr-name">幸福</span><span class="attr-val" id="val-happy"></span></div>'+
          '<div class="attr-item"><span class="attr-icon">📖</span><span class="attr-name">悟性</span><span class="attr-val" id="val-wisdom"></span></div>'+
          '<div class="attr-item"><span class="attr-icon">✨</span><span class="attr-name">魅力</span><span class="attr-val" id="val-charm"></span></div>'+
          '<div class="attr-item"><span class="attr-icon">🏆</span><span class="attr-name">荣耀</span><span class="attr-val" id="val-glory"></span></div>'+
          '<div class="attr-item"><span class="attr-icon">💰</span><span class="attr-name">金钱</span><span class="attr-val" id="val-money"></span></div>'+
          '<div class="attr-item"><span class="attr-icon">🎤</span><span class="attr-name">歌唱</span><span class="attr-val" id="val-singing"></span></div>'+
          '<div class="attr-item"><span class="attr-icon">🎭</span><span class="attr-name">表演</span><span class="attr-val" id="val-performance"></span></div>'+
          '<div class="attr-item"><span class="attr-icon">💳</span><span class="attr-name">鹏远余额</span><span class="attr-val" id="val-pengyuan"></span></div>'+
        '</div>'+
        '<div class="love-row" id="love-row" style="display:none;"><span>💕 女友</span><span class="gf-name" id="gf-name"></span><span>好感度</span><span class="gf-favor" id="gf-favor"></span></div>'+
        '<div class="favor-row" id="favor-row" style="display:none"><span>👨‍🏫 教师好感 <span id="val-teacher-favor">80</span></span><span>👥 同学好感 <span id="val-classmate-favor">80</span></span></div>'+
        '<div class="buff-row" id="buff-row"></div>'+
      '</div>';
    return el;
  }

  function toggleAttrPanel(){
    if(!attrPanel)return;
    attrPanel.classList.toggle('vn-hud-collapsed');
    try{localStorage.setItem('dongqin_hud_collapsed',attrPanel.classList.contains('vn-hud-collapsed')?'1':'0');}catch(e){}
  }

  // ============================================================
  //  工具栏
  // ============================================================
  function buildToolbar(){
    var el=document.createElement('div');
    el.id='vn-toolbar';
    el.className='vn-ui';
    el.innerHTML=
      '<button data-act="auto"   title="自动播放 (A)">⏵ 自动</button>'+
      '<button data-act="skip"   title="跳过 (Ctrl)">⏩ 跳过</button>'+
      '<button data-act="log"    title="回想 (L)">📜 回想</button>'+
      '<button data-act="save"   title="存档">💾 存档</button>'+
      '<button data-act="load"   title="读档">📂 读档</button>'+
      '<button data-act="gallery"title="CG 鉴赏">🎨 鉴赏</button>'+
      '<button data-act="phone"  title="手机">📱</button>'+
      '<button data-act="system" title="系统面板">🎒 系统</button>'+
      '<button data-act="config" title="设置">⚙️</button>'+
      '<button data-act="hide"   title="隐藏界面 (H)">👁 隐藏</button>';
    el.addEventListener('click',function(e){
      var b=e.target.closest('button');
      if(!b)return;
      e.stopPropagation();
      var a=b.getAttribute('data-act');
      onToolbar(a);
    });
    return el;
  }

  function onToolbar(a){
    switch(a){
      case 'auto':  VN.setAuto(!VN.isAuto()); break;
      case 'skip':  VN.setSkip(!VN.isSkip()); break;
      case 'log':   openBacklog(); break;
      case 'save':  openSlots('save'); break;
      case 'load':  openSlots('load'); break;
      case 'gallery': openGallery(); break;
      case 'config':  openSettings(); break;
      case 'hide':    VN.hideUI(true); break;
      case 'phone':
        if(typeof openPhone==='function')openPhone();
        else VN.toast('手机系统尚未解锁');
        break;
      case 'system': openSystemPanel(); break;
    }
  }

  // ============================================================
  //  通用覆盖层
  // ============================================================
  function layer(){ return document.getElementById('vn-overlay-layer'); }

  function modal(title,bodyHtml,opts){
    opts=opts||{};
    var l=layer();if(!l)return null;
    var wrap=document.createElement('div');
    wrap.className='vn-modal-overlay vn-ui';
    wrap.innerHTML='<div class="vn-modal '+(opts.cls||'')+'">'+
      '<div class="vn-modal-head"><span class="vn-modal-title">'+title+'</span>'+
      '<button class="vn-modal-x">✕</button></div>'+
      '<div class="vn-modal-body">'+bodyHtml+'</div>'+
      (opts.footer?'<div class="vn-modal-foot">'+opts.footer+'</div>':'')+
      '</div>';
    l.appendChild(wrap);
    // 入场动画由 CSS animation 负责（见 .vn-modal），不需要加类
    // 幂等关闭：淡出期间重复点击不会重复触发
    var closed=false;
    function close(){
      if(closed)return;
      closed=true;
      wrap.classList.add('vn-modal-out');
      setTimeout(function(){if(wrap.parentNode)wrap.remove();},200);
    }
    wrap.querySelector('.vn-modal-x').addEventListener('click',function(e){e.stopPropagation();VN._se('back');close();});
    wrap.addEventListener('click',function(e){ if(e.target===wrap)close(); });
    return {el:wrap,close:close};
  }

  // ============================================================
  //  回想 (Backlog)
  // ============================================================
  function openBacklog(){
    var h=VN.history();
    var html='';
    if(!h.length){
      html='<div class="vn-empty">还没有任何对话记录</div>';
    }else{
      for(var i=h.length-1;i>=0;i--){
        var e=h[i];
        var cls=e.choice?'vn-log-choice':(e.cg?'vn-log-cg':'');
        html+='<div class="vn-log-line '+cls+'">'+
          (e.name?'<span class="vn-log-name">'+esc(e.name)+'</span>':'')+
          '<span class="vn-log-text">'+esc(e.text)+'</span></div>';
      }
    }
    var m=modal('📜 回想 · 对话记录',html,{cls:'vn-modal-wide'});
    if(m){
      var body=m.el.querySelector('.vn-modal-body');
      setTimeout(function(){body.scrollTop=body.scrollHeight;},30);
    }
    VN._se('page');
  }

  // ============================================================
  //  设置
  // ============================================================
  function openSettings(){
    var s=VN.settings();
    var html=
      '<div class="vn-set-row"><label>文字速度</label>'+
        '<input type="range" id="set-speed" min="0" max="80" step="2" value="'+(80-s.speed)+'">'+
        '<span class="vn-set-val" id="set-speed-v">'+speedLabel(s.speed)+'</span></div>'+
      '<div class="vn-set-row"><label>自动播放间隔</label>'+
        '<input type="range" id="set-auto" min="400" max="4000" step="100" value="'+s.autoDelay+'">'+
        '<span class="vn-set-val" id="set-auto-v">'+(s.autoDelay/1000).toFixed(1)+'s</span></div>'+
      '<div class="vn-set-row"><label>背景音乐</label>'+
        '<input type="range" id="set-bgm" min="0" max="100" step="1" value="'+Math.round(s.bgmVolume*100)+'">'+
        '<span class="vn-set-val" id="set-bgm-v">'+Math.round(s.bgmVolume*100)+'%</span></div>'+
      '<div class="vn-set-row"><label>音效音量</label>'+
        '<input type="range" id="set-se" min="0" max="100" step="1" value="'+Math.round(s.seVolume*100)+'">'+
        '<span class="vn-set-val" id="set-se-v">'+Math.round(s.seVolume*100)+'%</span></div>'+
      '<div class="vn-set-row"><label>声音总开关</label>'+
        '<button class="vn-switch '+(s.enabled?'vn-on':'')+'" id="set-enabled">'+(s.enabled?'开启':'关闭')+'</button></div>'+
      '<div class="vn-set-row"><label>跳过策略</label>'+
        '<button class="vn-switch '+(s.skipReadOnly?'vn-on':'')+'" id="set-skipmode">'+(s.skipReadOnly?'仅跳过已读':'跳过全部')+'</button></div>'+
      '<div class="vn-set-row"><label>界面大小</label>'+
        '<input type="range" id="set-ui" min="80" max="140" step="5" value="'+Math.round((s.uiScale||1)*100)+'">'+
        '<span class="vn-set-val" id="set-ui-v">'+Math.round((s.uiScale||1)*100)+'%</span></div>'+
      '<div class="vn-set-row"><label>选项音效试听</label>'+
        '<button class="vn-switch" id="set-sfxdemo">▶ 依次试听 8 种</button>'+
        '<span class="vn-set-val" id="set-sfxdemo-v"></span></div>'+
      '<div class="vn-set-note">提示：游戏中按 <b>A</b> 切换自动播放，按住 <b>Ctrl</b> 快速跳过，<b>H</b> 隐藏界面，<b>L</b> 打开回想。'+
      '<br>每次选择选项都会换一种音效（音色看选项 A/B/C/D，音高看第几次选择）。</div>';
    var m=modal('⚙️ 设置',html);
    if(!m)return;
    var q=function(id){return m.el.querySelector('#'+id);};

    q('set-speed').addEventListener('input',function(){
      var sp=80-parseInt(this.value,10);
      q('set-speed-v').textContent=speedLabel(sp);
      VN.applySettings({speed:sp});
    });
    q('set-auto').addEventListener('input',function(){
      q('set-auto-v').textContent=(this.value/1000).toFixed(1)+'s';
      VN.applySettings({autoDelay:parseInt(this.value,10)});
    });
    q('set-bgm').addEventListener('input',function(){
      q('set-bgm-v').textContent=this.value+'%';
      VN.applySettings({bgmVolume:parseInt(this.value,10)/100});
    });
    q('set-se').addEventListener('input',function(){
      q('set-se-v').textContent=this.value+'%';
      VN.applySettings({seVolume:parseInt(this.value,10)/100});
      VN._se('click');
    });
    q('set-enabled').addEventListener('click',function(){
      var on=!VN.settings().enabled;
      VN.applySettings({enabled:on});
      this.classList.toggle('vn-on',on);
      this.textContent=on?'开启':'关闭';
      if(on)VN._se('confirm');
    });
    q('set-skipmode').addEventListener('click',function(){
      var ro=!VN.settings().skipReadOnly;
      VN.applySettings({skipReadOnly:ro});
      this.classList.toggle('vn-on',ro);
      this.textContent=ro?'仅跳过已读':'跳过全部';
    });
    q('set-ui').addEventListener('input',function(){
      var v=parseInt(this.value,10);
      q('set-ui-v').textContent=v+'%';
      VN.applySettings({uiScale:v/100});
    });
    // 依次播放选项音效族，便于确认"每次选择确实换了一种音效"
    q('set-sfxdemo').addEventListener('click',function(){
      if(typeof SFX==='undefined'||!SFX){VN.toast('音效模块未加载');return;}
      var list=['pickWood','pickBell','pickBlip','pickChime','pickPluck','pickPop','pickGlass','select'];
      var names={pickWood:'木质',pickBell:'铃音',pickBlip:'电子',pickChime:'风铃',
                 pickPluck:'拨弦',pickPop:'气泡',pickGlass:'玻璃',select:'经典'};
      var lbl=q('set-sfxdemo-v'),i=0;
      if(lbl)lbl.textContent='';
      (function step(){
        if(i>=list.length){ if(lbl)lbl.textContent='试听完毕'; return; }
        SFX.play(list[i]);
        if(lbl)lbl.textContent=(i+1)+'/'+list.length+' '+names[list[i]];
        i++;
        setTimeout(step,620);
      })();
    });
    VN._se('page');
  }

  function speedLabel(ms){
    if(ms<=0)return '瞬间';
    if(ms<=12)return '极快';
    if(ms<=22)return '快';
    if(ms<=34)return '标准';
    if(ms<=52)return '慢';
    return '很慢';
  }

  // ============================================================
  //  CG 鉴赏画廊
  // ============================================================
  function openGallery(){
    if(typeof CGS==='undefined'||!CGS){ VN.toast('CG 库未加载'); return; }
    var owned=VN.gallery();
    var list=CGS.list?CGS.list():[];
    if(!list.length&&CGS.IDS){ list=CGS.IDS.map(function(i){return {id:i,title:i,desc:'',chapter:1};}); }
    var have=0;
    var groups={};
    for(var i=0;i<list.length;i++){
      var it=list[i];
      var ch=it.chapter||1;
      if(!groups[ch])groups[ch]=[];
      groups[ch].push(it);
      if(owned[it.id])have++;
    }
    var html='<div class="vn-gal-stat">已解锁 <b>'+have+'</b> / '+list.length+' 张 CG</div>';
    var chNames={1:'第一章 · 初入东秦',2:'第二章 · 军训九月',3:'第三章 · 心动时刻',4:'第四章 · 舞台与赛场',5:'第五章 · 后来'};
    var zips=[];
    for(var ch in groups){
      if(!groups.hasOwnProperty(ch))continue;
      zips.push(parseInt(ch,10));
    }
    zips.sort(function(a,b){return a-b;});
    for(var z=0;z<zips.length;z++){
      var c=zips[z];
      html+='<div class="vn-gal-chapter">'+(chNames[c]||('第'+c+'章'))+'</div><div class="vn-gal-grid">';
      var items=groups[c];
      for(var j=0;j<items.length;j++){
        var t=items[j];
        var ok=!!owned[t.id];
        // 已解锁的用真实 CG 做缩略图；未解锁显示锁
        var thumb = ok && CGS.get ? CGS.get(t.id) : '🔒';
        html+='<button class="vn-gal-cell '+(ok?'vn-gal-ok':'vn-gal-lock')+'" data-cg="'+t.id+'" data-title="'+esc(t.title||'')+'">'+
          '<span class="vn-gal-thumb">'+thumb+'</span>'+
          '<span class="vn-gal-name">'+(ok?(t.title||t.id):'？？？')+'</span></button>';
      }
      html+='</div>';
    }
    var m=modal('🎨 CG 鉴赏',html,{cls:'vn-modal-wide'});
    if(!m)return;
    m.el.querySelector('.vn-modal-body').addEventListener('click',function(e){
      var cell=e.target.closest('.vn-gal-cell');
      if(!cell||cell.classList.contains('vn-gal-lock'))return;
      viewCG(cell.getAttribute('data-cg'),cell.getAttribute('data-title'));
    });
    VN._se('page');
  }

  function viewCG(id,title){
    var svg=CGS.get(id);
    if(!svg)return;
    var l=layer();if(!l)return;
    var wrap=document.createElement('div');
    wrap.className='vn-cgview-overlay vn-ui';
    wrap.innerHTML='<div class="vn-cgview-box">'+svg+
      '<div class="vn-cgview-bar"><span class="vn-cgview-title">◆ '+esc(title||'')+' ◆</span>'+
      '<span class="vn-cgview-btns"><button class="vn-cgview-x">关闭</button></span></div></div>';
    l.appendChild(wrap);
    // 入场动画由 CSS animation 负责（见 .vn-cgview-overlay）
    var closed=false;
    function close(){
      if(closed)return;
      closed=true;
      wrap.classList.add('vn-modal-out');
      setTimeout(function(){if(wrap.parentNode)wrap.remove();},200);
    }
    wrap.addEventListener('click',function(e){
      if(e.target===wrap||e.target.classList.contains('vn-cgview-x'))close();
    });
    VN._se('page');
  }

  // ============================================================
  //  存档槽位
  // ============================================================
  var SLOT_COUNT=6;

  function slotKey(i){ return 'dongqin_slot_'+i; }

  function readSlot(i){
    try{
      var raw=localStorage.getItem(slotKey(i));
      if(!raw)return null;
      var d=JSON.parse(raw);
      return d;
    }catch(e){return null;}
  }

  function slotInfo(i){
    var d=readSlot(i);
    if(!d)return null;
    var dt=d._meta||{};
    return {
      date:(d.year||'')+'年'+(d.month||'')+'月'+(d.day||'')+'日',
      title:dt.title||'',
      time:dt.time||'',
      gf:d.gfUnlocked?d.gfName:'',
      money:d.money
    };
  }

  function openSlots(mode){
    var html='<div class="vn-slot-hint">'+(mode==='save'?'选择一个槽位保存当前进度':'选择一个槽位读取存档')+'</div><div class="vn-slots">';
    for(var i=1;i<=SLOT_COUNT;i++){
      var info=slotInfo(i);
      html+='<button class="vn-slot '+(info?'vn-slot-full':'')+'" data-slot="'+i+'">'+
        '<span class="vn-slot-no">'+i+'</span>'+
        '<span class="vn-slot-main">'+
          (info?'<span class="vn-slot-date">📅 '+info.date+'</span><span class="vn-slot-title">'+esc(info.title||'—')+'</span>'+
                '<span class="vn-slot-sub">💰'+info.money+(info.gf?' · 💕'+esc(info.gf):'')+(info.time?' · '+info.time:'')+'</span>'
               :'<span class="vn-slot-empty">— 空槽位 —</span>')+
        '</span>'+
        (mode==='save'?'<span class="vn-slot-act">保存</span>':'<span class="vn-slot-act">'+(info?'读取':'—')+'</span>')+
        '</button>';
    }
    html+='</div>';
    if(mode==='save'){
      html+='<div class="vn-slot-foot"><button class="vn-btn-alt" id="vn-export">📤 导出存档文本</button>'+
            '<button class="vn-btn-alt" id="vn-import">📥 导入存档文本</button></div>';
    }
    var m=modal(mode==='save'?'💾 保存进度':'📂 读取进度',html);
    if(!m)return;
    m.el.querySelector('.vn-modal-body').addEventListener('click',function(e){
      var b=e.target.closest('.vn-slot');
      if(b){
        var idx=parseInt(b.getAttribute('data-slot'),10);
        if(mode==='save')doSave(idx);
        else{
          if(!readSlot(idx)){VN.toast('该槽位没有存档');return;}
          doLoad(idx);
        }
        m.close();
        return;
      }
      var ex=e.target.closest('#vn-export'); if(ex){m.close();if(typeof exportSave==='function')exportSave();}
      var im=e.target.closest('#vn-import'); if(im){m.close();if(typeof importSave==='function')importSave();}
    });
    VN._se('page');
  }

  function doSave(i){
    if(typeof collectSaveData!=='function'){VN.toast('存档模块未就绪');return;}
    if(!GS||GS.phase==='title'||GS.phase==='allocation'){VN.toast('当前无法存档');return;}
    var d=collectSaveData();
    d._meta={
      title:(GS.currentDay&&STORY_DAYS&&STORY_DAYS[GS.currentDay])?STORY_DAYS[GS.currentDay].title:(GS.gfUnlocked?'校园日常':'大学生活'),
      time:new Date().toLocaleString('zh-CN',{hour12:false}),
      bg:VN.currentBg()
    };
    try{
      localStorage.setItem(slotKey(i),JSON.stringify(d));
      VN._se('unlock');
      VN.toast('💾 已保存到槽位 '+i);
    }catch(e){VN.toast('存档失败：'+e.message);}
  }

  function doLoad(i){
    var d=readSlot(i);
    if(!d||typeof applySaveData!=='function'){VN.toast('存档读取失败');return;}
    try{
      applySaveData(d);
      VN._se('confirm');
      VN.toast('📂 读取槽位 '+i+' 成功');
    }catch(e){VN.toast('存档读取失败：'+e.message);}
  }

  // ============================================================
  //  系统面板（超市 / 理财 / 成绩 / 同学 / 走马灯 等原功能入口）
  // ============================================================
  function openSystemPanel(){
    var items=[
      {t:'🏪 利生超市',d:'买点零食和日用品',fn:function(){if(typeof openSupermarket==='function')openSupermarket();}},
      {t:'📈 金融理财',d:'股票交易与持仓',fn:function(){
        if(!GS.stocksUnlocked){VN.toast('尚未解锁理财系统（10月12日午后解锁）');return;}
        if(typeof openStocks==='function')openStocks();
      }},
      {t:'📊 课程成绩',d:'查看本学期预估成绩',fn:function(){if(typeof showGrades==='function')showGrades();}},
      {t:'👨‍🏫 教师好感',d:'查看已解锁教师的好感度',fn:function(){if(typeof showTeacherFavors==='function')showTeacherFavors();}},
      {t:'👥 同学名录',d:'聊天 / 赠礼 / 表白',fn:function(){if(typeof openClassmates==='function')openClassmates();}},
      {t:'📱 手机',d:'短信 / 电话 / 微信 / 教务',fn:function(){if(typeof openPhone==='function')openPhone();}},
      {t:'📜 走马灯',d:'回顾所有剧情与选择',fn:function(){if(typeof openTimeline==='function')openTimeline();}},
      {t:'🗺️ 校园地图',d:'自由前往校园各处',fn:function(){openMap();}},
      {t:'🐾 东秦猫谱',d:'校园流浪猫的收集进度',fn:function(){
        if(typeof CATS!=='undefined'&&CATS)CATS.openBook();
        else VN.toast('猫谱尚未解锁');
      }},
      {t:'🎨 CG 鉴赏',d:'查看已解锁的 CG',fn:function(){openGallery();}},
      {t:'💾 存档 / 读档',d:'多槽位保存进度',fn:function(){openSlots('save');}},
      {t:'⚙️ 设置',d:'文字速度与音量',fn:function(){openSettings();}},
      {t:'🏠 返回标题',d:'回到标题画面',fn:function(){
        confirmBox('返回标题','当前进度若未存档将会丢失，确定返回标题画面吗？',function(){
          if(typeof resetToTitle==='function')resetToTitle();
        });
      }}
    ];
    var html='<div class="vn-sysgrid">';
    for(var i=0;i<items.length;i++){
      html+='<button class="vn-sysitem" data-i="'+i+'"><span class="vn-sysitem-t">'+items[i].t+'</span><span class="vn-sysitem-d">'+items[i].d+'</span></button>';
    }
    html+='</div>';
    var m=modal('🎒 系统面板',html);
    if(!m)return;
    m.el.querySelector('.vn-modal-body').addEventListener('click',function(e){
      var b=e.target.closest('.vn-sysitem');
      if(!b)return;
      var idx=parseInt(b.getAttribute('data-i'),10);
      m.close();
      setTimeout(function(){VN._se('select');items[idx].fn();},160);
    });
    VN._se('page');
  }

  function confirmBox(title,text,onYes){
    var m=modal(title,'<div class="vn-confirm-text">'+esc(text)+'</div>',
      {footer:'<button class="vn-btn-ghost" id="vn-cf-no">取消</button><button class="vn-btn-main" id="vn-cf-yes">确定</button>'});
    if(!m)return;
    m.el.querySelector('#vn-cf-no').addEventListener('click',function(){VN._se('back');m.close();});
    m.el.querySelector('#vn-cf-yes').addEventListener('click',function(){VN._se('confirm');m.close();if(onYes)onYes();});
    VN._se('page');
  }

  // ============================================================
  //  🗺️ 校园地图 —— 可操控玩法核心
  //  玩家在海报式地图上点击地点，触发对应行动与剧情。
  // ============================================================
  // ============================================================
  //  🗺️ 东秦校园地图 —— 可操控玩法核心
  //  地理关系（以岭后街分隔南北校区）：
  //    北校区：工学馆在最北；工学馆西侧为利生超市与鹏远公寓；
  //            工学馆南侧为沉思广场；沉思广场西侧为西操场、东侧为东操场；
  //            工学馆东侧为一号食堂；东操场东侧为图书馆（自习室）；
  //            西操场南侧为体育馆。
  //    岭后街：横穿校园，分隔南北校区。
  //    南校区：最北侧为科技楼，大创实验室在楼内。
  //    泰山路：图书馆东侧，马路对面即校外夜市。
  //  海边 / 茂业天地 / 火车站 距离较远，只能走出租车通道。
  // ============================================================
  var MAP=[
    /* ---------------- 北校区 ---------------- */
    {id:'gongxue',name:'工学馆',icon:'🏫',bg:'classroom',x:44,y:9,
     desc:'主教学楼 · 大多数课程与考试都在这里',
     acts:[
       {text:'到教室认真上课',eff:{wisdom:6,glory:1},
        lines:['你提前十分钟到了教室，挑了靠前的座位。','老师今天的板书格外清楚，你把重点都记了下来。']},
       {text:'找间空教室自习',eff:{wisdom:5,happiness:-1},
        lines:['空教室里只有你一个人。','窗外偶尔传来脚步声，笔尖划过纸面的声音格外清晰。']}
     ]},
    {id:'supermarket',name:'利生超市',icon:'🏪',bg:'supermarket',x:17,y:7,
     desc:'校园便利店 · 刷现金或鹏远卡都行',
     acts:[{text:'进去逛逛',sub:'supermarket',lines:[]}]},
    {id:'dorm',name:'鹏远公寓',icon:'🛏️',bg:'dorm',x:17,y:21,
     desc:'你的宿舍 · 休息与勤工助学',
     acts:[
       {text:'回宿舍躺一会儿',eff:{health:6,happiness:5},
        lines:['你把外套往椅背上一搭，整个人摊在床上。','室友们各忙各的，难得的清净。']},
       {text:'接一份勤工助学的活',eff:{money:120,health:-7,happiness:-2},
        lines:['你在办公室帮忙整理了一下午的材料。','虽然累，但看到工资到账还是值得的。']}
     ]},
    {id:'canteen',name:'一号食堂',icon:'🍚',bg:'canteen',x:73,y:10,
     desc:'工学馆东侧的大食堂',
     acts:[{text:'好好吃一顿',eff:{happiness:6,health:2,money:-12},
        lines:['食堂阿姨今天手不抖，给你多打了一勺。','你端着餐盘找了个靠窗的位置坐下。']}]},
    {id:'plaza',name:'沉思广场',icon:'⛲',bg:'campus_path',x:44,y:25,
     desc:'校园中心广场 · 散步与社团活动',
     acts:[
       {text:'在广场上散步放空',eff:{happiness:6,health:2},
        lines:['广场上人不多，喷泉的声音很轻。','你绕着广场走了两圈，脑子里的事慢慢理顺了。']},
       {text:'参加社团活动',eff:{charm:6,glory:3,happiness:3},
        needFlag:'clubApplied',needText:'你还没有报名任何社团',
        lines:['广场边搭着一排社团展位，很热闹。','你跟着大家一起排练，不知不觉就到了傍晚。']}
     ]},
    {id:'westfield',name:'西操场',icon:'🏃',bg:'playground',x:18,y:34,
     desc:'沉思广场西侧 · 跑步锻炼',
     acts:[{text:'跑两公里',eff:{health:8,happiness:2},
        lines:['操场上人不少，你沿着跑道慢跑。','跑完两公里，出了一身汗，整个人都轻快了。']}]},
    {id:'eastfield',name:'东操场',icon:'⚽',bg:'playground',x:70,y:31,
     desc:'沉思广场东侧 · 军训与体育课场地',
     acts:[
       {text:'跑步锻炼',eff:{health:8,happiness:2},
        lines:['东操场比西操场新一些，跑道踩上去更有弹性。','你跑了三圈，风从耳边呼呼地过。']},
       {text:'踢一场球',eff:{health:5,charm:4,happiness:5},
        lines:['你被拉进了一场临时凑的球局。','踢得满头大汗，但很久没这么痛快过了。']}
     ]},
    {id:'library',name:'图书馆 · 自习室',icon:'📚',bg:'library',x:80,y:33,
     desc:'东操场东侧 · 安静自习',
     acts:[
       {text:'找位子安静自习',eff:{wisdom:9,happiness:-2},
        lines:['图书馆的空调很足，你找了个靠窗的位置。','阳光斜斜地落在书页上，时间过得很快。']},
       {text:'在自习室熬到深夜',eff:{wisdom:10,health:-4,happiness:-2},bg:'study_room',
        lines:['自习室的灯一直亮到很晚。','你和一群陌生人在同一盏灯下熬到了十一点。']}
     ]},
    {id:'gym',name:'体育馆',icon:'🏀',bg:'gym',x:19,y:45,
     desc:'西操场南侧 · 室内运动',
     acts:[{text:'进去打球（-10 金钱）',eff:{health:9,charm:2,money:-10},
        lines:['体育馆里木地板锃亮，回声很大。','你打了一下午，胳膊酸得抬不起来。']}]},

    /* ---------------- 泰山路对面 ---------------- */
    {id:'nightmarket',name:'校外夜市',icon:'🏮',bg:'street_night',x:94,y:41,
     desc:'泰山路对面 · 和室友逛夜市',
     acts:[{text:'逛夜市（-30 金钱）',eff:{happiness:12,money:-30,health:-2},
        lines:['夜市的烟火气很足。','你们一人买了一份烤冷面，边走边吃。']}]},

    /* ---------------- 南校区 ---------------- */
    {id:'tech',name:'科技楼 · 大创实验室',icon:'🔬',bg:'lab',x:46,y:70,
     desc:'南校区最北侧建筑 · 科创与竞赛基地',
     acts:[{text:'在实验室写代码、做科创',eff:{wisdom:8,performance:3},
        needFlag:'dachuangJoined',needText:'你还没加入大创交流群',
        lines:['实验室里键盘声此起彼伏。','你调了一下午的 bug，终于在傍晚跑通了。']}]}
  ];

  /* 出租车目的地：距离较远，需单独坐车前往 */
  var TAXI=[
    {id:'seaside',name:'海边',icon:'🌊',bg:'sea_day',cost:20,
     desc:'去海边走走',
     eff:{happiness:9,health:3,money:-20},
     lines:['坐半小时公交就到了海边。','海风带着咸味，浪一层一层地涌上来。']},
    {id:'mall',name:'茂业天地',icon:'🛍️',bg:'street_night',cost:35,
     desc:'市区商场 · 购物看电影',
     eff:{happiness:14,charm:3,money:-35},
     lines:['商场里暖气很足，人也不少。','你看了场电影，又在一楼买了杯奶茶，慢悠悠地晃了一下午。']},
    {id:'station',name:'秦皇岛站',icon:'🚉',bg:'station',cost:25,
     desc:'火车站 · 返乡与远行',
     eff:{happiness:5,money:-25},
     lines:['候车大厅的广播一遍遍重复着车次。','你站在大屏下看了一会儿，想起刚来秦皇岛那天。']}
  ];

  function mapAvailable(m){ return true; }
  function actAvailable(a){ return !(a&&a.needFlag&&GS&&!GS[a.needFlag]); }

  function openMap(callback){
    var i,j,a;
    var html='<div class="vn-map-hint">点击地图上的地点查看可做的事 · 每天可自由行动 1 次</div>'+
      '<div class="vn-map">'+
        '<div class="vn-map-grid">'+
          '<span class="vn-map-region" style="left:4%;top:1.5%">🏫 北校区</span>'+
          '<span class="vn-map-region vn-map-region-s" style="left:4%;top:58%">🔬 南校区</span>'+
          '<span class="vn-map-road-h"></span>'+
          '<span class="vn-map-road-h-label">岭 后 街</span>'+
          '<span class="vn-map-road-v"></span>'+
          '<span class="vn-map-road-v-label">泰<br>山<br>路</span>';
    for(i=0;i<MAP.length;i++){
      var m=MAP[i];
      // 今天有猫在这个地点出没 → 挂一个 🐾 标记
      var catHere=(typeof CATS!=='undefined'&&CATS)?CATS.atLocation(m.id):null;
      html+='<button class="vn-map-pin'+(catHere?' vn-map-pin-cat':'')+'" data-i="'+i+'" style="left:'+m.x+'%;top:'+m.y+'%">'+
        (catHere?'<span class="vn-map-cat" title="'+catHere.name+'">🐾</span>':'')+
        '<span class="vn-map-icon">'+m.icon+'</span>'+
        '<span class="vn-map-name">'+m.name+'</span></button>';
    }
    html+='</div>'+
      '<div class="vn-map-info" id="vn-map-info">把鼠标移到地点上查看详情</div>'+
      '<div class="vn-map-taxi"><span class="vn-taxi-label">🚕 打车前往</span>';
    for(j=0;j<TAXI.length;j++){
      html+='<button class="vn-taxi-btn" data-t="'+j+'">'+TAXI[j].icon+' '+TAXI[j].name+
        ' <b>¥'+TAXI[j].cost+'</b></button>';
    }
    html+='</div></div>';

    var mm=modal('🗺️ 东秦校园地图',html,{cls:'vn-modal-wide'});
    if(!mm)return;
    var body=mm.el.querySelector('.vn-modal-body');
    var info=mm.el.querySelector('#vn-map-info');

    function showActs(idx){
      var m=MAP[idx];
      var catHere=(typeof CATS!=='undefined'&&CATS)?CATS.atLocation(m.id):null;
      var h='<div class="vn-map-info-head"><b>'+m.icon+' '+m.name+'</b><span>'+m.desc+'</span></div>'+
            (catHere?'<div class="vn-map-catline">🐾 你注意到 '+catHere.emoji+' <b>'+catHere.name+'</b>（'+catHere.breed+'）就在附近。</div>':'')+
            '<div class="vn-map-acts">';
      if(catHere){
        h+='<button class="vn-map-act vn-map-act-cat" data-cat="'+catHere.id+'">🐾 去会会'+catHere.name+'</button>';
      }
      for(var k=0;k<m.acts.length;k++){
        var a0=m.acts[k];
        var ok=actAvailable(a0);
        h+='<button class="vn-map-act '+(ok?'':'vn-map-lock')+'" data-i="'+idx+'" data-a="'+k+'">'+
           a0.text+(ok?'':' <span class="vn-warn">（'+a0.needText+'）</span>')+'</button>';
      }
      h+='</div>';
      info.innerHTML=h;
    }

    body.addEventListener('mouseover',function(e){
      var p=e.target.closest('.vn-map-pin');
      if(!p)return;
      var m=MAP[parseInt(p.getAttribute('data-i'),10)];
      if(!info.querySelector('.vn-map-info-head')){
        info.innerHTML='<b>'+m.icon+' '+m.name+'</b> · '+m.desc;
      }
    });

    body.addEventListener('click',function(e){
      var cb2=e.target.closest('[data-cat]');
      if(cb2){
        var catId=cb2.getAttribute('data-cat');
        mm.close();VN._se('select');
        setTimeout(function(){ if(typeof CATS!=='undefined'&&CATS)CATS.interact(catId,callback); },220);
        return;
      }
      var tb=e.target.closest('.vn-taxi-btn');
      if(tb){
        var t=TAXI[parseInt(tb.getAttribute('data-t'),10)];
        if(GS&&GS.money<t.cost){VN.toast('现金不足：需要 ¥'+t.cost);VN._se('fail');return;}
        mm.close();VN._se('select');
        setTimeout(function(){ goTaxi(t,callback); },220);
        return;
      }
      var ab=e.target.closest('.vn-map-act');
      if(ab){
        var mi=parseInt(ab.getAttribute('data-i'),10);
        var ai=parseInt(ab.getAttribute('data-a'),10);
        var loc=MAP[mi],act=loc.acts[ai];
        if(!actAvailable(act)){VN.toast(act.needText||'条件不足');VN._se('fail');return;}
        mm.close();VN._se('select');
        setTimeout(function(){ goPlace(loc,act,callback); },220);
        return;
      }
      var p=e.target.closest('.vn-map-pin');
      if(!p)return;
      VN._se('click');
      showActs(parseInt(p.getAttribute('data-i'),10));
    });
    VN._se('page');
  }

  /** 执行地图上的某个行动 */
  function goPlace(m,act,callback){
    if(act&&act.sub==='supermarket'){
      if(typeof openSupermarket==='function')openSupermarket();
      if(callback)callback(null);
      return;
    }
    var beats=[VN.bg((act&&act.bg)||m.bg,{ms:520})];
    var para=(act&&act.lines)||m.lines||[];
    for(var i=0;i<para.length;i++)beats.push(VN.narr(para[i]));
    var eff=Object.assign({},(act&&act.eff)||m.eff||{});
    beats.push(VN.call(function(){
      var ch=doEffects(eff);
      updatePanel();
      VN._se('confirm');
      VN.popup('🗺️ '+m.name,'',ch,null,function(){
        if(callback)callback(m);
      });
    }));
    VN.run(beats);
  }

  /** 打车前往校外目的地 */
  function goTaxi(t,callback){
    var beats=[
      VN.narr('你在校门口拦了辆出租车，报了目的地——「'+t.name+'」。'),
      VN.bg(t.bg,{ms:600})
    ];
    for(var i=0;i<t.lines.length;i++)beats.push(VN.narr(t.lines[i]));
    beats.push(VN.call(function(){
      var ch=doEffects(Object.assign({},t.eff));
      updatePanel();
      VN.popup('🚕 '+t.name,'',ch,null,function(){
        if(callback)callback(t);
      });
    }));
    VN.run(beats);
  }

  // ============================================================
  //  立绘互动 —— 点击角色触发反应
  // ============================================================
  var INTERACT_LINES={
    suxiaonuan:[
      {t:'「诶？你怎么突然看我……」她别开脸，耳根有点红。',f:1},
      {t:'「今天……今天的天气很好呢。」她小声说。',f:1},
      {t:'「你、你是不是又没吃早饭？」她皱着眉把你的书包带子理正。',f:2},
      {t:'「啊，花瓣落在你肩膀上了。」她伸手替你拈掉。',f:2},
      {t:'「……再看的话，我要生气了哦。」她嘴上这么说，眼睛却弯了起来。',f:1}
    ],
    huye:[{t:'「哟，找我啥事？走，哥带你搓一顿！」他用力拍了拍你的肩。',f:1}],
    naikou:[{t:'「唔……让我再睡五分钟……」他连头都没抬。',f:1}],
    jingye:[{t:'「要一起去操场跑两圈吗？」他活动了一下手腕。',f:1}],
    hanpeng:[{t:'「有想法就来实验室找我，别客气。」韩鹏老师笑了笑。',f:1}],
    tania:[{t:'"Hey! Need something? Come on, don\'t be shy." Tania 冲你眨了眨眼。',f:1}],
    shijianming:[{t:'「年轻人，多读书，多思考。」史鉴明老师推了推眼镜。',f:1}],
    zhourui:[{t:'「这道题不会？下课来办公室。」周蕊老师头也不抬。',f:1}],
    hanjie:[{t:'「上课要认真听讲。」韩杰老师敲了敲讲台。',f:1}],
    cherry:[{t:'「有什么心事可以随时来找老师聊。」Cherry 温柔地说。',f:1}],
    mom:[{t:'「钱够不够花？不够妈给你打。」电话那头是熟悉的唠叨。',f:1}],
    _default:[{t:'对方朝你点了点头。',f:0}]
  };
  function spriteInteract(id){
    var pool=INTERACT_LINES[id]||INTERACT_LINES._default;
    var today=(typeof dateKey==='function'&&GS)?dateKey(GS.year,GS.month,GS.day):'';
    // 计数挂在 GS 上：放在模块作用域里的话，刷新页面就能重置，
    // 等于每日 3 次的限制形同虚设。
    if(!GS._spriteInteract)GS._spriteInteract={};
    var rec=GS._spriteInteract[id];
    if(!rec||rec.day!==today)rec=GS._spriteInteract[id]={day:today,n:0};
    if(rec.n>=3){ VN.toast('今天已经和她/他聊得够多了'); return; }
    if(!VN.hasSpriteOn(id))return;
    rec.n++;
    var line=pool[Math.floor(Math.random()*pool.length)];
    var sp=VN._state.sprites[id];
    if(sp&&typeof FX!=='undefined'&&FX)FX.burstAt('heart',8,sp.el,{spread:120,speed:60,size:6});
    VN._se('heart');
    // VN.say 是节拍构造器，必须经由 VN.run 才会真正播放
    VN.run([VN.say(id,line.t,{emo:'smile'})]);
    if(line.f&&typeof GS!=='undefined'&&GS){
      var ch={};
      if(GS.classmateFavor&&GS.classmateFavor.hasOwnProperty(id)){
        GS.classmateFavor[id]=Math.max(0,(GS.classmateFavor[id]||0)+line.f);
        ch.classmateFavor=line.f;
      }
      if(GS.girlfriends){
        for(var i=0;i<GS.girlfriends.length;i++){
          if(GS.girlfriends[i].id===id){
            GS.girlfriends[i].favor=Math.max(0,GS.girlfriends[i].favor+line.f);
            GS.gfFavor=GS.girlfriends[i].favor;
            ch.gfFavor=line.f;
            break;
          }
        }
      }
      updatePanel();
      if(ch.gfFavor||ch.classmateFavor)VN.toast('💕 好感度 +'+line.f);
    }
  }

  function registerInteractions(){
    VN.onSpriteClick(function(id){
      if(VN.isSkip()||VN._state.choiceOpen)return;
      spriteInteract(id);
    });
  }

  // ============================================================
  //  工具
  // ============================================================
  function esc(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  // ============================================================
  //  挂载
  // ============================================================
  function mount(){
    var stage=document.getElementById('vn-stage');
    if(!stage||root)return;
    root=stage;

    attrPanel=buildAttrPanel();
    stage.appendChild(attrPanel);

    var tb=buildToolbar();
    stage.appendChild(tb);

    var hideBtn=document.createElement('button');
    hideBtn.id='vn-unhide';
    hideBtn.className='vn-ui';
    hideBtn.title='显示界面 (H)';
    hideBtn.textContent='👁';
    hideBtn.addEventListener('click',function(e){e.stopPropagation();VN.hideUI(false);});
    stage.appendChild(hideBtn);

    document.getElementById('vn-hud-toggle').addEventListener('click',function(e){
      e.stopPropagation();toggleAttrPanel();
    });
    try{
      if(localStorage.getItem('dongqin_hud_collapsed')==='1')attrPanel.classList.add('vn-hud-collapsed');
    }catch(e){}

    registerInteractions();
  }

  function refresh(){ if(typeof updatePanel==='function'&&GS)updatePanel(); }

  return {
    mount:mount, refresh:refresh,
    openBacklog:openBacklog, openSettings:openSettings, openGallery:openGallery,
    openSlots:openSlots, openSystemPanel:openSystemPanel, openMap:openMap,
    confirm:confirmBox, viewCG:viewCG, spriteInteract:spriteInteract,
    MAP:MAP, TAXI:TAXI, mapAvailable:mapAvailable, actAvailable:actAvailable,
    goPlace:goPlace, goTaxi:goTaxi,
    // 供其它模块（如校园猫）复用同一套弹窗外观
    _showModal:function(title,html,opts){ return modal(title,html,opts||{}); },
    _esc:esc
  };
})();
