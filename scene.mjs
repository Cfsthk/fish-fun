import { SPECIES, LEGACY_SPECIES, BY_ID } from './species.mjs';
import { ART_FILES } from './art.mjs';
import { createSwimmer, advanceSwimmer } from './motion.mjs';
import { extractAtlasSprites } from './sprite-crops.mjs';
const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
export class ReefScene {
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    // Every pose is rasterised on this shared grid before it reaches the aquarium.
    this.pixelSize=2;this.spriteCanvas=document.createElement('canvas');this.spriteCanvas.width=this.spriteCanvas.height=160;this.spriteCtx=this.spriteCanvas.getContext('2d');
    this.images={};this.sprites=new Map();this.creatures=new Map();this.time=0;this.rough=0;this.panic=0;this.targetRough=0;this.targetPanic=0;this.frozen=false;this.ready=false;this.reducedMotion=false;
    this.bubbles=Array.from({length:30},(_,i)=>({x:(i*.381966)%1,y:(i*.618034)%1,speed:4+i%7,size:i%3?2:3,phase:i*2.1}));
    this.resize();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);
  }
  resize(){const r=this.canvas.getBoundingClientRect();this.w=r.width<640?600:960;this.h=Math.max(240,Math.min(2000,Math.round(this.w*r.height/Math.max(1,r.width))));this.canvas.width=this.w;this.canvas.height=this.h;this.ctx.imageSmoothingEnabled=false;if(this.ready)this.draw(0,true);}
  async load(){
    const paths=typeof EMBEDDED_REEF_ART!=='undefined'?EMBEDDED_REEF_ART:ART_FILES;
    const pairs=await Promise.all(Object.entries(paths).map(async([key,path])=>[key,await loadImage(path)]));this.images=Object.fromEntries(pairs);
    const atlases={a:this.cropAtlas(this.images.sideA,5,5),b:this.cropAtlas(this.images.sideB,5,5),large:this.cropAtlas(this.images.large,2,2),legendary:this.cropAtlas(this.images.legendary,1,3),legacy:this.cropAtlas(this.images.legacy,4,6)};
    for(const s of [...SPECIES,...LEGACY_SPECIES])this.sprites.set(s.id,atlases[s.atlas][s.cell]);
    this.ready=true;this.draw(0,true);
  }
  cropAtlas(image,cols,rows){
    const source=document.createElement('canvas');source.width=image.width;source.height=image.height;
    const context=source.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
    const pixels=context.getImageData(0,0,source.width,source.height).data;
    return extractAtlasSprites(pixels,source.width,source.height,cols,rows).map(part=>{
      const canvas=document.createElement('canvas');canvas.width=part.width;canvas.height=part.height;
      // Pixel sprites use hard alpha edges; source antialiasing must not become a blurred outline.
      for(let i=3;i<part.pixels.length;i+=4)part.pixels[i]=part.pixels[i]>=128?255:0;
      canvas.getContext('2d').putImageData(new ImageData(part.pixels,part.width,part.height),0,0);
      return {image:canvas,x:0,y:0,w:part.width,h:part.height,area:part.area,sourceBounds:part.sourceBounds};
    });
  }
  freeze(value=true){this.frozen=value;}
  clear(){this.creatures.clear();this.rough=this.panic=this.targetRough=this.targetPanic=0;this.draw(0,true);}
  add(creature,{initial=false,passing=false}={}){
    const s=BY_ID[creature.speciesId];if(!s)return;const c=createSwimmer(s,this.creatures.size,Math.random,initial);Object.assign(c,creature,{passing});this.creatures.set(creature.id,c);
  }
  exit(id,reason){const c=this.creatures.get(id);if(c){c.leaving=true;c.scared=reason==='noise';c.exitDirection=c.x<.5?-1:1;}}
  state(session,level){
    this.targetPanic=session?.status==='running'&&level>session.threshold?1:0;
    if(!session||session.status==='ended')this.targetRough=0;
    else if(session.water==='warning'||session.water==='rough')this.targetRough=Math.min(1,.65+Math.max(0,level-session.threshold)/75);
    else if(session.water==='settling')this.targetRough=.72*Math.max(0,1-session.calmFor/10);
    else this.targetRough=0;
  }
  side(ctx,s,x,y,size,phase=0,facing=1,animate=true){
    const r=this.sprites.get(s.id);if(!r)return;const scale=size/Math.max(r.w,r.h),w=r.w*scale,h=r.h*scale,t=animate?this.time:0;
    ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(facing,1);
    const freq=s.motion==='ray'?2.5:4.4,step=Math.max(1,Math.round(4/scale));
    if(s.motion==='tentacle'){
      for(let y=0;y<r.h;y+=7){const sh=Math.min(7,r.h-y),p=y/r.h,bend=animate?Math.sin(t*(3+this.panic*8)+phase+p*5)*p*p*(2+this.panic*3):0;ctx.drawImage(r.image,r.x,r.y+y,r.w,sh,-w/2+bend,-h/2+y*scale,w,sh*scale+.4);}
    }else if(s.motion==='dolphin'){
      // Cetaceans flex the tail stock and horizontal flukes vertically; the head stays steady.
      const amplitude=size*.065*(1+this.panic*.5);
      for(let x=0;x<r.w;x+=step){
        const sw=Math.min(step,r.w-x),p=x/r.w,tail=Math.max(0,(.48-p)/.48);
        const bend=animate?Math.sin(t*(2.3+this.panic*3.5)+phase-tail*.65)*tail*tail*amplitude:0;
        ctx.drawImage(r.image,r.x+x,r.y,sw,r.h,-w/2+x*scale,-h/2+bend,sw*scale+.35,h);
      }
    }else{
      for(let x=0;x<r.w;x+=step){const sw=Math.min(step,r.w-x),p=x/r.w,amplitude=s.motion==='eel'?5:s.motion==='ray'?3:1.8,bend=animate?Math.sin(t*(freq+this.panic*9)+phase+p*5)*Math.pow(1-p,1.4)*(amplitude+this.panic*2):0;ctx.drawImage(r.image,r.x+x,r.y,sw,r.h,-w/2+x*scale,-h/2+bend,sw*scale+.35,h);}
    }
    ctx.restore();
  }
  stamp(ctx,s,x,y,size,{phase=0,facing=1,animate=true,tilt=0}={}){
    const source=this.spriteCanvas,paint=this.spriteCtx,unit=this.pixelSize;
    // Grow the buffer for whales and tilted poses without enlarging the shared pixels.
    const tailMargin=s.motion==='dolphin'?size*.14*(1+this.panic*.5):0;
    const required=Math.ceil((size*(Math.abs(Math.cos(tilt))+Math.abs(Math.sin(tilt)))+32+tailMargin)/(unit*2))*2;
    if(source.width<required)source.width=source.height=required;
    const span=source.width*unit;
    paint.clearRect(0,0,source.width,source.height);paint.imageSmoothingEnabled=false;
    paint.save();paint.translate(source.width/2,source.height/2);paint.scale(1/unit,1/unit);paint.rotate(tilt);
    this.side(paint,s,0,0,size,phase,facing,animate);

    paint.restore();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(source,Math.round(x/unit)*unit-span/2,Math.round(y/unit)*unit-span/2,span,span);
  }
  creature(ctx,c){
    const s=c.species,size=s.size*(.92+c.y*.28),x=c.x*this.w,y=c.y*this.h+Math.sin(this.time*.8+c.phase)*1.5;
    this.stamp(ctx,s,x,y,size,{phase:c.phase,facing:c.facing,tilt:Math.max(-.25,Math.min(.25,Math.atan2(c.vy,Math.abs(c.vx)+10)*.35))*c.facing});
  }
  icon(canvas,s,{silhouette=false,size=100}={}){
    if(!this.ready||!canvas)return;canvas.width=canvas.height=size*2;const c=canvas.getContext('2d');this.stamp(c,s,size,size,size*1.7,{animate:false});
    if(silhouette){c.globalCompositeOperation='source-in';c.fillStyle='#284d62';c.fillRect(0,0,canvas.width,canvas.height);c.globalCompositeOperation='source-over';}
  }
  reef(){
    const ctx=this.ctx,image=this.images.reef,scale=Math.max(this.w/image.width,this.h/image.height),bw=image.width*scale,bh=image.height*scale,x=Math.round((this.w-bw)/2),y=Math.round((this.h-bh)/2),t=this.time*(this.reducedMotion?.25:1);
    ctx.drawImage(image,x,y,Math.ceil(bw),Math.ceil(bh));
    // Sway the original painted coral/kelp locally; retain its rock and sand layout.
    const plants=[[0,0,130,270,5],[0,140,250,235,2.5],[0,395,162,225,2],[170,335,170,300,4],[0,730,170,195,2],[1450,55,222,405,5],[1535,310,137,250,2],[1440,527,173,140,2],[1210,675,96,120,4],[1517,680,155,196,2],[1325,822,210,119,2]];
    for(let i=0;i<plants.length;i++){
      const [left,top,width,height,amplitude]=plants[i],dx=x+left*scale,dy=y+top*scale;
      if(dx>this.w||dx+width*scale<0)continue;
      ctx.save();ctx.beginPath();ctx.rect(dx,dy,width*scale,height*scale);ctx.clip();
      for(let row=0;row<height;row+=5){const sh=Math.min(5,height-row),p=1-row/height,bend=Math.round(Math.sin(t*(.48+i*.013)+i+p*2)*p*p*amplitude*scale),pad=6;const sx=Math.max(0,left-pad),sw=Math.min(image.width-sx,width+pad*2);ctx.drawImage(image,sx,top+row,sw,sh,x+sx*scale+bend,dy+row*scale,sw*scale,sh*scale+.5);}
      ctx.restore();
    }
  }
  lighting(){
    const ctx=this.ctx,w=this.w,h=this.h,t=this.time*(this.reducedMotion?.25:1);ctx.save();ctx.globalCompositeOperation='screen';
    for(let i=0;i<7;i++){const x=w*(i*.16-.04)+Math.sin(t*.11+i)*26;ctx.fillStyle='rgba(180,244,232,'+(.035+Math.sin(t*.3+i)*.014)+')';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+19,0);ctx.lineTo(x+150,h);ctx.lineTo(x+18,h);ctx.closePath();ctx.fill();}
    for(let i=0;i<50;i++){const x=((i*83+Math.sin(t*.3+i)*26)%w+w)%w,y=h*.81+(i*19%(h*.17))+Math.sin(t*.45+i*2)*4;ctx.fillStyle='rgba(230,255,220,'+(.06+Math.sin(t*.65+i)*.04)+')';ctx.fillRect(Math.round(x),Math.round(y),15+i%23,2);ctx.fillRect(Math.round(x)+8,Math.round(y)+2,3,4);}
    ctx.restore();
  }
  water(){
    const ctx=this.ctx,w=this.w,t=this.time,motion=this.reducedMotion?.3:1;
    ctx.save();ctx.beginPath();ctx.rect(0,0,w,85);ctx.clip();
    for(let layer=0;layer<5;layer++){
      const amplitude=(2+this.rough*23)*motion;ctx.fillStyle='rgba(196,255,248,'+((.12+this.rough*.2)/(1+layer*.4))+')';
      for(let x=0;x<w;x+=4){const wave=Math.sin(x*.014+t*(.8+this.rough*2.5)+layer*1.7)+Math.sin(x*.036-t*1.2+layer)*.5;ctx.fillRect(x,Math.round(8+layer*(6+this.rough*7)+wave*amplitude),4,2+this.rough*3);}
    }
    ctx.restore();
  }
  draw(dt,force=false){
    if(this.frozen&&!force)return;
    if(!this.frozen){this.time+=dt;this.rough+=(this.targetRough-this.rough)*Math.min(1,dt*3);this.panic+=(this.targetPanic-this.panic)*Math.min(1,dt*(this.targetPanic?14:2));}
    const ctx=this.ctx,w=this.w,h=this.h;ctx.imageSmoothingEnabled=false;
    if(!this.ready){ctx.fillStyle='#076b90';ctx.fillRect(0,0,w,h);return;}
    this.reef();this.lighting();
    for(const b of this.bubbles){const speed=this.reducedMotion?.3:1,x=Math.round(b.x*w+Math.sin(this.time*.5+b.phase)*5),y=Math.round(h-((b.y*h+this.time*b.speed*speed)%(h+20)));ctx.fillStyle='rgba(202,248,244,.2)';ctx.fillRect(x,y,b.size,1);ctx.fillRect(x-1,y+1,1,b.size);ctx.fillRect(x+b.size,y+1,1,b.size);ctx.fillRect(x,y+b.size+1,b.size,1);}
    if(!this.frozen){
      for(const [id,c] of this.creatures){
        const r=this.sprites.get(c.species.id),size=c.species.size*(.92+c.y*.28),scale=size/Math.max(r.w,r.h);
        const tailMargin=c.species.motion==='dolphin'?size*.065*(1+this.panic*.5):0;
        const halfWidth=(r.w+r.h*.26)*scale/2+12,halfHeight=(r.h+r.w*.26)*scale/2+12+tailMargin;
        // Include the full body, a quarter-radian tilt and animated fin movement at the walls.
        advanceSwimmer(c,dt,{width:w,height:h,panic:this.panic,halfWidth,halfHeight});
        const direction=c.leaving?c.exitDirection:c.facing;
        if((c.leaving||c.passing)&&(direction<0?c.x*w+halfWidth<0:c.x*w-halfWidth>w))this.creatures.delete(id);
      }
      const swimmers=[...this.creatures.values()].filter(c=>c.entered&&!c.leaving&&!c.passing);
      if(this.panic<.2)for(let i=0;i<swimmers.length;i++)for(let j=i+1;j<swimmers.length;j++){const a=swimmers[i],b=swimmers[j],dx=Math.abs(a.x-b.x)*w,dy=Math.abs(a.y-b.y)*h,reach=(a.species.size+b.species.size)*.35;if(dx<reach&&dy<reach*.5){const push=(a.y<=b.y?-1:1)*dt*.009*(1-dx/reach);a.y+=push;b.y-=push;}}
    }
    for(const c of [...this.creatures.values()].sort((a,b)=>a.y-b.y)){ctx.save();ctx.globalAlpha=Math.min(1,c.age*1.5+.2);this.creature(ctx,c);ctx.restore();}
    this.water();
  }
}
