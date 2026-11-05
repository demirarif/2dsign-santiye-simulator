function createMaketWorker(THREE) {
  const worker=new THREE.Group();worker.name='BodurUsta';
  const colors={navy:0x263e55,navyLight:0x344f66,navyDark:0x1c2e41,orange:0xea752b,orangeEdge:0xc95b20,reflector:0xd9dfd9,skin:0xc99167,skinLight:0xd7a078,skinShade:0xb87b56,hair:0x49352a,eyes:0x25251f,eyeWhite:0xece7d9,helmet:0xedb52a,helmetLight:0xf8c844,helmetDark:0xc9921a,leather:0x8b603e,leatherLight:0xa47a4e,leatherDark:0x62452e,boots:0x42443e,sole:0x2a2f2b,steel:0x9da7a5,steelDark:0x667371};
  const mats={};
  for(const [name,color] of Object.entries(colors)){
    const metal=name==='steel'||name==='steelDark',hard=name.startsWith('helmet'),leather=name.startsWith('leather');
    mats[name]=new THREE.MeshStandardMaterial({color,roughness:metal?.34:hard?.38:leather?.72:name.startsWith('skin')?.83:.94,metalness:metal?.62:0});mats[name].name=name;
  }
  const rig={arms:[],elbows:[],hips:[],knees:[]};
  function group(parent,name,pos=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}
  function mesh(parent,name,geo,mat,pos=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geo,typeof mat==='string'?mats[mat]:mat);m.name=name;m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function ellipsoid(parent,name,pos,scale,mat,detail=20){return mesh(parent,name,new THREE.SphereGeometry(1,detail,14),mat,pos,scale);}
  function roundedGeometry(w,h,d,r){
    r=Math.min(r,w*.49,h*.49,d*.49);
    const g=new THREE.BoxGeometry(w,h,d,6,6,6),p=g.attributes.position,n=g.attributes.normal;
    const q=new THREE.Vector3(),v=new THREE.Vector3();
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i);q.set(THREE.MathUtils.clamp(v.x,-w/2+r,w/2-r),THREE.MathUtils.clamp(v.y,-h/2+r,h/2-r),THREE.MathUtils.clamp(v.z,-d/2+r,d/2-r));
      v.sub(q).normalize();n.setXYZ(i,v.x,v.y,v.z);q.addScaledVector(v,r);p.setXYZ(i,q.x,q.y,q.z);
    }
    return g;
  }
  function box(p,name,pos,size,mat,r=.012){return mesh(p,name,roundedGeometry(...size,r),mat,pos);}
  function profile(p,name,levels,mat,segments=24,start=0,end=Math.PI*2){
    const closed=Math.abs(end-start-Math.PI*2)<.001,cols=closed?segments:segments+1,positions=[],indices=[];
    for(const l of levels)for(let j=0;j<cols;j++){const a=start+(end-start)*j/segments;positions.push(Math.sin(a)*l[1],l[0],Math.cos(a)*l[2]+(l[3]||0));}
    const descending=levels[levels.length-1][0]<levels[0][0];
    const tri=(a,b,c)=>{if(descending)indices.push(a,c,b);else indices.push(a,b,c);};
    for(let k=0;k<levels.length-1;k++)for(let j=0;j<segments;j++){const a=k*cols+j,b=k*cols+(j+1)%cols,c=a+cols,d=b+cols;tri(a,b,c);tri(b,d,c);}
    if(closed)for(const k of [0,levels.length-1]){
      const c=positions.length/3;positions.push(0,levels[k][0],levels[k][3]||0);
      for(let j=0;j<segments;j++){const a=k*cols+j,b=k*cols+(j+1)%cols;if(k===0)tri(c,b,a);else tri(c,a,b);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(p,name,geo,mat);
  }
  function tube(p,name,points,r,mat,segments=20){return mesh(p,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),segments,r,6,false),mat);}
  function panel(p,name,side,levels,mat,angleSpan=null){
    const positions=[],indices=[],cols=7;
    for(const [y,rx,rz,gap,zc] of levels)for(let j=0;j<cols;j++){
      const a=angleSpan?angleSpan[0]+(angleSpan[1]-angleSpan[0])*j/(cols-1):gap+(1.15-gap)*j/(cols-1);
      positions.push(side*Math.sin(a)*rx,y,Math.cos(a)*rz+(zc||0));
    }
    const tri=(a,b,c)=>{if(side<0)indices.push(a,c,b);else indices.push(a,b,c);};
    for(let k=0;k<levels.length-1;k++)for(let j=0;j<cols-1;j++){const a=k*cols+j,b=a+cols;tri(a,a+1,b);tri(a+1,b+1,b);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(p,name,geo,mat);
  }
  const body=group(worker,'Govde');
  profile(body,'Gomlek',[[.686,.23,.163,.012],[.76,.251,.186,.018],[.895,.275,.19,.008],[1.025,.285,.167],[1.087,.264,.136],[1.125,.142,.097]],'navy');
  const vest=[[.746,.259,.191,.075,.02],[.86,.282,.203,.075,.019],[1.02,.299,.18,.19,0],[1.103,.271,.145,.49,-.003]];
  profile(body,'YelekArka',vest.map(l=>[l[0],l[1],l[2],l[4]]),'orange',32,1.15,Math.PI*2-1.15);
  for(const side of [-1,1]){
    panel(body,'YelekOn'+side,side,vest,'orange');
    panel(body,'GogusReflektor'+side,side,[[.858,.286,.208,0,.019],[1.02,.303,.185,0,0],[1.105,.275,.149,0,-.003]],'reflector',[.48,.64]);
    panel(body,'ArkaReflektor'+side,side,[[.858,.286,.208,0,.019],[1.02,.303,.185,0,0],[1.105,.275,.149,0,-.003]],'reflector',[Math.PI-.64,Math.PI-.48]);
    const collar=box(body,'GomlekYakasi'+side,[side*.068,1.105,.105],[.109,.049,.039],'navyLight',.011);collar.rotation.z=side*-.36;collar.rotation.y=side*.23;
    const pocket=group(body,'YelekCep'+side,[side*.154,.929,.175]);pocket.rotation.y=side*.47;
    box(pocket,'YelekCepYuzu'+side,[0,0,0],[.085,.066,.013],'orangeEdge',.007);
    box(pocket,'YelekCepKapak'+side,[0,.028,.009],[.092,.018,.012],'orange',.004);
  }
  profile(body,'BelReflektoru',[[.813,.277,.203,.02],[.851,.286,.21,.019]],'reflector',56,.084,Math.PI*2-.084);
  profile(body,'YelekAltDikis',[[.745,.262,.194,.02],[.759,.265,.197,.02]],'orangeEdge',56,.082,Math.PI*2-.082);
  box(body,'Fermuar', [0,.863,.222],[.009,.197,.006],'orangeEdge',.002);
  profile(worker,'Boyun',[[1.07,.073,.069],[1.178,.077,.073]],'skin',20);
  profile(worker,'PantolonBel',[[.578,.164,.135],[.624,.239,.173],[.717,.244,.176]],'navy',24);
  profile(worker,'Kemer',[[.693,.252,.185],[.748,.252,.185]],'leatherDark',32);
  box(worker,'KemerTokasi',[0,.721,.193],[.079,.061,.019],'steel',.009);
  box(worker,'TokaIci',[0,.721,.205],[.045,.032,.008],'leatherDark',.004);
  for(const a of [-2.3,-1.2,-.55,.55,1.2,2.3]){
    const loop=box(worker,'KemerKoprusu'+a,[Math.sin(a)*.253,.725,Math.cos(a)*.188],[.024,.073,.012],'leatherLight',.004);loop.rotation.y=a;
  }
  for(const side of [-1,1]){
    const pouch=group(worker,'AletCantasi'+side,[side*.211,.648,.133]);pouch.rotation.y=side*.55;
    box(pouch,'CantaGovde'+side,[0,-.007,0],[.149,.174,.094],'leather',.022);
    box(pouch,'CantaAgiz'+side,[0,.065,.002],[.145,.02,.089],'leatherDark',.007);
    box(pouch,'CantaKapak'+side,[0,.055,.052],[.157,.062,.023],'leatherLight',.012);
    const button=mesh(pouch,'CantaCitcit'+side,new THREE.CylinderGeometry(.009,.009,.005,12),'steelDark',[0,.04,.067]);button.rotation.x=Math.PI/2;
    for(const x of [-.054,.054])tube(pouch,'DeriDikis'+side+x,[[x,-.06,.049],[x,-.025,.051],[x,.014,.051]],.0016,'leatherLight',6);
    if(side===1){
      const driver=group(pouch,'Tornavida',[.035,.119,-.015]);driver.rotation.z=-.13;
      mesh(driver,'TornavidaSap',new THREE.CapsuleGeometry(.015,.047,4,10),'navyLight',[0,0,0]);
      mesh(driver,'TornavidaMil',new THREE.CylinderGeometry(.0035,.0035,.087,8),'steel',[0,-.06,0]);
    }
  }
  const head=group(worker,'Bas',[0,1.32,.004]);head.rotation.z=-.028;head.scale.z=1.22;
  const headLevels=[[-.19,.073,.077,.012],[-.17,.119,.105,.008],[-.12,.167,.137,.001],[-.055,.194,.157,0],[.025,.202,.164,-.004],[.105,.193,.16,-.008],[.167,.154,.134,-.008],[.19,.08,.071,-.008]];
  profile(head,'Yuz',headLevels,'skinLight',32);
  function surface(x,y){
    let low=headLevels[0],high=headLevels[headLevels.length-1];
    for(let i=0;i<headLevels.length-1;i++)if(y>=headLevels[i][0]&&y<=headLevels[i+1][0]){low=headLevels[i];high=headLevels[i+1];break;}
    const t=THREE.MathUtils.clamp((y-low[0])/(high[0]-low[0]),0,1),rx=THREE.MathUtils.lerp(low[1],high[1],t),rz=THREE.MathUtils.lerp(low[2],high[2],t),zc=THREE.MathUtils.lerp(low[3]||0,high[3]||0,t);
    return Math.sqrt(Math.max(0,1-(x/rx)**2))*rz+zc;
  }
  profile(head,'SacArka',[[-.057,.201,.169,-.001],[.065,.21,.177,-.006],[.151,.182,.16,-.008],[.19,.089,.081,-.008]],'hair',34,1.01,Math.PI*2-1.01);
  for(const side of [-1,1]){
    ellipsoid(head,'Kulak'+side,[side*.198,-.009,-.006],[.034,.052,.032],'skin');
    ellipsoid(head,'KulakIci'+side,[side*.222,-.009,.004],[.012,.032,.018],'skinShade',14);
    const sideburn=box(head,'Favori'+side,[side*.17,.023,.074],[.021,.067,.032],'hair',.009);sideburn.rotation.y=side*.60;
    const x=side*.072,y=.039,z=surface(x,y);
    ellipsoid(head,'GozAk'+side,[x,y,z+.003],[.022,.024,.009],'eyeWhite');
    ellipsoid(head,'Goz'+side,[x+side*.001,y-.001,z+.011],[.0135,.0175,.006],'eyes',16);
    ellipsoid(head,'GozIsik'+side,[x-.004,y+.007,z+.016],[.0035,.0045,.002],'eyeWhite',10);
    const brow=[[side*.039,.092],[side*.069,.1],[side*.101,.091]].map(([bx,by])=>[bx,by,surface(bx,by)+.009]);tube(head,'Kas'+side,brow,.008,'hair',12);
    const m=ellipsoid(head,'Biyik'+side,[side*.024,-.069,surface(side*.024,-.069)+.006],[.033,.0105,.011],'hair',16);m.rotation.z=side*-.13;
  }
  ellipsoid(head,'Burun',[0,-.02,surface(0,-.02)+.008],[.037,.028,.028],'skin',24);
  const smile=[[-.038,-.108],[-.018,-.115],[.018,-.115],[.038,-.108]].map(([x,y])=>[x,y,surface(x,y)+.0035]);tube(head,'Gulumseme',smile,.0032,'skinShade',16);
  const helmet=group(head,'Baret',[0,-.03,0]);helmet.scale.set(.95,1,1);
  profile(helmet,'BaretAstar',[[.142,.214,.181],[.155,.217,.185]],'navyDark',40);
  profile(helmet,'BaretKubbe',[[.151,.226,.194],[.184,.233,.2],[.238,.219,.187],[.294,.174,.146],[.337,.105,.085],[.35,.036,.03]],'helmet',40);
  profile(helmet,'BaretKenar',[[.145,.259,.224,.021],[.164,.259,.224,.021]],'helmet',48);
  profile(helmet,'BaretAltSerit',[[.144,.252,.217,.021],[.15,.252,.217,.021]],'helmetDark',48);
  for(const x of [0,-.111,.111]){
    const pts=[],factor=Math.sqrt(1-(x/.24)**2);
    for(let j=0;j<=18;j++){const a=j*Math.PI/18;pts.push([x,.17+Math.sin(a)*.187*factor,Math.cos(a)*.197*factor]);}
    tube(helmet,'BaretKaburga'+x,pts,x===0?.009:.0055,'helmetLight',24);
  }
  const badge=box(helmet,'BaretOnKabartma',[0,.205,.198],[.072,.033,.015],'helmetLight',.006);badge.rotation.x=-.2;
  for(const side of [-1,1])for(const z of [-.055,-.015,.025])box(helmet,'BaretHavalandirma'+side+z,[side*.229,.207,z],[.006,.012,.026],'helmetDark',.002);
  for(const side of [-1,1]){
    const shoulder=group(worker,'Omuz'+side,[side*.287,1.057,-.005]);shoulder.rotation.z=side*.135;shoulder.rotation.x=side===-1?.05:-.08;rig.arms.push(shoulder);
    profile(shoulder,'GomlekKol'+side,[[.024,.061,.067],[-.006,.096,.1],[-.055,.11,.106],[-.149,.096,.091],[-.213,.079,.077]],'navy',28);
    profile(shoulder,'KolKivirma'+side,[[-.181,.094,.09],[-.189,.099,.094],[-.22,.091,.088],[-.226,.08,.079]],'navyLight',28);
    const elbow=group(shoulder,'Dirsek'+side,[0,-.207,0]);elbow.rotation.x=side===-1?-.30:-.85;if(side===1)elbow.rotation.z=-.38;rig.elbows.push(elbow);
    profile(elbow,'OnKol'+side,[[.013,.074,.074],[-.026,.081,.078],[-.095,.073,.07],[-.165,.055,.054],[-.203,.052,.052]],'skin',24);
    const hand=group(elbow,'El'+side,[0,-.212,.006]);hand.rotation.z=side*.055;
    ellipsoid(hand,'Avuc'+side,[0,-.027,.004],[.06,.071,.05],'skinLight');
    ellipsoid(hand,'Parmaklar'+side,[0,-.07,.013],[.054,.031,.045],'skin');
    const thumb=ellipsoid(hand,'BasParmak'+side,[side*-.048,-.02,.039],[.027,.042,.027],'skin');thumb.rotation.z=side*-.35;
    for(const k of [-1,1])tube(hand,'ParmakKivrimi'+side+k,[[k*.016,-.067,.052],[k*.016,-.081,.047]],.0016,'skinShade',4);
    if(side===-1){
      const hammer=group(hand,'Cekic',[-.003,-.04,.014]);hammer.rotation.z=-.26;hammer.rotation.x=.12;
      mesh(hammer,'CekicSap',new THREE.CylinderGeometry(.014,.018,.218,16),'leatherLight',[0,-.092,0]);
      mesh(hammer,'SapTutamak',new THREE.CylinderGeometry(.018,.02,.071,16),'leather',[0,-.02,0]);
      box(hammer,'CekicBas',[0,-.196,0],[.115,.052,.059],'steel',.01);
      const cap=mesh(hammer,'CekicVurmaYuzu',new THREE.CylinderGeometry(.034,.03,.023,20),'steel',[-.067,-.196,0]);cap.rotation.z=Math.PI/2;
      for(const clawSide of [-1,1]){const claw=box(hammer,'CekicTirnak'+clawSide,[.069,-.178,clawSide*.018],[.068,.019,.018],'steelDark',.004);claw.rotation.z=.43;}
    }
    const hip=group(worker,'Kalca'+side,[side*.126,.625,side===-1?.014:-.01]);hip.rotation.y=side*.07;rig.hips.push(hip);
    profile(hip,'UstBacak'+side,[[.03,.101,.119],[0,.119,.127],[-.095,.118,.12],[-.175,.107,.104],[-.245,.1,.096]],'navy',28);
    const knee=group(hip,'Diz'+side,[0,-.233,0]);rig.knees.push(knee);
    profile(knee,'AltBacak'+side,[[.027,.103,.1],[-.01,.1,.096],[-.08,.094,.092],[-.157,.085,.086],[-.198,.083,.085]],'navy',28);
    profile(knee,'Paca'+side,[[-.168,.09,.092],[-.185,.091,.093],[-.207,.087,.09]],'navyLight',28);
    const cargo=group(hip,'KargoCebi'+side,[side*.111,-.087,.002]);cargo.rotation.y=side*Math.PI/2;
    box(cargo,'PantolonCep'+side,[0,0,0],[.11,.104,.025],'navyLight',.012);
    box(cargo,'PantolonCepKapak'+side,[0,.038,.017],[.115,.026,.012],'navy',.006);
    const boot=group(knee,'Bot'+side,[0,-.305,.043]);
    box(boot,'BotGovde'+side,[0,0,.026],[.212,.135,.315],'boots',.039);
    box(boot,'BotTaban'+side,[0,-.061,.027],[.222,.041,.326],'sole',.016);
    profile(boot,'BotBilek'+side,[[.002,.092,.098,-.032],[.087,.087,.09,-.032]],'boots',28);
    box(boot,'BotDil'+side,[0,.052,.055],[.093,.089,.029],'sole',.018);
    for(let k=0;k<3;k++)box(boot,'Bagcik'+side+k,[0,.027+k*.021,.074-k*.003],[.082,.008,.009],'leatherDark',.003);
  }
  worker.userData={kind:'stylized-stocky-worker',units:'meters',source:'procedural-original-v2',rig:'named rigid joints',revision:3};
  return {worker,rig};
}




export { createMaketWorker };

