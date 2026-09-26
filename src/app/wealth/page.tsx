import type {Metadata} from 'next';
import {auth,currentUser} from '@clerk/nextjs/server';
import {notFound,redirect} from 'next/navigation';
import WealthApp from '@/components/wealth/app';
import {wealthAccess} from '@/lib/wealth/access';
import './wealth.css';
export const metadata:Metadata={title:'WealthOS',description:'Your private financial workspace.',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function WealthPage(){
 const session=await auth();
 if(!session.userId)redirect('/sign-in?redirect_url=/wealth');
 const user=await currentUser();
 const primary=user?.primaryEmailAddress;
 if(wealthAccess(session.userId,primary?.emailAddress,primary?.verification?.status)!=='allow')notFound();
 return <section className="wealth-root dark"><WealthApp ownerId={session.userId}/></section>;
}
