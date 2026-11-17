(function(root){
  const entries=root.YuanmengSkyboxEntries??(typeof module==='object'?require('./editor-skybox-list'):[]);
  // Web palettes are authored approximations of the native editor presets.
  const families={
    day:[0x4f90c9,0xb9d9e4,0x97aeba,0xa9c3cf,0xe1eef6,0xffe8b8,1.05,0xf0f9fc,.72,'sun'],
    night:[0x071323,0x26384b,0x111d2c,0x26384b,0xb4cbdc,0x9abddd,.71,0x465b73,.28,'stars'],
    moon:[0x121a3f,0x514c70,0x252742,0x4b506e,0xa8b9ee,0xc6dcff,.88,0x746889,.42,'moon'],
    sunset:[0x4e4877,0xe99c73,0x543b55,0xaa776e,0xffd1a1,0xffbe7d,1,0xf0a08d,.68,'sunset'],
    mist:[0x52767d,0xb0c8be,0x667f7b,0x91aaa2,0xc4e3db,0xcfdfdc,.65,0xdce6e2,.84,'mist'],
    forest:[0x132331,0x567268,0x182c2c,0x4b625d,0x97c2b0,0x8fb9af,.58,0x78958a,.67,'forest'],
    stars:[0x100e33,0x58437d,0x17172e,0x534264,0xb4a6de,0xabbdff,.7,0x8563aa,.55,'space'],
    ocean:[0x1b83ba,0x9de0dc,0x337e96,0x6dbbc3,0xc0fff0,0xdafdf2,.87,0xd8fff9,.6,'sea'],
    pastel:[0x799de8,0xf0b9d3,0x847ba5,0xd0afcf,0xf0daf9,0xffeecc,.98,0xffe7f0,.8,'sun'],
    neon:[0x211442,0x6b4e9f,0x252444,0x594979,0xbbafe9,0xe484d7,.76,0x7fb9e7,.58,'aurora'],
    desert:[0x5c9eb9,0xe5c993,0x997359,0xc3a784,0xe7d3b5,0xffd192,1.05,0xffe7c2,.52,'sun'],
    snow:[0x628fbc,0xd2e4e6,0x8ea5bc,0xb6c9d6,0xdaefff,0xe7f2ff,.95,0xf0fbff,.81,'mist'],
    lava:[0x240e23,0xdb6042,0x44252e,0x945445,0xdd9c8b,0xff966b,.9,0xff8453,.65,'sunset'],
    grove:[0x548b85,0xc0d0a2,0x5a725d,0x96ab83,0xcfe6be,0xffedbb,.95,0xe6f1cd,.61,'forest'],
    flat:[0x72829d,0x72829d,0x72829d,0x72829d,0xe5eaf0,0xffffff,.8,0x72829d,0,'plain'],
    gradient:[0x5368b6,0xd7bdde,0x8a85ab,0xb0a1c4,0xe3d3f0,0xffe4e9,.88,0xd7bdde,0,'plain']
  };
  const assignments=('day night pastel stars moon pastel ocean flat stars pastel sunset ocean forest gradient snow desert mist grove sunset sunset '+
    'ocean ocean neon mist pastel stars stars desert neon stars grove grove forest grove pastel stars stars pastel sunset lava snow stars neon '+
    'forest gradient ocean ocean pastel moon ocean neon neon neon sunset mist pastel moon sunset grove day neon day pastel pastel forest forest '+
    'day grove pastel pastel ocean stars pastel moon neon pastel day stars neon pastel pastel moon neon day').split(' ');
  const colors={
    3:[0x79b4ec,0xf7c1d6],4:[0x47418f,0xb086c1],6:[0x6e9bed,0xebc3ee],7:[0x2c889d,0xa6e9d9],
    9:[0x0b1639,0x3d4f92],10:[0x6d9cdf,0xf2d4d7],12:[0x3899c2,0xb4ead3],13:[0x262138,0x786681],
    18:[0x438d7c,0xbddea4],19:[0x494567,0xf49d72],20:[0x674d6f,0xe8bb82],21:[0x123e7d,0x64bac6],
    22:[0x369dc9,0xc1e7dc],23:[0x25154b,0xd253ab],24:[0x776499,0xd0a4cf],25:[0x91a5ed,0xf5bbdd],
    26:[0x271c55,0x7f6ab9],27:[0x332265,0x9e7ace],28:[0x938cc4,0xf4d89b],29:[0x151f4a,0x66a5c2],
    30:[0x2e397d,0x90a6d4],31:[0x68a491,0xd0dda7],32:[0x467666,0xa5c1a1],33:[0x194354,0x74a585],
    34:[0x609eb2,0xcbdba5],35:[0x709adc,0xdacffa],36:[0x29285f,0x6b88c8],37:[0x33265b,0x9270b3],
    38:[0x87aabb,0xf2d2ad],39:[0x7c4658,0xe3ac73],41:[0x51749e,0xb9dce6],42:[0x42205d,0xba679f],
    43:[0x3d1f69,0x65a8ab],45:[0x7294bc,0xe2b4cb],46:[0x5aa6ba,0xd0e6c7],47:[0x5296c4,0xbadadd],
    48:[0x9290c2,0xf0d0bd],49:[0x24294f,0x667599],50:[0x4098b4,0xafdddc],51:[0x23133f,0x8e63d8],
    52:[0x1a2148,0x60b5c5],53:[0x4e2657,0xd8a76d],54:[0x575094,0xda8f84],55:[0x52636f,0xb6bfba],
    56:[0x76a6df,0xe6d9f3],57:[0x202b53,0x616998],58:[0x644f84,0xe0aa7f],59:[0x439476,0xaad09b],
    60:[0x508bb6,0xb6c9dd],61:[0x381957,0x9b60c1],62:[0x5aabd2,0xc6e5e8],63:[0x72add1,0xe0bed8],
    64:[0x9bafe4,0xf3d4e3],65:[0x112f39,0x5e8273],66:[0x172331,0x506679],67:[0x6caccb,0xc5e2e3],
    68:[0x65a493,0xe0d8ae],69:[0x8783ce,0xeab9d8],70:[0x8495b9,0xe3d8cf],71:[0x409fc3,0xc0e2d0],
    72:[0x1c244d,0x7e79ba],73:[0x9da3e3,0xf2bfd3],74:[0x182548,0x7e648d],75:[0x492553,0xb96f98],
    76:[0x82a3cb,0xf1c5df],77:[0x658dc2,0xd5dfe9],78:[0x231c4d,0x6864ab],79:[0x251d4d,0x8e8aca],
    80:[0x94acd9,0xf4c7b6],81:[0x769cc8,0xe5d7d2],82:[0x242b52,0x625074],83:[0x192e48,0x67c3b7],
    84:[0x6596bd,0xd5e0e7]
  };
  const blend=(a,b)=>[16,8,0].reduce((color,bits)=>color|(Math.round(((a>>bits)&255)*.65+((b>>bits)&255)*.35)<<bits),0);
  const profiles=entries.map(([id,name,category])=>{
    const family=assignments[id-1];
    const [z,h,g,f,ambient,light,intensity,cloud,clouds,celestial]=families[family];
    const [zenith,horizon]=colors[id]??[z,h];
    return {id,name,category,zenith,horizon,ground:colors[id]?blend(g,zenith):g,fog:colors[id]?blend(f,horizon):f,
      ambient,light,intensity,cloud,clouds,celestial,dynamic:category==='动态天空盒'};
  });
  const defaults=2;
  const find=(id,fallback=defaults)=>profiles.find(profile=>profile.id===Number(id))??profiles.find(profile=>profile.id===fallback);
  function exportPreset(id){
    const sky=find(id);
    return {displayId:sky.id,name:sky.name,source:'yuanmeng-built-in',
      runtime:{scope:'client',method:'SkyBox:SetSkyboxDisplayID',arguments:[sky.id,1]}};
  }
  function withPreset(project,id){
    const sky=find(id),skybox=exportPreset(sky.id);
    const rgb=color=>({r:(color>>16)&255,g:(color>>8)&255,b:color&255});
    const atmosphere={...project.atmosphere,skybox};
    if(atmosphere.profile)atmosphere.profile={...atmosphere.profile,sky:rgb(sky.zenith),fog:rgb(sky.fog),moon:rgb(sky.light)};
    return {...project,atmosphere,placement:{...project.placement,skybox}};
  }
  function bind(select,{key,initial=defaults,fallback=defaults,onChange=()=>{}}={}){
    let id=initial;
    if(key){try{id=localStorage.getItem(key)??initial;}catch{}}
    const groups=new Map();
    for(const p of profiles){
      if(!groups.has(p.category)){
        const group=document.createElement('optgroup');group.label=p.category;groups.set(p.category,group);
      }
      groups.get(p.category).append(new Option(p.name,p.id));
    }
    select.replaceChildren(...groups.values());
    function set(next,persist=false){
      id=find(next,fallback).id;
      select.value=String(id);
      if(key&&persist){try{localStorage.setItem(key,String(id));}catch{}}
      onChange(find(id));
    }
    select.onchange=()=>set(select.value,true);
    set(id);
    return {set,get id(){return Number(id)}};
  }
  const api={profiles,find,defaults,exportPreset,withPreset,bind};
  if(typeof module==='object')module.exports=api;
  else root.YuanmengSkyboxes=api;
})(globalThis);
