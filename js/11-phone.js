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

// --- 游戏内时钟 ---
// 手机里的时间必须跟游戏世界一致，不能取真实系统时间，
// 否则 2024 年 9 月的剧情里会出现"当前 2026 年"的深夜判定。
function phHour(){ return (GS&&GS.phone&&GS.phone.gameHour!=null)?GS.phone.gameHour:10; }
function phMinute(){ return (GS&&GS.phone&&GS.phone.gameMinute!=null)?GS.phone.gameMinute:0; }
function phClock(){ return String(phHour()).padStart(2,'0')+':'+String(phMinute()).padStart(2,'0'); }
function phoneSetClock(h,m){ phSave(); GS.phone.gameHour=h; if(m!=null)GS.phone.gameMinute=m; }

// --- 锁屏 ---
function renderPhoneLockScreen(){
  var p=ph();if(!p)return'';
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
  var now=fmtDate(GS.year,GS.month,GS.day)+' '+phClock();
  ph().messages.push({from:'player',to:to,text:text,time:now,read:true});
  // Effects
  phCheckOverData();
  // If replying to mom
  if(to==='老妈'){ph().momReplied=true;ph().momConsecutive=0;showToast('✅ 短信已发送（话费 -0.1元）');}
  else if(to.indexOf('群')>=0){showToast('✅ 群发已发送（话费 -0.1元）');}
  else{
    // Invitation logic
    var fav=GS.classmateFavor[to]||0;var hour=phHour();
    var baseRate=60;var favBonus=Math.floor(fav/10)*2;var nightPenalty=(hour>=23||hour<5)?15:0;
    var successRate=baseRate+favBonus-nightPenalty;
    var success=Math.random()*100<successRate;
    if(success){showToast('✅ 短信已发送！邀约成功率：'+successRate+'% — 对方接受了你的邀请！');}
    else{showToast('✅ 短信已发送。对方暂时没有回复…');}
    if(GS.girlfriends){for(var gi=0;gi<GS.girlfriends.length;gi++){if(GS.girlfriends[gi].id===to){syncGfFavor(to,1);updatePanel();break;}}}
  }
  // 收尾的状态栏刷新与会话重绘依赖手机界面已打开；
  // 加一道保护，避免手机未打开时调用本函数直接抛异常。
  if(document.getElementById('phone-screen')){
    updatePhoneStatusBar();
    openPhoneSMSConversation(to);
  }
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
    var hour=phHour();var isNight=hour>=23||hour<5;
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
  var courses=COURSE_ORDER;
  var lockedN=0;
  for(var i=0;i<courses.length;i++){
    var key=courses[i];var name=COURSE_NAMES[key]||key;
    // 尚未开课的科目不在教务系统里出现
    if(!isCourseUnlocked(key)){lockedN++;continue;}
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
  if(lockedN){
    html+='<div class="ph-section-title">尚未开课</div>'+
      '<div class="ph-info-row" style="opacity:.6;"><span>还有 '+lockedN+' 门课程未开课</span><span>—</span></div>';
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
  if(Math.random()<0.1&&phHour()>=22){
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
//
// 注意：init() 的调用已移至 index.html 末尾的引导脚本，
// 因为它需要按 VN.init() → VNHUD.mount() → init() 的顺序启动。
