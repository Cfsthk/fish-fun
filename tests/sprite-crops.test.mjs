import test from 'node:test';
import assert from 'node:assert/strict';
import {extractAtlasSprites} from '../sprite-crops.mjs';

function atlas(width,height){
 const pixels=new Uint8ClampedArray(width*height*4);
 const dot=(x,y,color=[240,80,40,255])=>pixels.set(color,(y*width+x)*4);
 const box=(x,y,w,h,color)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)dot(xx,yy,color);};
 return {pixels,dot,box};
}
const visible=part=>Array.from({length:part.width*part.height},(_,i)=>part.pixels[i*4+3]).filter(a=>a>0).length;

test('whole fins cross cell boundaries while neighboring pixels inside the crop are excluded',()=>{
 const {pixels,dot,box}=atlas(24,12),red=[240,80,40,255],blue=[40,130,240,255];
 box(2,4,6,4,red);
 for(const [x,y] of [[8,3],[9,2],[10,1],[11,1],[12,1],[13,1]])dot(x,y,red);
 box(16,4,5,4,blue);box(12,5,4,1,blue);
 const [first,second]=extractAtlasSprites(pixels,24,12,2,1);
 assert.deepEqual(first.sourceBounds,[2,1,12,7]);
 assert.deepEqual(second.sourceBounds,[12,4,9,4]);
 assert.equal(first.area,30);assert.equal(second.area,24);
 assert.equal(visible(first),30);assert.equal(visible(second),24);
 for(let i=0;i<first.pixels.length;i+=4)if(first.pixels[i+3])assert.deepEqual([...first.pixels.subarray(i,i+4)],red);
 for(let i=0;i<second.pixels.length;i+=4)if(second.pixels[i+3])assert.deepEqual([...second.pixels.subarray(i,i+4)],blue);
});

test('faint connecting haze and detached neighboring dust are removed without merging creatures',()=>{
 const {pixels,dot,box}=atlas(24,12);
 box(2,4,5,4);box(17,4,5,4,[30,100,220,255]);
 for(let x=7;x<17;x++)dot(x,5,[80,90,200,7]);
 dot(9,1,[255,80,20,255]);
 const parts=extractAtlasSprites(pixels,24,12,2,1);
 assert.deepEqual(parts.map(p=>p.area),[20,20]);
 assert.deepEqual(parts.map(p=>p.sourceBounds),[[2,4,5,4],[17,4,5,4]]);
 assert.ok(parts.every(p=>visible(p)===20));
});

test('diagonal thin fins and low-opacity outline pixels remain intact with transparent padding',()=>{
 const {pixels,dot,box}=atlas(12,12);box(3,5,4,4);
 dot(7,4,[30,160,200,8]);dot(8,3,[50,180,220,96]);dot(9,2,[70,200,240,220]);
 const [part]=extractAtlasSprites(pixels,12,12,1,1);
 assert.deepEqual(part.sourceBounds,[3,2,7,7]);assert.equal(part.area,19);assert.equal(visible(part),19);
 assert.equal(part.width,15);assert.equal(part.height,15);
 assert.deepEqual([...part.pixels.subarray(((4+2)*15+4+4)*4,((4+2)*15+4+4)*4+4)],[30,160,200,8]);
 for(let y=0;y<part.height;y++)for(let x=0;x<part.width;x++){
  if(x<4||y<4||x>=part.width-4||y>=part.height-4)assert.equal(part.pixels[(y*part.width+x)*4+3],0);
 }
});

test('rows and columns identify creatures even when atlas dimensions do not divide evenly',()=>{
 const {pixels,box}=atlas(25,25);
 for(const [x,y,color] of [[2,2,[11,0,0,255]],[18,2,[22,0,0,255]],[2,18,[33,0,0,255]],[18,18,[44,0,0,255]]])box(x,y,4,4,color);
 const parts=extractAtlasSprites(pixels,25,25,2,2);
 assert.deepEqual(parts.map(p=>p.pixels[(4*p.width+4)*4]),[11,22,33,44]);
});

test('invalid or incomplete atlases fail explicitly instead of silently cropping a wrong creature',()=>{
 assert.throws(()=>extractAtlasSprites(new Uint8ClampedArray(4),12,12,1,1),/Invalid sprite atlas/);
 const {pixels,box}=atlas(24,12);box(2,4,5,4);
 assert.throws(()=>extractAtlasSprites(pixels,24,12,2,1),/Missing creature in atlas cell 1/);
});
