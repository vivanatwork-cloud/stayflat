"use client";
import { Show } from "@clerk/nextjs";
import { AccountMenu } from "@/components/brand/account-menu";
export function ReferencePage({src,title}:{src:string;title:string}){const frame=<iframe src={src} title={title} className="reference-page"/>;if(!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)return frame;return <>{frame}<Show when="signed-in"><div className="account-control"><AccountMenu/></div></Show></>}
