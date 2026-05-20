import { useState, useEffect, useCallback } from "react";

const SK = "amex-coach-v5";
const SK_EMAIL = "amex-coach-email-v5";

function getDaysUntilReset(p) {
  const n = new Date();
  let r;
  switch (p) {
    case "Monthly": r = new Date(n.getFullYear(), n.getMonth() + 1, 1); break;
    case "Quarterly": { const q = Math.floor(n.getMonth() / 3); r = new Date(n.getFullYear(), (q + 1) * 3, 1); break; }
    case "Semi-annually": { const h = n.getMonth() < 6 ? 6 : 12; r = h === 12 ? new Date(n.getFullYear() + 1, 0, 1) : new Date(n.getFullYear(), h, 1); break; }
    case "Annually": r = new Date(n.getFullYear() + 1, 0, 1); break;
    default: return null;
  }
  return Math.ceil((r - n) / (1e3 * 60 * 60 * 24));
}

function getPeriodLabel(p) {
  const map = { Monthly: "/mo", Quarterly: "/qtr", "Semi-annually": "/half", Annually: "/yr", "Every 4 Years": "/4yr" };
  return map[p] || "";
}

function annualize(v, p) {
  const map = { Monthly: 12, Quarterly: 4, "Semi-annually": 2, Annually: 1, "Every 4 Years": 0.25 };
  return v * (map[p] || 1);
}

