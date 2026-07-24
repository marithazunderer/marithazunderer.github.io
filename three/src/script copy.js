import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let scene, camera, renderer;
let ambientLight, pointLight;
let width = window.innerWidth;
let height = window.innerHeight;

let pinhole;
let back;

function setup() {
  // Canvas aus dem Html (DOM) holen
  const canvas = document.querySelector("canvas.webgl");

  // Scene: Das ist die Hierarchie aller 3D-Objekte, Kameras, Lichter, etc.
  scene = new THREE.Scene();

  // Camera
  initCamera();

  // Licht
  initLight();

  loadObjects();

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.setClearColor(new THREE.Color("rgb(255, 255, 255)"));

  // Eventlisteners hinzufügen
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("wheel", onWheel);
}

function animate() {
  // Ruf mich bei der nächsten Möglichkeit wieder auf
  requestAnimationFrame(animate);

  // Renderer-Szene rendern
  renderer.render(scene, camera);
}

function initCamera() {
  // vertikaler Winkel, Seitenverhältnis, near, far
  camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 100);
  camera.position.z = 2;
  scene.add(camera);
}

function initLight() {
  ambientLight = new THREE.AmbientLight("rgb(255, 255, 255)", 100.0);
  scene.add(ambientLight);

  pointLight = new THREE.PointLight("rgb(255, 255, 255)", 30);
  pointLight.position.x = -2;
  pointLight.position.y = 3;
  pointLight.position.z = 2;
  scene.add(pointLight);

  pointLight = new THREE.PointLight("rgb(255, 255, 255)", 70);
  pointLight.position.x = 2;
  pointLight.position.y = 1;
  pointLight.position.z = 2;
  scene.add(pointLight);
}

function loadObjects() {
  const gltfLoader = new GLTFLoader();
  //gltfLoader.load('/models/Duck/glTF/Duck.gltf', objectLoaded);
  gltfLoader.load("./models/pinhole/weitwinkelkamera_ganz.glb", objectLoaded);
}

function objectLoaded(gltf) {
  pinhole = gltf.scene;
  //duck.scale.set(0.5, 0.5, 0.5);
  pinhole.scale.set(150, 150, 150);
  //duck.rotation.y = toRadians(-130);
  pinhole.position.x = -1;
  pinhole.position.y = -0.5;
  scene.add(pinhole);

  const parts = [];
  pinhole.traverse((child) => {
    if (child.isMesh) {
      parts.push(child);
      child.userData.originalPosition = child.position.clone();
      console.log('Part name:', child.name); // Log all part names
      
    }
  });
  console.log(parts);

  // Access specific part by name
  back = parts.find((part) => part.name === "back");
  if (back) {
    console.log("Found back part:", back);
  }
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// callback für resize
function onWindowResize() {
  width = window.innerWidth;
  height = window.innerHeight;

  // Kamera an neue Fenstergröße anpassen
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // Renderer an neue Fenstergröße anpassen
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// callback für mouse wheel
function onWheel(event) {
  if (!pinhole) return;

  // Rotate the pinhole based on wheel delta
  // Adjust the 0.002 value to change rotation speed
  pinhole.rotation.y += event.deltaY * 0.002;
  
  if (back) {
    back.position.y += event.deltaY * 0.001;
  } 
}

// Initiale Funktionen aufrufen
setup();
animate();

/* const right = document.querySelector('table');
window.addEventListener('scroll', () => { const scrollY = window.scrollY;})
right.scrollTop = scrollY * 0.7; */
