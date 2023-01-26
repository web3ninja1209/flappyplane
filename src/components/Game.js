import { useEffect, useRef } from "react";
import THREE from "../lib/three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { SFX } from "../lib/SFX.js";


const Game = () => {

  const mountRef = useRef(null);
  
  //Scene , Camera, Rendere and Lights
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
  var renderer = new THREE.WebGLRenderer({antialias:true});
  var cameraController = new THREE.Object3D();
  var cameraTarget = new THREE.Vector3(0,0,6);
  var ambient = new THREE.HemisphereLight(0xffffff,0xbbbbff,0.3);
  const light = new THREE.DirectionalLight();

  // Display Plane in Scene
  var plane;
  var propeller;
  var clock = new THREE.Clock();
  var velocity = new THREE.Vector3(0,0,0.1);

  //Display Obstacles

  var star;
  var bomb;
  var obstacles = [];
  var obstacleSpawn ={};
  var tmpPos= new THREE.Vector3()

  //Key Controls
  var spaceKey = false;
  var active = false;
  //const controls = new THREE.OrbitControls(camera,renderer.domElement);

  // Track Score

  var score = 0;
  var bonusScore = 0;
  var lives = 3;
  

  // Sound
  var sfx;

  // Logic for game

  scene.add( ambient );
  scene.add( light );
  light.position.set(0.2,1,1);
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setPixelRatio(Window.devicePixelRation);
  renderer.outputEncoding = THREE.sRGBEncoding;
  cameraController.add(camera);
  camera.position.set(-4.37,0,-4.37);
  camera.lookAt(0, 0, 6);

  // Loading Manager Function
  const manager = new THREE.LoadingManager();
    manager.onStart = function ( url, itemsLoaded, itemsTotal ) {
       console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
     };

    manager.onLoad = function ( ) {
        console.log( 'Loading complete!');
    };
    
    manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
        //progress.style.width = (itemsLoaded / itemsTotal * 100) + '%';
        console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
    };
    
    manager.onError = function ( url ) {
        console.log( 'There was an error loading ' + url );
    };

    
    // Load stars for obstacles
    var loadStar = function(){
    	const loader = new GLTFLoader(manager).setPath('/assets/plane/');
        
		// Load a glTF resource
		loader.load(
			// resource URL
			'star.glb',
			// called when the resource is loaded
			gltf => {
                
                star = gltf.scene.children[0];
                star.name = 'star';
			        },
			// called while loading is progressing
			xhr => {
          //this.loadingBar.update('star', xhr.loaded, xhr.total );
			},
			// called when loading has errors
			err => {
				console.error( err );

			}
		);
	}	

      // Load Bomb for obstacles

    var loadBomb = function(){
    	const loader = new GLTFLoader(manager).setPath('/assets/plane/');
        
		// Load a glTF resource
		loader.load(
			// resource URL
			'bomb.glb',
			// called when the resource is loaded
			gltf => {
                bomb = gltf.scene.children[0];

                const obstacle = new THREE.Group();
                obstacle.add(star);

                bomb.rotation.x = -Math.PI*0.5;
                bomb.position.y = 7.5;
                obstacle.add(bomb);

                let rotate=true;

                for(let y=7.5; y>-8; y-=2.5){
                  rotate = !rotate;
                  if (y==0) continue;
                  const bomb1 = bomb.clone();
                  bomb1.rotation.x = (rotate) ? -Math.PI*0.5 : 0;
                  bomb1.position.y = y;
                  obstacle.add(bomb1);
              }

        
                obstacles.push(obstacle);
                scene.add(obstacle);

                for(let i=0; i<3; i++){
                  const obstacle1 = obstacle.clone();
                  scene.add(obstacle1);
                  obstacles.push(obstacle1);
              }

              resetObstacle();
               
			},
			// called while loading is progressing
			xhr => {
				//this.loadingBar.update('bomb', xhr.loaded, xhr.total );			
			},
			// called when loading has errors
			err => {
				console.error( err );
			}
		);
	}

  // Updating obstacles

  
  var updateObstacle = function(pos){
    let collisionObstacle;

    obstacles.forEach( obstacle =>{
        obstacle.children[0].rotateY(0.01);
        const relativePosZ = obstacle.position.z-pos.z;
        if (Math.abs(relativePosZ)<2 && !obstacle.userData.hit){
            collisionObstacle = obstacle;
        }
        if (relativePosZ<-20){
            respawnObstacle(obstacle); 
        }
    });

   
    if (collisionObstacle!==undefined){
  collisionObstacle.children.some( child => {
    child.getWorldPosition(tmpPos);
    const dist = tmpPos.distanceToSquared(pos);
    if (dist<5 ){
      collisionObstacle.userData.hit = true;
      hit(child);
                return true;
            }
        })
        
    } 
   
}

