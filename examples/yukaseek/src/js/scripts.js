import * as THREE from 'three';
import * as YUKA from 'yuka';

const renderer = new THREE.WebGLRenderer({antialias: true});

renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

renderer.setClearColor(0xA3A3A3);

const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(0, 10, 4);
camera.lookAt(scene.position);

const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
scene.add(directionalLight);

const vehicleGeometry = new THREE.ConeBufferGeometry(0.1, 0.5, 8);
vehicleGeometry.rotateX(Math.PI * 0.5);
const vehicleMaterial = new THREE.MeshNormalMaterial();
const vehicleMesh = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
vehicleMesh.matrixAutoUpdate = false;
scene.add(vehicleMesh);

const vehicle = new YUKA.Vehicle();

vehicle.setRenderComponent(vehicleMesh, sync);

function sync(entity, renderComponent) {
    renderComponent.matrix.copy(entity.worldMatrix);
}

const entityManager = new YUKA.EntityManager();
entityManager.add(vehicle);

const targetGeometry = new THREE.SphereGeometry(0.1);
const targetMaterial = new THREE.MeshPhongMaterial({color: 0xFFEA00});
const targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
targetMesh.matrixAutoUpdate = false;
scene.add(targetMesh);

const target = new YUKA.GameEntity();
target.setRenderComponent(targetMesh, sync);
entityManager.add(target);

const seekBehavior = new YUKA.SeekBehavior(target.position);
vehicle.steering.add(seekBehavior);

vehicle.position.set(-2, 0, -2);

setInterval(function(){
    const x = Math.random() * 3;
    const y = Math.random() * 3;
    const z = Math.random() * 3;

    target.position.set(x, y, z);
}, 2000);

const time = new YUKA.Time();

function animate() {
    const delta = time.update().getDelta();
    entityManager.update(delta);
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});