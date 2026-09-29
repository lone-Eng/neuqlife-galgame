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