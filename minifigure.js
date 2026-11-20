(()=>{
 const T=THREE,stage=document.getElementById('stage');let renderer;
 try{renderer=new T.WebGLRenderer({antialias:true});}catch{document.getElementById('error').textContent='浏览器无法开启 3D 预览';return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;stage.prepend(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color('#dfe5e3');const camera=new T.PerspectiveCamera(32,1,.05,100),controls=new T.OrbitControls(camera,renderer.domElement);controls.minDistance=3;controls.maxDistance=12;controls.maxPolarAngle=Math.PI*.56;
 scene.add(new T.HemisphereLight(0xffffff,0x8c998c,.75));const light=new T.DirectionalLight(0xfff6e5,.85);light.position.set(4,7,6);scene.add(light);
 const mat=c=>new T.MeshStandardMaterial({color:new T.Color(c).convertSRGBToLinear(),roughness:.32});
 const base=new T.Mesh(new T.BoxGeometry(3.3,.10,2.9),mat('#6f8d87'));base.position.y=-.05;scene.add(base);
 let model,project,selected=0,auto=false,wire=false;
 const catalog=new Map(YuanmengNativeAssets.map(a=>[a.typeId,a]));
 function build(id){selected=id;project=MinifigureProject.create(id,document.getElementById('face').checked);MapExport.prepare(project);
 if(model){scene.remove(model);model.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});}model=new T.Group();scene.add(model);
 const parts=project.placement.commands.flatMap(c=>c.arguments.items);
 for(const item of parts){const a=catalog.get(item.typeId),tr=item.transform,size=a.size.map((n,i)=>n*tr.scale[['x','y','z'][i]]/100),offset=a.offset.map((n,i)=>n*tr.scale[['x','y','z'][i]]/100);let g;
 if(item.typeId==='1101002001034000')g=new T.BoxGeometry(size[0],size[2],size[1]);
 else{g=new T.CylinderGeometry(item.typeId==='1101002001034004'?0:size[0]/2,size[0]/2,size[2],48);g.scale(1,1,size[1]/size[0]);}
 const c=item.color,m=new T.Mesh(g,mat((c.r<<16)|(c.g<<8)|c.b));m.position.set(tr.location.x/100+offset[0],tr.location.z/100+offset[2],-tr.location.y/100-offset[1]);m.material.wireframe=wire;model.add(m);}
 const bounds=new T.Box3().setFromObject(model),height=bounds.max.y*100;
 document.getElementById('name').textContent=MinifigureProject.names[id];document.getElementById('parts').textContent=parts.length+' 个元梦元件 · 本体 281 cm'+(id?' · 含冠 '+height.toFixed(1)+' cm':'');
 }
 const reset=()=>{camera.position.set(3.8,3,6.2);controls.target.set(0,1.4,0);controls.update()};
 document.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>{build(Number(b.dataset.model));document.querySelectorAll('[data-model]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
 document.getElementById('reset').onclick=reset;document.getElementById('rotate').onclick=e=>{auto=!auto;e.target.setAttribute('aria-pressed',String(auto));e.target.textContent=auto?'停止旋转':'自动旋转'};
 document.getElementById('wire').onclick=e=>{wire=!wire;e.target.setAttribute('aria-pressed',String(wire));model.traverse(o=>{if(o.isMesh)o.material.wireframe=wire})};
 document.getElementById('face').onchange=()=>build(selected);document.getElementById('model-export').onclick=()=>MapExport.open(()=>project);
 WorkshopBridge.buildButton(document.getElementById('model-actions'),()=>project);
 new ResizeObserver(()=>{renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix()}).observe(stage);
 build(0);reset();let last=performance.now();function draw(t){if(auto)model.rotation.y+=(t-last)*.0005;last=t;controls.update();renderer.render(scene,camera);requestAnimationFrame(draw)}requestAnimationFrame(draw);
})();
