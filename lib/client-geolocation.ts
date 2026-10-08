import type {Coordinate} from './memory-suggestions';
import type {LocationMode} from './preferences';

/** Ask the browser only when a user explicitly requests it or while suggesting a place. */
export async function getPositionOnce(mode:LocationMode):Promise<Coordinate>{
 if(mode==='off')throw new Error('Location is disabled in settings.');
 if(typeof navigator==='undefined'||!navigator.geolocation)throw new Error('This browser does not support location.');
 const highAccuracy=mode==='precise';
 const position=await new Promise<GeolocationPosition>((resolve,reject)=>{
  navigator.geolocation.getCurrentPosition(resolve,reject,{
    enableHighAccuracy:highAccuracy,timeout:9500,maximumAge:120000,
  });
 });
 const {latitude,longitude,accuracy}=position.coords;
 // Deliberately reduce precision when using approximate positioning.
 return mode==='precise'
   ?{latitude,longitude,accuracy}
   :{latitude:Math.round(latitude*100)/100,longitude:Math.round(longitude*100)/100,accuracy:Math.max(accuracy,1100)};
}
