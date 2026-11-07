/* Excel-first rota contract: independent of the existing UI and legacy generator.
   This module validates the output of a workbook-backed assignment engine.
   It intentionally does NOT claim the uploaded workbook generates assignments:
   its COUNTIF/COUNTIFS formulas count manually-entered names. */
(function(root){
'use strict';
const groups={
  group1:['Dr Aminullah Z.','Dr Fahima N.','Dr Enan M.','Dr Faisal C.','Dr Fazila K.','Dr Imran A.','Dr Laila A.','Dr Maya S.','Dr Mohamed M.','Dr Mohammed S.','Dr Muhammad K.','Dr Rida C.','Dr Saima N.','Dr Salah M.','Dr Shadi T','Dr Gani M.'],
  group2:['Dr Husam S','Dr Maher A.','Dr Zaid SE.','Dr Selman E.','Dr Syed I.','Dr Abdulrashid S.','Dr Oula T.','Dr Tayseer A.','Dr Saba T.','Dr Bilal C.','Dr Laith A.','Dr Abdulgafoor K.']
};
const key=n=>String(n||'').toLowerCase().replace(/^dr\\.?\\s*/,'').replace(/[^a-z0-9]/g,'');
const aliases={'ghan im':'ganim','ghanim':'ganim','muhammadk':'muhammadk','qaisar':'muhammadk','qaisark':'muhammadk','mohamedsayed':'mohammeds','mohammedsayed':'mohammeds'};
function identity(n){let k=key(n);if(/^ghani/.test(k))return 'ganim';return aliases[k]||k;}
const roster=[...groups.group1,...groups.group2];
const allKeys=new Set(roster.map(identity));
function sessionGroup(dayIndex,session){if(!Number.isInteger(dayIndex)||dayIndex<0||dayIndex>4||!['AM','PM'].includes(session))throw Error('Invalid day/session');return (dayIndex<3)===(session==='AM')?'group1':'group2';}
function audit(input){
 const {dayIndex,session,assignments=[],off=[],leave=[]}=input||{};
 const group=sessionGroup(dayIndex,session),eligible=groups[group];
 const excluded=new Set([...off,...leave,'Dr Fahima N.'].map(identity));
 const seen=new Map(),errors=[],unknown=[];
 for(const a of assignments){
   const name=typeof a==='string'?a:a?.doctor;
   if(!name||/^(tbd|to be determined|pending)$/i.test(name)) {errors.push('Unfilled assignment');continue;}
   const k=identity(name);
   if(!allKeys.has(k)&&k!=='moursi'&&k!=='mmoursi')unknown.push(name);
   if(excluded.has(k))errors.push(name+' is OFF/leave but assigned');
   if(allKeys.has(k)&&!eligible.some(n=>identity(n)===k))errors.push(name+' belongs to the other group');
   if(!seen.has(k))seen.set(k,[]);
   seen.get(k).push(a);
 }
 const missing=eligible.filter(n=>!excluded.has(identity(n))&&!seen.has(identity(n)));
 return {ok:errors.length===0&&missing.length===0&&unknown.length===0,group,missing,errors,unknown,accountedFor:eligible.filter(n=>excluded.has(identity(n))||seen.has(identity(n))).length,expected:eligible.length};
}
root.rotasticExcelRotaContract=Object.freeze({groups,roster,sessionGroup,audit});
})(typeof window!=='undefined'?window:globalThis);
