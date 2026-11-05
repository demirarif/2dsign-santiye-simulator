function createWorkerAnimator(THREE,built){
  const {worker,rig}=built;
  const upper=new THREE.Group();upper.name='UstGovdeHareketi';upper.position.y=.72;worker.add(upper);
  worker.updateMatrixWorld(true);
  for(const part of [...worker.children])if(part!==upper&&!rig.hips.includes(part))upper.attach(part);
  const feet=[];
  for(let i=0;i<2;i++){
    const side=i===0?-1:1,knee=rig.knees[i],boot=worker.getObjectByName('Bot'+side);
    const ankle=new THREE.Group();ankle.name='AyakBilegi'+side;ankle.position.y=-.195;knee.add(ankle);ankle.attach(boot);feet.push(ankle);
  }
  const head=worker.getObjectByName('Bas');
  const armBase=rig.arms.map(a=>a.rotation.clone()),elbowBase=rig.elbows.map(a=>a.rotation.clone());
  const cycleDistance=.29/.62,upperLength=.233,lowerLength=.195;
  function pose(phase,speed,time){
    const weight=THREE.MathUtils.smoothstep(speed,0,.24),wave=phase*Math.PI*2;
    worker.position.y=-.0055+weight*(-.038+.007*Math.cos(wave*2));
    upper.rotation.set(weight*.045,weight*.027*Math.sin(wave),weight*.018*Math.sin(wave));
    head.rotation.y=(1-weight)*.13*Math.sin(time*.9)+weight*.025*Math.sin(wave);
    head.rotation.x=(1-weight)*.012*Math.sin(time*1.7);
    for(let i=0;i<2;i++){
      const side=i===0?-1:1,step=(phase+i*.5)%1;
      let footZ,lift=0;
      if(step<.62)footZ=.145*(1-2*step/.62);
      else{
        const u=(step-.62)/.38,ease=u*u*(3-2*u);
        footZ=THREE.MathUtils.lerp(-.145,.145,ease);lift=.082*Math.pow(Math.sin(Math.PI*u),1.4);
      }
      footZ*=weight;lift*=weight;
      const dy=.1915+lift-(worker.position.y+.625),dz=footZ;
      const distance=THREE.MathUtils.clamp(Math.hypot(dy,dz),.08,upperLength+lowerLength-.00001);
      const base=-Math.atan2(dz,-dy);
      const alpha=Math.acos(THREE.MathUtils.clamp((upperLength**2+distance**2-lowerLength**2)/(2*upperLength*distance),-1,1));
      const kneeAngle=Math.acos(THREE.MathUtils.clamp((distance**2-upperLength**2-lowerLength**2)/(2*upperLength*lowerLength),-1,1));
      rig.hips[i].rotation.x=base-alpha;
      rig.hips[i].rotation.y=side*.07*(1-weight);
      rig.knees[i].rotation.x=kneeAngle;
      feet[i].rotation.x=-rig.hips[i].rotation.x-kneeAngle;
      feet[i].rotation.y=side*.07*weight;
      const swing=Math.cos(wave+i*Math.PI)*(i===0?.24:.36);
      rig.arms[i].rotation.x=THREE.MathUtils.lerp(armBase[i].x,swing,weight);
      rig.arms[i].rotation.z=THREE.MathUtils.lerp(armBase[i].z,side*.09,weight);
      rig.elbows[i].rotation.x=THREE.MathUtils.lerp(elbowBase[i].x,-.23-.06*Math.sin(wave+i*Math.PI),weight);
      rig.elbows[i].rotation.z=elbowBase[i].z*(1-weight);
    }
  }
  pose(0,0,0);
  return {pose,feet,cycleDistance};
}

export { createWorkerAnimator };

