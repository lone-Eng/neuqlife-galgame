/**
 * ============================================================
 *  东秦校园人生 · 演出特效层 (FX)
 *  ------------------------------------------------------------
 *  基于 Canvas 的粒子系统 + 屏幕级特效，为 VN 舞台提供：
 *    · 粒子：樱花 / 雨 / 雪 / 落叶 / 星光 / 萤火 / 爱心 / 气泡
 *    · 屏幕：闪白 / 闪黑 / 震动 / 缩放冲击 / 泛红 / 速度线
 *    · 转场：淡入淡出 / 黑场切入 / 十字擦除
 *    · 氛围：暗角 / 聚光灯 / 色调滤镜
 *
 *  依赖：无（纯 Canvas 2D）。
 *  对外接口：FX.*
 * ============================================================
 */
var FX = (function(){
  'use strict';

  var canvas=null,ctx=null,layer=null;
  var W=0,H=0,dpr=1;
  var parts=[];          // 活动粒子
  var running=false;
  var rafId=null;
  var lastT=0;
  var weather=null;      // 持续天气: 'sakura'|'rain'|'snow'|'leaf'|'star'|'firefly'
  var weatherRate=0;
  var spawnAcc=0;

  // ---------- 粒子预设 ----------
  // 每种粒子定义：生成参数、绘制方式、运动方式
  var PRESETS={
    sakura:{
      count:46, rate:14,
      make:function(){
        return {
          x:Math.random()*(W+160)-80,
          y:-30-Math.random()*H*0.4,
          vx:-26-Math.random()*34,
          vy:26+Math.random()*30,
          r:5+Math.random()*7,
          rot:Math.random()*Math.PI*2,
          vr:(Math.random()-0.5)*1.6,
          sway:Math.random()*Math.PI*2,
          swayAmp:14+Math.random()*22,
          life:1, a:0.55+Math.random()*0.4,
          hue:Math.random()<0.28?350:335+Math.random()*14
        };
      },
      draw:function(p,t){
        var x=p.x+Math.sin(t*0.0011+p.sway)*p.swayAmp;
        ctx.save();
        ctx.translate(x,p.y);ctx.rotate(p.rot);
        ctx.globalAlpha=p.a*p.life;
        ctx.fillStyle='hsl('+p.hue+',78%,'+(76+p.r)+'%)';
        // 五瓣樱花：五个椭圆绕中心
        for(var i=0;i<5;i++){
          ctx.save();ctx.rotate(i*Math.PI*2/5);
          ctx.beginPath();
          ctx.ellipse(0,-p.r*0.62,p.r*0.42,p.r*0.66,0,0,Math.PI*2);
          ctx.fill();
          ctx.restore();
        }
        ctx.beginPath();ctx.arc(0,0,p.r*0.26,0,Math.PI*2);
        ctx.fillStyle='hsl('+p.hue+',72%,92%)';ctx.fill();
        ctx.restore();
      },
      update:function(p,dt){
        p.sway+=dt*0.0012;
        p.y+=p.vy*dt*0.001;
        p.x+=p.vx*dt*0.001;
        p.rot+=p.vr*dt*0.001;
        if(p.y>H+40||p.x<-100){p.life=0;}
      }
    },
    rain:{
      count:150, rate:150,
      make:function(){
        return {
          x:Math.random()*(W+200)-100,
          y:-40-Math.random()*H,
          vy:620+Math.random()*420,
          vx:-90-Math.random()*50,
          len:12+Math.random()*20,
          a:0.16+Math.random()*0.3,
          life:1
        };
      },
      draw:function(p){
        ctx.globalAlpha=p.a;
        ctx.strokeStyle='#cfe2f5';
        ctx.lineWidth=1.1;
        ctx.beginPath();
        ctx.moveTo(p.x,p.y);
        ctx.lineTo(p.x+p.vx*0.022,p.y+p.len);
        ctx.stroke();
      },
      update:function(p,dt){
        p.y+=p.vy*dt*0.001;
        p.x+=p.vx*dt*0.001;
        if(p.y>H+30||p.x<-120||p.x>W+120)p.life=0;
      }
    },
    snow:{
      count:110, rate:40,
      make:function(){
        return {
          x:Math.random()*(W+120)-60,
          y:-20-Math.random()*H*0.5,
          vx:-14-Math.random()*22,
          vy:36+Math.random()*54,
          r:1.4+Math.random()*3.2,
          sway:Math.random()*Math.PI*2,
          swayAmp:10+Math.random()*20,
          a:0.5+Math.random()*0.5,
          life:1
        };
      },
      draw:function(p,t){
        var x=p.x+Math.sin(t*0.0009+p.sway)*p.swayAmp;
        ctx.globalAlpha=p.a*p.life;
        ctx.fillStyle='#ffffff';
        ctx.beginPath();ctx.arc(x,p.y,p.r,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=p.a*p.life*0.35;
        ctx.beginPath();ctx.arc(x,p.y,p.r*2.1,0,Math.PI*2);ctx.fill();
      },
      update:function(p,dt){
        p.sway+=dt*0.001;
        p.y+=p.vy*dt*0.001;
        p.x+=p.vx*dt*0.001;
        if(p.y>H+20||p.x<-80){p.life=0;}
      }
    },
    leaf:{
      count:34, rate:12,
      make:function(){
        var hue=[28,38,15,45][Math.floor(Math.random()*4)];
        return {
          x:Math.random()*(W+160)-80,y:-30-Math.random()*H*0.5,
          vx:-30-Math.random()*44,vy:44+Math.random()*48,
          r:7+Math.random()*7,rot:Math.random()*Math.PI*2,
          vr:(Math.random()-0.5)*2.4,
          sway:Math.random()*Math.PI*2,swayAmp:16+Math.random()*26,
          hue:hue,a:0.6+Math.random()*0.35,life:1
        };
      },
      draw:function(p,t){
        var x=p.x+Math.sin(t*0.0012+p.sway)*p.swayAmp;
        ctx.save();ctx.translate(x,p.y);ctx.rotate(p.rot);
        ctx.globalAlpha=p.a*p.life;
        ctx.fillStyle='hsl('+p.hue+',66%,'+(48+p.r)+'%)';
        ctx.beginPath();
        ctx.moveTo(0,-p.r);
        ctx.quadraticCurveTo(p.r*0.9,0,0,p.r);
        ctx.quadraticCurveTo(-p.r*0.9,0,0,-p.r);
        ctx.fill();
        ctx.strokeStyle='hsl('+p.hue+',60%,34%)';ctx.lineWidth=0.8;
        ctx.beginPath();ctx.moveTo(0,-p.r);ctx.lineTo(0,p.r);ctx.stroke();
        ctx.restore();
      },
      update:function(p,dt){
        p.sway+=dt*0.0013;p.y+=p.vy*dt*0.001;p.x+=p.vx*dt*0.001;p.rot+=p.vr*dt*0.001;
        if(p.y>H+30||p.x<-90)p.life=0;
      }
    },
    star:{
      count:40, rate:9,
      make:function(){
        return {
          x:Math.random()*W,y:Math.random()*H*0.7,
          r:1+Math.random()*2.2,
          tw:Math.random()*Math.PI*2,
          a:0.35+Math.random()*0.6,life:1,static:true
        };
      },
      draw:function(p,t){
        var k=0.55+0.45*Math.sin(t*0.002+p.tw);
        ctx.globalAlpha=p.a*k*p.life;
        ctx.fillStyle='#fff8dc';
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=p.a*k*p.life*0.3;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r*3,0,Math.PI*2);ctx.fill();
      },
      update:function(p){ if(p.static)p.life=1; }
    },
    heart:{
      count:18, rate:6,
      make:function(){
        return {
          x:W/2,y:H*0.55,
          vx:(Math.random()-0.5)*60,vy:-60-Math.random()*70,
          r:7+Math.random()*9,
          rot:(Math.random()-0.5)*0.6,
          vr:(Math.random()-0.5)*0.8,
          a:0.85,hue:340+Math.random()*18,life:1
        };
      },
      draw:function(p){
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
        ctx.globalAlpha=Math.max(0,p.a*p.life);
        ctx.fillStyle='hsl('+p.hue+',82%,'+(62+p.r*0.5)+'%)';
        var s=p.r/12;
        ctx.beginPath();
        ctx.moveTo(0,4*s);
        ctx.bezierCurveTo(-9*s,-3*s,-5*s,-11*s,0,-5.5*s);
        ctx.bezierCurveTo(5*s,-11*s,9*s,-3*s,0,4*s);
        ctx.fill();
        ctx.globalAlpha=Math.max(0,p.a*p.life*0.4);
        ctx.beginPath();ctx.arc(-3*s,-5*s,2.4*s,0,Math.PI*2);
        ctx.fillStyle='#fff';ctx.fill();
        ctx.restore();
      },
      update:function(p,dt){
        p.x+=p.vx*dt*0.001;p.y+=p.vy*dt*0.001;
        p.vy+=36*dt*0.001;                 // 缓慢下坠，像飘起来的泡泡
        p.rot+=p.vr*dt*0.001;
        p.life-=dt/(p._fade||1200);
      }
    },
    spark:{
      count:24, rate:24,
      make:function(){
        var ang=Math.random()*Math.PI*2,sp=90+Math.random()*180;
        return {
          x:W/2,y:H/2,
          vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,
          r:1.6+Math.random()*3.4,
          a:1,hue:[46,52,190,320][Math.floor(Math.random()*4)],life:1
        };
      },
      draw:function(p){
        ctx.globalAlpha=Math.max(0,p.a*p.life);
        var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*4);
        g.addColorStop(0,'hsla('+p.hue+',100%,88%,1)');
        g.addColorStop(0.4,'hsla('+p.hue+',100%,70%,.55)');
        g.addColorStop(1,'hsla('+p.hue+',100%,60%,0)');
        ctx.fillStyle=g;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r*4,0,Math.PI*2);ctx.fill();
      },
      update:function(p,dt){
        p.x+=p.vx*dt*0.001;p.y+=p.vy*dt*0.001;
        p.vx*=0.965;p.vy*=0.965;
        p.vy+=14*dt*0.001;
        p.life-=dt/(p._fade||900);
      }
    },
    firefly:{
      count:26, rate:5,
      make:function(){
        return {
          x:Math.random()*W,y:H*0.35+Math.random()*H*0.6,
          vx:(Math.random()-0.5)*22,vy:(Math.random()-0.5)*18,
          r:1.8+Math.random()*2.4,
          ph:Math.random()*Math.PI*2,
          a:0.7+Math.random()*0.3,life:1
        };
      },
      draw:function(p,t){
        var k=0.25+0.75*Math.abs(Math.sin(t*0.0016+p.ph));
        var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*7);
        g.addColorStop(0,'rgba(255,246,150,'+(p.a*k)+')');
        g.addColorStop(0.35,'rgba(210,240,120,'+(p.a*k*0.45)+')');
        g.addColorStop(1,'rgba(180,230,90,0)');
        ctx.fillStyle=g;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r*7,0,Math.PI*2);ctx.fill();
      },
      update:function(p,dt){
        p.x+=p.vx*dt*0.001;p.y+=p.vy*dt*0.001;
        if(Math.random()<0.02){p.vx=(Math.random()-0.5)*24;p.vy=(Math.random()-0.5)*20;}
        if(p.x<0||p.x>W)p.vx*=-1;
        if(p.y<H*0.3||p.y>H)p.vy*=-1;
      }
    }
  };

  // 一次性爆发（非持续天气）
  var bursts=[];

  function ensure(){
    if(canvas)return;
    layer=document.getElementById('vn-fx-layer');
    if(!layer)return;
    canvas=document.createElement('canvas');
    canvas.className='vn-fx-canvas';
    layer.appendChild(canvas);
    ctx=canvas.getContext('2d');
    resize();
    window.addEventListener('resize',resize);
  }

  function resize(){
    if(!canvas||!layer)return;
    var r=layer.getBoundingClientRect();
    W=Math.max(1,Math.round(r.width));
    H=Math.max(1,Math.round(r.height));
    dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(W*dpr);
    canvas.height=Math.round(H*dpr);
    canvas.style.width=W+'px';
    canvas.style.height=H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function loop(t){
    if(!running)return;
    var dt=Math.min(60,t-lastT||16);lastT=t;
    ctx.clearRect(0,0,W,H);

    // 持续天气：按速率补充粒子
    if(weather&&PRESETS[weather]){
      var pre=PRESETS[weather];
      spawnAcc+=dt*0.001*weatherRate;
      while(spawnAcc>=1){
        spawnAcc-=1;
        if(parts.length<pre.count*2.2)parts.push(pre.make());
      }
    }
    // 更新 + 绘制
    for(var i=parts.length-1;i>=0;i--){
      var p=parts[i];
      var pr=PRESETS[p._k];
      if(!pr){parts.splice(i,1);continue;}
      pr.update(p,dt);
      if(p.life<=0){parts.splice(i,1);continue;}
      ctx.globalAlpha=1;
      pr.draw(p,t);
    }
    // 一次性爆发
    for(var b=bursts.length-1;b>=0;b--){
      var bu=bursts[b];
      bu.t+=dt;
      bu.draw(dt);
      if(bu.t>=bu.dur)bursts.splice(b,1);
    }
    ctx.globalAlpha=1;
    if(parts.length===0&&bursts.length===0&&!weather){running=false;rafId=null;return;}
    rafId=requestAnimationFrame(loop);
  }

  function start(){
    if(running)return;
    running=true;lastT=performance.now();
    rafId=requestAnimationFrame(loop);
  }

  function spawn(kind,n,opts){
    var pre=PRESETS[kind];
    if(!pre||!ctx)return;
    for(var i=0;i<n;i++){
      var p=pre.make();
      p._k=kind;
      if(opts&&opts.origin){
        // 从指定点向外扩散
        p.x=opts.origin.x+(Math.random()-0.5)*(opts.spread||60);
        p.y=opts.origin.y+(Math.random()-0.5)*(opts.spread||60);
        var ang=Math.random()*Math.PI*2,sp=(opts.speed||90)+Math.random()*(opts.speedVar||70);
        p.vx=Math.cos(ang)*sp;p.vy=Math.sin(ang)*sp-40;
        p.life=1;p._fade=(opts.fade||1100);
        p._burst=true;
      }
      parts.push(p);
    }
    start();
  }

  // ============================================================
  //  对外接口
  // ============================================================
  var API={};

  /** 持续天气：'sakura'|'rain'|'snow'|'leaf'|'star'|'firefly'，传 null 停止 */
  API.weather=function(kind,intensity){
    ensure();
    if(!ctx){return;}
    if(!kind){
      weather=null;weatherRate=0;
      // 让已有粒子自然落尽
      start();
      return;
    }
    var pre=PRESETS[kind];
    if(!pre)return;
    weather=kind;
    weatherRate=(intensity==null?1:intensity)*pre.rate;
    // 立即铺满一屏，避免"从空到满"的突兀
    for(var i=0;i<pre.count;i++){
      var p=pre.make();p._k=kind;p.y=Math.random()*H;p.life=1;parts.push(p);
    }
    start();
  };

  /** 在原地爆发一圈粒子（好感度爱心、解锁星屑等） */
  API.burst=function(kind,n,opts){
    ensure();
    if(!ctx)return;
    spawn(kind||'star',n||18,opts||{origin:{x:W/2,y:H/2}});
  };

  /** 在某个 DOM 元素的位置爆发（用于立绘/爱心） */
  API.burstAt=function(kind,n,el,opts){
    ensure();
    if(!ctx||!el)return;
    var lr=layer.getBoundingClientRect(),r=el.getBoundingClientRect();
    spawn(kind||'star',n||18,Object.assign({
      origin:{x:r.left-lr.left+r.width/2,y:r.top-lr.top+r.height*0.35},
      spread:Math.min(r.width,260),speed:80,speedVar:80
    },opts||{}));
  };

  /** 爱心（好感度上升） */
  API.hearts=function(n){ API.burst('heart',n||14,{origin:{x:W/2,y:H*0.55},spread:180,speed:70,speedVar:60,fade:1400}); };

  // ---- 屏幕级特效：通过给舞台加 CSS class 实现 ----
  function stage(){ return document.getElementById('vn-stage'); }
  function flash(color,ms){
    var s=stage();if(!s)return;
    var d=document.createElement('div');
    d.className='vn-flash';
    d.style.background=color;
    d.style.animationDuration=(ms||420)+'ms';
    s.appendChild(d);
    setTimeout(function(){if(d.parentNode)d.remove();},(ms||420)+60);
  }
  API.flashWhite=function(ms){flash('#ffffff',ms);};
  API.flashBlack=function(ms){flash('#000000',ms);};
  API.flashRed=function(ms){flash('rgba(200,30,50,.55)',ms);};
  API.flashGold=function(ms){flash('rgba(255,224,130,.75)',ms);};

  API.shake=function(power,ms){
    var s=stage();if(!s)return;
    s.style.setProperty('--shake-power',(power||6)+'px');
    s.style.setProperty('--shake-dur',(ms||460)+'ms');
    s.classList.remove('vn-shaking');
    void s.offsetWidth;              // 强制重排以重启动画
    s.classList.add('vn-shaking');
    setTimeout(function(){s.classList.remove('vn-shaking');},(ms||460)+40);
  };

  API.pulse=function(power,ms){
    var s=stage();if(!s)return;
    s.style.setProperty('--pulse-scale',power||1.045);
    s.style.setProperty('--pulse-dur',(ms||520)+'ms');
    s.classList.remove('vn-pulsing');
    void s.offsetWidth;
    s.classList.add('vn-pulsing');
    setTimeout(function(){s.classList.remove('vn-pulsing');},(ms||520)+40);
  };

  /** 速度线（紧张 / 震惊） */
  API.speedLines=function(ms){
    var s=stage();if(!s)return;
    var d=document.createElement('div');
    d.className='vn-speedlines';
    s.appendChild(d);
    setTimeout(function(){if(d.parentNode)d.remove();},ms||700);
  };

  /** 暗角 + 聚光灯聚焦到舞台某处 */
  API.spotlight=function(x,y,r){
    var s=stage();if(!s)return;
    s.style.setProperty('--spot-x',(x||50)+'%');
    s.style.setProperty('--spot-y',(y||45)+'%');
    s.style.setProperty('--spot-r',(r||34)+'%');
    s.classList.add('vn-spotlight');
  };
  API.clearSpotlight=function(){
    var s=stage();if(s)s.classList.remove('vn-spotlight');
  };

  /** 转场：黑场过渡包裹一次回调 */
  API.transition=function(kind,ms,cb){
    var s=stage();if(!s){if(cb)cb();return;}
    var half=Math.max(120,(ms||560)/2);
    var d=document.createElement('div');
    d.className='vn-trans '+('vn-trans-'+(kind||'fade'));
    s.appendChild(d);
    d.style.animationDuration=half+'ms';
    setTimeout(function(){
      if(cb)cb();
      d.style.animationDirection='reverse';
      d.classList.add('vn-trans-out');
      setTimeout(function(){if(d.parentNode)d.remove();},half+60);
    },half);
  };

  /** 清理所有特效 */
  API.clear=function(){
    parts.length=0;bursts.length=0;weather=null;weatherRate=0;
    if(ctx)ctx.clearRect(0,0,W,H);
    API.clearSpotlight();
  };

  API.resize=resize;
  return API;
})();
