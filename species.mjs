// Fifty active swimmers in the exact order of the two 5×5 side-view atlases.
// Display proportions are compressed for the aquarium; small rare fish stay small.
const rows = [
 ['clownfish','Clownfish','小丑魚',0,74,'fish'],
 ['blue-tang','Blue tang','藍倒吊',0,86,'fish'],
 ['yellow-tang','Yellow tang','黃倒吊',0,74,'fish'],
 ['butterflyfish','Butterflyfish','蝴蝶魚',0,78,'fish'],
 ['damselfish','Damselfish','雀鯛',0,55,'fish'],
 ['anchovy','Anchovy','鯷魚',0,59,'fish'],
 ['sardine','Sardine','沙甸魚',0,60,'fish'],
 ['chromis','Green chromis','綠雀鯛',0,58,'fish'],
 ['anthias','Anthias','花鱸',0,64,'fish'],
 ['fusilier','Fusilier','烏尾鮗',0,68,'fish'],
 ['wrasse','Six-line wrasse','六線龍',0,64,'fish'],
 ['goatfish','Goatfish','鬚鯛',0,72,'fish'],
 ['mullet','Mullet','烏頭',0,77,'fish'],
 ['sergeant-major','Sergeant major','五間雀',0,66,'fish'],
 ['pufferfish','Pufferfish','河豚',1,68,'fish'],
 ['angelfish','Emperor angelfish','皇帝神仙魚',1,86,'fish'],
 ['bannerfish','Longfin bannerfish','馬夫魚',1,84,'fish'],
 ['surgeonfish','Powder-blue surgeonfish','粉藍倒吊',1,80,'fish'],
 ['parrotfish','Parrotfish','鸚嘴魚',1,88,'fish'],
 ['rabbitfish','Rabbitfish','泥鯭',1,79,'fish'],
 ['squirrelfish','Squirrelfish','金鱗魚',1,71,'fish'],
 ['soldierfish','Soldierfish','鐵甲兵',1,67,'fish'],
 ['sweetlips','Sweetlips','胡椒鯛',1,83,'fish'],
 ['filefish','Filefish','革魨',1,76,'fish'],
 ['triggerfish','Triggerfish','扳機魚',1,80,'fish'],
 ['boxfish','Boxfish','箱魨',1,68,'fish'],
 ['flyingfish','Flyingfish','飛魚',1,80,'fish'],
 ['garfish','Garfish','鶴鱵',1,89,'fish'],
 ['sea-turtle','Sea turtle','海龜',2,145,'turtle'],
 ['stingray','Stingray','藍點魟',2,136,'ray'],
 ['lionfish','Lionfish','獅子魚',2,94,'fish'],
 ['cuttlefish','Cuttlefish','墨魚',2,94,'tentacle'],
 ['octopus','Octopus','八爪魚',2,92,'tentacle'],
 ['squid','Squid','魷魚',2,106,'tentacle'],
 ['barracuda','Barracuda','梭魚',2,122,'fish'],
 ['tuna','Bluefin tuna','藍鰭吞拿魚',2,132,'fish'],
 ['mahi-mahi','Mahi-mahi','鯕鰍',2,116,'fish'],
 ['batfish','Marine batfish','燕魚',2,98,'fish'],
 ['moray-eel','Moray eel','海鱔',2,124,'eel'],
 ['trumpetfish','Trumpetfish','管口魚',2,102,'fish'],
 ['mandarinfish','Mandarinfish','麒麟魚',3,78,'fish'],
 ['dolphin','Dolphin','海豚',3,184,'dolphin'],
 ['manta-ray','Manta ray','蝠鱝',3,210,'ray'],
 ['reef-shark','Blacktip reef shark','黑鰭礁鯊',3,202,'fish'],
 ['hammerhead','Hammerhead shark','雙髻鯊',3,228,'fish'],
 ['ocean-sunfish','Ocean sunfish','翻車魚',3,154,'fish'],
 ['sailfish','Sailfish','旗魚',3,208,'fish'],
 ['whale-shark','Whale shark','鯨鯊',4,312,'fish'],
 ['humpback-whale','Humpback whale','座頭鯨',4,340,'dolphin'],
 ['orca','Orca','虎鯨',4,276,'dolphin']
];
// Calm aquarium speeds in logical pixels/second; each species has its own range.
const swimRanges = [
 [8,14],[10,17],[9,16],[8,14],[11,19],[14,24],[14,24],[11,19],[10,18],[13,23],
 [11,20],[8,15],[12,21],[11,18],[6,11],[8,14],[8,14],[10,18],[9,16],[9,17],
 [8,15],[8,14],[7,13],[7,13],[9,16],[6,11],[13,23],[14,24],[7,12],[8,14],
 [5,10],[6,12],[5,10],[11,20],[13,23],[15,25],[14,24],[7,13],[7,14],[6,12],
 [6,11],[13,23],[8,15],[12,21],[12,21],[6,11],[15,25],[8,14],[9,16],[12,21]
];
const largeSprites={dolphin:['large',0,2,2],'manta-ray':['large',1,2,2],'reef-shark':['large',2,2,2],hammerhead:['large',3,2,2],'whale-shark':['legendary',0,1,3],'humpback-whale':['legendary',1,1,3],orca:['legendary',2,1,3]};
export const SPECIES = rows.map(([id,en,zh,tier,size,motion], index) => {
 const [atlas,cell,cols,rows]=largeSprites[id]??[index<25?'a':'b',index%25,5,5];
 return {id,en,zh,tier,size,motion,swimRange:swimRanges[index],index,atlas,cell,cols,rows};
});
// Retain old reports while keeping slow animals out of new arrivals.
const legacyRows = [
 ['starfish','Sea star','海星',0,48,6],['hermit-crab','Hermit crab','寄居蟹',0,40,7],
 ['seahorse','Seahorse','海馬',1,46,9],['jellyfish','Jellyfish','水母',1,68,11],
 ['cleaner-shrimp','Cleaner shrimp','清潔蝦',1,47,14],['nautilus','Nautilus','鸚鵡螺',2,64,18],
 ['leafy-seadragon','Leafy seadragon','葉海龍',3,84,21]
];
export const LEGACY_SPECIES = legacyRows.map(([id,en,zh,tier,size,cell]) => ({id,en,zh,tier,size,cell,atlas:'legacy',cols:4,rows:6,motion:'fish',archived:true}));
export const BY_ID = Object.fromEntries([...SPECIES,...LEGACY_SPECIES].map(s=>[s.id,s]));
export const TIERS = [
 {en:'Common',zh:'常見',weight:.54,color:'#a9c7c8'},
 {en:'Uncommon',zh:'少見',weight:.27,color:'#89d6bc'},
 {en:'Rare',zh:'稀有',weight:.13,color:'#8ac6fa'},
 {en:'Epic',zh:'珍稀',weight:.05,color:'#c9a1eb'},
 {en:'Legendary',zh:'傳奇',weight:.01,color:'#f6cb7d'}
];
