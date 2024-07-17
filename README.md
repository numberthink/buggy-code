# Buggy code

This buggy code creates a scene with a bunch of bugs flying and buzzing around. 

## Buzzing sound

It uses the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) to create the "buzzing" oscillators.

It applies the [Doppler effect](https://en.wikipedia.org/wiki/Doppler_effect) to the frequency of the oscillators to give it some of that characteristic "bug buzzing in ear" effect. 

## Bugs

The "bugs" are made with [Three.js](https://threejs.org/). They are composed of spheres placed side-by-side, with two little spheres for the eyes, and two cyclinders for the antenna. 

## Running locally

To run locally:

```bash 
npm install

npm run dev

```
