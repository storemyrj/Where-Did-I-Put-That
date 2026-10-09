import MemoryApp from './memory-app';
import {LoginLanding} from '@/components/login-landing';
import {getChatGPTUser} from './chatgpt-auth';
import {googleConfigured,googleMode} from '@/lib/google-auth-server';
import {headers} from 'next/headers';

export const dynamic='force-dynamic';
export default async function Page(){
  if(googleMode()&&!(await getChatGPTUser())){
    const accept=(await headers()).get('accept-language')||'';
    const language=/^(nb|nn|no)/i.test(accept)?'no' as const:'en' as const;
    return <LoginLanding language={language} configured={googleConfigured()}/>;
  }
  return <MemoryApp/>;
}
