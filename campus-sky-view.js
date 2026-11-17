function createMapSky(THREE) {
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let dynamic=false;
  const uniforms={
    zenith:{value:new THREE.Color()},horizon:{value:new THREE.Color()},ground:{value:new THREE.Color()},cloud:{value:new THREE.Color()},
    weather:{value:0},clouds:{value:0},orb:{value:new THREE.Vector3()},time:{value:0}
  };
  const material=new THREE.ShaderMaterial({
    uniforms,side:THREE.BackSide,depthWrite:false,depthTest:false,
    vertexShader:`
      varying vec3 direction;
      void main(){ direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
    `,
    fragmentShader:`
      varying vec3 direction;
      uniform vec3 zenith,horizon,ground,cloud,orb;
      uniform float weather,clouds,time;
      float hash(vec2 p) {return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p) {
        vec2 i=floor(p),f=fract(p);
        vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+1.0),u.x),u.y);
      }
      void main(){
        vec3 d=normalize(direction);
        float h=d.y;
        vec3 col=mix(horizon,zenith,smoothstep(-.02,.83,h));
        col=mix(col,ground,smoothstep(.0,.44,-h));
        float az=atan(d.z,d.x);
        vec2 p=vec2(az*4.4+time*.12,h*14.0+sin(az+time*.23)*.4);
        float textureCloud=noise(p)*.57+noise(p*2.15)*.28+noise(p*4.7)*.15;
        float vapor=smoothstep(1.0-clouds*.67,1.0-clouds*.33,textureCloud);
        vapor*=smoothstep(-.18,.08,h)*(1.0-smoothstep(.46,.92,h));
        col=mix(col,cloud,vapor*.58);
        if(weather==1.0||weather==2.0||weather==6.0||weather==8.0){
          vec2 starUv=vec2(az*38.0,h*70.0);
          float points=step(.966,hash(floor(starUv)))*(1.0-smoothstep(.025,.135,length(fract(starUv)-.5)));
          col+=vec3(.49,.59,.83)*points*smoothstep(.01,.27,h)*(1.0-vapor*.8);
        }
        if(weather==6.0){
          float planet=dot(d,normalize(vec3(.36,.36,-.82)));
          col+=cloud*pow(max(planet,0.0),22.0)*.20;
          col=mix(col,horizon,smoothstep(.988,.989,planet)*.83);
        }
        if(weather==7.0){
          float waves=pow(.5+.5*sin(az*18.0+h*45.0+time),7.0);
          col=mix(col,cloud,waves*(1.0-smoothstep(.03,.29,abs(h)))*.25);
        }
        if(weather==8.0){
          float ribbon=.21+sin(az*2.0+time*.33)*.09+sin(az*5.0-time*.22)*.035;
          float band=exp(-abs(h-ribbon)*12.0)*smoothstep(-.7,.55,sin(az*4.0+time*.4));
          col+=cloud*band*.50;
        }
        if(weather==0.0||weather==2.0||weather==3.0){
          float proximity=dot(d,orb);
          float halo=pow(max(proximity,0.0),weather==3.0?20.0:58.0);
          float disk=smoothstep(weather==2.0?.9975:.9990,weather==2.0?.9978:.99945,proximity);
          vec3 shade=weather==2.0?vec3(.82,.89,1.0):vec3(1.0,.77,.48);
          col+=halo*shade*.26;
          col=mix(col,shade,disk*(1.0-vapor*.43));
        }
        if(weather==4.0||weather==5.0){
          float ridge=sin(az*5.0)*.022+sin(az*11.0+1.6)*.017+sin(az*18.0)*.009;
          if(weather==5.0) ridge+=pow(.5+.5*sin(az*82.0),7.0)*.07;
          float silhouette=1.0-smoothstep(ridge-.007,ridge+.004,h);
          col=mix(col,ground*.75,silhouette*.66*(1.0-smoothstep(.10,.34,-h)));
        }
        gl_FragColor=vec4(col,1.0);
      }
    `});
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),material);
  mesh.frustumCulled=false;
  mesh.renderOrder=-100;
  function setProfile(profile){
    for(const field of ['zenith','horizon','ground','cloud'])uniforms[field].value.setHex(profile[field]);
    uniforms.clouds.value=profile.clouds;
    uniforms.weather.value={sun:0,stars:1,moon:2,sunset:3,mist:4,forest:5,space:6,sea:7,aurora:8,plain:9}[profile.celestial];
    dynamic=profile.dynamic;
    uniforms.orb.value.set(-.48,profile.celestial==='sunset'?.11:profile.celestial==='moon'?.32:.58,-.73).normalize();
  }
  function followCamera(camera){
    mesh.position.copy(camera.position);
    mesh.scale.setScalar(camera.far*.83);
    uniforms.time.value=dynamic&&!reduceMotion.matches?performance.now()/1000:0;
  }
  return {mesh,setProfile,followCamera,get animating(){return dynamic&&!reduceMotion.matches}};
}
