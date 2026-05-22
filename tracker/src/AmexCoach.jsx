import { useState, useEffect, useCallback } from "react";

const MULTI_SK = "multi-card-tracker-v1";
const OLD_SK   = "amex-coach-v5";
const SK_EMAIL = "amex-coach-email-v5";
const API_URL  = "https://amex-benefits-backend.onrender.com";

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

const AMEX_BENEFITS = [
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

const CSP_BENEFITS = [
  { id: "csp-hotel", name: "Chase Travel Hotel Credit", cat: "Hotels", value: 50, period: "Annually",
    headline: "$50/yr hotel credit when booking through Chase Travel",
    howTo: ["Book a hotel through Chase Travel at chasetravel.com or call the number on the back of your card", "Pay with your Chase Sapphire Preferred card", "Credit is automatically applied — no enrollment needed", "Credit resets on your account anniversary date (not January 1)"],
    pitfalls: ["Must book through Chase Travel — booking directly with hotel does NOT qualify", "Purchases qualifying for this credit do NOT earn points — credit OR points, not both", "Anniversary year means your account open date, not January 1 — check your open date", "FROSCH by Chase Travel bookings do NOT qualify for the hotel credit"],
    tips: ["Even a one-night hotel stay through Chase Travel triggers the credit", "At $95 annual fee, this credit alone covers more than half the cost of the card", "Book in advance — the credit applies to the charge date, not the stay date"],
    enrollReq: false, enrollAction: "Automatic — book through chasetravel.com" },
  { id: "dashpass", name: "DashPass Membership", cat: "Dining", value: 120, period: "Annually",
    headline: "Complimentary DashPass subscription (~$120 value/yr)",
    howTo: ["Go to the DoorDash app or website", "Select DashPass and choose the free activation option for Chase cardholders", "Add your Chase Sapphire Preferred as payment method", "Activate your complimentary membership"],
    pitfalls: ["Must activate through DoorDash — not automatic", "After the complimentary period, DashPass auto-renews at the standard rate if not cancelled", "Benefit is subject to change — check chase.com/sapphire for current terms"],
    tips: ["DashPass gives free delivery and reduced service fees on $12+ orders", "If you order delivery even once a month, this easily covers the $95 annual fee alone", "Also works on Caviar orders"],
    enrollReq: true, enrollAction: "Activate through DoorDash app with your CSP card" },
  { id: "instacart-plus", name: "Instacart+ Membership", cat: "Grocery", value: 99, period: "Annually",
    headline: "Complimentary Instacart+ membership (~$99 value/yr)",
    howTo: ["Go to instacart.com or the Instacart app", "Look for the Chase cardholder benefit activation", "Add your Chase Sapphire Preferred as payment method", "Activate your complimentary membership"],
    pitfalls: ["Must activate — not automatic", "Auto-renews at standard rate after complimentary period if not cancelled", "Benefit subject to change"],
    tips: ["Free delivery on orders $35+ with Instacart+", "Combine with 3x points on online grocery purchases for maximum value", "Target, Walmart, and wholesale clubs excluded from 3x grocery but Instacart+ still applies"],
    enrollReq: true, enrollAction: "Activate at instacart.com with your CSP card" },
  { id: "csp-5x", name: "5x Points on Chase Travel", cat: "Travel", value: 0, period: "Annually",
    headline: "5 points per $1 on flights, hotels, and travel booked through Chase Travel",
    howTo: ["Book all travel at chasetravel.com or call Chase Travel", "Pay with your Chase Sapphire Preferred", "Points post at the close of your monthly billing cycle"],
    pitfalls: ["Only applies to bookings through Chase Travel — direct bookings earn only 2x", "FROSCH by Chase Travel bookings do NOT qualify for 5x", "Purchases qualifying for the $50 hotel credit do NOT earn points"],
    tips: ["Points are worth 1.25 cents each through Chase Travel — effectively 6.25% back on travel", "Transfer to airline and hotel partners (Hyatt, United, Southwest) for potentially higher value", "Always compare Chase Travel vs direct — sometimes direct rates are lower"],
    enrollReq: false, enrollAction: "Automatic — book through chasetravel.com" },
  { id: "csp-3x-dining", name: "3x Points on Dining", cat: "Dining", value: 0, period: "Annually",
    headline: "3 points per $1 on restaurants, takeout, and eligible delivery",
    howTo: ["Use your Chase Sapphire Preferred at any restaurant, takeout, or eligible delivery service", "Points post automatically at the end of your billing cycle"],
    pitfalls: ["Some restaurant purchases through third-party payment apps may not code as dining", "Bars coded as 'drinking establishments' may earn 1x instead of 3x"],
    tips: ["One of the best dining rewards rates at this price point", "Stacks with DashPass for delivery orders — 3x points plus free delivery", "Eligible delivery services include DoorDash, Grubhub, Uber Eats, and similar"],
    enrollReq: false, enrollAction: "Automatic" },
  { id: "csp-3x-streaming", name: "3x Points on Select Streaming", cat: "Streaming", value: 0, period: "Annually",
    headline: "3 points per $1 on select streaming services",
    howTo: ["Pay for eligible streaming services with your Chase Sapphire Preferred", "Points post automatically"],
    pitfalls: ["Not all streaming services qualify — Chase defines 'select streaming'", "Purchases through third-party apps or bundles may not qualify"],
    tips: ["Subscribe directly with the streaming service, not through Apple TV or Amazon channels", "Netflix, Hulu, Disney+, Spotify, and most major services qualify"],
    enrollReq: false, enrollAction: "Automatic — pay subscriptions with your CSP" },
  { id: "csp-3x-grocery", name: "3x Points on Online Grocery", cat: "Grocery", value: 0, period: "Annually",
    headline: "3 points per $1 on online grocery purchases",
    howTo: ["Shop online at qualifying grocery retailers", "Pay with your Chase Sapphire Preferred"],
    pitfalls: ["Target, Walmart, and wholesale clubs (Costco, Sam's Club) are EXCLUDED", "Must be online grocery — in-store purchases earn only 1x", "Some grocery delivery apps may code differently — check your statement"],
    tips: ["Instacart, Amazon Fresh, and most online grocery services qualify", "Combine with complimentary Instacart+ for maximum value — 3x points plus free delivery"],
    enrollReq: false, enrollAction: "Automatic — shop online grocery with your CSP" },
  { id: "csp-2x-travel", name: "2x Points on All Other Travel", cat: "Travel", value: 0, period: "Annually",
    headline: "2 points per $1 on travel not booked through Chase Travel",
    howTo: ["Pay for any travel purchases (flights, hotels, Uber, parking, tolls) with your CSP", "Points post automatically"],
    pitfalls: ["Travel booked through Chase Travel earns 5x, not 2x", "FROSCH bookings earn 2x", "Rideshare (Uber, Lyft) typically codes as travel and earns 2x"],
    tips: ["Gas stations sometimes code as travel — watch your statement", "Uber, Lyft, trains, taxis, parking meters, and tolls all typically earn 2x"],
    enrollReq: false, enrollAction: "Automatic" },
  { id: "anniversary-bonus", name: "10% Anniversary Points Bonus", cat: "Other", value: 0, period: "Annually",
    headline: "Earn 10% of your total annual spend in bonus points each anniversary year",
    howTo: ["Simply use your card throughout the year", "After your account anniversary, Chase calculates 10% of all points earned from purchases", "Bonus points post within 2-3 billing cycles after your anniversary date"],
    pitfalls: ["Based on points earned from purchases only — not sign-up bonuses or transferred points", "Account must be open and not in default at time of fulfillment", "Allow 2-3 billing cycles for bonus points to post after anniversary"],
    tips: ["$25,000 in annual spend (25,000 base points) earns a 2,500 point bonus", "Points are worth at least 1 cent each — effectively 10% more value on base spend", "Transfer to travel partners for potentially higher value per point"],
    enrollReq: false, enrollAction: "Automatic — happens each anniversary year" },
  { id: "rental-car", name: "Primary Rental Car Insurance", cat: "Insurance", value: 0, period: "Annually",
    headline: "Primary rental car insurance — rare at this price point",
    howTo: ["Decline the rental company's CDW/LDW coverage", "Pay for the entire rental with your Chase Sapphire Preferred", "File a claim through Chase if damage or theft occurs"],
    pitfalls: ["Exotic, antique, and certain luxury vehicles may be excluded", "Rentals exceeding 31 consecutive days may not be covered"],
    tips: ["Primary coverage means no filing with personal insurance first — no rate increase risk", "Saves $15-30/day vs buying the rental company's CDW", "One of the biggest underrated advantages of the CSP over other travel cards"],
    enrollReq: false, enrollAction: "Decline CDW at rental counter and pay with CSP" },
  { id: "trip-cancel", name: "Trip Cancellation Insurance", cat: "Insurance", value: 0, period: "Annually",
    headline: "Up to $10,000/person for trip cancellation or interruption",
    howTo: ["Pay for your trip with your Chase Sapphire Preferred", "If your trip is cancelled or interrupted for a covered reason, file a claim"],
    pitfalls: ["Covered reasons are specific — check chase.com/sapphire for full list", "Pre-existing conditions may not be covered"],
    tips: ["Covers up to $10,000 per person and $20,000 per trip", "Covered reasons include illness, severe weather, and other qualifying events", "Much broader than most travel insurance purchased separately"],
    enrollReq: false, enrollAction: "Pay for trips with your CSP" },
  { id: "csp-nofx", name: "No Foreign Transaction Fees", cat: "Travel", value: 0, period: "Annually",
    headline: "Zero foreign transaction fees worldwide",
    howTo: ["Use your Chase Sapphire Preferred internationally", "Automatic — no enrollment needed"],
    pitfalls: ["ATMs and merchants may charge their own fees", "Always pay in local currency — never choose 'convert to USD' at merchants"],
    tips: ["Saves the typical 3% fee most non-travel cards charge", "On a $5,000 international trip, that's $150 in savings"],
    enrollReq: false, enrollAction: "Automatic" },
  { id: "transfer-points", name: "Points Transfer to Travel Partners", cat: "Travel", value: 0, period: "Annually",
    headline: "Transfer points 1:1 to 14 airline and hotel partners",
    howTo: ["Log into chase.com/ultimaterewards", "Select 'Transfer Points' and choose your partner program", "Enter your partner loyalty number — it must match your name exactly", "Transfers process within one business day for most partners"],
    pitfalls: ["Transfers are INSTANT and IRREVERSIBLE — cannot be cancelled or refunded", "Points must transfer in 1,000-point increments", "Loyalty account details must match exactly — name discrepancies cause failures"],
    tips: ["Transferring to Hyatt is widely considered the best redemption — points worth 2+ cents each", "United, Southwest, British Airways, Air France/KLM are popular airline partners", "Wait until you have a specific redemption in mind before transferring — points lose flexibility once moved"],
    enrollReq: false, enrollAction: "Automatic — transfer through chase.com/ultimaterewards" },
];

const UNITED_EXPLORER_BENEFITS = [
  { id: "ue-club-passes", name: "United Club Passes (2/yr)", cat: "Lounge", value: 118, period: "Annually",
    headline: "2 United Club one-time passes per year (~$59 each)",
    howTo: ["Passes are issued to your MileagePlus account each cardmember year", "Present pass at any United Club location for single-visit entry", "Find your passes at united.com under MileagePlus Benefits or in the United app", "Passes are issued at account opening and each anniversary"],
    pitfalls: ["Passes expire at the end of your cardmember year — use them before your anniversary", "Passes are for the cardholder only — guests must purchase day passes ($59/ea)", "Not valid at United Polaris lounges or Star Alliance partner lounges", "Passes cannot be transferred or sold (though they can be gifted to accompany you)"],
    tips: ["Use before a domestic flight when you'd otherwise pay $59 at the door", "Best value on long layovers — food, drinks, Wi-Fi, and quiet workspace included", "Even one pass used per year covers over half the $95 annual fee", "Check the app before heading to the lounge — some locations have capacity limits"],
    enrollReq: false, enrollAction: "Automatic — passes issued to your MileagePlus account" },
  { id: "ue-global-entry", name: "Global Entry / TSA PreCheck Credit", cat: "Travel", value: 100, period: "Every 4 Years",
    headline: "$100 credit for Global Entry, TSA PreCheck, or NEXUS every 4 years",
    howTo: ["Apply for Global Entry at cbp.gov/goes or TSA PreCheck at tsa.gov", "Pay the application fee with your United Explorer Card", "Statement credit posts automatically within 1-2 billing cycles", "Credit covers the full $100 Global Entry fee or $85 TSA PreCheck fee"],
    pitfalls: ["Only one program credited per 4-year period — whichever fee posts first", "NEXUS ($50) is also covered but less common", "Must pay with the United Explorer Card — not another card", "Credit is per account, not per card — if you have multiple United cards, coordinate"],
    tips: ["Always choose Global Entry — it includes TSA PreCheck automatically at no extra cost", "Apply for a family member if you already have Global Entry — your card covers them too", "Global Entry also expedites customs re-entry from international trips", "Current processing times can be 6-12 months — apply early"],
    enrollReq: false, enrollAction: "Apply at cbp.gov/goes, pay with United Explorer Card" },
  { id: "ue-free-bag", name: "Free First Checked Bag", cat: "Airlines", value: 0, period: "Annually",
    headline: "Free first checked bag for you and 1 companion on United flights",
    howTo: ["Book your United flight with your United Explorer Card", "Your MileagePlus number must be on the reservation", "Your companion must be on the same reservation", "Bags are waived automatically at check-in — no action needed at the airport"],
    pitfalls: ["Must book with the United Explorer Card for the benefit to apply", "Only applies to first checked bag — second bag fees still apply", "Companion must be on the same reservation, not just the same flight", "Basic Economy fares do NOT include free checked bags even with the card"],
    tips: ["Saves $35/bag each way = $70/round trip for just yourself, $140 with one companion", "Even one round trip with a companion pays for the $95 annual fee", "Works on United and United Express-operated flights", "Your MileagePlus number must be in the reservation before check-in"],
    enrollReq: false, enrollAction: "Book with Explorer Card + add MileagePlus number to reservation" },
  { id: "ue-priority-board", name: "Priority Boarding", cat: "Airlines", value: 0, period: "Annually",
    headline: "Group 2 boarding on United flights — board before the general public",
    howTo: ["Book any United or United Express flight", "Your boarding pass will automatically show Group 2 or Premier Access", "Board when Group 2 is called"],
    pitfalls: ["Does not apply to Basic Economy fares", "Group 2 is after first class and Premiers, but before Groups 3-5", "Does not guarantee overhead bin space — popular routes fill up fast"],
    tips: ["Overhead bin space is the real win — Group 2 almost always means room for your carry-on", "Pair with free checked bag to avoid the bin scramble entirely", "Much better than Group 4 or 5 on full flights"],
    enrollReq: false, enrollAction: "Automatic — board when Group 2 is called" },
  { id: "ue-25pct-inflight", name: "25% Back on In-Flight Purchases", cat: "Airlines", value: 0, period: "Annually",
    headline: "25% back as miles on United in-flight food, drinks, and Wi-Fi",
    howTo: ["Pay for any in-flight United purchase with your Explorer Card", "25% of the purchase amount posts back as miles", "Miles credit within 6-8 weeks"],
    pitfalls: ["Returns miles, not cash — value depends on your mile redemption rate", "Only applies to in-flight purchases on United-operated flights", "Does not apply to purchases made at the gate or in the terminal"],
    tips: ["Wi-Fi on long flights can cost $20-30 — 25% back reduces the sting", "Best used on pricier items like flight snack boxes or premium drinks", "At 1.4 cents per mile, 25% back on a $20 Wi-Fi pass = ~$5 back"],
    enrollReq: false, enrollAction: "Automatic — pay with Explorer Card in-flight" },
  { id: "ue-2x-united", name: "2x Miles on United Purchases", cat: "Airlines", value: 0, period: "Annually",
    headline: "2 MileagePlus miles per $1 on United tickets, bags, upgrades, and more",
    howTo: ["Pay for any United purchase directly with your Explorer Card", "Miles post at the end of your billing cycle", "Applies to united.com, United app, and phone purchases"],
    pitfalls: ["Only applies to purchases made directly with United — travel agencies earn 1x", "Award ticket taxes and fees do count for bonus miles", "United Club passes purchased separately may not earn 2x"],
    tips: ["Book directly at united.com to maximize miles — OTAs earn only 1x", "Stack with MileagePlus miles earned from the flight itself for double miles", "Combine with a Chase account for potential Ultimate Rewards transfer"],
    enrollReq: false, enrollAction: "Automatic — pay United purchases with Explorer Card" },
  { id: "ue-2x-dining", name: "2x Miles on Dining", cat: "Dining", value: 0, period: "Annually",
    headline: "2 miles per $1 at restaurants, takeout, and eligible delivery",
    howTo: ["Use your United Explorer Card at any restaurant, bar, or eligible delivery service", "Miles post automatically at end of billing cycle"],
    pitfalls: ["Some delivery apps may code as something other than dining — check your statement", "Meal kit services like HelloFresh may not code as dining"],
    tips: ["Consistent daily spend category — use Explorer as your default dining card", "2x on dining is competitive at this price point", "Pair with United flights for a complete miles-earning ecosystem"],
    enrollReq: false, enrollAction: "Automatic — use Explorer Card at restaurants" },
  { id: "ue-2x-hotel", name: "2x Miles on Hotel Stays", cat: "Hotels", value: 0, period: "Annually",
    headline: "2 miles per $1 on hotel stays booked directly with the hotel",
    howTo: ["Pay for hotel stays directly with the hotel using your Explorer Card", "Miles post at the end of your billing cycle"],
    pitfalls: ["Must book directly with hotel — OTAs (Expedia, Hotels.com) earn only 1x", "Prepaid hotel bookings through third parties may not qualify", "Some resort fees may not earn 2x if billed separately"],
    tips: ["Book direct anyway — hotels usually offer better cancellation policies than OTAs", "Combine with hotel loyalty program points for double rewards", "IHG stays earn 2x with your card + IHG points — good stack"],
    enrollReq: false, enrollAction: "Automatic — book directly with hotel and pay with Explorer Card" },
  { id: "ue-nofx", name: "No Foreign Transaction Fees", cat: "Travel", value: 0, period: "Annually",
    headline: "Zero foreign transaction fees worldwide",
    howTo: ["Use your United Explorer Card for any international purchase", "No enrollment needed — automatic"],
    pitfalls: ["ATMs and merchants may still charge their own conversion fees", "Always choose to pay in local currency — decline 'convert to USD' at the terminal"],
    tips: ["Saves the typical 3% fee most non-travel cards charge", "$3,000 in international spending = $90 in savings"],
    enrollReq: false, enrollAction: "Automatic" },
  { id: "ue-auto-rental", name: "Primary Auto Rental Coverage", cat: "Insurance", value: 0, period: "Annually",
    headline: "Primary rental car coverage up to $60,000 — no personal insurance needed first",
    howTo: ["Decline the rental company's CDW/LDW collision coverage at the counter", "Pay for the entire rental with your United Explorer Card", "If damage/theft occurs, call 1-800-350-2919 or visit chasecardbenefits.com within 100 days"],
    pitfalls: ["Must decline CDW/LDW at counter — accepting it voids this benefit", "Exotic vehicles (Ferrari, Lamborghini, etc.) and vehicles over $125,000 are excluded", "Rental periods over 31 consecutive days are not covered", "Coverage is primary — but NY residents: primary only if you have no personal auto insurance"],
    tips: ["Primary coverage means you don't file with your personal insurance first — no rate increase risk", "Saves $15-30/day compared to buying CDW at the rental counter", "Coverage available worldwide — not just in the US"],
    enrollReq: false, enrollAction: "Decline CDW at rental counter and pay entire rental with Explorer Card" },
  { id: "ue-baggage-delay", name: "Baggage Delay Insurance", cat: "Insurance", value: 0, period: "Annually",
    headline: "$100/day (up to 3 days) if your checked bag is delayed 6+ hours",
    howTo: ["Report the baggage delay to the airline before leaving the airport — get a written confirmation", "Pay for essential items (toiletries, change of clothes, chargers) and keep receipts", "File a claim at chasecardbenefits.com or 1-800-350-2919 within 20 days", "Submit receipts and airline confirmation of delay within 90 days"],
    pitfalls: ["Delay must be 6+ hours — shorter delays are not covered", "Cameras, jewelry, electronics, and recreational equipment are NOT covered — essentials only", "Must have paid for the flight with your Explorer Card or MileagePlus miles", "This is secondary coverage — airline reimbursement is subtracted from your claim"],
    tips: ["Keep all receipts for essentials purchased while waiting for your bag", "Report to the airline immediately and get the delay in writing at the airport", "The 20-day filing window is short — don't wait"],
    enrollReq: false, enrollAction: "Report to airline at airport; file at chasecardbenefits.com" },
  { id: "ue-lost-luggage", name: "Lost Luggage Reimbursement", cat: "Insurance", value: 0, period: "Annually",
    headline: "Up to $3,000/traveler if luggage is lost, damaged, or stolen by the airline",
    howTo: ["Report lost/damaged baggage to the airline before leaving the airport", "File a claim with the airline and keep a copy of the report", "Visit chasecardbenefits.com or call 1-800-350-2919 within 20 days", "Submit documentation within 90 days"],
    pitfalls: ["Covers the difference between actual cash value and what the airline pays — not full replacement cost", "$500 sub-limit for jewelry/watches and $500 for cameras/electronics (within the $3,000 total)", "Money, tickets, documents, securities, and furs are NOT covered", "Coverage is secondary to the airline's own reimbursement"],
    tips: ["Always report to the airline before leaving the baggage claim area", "Take photos of your bags before travel — helps substantiate value claims", "Covers carry-on baggage while on the aircraft as well as checked bags"],
    enrollReq: false, enrollAction: "Report to airline at airport; file at chasecardbenefits.com" },
  { id: "ue-purchase-protect", name: "Purchase Protection", cat: "Insurance", value: 0, period: "Annually",
    headline: "$10,000/item protection against theft or damage for 120 days from purchase",
    howTo: ["Pay for the item with your United Explorer Card", "If the item is stolen or damaged within 120 days, file a claim at chasecardbenefits.com within 90 days", "Submit receipts, police report (if stolen), and repair estimate"],
    pitfalls: ["$10,000 per item, $50,000 per calendar year maximum", "Doesn't cover mysterious disappearance (item went missing with no evidence of theft)", "Used/pre-owned items are not covered", "Coverage is secondary — file with your homeowners/renters insurance first if applicable"],
    tips: ["Covers new purchases — great for electronics, luggage, and gear", "Keep receipts for all major purchases on this card", "120-day window is generous — one of the strongest purchase protection periods available"],
    enrollReq: false, enrollAction: "Automatic — pay with Explorer Card and file at chasecardbenefits.com" },
  { id: "ue-ext-warranty", name: "Extended Warranty Protection", cat: "Insurance", value: 0, period: "Annually",
    headline: "+1 year added to original manufacturer's US warranty (up to $10,000/item)",
    howTo: ["Pay for the item with your United Explorer Card", "Warranty extension begins automatically when the original manufacturer's warranty expires", "To file a claim, visit chasecardbenefits.com or call 1-800-350-2919 within 90 days of failure"],
    pitfalls: ["Only extends warranties of 3 years or less — items with 3+ year warranties are not extended", "Covers only what the original manufacturer's warranty would have covered", "Vehicles, boats, aircraft, computer software, and medical equipment are excluded", "Combined (original + extended) coverage cannot exceed 4 years"],
    tips: ["Store your receipts and warranty info at chasecardbenefits.com for easy claims", "Especially useful for electronics, appliances, and tools", "Best on items with 1-2 year warranties — you get +1 year free"],
    enrollReq: false, enrollAction: "Automatic — pay with Explorer Card; store warranty at chasecardbenefits.com" },
  { id: "ue-trip-cancel", name: "Trip Cancellation/Interruption Insurance", cat: "Insurance", value: 0, period: "Annually",
    headline: "Up to $1,500/person ($6,000/trip) if your trip is cancelled or interrupted",
    howTo: ["Pay for your trip with your United Explorer Card or MileagePlus miles", "If you need to cancel or cut short your trip for a covered reason, file at chasecardbenefits.com", "File within the timeframe specified and provide documentation of the covered reason"],
    pitfalls: ["Covered reasons are specific: illness, severe weather, terrorism — not 'changed my mind'", "Pre-existing conditions may not be covered", "Maximum is $1,500 per covered traveler, not per booking", "Events that occurred before booking are not covered"],
    tips: ["Covers non-refundable prepaid travel expenses and change fees", "Also covers ground transportation (up to $250) to the airport if trip is interrupted for medical reasons", "Family members on the same reservation are covered even if you're not traveling with them"],
    enrollReq: false, enrollAction: "Automatic — pay trip costs with Explorer Card; file at chasecardbenefits.com" },
  { id: "ue-trip-delay", name: "Trip Delay Reimbursement", cat: "Insurance", value: 0, period: "Annually",
    headline: "Up to $500/traveler for meals and lodging if flight delayed 12+ hours",
    howTo: ["Pay for your flight with your United Explorer Card or MileagePlus miles", "If your flight is delayed 12+ hours or requires an overnight stay, keep all receipts for meals, lodging, and toiletries", "File at chasecardbenefits.com or call 1-800-350-2919 within 60 days", "Submit receipts and the airline's delay statement within 100 days"],
    pitfalls: ["12-hour minimum delay required — or an overnight stay must be required", "Covered reasons: equipment failure, weather, strike, or hijacking only", "Coverage is secondary — airline vouchers and reimbursements are deducted", "Cameras, jewelry, and electronics are not covered under this benefit"],
    tips: ["Keep every receipt during a long delay — hotels, meals, toiletries all count", "Get written confirmation of the delay reason from the airline at the airport", "This stacks with what the airline provides — you're covered for the gap"],
    enrollReq: false, enrollAction: "Automatic — keep receipts; file at chasecardbenefits.com within 60 days" },
  { id: "ue-travel-accident", name: "Travel Accident Insurance", cat: "Insurance", value: 0, period: "Annually",
    headline: "Up to $500,000 coverage for accidental death or dismemberment while traveling",
    howTo: ["Pay for your Common Carrier fare with your United Explorer Card or miles", "Coverage is automatic for you and your family members on the same reservation", "In the event of a claim, notify chasecardbenefits.com within 20 days"],
    pitfalls: ["Specific losses covered: life, limb, sight, speech, hearing — not general accidents", "Must be traveling on a Common Carrier (plane, train, ship) — not in a personal vehicle", "Excludes accidents caused by alcohol, drugs, illegal acts, or self-inflicted injuries"],
    tips: ["$500,000 Common Carrier coverage is meaningful for air travel", "Covers you from departure airport through return — not just time in the air", "Family members are also covered when traveling together on the same reservation"],
    enrollReq: false, enrollAction: "Automatic — pay fare with Explorer Card" },
  { id: "ue-roadside", name: "Roadside Assistance", cat: "Insurance", value: 0, period: "Annually",
    headline: "24/7 roadside help — towing, jump start, lockout, fuel delivery up to $50/event",
    howTo: ["Call 1-800-350-2919 anytime for roadside assistance", "No pre-enrollment or membership needed", "Up to $50 covered per service event; up to 4 events per year", "Sign the provider's acknowledgment form at the time of service"],
    pitfalls: ["$50 limit per event — excess charges are your responsibility", "Only available in the US and Canada", "Heavy-duty vehicles (over 10,000 lbs) are not covered", "Vehicles rented through car-sharing apps (Turo, etc.) are not covered"],
    tips: ["Free to use — just call the number on the back of your card", "Covers towing, tire change, battery jump, lockout, up to 2 gallons of fuel, and standard winching", "Call the rental company first if you're in a rental car — they have their own procedures"],
    enrollReq: false, enrollAction: "Call 1-800-350-2919 — no enrollment needed" },
];

const UNITED_QUEST_BENEFITS = [
  { id: "uq-united-credit", name: "$125 United Purchase Credit", cat: "Airlines", value: 125, period: "Annually",
    headline: "Up to $125 back on United purchases each cardmember year",
    howTo: ["Pay for any United purchase (tickets, bags, upgrades, in-flight) with your Quest Card", "Statement credit applies automatically to the first $125 in United purchases each cardmember year", "Credit resets on your account anniversary date"],
    pitfalls: ["Must be a direct United purchase — travel agencies and OTAs do NOT count", "Resets on your account anniversary (your card open date), not January 1", "If you don't fly United, this credit is hard to use — factor into your keep/cancel math", "Award ticket taxes and fees typically do count"],
    tips: ["Buying United gift cards (for future travel) may trigger the credit — check current terms", "Even just one United flight per year typically covers this credit", "Combine with 3x miles on United purchases for double-dipping value", "At $250 annual fee, this credit alone covers 50% of the fee"],
    enrollReq: false, enrollAction: "Automatic — buy United tickets or pay United fees with Quest Card" },
  { id: "uq-anniversary-miles", name: "5,000 Anniversary Miles", cat: "Miles", value: 70, period: "Annually",
    headline: "5,000 bonus miles every account anniversary (~$70 value at 1.4¢/mile)",
    howTo: ["Simply keep your United Quest Card open and in good standing", "5,000 bonus miles are automatically credited to your MileagePlus account after each account anniversary", "Miles typically post within 6-8 weeks after your anniversary date"],
    pitfalls: ["Account must be open and in good standing at anniversary — no miles if account is closed or in default", "Allow 6-8 weeks for miles to post — they don't appear instantly after your anniversary", "Miles are worth variable amounts depending on how you redeem them"],
    tips: ["At 1.4 cents per mile (United's typical redemption value), 5,000 miles = ~$70 in value", "Redeem for United flights with Saver Awards for the best value — can get 1.5-2cpp", "These miles stack with miles you earn from spending throughout the year"],
    enrollReq: false, enrollAction: "Automatic — miles post after each account anniversary" },
  { id: "uq-club-passes", name: "United Club Passes (3/yr)", cat: "Lounge", value: 177, period: "Annually",
    headline: "3 United Club one-time passes per year (~$59 each)",
    howTo: ["Passes are issued to your MileagePlus account each cardmember year", "Present pass at any United Club location for single-visit entry", "Find your passes at united.com under MileagePlus Benefits or in the United app"],
    pitfalls: ["Passes expire at the end of your cardmember year — use them before your anniversary", "For the cardholder only — guests purchase day passes ($59/ea)", "Not valid at United Polaris lounges or Star Alliance partner lounges", "Passes cannot be sold or transferred"],
    tips: ["Three passes gives you roughly one lounge visit per big trip if you fly quarterly", "Best used on long layovers — food, drinks, Wi-Fi, and a quiet place to work", "Pair with Global Entry for the complete airport premium experience", "Consider upgrading to full United Club membership if you fly United weekly ($650/yr)"],
    enrollReq: false, enrollAction: "Automatic — passes issued to your MileagePlus account" },
  { id: "uq-global-entry", name: "Global Entry / TSA PreCheck Credit", cat: "Travel", value: 100, period: "Every 4 Years",
    headline: "$100 credit for Global Entry, TSA PreCheck, or NEXUS every 4 years",
    howTo: ["Apply for Global Entry at cbp.gov/goes or TSA PreCheck at tsa.gov", "Pay the application fee with your United Quest Card", "Statement credit posts automatically within 1-2 billing cycles"],
    pitfalls: ["Only one program credited per 4-year period", "Must pay with the United Quest Card specifically", "NEXUS ($50) also covered — but less useful than Global Entry for most travelers"],
    tips: ["Always choose Global Entry ($100) — it includes TSA PreCheck automatically", "Apply for a family member if you already have it — your card covers their fee too", "Current processing times can be 6-12 months — apply early"],
    enrollReq: false, enrollAction: "Apply at cbp.gov/goes, pay with United Quest Card" },
  { id: "uq-free-bags", name: "Free First + Second Checked Bags", cat: "Airlines", value: 0, period: "Annually",
    headline: "Free first AND second checked bag for you and 1 companion on United flights",
    howTo: ["Book your United flight with your United Quest Card", "Your MileagePlus number must be on the reservation", "Your companion must be on the same reservation", "Bags are waived automatically at check-in"],
    pitfalls: ["Must book with the Quest Card for the benefit to apply", "Companion must be on the same reservation", "Basic Economy fares do NOT include free checked bags", "Second bag normally costs $45 each way — Quest covers this too (Explorer does not)"],
    tips: ["$35 (1st) + $45 (2nd) = $80/bag each way = $160/round trip for one person", "For two travelers on a round trip with 2 bags each: $640 in savings", "This benefit alone can justify the $250 annual fee if you check 2 bags regularly", "Pack everything — no bag anxiety on United flights"],
    enrollReq: false, enrollAction: "Book with Quest Card + add MileagePlus number to reservation" },
  { id: "uq-priority-board", name: "Priority Boarding", cat: "Airlines", value: 0, period: "Annually",
    headline: "Group 2 boarding on United flights — board before the general public",
    howTo: ["Book any United or United Express flight", "Your boarding pass will automatically show Group 2 or Premier Access", "Board when Group 2 is called"],
    pitfalls: ["Does not apply to Basic Economy fares", "Group 2 is after first class and Premiers, but before Groups 3-5"],
    tips: ["Overhead bin space is the main benefit — Group 2 almost always means room for your carry-on", "Pair with free bags — check everything and board stress-free"],
    enrollReq: false, enrollAction: "Automatic — board when Group 2 is called" },
  { id: "uq-25pct-inflight", name: "25% Back on In-Flight Purchases", cat: "Airlines", value: 0, period: "Annually",
    headline: "25% back as miles on United in-flight food, drinks, Wi-Fi, and Club Premium drinks",
    howTo: ["Pay for any in-flight United purchase with your Quest Card", "25% of the purchase posts back as miles within 6-8 weeks"],
    pitfalls: ["Returns miles, not cash", "Only applies to in-flight purchases on United-operated flights", "Quest Card also covers United Club Premium drinks — Explorer does not"],
    tips: ["Wi-Fi on long flights runs $20-30 — 25% back softens the cost", "Club Premium drinks are included if you use a United Club pass — 25% back applies to the fee"],
    enrollReq: false, enrollAction: "Automatic — pay with Quest Card in-flight" },
  { id: "uq-3x-united", name: "3x Miles on United Purchases", cat: "Airlines", value: 0, period: "Annually",
    headline: "3 MileagePlus miles per $1 on United tickets, bags, upgrades, and more",
    howTo: ["Pay for any United purchase directly with your Quest Card", "Miles post at the end of your billing cycle"],
    pitfalls: ["Only applies to direct United purchases — OTAs earn 1x", "Award ticket taxes and fees do count for bonus miles"],
    tips: ["3x is the highest United card earning rate — book all United travel on this card", "Combine with 5,000 anniversary bonus miles for a full United miles strategy", "Stack with MileagePlus miles from the actual flight"],
    enrollReq: false, enrollAction: "Automatic — pay United purchases with Quest Card" },
  { id: "uq-2x-dining", name: "2x Miles on Dining", cat: "Dining", value: 0, period: "Annually",
    headline: "2 miles per $1 at restaurants, takeout, and eligible delivery services",
    howTo: ["Use your United Quest Card at any restaurant, bar, or eligible delivery service", "Miles post automatically at end of billing cycle"],
    pitfalls: ["Some delivery apps may code differently — check your statement", "Meal kit services may not code as dining"],
    tips: ["Use Quest as your dining card to funnel miles toward United flights", "2x on dining is consistent across Chase travel cards at this tier"],
    enrollReq: false, enrollAction: "Automatic — use Quest Card at restaurants" },
  { id: "uq-2x-travel", name: "2x Miles on All Other Travel", cat: "Travel", value: 0, period: "Annually",
    headline: "2 miles per $1 on travel not booked through United (hotels, Uber, parking, etc.)",
    howTo: ["Pay for any travel purchase — hotels, Uber/Lyft, parking, tolls, trains — with your Quest Card", "Miles post automatically"],
    pitfalls: ["United purchases earn 3x, not 2x", "Some travel purchases may code as a different category depending on the merchant"],
    tips: ["Catches everything: ride-shares, parking, Airbnb, non-United hotels, and more", "Pair with free hotel-booked-direct rule — use Quest for non-United hotel direct bookings"],
    enrollReq: false, enrollAction: "Automatic" },
  { id: "uq-2x-streaming", name: "2x Miles on Streaming Services", cat: "Streaming", value: 0, period: "Annually",
    headline: "2 miles per $1 on select streaming services",
    howTo: ["Pay for eligible streaming services directly with your Quest Card", "Miles post automatically at end of billing cycle"],
    pitfalls: ["Subscribe directly with the service — not through Apple TV or Amazon channels", "Not all streaming services qualify — major ones (Netflix, Hulu, Disney+, Spotify) typically do"],
    tips: ["Set Quest as your default streaming payment and collect miles passively", "2x on streaming is the same rate as dining — use consistently for United miles"],
    enrollReq: false, enrollAction: "Automatic — pay streaming subscriptions with Quest Card" },
  { id: "uq-nofx", name: "No Foreign Transaction Fees", cat: "Travel", value: 0, period: "Annually",
    headline: "Zero foreign transaction fees worldwide",
    howTo: ["Use your United Quest Card for any international purchase", "No enrollment needed — automatic"],
    pitfalls: ["ATMs and merchants may still charge their own fees", "Always pay in local currency at terminals"],
    tips: ["Saves the typical 3% fee", "On a $4,000 international trip, that's $120 saved"],
    enrollReq: false, enrollAction: "Automatic" },
  { id: "uq-auto-rental", name: "Primary Auto Rental Coverage", cat: "Insurance", value: 0, period: "Annually",
    headline: "Primary rental car coverage up to $60,000 worldwide",
    howTo: ["Decline the rental company's CDW/LDW at the counter", "Pay for the entire rental with your United Quest Card", "File a claim at chasecardbenefits.com or 1-800-350-2919 within 100 days of any incident"],
    pitfalls: ["Must decline CDW/LDW — accepting it voids this benefit", "Exotic vehicles and vehicles over $125,000 MSRP are excluded", "Rental periods over 31 consecutive days are not covered"],
    tips: ["Primary coverage = no personal insurance claim, no rate increase risk", "Saves $15-30/day vs buying CDW at the counter", "Available worldwide"],
    enrollReq: false, enrollAction: "Decline CDW at rental counter and pay full rental with Quest Card" },
  { id: "uq-baggage-delay", name: "Baggage Delay Insurance", cat: "Insurance", value: 0, period: "Annually",
    headline: "$100/day (up to 3 days) if your checked bag is delayed 6+ hours",
    howTo: ["Report the delay to the airline before leaving the airport — get written confirmation", "Buy essentials (toiletries, clothes, chargers) and save receipts", "File at chasecardbenefits.com within 20 days; submit receipts within 90 days"],
    pitfalls: ["Must be 6+ hours late", "Cameras, jewelry, and electronics are not covered", "Secondary to any airline reimbursement"],
    tips: ["Report at the airport baggage desk and always get a written PIR (Property Irregularity Report)", "The 20-day filing window is short — don't wait"],
    enrollReq: false, enrollAction: "Report to airline at airport; file at chasecardbenefits.com" },
  { id: "uq-lost-luggage", name: "Lost Luggage Reimbursement", cat: "Insurance", value: 0, period: "Annually",
    headline: "Up to $3,000/traveler if luggage is lost, damaged, or stolen",
    howTo: ["Report to the airline before leaving the airport", "File at chasecardbenefits.com within 20 days; submit docs within 90 days"],
    pitfalls: ["$500 sub-limit for jewelry/watches and cameras/electronics", "Secondary to airline reimbursement — airline pays first", "Money, documents, tickets not covered"],
    tips: ["Photograph bags before checking them — helps with value documentation", "Covers carry-on baggage while on the aircraft"],
    enrollReq: false, enrollAction: "Report to airline at airport; file at chasecardbenefits.com" },
  { id: "uq-purchase-protect", name: "Purchase Protection", cat: "Insurance", value: 0, period: "Annually",
    headline: "$10,000/item protection against theft or damage for 120 days from purchase",
    howTo: ["Pay with your Quest Card", "File at chasecardbenefits.com within 90 days of theft or damage", "Submit receipts and police report if stolen"],
    pitfalls: ["Mysterious disappearance (no evidence of theft) is not covered", "$50,000 annual maximum", "Secondary to homeowners/renters insurance"],
    tips: ["Great for electronics, luggage, and camera gear", "120-day window is one of the most generous available"],
    enrollReq: false, enrollAction: "Automatic — pay with Quest Card; file at chasecardbenefits.com" },
  { id: "uq-ext-warranty", name: "Extended Warranty Protection", cat: "Insurance", value: 0, period: "Annually",
    headline: "+1 year added to original manufacturer's US warranty (up to $10,000/item)",
    howTo: ["Pay with Quest Card", "Coverage begins when the original warranty expires", "File at chasecardbenefits.com within 90 days of failure"],
    pitfalls: ["Only extends warranties of 3 years or less", "Vehicles, software, and medical equipment excluded"],
    tips: ["Store receipts at chasecardbenefits.com for easy future claims", "Best value on 1-2 year warranty items"],
    enrollReq: false, enrollAction: "Automatic — pay with Quest Card; store warranty at chasecardbenefits.com" },
  { id: "uq-trip-cancel", name: "Trip Cancellation/Interruption Insurance", cat: "Insurance", value: 0, period: "Annually",
    headline: "Up to $1,500/person ($6,000/trip) for covered trip cancellations",
    howTo: ["Pay for your trip with Quest Card or miles", "File at chasecardbenefits.com for cancellation or interruption due to a covered reason"],
    pitfalls: ["Covered reasons are specific — illness, severe weather, terrorism", "'Changed my mind' is not covered", "Pre-existing conditions may be excluded"],
    tips: ["Covers non-refundable prepaid travel and change fees", "Family members are covered even if not traveling with you"],
    enrollReq: false, enrollAction: "Automatic — pay trip costs with Quest Card; file at chasecardbenefits.com" },
  { id: "uq-trip-delay", name: "Trip Delay Reimbursement", cat: "Insurance", value: 0, period: "Annually",
    headline: "Up to $500/traveler for meals and lodging if flight delayed 12+ hours",
    howTo: ["Pay for your flight with Quest Card or miles", "Keep receipts for meals, lodging, and toiletries during the delay", "File at chasecardbenefits.com within 60 days; submit receipts within 100 days"],
    pitfalls: ["12-hour minimum delay — or an overnight stay must be required", "Equipment failure, weather, strike, or hijacking only — not all delays qualify", "Secondary to airline compensation"],
    tips: ["Get written delay reason from airline at the airport", "Every receipt counts — hotel, food, toiletries, medication"],
    enrollReq: false, enrollAction: "Automatic — keep receipts; file at chasecardbenefits.com within 60 days" },
  { id: "uq-travel-accident", name: "Travel Accident Insurance", cat: "Insurance", value: 0, period: "Annually",
    headline: "Up to $500,000 for accidental death or dismemberment while traveling",
    howTo: ["Pay for Common Carrier fare with Quest Card or miles", "Coverage is automatic for you and covered family members"],
    pitfalls: ["Specific losses only: life, limb, sight, speech, hearing", "Excludes accidents from alcohol, drugs, or illegal acts"],
    tips: ["$500,000 on common carriers is significant coverage for air travel", "Covers departure through return — not just airborne time"],
    enrollReq: false, enrollAction: "Automatic — pay fare with Quest Card" },
  { id: "uq-roadside", name: "Roadside Assistance", cat: "Insurance", value: 0, period: "Annually",
    headline: "24/7 roadside help — towing, jump start, lockout, fuel up to $50/event",
    howTo: ["Call 1-800-350-2919 for roadside assistance anytime", "No pre-enrollment needed", "Up to 4 events per year"],
    pitfalls: ["$50 limit per event — excess is your responsibility", "US and Canada only", "Heavy-duty vehicles not covered"],
    tips: ["Free to access — no AAA membership needed", "Sign the service acknowledgement form at time of service"],
    enrollReq: false, enrollAction: "Call 1-800-350-2919 — no enrollment needed" },
];

const CARD_LIBRARY = [
  {
    id: "amex-platinum", name: "Amex Platinum", shortName: "Amex Plat",
    issuer: "American Express", annualFee: 895,
    tagline: "Premium travel card with the most credits",
    accent: "#c9a96e", accentAlpha: "201,169,110",
    gradient: "linear-gradient(135deg,#c9a96e,#e8d5a8,#c9a96e)",
    benefits: AMEX_BENEFITS,
  },
  {
    id: "csp", name: "Chase Sapphire Preferred", shortName: "Chase CSP",
    issuer: "Chase", annualFee: 95,
    tagline: "Best-value travel card with 3x dining & travel",
    accent: "#4a7fc1", accentAlpha: "74,127,193",
    gradient: "linear-gradient(135deg,#0a1628,#4a7fc1,#1a3a6b)",
    benefits: CSP_BENEFITS,
  },
  {
    id: "united-explorer", name: "United Explorer Card", shortName: "United Explorer",
    issuer: "Chase / United", annualFee: 95,
    tagline: "Free bags + lounge passes on United — great value for United flyers",
    accent: "#0076c8", accentAlpha: "0,118,200",
    gradient: "linear-gradient(135deg,#003d7a,#0076c8,#00a0e0)",
    benefits: UNITED_EXPLORER_BENEFITS,
  },
  {
    id: "united-quest", name: "United Quest Card", shortName: "United Quest",
    issuer: "Chase / United", annualFee: 250,
    tagline: "Premium United card with travel credit, 2 free bags, and 3 lounge passes",
    accent: "#c4a24a", accentAlpha: "196,162,74",
    gradient: "linear-gradient(135deg,#001e4d,#003d7a,#c4a24a)",
    benefits: UNITED_QUEST_BENEFITS,
  },
];

const PERK_VALUES = {
  "amex-platinum": { centurion: 150, pp: 100, dsc: 125, hilton: 300, marriott: 200, cell: 180, nofx: 100 },
  "csp": { "rental-car": 180, "trip-cancel": 100, "transfer-points": 100, "csp-nofx": 50 },
  "united-explorer": { "ue-free-bag": 140, "ue-auto-rental": 120, "ue-trip-cancel": 75, "ue-trip-delay": 75, "ue-purchase-protect": 50, "ue-lost-luggage": 50, "ue-ext-warranty": 40, "ue-nofx": 50, "ue-priority-board": 30 },
  "united-quest": { "uq-free-bags": 320, "uq-auto-rental": 120, "uq-trip-cancel": 75, "uq-trip-delay": 75, "uq-purchase-protect": 50, "uq-lost-luggage": 50, "uq-ext-warranty": 40, "uq-nofx": 50, "uq-priority-board": 30 },
};

function loadState() {
  let legacyEmail = null;
  try { legacyEmail = localStorage.getItem(SK_EMAIL); } catch (e) {}

  try {
    const raw = localStorage.getItem(MULTI_SK);
    if (raw) {
      const p = JSON.parse(raw);
      // New structured format
      if (p && p.addedCardIds) {
        return { addedCardIds: p.addedCardIds, benefits: p.benefits || {}, email: p.email || legacyEmail };
      }
      // Old array format (previous multi-card build)
      if (Array.isArray(p) && p.length > 0) {
        const addedCardIds = p.map(c => c.id);
        const benefits = {};
        p.forEach(c => { benefits[c.id] = c.benefits; });
        return { addedCardIds, benefits, email: legacyEmail };
      }
    }
  } catch (e) {}

  // Old single-card format
  try {
    const old = localStorage.getItem(OLD_SK);
    if (old) {
      const p = JSON.parse(old);
      if (p && p.benefits) {
        return { addedCardIds: ["amex-platinum"], benefits: { "amex-platinum": p.benefits }, email: legacyEmail };
      }
    }
  } catch (e) {}

  return { addedCardIds: [], benefits: {}, email: legacyEmail };
}

function persist(state) {
  try { localStorage.setItem(MULTI_SK, JSON.stringify(state)); } catch (e) {}
}

function mergeBenefits(libraryBenefits, stored) {
  if (!stored) return libraryBenefits.map(b => ({ ...b, enrolled: false, usedAmount: 0, used: false }));
  const storedMap = {};
  stored.forEach(b => { storedMap[b.id] = b; });
  return libraryBenefits.map(b => {
    const s = storedMap[b.id];
    return s ? { ...b, enrolled: !!s.enrolled, usedAmount: s.usedAmount || 0, used: !!s.used } : { ...b, enrolled: false, usedAmount: 0, used: false };
  });
}

function cardVerdict(card) {
  const credits = card.benefits.filter(b => b.value > 0);
  const perks = card.benefits.filter(b => b.value === 0);
  const pv = PERK_VALUES[card.id] || {};
  const now = new Date();
  const frac = (Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 864e5) + 1) / 365;
  const redeemed = credits.reduce((s, b) => s + (b.usedAmount || 0), 0);
  const perkVal = perks.reduce((s, b) => s + (b.used ? (pv[b.id] || 0) : 0), 0);
  const proj = Math.round(frac > 0 ? redeemed / frac : 0) + perkVal;
  const pct = Math.min(100, Math.round((proj / card.annualFee) * 100));
  if (pct >= 100) return { label: "KEEP", color: "#8ecf8e" };
  if (pct >= 70) return { label: "CLOSE", color: "#e8c76a" };
  return { label: "REVIEW", color: "#e87c7c" };
}

