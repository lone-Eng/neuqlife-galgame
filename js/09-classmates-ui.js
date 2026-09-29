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
