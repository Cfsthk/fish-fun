const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=n=>{const p=clamp(n,0,1);return p*p*(3-2*p);};
export function createSwimmer(species,index,rng=Math.random,initial=false){
  const facing=rng()<.5?-1:1,lane=.18+rng()*.56;
  const [minSpeed,maxSpeed]=species.swimRange??[8,16];
  const speed=minSpeed+(maxSpeed-minSpeed)*(.25+rng()*.5);
  return {species,x:initial ? .22+rng()*.56 : facing>0 ? -.07 : 1.07,y:lane,vx:facing*speed,vy:(rng()-.5)*.8,
    cruiseDir:facing,preferredSpeed:speed,cruiseSpeed:speed,targetSpeed:speed,speedIn:3+rng()*6,targetY:lane,wanderIn:12+rng()*16,panicIn:0,
    facing,turn:null,phase:index*2.399+rng()*3,age:initial?5:0,entered:initial,leaving:false,passing:false};
}
export function beginTurn(c,to,panic=0){
  if(c.turn||to===c.facing)return false;
  c.turn={from:c.facing,to,progress:0,duration:panic>.15 ? .22 : .66,startSpeed:Math.abs(c.vx)};
  return true;
}
export function advanceSwimmer(c,dt,{width=960,height=540,panic=0,rng=Math.random,halfWidth=0,halfHeight=0}={}){
  c.age+=dt;let desiredVX,desiredVY;
  const minX=Math.max(.025,Math.min(.44,halfWidth/width)),maxX=1-minX;
  const minY=Math.max(.08,Math.min(.44,halfHeight/height)),maxY=Math.min(.88,1-minY);
  c.targetY=clamp(c.targetY,minY,maxY);
  const [minSpeed,maxSpeed]=c.species.swimRange??[8,16];
  c.speedIn-=dt;
  if(c.speedIn<=0){
    c.targetSpeed=clamp(c.preferredSpeed+(rng()-.5)*(maxSpeed-minSpeed)*.6,minSpeed,maxSpeed);
    c.speedIn=5+rng()*8;
  }
  c.cruiseSpeed=clamp(c.cruiseSpeed+(c.targetSpeed-c.cruiseSpeed)*(1-Math.exp(-dt*.4)),minSpeed,maxSpeed);
  if(c.leaving||c.passing){
    const dir=c.leaving?c.exitDirection:c.facing;
    desiredVX=dir*(c.leaving?c.scared?290:92:66);desiredVY=0;
  }else if(!c.entered){
    desiredVX=c.facing*c.cruiseSpeed;desiredVY=0;if(c.x>Math.max(.10,minX)&&c.x<Math.min(.90,maxX))c.entered=true;
  }else if(panic>.12){
    c.panicIn-=dt;
    if(c.panicIn<=0){
      const angle=rng()*Math.PI*2,speed=70+rng()*115+panic*35;
      c.targetVX=Math.cos(angle)*speed;c.targetVY=Math.sin(angle)*speed*.32;c.panicIn=.24+rng()*.42;
    }
    const edge=Math.max(.075,Math.min(.46,Math.max(c.species.size*.6,halfWidth+20)/width));
    if(c.x<edge)c.targetVX=Math.abs(c.targetVX??80);
    if(c.x>1-edge)c.targetVX=-Math.abs(c.targetVX??80);
    if(c.y<Math.max(.12,minY+.025))c.targetVY=Math.abs(c.targetVY??20);
    if(c.y>Math.min(.82,maxY-.025))c.targetVY=-Math.abs(c.targetVY??20);
    desiredVX=c.targetVX;desiredVY=c.targetVY;
  }else{
    // Long horizontal passes with gentle depth drift keep the tank from clustering at its centre.
    const edge=Math.max(.085,Math.min(.46,Math.max(c.species.size*.65,halfWidth+16)/width));
    if(c.x<edge)c.cruiseDir=1;if(c.x>1-edge)c.cruiseDir=-1;
    c.wanderIn-=dt;
    if(c.wanderIn<=0){
      c.targetY=clamp(c.y+(rng()-.5)*.12,Math.max(.15,minY),Math.min(.79,maxY));
      if(c.x>.25&&c.x<.75&&rng()<.16)c.cruiseDir*=-1;
      c.wanderIn=12+rng()*18;
    }
    const speed=c.cruiseSpeed;
    desiredVX=c.cruiseDir*speed;
    desiredVY=clamp((c.targetY-c.y)*height*.15+Math.sin(c.age*.28+c.phase)*.35,-speed*.13,speed*.13);
  }
  const fast=panic>.12||c.leaving||c.passing;
  if(Math.abs(desiredVX)>2)beginTurn(c,desiredVX>=0?1:-1,fast?1:0);
  if(c.turn){
    const turn=c.turn;if(fast)turn.duration=Math.min(turn.duration,.22);
    turn.progress=Math.min(1,turn.progress+dt/turn.duration);
    if(turn.progress<.5){c.vx=turn.from*turn.startSpeed*(1-ease(turn.progress*2));}
    else{c.facing=turn.to;c.vx=turn.to*Math.abs(desiredVX)*ease((turn.progress-.5)*2);}
    if(turn.progress>=1)c.turn=null;
  }else c.vx+=(desiredVX-c.vx)*(1-Math.exp(-dt*(fast?8:1.2)));
  c.vy+=(desiredVY-c.vy)*(1-Math.exp(-dt*(fast?6:.8)));
  if(!fast&&!c.turn){
    const speed=Math.hypot(c.vx,c.vy),scale=speed?clamp(speed,minSpeed,maxSpeed)/speed:1;
    c.vx*=scale;c.vy*=scale;
  }
  c.x+=c.vx/width*dt;c.y+=c.vy/height*dt;
  if(!c.leaving&&!c.passing){c.y=clamp(c.y,minY,maxY);if(c.entered)c.x=clamp(c.x,minX,maxX);}
}
