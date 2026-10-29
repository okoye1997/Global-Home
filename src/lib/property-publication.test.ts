import { describe, expect, it } from 'vitest';
import { assertPublicationTransition, assertWorkflowTransition, publicPropertyFilter } from './property-publication';
import { assertFixtureDatabase } from './fixture-guard';

describe('production property feed',()=>{
  it('requires published, verified, evidenced, non-demo records',()=>expect(publicPropertyFilter).toEqual({status:'published',verificationStatus:'verified',isDemo:false,verifiedAt:{$exists:true,$ne:null}}));
  it('never publishes a demo listing',()=>expect(()=>assertPublicationTransition({status:'verified',verificationStatus:'verified',isDemo:true,verifiedAt:new Date(),verificationSource:'admin_review',verificationReference:'record-123'},'published')).toThrow(/Demo/));
  it('requires a verification decision before publication',()=>expect(()=>assertPublicationTransition({status:'draft',verificationStatus:'pending',isDemo:false},'published')).toThrow(/verification/));
  it('permits a verified real listing with recorded evidence',()=>expect(()=>assertPublicationTransition({status:'verified',verificationStatus:'verified',isDemo:false,verifiedAt:new Date(),verificationSource:'admin_review',verificationReference:'record-123'},'published')).not.toThrow());
  it('allows unpublishing and restoring a draft but blocks skipping archived review',()=>{expect(()=>assertWorkflowTransition('published','verified')).not.toThrow();expect(()=>assertWorkflowTransition('archived','draft')).not.toThrow();expect(()=>assertWorkflowTransition('archived','published')).toThrow();});
});
describe('synthetic fixture guard',()=>{
  it('rejects production and unmarked databases',()=>{expect(()=>assertFixtureDatabase('mongodb://localhost:27017/globalhome_dev','production','true')).toThrow();expect(()=>assertFixtureDatabase('mongodb://localhost:27017/globalhome','development','true')).toThrow();expect(()=>assertFixtureDatabase('mongodb://localhost:27017/globalhome_dev','development',undefined)).toThrow();});
  it('allows an explicitly enabled development database',()=>expect(()=>assertFixtureDatabase('mongodb://localhost:27017/globalhome_dev','development','true')).not.toThrow());
});
