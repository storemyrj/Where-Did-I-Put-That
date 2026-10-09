import {Box,MapPin,Search,Mic,ShieldCheck,ArrowRight} from 'lucide-react';
import Link from 'next/link';

export function LoginLanding({language,configured,error,usingGoogle=true}:{
  language:'no'|'en';configured:boolean;error?:string;usingGoogle?:boolean;
}){
  const no=language==='no';
  const err=!usingGoogle?null:error==='expired'?(no?'Innloggingen tok for lang tid. Prøv igjen.':'Sign-in expired. Please try again.'):
    error==='cancelled'?(no?'Innloggingen ble avbrutt.':'Sign-in was cancelled.'):
    error==='failed'?(no?'Kunne ikke fullføre Google-innloggingen. Prøv igjen.':'Google sign-in could not be completed. Please try again.'):
    error==='configuration'||!configured?(no?'Google-innloggingen må aktiveres av administrator.':'Google sign-in needs to be configured by the administrator.'):
    null;
  return <main className="login-screen">
    <header className="login-header">
      <div className="login-brand"><div className="login-brand-icon"><Box size={31}/><MapPin size={19}/></div><strong>Where Did<br/>I Put That<span className="green">?</span></strong></div>
      <span className="login-language">{no?'Din private minnebank':'Your personal memory bank'}</span>
    </header>
    <section className="login-center">
      <div className="login-illustration" aria-hidden="true">
        <span><Search size={30}/></span><span><Box size={38}/></span><span><Mic size={30}/></span>
      </div>
      <h1>{no?'Slipp å lure på hvor du la den.':'Never wonder where you put it again.'}</h1>
      <p>{no?'Husk hvor tingene dine er, finn dem igjen på sekunder og ha minnene dine tilgjengelig når du trenger dem.':
        'Remember where your things are, find them in seconds, and keep your memories available whenever you need them.'}</p>
      {err&&<div className="login-error" role="alert">{err}</div>}
      {usingGoogle&&configured?<a className="login-google-button" href="/auth/google/start">
        <span className="login-google-symbol" aria-hidden="true">G</span>
        {no?'Fortsett med Google':'Continue with Google'}
        <ArrowRight size={19}/>
      </a>:usingGoogle?<span className="login-google-button disabled" aria-disabled="true">{no?'Google-innlogging blir snart tilgjengelig':'Google sign-in will be available soon'}</span>:<Link className="login-google-button" href="/">{no?'Gå til appen':'Open the app'}<ArrowRight size={19}/></Link>}
      <div className="login-privacy"><ShieldCheck size={18}/>{no?'Kun dine egne minner. Ingen tilgang til Gmail eller Google Disk.':'Only your own memories. No access to Gmail or Google Drive.'}</div>
    </section>
  </main>;
}
