import { useEffect, useState } from "react";
import Lottie from "react-lottie";

interface ConfettiProps {
  isActive?: boolean;
  duration?: number;
  autoPlay?: boolean;
  zIndex?: number;
  loop?: boolean;
}

const Confetti = ({
  isActive: externalIsActive,
  duration = 6000,
  autoPlay = false,
  zIndex = 50,
  loop = false,
}: ConfettiProps) => {
  const [isActive, setIsActive] = useState(autoPlay);

  // Sync with external control if provided
  useEffect(() => {
    if (externalIsActive !== undefined) {
      setIsActive(externalIsActive);
    }
  }, [externalIsActive]);

  // Handle auto-stop timer
  useEffect(() => {
    let timeoutId: number;
    
    if (isActive && !loop && duration > 0) {
      timeoutId = window.setTimeout(() => {
        setIsActive(false);
      }, duration);
    }
    
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isActive, duration, loop]);

  // Confetti animation options
  const lottieOptions = {
    loop: loop || true,
    autoplay: true,
    animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  if (!isActive) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex }}
    >
      <Lottie 
        options={lottieOptions} 
        height="100%" 
        width="100%" 
        isStopped={!isActive}
      />
    </div>
  );
};

const animationData = {"v":"5.5.8","fr":29.9700012207031,"ip":0,"op":300.00001221925,"w":2000,"h":2000,"nm":"Comp 1","ddd":0,"assets":[{"id":"comp_0","layers":[{"ddd":0,"ind":1,"ty":0,"nm":"BlueConfetti","refId":"comp_1","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[1000,1000,0],"ix":2},"a":{"a":0,"k":[1000,1000,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"w":2000,"h":2000,"ip":150.000006109625,"op":450.000018328876,"st":150.000006109625,"bm":0},{"ddd":0,"ind":2,"ty":0,"nm":"BlueConfetti","refId":"comp_1","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[1000,1000,0],"ix":2},"a":{"a":0,"k":[1000,1000,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"w":2000,"h":2000,"ip":0,"op":300.00001221925,"st":-150.000006109625,"bm":0},{"ddd":0,"ind":3,"ty":0,"nm":"GreenConfetti","refId":"comp_2","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[1000,1000,0],"ix":2},"a":{"a":0,"k":[1000,1000,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"w":2000,"h":2000,"ip":150.000006109625,"op":450.000018328876,"st":150.000006109625,"bm":0},{"ddd":0,"ind":4,"ty":0,"nm":"GreenConfetti","refId":"comp_2","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[1000,1000,0],"ix":2},"a":{"a":0,"k":[1000,1000,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"w":2000,"h":2000,"ip":0,"op":299.00001217852,"st":-150.000006109625,"bm":0},{"ddd":0,"ind":5,"ty":0,"nm":"YellowConfetti","refId":"comp_3","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[1000,1000,0],"ix":2},"a":{"a":0,"k":[1000,1000,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"w":2000,"h":2000,"ip":150.000006109625,"op":516.000021017111,"st":150.000006109625,"bm":0},{"ddd":0,"ind":6,"ty":0,"nm":"YellowConfetti","refId":"comp_3","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[1000,1000,0],"ix":2},"a":{"a":0,"k":[1000,1000,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"w":2000,"h":2000,"ip":0,"op":300.00001221925,"st":-149.000006068894,"bm":0},{"ddd":0,"ind":7,"ty":0,"nm":"RedConfetti","refId":"comp_4","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[1000,1000,0],"ix":2},"a":{"a":0,"k":[1000,1000,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"w":2000,"h":2000,"ip":150.000006109625,"op":750.000030548126,"st":150.000006109625,"bm":0},{"ddd":0,"ind":8,"ty":0,"nm":"RedConfetti","refId":"comp_4","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[1000,1000,0],"ix":2},"a":{"a":0,"k":[1000,1000,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"w":2000,"h":2000,"ip":0,"op":450.000018328876,"st":-150.000006109625,"bm":0}]},{"id":"comp_1","layers":[{"ddd":0,"ind":1,"ty":4,"nm":"Shape Layer 9","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[688,732,0],"ix":2},"a":{"a":0,"k":[0,0,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ty":"rc","d":1,"s":{"a":0,"k":[32,32],"ix":2},"p":{"a":0,"k":[0,0],"ix":3},"r":{"a":0,"k":0,"ix":4},"nm":"Rectangle Path 1","mn":"ADBE Vector Shape - Rect","hd":false},{"ty":"st","c":{"a":0,"k":[1,1,1,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":0,"ix":5},"lc":1,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"fl","c":{"a":0,"k":[0.054901961237,0.678431391716,1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":1,"k":[{"i":{"x":0.833,"y":0.833},"o":{"x":0.167,"y":0.167},"t":175,"s":[-256,-748],"to":[0,4.316],"ti":[0.521,-4.829]},{"i":{"x":0.833,"y":0.833},"o":{"x":0.167,"y":0.167},"t":176,"s":[-256.803,-794.275],"to":[-6.566,60.819],"ti":[0,-108.389]},{"i":{"x":0.833,"y":0.833},"o":{"x":0.167,"y":0.167},"t":196,"s":[-308,-464.77],"to":[0,131.094],"ti":[-6.457,-163.134]},{"i":{"x":0.833,"y":0.833},"o":{"x":0.167,"y":0.167},"t":231,"s":[-227.949,-12.545],"to":[7.89,199.325],"ti":[9.338,-174.954]},{"i":{"x":0.833,"y":0.833},"o":{"x":0.167,"y":0.167},"t":276,"s":[-297.153,568.725],"to":[-8.732,163.591],"ti":[0,-75.105]},{"i":{"x":0.833,"y":0.833},"o":{"x":0.167,"y":0.167},"t":305,"s":[-256,943],"to":[0,279.833],"ti":[0,-0.667]},{"t":349.000014215061,"s":[-168,1299]}],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":1,"k":[{"i":{"x":[0.833,0.833],"y":[0.833,0.833]},"o":{"x":[0.167,0.167],"y":[0.167,0.167]},"t":177,"s":[100,100]},{"i":{"x":[0.833,0.833],"y":[0.833,0.833]},"o":{"x":[0.167,0.167],"y":[0.167,0.167]},"t":211,"s":[100,1]},{"i":{"x":[0.833,0.833],"y":[0.833,0.833]},"o":{"x":[0.167,0.167],"y":[0.167,0.167]},"t":243,"s":[100,100]},{"i":{"x":[0.833,0.833],"y":[0.833,0.833]},"o":{"x":[0.167,0.167],"y":[0.167,0.167]},"t":301,"s":[100,1]},{"t":349.000014215061,"s":[100,100]}],"ix":3},"r":{"a":1,"k":[{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":175,"s":[0]},{"t":349.000014215061,"s":[277.579]}],"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Rectangle 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false}],"ip":175.000007127896,"op":1075.00004378565,"st":175.000007127896,"bm":0}]}]};

export default Confetti;
