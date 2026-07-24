import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

//allgemeine variablen
let scene, camera, renderer;
let ambientLight, pointLight;
let width;
let height;
let controls;
let clock;

//pinhole teile
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

//variablen für automatische drehung
let y = 0;
let ySpeed = 0.2;

// Disassembly animation
let disassemblyProgress = 0; // 0 = assembled, 100 = fully disassembled
const disassemblySpeed = 1.5; // units per frame when arrow key pressed

function setup() {
  clock = new THREE.Clock();
  const canvas = document.querySelector("canvas.webgl");

  //werte vom canvas holen
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;

  scene = new THREE.Scene();

  // Camera
  initCamera();

  // Licht
  initLight();

  loadObjects();

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    //transparenter background
    alpha: true,
  });
  //false: css wird nicht überschrieben
  renderer.setSize(3 * width, 3 * height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  /* 
  renderer.setClearColor(new THREE.Color("rgb(255, 255, 255)")); */

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  //orbit controls angle limits - allow viewing from above
  controls.minPolarAngle = Math.PI / 3; // 60 degrees (can look from above)
  controls.maxPolarAngle = Math.PI / 3; // 90 degrees (horizontal limit)
  // Eventlisteners hinzufügen
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("keydown", onKeyDown);
}

function animate() {
  requestAnimationFrame(animate);
  let deltaTime = clock.getDelta();

  // automatische drehung um eigene y achse
  y = y + ySpeed * deltaTime;
  if (y > 4) {
    ySpeed *= 1;
  }
  pinhole.rotation.y = y;

  // Update disassembly positions
  updateDisassembly();

  if (controls) controls.update();
  renderer.render(scene, camera);
}

function initCamera() {
  const aspectRatio = width / height;
  console.log("Camera aspect:", aspectRatio, "Canvas:", width, "x", height);
  camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.01, 100);
  camera.position.x = 5; // a bit to the right
  camera.position.y = 4; // a bit from above
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

function loadObjects() {
  const gltfLoader = new GLTFLoader();
  //gltfLoader.load('/models/Duck/glTF/Duck.gltf', objectLoaded);
  //gltfLoader.load("./models/pinhole/weitwinkelkamera_ganz.glb", objectLoaded);
  gltfLoader.load(
    "./models/pinhole/weitwinkelkamera_ganz_repariert_3.glb",
    objectLoaded,
  );
}

