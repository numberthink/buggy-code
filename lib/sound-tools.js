export const calcDopplerFactor = (zSpeed, speedOfSound=343) => {
    const freqFactor = ((speedOfSound)/(speedOfSound + zSpeed));
    return freqFactor;
}

export const clampFrequency = (freq,bufferPct=1) => {
    let maxFreq = 20500*bufferPct;
    let minFreq = -20500*bufferPct;

    return Math.max(Math.min(freq,maxFreq),minFreq); 
}