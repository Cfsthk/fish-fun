// Atlas order: four columns, six rows. All artwork is bundled locally.
const rows = [
  ['clownfish', 'Clownfish', '小丑魚', 0, 62, 'fish', 'Lives among sea anemones.', '喜歡住在海葵之間。'],
  ['blue-tang', 'Blue tang', '藍倒吊', 0, 72, 'fish', 'Grazes on algae around the reef.', '會在珊瑚礁附近吃藻類。'],
  ['yellow-tang', 'Yellow tang', '黃倒吊', 0, 63, 'fish', 'A bright yellow reef explorer.', '是珊瑚礁中鮮黃色的探索者。'],
  ['butterflyfish', 'Butterflyfish', '蝴蝶魚', 0, 65, 'fish', 'Its patterns help it blend into the reef.', '身上的花紋有助牠融入珊瑚礁。'],
  ['damselfish', 'Damselfish', '雀鯛', 0, 45, 'fish', 'Small fish with brilliant reef colours.', '體型小巧，顏色十分鮮豔。'],
  ['anchovy', 'Anchovy', '鯷魚', 0, 49, 'fish', 'Often travels with a school of friends.', '經常與同伴一起成群游動。'],
  ['starfish', 'Sea star', '海星', 0, 48, 'bottom', 'Moves slowly using tiny tube feet.', '用細小的管足慢慢移動。'],
  ['hermit-crab', 'Hermit crab', '寄居蟹', 0, 40, 'bottom', 'Borrows an empty shell for a home.', '借用空的貝殼作為自己的家。'],
  ['sardine', 'Sardine', '沙甸魚', 0, 50, 'fish', 'Silver scales catch the underwater light.', '銀色的魚鱗會反射水中的光。'],
  ['seahorse', 'Seahorse', '海馬', 1, 46, 'vertical', 'Holds onto plants with its curled tail.', '用捲曲的尾巴抓住海草。'],
  ['pufferfish', 'Pufferfish', '河豚', 1, 57, 'fish', 'A slow swimmer with a round little body.', '身體圓圓，游泳速度較慢。'],
  ['jellyfish', 'Jellyfish', '水母', 1, 68, 'jelly', 'Pulses its bell to move through water.', '收縮傘狀身體，在水中前進。'],
  ['octopus', 'Octopus', '八爪魚', 1, 68, 'tentacle', 'Explores the seabed with eight arms.', '用八條腕足探索海床。'],
  ['angelfish', 'Angelfish', '神仙魚', 1, 67, 'fish', 'Tall fins make a striking silhouette.', '高高的魚鰭形成獨特的輪廓。'],
  ['cleaner-shrimp', 'Cleaner shrimp', '清潔蝦', 1, 47, 'bottom', 'Helps other reef animals stay clean.', '會幫助其他珊瑚礁動物清潔身體。'],
  ['sea-turtle', 'Sea turtle', '海龜', 2, 112, 'turtle', 'Uses strong flippers to glide through the sea.', '用有力的鰭肢在海中滑行。'],
  ['stingray', 'Stingray', '魔鬼魚', 2, 102, 'ray', 'Glides above the sand like a living kite.', '像風箏一樣在沙地上方滑行。'],
  ['lionfish', 'Lionfish', '獅子魚', 2, 76, 'fish', 'Spreads beautiful striped fins.', '會展開帶有條紋的美麗魚鰭。'],
  ['nautilus', 'Nautilus', '鸚鵡螺', 2, 64, 'tentacle', 'Carries a beautifully spiralled shell.', '背着有美麗螺旋紋的外殼。'],
  ['cuttlefish', 'Cuttlefish', '墨魚', 2, 77, 'tentacle', 'Can change the patterns on its skin.', '可以改變皮膚上的花紋。'],
  ['mandarinfish', 'Mandarinfish', '麒麟魚', 3, 60, 'fish', 'A small fish with jewel-like colours.', '小小的身體有如寶石般的色彩。'],
  ['leafy-seadragon', 'Leafy seadragon', '葉海龍', 3, 84, 'vertical', 'Leaf-like shapes help it hide among seaweed.', '葉片般的外形有助牠藏在海草之間。'],
  ['dolphin', 'Dolphin', '海豚', 3, 124, 'dolphin', 'A marine mammal that surfaces to breathe.', '是需要游到水面呼吸的海洋哺乳動物。'],
  ['whale-shark', 'Whale shark', '鯨鯊', 4, 166, 'fish', 'A gentle giant with a coat of beautiful spots.', '是身上佈滿美麗斑點的溫和巨魚。']
];
export const SPECIES = rows.map(([id, en, zh, tier, size, motion, factEn, factZh], index) => ({ id, en, zh, tier, size, motion, factEn, factZh, index }));
export const BY_ID = Object.fromEntries(SPECIES.map(s => [s.id, s]));
export const TIERS = [
  { en: 'Common', zh: '常見', weight: .54, color: '#a9c7c8' },
  { en: 'Uncommon', zh: '少見', weight: .27, color: '#89d6bc' },
  { en: 'Rare', zh: '稀有', weight: .13, color: '#8ac6fa' },
  { en: 'Epic', zh: '珍稀', weight: .05, color: '#c9a1eb' },
  { en: 'Legendary', zh: '傳奇', weight: .01, color: '#f6cb7d' }
];