const BENEFITS = [
  { id: "uber-cash", name: "Uber Cash", cat: "Rideshare", value: 15, period: "Monthly",
    headline: "$15/mo in Uber Cash ($200/yr with Dec bonus)",
    howTo: ["Download/update Uber, Uber Eats, or Postmates app", "Add Platinum Card as payment in Uber account", "Toggle Uber Cash ON before ordering", "Select Amex as payment method", "Auto-loads by the 1st each month"],
    pitfalls: ["Expires end of month — does NOT roll over", "Apple Pay/PayPal does NOT count", "Card number changes require update in Uber before month-end"],
    tips: ["Set a reminder for the 25th to use remaining balance", "December has extra $20 ($35 total)", "Works on Uber Eats and Postmates too"],
    enrollReq: true, enrollAction: "Add Platinum Card as payment in Uber app" },
  { id: "uber-one", name: "Uber One Credit", cat: "Rideshare", value: 120, period: "Annually",
    headline: "Up to $120/yr on Uber One membership fees",
    howTo: ["Add Platinum Card as payment in Uber", "Subscribe to Uber One", "Toggle Uber Cash OFF for membership fees", "Credits post within 8 weeks"],
    pitfalls: ["Uber Cash toggled ON pays fee instead — no credit", "Free trials don't count", "Cancelling Amex does NOT cancel Uber One"],
    tips: ["Separate from $15/mo Uber Cash — use both", "Monthly and annual plans both qualify"],
    enrollReq: true, enrollAction: "Set Amex as Uber One payment; toggle Uber Cash OFF" },
  { id: "streaming", name: "Digital Entertainment", cat: "Streaming", value: 25, period: "Monthly",
    headline: "$25/mo toward streaming and news ($300/yr)",
    howTo: ["Enroll at americanexpress.com Benefits section", "Subscribe directly with partner using Platinum Card", "Partners: Disney+, ESPN, Hulu, NYT, Paramount+, Peacock, WSJ, YouTube"],
    pitfalls: ["App Store/Google Play/cable bundles do NOT qualify", "Must subscribe on partner website directly", "$25/mo cap — excess is not credited"],
    tips: ["Stack Hulu + Peacock + NYT + YouTube Music to hit $25", "YouTube TV alone maxes this out monthly", "Easiest credit to max — you probably already pay for some"],
    enrollReq: true, enrollAction: "Enroll at americanexpress.com Benefits section" },
  { id: "resy", name: "Resy Dining Credit", cat: "Dining", value: 100, period: "Quarterly",
    headline: "$100/quarter at Resy restaurants ($400/yr)",
    howTo: ["Enroll at americanexpress.com Benefits section", "Dine at U.S. restaurants on Resy that accept Amex", "Pay with Platinum Card", "Also works on Resy.com, app, and Resy Pay"],
    pitfalls: ["Restaurant must be LIVE on Resy — check first", "DoorDash/Grubhub delivery does NOT count", "Quarterly credit does NOT roll over"],
    tips: ["No reservation needed — just dine and pay with Platinum", "Resy Pay (paying via app) also qualifies", "$100 cap is per account — coordinate with Additional Cards"],
    enrollReq: true, enrollAction: "Enroll at americanexpress.com Benefits section" },
  { id: "hotel", name: "Hotel Credit (FHR/HC)", cat: "Hotels", value: 300, period: "Semi-annually",
    headline: "$300/half for prepaid hotel bookings ($600/yr)",
    howTo: ["Book prepaid (Pay Now) through Amex Travel", "Must be Fine Hotels + Resorts or Hotel Collection", "Hotel Collection requires 2-night minimum", "Credits post within days to 90 days"],
    pitfalls: ["Booking directly with hotel does NOT qualify", "Pay Later bookings NOT eligible", "Jan-Jun must process by June 30; Jul-Dec by Dec 31"],
    tips: ["FHR also includes noon check-in, room upgrade, $100 credit, daily breakfast", "Most valuable dollar credit on the card", "Use both halves: spring + fall trips for $600"],
    enrollReq: false, enrollAction: "No enrollment — book via Amex Travel" },
  { id: "airline", name: "Airline Fee Credit", cat: "Airlines", value: 200, period: "Annually",
    headline: "$200/yr for incidental fees on one selected airline",
    howTo: ["Select airline at americanexpress.com Benefits", "Airlines: Alaska, American, Delta, Hawaiian, JetBlue, Spirit, Southwest, United", "Pay incidental fees with Platinum Card"],
    pitfalls: ["Tickets NOT covered — incidental fees only", "Gift cards, mileage purchases NOT eligible", "Can only change airline once per year in January"],
    tips: ["Choose the airline you fly most", "Select early in the year", "Southwest has no bag fees — harder to use"],
    enrollReq: true, enrollAction: "Select airline at americanexpress.com Benefits" },
  { id: "lulu", name: "lululemon Credit", cat: "Shopping", value: 75, period: "Quarterly",
    headline: "$75/quarter at lululemon ($300/yr)",
    howTo: ["Enroll at americanexpress.com Benefits section", "Shop U.S. stores, lululemon.com, or app", "Pay with enrolled Platinum Card"],
    pitfalls: ["Studio, Like New, outlets NOT eligible", "Gift cards NOT eligible", "Quarterly credit does NOT roll over"],
    tips: ["Spread purchases across the year", "In-store purchases count", "Buy gifts for others and still earn credit"],
    enrollReq: true, enrollAction: "Enroll at americanexpress.com Benefits section" },
  { id: "equinox", name: "Equinox Credit", cat: "Wellness", value: 300, period: "Annually",
    headline: "$300/yr on Equinox membership or Equinox+",
    howTo: ["Validate Card at platinum.equinox.com", "Sign up for Equinox gym or Equinox+", "Pay directly with Platinum Card"],
    pitfalls: ["Equinox+ via app does NOT earn credit", "$300 cap across ALL cards on account"],
    tips: ["Equinox+ (~$40/mo) with $300 back = ~$180/yr", "All gym memberships include Equinox+ already"],
    enrollReq: true, enrollAction: "Validate at platinum.equinox.com" },
  { id: "oura", name: "Oura Ring Credit", cat: "Wellness", value: 200, period: "Annually",
    headline: "$200/yr toward Oura Ring purchase",
    howTo: ["Enroll at americanexpress.com Benefits section", "Buy ring at ouraring.com", "Pay with enrolled Platinum Card"],
    pitfalls: ["Only ring hardware — memberships/chargers NOT eligible", "Amazon/Best Buy do NOT count"],
    tips: ["Ring 4 (~$349) with $200 back = ~$149", "Buy early in year so you don't forget"],
    enrollReq: true, enrollAction: "Enroll at americanexpress.com Benefits section" },
  { id: "clear", name: "CLEAR+ Credit", cat: "Travel", value: 209, period: "Annually",
    headline: "$209/yr for CLEAR+ annual membership",
    howTo: ["Sign up at clearme.com", "Pay annual fee with Platinum Card"],
    pitfalls: ["Auto-renews annually", "$209 cap across ALL cards on account"],
    tips: ["CLEAR + TSA PreCheck = front of line + fast screening", "Full $209 covered — effectively free"],
    enrollReq: true, enrollAction: "Sign up at clearme.com, pay with Platinum" },
  { id: "walmart", name: "Walmart+ Monthly", cat: "Shopping", value: 12.95, period: "Monthly",
    headline: "~$12.95/mo Walmart+ membership (~$155/yr)",
    howTo: ["Sign up for MONTHLY plan (not annual)", "Pay with Platinum Card", "If on annual, switch at walmart.com/plus/amexplatinum BEFORE renewal"],
    pitfalls: ["Annual plans do NOT qualify", "Miss the switch = no credits for a year", "Walmart Business+ NOT eligible"],
    tips: ["Monthly is free with Platinum vs $98/yr without", "Includes free delivery, fuel discounts, Paramount+", "Switch to monthly ASAP if on annual"],
    enrollReq: true, enrollAction: "Switch to monthly at walmart.com/plus/amexplatinum" },
  { id: "ge", name: "Global Entry / TSA Pre", cat: "Travel", value: 120, period: "Every 4 Years",
    headline: "$120 Global Entry OR $85 TSA PreCheck every 4 years",
    howTo: ["Apply at cbp.gov or TSA provider", "Pay with Platinum Card", "Credit posts regardless of approval"],
    pitfalls: ["Only ONE program credited — whichever charged first", "NEXUS/SENTRI NOT eligible"],
    tips: ["Always choose Global Entry — includes PreCheck free", "Use for family member if you already have it"],
    enrollReq: false, enrollAction: "Apply at cbp.gov/go, pay with Platinum" },
  { id: "centurion", name: "Centurion Lounge", cat: "Lounge", value: 0, period: "Annually",
    headline: "Unlimited access at all Centurion Lounges",
    howTo: ["Present Platinum Card, I.D., and boarding pass", "Arrive within 3 hours of departing flight"],
    pitfalls: ["Guests $50/ea per location", "July 2026: guests must be on same flight"],
    tips: ["$75K+ spend = free guest access for 2", "Additional Card spending counts toward $75K"],
    enrollReq: false, enrollAction: "No enrollment needed" },
  { id: "pp", name: "Priority Pass Select", cat: "Lounge", value: 0, period: "Annually",
    headline: "1,300+ airport lounges, up to 2 free guests",
    howTo: ["Enroll at americanexpress.com Benefits section", "Activate digital card at prioritypass.com/activation"],
    pitfalls: ["After 2 guests, billed at Standard rate", "Some lounges limit guests"],
    tips: ["Covers airports without Centurion Lounges", "Many locations offer dining credits too", "Enroll immediately after getting card"],
    enrollReq: true, enrollAction: "Enroll at americanexpress.com Benefits section" },
  { id: "dsc", name: "Delta Sky Club", cat: "Lounge", value: 0, period: "Annually",
    headline: "10 visits/yr (unlimited after $75K spend)",
    howTo: ["Present Platinum Card, I.D., boarding pass", "Must fly Delta same day", "Visits reset each Feb 1"],
    pitfalls: ["Basic Economy NOT eligible", "Guests always $50/ea unless Unlimited"],
    tips: ["$75K spend = Unlimited access", "One visit covers multiple clubs within 24hrs"],
    enrollReq: false, enrollAction: "No enrollment needed" },
  { id: "hilton", name: "Hilton Gold Status", cat: "Hotels", value: 0, period: "Annually",
    headline: "Complimentary Hilton Honors Gold",
    howTo: ["Enroll at americanexpress.com Benefits section", "Completes within 72 hours"],
    pitfalls: ["Upgrades subject to availability", "Must book direct with Hilton"],
    tips: ["Includes upgrades, late checkout, 5th night free, 80% bonus points"],
    enrollReq: true, enrollAction: "Enroll at americanexpress.com Benefits section" },
  { id: "marriott", name: "Marriott Gold Elite", cat: "Hotels", value: 0, period: "Annually",
    headline: "Complimentary Marriott Bonvoy Gold Elite",
    howTo: ["Enroll at americanexpress.com Benefits section", "Completes within 3-5 business days"],
    pitfalls: ["Not all Marriott brands in Bonvoy", "Third-party OTAs NOT eligible"],
    tips: ["25% bonus points, enhanced room, 2 PM late checkout"],
    enrollReq: true, enrollAction: "Enroll at americanexpress.com Benefits section" },
  { id: "cell", name: "Cell Phone Protection", cat: "Insurance", value: 0, period: "Annually",
    headline: "Up to $800/claim for phone damage or theft",
    howTo: ["Pay monthly cell bill with Platinum Card", "$50 deductible, max 2 claims per 12 months"],
    pitfalls: ["Missed month of payment could void coverage", "Secondary coverage — carrier pays first"],
    tips: ["Saves $10-15/mo vs carrier insurance", "Set up autopay for cell bill on Platinum"],
    enrollReq: false, enrollAction: "Pay cell phone bill with Platinum" },
  { id: "nofx", name: "No Foreign Transaction Fees", cat: "Travel", value: 0, period: "Annually",
    headline: "Zero foreign transaction fees worldwide",
    howTo: ["Use Platinum Card internationally", "Automatic — no enrollment needed"],
    pitfalls: ["ATMs/merchants may charge own fees"],
    tips: ["Saves typical 3% fee", "$5,000 trip = $150 savings vs most cards"],
    enrollReq: false, enrollAction: "Automatic" },
];

