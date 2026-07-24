import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

//==================Variablen=========================//

//allgemeine variablen
let scene, camera, renderer;
let ambientLight, pointLight;
let width;
let height;
let controls;
let clock;

//pinhole einzelteile
let pinhole;
let back;
let front;
let spool_left;
let spool_right;
let shutter;
let knob_left;
let knob_right;
let pinhole_plate;
let frame_counter;
let gear;

//automatische drehung
let y = 0; // aktuelle Drehung
let ySpeed = 0.15; //Drehgeschwindigkeit

//zerlegung
let disassemblyProgress = 0; // 0 = zusamengebaut, 100 = zerlegt
let animationState = "inRuhe";
const disassemblySpeed = 1;
const animationViewRotation = toRadians(295); //blick von schräg links

// scale sizes (simple constants)
const initialScale = 350;
const targetScale = 250;

//==================Setup=========================//

function setup() {
  clock = new THREE.Clock();
  const canvas = document.querySelector("canvas.webgl");
  width = canvas.clientWidth;
  height = canvas.clientHeight;

  scene = new THREE.Scene();

  initCamera();
  initLight();
  loadObjects();

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true, //transparenter background
    antialias: true, // smoother edges
  });

  renderer.setSize(width, height, false); //false: css wird nicht überschrieben
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  /* 
  renderer.setClearColor(new THREE.Color("rgb(255, 255, 255)")); */

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = Math.PI / 2.5;
  controls.maxPolarAngle = Math.PI / 2.5;

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("click", onClick);

  const resizeObserver = new ResizeObserver(onWindowResize);
  resizeObserver.observe(canvas);
}

//==================Animate=========================//

function animate() {
  requestAnimationFrame(animate);
  let deltaTime = clock.getDelta();

  if (animationState == "inRuhe") {
    y = y + ySpeed * deltaTime;
    pinhole.rotation.y = y;
  }

  /*  if (controls && pinhole) {
    controls.target.copy(pinhole.position);
  } */

  updateDisassembly(deltaTime);
  if (controls) controls.update();
  renderer.render(scene, camera);
}

//================== weitere Funktionen =========================//

function initCamera() {
  camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 100); //hier
  camera.position.x = 5; // a bit to the right
  camera.position.y = 0; // a bit from above
  camera.position.z = 2;
  camera.updateProjectionMatrix();
  scene.add(camera);
}