function objectLoaded(gltf) {
  pinhole = gltf.scene;
  //duck.scale.set(0.5, 0.5, 0.5);
  pinhole.scale.set(250, 250, 250);
  //duck.rotation.y = toRadians(-130);
  /*   pinhole.position.x = -1; */
  pinhole.position.y = -1;
  pinhole.position.z = -0.5;
  /*pinhole.position.x = 20;
  pinhole.position.y = 0;
  pinhole.position.z = 0; */
  scene.add(pinhole);

  // Set OrbitControls target to the model's center for proper orbit
  const box = new THREE.Box3().setFromObject(pinhole);
  const center = new THREE.Vector3();
  box.getCenter(center);
  if (controls) {
    controls.target.copy(center);
    controls.update();
  }

  const parts = [];
  pinhole.traverse((child) => {
    if (child.isMesh) {
      parts.push(child);
      child.userData.originalPosition = child.position.clone();
      console.log("Part name:", child.name); // Log all part names

      //copilot
      // Diagnose and tame extreme material brightness/darkness
      const fixMaterial = (m) => {
        if (!m) return m;
        // Zero emissive to avoid unintended glow
        if (m.emissive) {
          m.emissive.set(0x000000);
          if (m.emissiveIntensity !== undefined) m.emissiveIntensity = 0;
        }
        if (m.color) {
          const r = m.color.r,
            g = m.color.g,
            b = m.color.b;
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (lum > 0.9) {
            console.log(
              "White-ish material on:",
              child.name,
              "lum:",
              lum.toFixed(2),
            );
            // Soften very bright whites
            m.color.multiplyScalar(0.85);
            if (m.roughness !== undefined)
              m.roughness = Math.max(0.6, m.roughness);
            if (m.metalness !== undefined)
              m.metalness = Math.min(0.2, m.metalness ?? 0.0);
          } else if (lum < 0.08 && !m.map) {
            // Lift extremely dark albedos without textures
            m.color.lerp(new THREE.Color(0.2, 0.2, 0.2), 0.5);
            if (m.roughness !== undefined && m.roughness < 0.5)
              m.roughness = 0.6;
          }
        }
        // Encourage reasonable defaults for PBR if present
        if (
          m.roughness !== undefined &&
          (m.roughness < 0.2 || m.roughness > 1.0)
        )
          m.roughness = 0.6;
        if (m.metalness !== undefined && m.metalness > 0.8) m.metalness = 0.2;
        return m;
      };

      if (Array.isArray(child.material)) {
        child.material = child.material.map(fixMaterial);
      } else {
        child.material = fixMaterial(child.material);
      }

      child.castShadow = true;
      child.receiveShadow = true;

      // Add edge outline
      const edges = new THREE.EdgesGeometry(child.geometry, 30); // 30° threshold for edges
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x000000,
        linewidth: 1,
      });
      const edgeLines = new THREE.LineSegments(edges, lineMaterial);
      child.add(edgeLines);
      //copilot
    }
  });
  console.log(parts);

  // --------Access specific part by name-----------
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

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Update part positions based on disassembly progress
function updateDisassembly() {
  if (!pinhole) return;

  // Helper function: smooth step interpolation for each part
  // partProgress goes from 0 to 1 based on when the part should move
  function getPartProgress(startAt, endAt) {
    if (disassemblyProgress <= startAt) return 0;
    if (disassemblyProgress >= endAt) return 1;
    return (disassemblyProgress - startAt) / (endAt - startAt);
  }

  // Stage 1: Back moves backward (Z-axis) - starts immediately
  if (back && back.userData.originalPosition) {
    const progress = getPartProgress(0, 36); // scaled to fill 0-100 timeline
    back.position.z = back.userData.originalPosition.z - progress * 0.01;
  }

  // Stage 2: Spools move up (Y-axis) - starts when back is halfway
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

  // Stage 3: Knobs move same as spools (Y-axis), then continue a bit further
  if (knob_left && knob_left.userData.originalPosition) {
    const progress1 = getPartProgress(15, 50);
    const progress2 = getPartProgress(50, 70);
    knob_left.position.y =
      knob_left.userData.originalPosition.y + progress1 * 0.008 + progress2 * 0.0015;
  }
  if (knob_right && knob_right.userData.originalPosition) {
    const progress1 = getPartProgress(15, 50);
    const progress2 = getPartProgress(50, 70);
    knob_right.position.y =
      knob_right.userData.originalPosition.y + progress1 * 0.008 + progress2 * 0.0015;
  }

  // Stage 4: Front moves forward (Z-axis)
  /*  if (front && front.userData.originalPosition) {
    const progress = getPartProgress(40, 65);
    front.position.z = front.userData.originalPosition.z + progress * 0.02;
  } */

  // Stage 5: Shutter moves up
  if (shutter && shutter.userData.originalPosition) {
    const progress = getPartProgress(35, 65);
    shutter.position.y = shutter.userData.originalPosition.y + progress * 0.006;
  }

  // Stage 6: Pinhole plate moves forward
  if (pinhole_plate && pinhole_plate.userData.originalPosition) {
    const progress = getPartProgress(60, 100);
    pinhole_plate.position.z =
      pinhole_plate.userData.originalPosition.z - progress * 0.005;
  }

  // Stage 7: Frame counter and gear move
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

// callback für resize, legt auflösung fest
function onWindowResize() {
  const canvas = renderer.domElement;
  //maße des canvas auf dem display
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  // Only update if size actually changed
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    renderer.setSize(displayWidth, displayHeight, false);
    camera.aspect = displayWidth / displayHeight;
    camera.updateProjectionMatrix();
  }
}

// callback für mouse wheel
function onWheel(event) {
  if (!pinhole) return;

  // Rotate the pinhole based on wheel delta
  // Adjust the 0.002 value to change rotation speed
  /*   pinhole.rotation.y += event.deltaY * 0.002; */

  if (back) {
    back.position.z += event.deltaY * -0.000001;
  }
}

// callback für keyboard
function onKeyDown(event) {
  if (event.key === "ArrowRight" && pinhole) {
    // Disassemble (increase progress)
    disassemblyProgress = Math.min(100, disassemblyProgress + disassemblySpeed);
  }
  if (event.key === "ArrowLeft" && pinhole) {
    // Reassemble (decrease progress)
    disassemblyProgress = Math.max(0, disassemblyProgress - disassemblySpeed);
  }
}

// Initiale Funktionen aufrufen
setup();
animate();

/* const right = document.querySelector('table');
window.addEventListener('scroll', () => { const scrollY = window.scrollY;})
right.scrollTop = scrollY * 0.7; */

/* ------------to do----------------- */
/* 
-ansicht von schräg oben rechts statt frontal

*/
