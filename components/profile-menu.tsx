'use client';

import {Switch} from '@/components/ui/switch';

type ProfileMenuProps={
  displayName:string;
  email:string;
  picture:string;
  pictureFailed:boolean;
  onPictureError:()=>void;
  language:'no'|'en';
  onLanguageChange:(language:'no'|'en')=>void;
  authenticated:boolean;
  googleAuth:boolean;
};

export function ProfileMenu({
  displayName,email,picture,pictureFailed,onPictureError,
  language,onLanguageChange,authenticated,googleAuth,
}:ProfileMenuProps){
  const no=language==='no';
  const initial=(displayName||email||'?').trim().charAt(0).toLocaleUpperCase();
  const showPicture=authenticated&&Boolean(picture)&&!pictureFailed;
  return (
    <div className="profile-menu top-profile-menu" role="dialog" aria-label={no?'Profil og språk':'Profile and language'}>
      <div className="profile-menu-identity">
        <span className="profile-menu-picture" aria-hidden="true">
          {showPicture?<img src={picture} alt="" referrerPolicy="no-referrer" onError={onPictureError}/>:initial}
        </span>
        <div className="profile-menu-details">
          <span className="profile-menu-name" title={displayName}>{displayName||(no?'Min konto':'My account')}</span>
          <span className="profile-menu-email" title={email}>{email}</span>
        </div>
      </div>
      <div className="profile-menu-language">
        <span className="profile-menu-language-label" id="profile-language-label">{no?'Språk':'Language'}</span>
        <div className="profile-menu-language-control">
          <span className={no?'profile-language-active':'profile-language-inactive'} aria-hidden="true">NO</span>
          <Switch
            className="profile-language-switch"
            checked={language==='en'}
            onCheckedChange={checked=>onLanguageChange(checked?'en':'no')}
            aria-labelledby="profile-language-label"
            aria-label={no?'Bytt til engelsk':'Switch to Norwegian'}
          />
          <span className={!no?'profile-language-active':'profile-language-inactive'} aria-hidden="true">EN</span>
        </div>
      </div>
      {authenticated?googleAuth?(
        <form method="post" action="/auth/logout" className="profile-menu-signout">
          <button type="submit" className="profile-logout">{no?'Logg ut':'Sign out'}</button>
        </form>
      ):(
        <a className="profile-logout" href="/cdn-cgi/access/logout" target="_top">{no?'Logg ut':'Sign out'}</a>
      ):(
        <a className="profile-login" href="/login">{no?'Logg inn':'Sign in'}</a>
      )}
    </div>
  );
}
