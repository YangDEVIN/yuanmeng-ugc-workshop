(async()=>{
  const byId=id=>document.getElementById(id), stage=byId('stage'),status=byId('status');
  try {
    const response=await fetch('coconut/project.json');
    if(!response.ok)throw Error('地图工程加载失败');
    const project=await response.json(),scene=new THREE.Scene();
    const renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.outputEncoding=THREE.sRGBEncoding;
    stage.append(renderer.domElement);
    scene.background=new THREE.Color(0xbfdadc);
    scene.add(new THREE.HemisphereLight(0xfffbef,0x889ca0,.64));
    const sun=new THREE.DirectionalLight(0xffead4,.56);sun.position.set(10,20,8);scene.add(sun);
    const camera=new THREE.PerspectiveCamera(42,1,.05,5000);
    const controls=new THREE.OrbitControls(camera,renderer.domElement);
    const model=(await new THREE.GLTFLoader().loadAsync('coconut/source.glb')).scene;
    const sand=new THREE.MeshLambertMaterial({color:0xd6b887,side:THREE.DoubleSide});
    const water=new THREE.MeshLambertMaterial({color:0x398e99,side:THREE.DoubleSide});
    function terrainMaterial(m){
      if(/chunk_地形基础色/.test(m.name))return sand;
      if(/_sea01|pool02.*sea_Material/i.test(m.name))return water;
      return m;
    }
    model.traverse(n=>{if(n.isMesh)n.material=Array.isArray(n.material)?n.material.map(terrainMaterial):terrainMaterial(n.material)});
    scene.add(model);
    const mapped=new THREE.Group();scene.add(mapped);mapped.visible=false;
    const box=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(.5,16,12);
    const blockCount=project.placement.commands.reduce((n,c)=>n+c.arguments.items.filter(i=>i.typeId==='1101002001034000').length,0);
    const blocks=new THREE.InstancedMesh(box,new THREE.MeshLambertMaterial(),blockCount);
    const transform=new THREE.Object3D(),tint=new THREE.Color();
    let blockIndex=0;
    mapped.add(blocks);
    const nativeCatalog=new Map(window.YuanmengNativeAssets.map(a=>[a.typeId,a]));
    for(const command of project.placement.commands)for(const item of command.arguments.items){
      const {location,scale}=item.transform;
      if(item.typeId==='1108008001001009'){
        const a=nativeCatalog.get(item.typeId),rotation=item.transform.rotation,rad=Math.PI/180;
        const roof=new THREE.Mesh(box,new THREE.MeshLambertMaterial({color:0x885635}));
        roof.scale.set(a.size[0]*scale.x/100,a.size[2]*scale.z/100,a.size[1]*scale.y/100);
        roof.rotation.set(0,rotation.yaw*rad,rotation.pitch*rad,'YZX');
        roof.position.set(location.x/100,location.z/100,-location.y/100);
        roof.translateY(roof.scale.y/2);
        mapped.add(roof);continue;
      }
      if(item.typeId!=='1101002001034000'){
        const asset=nativeCatalog.get(item.typeId),group=new THREE.Group();
        const basic=(geometry,color,x,y,z,w,h,d)=>{
          const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color}));
          mesh.position.set(x,y,z);mesh.scale.set(w,h,d);group.add(mesh);return mesh;
        };
        if(item.typeId==='1108001002001000'){
          // Schematic of the catalogue's timber-framed striped lounger.
          basic(box,0xc5ab83,-.17,-.13,0,.57,.065,.86);
          const back=basic(box,0xc5ab83,.25,.16,0,.065,.71,.86);
          back.rotation.z=-.34;
          for(let stripe=0;stripe<7;stripe++){
            const z=(stripe-3)*.106,color=stripe%2?0xf4e5cf:0x508b95;
            basic(box,color,-.17,-.085,z,.54,.03,.106);
            basic(box,color,.215,.17,z,.033,.68,.106).rotation.z=-.34;
          }
          for(const z of [-.4,.4]){
            basic(box,0x805d44,0,-.30,z,.08,.46,.07).rotation.z=.67;
            basic(box,0x805d44,0,-.30,z,.08,.46,.07).rotation.z=-.67;
          }
        }else if(item.typeId==='1108006006001002'){
          basic(new THREE.CylinderGeometry(.034,.06,.76,9),0x856245,.015,-.12,0,1,1,1);
          for(let i=0;i<9;i++){
            const a=i*Math.PI*2/9;
            const leaf=basic(sphere,i%2?0x668d45:0x477544,Math.cos(a)*.21,.29,Math.sin(a)*.21,.54,.105,.15);
            leaf.rotation.order='YXZ';leaf.rotation.y=-a;leaf.rotation.z=-.31;
          }
        }else if(item.typeId==='1102015001004218'){
          basic(sphere,0x527d45,0,0,0,1,.86,.91);
          basic(sphere,0x739752,.17,.17,.04,.62,.66,.68);
        }else if(asset.name==='游泳圈'){
          const ring=basic(new THREE.TorusGeometry(.35,.12,12,36),0xe68d62,0,0,0,1,1,1);
          ring.rotation.y=Math.PI/2;
        }else if(asset.name==='冲浪板1'){
          basic(sphere,0xe4ba72,0,0,0,.85,.99,1);
          basic(sphere,0x408b94,.13,0,0,.7,.85,.28);
        }else if(asset.name==='木秋千'){
          for(const x of [-.43,.43])basic(box,0x8d6641,x,0,0,.07,.98,.12);
          basic(box,0x9b734c,0,.43,0,.94,.10,.15);
          for(const x of [-.22,.22])basic(box,0x785f46,x,0,0,.018,.79,.025);
          basic(box,0xb5865a,0,-.35,0,.58,.065,.55);
        }else if(asset.name==='大型户外桌'||asset.name==='烤架'){
          const grill=asset.name==='烤架';
          basic(grill?sphere:box,grill?0x373a3b:0xb89166,0,.31,0,.98,.22,.96);
          for(const x of [-.38,.38])for(const z of [-.36,.36])basic(box,0x75614c,x,-.05,z,.07,.83,.08);
        }else if(asset.name==='路牌'||asset.name==='木信箱'||asset.name==='铁艺路灯'){
          basic(box,0x695d4c,0,-.04,0,.1,.92,.1);
          if(asset.name==='铁艺路灯')basic(sphere,0xf4d799,0,.33,0,.70,.32,.72);
          else basic(box,0xaa794f,0,.27,0,.92,.38,asset.name==='木信箱'?.77:.14);
        }else if(asset.name==='甜蜜气球簇'){
          for(const [x,y,z,c] of [[-.2,.23,.06,0xeb897b],[.18,.20,-.1,0x86c6cd],[0,.34,.15,0xe8c17d]]){
            basic(sphere,c,x,y,z,.43,.37,.43);
            basic(box,0xb7ab96,x,-.15,z,.012,.65,.012);
          }
        }else if(asset.name==='儿童滑梯'){
          basic(box,0x72bbc3,-.30,0,0,.12,.88,.64);
          basic(box,0xe6a44e,.07,-.015,0,.1,1.13,.68).rotation.z=.70;
        }else if(asset.name==='小贝壳'||asset.name==='大龙虾'){
          const shell=asset.name==='小贝壳';
          basic(sphere,shell?0xe1c7aa:0xb95740,0,0,0,.92,.70,.68);
          for(const side of [-1,1])basic(sphere,shell?0xf1d9bd:0xcd6951,side*.28,.06,.20,.32,.42,.51);
        }else basic(new THREE.IcosahedronGeometry(.5,0),0x807d72,0,0,0,1,1,1);
        group.scale.set(asset.size[0]*scale.x/100,asset.size[2]*scale.z/100,asset.size[1]*scale.y/100);
        group.position.set((location.x+asset.offset[0]*scale.x)/100,(location.z+asset.offset[2]*scale.z)/100,-(location.y+asset.offset[1]*scale.y)/100);
        mapped.add(group);continue;
      }
      const {r,g,b}=item.color,key=r*65536+g*256+b;
      transform.scale.set(scale.x,scale.z,scale.y);
      const rot=item.transform.rotation,rad=Math.PI/180;
      transform.rotation.set(0,rot.yaw*rad,rot.pitch*rad,'YZX');
      transform.position.set(location.x/100,location.z/100,-location.y/100);
      transform.translateY(scale.z/2);
      transform.updateMatrix();
      blocks.setMatrixAt(blockIndex,transform.matrix);
      blocks.setColorAt(blockIndex++,tint.setHex(key).convertSRGBToLinear());
    }
    const pieces=[];
    model.updateMatrixWorld(true);
    model.traverse(node=>{
      if(node.isMesh){
        node.geometry.computeBoundingBox();
        pieces.push(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));
      }
    });
    // Frame the island and its props separately from the much wider offshore plane.
    const bounds=new THREE.Box3();
    const widths=pieces.map(p=>p.getSize(new THREE.Vector3()).length()).sort((a,b)=>a-b);
    const cutoff=widths[Math.floor(widths.length*.97)];
    for(const piece of pieces)if(piece.getSize(new THREE.Vector3()).length()<=cutoff)bounds.union(piece);
    const center=bounds.getCenter(new THREE.Vector3()),r=bounds.getBoundingSphere(new THREE.Sphere()).radius;
    controls.target.copy(center);
    function frame(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
    frame();camera.position.copy(center).add(new THREE.Vector3(1,.72,1.25).normalize().multiplyScalar(r*2.25/Math.min(1,camera.aspect)));controls.update();
    const islandEye=camera.position.clone(),islandTarget=center.clone();
    byId('house').onclick=()=>{controls.target.set(-4.55,4.2,1.53);camera.position.set(11,12,23);controls.update()};
    byId('island').onclick=()=>{controls.target.copy(islandTarget);camera.position.copy(islandEye);controls.update()};
    byId('house').click();
    new ResizeObserver(frame).observe(stage);
    function select(original){model.visible=original;mapped.visible=!original;byId('source').setAttribute('aria-pressed',original);byId('mapped').setAttribute('aria-pressed',!original)}
    byId('source').onclick=()=>select(true);byId('mapped').onclick=()=>select(false);
    select(new URLSearchParams(location.search).get('view')!=='mapped');
    status.textContent='元梦映射 · '+project.placement.count+' 个元件';
    WorkshopBridge.buildButton(document.querySelector('.actions'),()=>project);
    renderer.setAnimationLoop(()=>renderer.render(scene,camera));
  } catch(error){status.textContent=error.message}
})();