function initLight() {
  ambientLight = new THREE.AmbientLight("rgb(255, 255, 255)", 0.3);
  scene.add(ambientLight);

  pointLight = new THREE.PointLight("rgb(255, 255, 255)", 35);
  pointLight.position.x = -2;
  pointLight.position.y = 3;
  pointLight.position.z = 2;
  scene.add(pointLight);

  pointLight = new THREE.PointLight("rgb(255, 255, 255)", 35);
  pointLight.position.x = 2;
  pointLight.position.y = 1;
  pointLight.position.z = 8;
  scene.add(pointLight);

  pointLight = new THREE.PointLight("rgb(255, 255, 255)", 35);
  pointLight.position.x = 2;
  pointLight.position.y = 1;
  pointLight.position.z = -8;
  scene.add(pointLight);

  pointLight = new THREE.PointLight("rgb(255, 255, 255)", 35);
  pointLight.position.x = -2;
  pointLight.position.y = 1;
  pointLight.position.z = -8;
  scene.add(pointLight);
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

//==================Pinhole=========================//

function loadObjects() {
  const gltfLoader = new GLTFLoader();
  gltfLoader.load(
    "./models/pinhole/weitwinkelkamera_ganz_repariert_3.glb",
    objectLoaded,
  );
}

function objectLoaded(gltf) {
  pinhole = gltf.scene;
  pinhole.scale.set(initialScale, initialScale, initialScale);
  pinhole.position.y = -1;
  pinhole.position.z = -0.5;
  scene.add(pinhole);

  const box = new THREE.Box3().setFromObject(pinhole);
  const center = new THREE.Vector3();
  box.getCenter(center);
  if (controls) {
    controls.target.copy(center);
    controls.update();
  }

  const parts = [];

  function processPinholeChild(child) {
    if (!child.isMesh) return;
    parts.push(child);
    child.userData.originalPosition = child.position.clone();
    console.log("Part name:", child.name);

    //Belichtung korrigieren
    function fixMaterial(meshMaterial) {
      if (meshMaterial.color) {
        const r = meshMaterial.color.r,
          g = meshMaterial.color.g,
          b = meshMaterial.color.b;
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (luminance > 0.9) {
          console.log(
            "zu hell:",
            child.name,
            "luminance:",
            luminance.toFixed(2),
          );
          meshMaterial.color.multiplyScalar(0.85); // belichtung verringern
        } else if (luminance < 0.08 && !meshMaterial.map) {
          console.log(
            "zu dunkel:",
            child.name,
            "luminance:",
            luminance.toFixed(2),
          );
          meshMaterial.color.lerp(new THREE.Color(0.2, 0.2, 0.2), 0.5); //
        }
      }
      return meshMaterial;
    }

    child.material = fixMaterial(child.material);

    // outline um Parts
    const edges = new THREE.EdgesGeometry(child.geometry, 30);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 1,
    });
    const edgeLines = new THREE.LineSegments(edges, lineMaterial);
    child.add(edgeLines);
  }

  pinhole.traverse(processPinholeChild);
  console.log(parts);

  // --------Access specific part by name-----------//
  back = parts.find((part) => part.name === "back");
  if (back) {
    console.log("Found back part:", back);
  }

  front = parts.find((part) => part.name === "front");
  if (front) {
    console.log("Found front part:", front);
  }

  spool_left = parts.find((part) => part.name === "spool_left");
  if (spool_left) {
    console.log("Found spool_left part:", spool_left);
  }

  spool_right = parts.find((part) => part.name === "spool_right");
  if (spool_right) {
    console.log("Found spool_right part:", spool_right);
  }

  shutter = parts.find((part) => part.name === "shutter");
  if (shutter) {
    console.log("Found shutter part:", shutter);
  }

  knob_left = parts.find((part) => part.name === "knob_left");
  if (knob_left) {
    console.log("Found knob_left part:", knob_left);
  }

  knob_right = parts.find((part) => part.name === "knob_right");
  if (knob_right) {
    console.log("Found knob_right part:", knob_right);
  }

  pinhole_plate = parts.find((part) => part.name === "mesh_0");
  if (pinhole_plate) {
    console.log("Found pinhole_plate part:", pinhole_plate);
  }

  frame_counter = parts.find((part) => part.name === "frame_counter");
  if (frame_counter) {
    console.log("Found frame_counter part:", frame_counter);
  }

  gear = parts.find((part) => part.name === "gear");
  if (gear) {
    console.log("Found gear part:", gear);
  }
}

//==================Zerlegung=========================//

