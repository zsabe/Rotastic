/* Run with: node tests/excel-rota-engine.test.cjs
   Independent of the existing UI and legacy scheduler. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{},console};ctx.globalThis=ctx.window;vm.createContext(ctx);
for(const file of ['rotastic-excel-rota-contract.js','rotastic-excel-rota-engine.js'])
 vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const {generate,toWorkbookCells,assertValid}=ctx.window.rotasticExcelRotaEngine;
const {audit}=ctx.window.rotasticExcelRotaContract;
const dates=['2026-11-01','2026-11-02','2026-11-03','2026-11-04','2026-11-05'];
const offByDate={
 '2026-11-01':['Dr Gani M.','Dr Rida C.','Dr Shadi T'],
 '2026-11-02':['Dr Gani M.','Dr Rida C.','Dr Shadi T'],
 '2026-11-03':['Dr Gani M.','Dr Rida C.','Dr Imran A.','Dr Aminullah Z.'],
 '2026-11-04':['Dr Gani M.','Dr Imran A.','Dr Aminullah Z.','Dr Mohammed S.'],
 '2026-11-05':['Dr Gani M.','Dr Imran A.','Dr Aminullah Z.','Dr Mohammed S.']
};
const leaveByDate=Object.fromEntries(dates.map(d=>[d,['Dr Bilal C.']]));
const result=generate({weekStart:'2026-11-01',offByDate,leaveByDate});
assertValid(result);
assert.equal(result.days.length,5);
for(const day of result.days)for(const shift of Object.values(day.shifts)){
 assert.equal(shift.unassigned.length,0);
 assert(shift.audit.ok);
 const all=[...Object.values(shift.rooms),...shift.twilight,...shift.specialClinics.map(x=>x.doctor)];
 assert.equal(new Set(all).size,all.length,'no double clinic/twilight assignment');
 assert.equal(new Set(Object.values(shift.er)).size,3,'ER roles unique');
 assert.equal(new Set(Object.values(shift.codeBlue)).size,3,'Code Blue roles unique');
 assert(!all.some(n=>/gani|ghani|bilal/i.test(n)),'OFF/leave doctors absent');
}
const cells=toWorkbookCells(result);
assert.equal(cells.D3,result.days[0].shifts.AM.rooms[9]);
assert.equal(cells.C4,result.days[0].shifts.AM.er.male);
assert.equal(cells.L4,result.days[0].shifts.AM.codeBlue.TL);
assert.equal(cells.L10,result.days[0].shifts.PM.codeBlue.TL);
const missing=audit({dayIndex:0,session:'AM',assignments:[],off:offByDate['2026-11-01'],leave:leaveByDate['2026-11-01']});
assert.equal(missing.ok,false);
assert(missing.missing.length>0);
console.log('Excel-first prototype tests passed; workbook execution and UI/export parity still unverified.');
