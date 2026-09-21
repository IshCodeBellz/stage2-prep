/* The resource catalogue. One entry per guide, in reading order.
   Used by the library page, the landing page and the prev/next links inside
   each guide, so a new guide only has to be added here once.

   tier — starter | gold | platinum. This is what the paywall reads; see tiers.js.
   Changing a tier here changes it everywhere, including the pricing table. */

window.GROUPS = [
  { id:"career",    name:"Getting in",
    blurb:"The route into the job itself: who can apply, how vacancies work, what the training and the licence are, and what it pays." },
  { id:"process",   name:"The process",
    blurb:"What the day is, which tests your operator is likely to use, and where these notes come from." },
  { id:"stage1",    name:"Stage 1 — the paper and screen battery",
    blurb:"Concentration, attention, rules and fault finding. Mostly timed papers, marked for speed and error together." },
  { id:"stage2",    name:"Stage 2 — the Vienna tests",
    blurb:"Perception, vigilance and co-ordination, run on a computer with a response panel. Nothing to write." },
  { id:"interview", name:"Judgement and the interview",
    blurb:"The situational exercises and the structured interview that follows the tests." },
  { id:"plan",      name:"Preparing",
    blurb:"How to spend the weeks before, and how to read your own scores." }
];

window.RESOURCES = [
  { slug:"becoming-a-train-driver", group:"career", tier:"starter", minutes:12,
    stage:"All stages",
    title:"How to become a train driver in the UK",
    dek:"The whole route in seven steps: eligibility, finding the vacancy, the form, the assessment centre, the interview, the medical, and the eighteen months of training that follow." },

  { slug:"eligibility", group:"career", tier:"starter", minutes:9,
    stage:"All stages",
    title:"Can you actually apply?",
    dek:"Age — now 18 — education, eyesight, colour vision, hearing and depot distance. What the law requires, what operators add, and which common worries are not disqualifying at all." },

  { slug:"applying", group:"career", tier:"gold", minutes:9,
    stage:"All stages",
    title:"Applying: windows, forms and the attempts you get",
    dek:"How vacancies open and close, what the form screens for, the national database behind it, and the three-attempt rule with a five-year gap almost nobody knows about." },

  { slug:"training-and-pay", group:"career", tier:"gold", minutes:9,
    stage:"All stages",
    title:"Training, licensing and what the job pays",
    dek:"Rules school, traction and route learning, the ORR licence against the employer's certificate, the medicals that never stop, and honest numbers on trainee and qualified pay." },

  { slug:"assessment-day", group:"process", tier:"starter", minutes:8,
    stage:"All stages",
    title:"The assessment day, start to finish",
    dek:"What actually happens between arriving at the centre and being sent home — the order, the breaks, and the bits nobody warns you about." },

  { slug:"test-variants", group:"process", tier:"starter", minutes:6,
    stage:"All stages",
    title:"Which tests will you actually sit?",
    dek:"Operators pick from the same short menu. How to find out what yours uses, and what RAAT, SCAAT and the Vienna battery mean when they appear in your invite." },

  { slug:"group-bourdon", group:"stage1", tier:"starter", minutes:7,
    stage:"Stage 1", drill:"Group Bourdon",
    title:"Group Bourdon: the dot groups",
    dek:"Mark every group of exactly four dots, five parts, a minute each. The test that fails more candidates than any other, and why it is nearly always pace rather than eyesight." },

  { slug:"tea-occ", group:"stage1", tier:"gold", minutes:8,
    stage:"Stage 1", drill:"Tea-Occ",
    title:"TEA-Occ: counting, searching, and doing both",
    dek:"Three parts that build to one question — how much of your accuracy survives when a second job arrives on top of the first." },

  { slug:"trp1b", group:"stage1", tier:"gold", minutes:8,
    stage:"Stage 1", drill:"TRP1b",
    title:"TRP1b: reading rules once and keeping them",
    dek:"Three minutes with a passage of procedure, then it is taken away. How to read a rule so it is still there eighteen questions later." },

  { slug:"trp2", group:"stage1", tier:"gold", minutes:6,
    stage:"Stage 1", drill:"TRP2",
    title:"TRP2: the order you check things in",
    dek:"Dials, arrows and backgrounds that set priority. A rule you can hold in one line, applied forty-three times without drifting." },

  { slug:"dfft", group:"stage1", tier:"gold", minutes:7,
    stage:"Stage 1", drill:"DFFT",
    title:"DFFT: fault finding against a guide",
    dek:"A panel of indications, a fault finder guide, and one correct first action. The only Stage 1 test where slowing down scores better." },

  { slug:"vse", group:"stage2", tier:"starter", minutes:6,
    stage:"Stage 2", drill:"VSE",
    title:"Visual search: dot sequences and letter columns",
    dek:"Two search papers and then both at once. What the combined part is really measuring, and why your score on it drops." },

  { slug:"wafv", group:"stage2", tier:"gold", minutes:7,
    stage:"Stage 2", drill:"WAFV",
    title:"WAFV: thirty minutes of nearly nothing",
    dek:"A grey square, a rare change, and half an hour of it. The test is not the response — it is what your response looks like in minute twenty-six." },

  { slug:"atavt", group:"stage2", tier:"gold", minutes:7,
    stage:"Stage 2", drill:"ATAVT",
    title:"ATAVT: one second of a road",
    dek:"A traffic scene flashes up and is gone. A looking pattern that beats staring, and the reason guessing is punished less than you think." },

  { slug:"two-hand", group:"stage2", tier:"gold", minutes:6,
    stage:"Stage 2", drill:"2-Hand",
    title:"2HAND: co-ordination under a moving line",
    dek:"Two controls, one dot, one narrow channel. Smoothness beats speed, and the fix for most people is grip and breathing." },

  { slug:"determination-test", group:"stage2", tier:"platinum", minutes:8,
    stage:"Stage 2",
    title:"The Determination Test: pressure on purpose",
    dek:"Colours, tones, pedals and a pace that speeds up until you drop things. What adaptive means here, and how to stop it spiralling." },

  { slug:"sjt-sje", group:"interview", tier:"gold", minutes:9,
    stage:"Stage 2", drill:"M7-SJT and SJE",
    title:"Situational judgement: ranking and rating",
    dek:"Four answers to put in order, or five points to rate against. The safety-first hierarchy that decides almost every item." },

  { slug:"mmi-interview", group:"interview", tier:"platinum", minutes:11,
    stage:"Interview", drill:"MMI",
    title:"The interviews: MMI and DMI",
    dek:"Two interviews that want different things: the multi-modal interview at the assessment centre, with its form and six probed examples, and the drivers' manager interview that usually decides the offer." },

  { slug:"four-week-plan", group:"plan", tier:"platinum", minutes:9,
    stage:"All stages",
    title:"A four-week plan that does not burn you out",
    dek:"What to practise on which day, when to stop practising, and the sittings that are worth doing under full exam conditions." },

  { slug:"scoring", group:"plan", tier:"platinum", minutes:8,
    stage:"All stages",
    title:"Reading your own scores",
    dek:"Speed against error, what a percentile means, the attempts rule as it stands since December 2024, and how to tell a bad sitting from a real weakness." },

  { slug:"sources", group:"process", tier:"starter", minutes:4,
    stage:"All stages",
    title:"Where this comes from",
    dek:"The published material, forum accounts and open-source simulators these notes were built against — and what we deliberately do not claim to know." }
];

window.RES = {
  bySlug(slug){ return window.RESOURCES.find(r => r.slug === slug) || null; },
  inGroup(id){ return window.RESOURCES.filter(r => r.group === id); },
  url(r){ return "/resources/" + r.slug; },
  groupName(id){ const g = window.GROUPS.find(g => g.id === id); return g ? g.name : id; }
};
