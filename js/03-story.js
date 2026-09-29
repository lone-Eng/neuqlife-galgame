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
  // 第二个选项是"婉拒 / 敷衍 / 冷落"分支。原数据只扣玩家幸福度、不给 gfEffects，
  // 导致冷落女友完全没有关系代价 —— 可以天天拒绝而好感不掉。
  // 这里按该选项自身的幸福度损失推算好感惩罚：数据里已经用 happiness 的
  // 数值大小区分了态度恶劣程度（-3 是委婉拒绝，-9 是彻底敷衍）。
  var e2=choice2eff||{};
  var h=(typeof e2.happiness==='number')?e2.happiness:0;
  var pen=1+Math.round(-h/2);                   // h<=0，越冷漠扣得越多
  var gf2={ gfFavor:-Math.max(1,Math.min(5,pen)) };
  return {
    title:title,text:text,
    choices:[
      {text:choice1text,effects:choice1eff||{},gfEffects:choice1gf||{},result:choice1result},
      {text:choice2text,effects:e2,gfEffects:gf2,result:choice2result}
    ]
  };
}
