import { useState, useEffect } from 'react'
import { getAuditReport, updateUserRole } from './api.js'

const P  = '#B85C6E'
const PL = '#FDF6F0'
const PB = '#F5D0D8'

const fmt = n => Number(n||0).toLocaleString('es-CO')
const monthLabel = m => {
  const [y, mo] = m.split('-')
  const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${names[parseInt(mo)-1]} ${y}`
}
const getMonthOptions = () => {
  const opts = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    opts.push(val)
  }
  return opts
}

/* ── Colores por usuario ── */
const USER_COLORS = ['#B85C6E','#6366F1','#0891B2','#059669','#D97706','#7C3AED']
const userColor = email => USER_COLORS[
  [...email].reduce((a,c)=>a+c.charCodeAt(0),0) % USER_COLORS.length
]
const userInitial = user => {
  const display = (typeof user === 'object' ? user.name : null) || (typeof user === 'string' ? user : '')
  return (display||'?')[0].toUpperCase()
}

/* ── Stat card ── */
function StatCard({ label, value, sub, color='#B85C6E' }) {
  return (
    <div style={{background:'white',borderRadius:14,padding:'16px 18px',boxShadow:'0 2px 12px rgba(180,92,110,.08)',flex:1,minWidth:130}}>
      <div style={{fontSize:11,fontWeight:700,color:'#999',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>{label}</div>
      <div style={{fontSize:26,fontWeight:800,color,letterSpacing:'-1px'}}>{value}</div>
      {sub && <div style={{fontSize:12,color:'#aaa',marginTop:3}}>{sub}</div>}
    </div>
  )
}

/* ── Tarjeta de usuario ── */
function UserCard({ user, color, isCurrentUser, onGoCitas, onGoGastos }) {
  return (
    <div style={{
      background:'white',borderRadius:16,padding:'20px',
      boxShadow:'0 2px 16px rgba(0,0,0,.06)',
      border: isCurrentUser ? `2px solid ${color}` : '2px solid transparent',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <div style={{
          width:42,height:42,borderRadius:'50%',background:color,
          color:'white',display:'flex',alignItems:'center',justifyContent:'center',
          fontWeight:800,fontSize:18,flexShrink:0,
        }}>{userInitial(user)}</div>
        <div style={{minWidth:0}}>
          <div style={{fontWeight:700,fontSize:14,color:'#222',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {user.name || user.email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
          </div>
          <div style={{fontSize:11,color:'#aaa',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</div>
        </div>
        {isCurrentUser && <span style={{marginLeft:'auto',background:PL,color:P,fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20,flexShrink:0}}>Tú</span>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div onClick={onGoCitas} style={{background:PL,borderRadius:10,padding:'12px',textAlign:'center',cursor:onGoCitas?'pointer':'default',transition:'opacity .15s'}}
          onMouseEnter={e=>{if(onGoCitas)e.currentTarget.style.opacity='.75'}}
          onMouseLeave={e=>{e.currentTarget.style.opacity='1'}}>
          <div style={{fontSize:28,fontWeight:800,color:P}}>{user.citas}</div>
          <div style={{fontSize:11,color:'#888',fontWeight:600}}>Citas creadas {onGoCitas&&<span style={{fontSize:10,color:P}}>→</span>}</div>
        </div>
        <div onClick={onGoGastos} style={{background:'#FEF9F0',borderRadius:10,padding:'12px',textAlign:'center',cursor:onGoGastos?'pointer':'default',transition:'opacity .15s'}}
          onMouseEnter={e=>{if(onGoGastos)e.currentTarget.style.opacity='.75'}}
          onMouseLeave={e=>{e.currentTarget.style.opacity='1'}}>
          <div style={{fontSize:28,fontWeight:800,color:'#D97706'}}>{user.gastos}</div>
          <div style={{fontSize:11,color:'#888',fontWeight:600}}>Gastos registrados {onGoGastos&&<span style={{fontSize:10,color:'#D97706'}}>→</span>}</div>
        </div>
      </div>
      {user.montoGastos > 0 && (
        <div style={{marginTop:10,background:'#FFF1F3',borderRadius:10,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:12,color:'#888',fontWeight:600}}>Total en gastos</span>
          <span style={{fontSize:14,fontWeight:800,color:P}}>${fmt(user.montoGastos)}</span>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   REPORTS TAB
══════════════════════════════════════════════════════════════ */
export default function ReportsTab({ userEmail, userRole, sync, expenses, clients, appts, SE, setTab }) {
  const months   = getMonthOptions()
  const nowMonth = months[0]
  const [month,     setMonth]     = useState(nowMonth)
  const [report,    setReport]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [roleTab,   setRoleTab]   = useState(false)  // toggle: reportes / gestión de accesos

  useEffect(() => { fetchReport(month) }, [month])

  async function fetchReport(m) {
    setLoading(true); setError('')
    try {
      const data = await getAuditReport(m, userEmail)
      setReport(data)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const users  = report?.users || []
  const totCitas  = users.reduce((s,u)=>s+u.citas,0)
  const totGastos = users.reduce((s,u)=>s+u.gastos,0)
  const totMonto  = users.reduce((s,u)=>s+u.montoGastos,0)

  return (
    <div style={{padding:'0 0 80px'}}>

      {/* Tabs internas */}
      <div style={{display:'flex',gap:0,background:'white',borderBottom:'1px solid #F0E8E8',marginBottom:20,position:'sticky',top:108,zIndex:90}}>
        {[['reportes','📊 Reportes'],['accesos','👥 Accesos']].map(([id,lb])=>(
          <button key={id} onClick={()=>setRoleTab(id==='accesos')}
            style={{flex:1,padding:'13px',border:'none',borderBottom:`2.5px solid ${(id==='accesos')===roleTab?P:'transparent'}`,
              background:'none',fontFamily:'inherit',fontSize:13,fontWeight:700,cursor:'pointer',
              color:(id==='accesos')===roleTab?P:'#aaa',transition:'all .15s'}}>
            {lb}
          </button>
        ))}
      </div>

      {!roleTab ? (
        /* ── REPORTES ── */
        <div style={{padding:'0 16px'}}>
          {/* Selector de mes */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:12}}>
            <div style={{fontFamily:'Georgia,serif',fontSize:20,fontWeight:700,color:'#222'}}>
              Actividad del equipo
            </div>
            <select value={month} onChange={e=>setMonth(e.target.value)}
              style={{border:`1.5px solid ${PB}`,borderRadius:10,padding:'8px 12px',fontFamily:'inherit',fontSize:13,color:'#444',background:'white',outline:'none',cursor:'pointer'}}>
              {months.map(m=>(
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>

          {loading && (
            <div style={{textAlign:'center',padding:'40px',color:'#ccc',fontSize:14}}>Cargando reporte…</div>
          )}
          {error && (
            <div style={{background:'#FEE2E2',color:'#B91C1C',borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13}}>{error}</div>
          )}

          {!loading && !error && (
            <>
              {/* Resumen total */}
              <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
                <StatCard label="Citas creadas"      value={totCitas}           color={P}/>
                <StatCard label="Gastos registrados" value={totGastos}          color='#D97706'/>
                <StatCard label="Monto en gastos"    value={`$${fmt(totMonto)}`} color='#059669' sub={monthLabel(month)}/>
              </div>

              {users.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px 20px',color:'#ccc'}}>
                  <div style={{fontSize:36,marginBottom:12}}>📭</div>
                  <div style={{fontSize:14}}>Sin actividad registrada en {monthLabel(month)}</div>
                  <div style={{fontSize:12,marginTop:4,color:'#ddd'}}>Los movimientos se registran automáticamente desde la app</div>
                </div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
                  {users
                    .sort((a,b)=>(b.citas+b.gastos)-(a.citas+a.gastos))
                    .map(u=>(
                      <UserCard
                        key={u.email}
                        user={u}
                        color={userColor(u.email)}
                        isCurrentUser={u.email===userEmail}
                        onGoCitas={setTab ? ()=>setTab('appointments',{from:'reports'}) : undefined}
                        onGoGastos={setTab ? ()=>setTab('expense-detail',{from:'reports'}) : undefined}
                      />
                    ))
                  }
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ── GESTIÓN DE ACCESOS ── */
        <AccessManager userEmail={userEmail} sync={sync} />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   GESTIÓN DE ACCESOS (solo admin)
══════════════════════════════════════════════════════════════ */
function AccessManager({ userEmail, sync }) {
  const [newEmail, setNewEmail] = useState('')
  const [newRole,  setNewRole]  = useState('Empleada')
  const [busy,     setBusy]     = useState(false)
  const [msg,      setMsg]      = useState('')
  const [isErr,    setIsErr]    = useState(false)

  async function handleUpdateRole() {
    if (!newEmail.trim()) return
    setBusy(true); setMsg(''); setIsErr(false)
    try {
      await updateUserRole(newEmail.trim().toLowerCase(), newRole, userEmail)
      setMsg(`✅ Rol de ${newEmail.trim()} actualizado a ${newRole}`)
      setNewEmail('')
    } catch(e) { setMsg(e.message); setIsErr(true) }
    finally { setBusy(false) }
  }

  const inp = {
    width:'100%',padding:'11px 14px',border:`1.5px solid ${PB}`,
    borderRadius:10,fontSize:14,fontFamily:'inherit',
    background:'white',outline:'none',boxSizing:'border-box',
  }

  return (
    <div style={{padding:'0 16px'}}>
      <div style={{fontFamily:'Georgia,serif',fontSize:20,fontWeight:700,color:'#222',marginBottom:6}}>Gestión de accesos</div>
      <div style={{fontSize:13,color:'#999',marginBottom:20}}>
        Para autorizar a un nuevo usuario, primero agrega su correo en la hoja "Usuarios" de Google Sheets,
        luego asígnale el rol aquí.
      </div>

      <div style={{background:'white',borderRadius:16,padding:'20px',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#555',marginBottom:14}}>Cambiar rol de usuario</div>

        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:5}}>
            Correo del usuario
          </label>
          <input value={newEmail} onChange={e=>setNewEmail(e.target.value)}
            placeholder="usuario@correo.com" style={inp} type="email"/>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:5}}>
            Rol
          </label>
          <div style={{display:'flex',gap:10}}>
            {['Administradora','Empleada'].map(r=>(
              <button key={r} onClick={()=>setNewRole(r)}
                style={{flex:1,padding:'10px',borderRadius:10,border:`2px solid ${newRole===r?P:PB}`,
                  background:newRole===r?PL:'white',color:newRole===r?P:'#666',
                  fontFamily:'inherit',fontSize:13,fontWeight:700,cursor:'pointer',transition:'all .15s'}}>
                {r==='Administradora'?'👑 Administradora':'👤 Empleada'}
              </button>
            ))}
          </div>
        </div>

        {msg && (
          <div style={{background:isErr?'#FEE2E2':'#D1FAE5',color:isErr?'#B91C1C':'#065F46',
            borderRadius:10,padding:'10px 14px',fontSize:13,marginBottom:14,fontWeight:500}}>
            {msg}
          </div>
        )}

        <button onClick={handleUpdateRole} disabled={busy||!newEmail.trim()}
          style={{width:'100%',padding:'12px',background:busy||!newEmail.trim()?'#e0d0d3':P,
            color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,
            cursor:busy||!newEmail.trim()?'not-allowed':'pointer',fontFamily:'inherit'}}>
          {busy?'Guardando…':'Actualizar rol'}
        </button>

        <div style={{marginTop:20,padding:'14px',background:'#FFFBEB',borderRadius:12,border:'1px solid #FDE68A'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#92400E',marginBottom:6}}>📋 Diferencia de roles</div>
          <div style={{fontSize:12,color:'#78350F',lineHeight:1.7}}>
            <b>Administradora:</b> acceso total — citas, clientes, servicios, finanzas, reportes<br/>
            <b>Empleada:</b> citas, clientes, servicios y solo sus propios gastos
          </div>
        </div>
      </div>
    </div>
  )
}
