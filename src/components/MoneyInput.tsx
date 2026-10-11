import { Input } from './ui/input';
import { formatBRL } from '@/lib/format';
export function MoneyInput({value,onChange,id}:{value:number;onChange:(v:number)=>void;id?:string}){return <Input id={id} inputMode="numeric" value={formatBRL(value)} onChange={e=>onChange(Number(e.target.value.replace(/\D/g,'').slice(0,12))/100)} className="h-11 rounded-xl" />;}
