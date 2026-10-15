// Atlas grids identify a creature, but never clip its fins at a cell boundary.
export function extractAtlasSprites(rgba,width,height,cols,rows){
  if(rgba.length!==width*height*4||!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1)throw new Error('Invalid sprite atlas');
  // Near-transparent atlas haze must not join two otherwise separate creatures.
  const minAlpha=8,labels=new Int32Array(width*height),queue=new Int32Array(width*height),creatures=Array(cols*rows).fill(null);
  let serial=0;
  for(let seed=0;seed<labels.length;seed++){
    if(labels[seed]||rgba[seed*4+3]<minAlpha)continue;
    const label=++serial;let head=0,tail=1,left=width,top=height,right=0,bottom=0,sumX=0,sumY=0;
    queue[0]=seed;labels[seed]=label;
    while(head<tail){
      const at=queue[head++],x=at%width,y=Math.floor(at/width);
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);sumX+=x;sumY+=y;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<0||ny>=height)continue;
        const next=ny*width+nx;
        if(!labels[next]&&rgba[next*4+3]>=minAlpha){labels[next]=label;queue[tail++]=next;}
      }
    }
    const col=Math.min(cols-1,Math.floor(sumX/tail/width*cols)),row=Math.min(rows-1,Math.floor(sumY/tail/height*rows)),cell=row*cols+col;
    if(!creatures[cell]||creatures[cell].area<tail)creatures[cell]={label,area:tail,left,top,right,bottom};
  }
  const minimumArea=Math.max(4,Math.floor(width*height/(cols*rows)*.01)),padding=4;
  return creatures.map((part,cell)=>{
    if(!part||part.area<minimumArea)throw new Error('Missing creature in atlas cell '+cell);
    const w=part.right-part.left+1+padding*2,h=part.bottom-part.top+1+padding*2,pixels=new Uint8ClampedArray(w*h*4);
    for(let y=part.top;y<=part.bottom;y++)for(let x=part.left;x<=part.right;x++){
      const source=y*width+x;if(labels[source]!==part.label)continue;
      const target=((y-part.top+padding)*w+x-part.left+padding)*4;
      for(let channel=0;channel<4;channel++)pixels[target+channel]=rgba[source*4+channel];
    }
    return {width:w,height:h,pixels,area:part.area,sourceBounds:[part.left,part.top,part.right-part.left+1,part.bottom-part.top+1]};
  });
}
