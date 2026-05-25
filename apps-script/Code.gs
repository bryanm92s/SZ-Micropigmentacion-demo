// ╔══════════════════════════════════════════════════════════════╗
// ║  Salome Zuluaga | Micropigmentación — DEMO Apps Script  ║
// ╚══════════════════════════════════════════════════════════════╝

const SECRET_TOKEN = 'CAMBIA_ESTE_TOKEN';

const SHEETS = { clients:'Clientes', services:'Servicios', appointments:'Citas', expenses:'Gastos' };

const JS_KEYS = {
  clients:      ['id','name','phone','createdAt'],
  services:     ['id','name','price'],
  appointments: ['id','clientId','clientName','clientPhone',
                 'serviceIds','serviceNames','servicePrice',
                 'domicilio','domicilioPrice','totalPrice','address',
                 'date','time','createdAt','calendarCreated','calendarEventId','completed'],
  expenses:     ['id','description','amount','category','date'],
};

const HEADERS_ES = {
  clients:      ['ID','Nombre','Celular','Fecha Registro'],
  services:     ['ID','Nombre','Precio'],
  appointments: ['ID','ID Cliente','Nombre Cliente','Celular',
                 'IDs Servicios','Nombres Servicios','Precio Servicios',
                 'Domicilio','Precio Domicilio','Total','Dirección',
                 'Fecha','Hora','Fecha Creación','Evento Creado','ID Evento Calendar','Completada'],
  expenses:     ['ID','Descripción','Monto','Categoría','Fecha'],
};

function doGet(e) {
  try {
    if (e.parameter.token !== SECRET_TOKEN) return err('No autorizado');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);
    return ok({
      clients:      readSheet(ss,'clients'),
      services:     readSheet(ss,'services'),
      appointments: readSheet(ss,'appointments'),
      expenses:     readSheet(ss,'expenses'),
    });
  } catch(ex) { return err('GET: '+ex.message); }
}

function doPost(e) {
  // Acquire a script lock to prevent concurrent writes from corrupting sheets
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(ex) { return err('Servidor ocupado, reintenta'); }
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.token !== SECRET_TOKEN) { lock.releaseLock(); return err('No autorizado'); }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);
    if (b.action==='deleteCalendarEvent') return ok({calResult:deleteCalEvent(b.eventId)});
    if (b.action==='updateCalendarEvent') return ok({calResult:updateCalEvent(b.eventId,b.calendarEvent)});
    if (b.clients      !== undefined) writeSheet(ss,'clients',b.clients);
    if (b.services     !== undefined) writeSheet(ss,'services',b.services);
    if (b.appointments !== undefined) writeSheet(ss,'appointments',b.appointments);
    if (b.expenses     !== undefined) writeSheet(ss,'expenses',b.expenses);
    let calResult=null;
    if (b.calendarEvent) calResult=createCalEvent(b.calendarEvent);
    lock.releaseLock();
    return ok({saved:true,calResult});
  } catch(ex) { lock.releaseLock(); return err('POST: '+ex.message); }
}

function createCalEvent(evt) {
  try {
    const cal=CalendarApp.getDefaultCalendar();
    const s=mkDate(evt.date,evt.time,0), e=mkDate(evt.date,evt.time,60);
    const dom=evt.domicilio==='true'||evt.domicilio===true;
    const desc='👤 '+evt.clientName+'\n📱 '+evt.clientPhone+
                '\n✨ '+evt.serviceNames+
                '\n💳 Total: $'+Number(evt.totalPrice||0).toLocaleString('es-CO')+
                (dom?'\n🛵 Domicilio: $'+Number(evt.domicilioPrice||0).toLocaleString('es-CO')+
                     (evt.address?'\n📍 '+evt.address:''):'');
    const event=cal.createEvent('✨ '+evt.serviceNames+' — '+evt.clientName,s,e,{description:desc,sendInvites:false});
    event.setColor(CalendarApp.EventColor.MAUVE);
    return {ok:true,eventId:event.getId()};
  } catch(ex){return {ok:false,error:ex.message};}
}

function updateCalEvent(eventId,evt) {
  try {
    if(!eventId) return {ok:false,error:'Sin ID'};
    const event=CalendarApp.getEventById(eventId);
    if(!event) return {ok:false,error:'Evento no encontrado'};
    event.setTime(mkDate(evt.date,evt.time,0),mkDate(evt.date,evt.time,60));
    return {ok:true};
  } catch(ex){return {ok:false,error:ex.message};}
}

function deleteCalEvent(eventId) {
  try {
    if(!eventId) return {ok:false,error:'Sin ID'};
    const event=CalendarApp.getEventById(eventId);
    if(!event) return {ok:true};
    event.deleteEvent();
    return {ok:true};
  } catch(ex){return {ok:false,error:ex.message};}
}

function mkDate(dateStr,timeStr,offsetMin) {
  const [y,m,d]=String(dateStr).split('-').map(Number);
  const [hh,mm]=String(timeStr).split(':').map(Number);
  const dt=new Date(y,m-1,d,hh,mm,0);
  dt.setMinutes(dt.getMinutes()+offsetMin);
  return dt;
}

function initSheets(ss) {
  // Only create sheets that are actually missing (skip if all present)
  const names = Object.values(SHEETS);
  const existing = ss.getSheets().map(s=>s.getName());
  names.forEach(n=>{ if(!existing.includes(n)) ss.insertSheet(n); });
}

function readSheet(ss,key) {
  const sh=ss.getSheetByName(SHEETS[key]);
  const last=sh.getLastRow();
  if(last<2) return [];
  const nCols=JS_KEYS[key].length;
  const sCols=Math.min(nCols,sh.getLastColumn());
  const data=sh.getRange(1,1,last,sCols).getValues();
  const keys=JS_KEYS[key];
  return data.slice(1).filter(row=>row[0]!==''&&row[0]!==null&&row[0]!==undefined).map(row=>{
    const obj={};
    keys.forEach((k,i)=>{obj[k]=i<sCols?cellStr(row[i],k):'';});
    return obj;
  });
}

function writeSheet(ss,key,rows) {
  const sh=ss.getSheetByName(SHEETS[key]);
  const keys=JS_KEYS[key]; const headers=HEADERS_ES[key];
  sh.clearContents();
  const nCols=keys.length; const nRows=Math.max((rows||[]).length+1,2);
  sh.getRange(1,1,nRows,nCols).setNumberFormat('@');
  const data=[headers,...(rows||[]).map(r=>keys.map(k=>(r[k]!==null&&r[k]!==undefined)?String(r[k]):''))];
  sh.getRange(1,1,data.length,nCols).setValues(data);
}

function cellStr(v,key) {
  if(v instanceof Date){const y=v.getFullYear(),m=String(v.getMonth()+1).padStart(2,'0'),d=String(v.getDate()).padStart(2,'0');return y+'-'+m+'-'+d;}
  if(typeof v==='number'&&v>=0&&v<1){const tot=Math.round(v*1440);return String(Math.floor(tot/60)).padStart(2,'0')+':'+String(tot%60).padStart(2,'0');}
  if(v===null||v===undefined) return '';
  return String(v);
}

function ok(data){return ContentService.createTextOutput(JSON.stringify({ok:true,data})).setMimeType(ContentService.MimeType.JSON);}
function err(msg){return ContentService.createTextOutput(JSON.stringify({ok:false,error:msg})).setMimeType(ContentService.MimeType.JSON);}
