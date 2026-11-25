// Retarget Quaternius Universal Animation Library clips (CC0, UE-style rig) onto a VRM's normalized
// humanoid bones. Same method as three-vrm's Mixamo example: each source rotation is moved into
// world-aligned space using the source rig's rest pose, which is what VRM normalized bones expect.
import * as THREE from 'three'
export const UAL_TO_VRM = {
  pelvis: 'hips', spine_01: 'spine', spine_02: 'chest', spine_03: 'upperChest', neck_01: 'neck', Head: 'head',
  clavicle_l: 'leftShoulder', upperarm_l: 'leftUpperArm', lowerarm_l: 'leftLowerArm', hand_l: 'leftHand',
  clavicle_r: 'rightShoulder', upperarm_r: 'rightUpperArm', lowerarm_r: 'rightLowerArm', hand_r: 'rightHand',
  thigh_l: 'leftUpperLeg', calf_l: 'leftLowerLeg', foot_l: 'leftFoot', ball_l: 'leftToes',
  thigh_r: 'rightUpperLeg', calf_r: 'rightLowerLeg', foot_r: 'rightFoot', ball_r: 'rightToes',
  thumb_01_l: 'leftThumbMetacarpal', thumb_02_l: 'leftThumbProximal', thumb_03_l: 'leftThumbDistal',
  index_01_l: 'leftIndexProximal', index_02_l: 'leftIndexIntermediate', index_03_l: 'leftIndexDistal',
  middle_01_l: 'leftMiddleProximal', middle_02_l: 'leftMiddleIntermediate', middle_03_l: 'leftMiddleDistal',
  ring_01_l: 'leftRingProximal', ring_02_l: 'leftRingIntermediate', ring_03_l: 'leftRingDistal',
  pinky_01_l: 'leftLittleProximal', pinky_02_l: 'leftLittleIntermediate', pinky_03_l: 'leftLittleDistal',
  thumb_01_r: 'rightThumbMetacarpal', thumb_02_r: 'rightThumbProximal', thumb_03_r: 'rightThumbDistal',
  index_01_r: 'rightIndexProximal', index_02_r: 'rightIndexIntermediate', index_03_r: 'rightIndexDistal',
  middle_01_r: 'rightMiddleProximal', middle_02_r: 'rightMiddleIntermediate', middle_03_r: 'rightMiddleDistal',
  ring_01_r: 'rightRingProximal', ring_02_r: 'rightRingIntermediate', ring_03_r: 'rightRingDistal',
  pinky_01_r: 'rightLittleProximal', pinky_02_r: 'rightLittleIntermediate', pinky_03_r: 'rightLittleDistal',
}

/** gltf: the loaded UAL file. Returns {name: THREE.AnimationClip} for this vrm. */
export function retargetUAL(gltf, vrm, names) {
  const src = gltf.scene
  src.updateMatrixWorld(true)
  const out = {}
  const srcHips = src.getObjectByName('pelvis')
  const srcHipsY = srcHips.getWorldPosition(new THREE.Vector3()).y
  const vrmHipsY = vrm.humanoid.normalizedRestPose.hips.position[1]
  const scale = vrmHipsY / srcHipsY
  const q = new THREE.Quaternion(), restInv = new THREE.Quaternion(), parentRest = new THREE.Quaternion(), v = new THREE.Vector3()
  for (const clip of gltf.animations) {
    if (names && !names.includes(clip.name)) continue
    const tracks = []
    for (const track of clip.tracks) {
      const [nodeName, prop] = track.name.split('.')
      const vrmBone = UAL_TO_VRM[nodeName]
      const node = vrmBone && vrm.humanoid.getNormalizedBoneNode(vrmBone)
      const srcNode = src.getObjectByName(nodeName)
      if (!node || !srcNode) continue
      srcNode.getWorldQuaternion(restInv).invert()
      srcNode.parent.getWorldQuaternion(parentRest)
      if (prop === 'quaternion') {
        const values = track.values.slice()
        for (let i = 0; i < values.length; i += 4) {
          q.fromArray(values, i)
          q.premultiply(parentRest).multiply(restInv)
          q.toArray(values, i)
        }
        tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, track.times, values))
      } else if (prop === 'position' && vrmBone === 'hips') {
        const values = track.values.slice()
        for (let i = 0; i < values.length; i += 3) {
          v.fromArray(values, i).applyQuaternion(parentRest).multiplyScalar(scale)
          // keep the walk in place on x/z here (the scene moves the teacher), keep the bounce on y
          v.toArray(values, i)
        }
        tracks.push(new THREE.VectorKeyframeTrack(`${node.name}.position`, track.times, values))
      }
    }
    out[clip.name] = new THREE.AnimationClip(clip.name, clip.duration, tracks)
  }
  return out
}
