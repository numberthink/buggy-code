
let worker;

export const createVideo = (videoData, settings) => {
    return new Promise((resolve, reject) => {
        let messages = '';
        worker = new Worker('/workers/ffmpeg-worker-mp4.js');
        worker.onmessage = function(e) {
            var msg = e.data;
            console.log(msg);
            switch (msg.type) {
                case "stdout":
                case "stderr":
                    messages += msg.data + "\n";
                    break;
                case "exit":
                    console.log("Process exited with code " + msg.data);
                    //worker.terminate();
                    break;
    
                case 'done':
                    const blob = new Blob([msg.data.MEMFS[0].data], {
                        type: "video/mp4"
                    });
                    resolve( blob )
    
                break;
            }
    
        };

        let args;
        if (settings.audio) {
            args = ["-r", "29.97", "-i", "img%03d.jpeg","-i" , "audio.mp3", "-shortest", "-c:v", "libx264", "-crf", "1", "-vf", 'scale='+String(settings.width) + ':'+ String(settings.height), "-pix_fmt", "yuv420p", "-vb", "20M", "out.mp4"];
        }
        else {
            args = ["-r", "29.97", "-i", "img%03d.jpeg", "-shortest", "-c:v", "libx264", "-crf", "1", "-vf", 'scale='+String(settings.width) + ':'+ String(settings.height), "-pix_fmt", "yuv420p", "-vb", "20M", "out.mp4"];
        }

    
        // https://trac.ffmpeg.org/wiki/Slideshow
        // https://semisignal.com/tag/ffmpeg-js/
        worker.postMessage({
            type: 'run',
            TOTAL_MEMORY: 1068435456, // 268435456 568435456
            arguments: args,
            MEMFS: videoData,
        });
    })

}