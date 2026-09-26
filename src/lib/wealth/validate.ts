import { z } from 'zod';
import { assetTypes, type Workspace } from './types';
const text=z.string().max(10000),id=z.string().min(1).max(200);
const money=z.string().regex(/^-?\d+(\.\d{1,2})?$/).max(25);
const currency=z.enum(['INR','USD','USDC','USDT']);
const ownership=z.enum(['Personal','Business']);
const date=z.string().refine(s=>!Number.isNaN(Date.parse(s)),'Invalid date');
const account=z.object({id,name:text,institution:text,type:z.enum(assetTypes),currency,balance:money,ownership,updatedAt:date,archived:z.boolean()});
const holding=z.object({id,accountId:id,name:text,symbol:text,type:z.enum(assetTypes),currency,quantity:z.string().refine(s=>Number.isFinite(Number(s))&&Number(s)>0),invested:money,value:money,updatedAt:date,sip:money.optional(),nextSip:date.optional(),maturity:date.optional(),rate:text.optional()});
const transaction=z.object({id,accountId:id,date,direction:z.enum(['Income','Expense','Transfer']),amount:money,currency,merchant:text,category:text,ownership,note:text,fingerprint:text.optional(),sourceId:id.optional(),tags:text.optional()});
const snapshot=z.object({id,date,total:money,fx:money,composition:z.record(money)});
const event=z.object({id,title:text,date,amount:money,currency,type:text,frequency:z.enum(['Once','Monthly','Yearly'])});
const source=z.object({id,name:text,date,accountId:id,rows:z.number().int().nonnegative(),raw:z.string().max(5000000)});
const card=z.object({id,name:text,limit:money,available:money,spend:money,due:money,dueDate:date,updatedAt:date});
const data=z.object({accounts:z.array(account),holdings:z.array(holding),transactions:z.array(transaction),snapshots:z.array(snapshot),events:z.array(event),sources:z.array(source),cards:z.array(card),fx:money.refine(s=>Number(s)>0),fxDate:z.string(),goal:money.refine(s=>Number(s)>0),growth:z.string().refine(s=>Number.isFinite(Number(s))&&Number(s)>=0&&Number(s)<=100),targets:z.record(z.number().min(0).max(100)),staleDays:z.number().int().min(1),holdingHistory:z.array(z.object({id,date,accountId:id,holdings:z.array(holding)})).optional()});
const workspace=z.object({version:z.literal(1),data,audit:z.array(z.object({id,date,action:text,before:data}))});
export function validateWorkspace(value:unknown):Workspace{const result=workspace.safeParse(value);if(!result.success)throw new Error(`Invalid backup: ${result.error.issues[0].path.join('.')} — ${result.error.issues[0].message}`);const d=result.data.data;const ids=new Set(d.accounts.map(a=>a.id));if(ids.size!==d.accounts.length)throw new Error('Duplicate account identifiers.');for(const h of [...d.holdings,...d.transactions])if(!ids.has(h.accountId))throw new Error('A record refers to a missing account.');return result.data as Workspace;}
