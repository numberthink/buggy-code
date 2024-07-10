import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { setupThreeScene, onTick } from './lib/screen-tools.js';
import { calcDopplerFactor, clampFrequency, audioBufferToMp3 } from './lib/sound-tools.js';
import {createVideo} from './lib/ffmpeg.js';

const scene = setupThreeScene();

scene.camera.fov = 75;
scene.camera.updateProjectionMatrix();

scene.renderer.setClearColor(0x000,1);

const animate = async(args) => {
  const elapsedTime = args.elapsedTime;
  const deltaTime = args.deltaTime;

  if (sceneReady) {
      const sceneElapsedTime = audioCtx.currentTime - sceneState.startTime;
      if (sceneElapsedTime>0) {
          updateBugMeshs(sceneElapsedTime);
      }

      scene.render();
  
  }


  
  
}

scene.render();

onTick(animate);


scene.render();


let sceneReady = false;


const audioCtx = new AudioContext({sampleRate: 41000});


const bugParams = {
  abdomenRadius: .5,
  thoraxRadius: .35,
  eyeRadius: .1,
  colors: [
      ["#0ac9f0","#059eeb","#005bc5","#00b4fc","#17f9ff","#00d4db"],
      ["#c21a01","#f03c02","#280904","#f52f2f","#850505","#c7000d"],
      ["#343838","#fabe28","#f2d82c","#473d04","#e6d732","#cfb406"],


  ],

}

const makeBugMesh = (params,idx) => {

  const bugGroup = new THREE.Group();

  const abdomemGeo = new THREE.SphereGeometry(params.abdomenRadius,32,16);

  let colorIdx = idx%params.colors.length;
  const bugColors = params.colors[colorIdx];

  const abdomenMat = new THREE.MeshBasicMaterial({color: new THREE.Color(bugColors[0])});

  const abdomenMesh = new THREE.Mesh(abdomemGeo,abdomenMat);
  

  const thoraxGeo = new THREE.SphereGeometry(params.thoraxRadius,32,16);
  const thoraxMat = new THREE.MeshBasicMaterial({color: new THREE.Color(bugColors[1])});
  const thoraxMesh = new THREE.Mesh(thoraxGeo,thoraxMat);

  //offset thorax
  abdomenMesh.rotation.set(0,0,Math.PI*.5);
  abdomenMesh.userData.body = true;
  thoraxMesh.position.set((params.abdomenRadius + params.thoraxRadius)*.8,0,0);
  bugGroup.add(thoraxMesh);
  bugGroup.add(abdomenMesh);


  let extraSpheres = Math.floor((idx%6)*.5) + 2;
  let totalRadius = 0;
  for (let j=0;j<extraSpheres;j++) {
      const thisRadius = params.abdomenRadius*.75 + .25*(1-((j+1)/extraSpheres))*params.abdomenRadius;
      const thisGeo = new THREE.SphereGeometry(thisRadius,32,16);
      const thisMat = new THREE.MeshBasicMaterial({color: new THREE.Color(bugColors[2+j])});
      const thisMesh = new THREE.Mesh(thisGeo,thisMat);
      thisMesh.userData.body = true;
      thisMesh.position.set((-params.abdomenRadius -totalRadius*1.4 -thisRadius*.6+ .0),0,0);
      totalRadius += thisRadius;
      bugGroup.add(thisMesh);
  }
  

  const eyeGeo = new THREE.SphereGeometry(params.eyeRadius,32,16);
  const eyeMat = new THREE.MeshBasicMaterial({color: new THREE.Color('rgb(0,0,0)')});
  const eyeMeshRight = new THREE.Mesh(eyeGeo,eyeMat);
  const eyeMeshLeft = eyeMeshRight.clone();
  const thoraxPos = thoraxMesh.position;
  const eyeRightX = thoraxPos.x + Math.cos(Math.PI*2.25)*params.thoraxRadius*.97;
  const eyeRightY = thoraxPos.y + Math.sin(Math.PI*1.85)*params.thoraxRadius*.97;
  const eyeRightZ = thoraxPos.z + Math.cos(Math.PI*1.5)*params.thoraxRadius*.97;
  let zOffset = .35;
  eyeMeshRight.position.set(eyeRightX,eyeRightY,eyeRightZ+zOffset*params.thoraxRadius);
  eyeMeshLeft.position.set(eyeRightX,eyeRightY,eyeRightZ-zOffset*params.thoraxRadius);

  // antenna
  const antennaGeo = new THREE.CylinderGeometry( .03, .03, .5, 16 ); 
  const antennaMat = new THREE.MeshBasicMaterial( { color: 0x000 } );
  const antennaMesh = new THREE.Mesh(antennaGeo, antennaMat );
  antennaMesh.scale.set(.04,.8,1);
  let antZOffset = .3;
  const antRightX = thoraxPos.x + Math.cos(Math.PI*(2.25+.2))*params.thoraxRadius*.97-.1;
  const antRightY = thoraxPos.y + Math.sin(Math.PI*(1.85-.25))*params.thoraxRadius*.97+.8;
  const antRightZ = thoraxPos.z + Math.cos(Math.PI*1.5)*params.thoraxRadius*.97;
  antennaMesh.position.set(antRightX,antRightY,antRightZ+antZOffset*params.thoraxRadius);
  antennaMesh.rotation.set(0,0,Math.PI*0);
  const antennaMesh2 = antennaMesh.clone();
  antennaMesh2.position.set(antRightX, antRightY, antRightZ-antZOffset*params.thoraxRadius);

  bugGroup.add(antennaMesh);
  bugGroup.add(antennaMesh2);
  bugGroup.add(eyeMeshRight);
  bugGroup.add(eyeMeshLeft);


  // make them transparent and set initial opacity = 0
  bugGroup.children.forEach((child)=> {
      child.material.transparent = true;
      child.material.opacity = .0;
  })


  scene.add(bugGroup);

  return bugGroup;
}

