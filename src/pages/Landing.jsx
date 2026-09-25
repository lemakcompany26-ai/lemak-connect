export default function Landing() {
  return (
    <div style={{minHeight:'100vh', background:'white'}}>
      <div style={{background:'#2563eb', color:'white', padding:'40px 20px', textAlign:'center'}}>
        <h1 style={{fontSize:'32px', fontWeight:'bold'}}>LEMAK CONNECT</h1>
        <p style={{marginTop:'10px'}}>Your World of Digital Services - Cheap Data, Airtime, Bills</p>
        <a href="/login" style={{display:'inline-block', marginTop:'20px', background:'white', color:'#2563eb', padding:'12px 28px', borderRadius:'30px', fontWeight:'bold', textDecoration:'none'}}>Login to Dashboard</a>
      </div>
      <div style={{padding:'20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
        <div style={{background:'#eff6ff', padding:'15px', borderRadius:'12px', textAlign:'center'}}><b>Cheap Data</b><br/>MTN Airtel Glo 9mobile</div>
        <div style={{background:'#f0fdf4', padding:'15px', borderRadius:'12px', textAlign:'center'}}><b>Bills Payment</b><br/>NEPA DSTV GOTV</div>
        <div style={{background:'#fefce8', padding:'15px', borderRadius:'12px', textAlign:'center'}}><b>Airtime VTU</b><br/>Instant Recharge</div>
        <div style={{background:'#faf5ff', padding:'15px', borderRadius:'12px', textAlign:'center'}}><b>Virtual Number</b><br/>For WhatsApp</div>
      </div>
      <div style={{background:'#111827', color:'white', padding:'30px', textAlign:'center', marginTop:'20px'}}>
        <h2>Fast. Safe. Affordable.</h2>
        <a href="/login" style={{display:'inline-block', marginTop:'15px', background:'#2563eb', color:'white', padding:'12px 28px', borderRadius:'30px', fontWeight:'bold', textDecoration:'none'}}>Get Started Now</a>
      </div>
    </div>
  )
}