// Change score after hitting star / bombs

var hit = function(obj){
if (obj.name=='star'){
  incScore();
    }else{
      decLives();
    }
    obj.visible = false;
}


// Reset obstacles

var resetObstacle = function(){
    obstacleSpawn = { pos: 20, offset: 5 };
    obstacles.forEach( obstacle => respawnObstacle(obstacle) );
    
}

// Reset Plane position

var resetPlane = function(){
  plane.position.set(0, 0, 0);
  velocity.set(0,0,0.1);
}

// Update score on game over
var gameOver = function(){
  active = false;

  const gameover = document.getElementById('gameover');
  const btn = document.getElementById('playBtn');

  gameover.style.display = 'block';
  btn.style.display = 'block';
  sfx.stopAll();
  sfx.play('gameover');
}

// increment score
var incScore = function(){
  score++;
  const elm = document.getElementById('score');
 
  if (score % 3==0){
    bonusScore += 3;
    sfx.play('bonus');
}else{
    sfx.play('gliss');
}

elm.innerHTML = score + bonusScore;
}

// Decrement score
var decLives = function(){
  lives--;
  const elm = document.getElementById('lives');
  elm.innerHTML = lives;
  if(lives==0) setTimeout(gameOver(),1200);
  sfx.play('explosion');
}

// Respawn obstacles
var respawnObstacle = function(obstacle){
    obstacleSpawn.pos += 30;
    const offset = (Math.random()*2 - 1) * obstacleSpawn.offset;
    obstacleSpawn.offset += 0.2;
    obstacle.position.set(0, offset, obstacleSpawn.pos );
    obstacle.children[0].rotation.y = Math.random() * Math.PI * 2;
    obstacle.userData.hit = false;
    obstacle.children.forEach( child => {
        child.visible = true;
    });
}

    // load a plane
    var loadGLTF =  function(){

      const loader = new GLTFLoader(manager).setPath('/assets/plane/');
      const dracoLoader = new DRACOLoader();
      //dracoLoader.setDecoderPath( '../node_modules/three/examples/js/libs/draco/gltf/' );
      dracoLoader.setDecoderPath('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/js/libs/draco/'); // use a full url path
      loader.setDRACOLoader(dracoLoader);

      // Load a glTF resource
     loader.load(
        // resource URL
        //'microplane.glb',
          'microplane.glb',
        // called when the resource is loaded
      gltf => {
              //const bbox = new THREE.Box3().setFromObject(gltf.scene );
              //console.log(`min:${bbox.min.x.toFixed(2)},${bbox.min.y.toFixed(2)},${bbox.min.z.toFixed(2)} -  max:${bbox.max.x.toFixed(2)},${bbox.max.y.toFixed(2)},${bbox.max.z.toFixed(2)}`);
              plane = gltf.scene;
              //mixer = new THREE.AnimationMixer( gltf.scene );
              scene.add( gltf.scene );

              //velocity = new Vector3(0,0,0.1);
              propeller = plane.getObjectByName("propeller");
            
              /*gltf.animations.forEach((animation) => {
                  //mixer.clipAction(animation).setDuration(60).play();
                  var action = mixer.clipAction(animation);
                  //action.setDuration(60);
                  action.play();
                  //action.time = 5;
              } );*/
              setEnvironment();
              loadSkybox();
              animate();
    },
    xhr => {

    },
    err => {
      console.error( err );
    }  
      );
      

  }

  // animate the scene
  var animate = function () {
    requestAnimationFrame(animate);
    propeller.rotateZ(1);

    if (active){
      if (!spaceKey){
        velocity.y -= 0.001;
      }else{
        velocity.y += 0.001;
      }
      velocity.z += 0.0001;
      plane.rotation.set(0, 0, Math.sin(clock.getElapsedTime()*3)*0.2, 'XYZ');
      plane.translateZ( velocity.z );
      plane.translateY( velocity.y );
      updateObstacle(plane.position);    
  }else{
      plane.rotation.set(0, 0, Math.sin(clock.getElapsedTime()*3)*0.2, 'XYZ');
      plane.position.y = Math.cos(clock.getElapsedTime()) * 1.5;
  }

    updateCamera();

    renderer.render( scene, camera );
  }

  // Window resize event
  let onWindowResize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }

  // Set environment 
  var setEnvironment = function(){
    const loader = new RGBELoader().setPath("/assets");
    const pmremGenerator = new THREE.PMREMGenerator( renderer );
    pmremGenerator.compileEquirectangularShader();
    
    loader.load( '/hdr/venice_sunset_1k.hdr', ( texture ) => {
      const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
      pmremGenerator.dispose();

      scene.environment = envMap;

    }, undefined, (err)=>{
        console.error( err.message );
    } );
}

