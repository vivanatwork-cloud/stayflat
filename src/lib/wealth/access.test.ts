import {describe,it,expect} from 'vitest';
import {wealthAccess,wealthStorageKey} from './access';
describe('private wealth access',()=>{
 it('requires sign-in',()=>expect(wealthAccess(null,undefined,undefined)).toBe('sign-in'));
 it('allows only the verified configured admin',()=>expect(wealthAccess('owner','vivanatwork@gmail.com','verified')).toBe('allow'));
 it('rejects ordinary signed-in customers',()=>expect(wealthAccess('customer','someone@example.com','verified')).toBe('not-found'));
 it('rejects an unverified admin email',()=>expect(wealthAccess('owner','vivanatwork@gmail.com','unverified')).toBe('not-found'));
 it('uses a distinct browser storage key per account',()=>expect(wealthStorageKey('owner')).not.toBe(wealthStorageKey('customer')));
});
