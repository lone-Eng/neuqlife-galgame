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
  // 假期结束后残留的同行女友 id：正常会在 advanceToNextDay 清掉，
  // 但读档 / 跳过流程可能绕过，这里做一次兜底清理。
  if(GS._holidayGfId&&(GS.month!==10||GS.day>7)){delete GS._holidayGfId;}
  if(dk==='2024-10-14'){GS.weather=WEATHER_TYPES.rain;}
  else{GS.weather=pickDailyWeather();}
  doEffects(GS.weather.effects);
  // 每日的手机时钟：8:00–21:59 之间随机；
  // 具体的时段会在渲染每个阶段时按"早晨/晚间/深夜"再同步一次。
  if(GS.phone){GS.phone.gameHour=8+Math.floor(Math.random()*14);GS.phone.gameMinute=Math.floor(Math.random()*60);}
  // 每天刷新校园里出没的流浪猫
  if(typeof CATS!=='undefined'&&CATS)CATS.rollDaily();
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
          GS.courseGrades[gk2]=Math.max(0,Math.min(100,GS.courseGrades[gk2]+ph.gEffects[gk2]));markCourseUnlocked(gk2);
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
              GS.courseGrades[gk]=Math.max(0,Math.min(100,GS.courseGrades[gk]+pc.hidden.gEffects[gk]));markCourseUnlocked(gk);
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