var loadSkybox = function(){
  scene.background = new THREE.CubeTextureLoader()
    .setPath('/assets/plane/paintedsky/')
      .load( [
          'px.jpg',
          'nx.jpg',
          'py.jpg',
          'ny.jpg',
          'pz.jpg',
          'nz.jpg'
      ], () => {
          console.log("Loaded sky");
      } );
}		

var updateCamera = function(){
  cameraController.position.copy(plane.position );
  cameraController.position.y = 0;
  cameraTarget.copy(plane.position);
  cameraTarget.z += 6;
  camera.lookAt( cameraTarget );
}

function onKeyDown(evt) {
  switch(evt.keyCode){
    case 32:
        spaceKey = true; 
        break;
  }
}

function onKeyUp(evt) {
  switch(evt.keyCode){
    case 32:
        spaceKey = false; 
        break;
  }
}

let mouseDown = function () {
  spaceKey= true;
}

let mouseUp = function () {
  spaceKey = false;
}


var loadSFX = function(){
  sfx = new SFX(camera,'/assets/plane/');

  sfx.load('explosion');
  sfx.load('engine', true);
  sfx.load('gliss');
  sfx.load('gameover');
  sfx.load('bonus');
}


  window.addEventListener("resize", onWindowResize, false);
  window.addEventListener('keydown',onKeyDown,false);
  window.addEventListener('keyup',onKeyUp,false);
  window.addEventListener('touchstart',mouseDown,false);
  window.addEventListener('touchend',mouseUp,false);
  window.addEventListener('mouseDown',mouseDown,false);
  window.addEventListener('mouseUp',mouseUp,false);

  function onPlayButtonClick(e) {
    e.preventDefault();
    const instructions = document.getElementById('instructions');
    const btn = document.getElementById('playBtn');
    const gameover = document.getElementById('gameover');

    score = 0;
    lives = 3;

    gameover.style.display = 'none';    
    instructions.style.display = 'none';
    btn.style.display = 'none';

    let elm = document.getElementById('score');
    elm.innerHTML = score;
    
    elm = document.getElementById('lives');
    elm.innerHTML = lives;

    sfx.play('engine');

    resetPlane();
    resetObstacle();
    active = true;
  }
  

  useEffect(() => {   
      mountRef.current.appendChild(renderer.domElement);
      return () => mountRef.current.removeChild( renderer.domElement);
  }, []);

  loadGLTF();
  loadStar();
  loadBomb();
  loadSFX();



  return (
<>
<div id="info" className="info">
        <div id="life" className="life">
            <img className="info-img" src="/assets/plane/plane-icon.png" /><div className="lives" id="lives">3</div>
        </div>
        <div id="score-panel" className="score-panel">
            <div id="score" className="score">0</div><img className="info-img" src="/assets/plane/star-icon.png" />
        </div>
    </div>
    <div ref={mountRef}>
       <p id="instructions" className="instructions">Collect Stars. Avoid Bombs. Use Keys Spacebar, Mousedown or Touch To Climb</p>
       
    <p id="gameover" className="gameover">Game Over</p>
      <button id="playBtn" className="playBtn" onClick={onPlayButtonClick}>Play</button>
    </div>
    </>

  );
}

export default Game;