import * as THREE from 'three';

class ThreeScene {
    constructor(params) {
        this.scene = params.scene;
        this.camera = params.camera;
        this.renderer = params.renderer;
        this.canvas = params.canvas;
        this.windowSizes = {
            width: params.windowWidth,
            height: params.windowHeight,
        }

        this.state = {
            rendered: false,
            frame: 0,
        }
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
        this.state.rendered = true;
        
    }

    getFrame() {
        return this.state.frame;
    }

    getDimensionsAtZ(zPosition=0) {
        const fov = this.camera.fov;
        const aspect = this.camera.aspect;
        const distanceFromCamera = Math.abs(this.camera.position.z - zPosition);

        let screenWidth = Math.tan(((fov/2)/360)*Math.PI*2)*distanceFromCamera*2;
        let screenHeight = Math.tan(((fov/2)/360)*Math.PI*2)*distanceFromCamera*2;
        screenWidth = screenWidth*(aspect);

        return {width: screenWidth, height: screenHeight};
    }


}


let threeScene;

export const setupThreeScene = () => {
    const canvas = document.getElementById('webglCanvas');

    // set up renderer
    const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio( Math.min(window.devicePixelRatio,2));
    
    // set up camera
    const camera = new THREE.PerspectiveCamera(90, window.innerWidth/window.innerHeight, .01, 105);
    camera.position.set(0 , 0 , 5 );
    camera.lookAt(new THREE.Vector3(0,0,0));
    
    
    // create scene
    const scene = new THREE.Scene();

    threeScene = new ThreeScene({
        renderer: renderer,
        camera: camera,
        scene: scene,
        canvas: canvas,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,

    });



    addListeners();
    
    startAnimation();
    

    return threeScene;
  
}

const addListeners = () => {
    addWindowResizeListener();
    addKeyDownListener();
    addDoubleClickListener();
}

const animationState = {
    animating: true,
    startTime: 0,
    elapsedTime: 0,
    deltaTime: 0,
    tickFunctions: [],
    pauseTime: 0,
    lastPauseTime: 0,
    resizeFunctions: [],
    windowSizeUpdate: false,
}


const addWindowResizeListener = () => {
    window.addEventListener('resize',() => {
        animationState.windowSizeUpdate = true;
    });
}

const onWindowResize = () => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    threeScene.renderer.setSize(windowWidth, windowHeight);
    threeScene.camera.aspect = windowWidth/windowHeight;
    threeScene.camera.updateProjectionMatrix();

    const windowSizes = {width: windowWidth, height: windowHeight};

    threeScene.windowSizes = windowSizes;

    animationState.resizeFunctions.forEach((resizeFunction) => {
        resizeFunction();
    });

    // resize videos
    for (const videoId in threeScene.videos) {
        const video = threeScene.videos[videoId];
        if (video.isOnScreen) {
            video.showOnScreen(); // resizes
        }
    }


}

export const onWindowSizeUpdate = (windowResizeFunction) => {
    animationState.resizeFunctions.push(windowResizeFunction);
}

const playPauseAnimation = () => {
    if (animationState.animating) {
        animationState.lastPauseTime = window.performance.now()/1000 - animationState.startTime;
        animationState.animating = false;
    }
    else {
        const elapsedTime = window.performance.now()/1000 - animationState.startTime;
        animationState.pauseTime = animationState.pauseTime + elapsedTime - animationState.lastPauseTime;
        animationState.animating = true;
    }
}


const addKeyDownListener = () => {
    window.addEventListener('keydown',(event)=> {
        if (event.key=='f') {
            playPauseAnimation();
        }
    })
}

const addDoubleClickListener = () => {
    threeScene.canvas.addEventListener('dblclick',(event)=> {
        playPauseAnimation();
    });

      /* Regex test to determine if user is on mobile */
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        threeScene.canvas.addEventListener('touchend', detectDoubleTapClosure(), { passive: false });
    }
}

/* Based on this http://jsfiddle.net/brettwp/J4djY/*/
function detectDoubleTapClosure() {
    let lastTap = 0;
    let timeout;
    return function detectDoubleTap(event) {
      const curTime = new Date().getTime();
      const tapLen = curTime - lastTap;
      if (tapLen < 500 && tapLen > 0) {
        event.preventDefault();
        playPauseAnimation();
      } else {
        timeout = setTimeout(() => {
          clearTimeout(timeout);
        }, 500);
      }
      lastTap = curTime;
    };
  }
  




const startAnimation = () => {
    animationState.startTime = window.performance.now()/1000;


    tick();
}

const tick = () => {

    if (animationState.animating) {
        const newElapsedTime = window.performance.now()/1000 - animationState.startTime - animationState.pauseTime;
        animationState.deltaTime = newElapsedTime - animationState.elapsedTime;
        animationState.elapsedTime = newElapsedTime;
    
        const animationArgs = {
            elapsedTime: animationState.elapsedTime,
            deltaTime: animationState.deltaTime,
        }


        if (animationState.windowSizeUpdate) {
            onWindowResize();
            animationState.windowSizeUpdate = false;
        }
    
        animationState.tickFunctions.forEach(tickFunction=> {
           tickFunction(animationArgs);
        });


        threeScene.render();
        
        threeScene.state.rendered = false;

        threeScene.state.frame +=1;

    }

    window.requestAnimationFrame(tick);

}

export const onTick = (tickFunction) => {
    animationState.tickFunctions.push(tickFunction);
}

