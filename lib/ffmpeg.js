
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
            args = ["-r", "29.97", "-i", "img%03d.jpeg","-i" , "test_audio.mp3", "-shortest", "-c:v", "libx264", "-crf", "1", "-vf", 'scale='+String(settings.width) + ':'+ String(settings.height), "-pix_fmt", "yuv420p", "-vb", "20M", "out.mp4"];
        }
        else {
            args = ["-r", "29.97", "-i", "img%03d.jpeg", "-shortest", "-c:v", "libx264", "-crf", "1", "-vf", 'scale='+String(settings.width) + ':'+ String(settings.height), "-pix_fmt", "yuv420p", "-vb", "20M", "out.mp4"];
        }

    
        // https://trac.ffmpeg.org/wiki/Slideshow
        // https://semisignal.com/tag/ffmpeg-js/
        worker.postMessage({
            type: 'run',
            TOTAL_MEMORY: 1068435456, // 268435456 568435456
            //arguments: 'ffmpeg -framerate 24 -i img%03d.jpeg output.mp4'.split(' '),
            //arguments: ["-r", "29.97", "-i", "img%03d.jpeg", "-c:v", "libx264", "-crf", "1", "-vf", 'scale='+String(settings.outputDimensions.width) + ':'+ String(settings.outputDimensions.height), "-pix_fmt", "yuv420p", "-vb", "20M", "out.mp4"],
            arguments: args,
            //arguments: '-r 60 -i img%03d.jpeg -c:v libx264 -crf 1 -vf -pix_fmt yuv420p -vb 20M out.mp4'.split(' '),
            //arguments: [ "-loop" ,"1", "-y", "-i" ,"img001.jpeg","video.mp4"],
            //arguments: ["-i","img000.jpeg" -i narrate.wav -acodec libvo_aacenc -vcodec libx264 final.flv],
            //arguments: ["-loop" ,"1", "-y", "-i" ,"img001.jpeg","-i","test_audio.mp4","-shortest","video.mp4"],
            //arguments: ["-i","img000.jpeg", "-i", "test_audio.mp3","-acodec", "libvo_aacenc", "-vcodec", "libx264", "final.mp4"],
            //arguments: ["-r" ,"1", "-loop", "1", "-y", "-i","img000.jpeg", "-i", "test_audio.mp3", "-c:a", "copy", "-r", "1" ,"-vcodec" ,"libx264" ,"-shortest", "video.mp4"],
            //arguments: ["-i", "img000.jpeg", "-i","test_audio.mp3", "result.mp4"], 
            //arguments: ["ffmpeg","-loop", "1","-i","img000.jpeg", "-c:v", "libx264","-c:a", "aac","-b:a", "192k" ,"-shortest", "out.mp4"],
            //arguments: ["-loop", "1" ,"-i", "img000.jpeg", "-i", "test_audio.mp3", "-c:v", "libx264","-tune", "stillimage" ,"-c:a", "aac","-b:a" ,"192k", "-pix_fmt", "yuv420p" ,"-shortest" ,"out.mp4"],
            MEMFS: videoData,
        });
    })

}