const sceneState = {
  startTime: 0,
  initialized: false,
}

const sceneParams = {
  freq: 250,
  numOscs: 25,
  lfoFreq: 150,
  baseSpeed: .12,
  updateRate: 60,
  duration: 20,
  speedOfSoundFactor: .1,
  fadeInDuration: 2,
  rotateToViewerDuration: 2,
  swarmViewerDuration: 10,
  insideSwarmDuration: 5,
  fadeOutDuration: 3,
  startDelay: .5,
  oscGain: .35,
  freqModulationFactor: 50,
}

const defaultSceneParams = JSON.parse(JSON.stringify(sceneParams));

const startOscs = (oscs, audioCtx, startTime=0) => {

  oscs.forEach((o)=> {
      o.osc
      .connect(lfoGain)
      .connect(oscGain)
      .connect(o.panner)
      // .connect(convolver)
      .connect(mainGain)
      .connect(audioCtx.destination);
      o.osc.start(startTime);
      // o.osc.stop(startTime+sceneParams.duration);
  });
  // pan panners
  oscs.forEach((o,j)=> {
      const stepsPerSecond = sceneParams.updateRate;
      const duration = 20;
      const steps = stepsPerSecond*duration;
      const oscPct = j/sceneParams.numOscs
      const stepDelta = 1/stepsPerSecond;
      for (let i=0;i<steps;i++) {
          let stepTime = (i/steps)*duration;

          let newFreq = o.params.baseFreq + Math.sin(stepTime*Math.PI*2*.2 + oscPct*Math.PI)*sceneParams.freqModulationFactor;
          o.state.currentFreq = newFreq;

          doOscUpdates(o,oscPct, stepTime,stepDelta, sceneParams);
      

      }

      const swarmDuration = sceneParams.swarmViewerDuration;
      const swarmSteps = swarmDuration*stepsPerSecond;
      for (let i=0;i<swarmSteps;i++) {
          let stepPct = (i/swarmSteps)
          let stepTime = (i/swarmSteps)*swarmDuration;
          const lastPosition = o.state.lastPosition;

          const finalPosition = {x: 0, y: 0, z: 5};

          const interpolatePct = Math.pow(stepPct, .6);

          const newPosX = lastPosition.x + interpolatePct*(finalPosition.x - lastPosition.x);
          const newPosY = lastPosition.y + interpolatePct*(finalPosition.y - lastPosition.y);
          const newPosZ = lastPosition.z + interpolatePct*(finalPosition.z - lastPosition.z);

          o.state.positions.push({x: newPosX, y: newPosY, z: newPosZ});

          const thisPanner = o.panner;
          

          thisPanner.positionX.setValueAtTime(newPosX, stepTime + sceneParams.duration + sceneState.startTime);
          thisPanner.positionY.setValueAtTime(newPosY, stepTime + sceneParams.duration + sceneState.startTime);
          thisPanner.positionZ.setValueAtTime(newPosZ, stepTime + sceneParams.duration + sceneState.startTime);
      

      }
      
  });

    // fade in/out main gain
    fadeInOutMainGain(startTime);

}

