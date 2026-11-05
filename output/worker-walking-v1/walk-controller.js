(function(){
  const root=document.getElementById('worker-walking-viewer');
  const stage=root.querySelector('.walk-stage'),canvas=root.querySelector('canvas'),loading=root.querySelector('.walk-loading');
  const toggle=root.querySelector('.walk-toggle'),status=root.querySelector('.walk-status'),rotation=root.querySelector('.walk-rotation'),angle=root.querySelector('.walk-angle'),zoom=root.querySelector('.walk-zoom'),zoomValue=root.querySelector('.walk-zoom-value');
  const stored=window.openai?.widgetState;
  const saved=stored?.modelContent?.view==='worker-walking-45'?(stored.privateContent||{}):{};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running=typeof saved.running==='boolean'?saved.running:!reduced;
  let yaw=Number.isFinite(saved.yaw)?saved.yaw:Math.PI/4,pitch=Number.isFinite(saved.pitch)?saved.pitch:Math.PI/4,magnify=Number.isFinite(saved.magnify)?saved.magnify:1;
  let renderer,scene,camera,worker,animator,path,pathLength,distance,stopAt,wait=0,speed=.45,walkDistance=0,time=0;
  let raf=0,last=performance.now(),onScreen=true,dead=false,ready=false,resizeObserver,intersectionObserver;
  let floor,grid,trim;
  const target=new THREE.Vector3(0,.34,0);
  function save(){window.openai?.setWidgetState?.({modelContent:{character:'bodur-usta',view:'worker-walking-45'},privateContent:{running,yaw,pitch,magnify,progress:distance/pathLength%1}})?.catch(()=>{});}
  function controls(){
    const degrees=Math.round(Math.atan2(Math.sin(yaw),Math.cos(yaw))*180/Math.PI);rotation.value=degrees;angle.value=degrees+'°';zoom.value=Math.round(magnify*100);zoomValue.value=Math.round(magnify*100)+'%';
    toggle.textContent=running?'Durdur':'Yürüt';toggle.setAttribute('aria-pressed',String(running));
    const text=!running?'Duraklatıldı':wait>0?'Kısa mola':'Yürüyor';if(status.textContent!==text)status.textContent=text;
  }
  function render(){
    if(!renderer||!ready)return;
    const aspect=stage.clientWidth/Math.max(1,stage.clientHeight);
    const half=Math.max(2.55,3.22/aspect)/magnify;
    camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
    camera.position.set(Math.sin(yaw)*Math.cos(pitch)*10,target.y+Math.sin(pitch)*10,Math.cos(yaw)*Math.cos(pitch)*10);camera.lookAt(target);renderer.render(scene,camera);controls();
  }
  function getThemeColor(variable){
    const probe=document.createElement('span');probe.style.color='var('+variable+')';probe.hidden=true;root.appendChild(probe);const css=getComputedStyle(probe).color;probe.remove();
    const ctx=document.createElement('canvas').getContext('2d');ctx.fillStyle=css;ctx.fillRect(0,0,1,1);const rgb=ctx.getImageData(0,0,1,1).data;return new THREE.Color(rgb[0]/255,rgb[1]/255,rgb[2]/255).convertSRGBToLinear();
  }
  function theme(){if(!floor)return;const dark=matchMedia('(prefers-color-scheme: dark)').matches;floor.material.color.set(dark?0x777971:0xcbd0c5);trim.material.color.set(dark?0x565d55:0xaeb8ac);grid.material.color.copy(getThemeColor('--foreground'));render();}
  function nextStop(d){const lap=Math.floor(d/pathLength),candidates=[lap*pathLength+.28*pathLength,lap*pathLength+.75*pathLength,(lap+1)*pathLength+.28*pathLength];return candidates.find(x=>x>d+.025);}
  function place(dt){
    const u=(distance%pathLength)/pathLength,point=path.getPointAt(u),tangent=path.getTangentAt(u),heading=Math.atan2(tangent.x,tangent.z);
    worker.position.x=point.x;worker.position.z=point.z;
    const turn=Math.atan2(Math.sin(heading-worker.rotation.y),Math.cos(heading-worker.rotation.y));worker.rotation.y+=turn*(dt?1-Math.exp(-dt*12):1);
    animator.pose((walkDistance/animator.cycleDistance)%1,speed,time);
  }
  function update(dt){
    time+=dt;
    if(wait>0){wait=Math.max(0,wait-dt);speed=Math.max(0,speed-dt*1.6);if(wait===0)stopAt=nextStop(distance+.025);}
    else{
      const remaining=Math.max(0,stopAt-distance),wanted=Math.min(.5,Math.sqrt(2*.8*remaining));
      speed+=THREE.MathUtils.clamp(wanted-speed,-dt*.9,dt*.75);
      const step=Math.min(speed*dt,remaining);distance+=step;walkDistance+=step;
      if(remaining<.015&&speed<.16){distance=stopAt;wait=1.65;}
    }
    place(dt);
  }
  function schedule(){if(!raf&&!dead)raf=requestAnimationFrame(tick);}
  function tick(now){
    raf=0;if(!root.isConnected){dead=true;renderer.dispose();return;}
    const dt=Math.min(.045,Math.max(0,(now-last)/1000));last=now;
    if(running&&onScreen&&!document.hidden){update(dt);render();schedule();}else render();
  }
  try{
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.17;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,40);
    scene.add(new THREE.HemisphereLight(0xfff5e7,0x82909c,1.7));
    const key=new THREE.DirectionalLight(0xffefd7,3);key.position.set(-3,7,5);key.target.position.set(0,0,0);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.camera.near=.1;key.shadow.camera.far=20;key.shadow.normalBias=.008;key.shadow.bias=-.0001;scene.add(key);scene.add(key.target);
    const fill=new THREE.DirectionalLight(0xc9def4,1.2);fill.position.set(4,3,-4);scene.add(fill);const rim=new THREE.DirectionalLight(0xffead3,1.1);rim.position.set(-3,4,-4);scene.add(rim);
    floor=new THREE.Mesh(new THREE.BoxGeometry(4.8,.055,3.6),new THREE.MeshStandardMaterial({color:0xcbd0c5,roughness:1}));floor.position.y=-.0275;floor.receiveShadow=true;scene.add(floor);
    trim=new THREE.Mesh(new THREE.BoxGeometry(4.84,.025,3.64),new THREE.MeshStandardMaterial({color:0xaeb8ac,roughness:1}));trim.position.y=-.062;scene.add(trim);
    const points=[];for(let x=-2;x<=2.001;x+=.5)points.push(x,.001,-1.8,x,.001,1.8);for(let z=-1.5;z<=1.501;z+=.5)points.push(-2.4,.001,z,2.4,.001,z);
    const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(points,3));grid=new THREE.LineSegments(gg,new THREE.LineBasicMaterial({transparent:true,opacity:.1,depthWrite:false}));scene.add(grid);
    const built=createMaketWorker(THREE);worker=built.worker;scene.add(worker);animator=createWorkerAnimator(THREE,built);
    path=new THREE.CatmullRomCurve3([[-1.36,-.55],[-.95,-.95],[.95,-.95],[1.36,-.55],[1.36,.55],[.95,.95],[-.95,.95],[-1.36,.55]].map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal');
    path.arcLengthDivisions=500;pathLength=path.getLength();distance=pathLength*(Number.isFinite(saved.progress)?saved.progress:.36);stopAt=nextStop(distance);place(0);
    if(!running){speed=0;animator.pose(0,0,0);}
    ready=true;loading.hidden=true;root.dataset.ready='true';theme();
    resizeObserver=new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;if(w<1||h<1)return;renderer.setSize(w,h,false);render();});resizeObserver.observe(stage);
    intersectionObserver=new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;last=performance.now();if(onScreen)schedule();});intersectionObserver.observe(stage);
    document.addEventListener('visibilitychange',()=>{last=performance.now();if(!document.hidden)schedule();});
    toggle.addEventListener('click',()=>{running=!running;last=performance.now();controls();save();schedule();});
    rotation.addEventListener('input',()=>{yaw=Number(rotation.value)*Math.PI/180;render();});rotation.addEventListener('change',save);
    zoom.addEventListener('input',()=>{magnify=Number(zoom.value)/100;render();});zoom.addEventListener('change',save);
    let pointer=null,lastX=0,lastY=0;
    canvas.addEventListener('pointerdown',e=>{if(!Number.isFinite(e.pointerId))return;pointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;try{canvas.setPointerCapture(e.pointerId);}catch(_){}});
    canvas.addEventListener('pointermove',e=>{if(pointer!==e.pointerId)return;yaw-=(e.clientX-lastX)*.009;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.006,Math.PI/9,Math.PI*5/12);lastX=e.clientX;lastY=e.clientY;render();});
    const end=e=>{if(pointer===e.pointerId){pointer=null;save();}};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    let mouseDown=false;canvas.addEventListener('mousedown',e=>{if(pointer!==null)return;mouseDown=true;lastX=e.clientX;lastY=e.clientY;e.preventDefault();});
    window.addEventListener('mousemove',e=>{if(!mouseDown)return;yaw-=(e.clientX-lastX)*.009;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.006,Math.PI/9,Math.PI*5/12);lastX=e.clientX;lastY=e.clientY;render();});window.addEventListener('mouseup',()=>{if(mouseDown){mouseDown=false;save();}});
    canvas.addEventListener('wheel',e=>{e.preventDefault();magnify=THREE.MathUtils.clamp(magnify*Math.exp(-e.deltaY*.001),.75,1.8);render();save();},{passive:false});
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change',theme);
    window.addEventListener('openai:set_globals',e=>{const state=e.detail?.globals?.widgetState;if(state?.modelContent?.view!=='worker-walking-45')return;const s=state.privateContent||{};if(Number.isFinite(s.yaw))yaw=s.yaw;if(Number.isFinite(s.pitch))pitch=s.pitch;if(Number.isFinite(s.magnify))magnify=s.magnify;if(typeof s.running==='boolean')running=s.running;last=performance.now();render();schedule();});
    controls();schedule();
  }catch(e){loading.hidden=false;loading.textContent='Yürüyüş açılamadı: '+e.message;loading.setAttribute('role','alert');root.dataset.error=e.message;}
})();
