/**
 * ============================================================
 *  东秦校园人生 · 校园猫养成「东秦猫谱」
 *  ------------------------------------------------------------
 *  只服务于地图上的自由行动，不介入剧情主线。
 *
 *  玩法：
 *    · 五只流浪猫各有名字、出没地点与习性
 *    · 每天随机 2–3 只出现在各自的常驻地点（地图上显示 🐾 标记）
 *    · 相遇后可：喂食（¥5）/ 撸猫 / 拍照 / 不打扰
 *    · 累计好感达到 30 →「赢得信任」，触发专属小事件
 *    · 好感 100 时可拍到「最后一张照片」
 *    · 五只猫的最终照片全部收集 → 解锁 CG《东秦猫谱》
 *
 *  依赖：VN（演出）/ CGS（CG）/ FX（特效）/ phoneAddPhoto（相册）
 * ============================================================
 */
var CATS=(function(){
  'use strict';

  // ------------------------------------------------------------
  //  猫谱数据
  // ------------------------------------------------------------
  var LIST=[
    {id:'daju',name:'大橘',breed:'橘猫',emoji:'🐱',color:'#e8a94e',
     spot:'canteen',spotName:'一号食堂',time:'中午',
     desc:'蹲在食堂后门，见谁都蹭，是全校最胖的一只。',
     lines:['大橘看见你就地一滚，露出圆滚滚的肚皮。','它对你的零食比对你有兴趣得多。']},
    {id:'meiqiu',name:'煤球',breed:'狸花猫',emoji:'🐈',color:'#7a7268',
     spot:'nightmarket',spotName:'校外夜市',time:'夜晚',
     desc:'夜市的常客，警惕得很，但架不住烤肠的香味。',
     lines:['煤球蹲在摊位底下，眼睛在暗处发着光。','它盯了你三秒，确认没有威胁，才慢慢靠近。']},
    {id:'xueqiu',name:'雪球',breed:'白猫',emoji:'🐈',color:'#f2f2f6',
     spot:'library',spotName:'图书馆 · 自习室',time:'下午',
     desc:'总在图书馆台阶上晒太阳，不怕人，但也不理人。',
     lines:['雪球摊在台阶上，像一团被晒化的棉花糖。','你伸手，它懒洋洋地掀了下眼皮，没动。']},
    {id:'xiaohua',name:'小花',breed:'三花猫',emoji:'🐱',color:'#e8b0a0',
     spot:'plaza',spotName:'沉思广场',time:'傍晚',
     desc:'广场喷泉边的常驻居民，据说已经被三届学生喂过。',
     lines:['小花从喷泉边踱过来，尾巴竖得笔直。','它绕着你转了两圈，用脑袋蹭了蹭你的裤脚。']},
    {id:'momo',name:'墨墨',breed:'黑猫',emoji:'🐈⬛',color:'#4a4a56',
     spot:'westfield',spotName:'西操场',time:'清晨',
     desc:'神出鬼没，只有清早才露面，见过它的人不多。',
     lines:['墨墨蹲在看台的最高一级，居高临下地打量你。','它没有跑。这已经是很大的进步了。']}
  ];

  // 互动数值
  var EFFECT={
    feed:  {cost:5,   fav:8,  hap:2, label:'喂食',  emoji:'🍚'},
    pet:   {cost:0,   fav:5,  hap:4, label:'撸猫',  emoji:'✋'},
    photo: {cost:0,   fav:2,  hap:3, label:'拍照',  emoji:'📷'},
    leave: {cost:0,   fav:0,  hap:0, label:'不打扰',emoji:'🚶'}
  };
  var TRUST_AT=30;     // 赢得"猫的信任"的好感阈值
  var MAX_FAV=100;     // 好感上限

  // 每个地点每天最多撸一次，避免刷好感
  function dayKey(){ return (typeof dateKey==='function'&&GS)?dateKey(GS.year,GS.month,GS.day):''; }

  // ------------------------------------------------------------
  //  状态
  // ------------------------------------------------------------
  function state(){
    if(!GS)return null;
    if(!GS.cats)GS.cats={};
    for(var i=0;i<LIST.length;i++){
      var id=LIST[i].id;
      if(!GS.cats[id])GS.cats[id]={fav:0,met:0,fed:0,pet:0,shots:0,final:false,trusted:false,lastDay:'',lastAct:''};
    }
    if(!GS.catsToday)GS.catsToday={};
    if(!GS._catDay)GS._catDay='';
    return GS.cats;
  }
  function of(id){ state(); return GS.cats[id]; }

  /** 每天刷新出没的猫（2–3 只），由 processDay 调用 */
  function rollDaily(){
    state();
    var k=dayKey();
    if(GS._catDay===k)return;              // 同一天只掷一次
    GS._catDay=k;
    var pool=LIST.slice();
    var n=2+(Math.random()<0.45?1:0);      // 2 或 3 只
    var pick={};
    for(var i=0;i<n&&pool.length;i++){
      var j=Math.floor(Math.random()*pool.length);
      pick[pool.splice(j,1)[0].id]=1;
    }
    GS.catsToday=pick;
  }

  /** 该地点今天有哪只猫（没有则返回 null） */
  function atLocation(locId){
    state();
    for(var i=0;i<LIST.length;i++){
      if(LIST[i].spot===locId&&GS.catsToday[LIST[i].id])return LIST[i];
    }
    return null;
  }
  function byId(id){
    for(var i=0;i<LIST.length;i++){ if(LIST[i].id===id)return LIST[i]; }
    return null;
  }
  function list(){ return LIST.slice(); }

  /** 收集进度：已获得最终照片的数量 */
  function progress(){
    state();
    var n=0;
    for(var i=0;i<LIST.length;i++){ if(GS.cats[LIST[i].id].final)n++; }
    return {got:n,total:LIST.length};
  }
  function allCollected(){ return progress().got>=LIST.length; }

  // ------------------------------------------------------------
  //  互动演出
  // ------------------------------------------------------------
  function interact(catId,callback){
    var cat=byId(catId);
    if(!cat)return;
    var st=of(catId);
    var today=dayKey();
    if(st.lastDay===today&&st.lastAct==='pet'){
      VN.toast(cat.name+'今天已经让你撸够了，改天再来吧');
      if(callback)callback(null);
      return;
    }

    var opts=[
      {text:EFFECT.feed.emoji+' 喂食',hint:'¥'+EFFECT.feed.cost+' · 好感 +'+EFFECT.feed.fav+'（当前好感 '+st.fav+'）'},
      {text:EFFECT.pet.emoji+' 撸一会儿',hint:'好感 +'+EFFECT.pet.fav+' · 幸福 +'+EFFECT.pet.hap},
      {text:EFFECT.photo.emoji+' 拍张照片',hint:st.fav>=MAX_FAV?'📸 可以拍到「最后一张照片」了！':'好感 +'+EFFECT.photo.fav+' · 存入手机相册'},
      {text:EFFECT.leave.emoji+' 不打扰它',hint:'保持距离也是一种温柔'}
    ];

    VN.run([
      VN.bg(bgFor(cat.spot),{ms:520}),
      VN.bgm('cat'),                       // 撸猫专属曲目（外部音频，缺失自动回退）
      VN.narr(cat.lines[0]),
      VN.narr(cat.lines[1]),
      VN.se('cat'),
      VN.choice('🐾 '+cat.name+'（'+cat.breed+'）',opts,function(o,i){
        doAct(cat,i,callback);
      })
    ]);
  }

  function bgFor(spotId){
    var m={canteen:'canteen',nightmarket:'street_night',library:'library',
           plaza:'campus_path',westfield:'playground'};
    var bg=m[spotId]||'campus_path';
    if(typeof BGS!=='undefined'&&BGS&&BGS.has&&!BGS.has(bg))bg='campus_path';
    return bg;
  }

  function doAct(cat,i,callback){
    var st=of(cat.id);
    var today=dayKey();
    var act=['feed','pet','photo','leave'][i];
    var e=EFFECT[act];
    var firstMeet=!st.met;

    if(act==='leave'){
      VN.run([
        VN.narr('你放轻脚步，绕开了它。'+cat.name+'抬眼看了你一下，又趴了回去。')
      ],function(){ if(callback)callback(null); });
      return;
    }

    if(act==='feed'){
      if(GS.money<e.cost){
        VN.toast('现金不足，需要 ¥'+e.cost);
        VN._se('fail');
        if(callback)callback(null);
        return;
      }
    }

    // 结算
    var ch=doEffects(act==='feed'?{money:-e.cost,happiness:e.hap}:{happiness:e.hap});
    var before=st.fav;
    st.fav=Math.max(0,Math.min(MAX_FAV,st.fav+e.fav));
    st.met++;
    st.lastDay=today;st.lastAct=act;
    if(act==='feed')st.fed++;
    if(act==='pet')st.pet++;
    if(act==='photo'){
      st.shots++;
      phoneAddPhoto(cat.name+'的照片','在'+cat.spotName+'拍到的'+cat.breed+'「'+cat.name+'」。');
    }
    // 猫的好感不进 ch：ATTR/ICON 里没有对应表项，浮字会把原始 key 显示出来。
    // 好感变化在下面的结果弹窗里单独用文字呈现。
    updatePanel();

    // 演出
    var beats=[];
    if(act==='feed'){
      beats.push(VN.narr('你把零食放在它面前。'+cat.name+'犹豫了一下，低头吃了起来。'));
      beats.push(VN.se('water'));
    }else if(act==='pet'){
      beats.push(VN.narr('你蹲下来，慢慢伸出手。'+cat.name+'没有躲。'));
      beats.push(VN.narr('它的毛比你想象的软，喉咙里发出低低的呼噜声。'));
      beats.push(VN.se('purr'));
      beats.push(VN.fx('hearts',{n:8}));
    }else if(act==='photo'){
      beats.push(VN.narr('你掏出手机，悄悄对准了它。'));
      beats.push(VN.se('camera'));
      beats.push(VN.narr('快门声惊动了它，'+cat.name+'抬起头看了你一眼，但没走。'));
    }

    // 首次相遇 / 赢得信任 / 最终照片
    var unlockedCG=false;
    if(firstMeet){
      beats.push(VN.narr('这是你第一次真正靠近'+cat.name+'。'));
    }
    if(!st.trusted&&st.fav>=TRUST_AT){
      st.trusted=true;
      beats.push(VN.fx('flashGold'));
      beats.push(VN.se('unlock'));
      beats.push(VN.narr('★ 「猫的信任」达成 —— '+cat.name+'开始主动往你身边凑了。'));
    }
    if(act==='photo'&&st.fav>=MAX_FAV&&!st.final){
      st.final=true;
      beats.push(VN.fx('flashGold'));
      beats.push(VN.se('fanfare'));
      beats.push(VN.narr('★ 你拍到了'+cat.name+'的「最后一张照片」—— 它正对着镜头，眼睛亮亮的。'));
      if(allCollected()){
        unlockedCG=true;
        beats.push(VN.narr('五只猫，五张照片，齐了。'));
      }
    }

    beats.push(VN.call(function(){
      updatePanel();
      var title=act==='feed'?'🍚 喂食 · '+cat.name:(act==='pet'?'✋ 撸猫 · '+cat.name:'📷 拍照 · '+cat.name);
      VN.popup(title,
        '好感度 '+before+' → '+st.fav+' / '+MAX_FAV,
        ch,null,function(){
          if(unlockedCG)showCatBook(callback);
          else if(callback)callback(cat);
        });
    }));
    VN.run(beats);
  }

  /** 集齐五张最终照片 → 解锁《东秦猫谱》CG */
  function showCatBook(callback){
    var canUnlock=typeof CGS!=='undefined'&&CGS&&CGS.has&&CGS.has('cg_catbook');
    VN.run([
      VN.bgm('romantic'),
      VN.fx('flashGold'),
      canUnlock?VN.cg('cg_catbook',{title:'东秦猫谱'}):VN.narr('★ 你已经集齐了五只猫的最终照片。'),
      canUnlock?VN.cgHide():VN.call(function(){}),
      VN.call(function(){
        VN._se('fanfare');
        if(canUnlock)VN.toast('🐾 解锁 CG《东秦猫谱》');
      }),
      VN.narr('大橘、煤球、雪球、小花、墨墨——\n\n这个校园里，从此有五只猫认得你了。')
    ],function(){ if(callback)callback(null); });
  }

  // ------------------------------------------------------------
  //  UI：猫谱总览
  // ------------------------------------------------------------
  function openBook(){
    state();
    var html='<div class="vn-catbook-hint">在地图上找到 🐾 标记即可与它们相遇 · 好感 100 可拍到最终照片</div>';
    html+='<div class="vn-catbook">';
    for(var i=0;i<LIST.length;i++){
      var cat=LIST[i],st=GS.cats[cat.id];
      var out=!!GS.catsToday[cat.id];
      var pct=Math.round(st.fav/MAX_FAV*100);
      html+='<div class="vn-catcard'+(st.met?'':' vn-catcard-locked')+'">'+
        '<div class="vn-catcard-head">'+
          '<span class="vn-catcard-emoji" style="background:'+cat.color+'22;border-color:'+cat.color+'88">'+cat.emoji+'</span>'+
          '<span class="vn-catcard-name">'+cat.name+
            (st.trusted?' <span class="vn-catcard-trust">★信任</span>':'')+
            (st.final?' <span class="vn-catcard-trust">📸已完成</span>':'')+
          '</span>'+
          '<span class="vn-catcard-breed">'+cat.breed+'</span>'+
        '</div>'+
        '<div class="vn-catcard-desc">'+(st.met?cat.desc:'还没见过它。'+cat.desc)+'</div>'+
        '<div class="vn-catcard-meta">📍'+cat.spotName+' · '+cat.time+(out?' · <b class="vn-catcard-out">今天出没</b>':'')+'</div>'+
        '<div class="vn-catbar"><i style="width:'+pct+'%;background:'+cat.color+'"></i></div>'+
        '<div class="vn-catcard-stats">好感 '+st.fav+' / '+MAX_FAV+
          ' · 相遇 '+st.met+' 次 · 照片 '+st.shots+' 张</div>'+
      '</div>';
    }
    html+='</div>';
    var prog=progress();
    html+='<div class="vn-catbook-foot">最终照片收集：<b>'+prog.got+' / '+prog.total+'</b>'+
      (prog.got>=prog.total?' · 🎉 已解锁 CG《东秦猫谱》':'')+'</div>';
    if(typeof VNHUD!=='undefined'&&VNHUD&&VNHUD._showModal){
      VNHUD._showModal('🐾 东秦猫谱',html,{cls:'vn-modal-wide'});
    }
  }

  return {
    LIST:LIST, EFFECT:EFFECT, TRUST_AT:TRUST_AT, MAX_FAV:MAX_FAV,
    state:state, of:of, byId:byId, list:list,
    rollDaily:rollDaily, atLocation:atLocation,
    interact:interact, openBook:openBook,
    progress:progress, allCollected:allCollected
  };
})();