function MonthlyReport({ card, email, onClose }) {
  const now = new Date();
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const credits = card.benefits.filter(b => b.value > 0);
  const perks = card.benefits.filter(b => b.value === 0);
  const needsEnroll = card.benefits.filter(b => b.enrollReq && !b.enrolled);
  const totalAnnual = credits.reduce((s, b) => s + annualize(b.value, b.period), 0);
  const used = credits.reduce((s, b) => s + (b.usedAmount || 0), 0);
  const total = credits.reduce((s, b) => s + b.value, 0);
  const left = total - used;
  const urgent = credits.filter(b => { const d = getDaysUntilReset(b.period); return d !== null && d <= 30 && (b.usedAmount || 0) < b.value; });
  const sec = { padding: "14px 18px", borderBottom: "1px solid #1e1e23" };
  const heading = { fontSize: 13, fontWeight: 600, color: "#f0f0f0", marginBottom: 8 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 1000, overflow: "auto", padding: "20px 12px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", background: "#131316", borderRadius: 14, border: "1px solid #2a2a30" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "18px 18px 10px" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#f0f0f0" }}>{card.shortName} — Monthly Report</div>
            <div style={{ fontSize: 11, color: "#777" }}>{months[now.getMonth()]} {now.getFullYear()}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 18, cursor: "pointer", padding: 4 }}>x</button>
        </div>
        <div style={{ ...sec, fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
          {left > 0 ? "You have $" + left.toFixed(0) + " in credits expiring this period." : "All credits utilized this period!"}
        </div>
        <div style={sec}>
          <div style={heading}>Credit Scorecard</div>
          {[["Annual fee", "$" + card.annualFee, "#f0f0f0"], ["Annual value", "~$" + Math.round(totalAnnual).toLocaleString(), "#8ecf8e"], ["Period available", "$" + total.toFixed(0), "#f0f0f0"], ["Period used", "$" + used.toFixed(2), "#8ecf8e"], ["Left on table", "$" + left.toFixed(0), left > 0 ? "#e8c76a" : "#8ecf8e"]].map(([l, v, c], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#888" }}>{l}</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", color: c }}>{v}</span>
            </div>
          ))}
        </div>
        {urgent.length > 0 && (
          <div style={sec}>
            <div style={{ ...heading, color: "#e8c76a" }}>Expiring Soon</div>
            {urgent.map(b => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                <span style={{ fontSize: 11, color: "#ccc" }}>{b.name} — ${(b.value - (b.usedAmount || 0)).toFixed(2)} left</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "#e87c7c" }}>{getDaysUntilReset(b.period)}d</span>
              </div>
            ))}
          </div>
        )}
        {needsEnroll.length > 0 && (
          <div style={sec}>
            <div style={{ ...heading, color: "#e87c7c" }}>Not Enrolled ({needsEnroll.length})</div>
            {needsEnroll.map(b => (
              <div key={b.id} style={{ padding: "4px 0" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#ccc" }}>{b.name}{b.value > 0 ? " ($" + b.value + getPeriodLabel(b.period) + ")" : ""}</div>
                <div style={{ fontSize: 10, color: "#666" }}>{b.enrollAction}</div>
              </div>
            ))}
          </div>
        )}
        <div style={sec}>
          <div style={heading}>Credit Progress</div>
          {credits.map(b => {
            const pct = b.value > 0 ? Math.min(100, Math.round(((b.usedAmount || 0) / b.value) * 100)) : 0;
            return (
              <div key={b.id} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: "#999" }}>{b.name}</span>
                  <span style={{ fontSize: 9, fontFamily: "monospace", color: "#666" }}>${(b.usedAmount || 0).toFixed(2)} / ${b.value}</span>
                </div>
                <div style={{ height: 3, background: "#1a1a1f", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: pct + "%", background: pct >= 100 ? "#8ecf8e" : pct > 0 ? card.accent : "transparent", borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ ...sec, borderBottom: "none" }}>
          <div style={heading}>Perk Status</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {perks.map(b => (
              <span key={b.id} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "1px solid", borderColor: b.used ? "rgba(142,207,142,.2)" : "#1e1e23", color: b.used ? "#8ecf8e" : "#555", background: b.used ? "rgba(142,207,142,.05)" : "transparent" }}>
                {b.used ? "+" : "-"} {b.name}
              </span>
            ))}
          </div>
        </div>
        <div style={{ padding: "12px 18px", fontSize: 10, color: "#444", textAlign: "center" }}>
          Preview of monthly email · sent to {email || "your email"} on the 1st
        </div>
      </div>
    </div>
  );
}

