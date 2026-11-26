// The styled (toon) look shared by the player pages: MToon with matcap highlights and an outline.
import * as THREE from 'three'
import { MToonMaterial } from '@pixiv/three-vrm'

export function toonify(vrm, q) {
  const paint=q.get('style')==='paint'; const shade=+(q.get('toony')||(paint?0.42:0.75))
  // Matcaps: a picture of how a shiny sphere looks; MToon adds it on top, which gives anime highlights.
  function matcap(kind){ const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,256,256)
    if(kind==='hair'){ // the anime "angel ring": a bright band across the upper part
      for(let i=0;i<40;i++){ g.strokeStyle='rgba(255,236,220,'+(0.018*(40-i)/40)+')'; g.lineWidth=8+i*1.2; g.beginPath(); g.ellipse(128,150,104,62,0,Math.PI*1.08,Math.PI*1.92); g.stroke() }
    } else if(kind==='skin'){ const r=g.createRadialGradient(96,84,4,128,128,128); r.addColorStop(0,'rgba(255,230,215,0.22)'); r.addColorStop(0.5,'rgba(255,210,190,0.05)'); r.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=r; g.fillRect(0,0,256,256)
    } else if(kind==='cloth'){ const r=g.createRadialGradient(100,90,4,128,128,128); r.addColorStop(0,'rgba(255,255,255,0.12)'); r.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=r; g.fillRect(0,0,256,256)
    } else { const r=g.createRadialGradient(90,80,2,90,80,40); r.addColorStop(0,'rgba(255,255,255,0.9)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,256,256) }
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t }
  const MC={hair:matcap('hair'),skin:matcap('skin'),cloth:matcap('cloth'),eye:matcap('eye')}
  vrm.scene.traverse(o=>{
    if(!o.isMesh) return
    const old=o.material, name=(old.name||'').toLowerCase()
    const hair=/long|hair|braid|bob|pony/.test(name), cut=old.alphaTest>0||old.transparent||/eyebrow|eyelash/.test(name)
    const skin=/body|human\.body/.test(name)
    const m=new MToonMaterial({
      map:old.map, color:new THREE.Color(1,1,1), transparent:false, alphaTest: cut?0.5:0,
      shadeColorFactor: skin? (paint? new THREE.Color(0.80,0.55,0.50): new THREE.Color(0.86,0.62,0.56)): hair? new THREE.Color(0.55,0.5,0.5): new THREE.Color(0.62,0.58,0.62),
      shadeMultiplyTexture: old.map,
      shadingShiftFactor: skin? -0.05: -0.1, shadingToonyFactor: shade,
      giEqualizationFactor: 0.6,
      parametricRimColorFactor: hair? new THREE.Color(0.06,0.04,0.03): new THREE.Color(skin?0.35:0.25, skin?0.22:0.2, skin?0.2:0.22), parametricRimFresnelPowerFactor: 4, parametricRimLiftFactor: 0.05,
      side: cut? THREE.DoubleSide: THREE.FrontSide,
      matcapTexture: hair? MC.hair: skin? MC.skin: /low-poly/.test(name)? MC.eye: MC.cloth,
      matcapFactor: new THREE.Color(1,1,1),
    })
    m.name=old.name
    if(/teeth/.test(name)){ m.color=new THREE.Color(1.25,1.22,1.18); m.shadeColorFactor=new THREE.Color(0.92,0.88,0.86); m.matcapTexture=null }
    if(cut){ m.alphaTest=0.5; m.uniforms.alphaTest.value=0.5 }
    o.material=m
    // Anime outline: the same skinned surface, pushed out along its normals and drawn back-faces only.
    if(!cut && !/low-poly|teeth|tongue/.test(name)){
      const om=new THREE.MeshBasicMaterial({color: skin?(paint?0x8a5444:0x6b3a2c):0x2a2024, side:THREE.BackSide})
      const width=+(q.get('ow')||(paint?0.0008:0.0016))
      om.onBeforeCompile=sh=>{ sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed += normalize(objectNormal) * '+width.toFixed(5)+';') }
      const ol=o.isSkinnedMesh? new THREE.SkinnedMesh(o.geometry,om): new THREE.Mesh(o.geometry,om)
      if(o.isSkinnedMesh) ol.bind(o.skeleton,o.bindMatrix)
      ol.morphTargetInfluences=o.morphTargetInfluences; ol.morphTargetDictionary=o.morphTargetDictionary
      ol.frustumCulled=false; o.parent.add(ol); ol.position.copy(o.position); ol.quaternion.copy(o.quaternion); ol.scale.copy(o.scale)
    }
  })
}
