import { isAdminEmail } from '../admin';
export function wealthAccess(userId:string|null, email:string|undefined, verification:string|undefined):'sign-in'|'not-found'|'allow' {
 if(!userId)return 'sign-in';
 return verification==='verified'&&isAdminEmail(email)?'allow':'not-found';
}
export function wealthStorageKey(ownerId:string){return `stayflat.wealth.v1:${ownerId}`;}
