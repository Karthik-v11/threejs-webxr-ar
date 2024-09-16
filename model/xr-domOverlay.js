import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


let loadedModels = {};
let hitTestSource = null;
let hitTestSourceRequested = false;
let overlayContent = document.getElementById('overlay-content');
let selectInput = document.getElementById('model-select');
let modelName = selectInput.value;
let placedModel = null;  // To store the placed model for rotation/scaling

selectInput.addEventListener("change", (e) => {
    modelName = e.target.value;
    placedModel = null;  // Allow placing a new model when selection changes
});

let gltfLoader = new GLTFLoader();
let dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
gltfLoader.setDRACOLoader(dracoLoader);

gltfLoader.load('/models/chair.gltf', onLoad);
gltfLoader.load('/models/bookcase.gltf', onLoad);

function onLoad(gltf) {
    loadedModels[gltf.scene.name] = gltf.scene;
}

const scene = new THREE.Scene();

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

const light = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(light);

let reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, .2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random() })
);
reticle.visible = false;
reticle.matrixAutoUpdate = false;
scene.add(reticle);

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(0, 2, 5);
camera.lookAt(new THREE.Vector3(0, 0, 0));
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;


document.body.appendChild(renderer.domElement);

// const controls = new OrbitControls( camera, renderer.domElement );
// controls.touches.ONE = THREE.TOUCH.PAN;
// controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
document.body.appendChild(ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: overlayContent }
}));

let controller = renderer.xr.getController(0);
controller.addEventListener('select', onSelect);
scene.add(controller);

function onSelect() {
    if (reticle.visible && !placedModel) {  // Only place model if one isn't already placed
        let model = loadedModels[modelName].clone();
        model.position.setFromMatrixPosition(reticle.matrix);
        model.scale.set(0.5, 0.5, 0.5);
        model.name="Chair";
        reticle.visible = false;
        scene.add(model);
        placedModel = model;  // Store reference to the placed model
    }
}

let isScaling = false;
let initialTouchDistance = null;
let isSwiping = false;
const delta = 1.5;
let sogliaMove = 0;
let startX;
let startY;
let firstTouch = true;
let firstTime = true;

renderer.domElement.addEventListener('touchstart', function(e){
    e.preventDefault();
    touchDown=true;
    touchX = e.touches[0].pageX;
    touchY = e.touches[0].pageY;
}, false);

renderer.domElement.addEventListener('touchend', function(e){
    e.preventDefault();
    touchDown = false;
}, false);

renderer.domElement.addEventListener('touchmove', function(e){
    e.preventDefault();
    
    if(!touchDown){
        return;
    }

    deltaX = e.touches[0].pageX - touchX;
    deltaY = e.touches[0].pageY - touchY;
    touchX = e.touches[0].pageX;
    touchY = e.touches[0].pageY;

    rotateObject();

}, false);

var touchDown, touchX, touchY, deltaX, deltaY;

function rotateObject(){
if(placedModel){
    placedModel.rotation.y += deltaX/100;
}
}
// Handle touch interactions for rotating and scaling
// window.addEventListener('pointerdown', (event) => {
//     if (placedModel) {
//         firstTouch = true; 
//       startX = event.pageX;
//       startY = event.pageY;

//       isSwiping = false;

//     }
// });

// window.addEventListener('pointermove', (event) => {
//     if (isRotating && placedModel) {
//         if (firstTouch) {
//             startX = event.pageX;
//             startY = event.pageY;
//             firstTouch = false;
//           } else {
//             const diffX = Math.abs(event.pageX - startX);
//             const diffY = Math.abs(event.pageY - startY);
//             if (diffX < delta && diffY < delta && sogliaMove > 2) {
//               // sogliaMove>2 means 2 frame still when isSwiping is true
//               onDocumentTouchClick(event); // for iOS  
//             }
//           }
//           isSwiping = true; 
//     }
// });

