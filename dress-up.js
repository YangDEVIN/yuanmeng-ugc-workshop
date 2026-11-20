(() => {
  const byId = id => document.getElementById(id);
  const stage = byId('stage');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({antialias:true});
  } catch {
    byId('render-error').hidden = false;
    byId('render-error').textContent = '当前浏览器无法开启 3D 预览。';
    document.querySelectorAll('aside select, aside button').forEach(control => { control.disabled = true; });
    return;
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  stage.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eeeaf4');
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.43, 0);
  controls.enablePan = false;
  controls.minDistance = 2.8;
  controls.maxDistance = 10;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x85777d, .83));
  const key = new THREE.DirectionalLight(0xfff6ec, .57);
  key.position.set(3, 6, 4);
  scene.add(key);

  function mesh(parent, geometry, color, x, y, z) {
    const object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color}));
    object.position.set(x,y,z);
    parent.add(object);
    return object;
  }

  function oval(parent, color, x, y, z, width, height, depth) {
    const object = mesh(parent, new THREE.SphereGeometry(1, 32, 20), color, x,y,z);
    object.scale.set(width,height,depth);
    return object;
  }

  mesh(scene, new THREE.CylinderGeometry(1.55, 1.65, .15, 64), '#b1bdb7', 0,-.09,0);
  // Cross sections run from the lower edge to the crown. Each row describes
  // height, half-width, half-depth, centre X, centre Z and fabric ripple.
  function tailored(parent,color,x,y,z,sections,folds=0,proxy='SphereGeometry') {
    const positions=[], indices=[], segments=64;
    const curve=(column)=>new THREE.SplineCurve(sections.map((row,i)=>
      new THREE.Vector2(i,row[column] || 0)));
    const channels=Array.from({length:6},(_,i)=>curve(i));
    const rows=32;
    for(let j=0;j<=rows;j++) {
      const t=j/rows;
      const [height,width,depth,cx,cz,ripple]=channels.map(channel=>channel.getPoint(t).y);
      for(let i=0;i<segments;i++) {
        const theta=2*Math.PI*i/segments;
        const wave=1+ripple*Math.cos(folds*theta+.55*t);
        positions.push(cx+Math.max(.001,width)*wave*Math.cos(theta),height,
          cz+Math.max(.001,depth)*wave*Math.sin(theta));
        if(j<rows) {
          const a=j*segments+i,b=j*segments+(i+1)%segments;
          indices.push(a,a+segments,b,b,a+segments,b+segments);
        }
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const object=mesh(parent,geometry,color,x,y,z);
    object.material.side=THREE.DoubleSide;
    geometry.userData={placementProxy:proxy};
    return object;
  }
  const base = new THREE.Group();
  scene.add(base);
  const ivory = '#fff9f3';
  const skin = '#f7c4af';
  const gold = '#b9863e';
  tailored(base,skin,0,1.88,.04,[
    [-.44,.015,.025,0,.13],[-.38,.155,.17,0,.10],[-.27,.30,.286,0,.063],
    [-.10,.422,.386,0,.021],[.08,.452,.414],[.26,.409,.376],[.41,.247,.246],[.47,.008,.012]
  ]);
  oval(base,'#26343b',0,2.09,-.06,.50,.41,.44);
  oval(base,'#fff4d9',0,1.03,0,.28,.37,.18);



  for (const side of [-1,1]) {
    oval(base,skin,side*.475,1.88,.012,.18,.075,.095).rotation.z = side*.25;
    oval(base,'#eaa489',side*.535,1.89,.071,.09,.039,.046).rotation.z = side*.25;
    oval(base,'#fff9f1',side*.15,1.89,.433,.085,.113,.040);
    oval(base,'#825448',side*.15,1.89,.463,.064,.092,.029);
    oval(base,'#302536',side*.15,1.901,.484,.041,.069,.017);
    oval(base,'#ffffff',side*.15-.021,1.934,.496,.024,.030,.009);
    oval(base,'#ffffff',side*.15+.021,1.863,.492,.010,.012,.008);
    oval(base,'#ec9e9d',side*.247,1.78,.404,.070,.032,.023);
    oval(base,skin,side*.442,1.04,.016,.115,.31,.132).rotation.z = side*.24;
    oval(base,ivory,side*.47,.877,.025,.137,.098,.143).rotation.z = side*.24;
    oval(base,skin,side*.174,.477,.025,.145,.234,.145);
    oval(base,'#583a37',side*.174,.13,.068,.123,.121,.16);

    for(let i=0;i<3;i++) {
      tailored(base,i===1?'#35434a':'#28343b',side*(.34+i*.045),2.00,.29,[
        [-.31+i*.068,.003,.004,side*.051,.028],[-.20,.043,.034,side*.03,.039],
        [-.025,.077,.074],[.15,.094,.088,-side*.038,-.018],[.28,.01,.014,-side*.125,-.063]
      ]);
    }    oval(base,'#25363d',side*.37,2.41,-.04,.205,.203,.19);
    for (let petal=0;petal<5;petal++) {
      const angle=petal*2*Math.PI/5;
      oval(base,'#fff4e7',side*.385+.049*Math.cos(angle),2.422+.049*Math.sin(angle),.143,.038,.028,.018)
        .rotation.z=angle;
    }
    oval(base,'#dfad68',side*.385,2.422,.159,.021,.021,.012);
  }
  for (let i=0;i<5;i++) {
    tailored(base,i%2?'#29363e':'#35434a',-.19+i*.084,2.16,.366,[
      [-.16+.024*Math.abs(i-2),.002,.002,-.047,.057],[-.08,.046,.032,-.014,.074],
      [.038,.078,.058,.016,.048],[.15,.084,.072,.035,-.013],[.23,.012,.014,.082,-.095]
    ]);
  }
  oval(base,'#a76a66',0,1.73,.451,.044,.020,.016);
  oval(base,'#f7b898',0,1.814,.478,.045,.037,.030);

  // Keep facial features and hair in the same frame while refining the silhouette.
  for (const part of base.children) {
    if (part.position.y < 1.6) continue;
    part.position.x *= .65;
    part.position.y = 1.54 + (part.position.y-1.54)*.73;
    part.position.z *= .68;
    part.scale.multiply(new THREE.Vector3(.65,.73,.68));
  }
  oval(base,skin,0,1.53,0,.123,.189,.115);
  for (const side of [-1,1]) {
    oval(base,'#384044',side*.111,1.864,.307,.065,.011,.009).rotation.z = side*.11;
    oval(base,skin,side*.515,.787,.033,.077,.132,.073).rotation.z=side*.24;
    oval(base,'#314742',side*.174,.09,.103,.128,.079,.176);
  }
  const palettes = {
    royal:'#81aaac',varsity:'#8060db',mint:'#61bba6',navy:'#384976',sand:'#c39d73',
    rose:'#f2dbd1',lilac:'#a987dd',berry:'#9b4972',cream:'#e5bd85'
  };
  const draft = new THREE.Group();
  scene.add(draft);

  function wingTexture(palette) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    for (const side of [-1,1]) {
      ctx.save();
      ctx.translate(256,310);
      ctx.scale(side,1);
      for (let i=0;i<5;i++) {
        ctx.beginPath();
        ctx.moveTo(13,32);
        ctx.quadraticCurveTo(25+i*12,-115,226-i*16,-209+i*52);
        ctx.quadraticCurveTo(207-i*11,-82+i*34,77,68+i*9);
        ctx.quadraticCurveTo(30,105,13,32);
        ctx.fillStyle = palette[i%palette.length];
        ctx.fill();
        ctx.strokeStyle = '#ffffffaa';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.restore();
    }
    return new THREE.CanvasTexture(canvas);
  }

  const textures = {
    dawn:wingTexture(['#fff3d4','#ffcae5','#bea2fa']),
    moon:wingTexture(['#b9edff','#8490ed','#c7bdff'])
  };
  const slots = ['shirt','pants','skirt','hat','wings'];
  let focusSlot = '';
  const gallery = byId('gallery');
  const title = byId('preview-title');
  const labels = {shirt:'衣服',pants:'裤子',skirt:'裙子',hat:'帽子',wings:'翅膀'};
  function applyFocus() {
    base.visible = !focusSlot;
    for (const part of draft.children) part.visible = !focusSlot || part.userData.slot === focusSlot;
    const name = focusSlot ? byId(focusSlot).selectedOptions[0].textContent : '青岚 · 全身试穿';
    title.textContent = name;
    for (const button of gallery.querySelectorAll('button')) {
      button.setAttribute('aria-pressed',String(button.dataset.slot === focusSlot && (!focusSlot || button.dataset.value === byId(focusSlot).value)));
    }
    const bounds = new THREE.Box3();
    if (focusSlot) for (const part of draft.children) {
      if (part.visible) bounds.union(new THREE.Box3().setFromObject(part));
    }
    if (bounds.isEmpty()) {
      controls.target.set(0,1.43,0);
      camera.position.set(.55,1.8,5.1);
    } else {
      const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
      controls.target.copy(bounds.getCenter(new THREE.Vector3()));
      camera.position.copy(controls.target).add(new THREE.Vector3(radius*.46,radius*.26,Math.max(radius*3.9,1.1)));
    }
    controls.minDistance = focusSlot ? .5 : 2.8;
    controls.update();
    byId('turn').setAttribute('aria-pressed','false');
    byId('turn').textContent = '查看背面';
    renderer.render(scene,camera);
  }

  function buildGallery() {
    function addCard(slot, caption, name, value) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.slot = slot;
      button.dataset.value = value;
      const label = document.createElement('small');
      label.textContent = caption;
      const item = document.createElement('strong');
      item.textContent = name;
      button.append(label,item);
      button.addEventListener('click',() => {
        focusSlot = slot;
        if (slot) byId(slot).value = value;
        fit();
        applyFocus();
      });
      gallery.append(button);
    }
    addCard('','造型','全身试穿','');
    for (const slot of slots) for (const option of byId(slot).options) {
      if (option.value) addCard(slot,labels[slot],option.textContent,option.value);
    }
  }

  function fit() {
    let slotStart = 0;
    function tag(slot) {
      for (const part of draft.children.slice(slotStart)) part.userData.slot = slot;
      slotStart = draft.children.length;
    }
    for (const item of [...draft.children]) {
      draft.remove(item);
      item.geometry.dispose();
      item.material.dispose();
    }
    const [shirt,pants,skirt,hat,wings] = slots.map(id => byId(id).value);
    if (shirt) {
      tailored(draft,palettes[shirt],0,1.17,0,[[-.24,.355,.251],[-.14,.30,.218],[.03,.327,.234],[.17,.364,.231],[.24,.296,.179],[.30,.145,.126]],8,'CylinderGeometry');
      const inset=mesh(draft,new THREE.CylinderGeometry(.18,.063,.32,36),'#fff1df',0,1.30,.178);
      inset.scale.z=.52;
      for (const side of [-1,1]) {
        const sleeve=tailored(draft,palettes[shirt],side*.406,1.179,0,[[-.235,.181,.169,side*.015,.008,.095],[-.193,.183,.175,side*.012,.005,.085],[-.065,.155,.147,0,0,.061],[.055,.129,.128,0,0,.035],[.161,.124,.127],[.224,.092,.093]],7,'CylinderGeometry');
        sleeve.rotation.z=side*.38;
        const edge=tailored(draft,'#bccfc7',side*.406,1.179,0,[[-.239,.183,.171,side*.015,.008,.095],[-.223,.184,.173,side*.015,.008,.093]],7,'CylinderGeometry');
        edge.rotation.z=side*.38;
        oval(draft,'#d8e7df',side*.099,1.302,.236,.020,.216,.014).rotation.z=-side*.35;
      }
      oval(draft,'#497a78',0,.956,0,.363,.066,.273);
      for(let i=0;i<3;i++) {
        const x=.209+i*.028, y=1.401+i*.032;
        oval(draft,'#fff5df',x,y,.187,.025,.017,.017).rotation.z=.5;
        oval(draft,'#adbf95',x-.021,y-.023,.190,.020,.009,.011);
      }
    }
    tag('shirt');
    if (pants) for (const side of [-1,1]) {
      oval(draft,palettes[pants],side*.18,.49,0,.153,.29,.165);
    }
    tag('pants');
    if (skirt) {
      tailored(draft,palettes[skirt],0,.655,0,[[-.292,.555,.391,0,0,.07],[-.211,.548,.383,0,0,.063],[-.07,.482,.344,0,0,.05],[.113,.396,.291,0,0,.032],[.255,.335,.258]],14,'CylinderGeometry');
      oval(draft,'#477d7c',0,.9,0,.37,.067,.30);
      oval(draft,'#639693',.169,.662,.348,.063,.243,.027).rotation.z = .16;
      for (let flower=0;flower<3;flower++) {
        const x = -.29+flower*.10, y=.51+flower*.074;
        for (let petal=0;petal<5;petal++) {
          const angle=petal*2*Math.PI/5;
          oval(draft,'#fff6ec',x+.033*Math.cos(angle),y+.033*Math.sin(angle),.401,.024,.024,.012);
        }
        oval(draft,'#d2a358',x,y,.411,.016,.016,.009);
      }
    }
    tag('skirt');
    if (hat) {
      oval(draft,palettes[hat],0,2.146,.025,.36,.05,.32);
      mesh(draft,new THREE.CylinderGeometry(.21,.25,.17,32),palettes[hat],0,2.245,.015);
    }
    tag('hat');
    if (wings) {
      const wing = new THREE.Mesh(
        new THREE.PlaneGeometry(3.1,2.43),
        new THREE.MeshBasicMaterial({map:textures[wings],transparent:true,alphaTest:.05,side:THREE.DoubleSide})
      );
      wing.position.set(0,1.49,-.4);
      draft.add(wing);
    }
    tag('wings');
    renderer.render(scene,camera);
  }

  function view(back) {
    const distance = camera.position.distanceTo(controls.target);
    camera.position.copy(controls.target).add(new THREE.Vector3(0,distance*.07,back ? -distance : distance));
    controls.update();
    byId('turn').setAttribute('aria-pressed', String(back));
    byId('turn').textContent = back ? '查看正面' : '查看背面';
  }

  function exportOutfit() {
    const sphere = '1101002001034010';
    const selections = Object.fromEntries(slots.map(id => [id, byId(id).value]));
    const items = [];
    for (const group of [base,draft]) for (const part of group.children) {
      const geometry = part.geometry;
      const shape = geometry.userData?.placementProxy || geometry.type;
      if (shape === 'PlaneGeometry') continue;
      geometry.computeBoundingBox();
      const size = geometry.boundingBox.getSize(new THREE.Vector3()).multiply(part.scale);
      const typeId = {
        SphereGeometry:sphere,
        TorusGeometry:'1101002001027053',
        CylinderGeometry:'1101002001027026',
        OctahedronGeometry:'1101002001027068'
      }[shape];
      if (!typeId) throw Error('未映射的模型零件 ' + shape);
      const ring = shape === 'TorusGeometry';
      const scale = {
        x:size.x*100/(ring?600:300),
        y:(ring?size.y*100/600:size.z*100/300),
        z:(ring?size.z*100/75:size.y*100/(shape==='OctahedronGeometry'?275:300))
      };
      const rotation = {
        pitch:THREE.MathUtils.radToDeg(-part.rotation.z),
        roll:THREE.MathUtils.radToDeg(part.rotation.x)-(ring?90:0),
        yaw:THREE.MathUtils.radToDeg(-part.rotation.y)
      };
      const rgb = part.material.color;
      items.push({
        typeId, slot:part.userData.slot??null, snapToGround:false,
        transform:{
          location:{x:part.position.x*100,y:part.position.z*100,z:part.position.y*100-(ring?0:size.y*50)},
          rotation,scale
        },
        color:{r:Math.round(rgb.r*255),g:Math.round(rgb.g*255),b:Math.round(rgb.b*255)}
      });
    }
    return {
      schema:'yuanmeng-outfit-preview/v1',unit:'cm',label:'青岚',selections,
      restoreMode:'static-piece-test',
      pendingBindings:{
        starBaby:{typeId:null,displayOnly:true},
        equipment:{typeId:'1105000000000148',mode:'native-equipment-attachment',slots:slots.filter(slot=>selections[slot])},
        wings:selections.wings?{iconTypeId:'1103080001003043',carrierTypeId:'1101008001001215',imageAsset:null,attachment:'back'}:null
      },
      items
    };
  }

  byId('export').addEventListener('click',() => {
    const data = new Blob([JSON.stringify(exportOutfit(),null,2)],{type:'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(data);
    link.download = 'velvet-star-outfit.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href),1000);
  });

  for (const id of slots) byId(id).addEventListener('change',() => { focusSlot = ''; fit(); applyFocus(); });
  byId('reset').addEventListener('click',() => {
    for (const id of slots) byId(id).value = '';
    focusSlot = '';
    fit();
    applyFocus();
  });
  byId('turn').addEventListener('click',() => view(byId('turn').getAttribute('aria-pressed') !== 'true'));
  controls.addEventListener('change',() => renderer.render(scene,camera));
  view(false);
  new ResizeObserver(() => {
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(stage.clientWidth,stage.clientHeight);
    renderer.render(scene,camera);
  }).observe(stage);
  buildGallery();
  fit();
  applyFocus();
})();
