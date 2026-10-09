import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {googleConfigured,googleMode} from '@/lib/google-auth-server';
import {LoginLanding} from '@/components/login-landing';

export const dynamic='force-dynamic';
export default async function LoginPage({searchParams}:{
  searchParams:Promise<{error?:string}>;
}){
  if(googleMode()&&await getChatGPTUser())redirect('/');
  const accept=(await headers()).get('accept-language')||'';
  const language=/^(nb|nn|no)/i.test(accept)?'no' as const:'en' as const;
  const {error}=await searchParams;
  return <LoginLanding language={language} usingGoogle={googleMode()} configured={googleConfigured()} error={error}/>;
}