// window.addEventListener('pointerup', () => {
//     const diffX = Math.abs(event.pageX - startX);
//       const diffY = Math.abs(event.pageY - startY);
//       if (diffX < delta && diffY < delta) {
//         onDocumentMouseClick(event); // Android old: is better desktop solution
//       }
//       firstTouch = true;
//     isRotating = false;
//     isScaling = false;
// });

window.addEventListener('touchstart', (event) => {
    touchDown=true;
    touchX = event.touches[0].pageX;
    touchY = event.touches[0].pageY;
    if (placedModel && event.touches.length === 2) {
        isScaling = true;
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        initialTouchDistance = Math.hypot(touch2.pageX - touch1.pageX, touch2.pageY - touch1.pageY);
    }
});

window.addEventListener('touchmove', (event) => {
    if(!touchDown){
        return;
    }

    deltaY = event.touches[0].pageY - touchY;
    deltaX = event.touches[0].pageX - touchX;
    touchX = event.touches[0].pageX;
    touchY = event.touches[0].pageY;
    if (placedModel && event.touches.length === 1) {
    rotateObject();
    }
    if (isScaling && placedModel && event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const currentTouchDistance = Math.hypot(touch2.pageX - touch1.pageX, touch2.pageY - touch1.pageY);
        const scaleChange = currentTouchDistance / initialTouchDistance;

        placedModel.scale.set(
            placedModel.scale.x * scaleChange,
            placedModel.scale.y * scaleChange,
            placedModel.scale.z * scaleChange
        );
        initialTouchDistance = currentTouchDistance;
    }
});

window.addEventListener('touchend', () => {
    touchDown = false;
    isScaling = false;
});

        // let lastTouch = { x: 0, y: 0 };
        // let lastDistance = 0;

        // function getTouchDistance(touches) {
        //     const dx = touches[0].clientX - touches[1].clientX;
        //     const dy = touches[0].clientY - touches[1].clientY;
        //     return Math.sqrt(dx * dx + dy * dy);
        // }

        // function onTouchStart(event) {
        //     if (event.touches.length === 1) {
        //         lastTouch.x = event.touches[0].clientX;
        //         lastTouch.y = event.touches[0].clientY;
        //     } else if (event.touches.length === 2) {
        //         lastDistance = getTouchDistance(event.touches);
        //     }
        // }

        // function onTouchMove(event) {
        //     if (event.touches.length === 1) {
        //         const touch = event.touches[0];
        //         const deltaX = touch.clientX - lastTouch.x;
        //         const deltaY = touch.clientY - lastTouch.y;

        //         // Update model rotation based on touch movement
        //         if (model) {
        //             model.rotation.y += deltaX * 0.01; // Adjust rotation speed as needed
        //             model.rotation.x -= deltaY * 0.01; // Adjust rotation speed as needed
        //         }

        //         // Update last touch position
        //         lastTouch.x = touch.clientX;
        //         lastTouch.y = touch.clientY;
        //     } else if (event.touches.length === 2) {
        //         const currentDistance = getTouchDistance(event.touches);
        //         const zoomFactor = currentDistance / lastDistance;
                
        //         // Update camera position based on zoom factor
        //         camera.position.z *= zoomFactor;

        //         // Update last distance
        //         lastDistance = currentDistance;
        //     }
        // }

        // document.addEventListener('touchstart', onTouchStart);
        // document.addEventListener('touchmove', onTouchMove);

renderer.setAnimationLoop(render);

function render(timestamp, frame) {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {
            session.requestReferenceSpace('viewer').then(referenceSpace => {
                session.requestHitTestSource({ space: referenceSpace }).then(source =>
                    hitTestSource = source);
            });

            hitTestSourceRequested = true;

            session.addEventListener("end", () => {
                hitTestSourceRequested = false;
                hitTestSource = null;
            });
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
                document.getElementById("scanning-plane").style.display="none";
                const hit = hitTestResults[0];
                reticle.visible = true;
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
            } else {
                reticle.visible = false;
            }
        }
    }
    // scene.children.forEach(object => {
    //     if (object.name === "Chair") {
    //         object.rotation.y += 0.01
    //     }
    // })
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(window.devicePixelRatio);
});
