const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const preview = 'C:/Users/arifdemir/.codex/visualizations/2026/11/02/01a19bd1-93aa-7fd0-bbae-c18ed66d5833/maket-usta-360.html';
const html = fs.readFileSync(preview, 'utf8');
const start = html.indexOf('function createMaketWorker(THREE)');
const end = html.indexOf('(function(){', start);
if (start < 0 || end < 0) throw new Error('Model builder missing');
const source = html.slice(start, end);
fs.writeFileSync(path.join(__dirname,'create-worker.js'),source+'\n');
const context = {console:{log(){},warn(){},error(){}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'three-0.160.1.min.js'),'utf8'),context);
const THREE = context.THREE;
const build = vm.runInContext('('+source+')',context);
const {worker} = build(THREE);
worker.updateMatrixWorld(true);
const gltf = {asset:{version:'2.0',generator:'Original procedural maket worker'},scene:0,scenes:[{nodes:[0]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[]};
const chunks=[];
let offset=0,triangleCount=0;
const materials = new Map();
function align4(n){return (n+3)&~3;}
function attribute(attr,target,positions=false){
  const array = new Float32Array(attr.count*attr.itemSize);
  for(let i=0;i<attr.count;i++)for(let j=0;j<attr.itemSize;j++){
    const value=attr.array[i*attr.itemSize+j];if(!Number.isFinite(value))throw new Error('Invalid geometry');array[i*attr.itemSize+j]=value;
  }
  const data=Buffer.from(array.buffer);
  const view=gltf.bufferViews.length;
  gltf.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,target});
  chunks.push(data);offset+=data.length;
  const padding=align4(offset)-offset;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}
  const accessor={bufferView:view,componentType:5126,count:attr.count,type:attr.itemSize===3?'VEC3':'VEC2'};
  if(positions){accessor.min=[Infinity,Infinity,Infinity];accessor.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<attr.count;i++)for(let j=0;j<3;j++){const v=array[i*3+j];accessor.min[j]=Math.min(accessor.min[j],v);accessor.max[j]=Math.max(accessor.max[j],v);}}
  gltf.accessors.push(accessor);return gltf.accessors.length-1;
}
function material(m){
  if(materials.has(m))return materials.get(m);
  const index=gltf.materials.length;materials.set(m,index);
  gltf.materials.push({name:m.name,pbrMetallicRoughness:{baseColorFactor:[m.color.r,m.color.g,m.color.b,1],metallicFactor:m.metalness,roughnessFactor:m.roughness}});
  return index;
}
function node(object){
  const index=gltf.nodes.length;
  const out={name:object.name,translation:object.position.toArray(),rotation:object.quaternion.toArray(),scale:object.scale.toArray()};
  gltf.nodes.push(out);
  if(object.isMesh){
    const geo=object.geometry.index?object.geometry.toNonIndexed():object.geometry;
    const p=attribute(geo.attributes.position,34962,true),n=attribute(geo.attributes.normal,34962);
    triangleCount+=geo.attributes.position.count/3;
    out.mesh=gltf.meshes.length;
    gltf.meshes.push({name:object.name,primitives:[{attributes:{POSITION:p,NORMAL:n},material:material(object.material),mode:4}]});
  }
  if(object.children.length)out.children=object.children.map(node);
  return index;
}
node(worker);
const binary=Buffer.concat(chunks);
gltf.buffers.push({byteLength:binary.length});
const json=Buffer.from(JSON.stringify(gltf));
const jsonPadded=Buffer.concat([json,Buffer.alloc(align4(json.length)-json.length,0x20)]);
const binPadded=Buffer.concat([binary,Buffer.alloc(align4(binary.length)-binary.length)]);
const header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+jsonPadded.length+8+binPadded.length,8);
const jhead=Buffer.alloc(8);jhead.writeUInt32LE(jsonPadded.length,0);jhead.writeUInt32LE(0x4e4f534a,4);
const bhead=Buffer.alloc(8);bhead.writeUInt32LE(binPadded.length,0);bhead.writeUInt32LE(0x004e4942,4);
fs.writeFileSync(path.join(__dirname,'maket-usta.glb'),Buffer.concat([header,jhead,jsonPadded,bhead,binPadded]));
fs.writeFileSync(path.join(__dirname,'maket-usta.three.json'),JSON.stringify(worker.toJSON()));
const bounds=new THREE.Box3().setFromObject(worker);
const result={meshes:gltf.meshes.length,triangles:triangleCount,materials:gltf.materials.length,dimensions:bounds.getSize(new THREE.Vector3()).toArray(),glbBytes:fs.statSync(path.join(__dirname,'maket-usta.glb')).size};
fs.writeFileSync(path.join(__dirname,'model-info.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