function CardPicker({ available, onAdd, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.88)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#131316", borderRadius: 14, border: "1px solid #2a2a30", width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid #1e1e23" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0" }}>Add a Card</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer", padding: 4 }}>×</button>
        </div>
        {available.length === 0 ? (
          <div style={{ padding: "28px 18px", textAlign: "center", color: "#555", fontSize: 13 }}>All available cards are in your wallet.</div>
        ) : (
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {available.map(card => {
              const creditCount = card.benefits.filter(b => b.value > 0).length;
              const totalVal = card.benefits.filter(b => b.value > 0).reduce((s, b) => s + annualize(b.value, b.period), 0);
              return (
                <div key={card.id} style={{ background: "#0e0e11", borderRadius: 10, border: "1px solid #1e1e23", padding: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 20, borderRadius: 3, background: card.gradient, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f0" }}>{card.name}</div>
                      <div style={{ fontSize: 10, color: "#555" }}>{card.issuer} · ${card.annualFee}/yr annual fee</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>{card.tagline}</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <div style={{ background: "#151518", borderRadius: 5, padding: "5px 8px", flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#8ecf8e" }}>~${Math.round(totalVal).toLocaleString()}</div>
                      <div style={{ fontSize: 8, color: "#555", textTransform: "uppercase" }}>Annual value</div>
                    </div>
                    <div style={{ background: "#151518", borderRadius: 5, padding: "5px 8px", flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: card.accent }}>{card.benefits.length}</div>
                      <div style={{ fontSize: 8, color: "#555", textTransform: "uppercase" }}>Benefits</div>
                    </div>
                    <div style={{ background: "#151518", borderRadius: 5, padding: "5px 8px", flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#f0f0f0" }}>{creditCount}</div>
                      <div style={{ fontSize: 8, color: "#555", textTransform: "uppercase" }}>Credits</div>
                    </div>
                  </div>
                  <button onClick={() => onAdd(card.id)} style={{ width: "100%", background: "rgba(" + card.accentAlpha + ",.15)", color: card.accent, border: "1px solid rgba(" + card.accentAlpha + ",.25)", borderRadius: 7, padding: "9px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    + Add to Wallet
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AmexCoach() {
  const [addedCardIds, setAddedCardIds] = useState([]);
  const [benefitData, setBenefitData] = useState({});
  const [email, setEmail] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailStatus, setEmailStatus] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState("guide");
  const [filter, setFilter] = useState("all");
  const [showReport, setShowReport] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [toast, setToast] = useState(null);

  const flash = useCallback((m) => { setToast(m); setTimeout(() => setToast(null), 2200); }, []);

  useEffect(() => {
    const s = loadState();
    setAddedCardIds(s.addedCardIds);
    setBenefitData(s.benefits);
    setEmail(s.email);
    setActiveId(s.addedCardIds[0] || null);
    setLoading(false);
  }, []);

  const saveAll = useCallback((ids, bdata, em) => {
    persist({ addedCardIds: ids, benefits: bdata, email: em });
  }, []);

  const addedCards = CARD_LIBRARY
    .filter(c => addedCardIds.includes(c.id))
    .map(c => ({ ...c, benefits: mergeBenefits(c.benefits, benefitData[c.id]) }));

  const availableCards = CARD_LIBRARY.filter(c => !addedCardIds.includes(c.id));

  const activeCard = addedCards.find(c => c.id === activeId) || addedCards[0] || null;

  const switchCard = (id) => { setActiveId(id); setExpandedId(null); setFilter("all"); setShowAnalysis(false); };

  const addCard = (cardId) => {
    const newIds = [...addedCardIds, cardId];
    setAddedCardIds(newIds);
    setActiveId(cardId);
    setShowPicker(false);
    saveAll(newIds, benefitData, email);
    flash("Card added!");
  };

  const removeCard = (cardId) => {
    if (!window.confirm("Remove this card from your wallet? Your tracked data will be lost.")) return;
    const newIds = addedCardIds.filter(id => id !== cardId);
    const newBenefits = { ...benefitData };
    delete newBenefits[cardId];
    setAddedCardIds(newIds);
    setBenefitData(newBenefits);
    setActiveId(newIds[0] || null);
    setExpandedId(null);
    setFilter("all");
    setShowAnalysis(false);
    saveAll(newIds, newBenefits, email);
    flash("Card removed");
  };

  const updateBenefit = (cardId, benefitId, u) => {
    const card = addedCards.find(c => c.id === cardId);
    if (!card) return;
    const newBenefits = card.benefits.map(b => b.id === benefitId ? { ...b, ...u } : b);
    const newBenefitData = { ...benefitData, [cardId]: newBenefits };
    setBenefitData(newBenefitData);
    saveAll(addedCardIds, newBenefitData, email);
  };

  const subscribeEmail = async () => {
    const e = emailInput.trim();
    if (!e || !e.includes("@")) return;
    setEmailStatus("sending");
    try {
      const res = await fetch(API_URL + "/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e }),
      });
      if (res.ok) {
        setEmail(e);
        setEmailInput("");
        setEmailStatus("done");
        saveAll(addedCardIds, benefitData, e);
        flash("Subscribed! Monthly reports coming your way.");
      } else {
        setEmailStatus("error");
      }
    } catch {
      setEmailStatus("error");
    }
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "#666", background: "#0e0e11" }}>Loading...</div>;

  // Empty wallet — show card library
  if (addedCards.length === 0) {
    return (
      <div style={{ fontFamily: "system-ui,sans-serif", background: "#0e0e11", minHeight: "100vh", color: "#e0e0e0", padding: "40px 16px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", marginBottom: 8 }}>Credit Card Benefits Coach</div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>Add the cards you have to start tracking your benefits, credits, and ROI.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CARD_LIBRARY.map(card => {
              const creditCount = card.benefits.filter(b => b.value > 0).length;
              const totalVal = card.benefits.filter(b => b.value > 0).reduce((s, b) => s + annualize(b.value, b.period), 0);
              return (
                <div key={card.id} style={{ background: "#151518", borderRadius: 12, border: "1px solid #1e1e23", padding: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 26, borderRadius: 4, background: card.gradient, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0" }}>{card.name}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>{card.issuer} · ${card.annualFee}/yr</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 14, lineHeight: 1.5 }}>{card.tagline}</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    {[["~$" + Math.round(totalVal).toLocaleString(), "Annual value", "#8ecf8e"], [card.benefits.length + "", "Benefits", card.accent], [creditCount + "", "Credits", "#f0f0f0"]].map(([v, l, c], i) => (
                      <div key={i} style={{ flex: 1, background: "#0e0e11", borderRadius: 6, padding: "8px", textAlign: "center" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: c }}>{v}</div>
                        <div style={{ fontSize: 8, color: "#444", textTransform: "uppercase", marginTop: 2 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addCard(card.id)} style={{ width: "100%", background: "rgba(" + card.accentAlpha + ",.15)", color: card.accent, border: "1px solid rgba(" + card.accentAlpha + ",.25)", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    + Add to Wallet
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Full tracker UI
  const accent = activeCard.accent;
  const accentA = activeCard.accentAlpha;
  const credits = activeCard.benefits.filter(b => b.value > 0);
  const perks = activeCard.benefits.filter(b => b.value === 0);
  const perkValues = PERK_VALUES[activeCard.id] || {};
  const filtered = filter === "all" ? activeCard.benefits : filter === "credits" ? credits : perks;
  const needsEnroll = activeCard.benefits.filter(b => b.enrollReq && !b.enrolled);
  const totalAnnual = credits.reduce((s, b) => s + annualize(b.value, b.period), 0);
  const currentUsed = credits.reduce((s, b) => s + (b.usedAmount || 0), 0);
  const currentTotal = credits.reduce((s, b) => s + b.value, 0);
  const enrolledCount = activeCard.benefits.filter(b => b.enrolled || !b.enrollReq).length;

  const portfolio = addedCards.reduce((acc, card) => {
    const cc = card.benefits.filter(b => b.value > 0);
    acc.fees += card.annualFee;
    acc.value += cc.reduce((s, b) => s + annualize(b.value, b.period), 0);
    acc.redeemed += cc.reduce((s, b) => s + (b.usedAmount || 0), 0);
    return acc;
  }, { fees: 0, value: 0, redeemed: 0 });
  portfolio.net = portfolio.redeemed - portfolio.fees;

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", background: "#0e0e11", minHeight: "100vh", color: "#e0e0e0", padding: "16px 14px 44px", maxWidth: 700, margin: "0 auto" }}>

      {/* Portfolio Dashboard */}
      <div style={{ background: "#151518", borderRadius: 10, border: "1px solid #1e1e23", padding: "12px 14px", marginBottom: 10 }}>
        <div style={{ fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Portfolio Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
          {[
            ["Combined Fees", "$" + portfolio.fees.toLocaleString(), "#aaa"],
            ["Total Value", "~$" + Math.round(portfolio.value).toLocaleString(), "#8ecf8e"],
            ["Redeemed", "$" + portfolio.redeemed.toFixed(0), "#e0e0e0"],
            ["Net Value", portfolio.net >= 0 ? "$" + portfolio.net.toFixed(0) : "-$" + Math.abs(portfolio.net).toFixed(0), portfolio.net >= 0 ? "#8ecf8e" : "#e87c7c"],
          ].map(([l, v, c], i) => (
            <div key={i} style={{ background: "#0e0e11", borderRadius: 6, padding: "8px" }}>
              <div style={{ fontSize: 7, color: "#555", textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: c }}>{v}</div>
            </div>
          ))}
        </div>
        {/* Email signup row */}
        <div style={{ borderTop: "1px solid #1a1a1f", paddingTop: 10 }}>
          {email ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, color: "#8ecf8e" }}>✓</span>
              <span style={{ fontSize: 10, color: "#555" }}>Monthly reports → {email}</span>
              <button onClick={() => { setEmail(null); saveAll(addedCardIds, benefitData, null); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "#333", fontSize: 10, cursor: "pointer", padding: "2px 4px" }}>change</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#555", whiteSpace: "nowrap" }}>Monthly reports:</span>
              <input type="email" value={emailInput} onChange={e => { setEmailInput(e.target.value); setEmailStatus(null); }} onKeyDown={e => e.key === "Enter" && subscribeEmail()}
                placeholder="your@email.com"
                style={{ flex: 1, minWidth: 0, background: "#0e0e11", border: "1px solid #2a2a30", borderRadius: 5, color: "#e0e0e0", padding: "5px 8px", fontSize: 11, fontFamily: "inherit", outline: "none" }} />
              <button onClick={subscribeEmail} disabled={emailStatus === "sending"}
                style={{ background: "#1e2830", color: "#8ecf8e", border: "1px solid #2a3a30", borderRadius: 5, padding: "5px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                {emailStatus === "sending" ? "..." : emailStatus === "error" ? "Retry" : "Subscribe"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card Tabs + Add button */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {addedCards.map(card => {
          const isActive = card.id === activeId;
          const v = cardVerdict(card);
          const cardCredits = card.benefits.filter(b => b.value > 0);
          const cardUsed = cardCredits.reduce((s, b) => s + (b.usedAmount || 0), 0);
          const cardTotal = cardCredits.reduce((s, b) => s + annualize(b.value, b.period), 0);
          const util = cardTotal > 0 ? Math.round((cardUsed / cardTotal) * 100) : 0;
          return (
            <button key={card.id} onClick={() => switchCard(card.id)} style={{ flex: 1, background: isActive ? "#151518" : "#0e0e11", border: "1px solid", borderColor: isActive ? card.accent + "55" : "#1e1e23", borderRadius: 9, padding: "10px", cursor: "pointer", textAlign: "left", transition: "all .15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <div style={{ width: 22, height: 14, borderRadius: 2, background: card.gradient, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? card.accent : "#888", lineHeight: 1.2 }}>{card.shortName}</span>
              </div>
              <div style={{ fontSize: 9, color: "#555", marginBottom: 4 }}>${card.annualFee}/yr fee</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "#555" }}>{util}% used</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: v.color }}>{v.label}</span>
              </div>
            </button>
          );
        })}
        {availableCards.length > 0 && (
          <button onClick={() => setShowPicker(true)} style={{ width: 44, flexShrink: 0, background: "#0e0e11", border: "1px dashed #2a2a30", borderRadius: 9, cursor: "pointer", color: "#444", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        )}
      </div>

      {/* Active Card Header */}
      <div style={{ background: "#151518", borderRadius: 10, border: "1px solid #1e1e23", padding: "12px 14px", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 18, borderRadius: 3, background: activeCard.gradient }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0" }}>{activeCard.name}</div>
              <div style={{ fontSize: 9, color: "#555" }}>{activeCard.issuer} · ${activeCard.annualFee}/yr</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <button onClick={() => setShowAnalysis(!showAnalysis)} style={{ background: showAnalysis ? "rgba(142,207,142,.12)" : "rgba(255,255,255,.05)", color: showAnalysis ? "#8ecf8e" : "#888", border: "1px solid", borderColor: showAnalysis ? "rgba(142,207,142,.2)" : "#1e1e23", borderRadius: 7, padding: "6px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Keep or Cancel?</button>
            <button onClick={() => setShowReport(true)} style={{ background: "rgba(" + accentA + ",.1)", color: accent, border: "1px solid rgba(" + accentA + ",.2)", borderRadius: 7, padding: "6px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Report</button>
            <button onClick={() => removeCard(activeCard.id)} style={{ background: "none", border: "none", color: "#2a2a2a", fontSize: 10, cursor: "pointer", padding: "6px 4px" }} title="Remove card">×</button>
          </div>
        </div>
      </div>

      {/* Enrollment Warning */}
      {needsEnroll.length > 0 && (
        <div style={{ display: "flex", gap: 7, alignItems: "center", background: "rgba(232,180,80,.05)", border: "1px solid rgba(232,180,80,.12)", borderRadius: 8, padding: "9px 11px", marginBottom: 10, fontSize: 11, color: "#b89930" }}>
          {needsEnroll.length} benefit{needsEnroll.length !== 1 ? "s" : ""} not enrolled — you are missing credits.
        </div>
      )}

      {/* Keep or Cancel Analysis */}
      {showAnalysis && (() => {
        const now = new Date();
        const frac = (Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 864e5) + 1) / 365;
        const mo = now.getMonth() + 1;
        const redeemed = credits.reduce((s, b) => s + (b.usedAmount || 0), 0);
        const perkVal = perks.reduce((s, b) => s + (b.used ? (perkValues[b.id] || 0) : 0), 0);
        const proj = Math.round(frac > 0 ? redeemed / frac : 0) + perkVal;
        const maxPoss = Math.round(totalAnnual);
        const feePct = Math.min(100, Math.round(((redeemed + perkVal) / activeCard.annualFee) * 100));
        const projPct = Math.min(100, Math.round((proj / activeCard.annualFee) * 100));
        const usedPerks = perks.filter(b => b.used).length;

        let verdict, vColor, vBg, reasons;
        if (feePct >= 100) {
          verdict = "KEEP — Already Paid For Itself"; vColor = "#8ecf8e"; vBg = "rgba(142,207,142,.08)";
          reasons = ["You have already recouped the $" + activeCard.annualFee + " annual fee.", "Every additional benefit you use is pure profit."];
        } else if (projPct >= 100) {
          verdict = "KEEP — On Track to Break Even"; vColor = "#c9a96e"; vBg = "rgba(201,169,110,.06)";
          reasons = ["At your current pace, you will exceed the $" + activeCard.annualFee + " fee by year-end.", "Focus on maximizing credits to stay on track."];
        } else if (projPct >= 70) {
          verdict = "BORDERLINE — Close But Not There Yet"; vColor = "#e8c76a"; vBg = "rgba(232,180,80,.06)";
          reasons = ["You are projected to recoup ~" + projPct + "% of the $" + activeCard.annualFee + " fee.", "Enrolling in more benefits or using more perks could push you over."];
        } else {
          verdict = "CONSIDER CANCELLING"; vColor = "#e87c7c"; vBg = "rgba(232,124,124,.06)";
          reasons = ["You are on pace to recoup only ~" + projPct + "% of the $" + activeCard.annualFee + " fee.", "Review unenrolled benefits — there may be easy value you are missing."];
        }
        if (needsEnroll.length > 3) reasons.push(needsEnroll.length + " benefits still not enrolled. Enrolling could significantly increase your return.");
        if (usedPerks < Math.floor(perks.length / 2)) reasons.push("Only " + usedPerks + " of " + perks.length + " perks activated. Mark them as you use them to improve your score.");

        return (
          <div style={{ background: "#151518", borderRadius: 10, border: "1px solid #1e1e23", padding: "16px 14px", marginBottom: 10 }}>
            <div style={{ background: vBg, border: "1px solid", borderColor: vColor + "33", borderRadius: 8, padding: "12px 14px", marginBottom: 14, textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: vColor, marginBottom: 4 }}>{verdict}</div>
              <div style={{ fontSize: 11, color: "#888" }}>Based on {mo} months of tracking · {activeCard.name}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#999" }}>Fee Recovery</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: feePct >= 100 ? "#8ecf8e" : "#f0f0f0" }}>{feePct}%</span>
              </div>
              <div style={{ height: 8, background: "#0e0e11", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: feePct + "%", background: feePct >= 100 ? "#8ecf8e" : feePct >= 70 ? "#e8c76a" : "#e87c7c", borderRadius: 4 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                <span style={{ fontSize: 9, color: "#555" }}>$0</span>
                <span style={{ fontSize: 9, color: "#555" }}>${activeCard.annualFee} fee</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[["Credits Redeemed", "$" + redeemed.toFixed(0), "of ~$" + maxPoss.toLocaleString() + " possible/yr", "#8ecf8e"], ["Est. Perk Value", "$" + perkVal, usedPerks + " of " + perks.length + " perks used", accent], ["Total Realized", "$" + (redeemed + perkVal).toFixed(0), "credits + est. perks", (redeemed + perkVal) >= activeCard.annualFee ? "#8ecf8e" : "#f0f0f0"], ["Projected Annual", "$" + proj.toFixed(0), "at current pace", proj >= activeCard.annualFee ? "#8ecf8e" : "#e8c76a"]].map(([l, v, sub, c], i) => (
                <div key={i} style={{ background: "#0e0e11", borderRadius: 6, padding: "10px" }}>
                  <div style={{ fontSize: 8, color: "#555", textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: c }}>{v}</div>
                  <div style={{ fontSize: 9, color: "#555" }}>{sub}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid #1e1e23", paddingTop: 10 }}>
              <div style={{ fontSize: 10, color: "#777", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>Key Factors</div>
              {reasons.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 5, marginBottom: 4 }}>
                  <span style={{ color: vColor, fontSize: 10, flexShrink: 0 }}>-</span>
                  <span style={{ fontSize: 11, color: "#aaa", lineHeight: 1.4 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, marginBottom: 10 }}>
        {[["Annual Value", "~$" + Math.round(totalAnnual).toLocaleString(), "#8ecf8e"], ["Period Used", "$" + currentUsed.toFixed(0) + "/$" + currentTotal.toFixed(0), accent], ["Enrolled", enrolledCount + "/" + activeCard.benefits.length, enrolledCount === activeCard.benefits.length ? "#8ecf8e" : "#e8c76a"]].map(([l, v, c], i) => (
          <div key={i} style={{ background: "#151518", borderRadius: 8, padding: "10px", border: "1px solid #1a1a1f" }}>
            <div style={{ fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {[["all", "All (" + activeCard.benefits.length + ")"], ["credits", "Credits (" + credits.length + ")"], ["perks", "Perks (" + perks.length + ")"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ background: filter === k ? "rgba(" + accentA + ",.08)" : "transparent", color: filter === k ? accent : "#555", border: "1px solid", borderColor: filter === k ? "rgba(" + accentA + ",.2)" : "#1a1a1f", borderRadius: 5, padding: "3px 9px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
        ))}
      </div>

      {/* Benefit Rows */}
      {filtered.map(b => {
        const open = expandedId === b.id;
        const isPerk = b.value === 0;
        const pct = isPerk ? (b.used ? 100 : 0) : (b.value > 0 ? Math.min(100, Math.round(((b.usedAmount || 0) / b.value) * 100)) : 0);
        const days = getDaysUntilReset(b.period);
        const done = isPerk ? b.used : pct >= 100;
        const needsE = b.enrollReq && !b.enrolled;
        const dot = done ? "#8ecf8e" : needsE ? "#e8c76a" : "#555";

        const toggleEnrolled = () => { updateBenefit(activeCard.id, b.id, { enrolled: !b.enrolled }); flash(b.enrolled ? "Unenrolled" : "Enrolled!"); };
        const setUsedAmt = (amt) => { updateBenefit(activeCard.id, b.id, { usedAmount: Math.min(parseFloat(amt) || 0, b.value), used: (parseFloat(amt) || 0) > 0 }); };
        const markFull = () => { updateBenefit(activeCard.id, b.id, { usedAmount: b.value, used: true }); flash("Fully used!"); };
        const togglePerk = () => { updateBenefit(activeCard.id, b.id, { used: !b.used }); };

        return (
          <div key={b.id} style={{ background: "#151518", borderRadius: 9, border: "1px solid", borderColor: done ? "rgba(142,207,142,.18)" : needsE ? "rgba(232,180,80,.12)" : "#1e1e23", marginBottom: 4, overflow: "hidden" }}>
            <div onClick={() => { setExpandedId(open ? null : b.id); setActiveTab("guide"); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 11px", cursor: "pointer" }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: dot, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#ddd", marginBottom: 1 }}>{b.name}</div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 8, color: accent, background: "rgba(" + accentA + ",.07)", padding: "1px 5px", borderRadius: 3 }}>{b.cat}</span>
                  <span style={{ fontSize: 8, color: "#555", background: "rgba(255,255,255,.03)", padding: "1px 5px", borderRadius: 3 }}>{b.period}</span>
                  {days != null && <span style={{ fontSize: 8, color: days <= 14 ? "#e87c7c" : days <= 30 ? "#e8c76a" : "#555", background: "rgba(255,255,255,.03)", padding: "1px 5px", borderRadius: 3 }}>{days}d</span>}
                  {needsE && <span style={{ fontSize: 7, color: "#e8c76a", background: "rgba(232,180,80,.1)", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>NOT ENROLLED</span>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {isPerk ? <span style={{ fontSize: 9, color: "#555" }}>Perk</span> : <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "#f0f0f0" }}>${b.value}<span style={{ fontSize: 9, color: "#555", fontWeight: 400 }}>{getPeriodLabel(b.period)}</span></span>}
                <div style={{ fontSize: 8, color: "#333", marginTop: 1 }}>{open ? "^" : "v"}</div>
              </div>
            </div>

            {!isPerk && <div style={{ height: 2, background: "#1a1a1f", marginLeft: 11, marginRight: 11 }}><div style={{ height: "100%", width: pct + "%", background: pct >= 100 ? "#8ecf8e" : pct > 0 ? accent : "transparent" }} /></div>}

            {open && (
              <div style={{ padding: "0 11px 12px" }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: accent, margin: "6px 0 8px", lineHeight: 1.4 }}>{b.headline}</p>
                <div style={{ display: "flex", gap: 3, marginBottom: 7, borderBottom: "1px solid #1a1a1f", paddingBottom: 5 }}>
                  {[["guide", "How to Use"], ["tips", "Pro Tips"], ["pitfalls", "Pitfalls"]].map(([k, l]) => (
                    <button key={k} onClick={() => setActiveTab(k)} style={{ background: activeTab === k ? "rgba(" + accentA + ",.08)" : "transparent", color: activeTab === k ? accent : "#555", border: "none", padding: "3px 7px", fontSize: 10, cursor: "pointer", borderRadius: 4, fontFamily: "inherit" }}>{l}</button>
                  ))}
                </div>
                <div style={{ minHeight: 40, marginBottom: 8 }}>
                  {activeTab === "guide" && (
                    <div>
                      {b.howTo.map((s, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                          <span style={{ width: 16, height: 16, borderRadius: 8, background: "rgba(" + accentA + ",.1)", color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontSize: 11, color: "#bbb", lineHeight: 1.5 }}>{s}</span>
                        </div>
                      ))}
                      {b.enrollReq && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "rgba(" + accentA + ",.04)", border: "1px solid rgba(" + accentA + ",.1)", borderRadius: 6, padding: "8px 9px", marginTop: 6, flexWrap: "wrap" }}>
                          <div><div style={{ fontSize: 9, color: accent, fontWeight: 600 }}>ENROLLMENT</div><div style={{ fontSize: 10, color: "#999" }}>{b.enrollAction}</div></div>
                          <button onClick={(e) => { e.stopPropagation(); toggleEnrolled(); }} style={{ background: b.enrolled ? "rgba(142,207,142,.12)" : "rgba(" + accentA + ",.12)", color: b.enrolled ? "#8ecf8e" : accent, border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                            {b.enrolled ? "Enrolled" : "Mark Enrolled"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === "tips" && b.tips.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                      <span style={{ fontSize: 10, flexShrink: 0 }}>*</span>
                      <span style={{ fontSize: 11, color: "#a8d8a8", lineHeight: 1.5 }}>{t}</span>
                    </div>
                  ))}
                  {activeTab === "pitfalls" && b.pitfalls.map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                      <span style={{ fontSize: 10, flexShrink: 0 }}>!</span>
                      <span style={{ fontSize: 11, color: "#e8c76a", lineHeight: 1.5 }}>{p}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid #1a1a1f", paddingTop: 7 }}>
                  {isPerk ? (
                    <button onClick={() => togglePerk()} style={{ width: "100%", border: "none", borderRadius: 5, padding: "6px", fontSize: 10, fontWeight: 600, cursor: "pointer", background: b.used ? "rgba(142,207,142,.1)" : "rgba(" + accentA + ",.1)", color: b.used ? "#8ecf8e" : accent }}>
                      {b.used ? "Benefit Used" : "Mark as Used"}
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 10, color: "#666" }}>Used:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, background: "#0e0e11", border: "1px solid #1a1a1f", borderRadius: 4, padding: "3px 6px" }}>
                        <span style={{ color: "#555", fontSize: 11 }}>$</span>
                        <input type="number" value={b.usedAmount || ""} placeholder="0" min="0" max={b.value} step="0.01" onChange={e => setUsedAmt(e.target.value)}
                          style={{ width: 45, background: "transparent", border: "none", color: "#e0e0e0", fontSize: 11, fontFamily: "monospace", textAlign: "right", outline: "none" }} />
                        <span style={{ color: "#444", fontSize: 10 }}>/ ${b.value}</span>
                      </div>
                      <button onClick={() => markFull()} style={{ background: "rgba(" + accentA + ",.1)", color: accent, border: "none", borderRadius: 3, padding: "3px 7px", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Max</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {showReport && <MonthlyReport card={activeCard} email={email} onClose={() => setShowReport(false)} />}
      {showPicker && <CardPicker available={availableCards} onAdd={addCard} onClose={() => setShowPicker(false)} />}
      {toast && <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "#222", color: "#e0e0e0", padding: "6px 14px", borderRadius: 7, fontSize: 11, border: "1px solid #333", zIndex: 1100 }}>{toast}</div>}
    </div>
  );
}
