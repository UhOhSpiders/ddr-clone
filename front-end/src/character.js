import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";
import { assignDanceMovesToNotes } from "./utilities/assignDanceMovesToNotes";

export default class Character {
  constructor(loadedGltf, gltfName, position, scene, animationMixer) {
    this.loadedGltf = loadedGltf;
    this.gltfName = gltfName;
    this.position = position;
    this.scene = scene;
    this.animationMixer = animationMixer;
    this.danceMoves = [];
  }
  create() {
    return new Promise((resolve) => {
      let character = this.loadedGltf.scene.getObjectByName(
        `${this.gltfName}_character`
      );
      character.animations = this.loadedGltf.animations;
      character.position.set(this.position.x, this.position.y, this.position.z);
      const idleClip = THREE.AnimationClip.findByName(
        this.loadedGltf.animations,
        "idle"
      );
      const idleAction = this.animationMixer.clipAction(idleClip);
      idleAction.loop = THREE.LoopPingPong;
      this.scene.add(character);
      idleAction.play();
      resolve();
    }, undefined);
  }
  createDanceMoves(noteColumns) {
    this.danceMoves = assignDanceMovesToNotes(
      this.gltfName,
      this.scene,
      this.animationMixer,
      noteColumns
    );
  }
  dance(notePitch, isHit) {
    if (isHit) {
      let danceMove = this.danceMoves[notePitch].danceMove;
      danceMove.stop();
      danceMove.play();
    } else {
      // play stumble animation
    }
  }
}
