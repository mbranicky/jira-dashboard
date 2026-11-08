import {useEffect,useState} from 'react';
import {AccessibilityInfo} from 'react-native';

// Default to no motion until the platform preference is known. Subscribe so a
// preference changed while Paseo is open takes effect without a plugin reload.
export function useReducedMotion(){
 const [reduced,setReduced]=useState(true);
 useEffect(()=>{let active=true;let changed=false;
  const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{changed=true;setReduced(value);});
  void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active&&!changed)setReduced(value);}).catch(()=>{});
  return ()=>{active=false;subscription.remove();};
 },[]);
 return reduced;
}