const fadeInOutMainGain = (startTime) => {
  const stepsPerSecond = sceneParams.updateRate;
  const duration = sceneParams.fadeInDuration;
  const steps = stepsPerSecond*duration;
  const stepDelta = 1/stepsPerSecond;
  for (let i=0;i<steps;i++) {
      const t = i/steps;
      const stepTime = t*duration;
      mainGain.gain.setValueAtTime(t, stepTime+sceneState.startTime);
  }

  const outDuration = sceneParams.fadeOutDuration;
  const outSteps = stepsPerSecond*outDuration;
  for (let i=0;i<outSteps;i++) {
      const t = i/outSteps;
      const stepTime = t*outDuration;
      const setTime = sceneParams.duration+sceneParams.swarmViewerDuration+sceneParams.insideSwarmDuration+ stepTime+sceneState.startTime;
      mainGain.gain.setValueAtTime((1-t), setTime);
      if (i==outSteps-1) {
          mainGain.gain.setValueAtTime(0, setTime);
      }
  }
}

const doOscUpdates = (thisOsc,oscPct,elapsedTime,deltaTime,params) => {
  let speed = params.baseSpeed*oscPct*.5 + params.baseSpeed*.5;
  let oscNum = oscPct*params.numOscs;
  let xRad = ((oscNum%5)*.5 + 15)*Math.sin(elapsedTime*Math.PI*2*oscPct*.1);
  let yRad = (((oscNum+5)%10) + 2.5)*Math.cos(elapsedTime*Math.PI*2*oscPct*.2);
  let zRad = ((oscNum+2.5)%15)*1;
  const oscX = Math.sin(speed*Math.PI*2*elapsedTime*2.5+oscPct*Math.PI*2)*xRad;
  const oscY = Math.cos(speed*Math.PI*2*elapsedTime*2+oscPct*Math.PI*2)*yRad;
  const oscZ = Math.sin(speed*Math.PI*2*elapsedTime*.75+oscPct*Math.PI*2)*zRad - 5 - zRad*.5;


  const lastPosition = thisOsc.state.lastPosition;
  const oscDirection = new THREE.Vector3(oscX-lastPosition.x, oscY - lastPosition.y, oscZ - lastPosition.z);
  oscDirection.normalize();
  let baseRotation = {x: Math.PI*0 + Math.sin(elapsedTime*Math.PI*2*.5 + oscPct*Math.PI)*Math.PI*.05, y: Math.PI*1.5+ Math.sin(elapsedTime*Math.PI*2*1+ oscPct*Math.PI)*Math.PI*.03, z: Math.PI*0 + Math.sin(elapsedTime*Math.PI*2+oscPct*Math.PI*2)*Math.PI*.04};
  let rotFactor = {x: Math.PI*.17, y: Math.PI*.15, z: Math.PI*.17}
  thisOsc.state.rotations.push({x:oscDirection.x*rotFactor.x + baseRotation.x,y: oscDirection.y*rotFactor.y+baseRotation.y, z: oscDirection.z*rotFactor.z + baseRotation.z })


  const observerPos = new THREE.Vector3(0,0,5);
  const currentPos = new THREE.Vector3(oscX, oscY, oscZ);
  const distance = observerPos.distanceTo( currentPos );
  const zSpeed = (distance - thisOsc.state.lastDistance)/deltaTime;
  const dopplerFactor = calcDopplerFactor(zSpeed, 353*sceneParams.speedOfSoundFactor);

  const adjustedFreq = thisOsc.state.currentFreq*dopplerFactor;

  
  thisOsc.osc.frequency.setValueAtTime(clampFrequency(adjustedFreq),elapsedTime + + sceneState.startTime);

  thisOsc.state.lastPosition = {x: oscX, y: oscY, z: oscZ};
  thisOsc.state.lastDistance = distance;
  const thisPanner = thisOsc.panner;
  thisPanner.positionX.setValueAtTime(oscX, elapsedTime + sceneState.startTime);
  thisPanner.positionY.setValueAtTime(oscY, elapsedTime + sceneState.startTime);
  thisPanner.positionZ.setValueAtTime(oscZ, elapsedTime + sceneState.startTime);
  

  thisOsc.state.positions.push({x: oscX, y: oscY, z: oscZ});


}

