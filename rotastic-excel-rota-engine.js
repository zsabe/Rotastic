/* Workbook-driven rota prototype. Rows and columns are mapped to Book 1 (1).xlsx,
   Sheet1. No existing UI or generator is changed by this standalone module. */
(function(root){
'use strict';
const contract=root.rotasticExcelRotaContract;
if(!contract)throw Error('Load rotastic-excel-rota-contract.js first');
const ROOMS=[9,10,12,13,14,39,21,22,24,25,26,27,38];
const DAY_ROWS=[3,15,27,39,51];
const female=new Set(['fazila','laila','maya','saima','rida','oula','tayseer','saba','fahima']);
const first=n=>String(n).replace(/^dr\.?\s*/i,'').split(' ')[0].toLowerCase();
const isFemale=n=>female.has(first(n));
const isAbdul=n=>first(n)==='abdulgafoor';
const blockedCB=n=>['abdulgafoor','maher','salah','zaid'].includes(first(n))||/^mohammed\\s/i.test(n.replace(/^dr\\.?\\s*/i,''));
const blockedER=n=>first(n)==='zaid';
const nameKey=n=>String(n).toLowerCase().replace(/^dr\\.?\\s*/,'').replace(/[^a-z0-9]/g,'').replace(/^ghani/,'gani').replace(/^qaisar/,'muhammadk');
const normaliseOff=(input,dayIndex)=>Array.isArray(input)?input:(input?.[dayIndex]||[]);
function generate(options={}){
 const weekStart=options.weekStart||'2026-11-01';
 const dates=Array.from({length:5},(_,i)=>{const d=new Date(weekStart+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)});
 if(new Date(weekStart+'T12:00:00Z').getUTCDay()!==0)throw Error('Week must start on Sunday');
 const offByDate=options.offByDate||{},leaveByDate=options.leaveByDate||{},clinics=options.clinics||{anc:true,wbc:true,iud:true,sdi:true,ncd:true,smoking:true,cmc:true};
 const days=[],errors=[];
 const usage=new Map();
 const paedsUsage=new Map();
 const wbcUsage=new Map();
 let previousWBC=null;
 const lastRoom=new Map();
 for(let i=0;i<5;i++){
  const day={date:dates[i],dayIndex:i,shifts:{}};
  for(const session of ['AM','PM']){
   const group=contract.sessionGroup(i,session);
   const off=normaliseOff(offByDate[dates[i]],i);
   const leave=normaliseOff(leaveByDate[dates[i]],i);
   const excluded=new Set([...off,...leave,'Dr Fahima N.'].map(nameKey));
   const doctors=contract.groups[group].filter(n=>!excluded.has(nameKey(n)));
   const shift={group,session,rooms:{},specialClinics:[],twilight:[],er:{male:null,female:null,paeds:null},codeBlue:{TL:null,TM2:null,TM3:null},unassigned:[],supporting:[],noClinic:[]};
   const remaining=[...doctors];
   const najahOff=excluded.has(nameKey('Dr Najah'));
   // Najah: Sunday PM CMC; Monday PM regular; Tuesday PM regular;
   // Wednesday AM CMC; Thursday AM regular. Never double-book.
   const najahCMC=(i===0&&session==='PM')||(i===3&&session==='AM');
   const najahRegular=(i===1||i===2)&&session==='PM'||i===4&&session==='AM';
   if(!najahOff&&najahCMC&&clinics.cmc!==false)
    shift.specialClinics.push({kind:'CMC',doctor:'Dr Najah'});
   else if(!najahOff&&(najahRegular||(najahCMC&&clinics.cmc===false)))
    shift.specialClinics.push({kind:'FIXED',doctor:'Dr Najah'});
   if(session==='AM')shift.rooms[9]='Dr Moursi';
   function take(n){const j=remaining.indexOf(n);if(j>=0){remaining.splice(j,1);return true}return false}
   if(dates[i]==='2026-11-01'&&session==='PM'&&clinics.anc!==false&&!shift.specialClinics.some(x=>x.kind==='CMC')){
    const saba=remaining.find(n=>first(n)==='saba');
    if(saba){shift.specialClinics.push({kind:'ANC',doctor:saba});take(saba)}
    else errors.push(dates[i]+' PM: required Sunday ANC physician Saba is unavailable');
   }
   // Monday specialties: only one specialty across both shifts.
   // Oula handles IUCD; Rida handles SDI, subject to availability and their shift.
   if(i===1){
    const weekNumber=Math.floor((Date.parse(weekStart+'T12:00:00Z')-Date.parse('2026-11-01T12:00:00Z'))/604800000);
    const alternate=weekNumber%2===0?'IUCD':'SDI';
    const kind=alternate==='IUCD'?(clinics.iud!==false?'IUCD':clinics.sdi!==false?'SDI':null):(clinics.sdi!==false?'SDI':clinics.iud!==false?'IUCD':null);
    const preferred=kind==='IUCD'?'oula':'rida';
    const doctor=kind?remaining.find(n=>first(n)===preferred):null;
    if(doctor){shift.specialClinics.push({kind,doctor});take(doctor)}
   }
   // Well Baby Clinic runs only at its seven designated sessions and is exclusive.
   const wbcSession=(i===0&&session==='AM')||(i===1||i===2)||(i===3&&session==='AM')||(i===4&&session==='PM');
   if(wbcSession&&clinics.wbc!==false){
    const candidates=remaining.filter(n=>!isFemale(n)&&!isAbdul(n));
    candidates.sort((a,b)=>(wbcUsage.get(a)||0)-(wbcUsage.get(b)||0)||Number(a===previousWBC)-Number(b===previousWBC)||a.localeCompare(b));
    const doctor=candidates[0];
    if(doctor){shift.specialClinics.push({kind:'WBC',doctor});take(doctor);wbcUsage.set(doctor,(wbcUsage.get(doctor)||0)+1);previousWBC=doctor}
    else errors.push(dates[i]+' '+session+': no eligible male doctor available for Well Baby Clinic');
   }
   // Other clinics are assigned independently of WBC.
   for(const kind of ['ANC']){
    if(kind==='ANC'&&(clinics.anc===false||shift.specialClinics.some(x=>x.kind==='CMC')))continue;
    if(shift.specialClinics.some(x=>x.kind===kind))continue;
    const doctor=remaining.find(n=>kind==='NCD'?true:kind==='SMOKING'?['selman','enan'].includes(first(n)):false);
    if(doctor){shift.specialClinics.push({kind,doctor});take(doctor)}
   }
   const fixed=remaining.find(isAbdul);
   if(fixed){shift.rooms[39]=fixed;take(fixed)}
   // Preserve the workbook clinic footprint. Female physicians cannot use 9–20.
   const roomOrder=(session==='AM'?[10,12,13,14,21,22,24,25,26,27,38]:[9,10,12,13,14,21,22,24,25,26,27,38]);
   for(const room of roomOrder){
    const candidates=remaining.filter(n=>room>20||!isFemale(n));
    if(!candidates.length)continue;
    candidates.sort((a,b)=>Number(lastRoom.get(a)===room)-Number(lastRoom.get(b)===room)||(usage.get(a)||0)-(usage.get(b)||0)||a.localeCompare(b));
    const doctor=candidates[0];shift.rooms[room]=doctor;take(doctor);usage.set(doctor,(usage.get(doctor)||0)+1);lastRoom.set(doctor,room);
   }
   // Twilight is an exclusive assignment; never double-book the same doctor.
   // The workbook provides two Twilight cells per session (C7:C8 / H7:H8).
   for(let t=0;t<2;t++){
    const roomDoctors=Object.values(shift.rooms).filter(n=>n!=='Dr Moursi'&&!isFemale(n)&&!isAbdul(n));
    const doctor=roomDoctors.find(n=>!shift.twilight.includes(n));
    if(!doctor)break;
    shift.twilight.push(doctor);
   }
   // Extra non-room clinics are explicitly represented by workbook C9/C11 or H9/H11.
   // Do not invent a clinic or quietly discard an unplaced doctor.
   const clinicKinds=[...(clinics.ncd===false?[]:['NCD']),...(clinics.smoking===false||i!==2?[]:['SMOKING'])];
   for(const kind of clinicKinds){
    if(shift.specialClinics.some(x=>x.kind===kind))continue;
    const doctor=remaining.find(n=>kind==='ANC'?isFemale(n):!isFemale(n)&&!['shadi','husam','abdulgafoor'].includes(first(n)));
    if(!doctor)continue;
    shift.specialClinics.push({kind,doctor});take(doctor);
   }
   shift.noClinic=[...remaining];remaining.length=0;
   const assigned=Object.values(shift.rooms).filter(n=>n!=='Dr Moursi');
   function erPick(kind,used){
    return assigned.find(n=>!used.has(n)&&!blockedER(n)&&(kind==='male'?!isFemale(n):kind==='female'?isFemale(n):true))||null;
   }
   const usedER=new Set();
   for(const kind of ['male','female','paeds']){const n=kind==='paeds'?(assigned.filter(x=>!usedER.has(x)&&!blockedER(x)).sort((a,b)=>(paedsUsage.get(a)||0)-(paedsUsage.get(b)||0)||a.localeCompare(b))[0]||null):erPick(kind,usedER);if(kind==='paeds'&&n)paedsUsage.set(n,(paedsUsage.get(n)||0)+1);shift.er[kind]=n;if(n)usedER.add(n);else errors.push(dates[i]+' '+session+': cannot fill '+kind+' ER')}
   const cbCandidates=assigned.filter(n=>!blockedCB(n)).sort((a,b)=>Number(usedER.has(a))-Number(usedER.has(b))||a.localeCompare(b));
   for(const [j,role] of ['TL','TM2','TM3'].entries()){shift.codeBlue[role]=cbCandidates[j]||null;if(!cbCandidates[j])errors.push(dates[i]+' '+session+': cannot fill Code Blue '+role)}
   const wbc=shift.specialClinics.find(x=>x.kind==='WBC');
   if(wbc&&(Object.values(shift.rooms).includes(wbc.doctor)||shift.twilight.includes(wbc.doctor)||Object.values(shift.er).includes(wbc.doctor)||Object.values(shift.codeBlue).includes(wbc.doctor)||shift.specialClinics.some(x=>x!==wbc&&x.doctor===wbc.doctor)))errors.push(dates[i]+' '+session+': WBC doctor double-booked');
   if(shift.specialClinics.some(x=>x.kind==='CMC')&&shift.specialClinics.some(x=>x.kind==='ANC'))errors.push(dates[i]+' '+session+': Room 32 cannot host ANC and CMC together');
   const audit=contract.audit({dayIndex:i,session,assignments:[...assigned,...shift.specialClinics.map(x=>x.doctor),...shift.noClinic].map(doctor=>({doctor})),off,leave});
   if(!audit.ok)errors.push(...audit.errors,...audit.missing.map(n=>dates[i]+' '+session+': missing '+n));
   shift.audit=audit;
   day.shifts[session]=shift;
  }
  days.push(day);
 }
 return {weekStart,dates,days,valid:errors.length===0,errors};
}
function toWorkbookCells(result){
 if(!result||!Array.isArray(result.days))throw Error('Expected generated rota days');
 const cells={};
 const offsets={9:0,10:1,12:2,13:3,14:4,39:5,21:6,22:7,24:8,25:9,26:10,27:11};
 for(const day of result.days)for(const session of ['AM','PM']){
  const s=day.shifts[session],base=DAY_ROWS[day.dayIndex],clinicCol=session==='AM'?'D':'I',erCol=session==='AM'?'C':'H';
  for(const [room,doctor] of Object.entries(s.rooms)){
   if(!(room in offsets))throw Error('Room '+room+' not present in workbook');
   cells[clinicCol+(base+offsets[room])]=doctor;
  }
  for(const [role,offset] of [['male',1],['female',2],['paeds',3]])
   if(s.er[role])cells[erCol+(base+offset)]=s.er[role];
  for(let i=0;i<s.twilight.length;i++)cells[erCol+(base+4+i)]=s.twilight[i];
  // Specialty clinics have separate named fields in Rota View; do not overwrite
  // unrelated Excel template cells with CMC/IUCD/SDI/NCD names.
  // Workbook: AM Code Blue L4:L6, PM L10:L12, repeated every 12 rows.
  const cbBase=base+(session==='AM'?1:7);
  for(const [role,offset] of [['TL',0],['TM2',1],['TM3',2]])
   if(s.codeBlue[role])cells['L'+(cbBase+offset)]=s.codeBlue[role];
 }
 return cells;
}
function assertValid(result){
 if(!result?.valid)throw Error('Rota failed validation: '+(result?.errors||['Missing result']).join('; '));
 for(const day of result.days)for(const session of ['AM','PM']){
  const shift=day.shifts[session];
  if(shift.unassigned.length)throw Error(day.date+' '+session+': unassigned doctors '+shift.unassigned.join(', '));
  if(!Object.values(shift.er).every(Boolean)||!Object.values(shift.codeBlue).every(Boolean))
   throw Error(day.date+' '+session+': incomplete emergency or Code Blue');
 }
 return result;
}

root.rotasticExcelRotaEngine=Object.freeze({generate,toWorkbookCells,assertValid,source:'Book 1 (1).xlsx Sheet1',roomRows:ROOMS});
})(typeof window!=='undefined'?window:globalThis);
