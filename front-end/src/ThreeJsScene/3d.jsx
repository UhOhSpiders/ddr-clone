import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { fallTime } from "../constants/constants";
import { loadCharacter } from "../utilities/loadCharacter";
import { loadDanceMoves } from "../utilities/loadDanceMoves";
import { createNoteTargets } from "../utilities/createNoteTargets";
import { assignNotesToColums } from "../utilities/assignNotesToColumns";
import { getColumnXPositions } from "../utilities/getColumnXPositions";

let camera, scene, renderer, mixer, clock, light;
let noteBlockGeometry,
  noteBlockMaterial,
  noteBlockPlayedMaterial,
  noteBlockMissedMaterial,
  noteBlockMesh;
let fallingGroup, danceMoves;

const targetYPosition = -0.25;
const noteDropperWidth = 0.7;
const noteDropperKeys = ["KeyA", "KeyS", "KeyD", "KeyF","KeyG","KeyH","KeyJ"];
const columnXPositions = getColumnXPositions(
  noteDropperWidth,
  noteDropperKeys.length
);
let noteColumns = assignNotesToColums(columnXPositions, noteDropperKeys);

init();
let KeyWNotesToHit = [];

let notesToHit = noteDropperKeys.reduce(
  (acc, curr) => ((acc[curr] = []), acc),
  {}
);
// ^^^^ creates an object with keyEvents from noteDropperKeys array (line 20) as the object's keys. The values are empty arrays so notes can be pushed to them as they're created. This allows for dynamic handling of hits and misses given a noteDropperKeys array of any length.

const input = document.querySelector("body");
input.addEventListener("keydown", hitKey);

function init() {
  camera = new THREE.PerspectiveCamera(42, 1, 0.01, 10);
  camera.position.z = 1;

  scene = new THREE.Scene();

  noteBlockGeometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
  noteBlockMaterial = new THREE.MeshBasicMaterial({ color: "red" });
  noteBlockPlayedMaterial = new THREE.MeshBasicMaterial({ color: "green" });
  noteBlockMissedMaterial = new THREE.MeshBasicMaterial({ color: "grey" });
  noteBlockMesh = new THREE.Mesh(noteBlockGeometry, noteBlockMaterial);
  fallingGroup = new THREE.Group();

  scene.add(fallingGroup);

  let noteDropper = createNoteTargets(
    targetYPosition,
    columnXPositions,
    noteDropperWidth,
    noteDropperKeys
  );
  scene.add(noteDropper);

  light = new THREE.PointLight(0x404040, 400);
  scene.add(light);
  mixer = new THREE.AnimationMixer(scene);
  clock = new THREE.Clock();
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setAnimationLoop(animation);
  loadCharacter("/ddrman.gltf", scene, mixer).then(() => {
    danceMoves = loadDanceMoves("ddrman", scene, mixer);
  });
}

export function addCube(noteName, noteTime) {
  let newNoteBlock = noteBlockMesh.clone();
  let Xposition = noteColumns[noteName][0];
  let Yposition = 0.4;
  newNoteBlock.position.set(Xposition, Yposition, 0);
  newNoteBlock.name = noteName + noteTime;
  newNoteBlock.timeCreated = clock.elapsedTime;
  fallingGroup.add(newNoteBlock);
  KeyWNotesToHit.push(newNoteBlock.name);
  notesToHit[noteColumns[noteName][1]].push(newNoteBlock.name);

  console.log(notesToHit);
  // animate fall
  const targetPosition = new THREE.Vector3(Xposition, targetYPosition, 0);
  // for smooth exit the y coordinate of the exit position must be the same distance from the target as the note's initial position, this allows two tweens to chain together and look like 1 smooth motion while still having an exact target halfway through
  const exitPosition = new THREE.Vector3(
    Xposition,
    targetYPosition - (Yposition - targetYPosition),
    0
  );
  const fallTween = new TWEEN.Tween(newNoteBlock.position)
    .to(targetPosition, fallTime * 1000)
    .onUpdate(function (newPostion) {
      newNoteBlock.position.set(newPostion.x, newPostion.y, newPostion.z);
    });
  const exitTween = new TWEEN.Tween(newNoteBlock.position)
    .to(exitPosition, fallTime * 1000)
    .onUpdate(function (newPostion) {
      newNoteBlock.position.set(newPostion.x, newPostion.y, newPostion.z);
    });
  fallTween.chain(exitTween);
  fallTween.start();
}

export function dance(noteName) {
  if (noteName.includes("#") || noteName.includes("A")) {
    danceMoves[1].stop();
    danceMoves[1].play();
  } else {
    danceMoves[0].stop();
    danceMoves[0].play();
  }
}

export function playNote(noteName, noteTime) {
  let objectName = noteName + noteTime;
}

function hitKey(e) {
  if (notesToHit[e.code].length) {
    let noteAttempt = scene.getObjectByName(notesToHit[e.code][0]);
    let noteAttemptWorldPosition = noteAttempt.getWorldPosition(
      new THREE.Vector3()
    );
    if (
      noteAttemptWorldPosition.y < targetYPosition + 0.07 &&
      noteAttemptWorldPosition.y > targetYPosition - 0.07
    ) {
      noteAttempt.material = noteBlockPlayedMaterial;
      console.log(
        "hit!" + notesToHit[e.code][0] + "at" + noteAttemptWorldPosition.y
      );
      dance(KeyWNotesToHit[0]);
      notesToHit[e.code] = notesToHit[e.code].filter((e) => e !== noteAttempt.name);
    } else {
      console.log("miss!");
      noteAttempt.material = noteBlockMissedMaterial;
      notesToHit[e.code] = notesToHit[e.code].filter((e) => e !== noteAttempt.name);
    }
  }
}

export function deleteNote(noteName) {
  // might need to find anotherway to delete notes from the noteToHit object that doesn't involve looping through the whole object every time. if there's loads of notes on screen this could be slow
  for (const key in notesToHit) {
    const array = notesToHit[key];
    const index = array.indexOf(noteName);
    if (index !== -1) {
      array.splice(index, 1);
      return
    }
  }
  KeyWNotesToHit = KeyWNotesToHit.filter((e) => e !== noteName);
  fallingGroup.children.shift();
}

function animation(time) {
  // do not render if not in DOM:

  if (!renderer.domElement.parentNode) return;
  let delta = clock.getDelta();
  TWEEN.update();
  mixer.update(delta);
  renderer.render(scene, camera);
}

// respond to size changes:

function resize() {
  const container = renderer.domElement.parentNode;

  if (container) {
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    renderer.setSize(width, height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

window.addEventListener("resize", resize);

resize();

// expose a function to interact with react.js:

export default function mount(container) {
  if (container) {
    container.insertBefore(renderer.domElement, container.firstChild);
    resize();
  } else {
    renderer.domElement.remove();
  }
}
