import type {ComponentType} from 'react';
import {Bath,BedDouble,Bike,BriefcaseBusiness,Car,Caravan,CookingPot,DoorOpen,House,MapPin,PackageOpen,Plane,Sofa,Warehouse,Shirt,Building2,Ship,Backpack,Luggage,Boxes,UtensilsCrossed} from 'lucide-react';

export const locationIconChoices=[
  ['home','Hjem / Home'],['apartment','Leilighet / Apartment'],['cabin','Hytte / Cabin'],
  ['kitchen','Kjøkken / Kitchen'],['living','Stue / Living room'],['bedroom','Soverom / Bedroom'],
  ['bathroom','Bad / Bathroom'],['hallway','Gang / Hallway'],['garage','Garasje / Garage'],
  ['storage','Bod / Storage'],['basement','Kjeller / Basement'],['attic','Loft / Attic'],
  ['laundry','Vaskerom / Laundry'],['office','Kontor / Office'],['car','Bil / Car'],
  ['boat','Båt / Boat'],['bike','Sykkel / Bicycle'],['backpack','Ryggsekk / Backpack'],
  ['luggage','Koffert / Suitcase'],['travel','Reise / Travel'],['dining','Spiseplass / Dining'],
  ['coat','🧥 Jakke / Coat'],['pocket','👖 Lomme / Pocket'],['wardrobe','Garderobe / Wardrobe'],
  ['place','Annet sted / Other place'],
] as const;

const icons:Record<string,ComponentType<{size?:number;className?:string}>>={
  home:House,apartment:Building2,cabin:Caravan,kitchen:CookingPot,living:Sofa,
  bedroom:BedDouble,bathroom:Bath,hallway:DoorOpen,garage:Car,storage:Warehouse,
  basement:Boxes,attic:Boxes,laundry:Shirt,office:BriefcaseBusiness,car:Car,
  boat:Ship,bike:Bike,backpack:Backpack,luggage:Luggage,travel:Plane,
  dining:UtensilsCrossed,place:MapPin,wardrobe:Shirt,
};

export function suggestedLocationIcon(name:string){
  const value=name.toLocaleLowerCase('nb-NO');
  if(/kjøkken|kitchen/.test(value))return 'kitchen';
  if(/stue|living/.test(value))return 'living';
  if(/soverom|bedroom/.test(value))return 'bedroom';
  if(/bad|bath/.test(value))return 'bathroom';
  if(/gang|hall/.test(value))return 'hallway';
  if(/garasje|garage/.test(value))return 'garage';
  if(/bil|car/.test(value))return 'car';
  if(/båt|boat/.test(value))return 'boat';
  if(/sykkel|bike/.test(value))return 'bike';
  if(/ryggsekk|backpack/.test(value))return 'backpack';
  if(/koffert|suitcase|luggage/.test(value))return 'luggage';
  if(/jakke|jakk|coat|jacket|frakk/.test(value))return 'coat';
  if(/lomme|pocket/.test(value))return 'pocket';
  if(/garderobe|wardrobe|klesskap|closet/.test(value))return 'wardrobe';
  if(/vask|laundry/.test(value))return 'laundry';
  if(/kjeller|basement/.test(value))return 'basement';
  if(/loft|attic/.test(value))return 'attic';
  if(/bod|storage|skap|drawer|skuff/.test(value))return 'storage';
  if(/kontor|office|jobb|work/.test(value))return 'office';
  if(/leilighet|apartment/.test(value))return 'apartment';
  if(/hytte|cabin/.test(value))return 'cabin';
  if(/hjem|home|hus|house/.test(value))return 'home';
  if(/reise|travel/.test(value))return 'travel';
  return 'place';
}

export function LocationIcon({icon,name,size=17,className}:{icon?:string|null;name:string;size?:number;className?:string}){
  const chosen=icon||suggestedLocationIcon(name);
  if(chosen==='coat'||chosen==='pocket')return <span role="img" aria-label={chosen==='coat'?'Jakke / Coat':'Lomme / Pocket'} className={className} style={{fontSize:size,lineHeight:1}}>{chosen==='coat'?'🧥':'👖'}</span>;
  const Icon=icons[chosen]||PackageOpen;
  return <Icon size={size} className={className}/>;
}