function buildDefault() {
  return { benefits: BENEFITS.map(b => ({ ...b, enrolled: false, usedAmount: 0, used: false })) };
}

function MonthlyReport({ card, email, onClose }) {
  const now = new Date();
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const credits = card.benefits.filter(b => b.value > 0);
  const perks = card.benefits.filter(b => b.value === 0);
  const needsEnroll = card.benefits.filter(b => b.enrollReq && !b.enrolled);
  const totalAnnual = credits.reduce((s,b) => s + annualize(b.value,b.period), 0);
  const used = credits.reduce((s,b) => s + (b.usedAmount||0), 0);
  const total = credits.reduce((s,b) => s + b.value, 0);
  const left = total - used;
  const urgent = credits.filter(b => { const d=getDaysUntilReset(b.period); return d!==null && d<=30 && (b.usedAmount||0)<b.value; });

  const sec = { padding: "14px 18px", borderBottom: "1px solid #1e1e23" };
  const heading = { fontSize: 13, fontWeight: 600, color: "#f0f0f0", marginBottom: 8 };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", zIndex:1000, overflow:"auto", padding:"20px 12px" }}>
      <div style={{ maxWidth:520, margin:"0 auto", background:"#131316", borderRadius:14, border:"1px solid #2a2a30" }}>
        <div style={{ display:"flex", justifyContent:"space-between", padding:"18px 18px 10px" }}>
          <div>
            <div style={{ fontSize:17, fontWeight:700, color:"#f0f0f0" }}>Monthly Benefits Report</div>
            <div style={{ fontSize:11, color:"#777" }}>{months[now.getMonth()]} {now.getFullYear()}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#666", fontSize:18, cursor:"pointer", padding:4 }}>x</button>
        </div>
        <div style={{ ...sec, fontSize:12, color:"#aaa", lineHeight:1.6 }}>
          {left > 0 ? "You have $" + left.toFixed(0) + " in credits expiring this period." : "All credits utilized this period!"}
        </div>
        <div style={sec}>
          <div style={heading}>Credit Scorecard</div>
          {[["Annual fee","$895","#f0f0f0"],["Annual value","~$"+Math.round(totalAnnual).toLocaleString(),"#8ecf8e"],["Period available","$"+total.toFixed(0),"#f0f0f0"],["Period used","$"+used.toFixed(2),"#8ecf8e"],["Left on table","$"+left.toFixed(0),left>0?"#e8c76a":"#8ecf8e"]].map(([l,v,c],i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:11, color:"#888" }}>{l}</span>
              <span style={{ fontSize:12, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color:c }}>{v}</span>
            </div>
          ))}
        </div>
        {urgent.length > 0 && (
          <div style={sec}>
            <div style={{ ...heading, color:"#e8c76a" }}>Expiring Soon</div>
            {urgent.map(b => (
              <div key={b.id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0" }}>
                <span style={{ fontSize:11, color:"#ccc" }}>{b.name} — ${(b.value-(b.usedAmount||0)).toFixed(2)} left</span>
                <span style={{ fontSize:12, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:"#e87c7c" }}>{getDaysUntilReset(b.period)}d</span>
              </div>
            ))}
          </div>
        )}
        {needsEnroll.length > 0 && (
          <div style={sec}>
            <div style={{ ...heading, color:"#e87c7c" }}>Not Enrolled ({needsEnroll.length})</div>
            {needsEnroll.map(b => (
              <div key={b.id} style={{ padding:"4px 0" }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#ccc" }}>{b.name}{b.value>0?" ($"+b.value+getPeriodLabel(b.period)+")":""}</div>
                <div style={{ fontSize:10, color:"#666" }}>{b.enrollAction}</div>
              </div>
            ))}
          </div>
        )}
        <div style={sec}>
          <div style={heading}>Credit Progress</div>
          {credits.map(b => {
            const pct = b.value>0 ? Math.min(100, Math.round(((b.usedAmount||0)/b.value)*100)) : 0;
            return (
              <div key={b.id} style={{ marginBottom:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                  <span style={{ fontSize:10, color:"#999" }}>{b.name}</span>
                  <span style={{ fontSize:9, fontFamily:"'JetBrains Mono',monospace", color:"#666" }}>${(b.usedAmount||0).toFixed(2)} / ${b.value}</span>
                </div>
                <div style={{ height:3, background:"#1a1a1f", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:pct+"%", background:pct>=100?"#8ecf8e":pct>0?"#c9a96e":"transparent", borderRadius:2 }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ ...sec, borderBottom:"none" }}>
          <div style={heading}>Perk Status</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
            {perks.map(b => (
              <span key={b.id} style={{ fontSize:10, padding:"2px 7px", borderRadius:4, border:"1px solid", borderColor:b.used?"rgba(142,207,142,.2)":"#1e1e23", color:b.used?"#8ecf8e":"#555", background:b.used?"rgba(142,207,142,.05)":"transparent" }}>
                {b.used?"+":"-"} {b.name}
              </span>
            ))}
          </div>
        </div>
        <div style={{ padding:"12px 18px", fontSize:10, color:"#444", textAlign:"center" }}>
          Preview of monthly email. In production this goes to {email || "your email"} on the 1st.
        </div>
      </div>
    </div>
  );
}

export default function AmexCoach() {
  const [email, setEmail] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState("guide");
  const [filter, setFilter] = useState("all");
  const [showReport, setShowReport] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [toast, setToast] = useState(null);

  const flash = useCallback((m) => { setToast(m); setTimeout(() => setToast(null), 2200); }, []);

  useEffect(() => {
    try { const r = localStorage.getItem(SK_EMAIL); if (r) setEmail(r); } catch (e) {}
    let loaded = false;
    try {
      const r = localStorage.getItem(SK);
      if (r) { const p = JSON.parse(r); if (p && p.benefits) { setCard(p); loaded = true; } }
    } catch (e) {}
    if (!loaded) { const c = buildDefault(); setCard(c); try { localStorage.setItem(SK, JSON.stringify(c)); } catch (e) {} }
    setLoading(false);
  }, []);

  const save = useCallback((c) => { try { localStorage.setItem(SK, JSON.stringify(c)); } catch (e) {} }, []);

  const submitEmail = () => {
    const e = emailInput.trim();
    if (!e || e.indexOf("@") === -1) return;
    setEmail(e);
    try { localStorage.setItem(SK_EMAIL, e); } catch (err) {}
    flash("Welcome!");
  };

  const updateBenefit = (id, u) => { const c = { ...card, benefits: card.benefits.map(b => b.id === id ? { ...b, ...u } : b) }; setCard(c); save(c); };
  const toggleEnrolled = (id) => { const b = card.benefits.find(x => x.id === id); updateBenefit(id, { enrolled: !b.enrolled }); flash(b.enrolled ? "Unenrolled" : "Enrolled!"); };
  const setUsedAmt = (id, amt) => { const b = card.benefits.find(x => x.id === id); updateBenefit(id, { usedAmount: Math.min(parseFloat(amt)||0, b.value), used: (parseFloat(amt)||0) > 0 }); };
  const markFull = (id) => { const b = card.benefits.find(x => x.id === id); updateBenefit(id, { usedAmount: b.value, used: true }); flash("Fully used!"); };
  const togglePerk = (id) => { const b = card.benefits.find(x => x.id === id); updateBenefit(id, { used: !b.used }); };

  if (loading || !card) return <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"50vh", color:"#666", fontFamily:"sans-serif" }}>Loading...</div>;

  if (!email) {
    return (
      <div style={{ fontFamily:"system-ui,sans-serif", background:"#0e0e11", minHeight:"100vh", color:"#e0e0e0", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ textAlign:"center", maxWidth:440 }}>
          <div style={{ width:48, height:32, borderRadius:5, background:"linear-gradient(135deg,#c9a96e,#e8d5a8,#c9a96e)", margin:"0 auto 20px" }} />
          <h1 style={{ fontSize:28, fontWeight:700, lineHeight:1.2, marginBottom:12 }}>Amex Platinum Benefits Coach</h1>
          <p style={{ fontSize:13, color:"#888", lineHeight:1.7, marginBottom:24 }}>Track every credit, get enrollment guides, avoid pitfalls, and receive monthly reports showing where you stand.</p>
          <div style={{ display:"flex", gap:20, justifyContent:"center", marginBottom:24, flexWrap:"wrap" }}>
            {[["$3,800+","annual benefits"],["20","benefits"],["Monthly","reports"]].map(([v,l],i) => (
              <div key={i}><div style={{ fontSize:20, fontWeight:700, color:"#c9a96e", fontFamily:"monospace" }}>{v}</div><div style={{ fontSize:10, color:"#666" }}>{l}</div></div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
            <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => { if(e.key==="Enter") submitEmail(); }}
              placeholder="Enter your email" style={{ flex:1, minWidth:180, background:"#151518", border:"1px solid #2a2a30", borderRadius:8, color:"#e0e0e0", padding:"12px 14px", fontSize:13, fontFamily:"inherit", outline:"none" }} />
            <button onClick={submitEmail} style={{ background:"linear-gradient(135deg,#c9a96e,#a8893a)", color:"#111", border:"none", borderRadius:8, padding:"12px 20px", fontSize:13, fontWeight:600, cursor:"pointer" }}>Start Tracking</button>
          </div>
          <p style={{ fontSize:10, color:"#444", marginTop:12 }}>Free. Monthly reminders to your email.</p>
        </div>
      </div>
    );
  }

  const credits = card.benefits.filter(b => b.value > 0);
  const perks = card.benefits.filter(b => b.value === 0);
  const filtered = filter === "all" ? card.benefits : filter === "credits" ? credits : perks;
  const needsEnroll = card.benefits.filter(b => b.enrollReq && !b.enrolled);
  const totalAnnual = credits.reduce((s,b) => s + annualize(b.value, b.period), 0);
  const currentUsed = credits.reduce((s,b) => s + (b.usedAmount||0), 0);
  const currentTotal = credits.reduce((s,b) => s + b.value, 0);
  const enrolledCount = card.benefits.filter(b => b.enrolled || !b.enrollReq).length;

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:"#0e0e11", minHeight:"100vh", color:"#e0e0e0", padding:"18px 14px 44px", maxWidth:700, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, padding:"12px 14px", background:"#151518", borderRadius:10, border:"1px solid #1e1e23" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:18, borderRadius:3, background:"linear-gradient(135deg,#c9a96e,#e8d5a8,#c9a96e)" }} />
          <div><div style={{ fontSize:15, fontWeight:700, color:"#f0f0f0" }}>Amex Platinum</div><div style={{ fontSize:9, color:"#666" }}>Benefits Coach</div></div>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          <button onClick={() => setShowAnalysis(!showAnalysis)} style={{ background:showAnalysis?"rgba(142,207,142,.12)":"rgba(255,255,255,.05)", color:showAnalysis?"#8ecf8e":"#888", border:"1px solid", borderColor:showAnalysis?"rgba(142,207,142,.2)":"#1e1e23", borderRadius:7, padding:"6px 11px", fontSize:10, fontWeight:600, cursor:"pointer" }}>Keep or Cancel?</button>
          <button onClick={() => setShowReport(true)} style={{ background:"rgba(201,169,110,.1)", color:"#c9a96e", border:"1px solid rgba(201,169,110,.2)", borderRadius:7, padding:"6px 11px", fontSize:10, fontWeight:600, cursor:"pointer" }}>Monthly Report</button>
        </div>
      </div>

      {needsEnroll.length > 0 && (
        <div style={{ display:"flex", gap:7, alignItems:"center", background:"rgba(232,180,80,.05)", border:"1px solid rgba(232,180,80,.12)", borderRadius:8, padding:"9px 11px", marginBottom:10, fontSize:11, color:"#b89930" }}>
          {needsEnroll.length} benefit{needsEnroll.length !== 1 ? "s" : ""} not enrolled — you are missing credits.
        </div>
      )}

      {showAnalysis && (() => {
        const annualFee = 895;
        const now = new Date();
        const dayOfYear = Math.floor((now - new Date(now.getFullYear(),0,1)) / (1e3*60*60*24)) + 1;
        const fractionOfYear = dayOfYear / 365;
        const monthsElapsed = now.getMonth() + 1;

        const creditRedeemed = credits.reduce((s,b) => s + (b.usedAmount || 0), 0);
        const annualizedCredits = fractionOfYear > 0 ? Math.round(creditRedeemed / fractionOfYear) : 0;
        const maxPossible = Math.round(totalAnnual);

        const perkValues = {
          "centurion": 150, "pp": 100, "dsc": 125, "hilton": 300,
          "marriott": 200, "cell": 180, "nofx": 100
        };
        const perkValueUsed = perks.reduce((s,b) => s + (b.used ? (perkValues[b.id] || 50) : 0), 0);
        const totalValueRealized = creditRedeemed + perkValueUsed;
        const projectedTotal = annualizedCredits + perkValueUsed;

        const feePct = Math.min(100, Math.round((totalValueRealized / annualFee) * 100));
        const projPct = Math.min(100, Math.round((projectedTotal / annualFee) * 100));

        let verdict, verdictColor, verdictBg, reasons;
        if (feePct >= 100) {
          verdict = "KEEP — Already Paid For Itself";
          verdictColor = "#8ecf8e";
          verdictBg = "rgba(142,207,142,.08)";
          reasons = ["You have already recouped the $895 annual fee in realized value.", "Every additional benefit you use is pure profit."];
        } else if (projPct >= 100) {
          verdict = "KEEP — On Track to Break Even";
          verdictColor = "#c9a96e";
          verdictBg = "rgba(201,169,110,.06)";
          reasons = ["At your current pace, you will exceed the $895 fee by year-end.", "Focus on maximizing monthly and quarterly credits to stay on track."];
        } else if (projPct >= 70) {
          verdict = "BORDERLINE — Close But Not There Yet";
          verdictColor = "#e8c76a";
          verdictBg = "rgba(232,180,80,.06)";
          reasons = ["You are projected to recoup ~" + projPct + "% of the fee.", "Activating more perks or enrolling in unused credits could push you over."];
        } else {
          verdict = "CONSIDER CANCELLING";
          verdictColor = "#e87c7c";
          verdictBg = "rgba(232,124,124,.06)";
          reasons = ["You are on pace to recoup only ~" + projPct + "% of the $895 fee.", "Review unenrolled benefits — there may be easy value you are missing."];
        }

        if (needsEnroll.length > 3) {
          reasons.push(needsEnroll.length + " benefits still not enrolled. Enrolling could significantly increase your return.");
        }

        const usedPerksCount = perks.filter(b => b.used).length;
        if (usedPerksCount < 3) {
          reasons.push("Only " + usedPerksCount + " of " + perks.length + " perks activated. Lounge access, hotel status, and insurance add significant value.");
        }

        return (
          <div style={{ background:"#151518", borderRadius:10, border:"1px solid #1e1e23", padding:"16px 14px", marginBottom:10 }}>
            <div style={{ background:verdictBg, border:"1px solid", borderColor:verdictColor+"33", borderRadius:8, padding:"12px 14px", marginBottom:14, textAlign:"center" }}>
              <div style={{ fontSize:14, fontWeight:700, color:verdictColor, marginBottom:4 }}>{verdict}</div>
              <div style={{ fontSize:11, color:"#888" }}>Based on {monthsElapsed} months of tracking data</div>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:11, color:"#999" }}>Fee Recovery</span>
                <span style={{ fontSize:12, fontWeight:700, fontFamily:"monospace", color:feePct>=100?"#8ecf8e":"#f0f0f0" }}>{feePct}%</span>
              </div>
              <div style={{ height:8, background:"#0e0e11", borderRadius:4, overflow:"hidden", position:"relative" }}>
                <div style={{ position:"absolute", left:0, top:0, height:"100%", width:feePct+"%", background:feePct>=100?"linear-gradient(90deg,#4a9e4a,#8ecf8e)":feePct>=70?"linear-gradient(90deg,#b89930,#e8c76a)":"linear-gradient(90deg,#b84040,#e87c7c)", borderRadius:4 }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                <span style={{ fontSize:9, color:"#555" }}>$0</span>
                <span style={{ fontSize:9, color:"#555" }}>$895 fee</span>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
              <div style={{ background:"#0e0e11", borderRadius:6, padding:"10px" }}>
                <div style={{ fontSize:8, color:"#555", textTransform:"uppercase", marginBottom:3 }}>Credits Redeemed</div>
                <div style={{ fontSize:18, fontWeight:700, fontFamily:"monospace", color:"#8ecf8e" }}>${creditRedeemed.toFixed(0)}</div>
                <div style={{ fontSize:9, color:"#555" }}>of ~${maxPossible.toLocaleString()} possible/yr</div>
              </div>
              <div style={{ background:"#0e0e11", borderRadius:6, padding:"10px" }}>
                <div style={{ fontSize:8, color:"#555", textTransform:"uppercase", marginBottom:3 }}>Est. Perk Value</div>
                <div style={{ fontSize:18, fontWeight:700, fontFamily:"monospace", color:"#c9a96e" }}>${perkValueUsed}</div>
                <div style={{ fontSize:9, color:"#555" }}>{usedPerksCount} of {perks.length} perks used</div>
              </div>
              <div style={{ background:"#0e0e11", borderRadius:6, padding:"10px" }}>
                <div style={{ fontSize:8, color:"#555", textTransform:"uppercase", marginBottom:3 }}>Total Value Realized</div>
                <div style={{ fontSize:18, fontWeight:700, fontFamily:"monospace", color:totalValueRealized >= annualFee ? "#8ecf8e" : "#f0f0f0" }}>${totalValueRealized.toFixed(0)}</div>
                <div style={{ fontSize:9, color:"#555" }}>credits + est. perks</div>
              </div>
              <div style={{ background:"#0e0e11", borderRadius:6, padding:"10px" }}>
                <div style={{ fontSize:8, color:"#555", textTransform:"uppercase", marginBottom:3 }}>Projected Annual</div>
                <div style={{ fontSize:18, fontWeight:700, fontFamily:"monospace", color:projectedTotal >= annualFee ? "#8ecf8e" : "#e8c76a" }}>${projectedTotal.toFixed(0)}</div>
                <div style={{ fontSize:9, color:"#555" }}>at current pace</div>
              </div>
            </div>

            <div style={{ borderTop:"1px solid #1e1e23", paddingTop:10 }}>
              <div style={{ fontSize:10, color:"#777", textTransform:"uppercase", marginBottom:6, fontWeight:600 }}>Key Factors</div>
              {reasons.map((r, i) => (
                <div key={i} style={{ display:"flex", gap:5, marginBottom:4 }}>
                  <span style={{ color:verdictColor, fontSize:10, flexShrink:0 }}>-</span>
                  <span style={{ fontSize:11, color:"#aaa", lineHeight:1.4 }}>{r}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize:9, color:"#444", marginTop:10, lineHeight:1.4 }}>
              Perk values are estimates based on typical usage. Lounge access valued at $100-$150/yr, hotel elite status at $200-$300/yr, cell phone protection at ~$180/yr. Your actual value may vary based on usage patterns.
            </div>
          </div>
        );
      })()}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:5, marginBottom:10 }}>
        {[["Annual Value","~$"+Math.round(totalAnnual).toLocaleString(),"#8ecf8e"],["Period Used","$"+currentUsed.toFixed(0)+"/$"+currentTotal.toFixed(0),"#c9a96e"],["Enrolled",enrolledCount+"/"+card.benefits.length,enrolledCount===card.benefits.length?"#8ecf8e":"#e8c76a"]].map(([l,v,c],i) => (
          <div key={i} style={{ background:"#151518", borderRadius:8, padding:"10px", border:"1px solid #1a1a1f" }}>
            <div style={{ fontSize:8, color:"#555", textTransform:"uppercase", letterSpacing:".3px", marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:15, fontWeight:700, fontFamily:"monospace", color:c }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:4, marginBottom:8 }}>
        {[["all","All ("+card.benefits.length+")"],["credits","Credits ("+credits.length+")"],["perks","Perks ("+perks.length+")"]].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ background:filter===k?"rgba(201,169,110,.08)":"transparent", color:filter===k?"#c9a96e":"#555", border:"1px solid", borderColor:filter===k?"rgba(201,169,110,.2)":"#1a1a1f", borderRadius:5, padding:"3px 9px", fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
        ))}
      </div>

      {filtered.map(b => {
        const open = expandedId === b.id;
        const isPerk = b.value === 0;
        const pct = isPerk ? (b.used?100:0) : (b.value>0 ? Math.min(100,Math.round(((b.usedAmount||0)/b.value)*100)) : 0);
        const days = getDaysUntilReset(b.period);
        const done = isPerk ? b.used : pct >= 100;
        const needsE = b.enrollReq && !b.enrolled;
        const dot = done ? "#8ecf8e" : needsE ? "#e8c76a" : "#555";

        return (
          <div key={b.id} style={{ background:"#151518", borderRadius:9, border:"1px solid", borderColor:done?"rgba(142,207,142,.18)":needsE?"rgba(232,180,80,.12)":"#1e1e23", marginBottom:4, overflow:"hidden" }}>
            <div onClick={() => { setExpandedId(open?null:b.id); setActiveTab("guide"); }} style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 11px", cursor:"pointer" }}>
              <div style={{ width:6, height:6, borderRadius:3, background:dot, flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#ddd", marginBottom:1 }}>{b.name}</div>
                <div style={{ display:"flex", gap:3, flexWrap:"wrap", alignItems:"center" }}>
                  <span style={{ fontSize:8, color:"#c9a96e", background:"rgba(201,169,110,.07)", padding:"1px 5px", borderRadius:3 }}>{b.cat}</span>
                  <span style={{ fontSize:8, color:"#555", background:"rgba(255,255,255,.03)", padding:"1px 5px", borderRadius:3 }}>{b.period}</span>
                  {days != null && <span style={{ fontSize:8, color:days<=14?"#e87c7c":days<=30?"#e8c76a":"#555", background:"rgba(255,255,255,.03)", padding:"1px 5px", borderRadius:3 }}>{days}d</span>}
                  {needsE && <span style={{ fontSize:7, color:"#e8c76a", background:"rgba(232,180,80,.1)", padding:"1px 5px", borderRadius:3, fontWeight:700 }}>NOT ENROLLED</span>}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                {isPerk ? <span style={{ fontSize:9, color:"#555" }}>Perk</span> : <span style={{ fontSize:13, fontWeight:700, fontFamily:"monospace", color:"#f0f0f0" }}>${b.value}<span style={{ fontSize:9, color:"#555", fontWeight:400 }}>{getPeriodLabel(b.period)}</span></span>}
                <div style={{ fontSize:8, color:"#333", marginTop:1 }}>{open ? "^" : "v"}</div>
              </div>
            </div>

            {!isPerk && <div style={{ height:2, background:"#1a1a1f", marginLeft:11, marginRight:11 }}><div style={{ height:"100%", width:pct+"%", background:pct>=100?"#8ecf8e":pct>0?"#c9a96e":"transparent" }} /></div>}

            {open && (
              <div style={{ padding:"0 11px 12px" }}>
                <p style={{ fontSize:12.5, fontWeight:600, color:"#c9a96e", margin:"6px 0 8px", lineHeight:1.4 }}>{b.headline}</p>
                <div style={{ display:"flex", gap:3, marginBottom:7, borderBottom:"1px solid #1a1a1f", paddingBottom:5 }}>
                  {[["guide","How to Use"],["tips","Pro Tips"],["pitfalls","Pitfalls"]].map(([k,l]) => (
                    <button key={k} onClick={() => setActiveTab(k)} style={{ background:activeTab===k?"rgba(201,169,110,.08)":"transparent", color:activeTab===k?"#c9a96e":"#555", border:"none", padding:"3px 7px", fontSize:10, cursor:"pointer", borderRadius:4, fontFamily:"inherit" }}>{l}</button>
                  ))}
                </div>
                <div style={{ minHeight:40, marginBottom:8 }}>
                  {activeTab === "guide" && (
                    <div>
                      {b.howTo.map((s,i) => (
                        <div key={i} style={{ display:"flex", gap:6, marginBottom:5 }}>
                          <span style={{ width:16, height:16, borderRadius:8, background:"rgba(201,169,110,.1)", color:"#c9a96e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, flexShrink:0 }}>{i+1}</span>
                          <span style={{ fontSize:11, color:"#bbb", lineHeight:1.5 }}>{s}</span>
                        </div>
                      ))}
                      {b.enrollReq && (
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, background:"rgba(201,169,110,.04)", border:"1px solid rgba(201,169,110,.1)", borderRadius:6, padding:"8px 9px", marginTop:6, flexWrap:"wrap" }}>
                          <div><div style={{ fontSize:9, color:"#c9a96e", fontWeight:600 }}>ENROLLMENT</div><div style={{ fontSize:10, color:"#999" }}>{b.enrollAction}</div></div>
                          <button onClick={(e) => { e.stopPropagation(); toggleEnrolled(b.id); }} style={{ background:b.enrolled?"rgba(142,207,142,.12)":"rgba(201,169,110,.12)", color:b.enrolled?"#8ecf8e":"#c9a96e", border:"none", borderRadius:5, padding:"4px 10px", fontSize:10, fontWeight:600, cursor:"pointer" }}>
                            {b.enrolled ? "Enrolled" : "Mark Enrolled"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === "tips" && b.tips.map((t,i) => (
                    <div key={i} style={{ display:"flex", gap:5, marginBottom:5 }}>
                      <span style={{ fontSize:10, flexShrink:0 }}>{"*"}</span>
                      <span style={{ fontSize:11, color:"#a8d8a8", lineHeight:1.5 }}>{t}</span>
                    </div>
                  ))}
                  {activeTab === "pitfalls" && b.pitfalls.map((p,i) => (
                    <div key={i} style={{ display:"flex", gap:5, marginBottom:5 }}>
                      <span style={{ fontSize:10, flexShrink:0 }}>{"!"}</span>
                      <span style={{ fontSize:11, color:"#e8c76a", lineHeight:1.5 }}>{p}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop:"1px solid #1a1a1f", paddingTop:7 }}>
                  {isPerk ? (
                    <button onClick={() => togglePerk(b.id)} style={{ width:"100%", border:"none", borderRadius:5, padding:"6px", fontSize:10, fontWeight:600, cursor:"pointer", background:b.used?"rgba(142,207,142,.1)":"rgba(201,169,110,.1)", color:b.used?"#8ecf8e":"#c9a96e" }}>
                      {b.used ? "Benefit Used" : "Mark as Used"}
                    </button>
                  ) : (
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontSize:10, color:"#666" }}>Used:</span>
                      <div style={{ display:"flex", alignItems:"center", gap:3, background:"#0e0e11", border:"1px solid #1a1a1f", borderRadius:4, padding:"3px 6px" }}>
                        <span style={{ color:"#555", fontSize:11 }}>$</span>
                        <input type="number" value={b.usedAmount||""} placeholder="0" min="0" max={b.value} step="0.01" onChange={e => setUsedAmt(b.id,e.target.value)}
                          style={{ width:45, background:"transparent", border:"none", color:"#e0e0e0", fontSize:11, fontFamily:"monospace", textAlign:"right", outline:"none" }} />
                        <span style={{ color:"#444", fontSize:10 }}>/ ${b.value}</span>
                      </div>
                      <button onClick={() => markFull(b.id)} style={{ background:"rgba(201,169,110,.1)", color:"#c9a96e", border:"none", borderRadius:3, padding:"3px 7px", fontSize:9, fontWeight:600, cursor:"pointer" }}>Max</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {showReport && <MonthlyReport card={card} email={email} onClose={() => setShowReport(false)} />}
      {toast && <div style={{ position:"fixed", bottom:16, left:"50%", transform:"translateX(-50%)", background:"#222", color:"#e0e0e0", padding:"6px 14px", borderRadius:7, fontSize:11, border:"1px solid #333", zIndex:1100 }}>{toast}</div>}
    </div>
  );
}