function updateDisassembly(deltaTime) {
  if (!pinhole) return;

  //=========rotation===========//
  if (animationState == "rotating") {
    let rotationDifference = animationViewRotation - pinhole.rotation.y;
    while (rotationDifference > toRadians(180))
      rotationDifference -= toRadians(360);
    while (rotationDifference < toRadians(-180))
      rotationDifference += toRadians(360);

    if (Math.abs(rotationDifference) < 0.01) {
      pinhole.rotation.y = animationViewRotation;
      if (disassemblyProgress === 0) {
        animationState = "disassembling";
      } else {
        animationState = "assembling";
      }
    } else {
      pinhole.rotation.y += rotationDifference * 2 * deltaTime;
    }
  }

  //=========disassembling===========//
  else if (animationState == "disassembling") {
    // First scale down smoothly before any parts move
    const currentScale = pinhole.scale.x;
    if (currentScale > targetScale + 0.5) {
      const next =
        currentScale + (targetScale - currentScale) * Math.min(1, deltaTime * 6);
      pinhole.scale.set(next, next, next);
    } else {
      // Now proceed with disassembly movement
      disassemblyProgress = Math.min(
        100,
        disassemblyProgress + disassemblySpeed,
      );
      // Ensure exact target scale when movement starts
      pinhole.scale.set(targetScale, targetScale, targetScale);
    }
    if (disassemblyProgress >= 100) {
      animationState = "inRuhe";
      y = pinhole.rotation.y;
    }
  }

  //=========assembling===========//
  else if (animationState == "assembling") {
    // First finish part assembly; then scale up smoothly back to initialScale
    if (disassemblyProgress > 0) {
      disassemblyProgress = Math.max(0, disassemblyProgress - disassemblySpeed);
    } else {
      const currentScale = pinhole.scale.x;
      if (currentScale < initialScale - 0.5) {
        const next =
          currentScale + (initialScale - currentScale) * Math.min(1, deltaTime * 6);
        pinhole.scale.set(next, next, next);
      } else {
        // Upscaling finished; return to idle
        pinhole.scale.set(initialScale, initialScale, initialScale);
        animationState = "inRuhe";
        y = pinhole.rotation.y;
      }
    }
  }
  // --------Access specific part by name-----------//
  // Helper function: smooth step interpolation for each part
  // partProgress goes from 0 to 1 based on when the part should move
  function getPartProgress(startAt, endAt) {
    if (disassemblyProgress <= startAt) return 0;
    if (disassemblyProgress >= endAt) return 1;
    return (disassemblyProgress - startAt) / (endAt - startAt);
  }

  if (back && back.userData.originalPosition) {
    const progress = getPartProgress(0, 36);
    back.position.z = back.userData.originalPosition.z - progress * 0.01;
  }

  if (spool_left && spool_left.userData.originalPosition) {
    const progress = getPartProgress(14, 50);
    spool_left.position.y =
      spool_left.userData.originalPosition.y + progress * 0.008;
  }

  if (spool_right && spool_right.userData.originalPosition) {
    const progress = getPartProgress(14, 50);
    spool_right.position.y =
      spool_right.userData.originalPosition.y + progress * 0.008;
  }

  if (knob_left && knob_left.userData.originalPosition) {
    const progress1 = getPartProgress(15, 50);
    const progress2 = getPartProgress(50, 70);
    knob_left.position.y =
      knob_left.userData.originalPosition.y +
      progress1 * 0.008 +
      progress2 * 0.0013;
  }

  if (knob_right && knob_right.userData.originalPosition) {
    const progress1 = getPartProgress(15, 50);
    const progress2 = getPartProgress(50, 70);
    knob_right.position.y =
      knob_right.userData.originalPosition.y +
      progress1 * 0.008 +
      progress2 * 0.0013;
  }

  if (shutter && shutter.userData.originalPosition) {
    const progress = getPartProgress(35, 65);
    shutter.position.y = shutter.userData.originalPosition.y + progress * 0.006;
  }

  if (pinhole_plate && pinhole_plate.userData.originalPosition) {
    const progress = getPartProgress(60, 100);
    pinhole_plate.position.z =
      pinhole_plate.userData.originalPosition.z - progress * 0.005;
  }

  if (frame_counter && frame_counter.userData.originalPosition) {
    const progress = getPartProgress(60, 100);
    frame_counter.position.z =
      frame_counter.userData.originalPosition.z - progress * 0.004;
  }

  if (gear && gear.userData.originalPosition) {
    const progress = getPartProgress(60, 80);
    gear.position.y = gear.userData.originalPosition.y + progress * 0.0008;
  }

  if (gear && gear.userData.originalPosition) {
    const progress = getPartProgress(80, 100);
    gear.position.z = gear.userData.originalPosition.z - progress * 0.004;
  }
}

//==================Callbacks=========================//

//resize
function onWindowResize() {
  const canvas = renderer.domElement;
  //maße des canvas auf dem display
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  // Only update if size actually changed
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    renderer.setSize(displayWidth, displayHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
    camera.aspect = displayWidth / displayHeight;
    camera.updateProjectionMatrix();
  }
}

//tastatur
function onKeyDown(event) {
  if (event.key == "e" || event.key == "E") {
    if (animationState == "inRuhe") {
      animationState = "rotating";
    }
  }
}
function onClick() {
  if (animationState == "inRuhe") {
    animationState = "rotating";
  }
}

//==================Initiale Funktionen aufrufen=========================//
setup();
animate();