const updateBugMeshs = (elapsedTime) => {
  if (!sceneState.startTime || elapsedTime<0) {
      return;
  }
  
  const positionIndex = Math.floor(elapsedTime*sceneParams.updateRate);
  const meshOpacity = Math.min(Math.pow(elapsedTime/sceneParams.fadeInDuration,2),1);
  
  oscs.forEach((o)=> {
      if (!sceneState.meshesVisible) {
          o.mesh.children.forEach((child)=> {
              child.material.opacity = meshOpacity;
          })
      }

      if (meshOpacity>=1 && !sceneState.meshesVisible) {
          sceneState.meshesVisible = true;
      }
      
      if (positionIndex < o.state.positions.length) {
          const thisPosition = o.state.positions[positionIndex];
          o.mesh.position.set(thisPosition.x, thisPosition.y, thisPosition.z);

      }
      if (positionIndex < o.state.rotations.length) {
          const thisRotation = o.state.rotations[positionIndex];
          o.mesh.rotation.set(thisRotation.x, thisRotation.y, thisRotation.z);
      }

      const meshestoAnimate = o.mesh.children.length-5;
      for (let i=0;i<o.mesh.children.length-5;i++) {
          o.mesh.children[i+1].position.y = Math.sin(elapsedTime*Math.PI*2*8)*.05 + .27*(.5+meshestoAnimate/6)*Math.sin(elapsedTime*Math.PI*2*1.5 + Math.pow((i/meshestoAnimate),1)*Math.PI);
      }

      // fade to black
      if (!sceneState.fadedOut && elapsedTime> sceneParams.duration + sceneParams.swarmViewerDuration + sceneParams.insideSwarmDuration) {
          let fadeOutElapsedTime = elapsedTime - (sceneParams.duration + sceneParams.swarmViewerDuration + sceneParams.insideSwarmDuration);
          let fadeOutPct = fadeOutElapsedTime/sceneParams.fadeOutDuration;
          let newOpacity = Math.max(0,1-fadeOutPct);
          o.mesh.children.forEach((child)=> {
              child.material.opacity = newOpacity;
          });
          if (newOpacity<=0) {
              sceneState.fadedOut = true;
          }
      }

      
  })
}

let oscGain, lfoGain, mainGain, lfo
let oscs =[];


const setupScene = (audioCtx, audioOnly) => {

  lfo = new OscillatorNode(audioCtx,{
    frequency: sceneParams.lfoFreq,
    type: 'sine',
  });

  lfoGain = new GainNode(audioCtx);
  lfoGain.gain.value = 1;

  lfo.connect(lfoGain.gain);

  oscGain = new GainNode(audioCtx);
  oscGain.gain.value = sceneParams.oscGain*(1/sceneParams.numOscs);

  mainGain = new GainNode(audioCtx);
  mainGain.gain.value = 0;


  const numOscs = sceneParams.numOscs;

  for (let i=0;i<numOscs;i++) {
      const thisOscParams = {};
      let freqFactor = .05*Math.floor((i+1)/2)*(-1 + 2*(i%2));
      thisOscParams.freqFactor = freqFactor;
      thisOscParams.baseFreq = sceneParams.freq*Math.pow(1.059,freqFactor) + Math.random();
      const thisOscState = {lastPosition: {x: 0, y: 0,z: 0}, currentFreq: thisOscParams.baseFreq,
      lastDistance: 0, positions: [], rotations: []};
      const thisOsc = new OscillatorNode(audioCtx,{
          type: 'sawtooth',
          frequency: thisOscParams.baseFreq,
          detune: 0,
      });
  
      const panner = audioCtx.createPanner();
      panner.panningModel = "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 1;

      if (sceneState.initialized) {
        oscs[i].osc = thisOsc;
        oscs[i].panner = panner;
        oscs[i].state = thisOscState;
        oscs[i].params = thisOscParams;
      }
      else if (audioOnly) {
        oscs.push({osc: thisOsc, params: thisOscParams, panner: panner, state: thisOscState});
      }
      else {
        const bugMesh = makeBugMesh(bugParams,i);
  
        oscs.push({osc: thisOsc, params: thisOscParams, panner: panner, state: thisOscState, mesh: bugMesh});
      }
  
  }
  if (!sceneState.initialized) {
      sceneState.initialized = true;
  }
}

const startScene = (audioCtx, audioOnly)=> {
  const startTime = audioCtx.currentTime + sceneParams.startDelay;
  sceneState.startTime = startTime;
  startOscs(oscs,audioCtx, startTime);
  lfo.start(startTime);

  if (!audioOnly) {
    sceneReady = true;  
  }
  
}

