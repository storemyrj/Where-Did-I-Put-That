import { getChatGPTUser } from '../../chatgpt-auth';
import { database, bucket } from '@/lib/storage';

const json=(body:unknown,status=200)=>Response.json(body,{status});

export async function GET(){
  const u=await getChatGPTUser();
  if(!u)return json({error:'Please sign in to access your memories.'},401);
  try{
    const db=database();
    const [items,locations,history,profile]=await Promise.all([
      db.prepare('SELECT * FROM items WHERE user_id=? ORDER BY updated_at DESC').bind(u.userId).all(),
      db.prepare('SELECT * FROM locations WHERE user_id=?').bind(u.userId).all(),
      db.prepare('SELECT h.* FROM location_history h JOIN items i ON i.id=h.item_id WHERE i.user_id=? ORDER BY timestamp DESC').bind(u.userId).all(),
      db.prepare('SELECT * FROM users WHERE id=?').bind(u.userId).first(),
    ]);
    return json({items:items.results,locations:locations.results,history:history.results,user:{name:u.fullName,email:u.email},notifications:profile?.notifications??'off'});
  }catch(e){console.error(e);return json({error:'Your memories are unavailable right now. Please try again.'},503);}
}

async function ensureLocation(db:ReturnType<typeof database>,userId:string,names:string[],fallback='Usortert'){
  const path=names.filter((name):name is string=>typeof name==='string'&&name.trim()).map(name=>name.trim());
  const segments=path.length?path:[fallback];
  let parent:string|null=null;
  const statements=[];
  for(const name of segments){
    const found:any=await db.prepare('SELECT id FROM locations WHERE user_id=? AND name=? AND parent_location_id IS ?').bind(userId,name,parent).first();
    const id=found?.id??crypto.randomUUID();
    if(!found)statements.push(db.prepare('INSERT INTO locations (id,user_id,name,parent_location_id) VALUES (?,?,?,?)').bind(id,userId,name,parent));
    parent=id;
  }
  return {id:parent!,statements};
}

export async function POST(req:Request){
  const u=await getChatGPTUser();
  if(!u)return json({error:'Please sign in first.'},401);
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return new Response('Forbidden',{status:403});
  try{
    const p=await req.json() as any;
    const db=database();
    const now=new Date().toISOString();

    if(p.action==='notifications'){
      await db.prepare('INSERT INTO users (id,name,email,created_at,notifications) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET notifications=excluded.notifications').bind(u.userId,u.fullName,u.email,now,p.enabled?'on':'off').run();
      return json({ok:true});
    }

    if(p.action==='location_create'){
      if(typeof p.name!=='string'||!p.name.trim())return json({error:'A location name is required.'},400);
      const id=crypto.randomUUID();
      await db.prepare('INSERT INTO locations (id,user_id,name,parent_location_id,address) VALUES (?,?,?,?,?)').bind(id,u.userId,p.name.trim(),p.parentId||null,typeof p.address==='string'&&p.address.trim()?p.address.trim():null).run();
      return json({ok:true,id});
    }

    if(p.action==='location_delete'){
      if(typeof p.id!=='string')return json({error:'Location not found.'},400);
      await db.prepare('DELETE FROM locations WHERE id=? AND user_id=?').bind(p.id,u.userId).run();
      return json({ok:true});
    }

    if(p.action==='delete'||p.action==='clear'||p.action==='account'){
      const selected=(await db.prepare('SELECT id,photo FROM items WHERE user_id=?').bind(u.userId).all()).results.filter((i:any)=>p.action!=='delete'||i.id===p.id);
      const batch=selected.flatMap((i:any)=>[db.prepare('DELETE FROM location_history WHERE item_id=?').bind(i.id),db.prepare('DELETE FROM items WHERE id=? AND user_id=?').bind(i.id,u.userId)]);
      if(p.action!=='delete')batch.push(db.prepare('DELETE FROM locations WHERE user_id=?').bind(u.userId));
      if(p.action==='account')batch.push(db.prepare('DELETE FROM users WHERE id=?').bind(u.userId));
      if(batch.length)await db.batch(batch);
      for(const i of selected)if(i.photo)await bucket().delete(String(i.photo));
      return json({ok:true});
    }

    if(typeof p.name!=='string'||!p.name.trim()||p.name.length>120)return json({error:'An item name is required.'},400);
    if(p.description!=null&&(typeof p.description!=='string'||p.description.length>2000))return json({error:'The note is too long.'},400);
    if(p.photo&&(typeof p.photo!=='string'||!p.photo.startsWith(u.userId+'/')))return json({error:'Invalid photo'},400);

    let existing:any=null;
    if(p.id){
      existing=await db.prepare('SELECT * FROM items WHERE id=? AND user_id=?').bind(p.id,u.userId).first();
      if(!existing)return new Response('Not found',{status:404});
    }

    const coordinates=typeof p.latitude==='number'&&typeof p.longitude==='number'&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude);
    const fallback=p.language==='en'?'Unsorted':'Usortert';
    const {id:locationId,statements}=await ensureLocation(db,u.userId,Array.isArray(p.location)?p.location:[],fallback);
    const id=existing?.id??crypto.randomUUID();
    statements.push(db.prepare('INSERT INTO users (id,name,email,created_at) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(u.userId,u.fullName,u.email,now));

    if(existing){
      statements.push(db.prepare('UPDATE items SET name=?,description=?,current_location_id=?,temporary_until=?,photo=?,saved_latitude=?,saved_longitude=?,saved_location_precision=?,updated_at=? WHERE id=? AND user_id=?').bind(
        p.name.trim(),p.description?.trim()||null,locationId,p.temporaryUntil||null,p.photo??existing.photo,coordinates?p.latitude:null,coordinates?p.longitude:null,coordinates?(p.locationPrecision==='approximate'?'approximate':'precise'):null,now,id,u.userId
      ));
    }else{
      statements.push(db.prepare('INSERT INTO items (id,user_id,name,description,current_location_id,temporary_until,photo,saved_latitude,saved_longitude,saved_location_precision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(
        id,u.userId,p.name.trim(),p.description?.trim()||null,locationId,p.temporaryUntil||null,p.photo||null,coordinates?p.latitude:null,coordinates?p.longitude:null,coordinates?(p.locationPrecision==='approximate'?'approximate':'precise'):null,now,now
      ));
    }
    statements.push(db.prepare('INSERT INTO location_history (id,item_id,location_id,timestamp,source) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),id,locationId,now,['typed','voice','manual edit'].includes(p.source)?p.source:'typed'));
    await db.batch(statements);
    return json({ok:true,id});
  }catch(e){console.error(e);return json({error:'I couldn’t save that. Your text is still here; please try again.'},503);}
}