function createMaketWorker(THREE) {
  const worker = new THREE.Group(); worker.name = 'MaketUsta';
  const palette = {
    shirt:0x273a55, shirtLight:0x344c68, shirtDark:0x203047,
    orange:0xed7529, orangeDark:0xd7601e, reflective:0xd9ddd4,
    skin:0xc48c60, skinLight:0xd69c6e, skinDark:0xab724d,
    helmet:0xf3b92b, helmetLight:0xffcc42, helmetDark:0xd99c14,
    hair:0x382c25, eyes:0x282421, mouth:0x81533d,
    leather:0x8b603a, leatherLight:0xa27447, leatherDark:0x65462e,
    boots:0x353634, sole:0x242626, metal:0x929995
  };
  const mats = {};
  for (const [key,color] of Object.entries(palette)) {
    mats[key] = new THREE.MeshStandardMaterial({color, roughness:key==='metal'?.48:.91, metalness:key==='metal'?.42:0, flatShading:true});
    mats[key].name = key;
  }
  function mesh(parent,name,geo,material,pos=[0,0,0],scale=[1,1,1]) {
    if (geo.index) geo = geo.toNonIndexed();
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo,typeof material==='string'?mats[material]:material);
    m.name=name; m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function group(parent,name,pos=[0,0,0]) {const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}
  function beveled(w,h,d,b=.006) {
    b=Math.min(b,w/8,h/8,d/8);
    const s=new THREE.Shape(),x=w/2-b,y=h/2-b,c=Math.min(w,h)*.07;
    s.moveTo(-x+c,-y);s.lineTo(x-c,-y);s.lineTo(x,-y+c);s.lineTo(x,y-c);s.lineTo(x-c,y);s.lineTo(-x+c,y);s.lineTo(-x,y-c);s.lineTo(-x,-y+c);s.closePath();
    const geo=new THREE.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:b,bevelThickness:b,curveSegments:1});
    geo.translate(0,0,-d/2+b);return geo;
  }
  function box(p,n,w,h,d,mat,pos,b=.006) {return mesh(p,n,beveled(w,h,d,b),mat,pos);}
  function poly(p,n,vertices,mat) {
    const contour=vertices.map(v=>new THREE.Vector2(v[0],v[1]));
    const tris=THREE.ShapeUtils.triangulateShape(contour,[]),out=[];
    for(const t of tris)for(const i of t)out.push(...vertices[i]);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(out,3));
    return mesh(p,n,geo,mat);
  }
  function rings(p,n,levels,mat,segments=10,start=0,end=Math.PI*2,cap=true) {
    const pts=[];
    for (const l of levels) for(let j=0;j<=segments;j++) {
      const a=start+(end-start)*j/segments;pts.push([Math.sin(a)*l[1],l[0],Math.cos(a)*l[2]+(l[3]||0)]);
    }
    const descending=levels[levels.length-1][0]<levels[0][0];
    const out=[],tri=(a,b,c)=>{if(descending)out.push(...pts[a],...pts[c],...pts[b]);else out.push(...pts[a],...pts[b],...pts[c]);};
    for(let k=0;k<levels.length-1;k++)for(let j=0;j<segments;j++) {
      const a=k*(segments+1)+j,b=a+segments+1;tri(a,a+1,b);tri(a+1,b+1,b);
    }
    if(cap&&end-start>6.28)for(const k of [0,levels.length-1]) {
      const center=pts.length;pts.push([0,levels[k][0],levels[k][3]||0]);
      for(let j=0;j<segments;j++) {const a=k*(segments+1)+j;if(k===0)tri(center,a+1,a);else tri(center,a,a+1);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(out,3));
    return mesh(p,n,geo,mat);
  }
  const torso = group(worker,'Govde');
  rings(torso,'IsGomlegi',[[1.015,.17,.112],[1.09,.183,.121],[1.31,.218,.134],[1.46,.233,.121],[1.52,.205,.105],[1.55,.115,.081]],'shirt',12);
  rings(torso,'YelekArkaVeYan',[[1.06,.184,.125],[1.17,.196,.134],[1.34,.222,.141],[1.49,.217,.117]],'orange',14,Math.PI*.37,Math.PI*1.63,false);
  for(const side of [-1,1]) {
    function curvedPanel(name,levels,material,stripe=false){
      const pts=[],out=[];
      for(const [y,rx,rz,inner] of levels)for(let j=0;j<=4;j++){
        const a=stripe?.53+.19*j/4:inner+(1.25-inner)*j/4;
        pts.push([side*Math.sin(a)*rx,y,Math.cos(a)*rz+.009]);
      }
      const tri=(a,b,c)=>{if(side===-1)out.push(...pts[a],...pts[c],...pts[b]);else out.push(...pts[a],...pts[b],...pts[c]);};
      for(let k=0;k<levels.length-1;k++)for(let j=0;j<4;j++){const a=k*5+j,b=a+5;tri(a,a+1,b);tri(a+1,b+1,b);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(out,3));mesh(torso,name,geo,material);
    }
    curvedPanel('YelekOn'+side,[[1.062,.19,.13,.13],[1.17,.2,.137,.13],[1.34,.226,.146,.12],[1.49,.223,.124,.36],[1.52,.207,.111,.44]],'orange');
    curvedPanel('ReflektorOn'+side,[[1.174,.204,.141,0],[1.34,.229,.15,0],[1.49,.226,.128,0]],'reflective',true);
    const collar=[[-.082,1.549,.105],[-.009,1.493,.149],[-.053,1.435,.157],[-.103,1.491,.143]].map(a=>[a[0]*side,a[1],a[2]]);if(side===-1)collar.reverse();
    poly(torso,'GomlekYakasi'+side,collar,'shirtLight');
    const backStrip=box(torso,'ReflektorArka'+side,.033,.312,.007,'reflective',[side*.107,1.321,-.137],.001);
    backStrip.rotation.z=side*.018;
  }
  rings(torso,'ReflektorCevre',[[1.13,.2,.152],[1.172,.204,.153]],'reflective',36,.13,Math.PI*2-.13,false);
  box(torso,'Fermuar',.008,.259,.009,'orangeDark',[0,1.195,.155],.001);
  rings(torso,'Boyun',[[1.53,.054,.052],[1.661,.055,.052]],'skin',8);
  const head=group(worker,'Bas');head.scale.set(1.07,1,1.07);
  rings(head,'Yuz',[[1.638,.055,.055,.018],[1.67,.083,.073,.022],[1.71,.104,.086,.018],[1.80,.118,.098,.008],[1.872,.111,.094],[1.91,.078,.068]],'skinLight',12);
  rings(head,'SacArka',[[1.786,.109,.085,-.005],[1.875,.12,.102],[1.921,.091,.079]],'hair',12,Math.PI*.33,Math.PI*1.67,false);
  for(const side of [-1,1]) {
    mesh(head,'Kulak'+side,new THREE.IcosahedronGeometry(1,0),'skin',[side*.115,1.773,.004],[.025,.038,.024]);
    box(head,'Favori'+side,.017,.041,.038,'hair',[side*.104,1.806,.042],.001);
    box(head,'Goz'+side,.018,.022,.006,'eyes',[side*.043,1.791,.108],.001);
    const brow=box(head,'Kas'+side,.029,.008,.008,'hair',[side*.043,1.819,.108],.001);brow.rotation.z=side*-.055;
  }
  poly(head,'BurunOn',[[-.013,1.779,.108],[-.017,1.739,.145],[.017,1.739,.145],[.013,1.779,.108]],'skin');
  poly(head,'BurunSag',[[.013,1.779,.108],[.017,1.739,.145],[.024,1.735,.107]],'skinDark');
  poly(head,'BurunSol',[[-.024,1.735,.107],[-.017,1.739,.145],[-.013,1.779,.108]],'skinLight');
  box(head,'Agiz',.042,.004,.006,'mouth',[0,1.708,.107],.0005);
  const helmet=group(head,'Baret');
  rings(helmet,'BaretKabuk',[[1.875,.14,.122],[1.914,.143,.123],[1.963,.122,.105],[2.005,.081,.069],[2.02,.026,.022]],'helmet',16);
  rings(helmet,'BaretAltBant',[[1.868,.146,.128],[1.89,.146,.128]],'helmetDark',16);
  const brim=mesh(helmet,'BaretSiperlik',new THREE.CylinderGeometry(.172,.172,.018,16),'helmet',[0,1.872,.026],[1,1,.92]);
  const ridgePts=[];for(let i=0;i<=12;i++){const a=i*Math.PI/12;ridgePts.push(new THREE.Vector3(0,1.886+Math.sin(a)*.143,Math.cos(a)*.123));}
  mesh(helmet,'BaretOrtaKaburga',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ridgePts),12,.009,4,false),'helmetLight');
  for(const side of [-1,1])box(helmet,'BaretYanDetay'+side,.006,.013,.047,'helmetDark',[side*.141,1.905,-.016],.001);
  rings(worker,'PantolonBel',[[.864,.158,.104],[.936,.174,.116],[1.035,.174,.113]],'shirt',12);
  rings(worker,'DeriKemer',[[1.005,.182,.126],[1.054,.182,.126]],'leatherDark',12);
  box(worker,'KemerTokasi',.061,.047,.016,'metal',[0,1.03,.136],.003);
  box(worker,'KemerTokasiIci',.035,.024,.019,'leatherDark',[0,1.03,.141],.001);
  for(const side of [-1,1]) {
    box(worker,'AletCantasi'+side,.119,.145,.072,'leather',[side*.179,.957,.087],.008);
    const flap=box(worker,'CantaKapagi'+side,.125,.047,.08,'leatherLight',[side*.179,1.018,.091],.004);flap.rotation.x=.10;
    box(worker,'CantaKopru'+side,.026,.065,.012,'leatherDark',[side*.18,1.057,.104],.002);
  }
  const rig={arms:[],elbows:[],hips:[],knees:[]};
  for(const side of [-1,1]) {
    const arm=group(worker,'Omuz'+side,[side*.231,1.485,0]);arm.rotation.z=side*.082;rig.arms.push(arm);
    rings(arm,'GomlekKol'+side,[[0,.075,.081],[-.045,.087,.085],[-.15,.077,.075],[-.26,.065,.065]],'shirt',8);
    rings(arm,'KolKivirma'+side,[[-.232,.077,.074],[-.274,.076,.073]],'shirtLight',8);
    const elbow=group(arm,'Dirsek'+side,[0,-.268,0]);elbow.rotation.x=-.055;rig.elbows.push(elbow);
    rings(elbow,'OnKol'+side,[[.008,.061,.061],[-.08,.062,.058],[-.183,.043,.043],[-.252,.037,.038]],'skin',8);
    const hand=group(elbow,'El'+side,[0,-.274,.003]);
    box(hand,'Avuc'+side,.068,.091,.058,'skinLight',[0,-.017,0],.01);
    const thumb=box(hand,'BasParmak'+side,.027,.054,.033,'skin',[side*-.035,-.007,.022],.005);thumb.rotation.z=side*-.25;
    box(hand,'Parmaklar'+side,.057,.031,.06,'skin',[0,-.055,.003],.006);
    if(side===-1) {
      const hammer=group(hand,'Cekic',[-.002,-.044,.017]);hammer.rotation.z=-.34;
      mesh(hammer,'CekicSap',new THREE.CylinderGeometry(.012,.015,.198,6),'leatherLight',[0,-.085,0]);
      box(hammer,'CekicBas',.105,.044,.048,'metal',[0,-.183,0],.006);
      const cap=mesh(hammer,'CekicVurmaYuzu',new THREE.CylinderGeometry(.03,.027,.018,8),'metal',[-.059,-.183,0]);cap.rotation.z=Math.PI/2;
      for(const clawSide of [-1,1]){const claw=box(hammer,'CekicTirnak'+clawSide,.057,.016,.016,'metal',[.065,-.165,clawSide*.014],.002);claw.rotation.z=.45;}
    }
    const hip=group(worker,'Kalca'+side,[side*.093,.922,0]);rig.hips.push(hip);
    rings(hip,'UstBacak'+side,[[.011,.078,.099],[-.13,.079,.094],[-.27,.067,.078],[-.39,.064,.071]],'shirt',8);
    const knee=group(hip,'Diz'+side,[0,-.382,.004]);rig.knees.push(knee);
    rings(knee,'AltBacak'+side,[[.008,.064,.071],[-.08,.07,.075],[-.245,.056,.061],[-.343,.058,.064]],'shirt',8);
    box(knee,'DizDetayi'+side,.103,.077,.018,'shirtLight',[0,.001,.069],.008);
    rings(knee,'Paca'+side,[[-.299,.065,.069],[-.345,.065,.069]],'shirtLight',8);
    rings(knee,'BotBilek'+side,[[-.33,.061,.066],[-.455,.072,.078]],'boots',8);
    box(knee,'Bot'+side,.147,.105,.252,'boots',[0,-.451,.049],.016);
    box(knee,'BotTaban'+side,.155,.034,.263,'sole',[0,-.49,.052],.007);
    box(knee,'BotDil'+side,.071,.067,.016,'sole',[0,-.377,.081],.006);
  }
  worker.userData={kind:'articulated-low-poly-worker',units:'meters',source:'procedural-original',rig:'named rigid joints; no skinning'};
  return {worker,rig};
}