const restartScene = (audioCtx, audioOnly=false) => {
  resetScene();
  setupScene(audioCtx, audioOnly)
  startScene(audioCtx, audioOnly);  
}

const resetScene = () => {
  if (sceneState.initialized) {
    oscs.forEach((o)=> {
      o.osc.stop(0);
    })

    sceneState.meshesVisible = false;
    sceneState.fadedOut = false;
  }
  sceneReady = false;  
}


restartScene(audioCtx);


const gui = new GUI();

const resetObj = { Restart:function(){ restartScene(audioCtx); }};
gui.add(resetObj,'Restart');
const runTimeFolder = gui.addFolder('Runtime params');
runTimeFolder.add(scene.camera,'fov',1,120,1).onChange(()=> {
  scene.camera.updateProjectionMatrix();
});
const resetFolder = gui.addFolder('Reset params');
resetFolder.add(sceneParams,'speedOfSoundFactor',0,1.01).name('Speed of sound factor');
resetFolder.add(sceneParams,'freq',100,500,1).name('Buzz frequency');
runTimeFolder.add(sceneParams, 'oscGain',0,5,.25).name('Osc volume').onChange(()=> {
  oscGain.gain.value = sceneParams.oscGain*(1/sceneParams.numOscs);
});

resetFolder.add(sceneParams, 'baseSpeed',0,1,.01).name('Speed');

const renderSceneAudio = () => {
  return new Promise((resolve,reject)=> {
    const totalDuration = sceneParams.duration + sceneParams.swarmViewerDuration + sceneParams.insideSwarmDuration + sceneParams.fadeOutDuration;
    const offlineAudioCtx = new OfflineAudioContext(2,totalDuration*41000,41000);
    resetScene(offlineAudioCtx,true);
    const audioData = offlineAudioCtx.startRendering().then(async(audioBuffer)=> {
      console.log(audioBuffer);
      const mp3Blob = audioBufferToMp3(audioBuffer);
      const arrayBuffer = await mp3Blob.arrayBuffer();
      
      const audioData = new Uint8Array(arrayBuffer, 0, arrayBuffer.byteLength);
      const downloadURL = URL.createObjectURL(mp3Blob);
      resolve({mp3Blob: mp3Blob, audioBuffer: audioBuffer, downloadURL: downloadURL, audioData: audioData});
    });
  })


}

// sceneParams.startDelay = 0;
// const audioResult = await renderSceneAudio();
// console.log(audioResult);

const renderSettings = {
  skipFirstFrame: false,
}

const renderSceneVisual = async() => {
    // setup scene, and get oscillator positions 
    resetScene();
    setupScene(audioCtx, false)
    startScene(audioCtx, true);  

    let frameRate = 29.97;
    const totalDuration = sceneParams.duration + sceneParams.swarmViewerDuration + sceneParams.insideSwarmDuration + sceneParams.fadeOutDuration;

    const totalFrames = frameRate*totalDuration;
    const frames = [];
    const videoFrames = [];
    let currentFrame = 0;
    for (let i=0;i<totalFrames;i++) {
        const currentTime = (i/frameRate);
        updateBugMeshs(currentTime);

        scene.render();

        // capture canvas and add it to frames

        const imgString = scene.canvas.toDataURL('image/jpeg',1);
        const data = convertDataURIToBinary( imgString );

        currentFrame += 1;

        if (!renderSettings.skipFirstFrame || currentFrame>1) {
                // @ts-ignore
            videoFrames.push({
                name: `img${ pad( videoFrames.length, 3 ) }.jpeg`,
                data
            });
        }

    }

    console.log(videoFrames);
    console.log(frames);

    const videoBlob = await createVideo(videoFrames, {
      audio: false,
      width: scene.canvas.width,
      height: scene.canvas.height,
    });

    const downloadURL = URL.createObjectURL(videoBlob);

    console.log(downloadURL);

    // let downloadBtn = document.getElementById('itemDownload');
    // downloadBtn.style.zIndex = 1;
    // downloadBtn.href = downloadURL;



}

function convertDataURIToBinary(dataURI) {
  var base64 = dataURI.replace(/^data[^,]+,/,'');
  var raw = window.atob(base64);
  var rawLength = raw.length;

  var array = new Uint8Array(new ArrayBuffer(rawLength));
  for (let i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
  }
  return array;
};

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
 


// const renderVideoObj = { Render:function(){ renderSceneVisual(); }};
// gui.add(renderVideoObj,'Render');


