/**
 * 东秦校园人生 - 重构版
 * ========================
 * 目录：
 *   §1  工具函数 & 常量数据    (ATTR, ICON, 天气, 状态)
 *   §2  引擎核心               (showPopup, updatePanel, processDay, renderDayPhase)
 *   §3  故事系统               (STORY_NODES, STORY_DAYS 9.07-10.15)
 *   §4  国庆假期               (HOLIDAY_DAYS, 路线, GF选择)
 *   §5  同学系统               (CLASSMATES, 随机事件, 聊天/赠礼/表白)
 *   §6  女友系统               (girlfriends, 事件池, 分手/多女友)
 *   §7  金融理财               (股票, 走势图, T+1)
 *   §8  Drama组队               (10.15 邀请系统)
 *   §9  走马灯 & 存档           (timeline, save/load, export/import)
 *   §10 初始化                  (renderTitle, init)
 */

// §1 ==================== 工具函数 & 常量数据 ====================
function $(id){return document.getElementById(id);}
function weekday(y,m,d){return ['日','一','二','三','四','五','六'][new Date(y,m-1,d).getDay()];}
function fmtDate(y,m,d){return y+'年'+m+'月'+d+'日';}
function dateKey(y,m,d){return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
function isWeekend(y,m,d){var w=new Date(y,m-1,d).getDay();return w===0||w===6;}
function isWeekday(y,m,d){return !isWeekend(y,m,d);}
function daysInMonth(y,m){if(m===2)return(y%4===0&&(y%100!==0||y%400===0))?29:28;return [31,28,31,30,31,30,31,31,30,31,30,31][m-1];}

var ATTR={health:'健康',happiness:'幸福',wisdom:'悟性',charm:'魅力',glory:'荣耀',money:'金钱',singing:'歌唱能力',performance:'表演能力',pengyuanBalance:'鹏远余额',gfFavor:'好感度',hanpengHaoGan:'韩鹏好感',teacherFavor:'教师好感',classmateFavor:'同学好感',taniaFavor:'Tania好感',shijianmingFavor:'史鉴明好感',zhouruiFavor:'周蕊好感',hanjieFavor:'韩杰好感',cherryFavor:'Cherry好感',liguoruiFavor:'李国瑞好感',songjunliFavor:'宋俊丽好感',lixinyaoFavor:'李心瑶好感',huyeFav:'虎爷好感',naikouFav:'奶扣好感',jingyeFav:'京爷好感'};
var ICON={health:'❤️',happiness:'😊',wisdom:'📖',charm:'✨',glory:'🏆',money:'💰',singing:'🎤',performance:'🎭',pengyuanBalance:'💳',gfFavor:'💕',hanpengHaoGan:'🤝',teacherFavor:'👨‍🏫',classmateFavor:'👥',taniaFavor:'👩‍🏫',shijianmingFavor:'👨‍🔬',zhouruiFavor:'👩‍🏫',hanjieFavor:'👨‍🏫',cherryFavor:'👩‍🏫',liguoruiFavor:'👨‍💻',songjunliFavor:'👩‍🏫',lixinyaoFavor:'👩‍🏫',huyeFav:'🐯',naikouFav:'🍼',jingyeFav:'🏅'};

var COURSE_NAMES={academicLang:'学术语言交流与沟通（中级）',cppProg:'C++程序设计基础',advancedMath:'高等数学建模A',pe:'体育',moralLaw:'思想道德与法治',dataAnalysis:'智能数据分析导论',mentalHealth:'心理健康教育',careerPlan:'大学生职业生涯规划',xingshiZhengce:'形势与政策',laborEducation:'劳动教育'};
var TEACHER_NAMES={hanpeng:'韩鹏',tania:'Tania',shijianming:'史鉴明',zhourui:'周蕊',hanjie:'韩杰',cherry:'Cherry',liguorui:'李国瑞',songjunli:'宋俊丽',lixinyao:'李心瑶'};

var HOLIDAY_ROUTES={
  home:{name:'返乡回家过节',dailyEffects:{money:-180,happiness:12,health:8},skipMeal:true,gfMod:{favorDecay:5}},
  campus:{name:'留守东秦校园',dailyEffects:{},skipMeal:false,gfMod:{},hasCampusEvents:true},
  couple:{name:'与女友短途出游',dailyEffects:{money:-160,happiness:15},skipMeal:false,gfMod:{favorBonus:18,specialChance:0.35},requiresGf:true},
  internship:{name:'前往鸟爷控股短期实习',dailyEffects:{money:100,health:-10},skipMeal:false,gfMod:{rejectExtra:5}},
  dorm:{name:'宿舍摆烂躺平',dailyEffects:{health:10,happiness:14,wisdom:-12},skipMeal:false,gfMod:{acceptPenalty:2}}
};

// ===== 天气系统 =====
var WEATHER_TYPES={
  sunny:{name:'晴天',icon:'☀️',desc:'阳光明媚，天光透亮，校园光线充足，气温舒适。',effects:{health:2,happiness:1},prob:0.28,seasons:'all'},
  cloudy:{name:'多云',icon:'⛅',desc:'云朵零散分布，阳光时隐时现，体感平和。',effects:{},prob:0.25,seasons:'all'},
  overcast:{name:'阴天',icon:'☁️',desc:'天空被乌云遮盖，光线昏暗，氛围沉闷。',effects:{happiness:-2},prob:0.18,seasons:'all'},
  fog:{name:'大雾',icon:'🌫️',desc:'浓雾笼罩校园，能见度降低，空气潮湿微凉。',effects:{wisdom:-1,health:-1},prob:0.08,seasons:'all'},
  rain:{name:'雨',icon:'🌧️',desc:'细雨连绵，地面潮湿，出行需撑伞，户外行动不便。',effects:{health:-1,wisdom:1},prob:0.12,seasons:'warm',sleepBonus:true},
  thunderstorm:{name:'雷雨',icon:'⛈️',desc:'乌云压顶，雷声阵阵，雨势急促，户外闷热压抑。',effects:{happiness:-2,wisdom:2},prob:0.09,seasons:'warm',sleepBonus:true},
  snow:{name:'雪',icon:'❄️',desc:'雪花飘落，地面覆上薄雪，气温走低，寒风相伴。',effects:{health:-1,happiness:1},prob:0.12,seasons:'cold',sleepBonus:true},
  blizzard:{name:'暴雪',icon:'🌨️',desc:'大雪纷飞，视野受阻，户外严寒刺骨，出行困难。',effects:{health:-3,happiness:-2},prob:0.09,seasons:'cold',sleepBonus:true}
};

function pickDailyWeather(){
  var m=GS.month;var season=(m>=4&&m<=10)?'warm':'cold';
  var pool=[];var totalProb=0;
  for(var wk in WEATHER_TYPES){
    if(!WEATHER_TYPES.hasOwnProperty(wk))continue;
    var wt=WEATHER_TYPES[wk];
    if(wt.seasons==='all'||wt.seasons===season){pool.push({key:wk,type:wt,prob:wt.prob});totalProb+=wt.prob;}
  }
  var roll=Math.random()*totalProb;var cum=0;
  for(var i=0;i<pool.length;i++){cum+=pool[i].prob;if(roll<cum)return{key:pool[i].key,name:pool[i].type.name,icon:pool[i].type.icon,desc:pool[i].type.desc,effects:pool[i].type.effects,sleepBonus:!!pool[i].type.sleepBonus};}
  return{key:'sunny',name:'晴天',icon:'☀️',desc:WEATHER_TYPES.sunny.desc,effects:WEATHER_TYPES.sunny.effects,sleepBonus:false};
}

function getWeatherSleepBonus(){
  if(GS.weather&&GS.weather.sleepBonus)return{happiness:3};
  return{};
}
function getWeatherSleepNarrative(){
  if(!GS.weather||!GS.weather.sleepBonus)return'';
  var k=GS.weather.key;
  if(k==='rain')return'窗外细雨绵绵，雨声簌簌伴你入眠。被窝里的暖意与雨天的静谧交织，这一觉睡得格外香甜。';
  if(k==='thunderstorm')return'窗外雷声隐隐、雨势急促，屋里却格外温暖安全。伴着雷雨声沉入梦乡，睡得分外踏实。';
  if(k==='snow')return'窗外雪花静静飘落，宿舍里暖意融融。雪天的被窝仿佛有魔力，让人睡得特别沉、特别香。';
  if(k==='blizzard')return'窗外暴雪呼啸，屋里暖气十足。这种天气窝在被子里睡觉简直是人间至福，幸福感在心中弥漫。';
  return'';
}
