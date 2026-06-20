import { dbService } from './firebase.js';

// ==========================================================================
// THEME SWITCHER
// ==========================================================================
const themeToggleBtn = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;

// Initialize theme from storage (default to light)
const savedTheme = localStorage.getItem('portfolio-theme');
if (savedTheme) {
  htmlElement.setAttribute('data-theme', savedTheme);
} else {
  htmlElement.setAttribute('data-theme', 'light');
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('portfolio-theme', newTheme);
  });
}

// ==========================================================================
// TYPEWRITER WIDGET
// ==========================================================================
let typewriterWords = ["Analytical Modelling Specialist", "Product Builder", "Pragmatic Problem Solver", "AI-First Vibe Coder", "Agentic AI Architect"];
let wordIdx = 0;
let charIdx = 0;
let isDeleting = false;
let typingSpeed = 100;

function runTypeEffect() {
  const typewriterElement = document.getElementById('typewriter');
  if (!typewriterElement) return;
  
  const currentWord = typewriterWords[wordIdx];
  
  if (isDeleting) {
    typewriterElement.textContent = currentWord.substring(0, charIdx - 1);
    charIdx--;
    typingSpeed = 50;
  } else {
    typewriterElement.textContent = currentWord.substring(0, charIdx + 1);
    charIdx++;
    typingSpeed = 120;
  }
  
  if (!isDeleting && charIdx === currentWord.length) {
    isDeleting = true;
    typingSpeed = 2000;
  } else if (isDeleting && charIdx === 0) {
    isDeleting = false;
    wordIdx = (wordIdx + 1) % typewriterWords.length;
    typingSpeed = 500;
  }
  
  setTimeout(runTypeEffect, typingSpeed);
}

// ==========================================================================
// SCROLL REVEAL & NAVIGATION HIGHLIGHT
// ==========================================================================
let revealObserver = null;
let sectionObserver = null;

function initIntersectionObservers() {
  // Disconnect existing observers if any
  if (revealObserver) revealObserver.disconnect();
  if (sectionObserver) sectionObserver.disconnect();
  
  const revealElements = document.querySelectorAll('.reveal');
  revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  revealElements.forEach(el => revealObserver.observe(el));

  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const activeId = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${activeId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, {
    threshold: 0.25,
    rootMargin: '-80px 0px -30% 0px'
  });
  sections.forEach(section => sectionObserver.observe(section));
}

// ==========================================================================
// INTERACTIVE RISK MATRIX CALCULATOR
// ==========================================================================
const probabilityLabels = ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const impactLabels = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

const strategies = {
  low: {
    rating: "Low Risk",
    class: "badge-low",
    strategy: "Acceptable risk level. Monitor periodically during regular feature lifecycle reviews. No immediate changes needed."
  },
  medium: {
    rating: "Medium Risk",
    class: "badge-med",
    strategy: "Manageable risk. Formulate standard mitigation rules, verify analytics tracking, and alert product operations on launch."
  },
  high: {
    rating: "High Risk",
    class: "badge-high",
    strategy: "Requires immediate mitigation steps. Implement multi-factor fallbacks or pre-launch security reviews. Obtain leadership approval."
  },
  critical: {
    rating: "Critical Risk",
    class: "badge-crit",
    strategy: "Deploy emergency stop mechanisms. Rollback features or block release until security vulnerability, fraud leak, or compliance gap is fully mitigated."
  }
};

function initRiskCalculator() {
  const probSlider = document.getElementById('probability-slider');
  const impactSlider = document.getElementById('impact-slider');
  if (!probSlider || !impactSlider) return;
  
  const probValDisplay = document.getElementById('probability-val');
  const impactValDisplay = document.getElementById('impact-val');
  const riskRatingDisplay = document.getElementById('risk-rating');
  const riskScoreDisplay = document.getElementById('risk-score');
  const riskStrategyDisplay = document.getElementById('risk-strategy');
  const gaugeFill = document.getElementById('gauge-fill');
  const matrixMarker = document.getElementById('matrix-marker');
  const gridCells = document.querySelectorAll('.grid-cell');

  // Colors based on score
  gridCells.forEach(cell => {
    const p = parseInt(cell.getAttribute('data-p'));
    const i = parseInt(cell.getAttribute('data-i'));
    const score = p * i;
    if (score <= 4) cell.classList.add('green');
    else if (score <= 8) cell.classList.add('yellow');
    else if (score <= 15) cell.classList.add('orange');
    else cell.classList.add('red');
  });

  function updateRiskAssessment() {
    const prob = parseInt(probSlider.value);
    const impact = parseInt(impactSlider.value);
    
    probValDisplay.textContent = `${prob} / 5 (${probabilityLabels[prob - 1]})`;
    impactValDisplay.textContent = `${impact} / 5 (${impactLabels[impact - 1]})`;
    
    const score = prob * impact;
    riskScoreDisplay.textContent = score;
    
    let category = 'low';
    if (score <= 4) category = 'low';
    else if (score <= 9) category = 'medium';
    else if (score <= 15) category = 'high';
    else category = 'critical';
    
    const strategyData = strategies[category];
    riskRatingDisplay.textContent = strategyData.rating;
    riskRatingDisplay.className = `status-badge ${strategyData.class}`;
    riskStrategyDisplay.textContent = strategyData.strategy;
    
    const percent = (score - 1) / 24;
    const strokeOffset = 251 - (251 * percent);
    gaugeFill.style.strokeDashoffset = strokeOffset;
    
    const xPercent = (prob - 1) * 20 + 10;
    const yPercent = (5 - impact) * 20 + 10;
    matrixMarker.style.left = `${xPercent}%`;
    matrixMarker.style.top = `${yPercent}%`;
    
    gridCells.forEach(cell => {
      const cp = parseInt(cell.getAttribute('data-p'));
      const ci = parseInt(cell.getAttribute('data-i'));
      if (cp === prob && ci === impact) {
        cell.style.opacity = "1";
        cell.style.transform = "scale(1.05)";
        cell.style.boxShadow = "0 0 10px rgba(255,255,255,0.4)";
      } else {
        cell.style.opacity = "0.4";
        cell.style.transform = "scale(1)";
        cell.style.boxShadow = "none";
      }
    });
  }

  probSlider.addEventListener('input', updateRiskAssessment);
  impactSlider.addEventListener('input', updateRiskAssessment);
  updateRiskAssessment(); // initial run
}

// ==========================================================================
// CREDENTIALS TAB SWITCHING
// ==========================================================================
function initCredentialsTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      tabContents.forEach(content => content.classList.remove('active'));
      const targetContent = document.getElementById(targetTab);
      if (targetContent) targetContent.classList.add('active');
    });
  });
}

// ==========================================================================
// CONTACT FORM HANDLER
// ==========================================================================
function initContactForm() {
  const contactForm = document.getElementById('contact-form');
  const submitBtn = document.getElementById('form-submit-btn');
  const formFeedback = document.getElementById('form-feedback');
  
  if (contactForm && submitBtn) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `<span>Sending Message...</span>`;
      formFeedback.style.display = 'none';
      
      const formSubject = document.getElementById('form-subject').value;
      const formData = {
        name: document.getElementById('form-name').value,
        email: document.getElementById('form-email').value,
        _subject: `New Portfolio Message: ${formSubject}`,
        message: document.getElementById('form-message').value
      };
      
      dbService.logContactSubmission({
        name: formData.name,
        email: formData.email,
        subject: formSubject,
        message: formData.message
      }).catch(err => console.error("Database log fail:", err));
      
      const emailLink = document.querySelector('.contact-item a[href^="mailto:"]');
      const emailAddress = emailLink ? emailLink.getAttribute('href').replace('mailto:', '').trim() : 'vimal2014sharma@gmail.com';
      
      fetch(`https://formsubmit.co/ajax/${emailAddress}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      .then(response => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        
        if (response.ok) {
          formFeedback.textContent = "Message sent successfully! (Note: Check spam if you don't receive it, or verify activation on the first submission)";
          formFeedback.className = "form-feedback-message success";
          formFeedback.style.display = 'block';
          contactForm.reset();
        } else {
          formFeedback.textContent = "Oops! There was a problem sending your message. Please try again.";
          formFeedback.className = "form-feedback-message error";
          formFeedback.style.display = 'block';
        }
        setTimeout(() => { formFeedback.style.display = 'none'; }, 8000);
      })
      .catch(error => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        formFeedback.textContent = "Network error. Please check your connection.";
        formFeedback.className = "form-feedback-message error";
        formFeedback.style.display = 'block';
        setTimeout(() => { formFeedback.style.display = 'none'; }, 8000);
      });
    });
  }
}

// ==========================================================================
// RESUME DOWNLOAD MODAL & CAPTURE
// ==========================================================================
const resumeModal = document.getElementById('resume-modal');
const closeResumeModalBtn = document.getElementById('close-resume-modal');
const resumeForm = document.getElementById('resume-capture-form');

function initResumeModalTriggers() {
  const downloadButtons = document.querySelectorAll('a[download][href="resume.pdf"], a[href="resume.pdf"]');
  downloadButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (resumeModal) resumeModal.classList.add('active');
    });
  });
}

if (closeResumeModalBtn && resumeModal) {
  closeResumeModalBtn.addEventListener('click', () => {
    resumeModal.classList.remove('active');
  });
  resumeModal.addEventListener('click', (e) => {
    if (e.target === resumeModal) resumeModal.classList.remove('active');
  });
}

if (resumeForm) {
  resumeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('capture-submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Processing Download...</span>';
    
    const name = document.getElementById('capture-name').value;
    const email = document.getElementById('capture-email').value;
    const company = document.getElementById('capture-company').value || 'Not Specified';
    const message = document.getElementById('capture-message').value || 'None';
    
    try {
      await dbService.logResumeDownload({
        name,
        email,
        company,
        message,
        ip: sessionStorage.getItem('portfolio_ip') || 'Local'
      });
    } catch (err) {
      console.error("Download log fail:", err);
    }
    
    const link = document.createElement('a');
    link.href = 'resume.pdf';
    link.setAttribute('download', 'Vimal_Sharma_Resume.pdf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Retrieve contact section email dynamically for forwarding
    try {
      const sections = await dbService.getSections();
      const contactSectionObj = sections.find(s => s.type === 'contact') || { content: {} };
      const adminEmailAddress = contactSectionObj.content.email || 'vimal2017sharma@gmail.com';
      
      fetch(`https://formsubmit.co/ajax/${adminEmailAddress}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `New Resume Download: ${name} (${company})`,
          name: name,
          email: email,
          company: company,
          message: message,
          info: "This user has downloaded your resume."
        })
      }).catch(err => console.warn("FormSubmit send failed:", err));
    } catch (err) {
      console.warn("Could not retrieve forward email address:", err);
    }
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    resumeModal.classList.remove('active');
    resumeForm.reset();
  });
}

// ==========================================================================
// PASSIVE VISITOR ANALYTICS
// ==========================================================================
let sessionId = sessionStorage.getItem('portfolio_session_id');
let trackingInitialized = false;

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) return "Mobile";
  return "Desktop";
}

function getBrowser() {
  const ua = navigator.userAgent;
  if (ua.indexOf("Firefox") > -1) return "Firefox";
  if (ua.indexOf("SamsungBrowser") > -1) return "Samsung Browser";
  if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) return "Opera";
  if (ua.indexOf("Trident") > -1) return "Internet Explorer";
  if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) return "Edge";
  if (ua.indexOf("Chrome") > -1) return "Chrome";
  if (ua.indexOf("Safari") > -1) return "Safari";
  return "Other";
}

async function initVisitorTracking() {
  if (trackingInitialized) return;
  trackingInitialized = true;
  
  const startTime = Date.now();
  const page = window.location.hash || '#hero';
  
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    sessionStorage.setItem('portfolio_session_id', sessionId);
  }
  
  let ipAddress = 'Local';
  let location = 'Bangalore, India';
  
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const geoData = await response.json();
      ipAddress = geoData.ip || 'Local';
      location = `${geoData.city || 'Unknown City'}, ${geoData.country_name || 'India'}`;
      sessionStorage.setItem('portfolio_ip', ipAddress);
    }
  } catch (err) {
    console.warn("Geolocation API offline or blocked.");
  }
  
  const sessionData = {
    sessionId,
    timestamp: Date.now(),
    startTime,
    lastActive: Date.now(),
    timeSpent: 0,
    deviceType: getDeviceType(),
    browser: getBrowser(),
    location,
    referrer: document.referrer ? new URL(document.referrer).hostname : 'Direct',
    pagesVisited: [page]
  };
  
  try {
    await dbService.logSession(sessionData);
  } catch (err) {
    console.error("Session log fail:", err);
  }
  
  setInterval(async () => {
    if (!document.hidden) {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      const currentHash = window.location.hash || '#hero';
      try {
        const sessions = await dbService.getSessions();
        const currentSess = sessions.find(s => s.sessionId === sessionId);
        let pages = [currentHash];
        if (currentSess && currentSess.pagesVisited) {
          pages = currentSess.pagesVisited;
          if (!pages.includes(currentHash)) pages.push(currentHash);
        }
        await dbService.updateSession(sessionId, {
          timeSpent,
          lastActive: Date.now(),
          pagesVisited: pages
        });
      } catch (err) {
        console.error("Heartbeat sync error:", err);
      }
    }
  }, 15000);
}

window.addEventListener('hashchange', async () => {
  if (sessionId) {
    const currentHash = window.location.hash || '#hero';
    try {
      const sessions = await dbService.getSessions();
      const currentSess = sessions.find(s => s.sessionId === sessionId);
      let pages = [currentHash];
      if (currentSess && currentSess.pagesVisited) {
        pages = currentSess.pagesVisited;
        if (!pages.includes(currentHash)) {
          pages.push(currentHash);
          await dbService.updateSession(sessionId, { pagesVisited: pages });
        }
      }
    } catch (err) {
      console.warn("Hash nav log failed:", err);
    }
  }
});

// ==========================================================================
// DYNAMIC PAGE SEEDING & ENGINE
// ==========================================================================
async function hydrateOrSeedPortfolio() {
  try {
    const container = document.getElementById('sections-container');
    if (!container) return;
    
    let dbSections = await dbService.getSections();
    
    // Auto-clean any existing risk-matrix sections from database
    const hasRiskMatrix = dbSections.some(s => s.id === 'risk-matrix' || s.type === 'risk-matrix');
    if (hasRiskMatrix) {
      for (const s of dbSections) {
        if (s.id === 'risk-matrix' || s.type === 'risk-matrix') {
          await dbService.deleteSection(s.id);
        }
      }
      dbSections = await dbService.getSections();
    }

    // Auto-migrate hero typewriter words if using old defaults
    const heroSecObj = dbSections.find(s => s.type === 'hero');
    if (heroSecObj && heroSecObj.content) {
      const oldWords = ["Analytical Modelling Manager", "Fintech Risk Analyst", "Decision Scientist", "Agentic AI Architect"];
      const currentWords = heroSecObj.content.typewriterWords || [];
      const hasOldWords = currentWords.length === 4 && currentWords.every((w, idx) => w === oldWords[idx]);
      const containsOldManager = currentWords.includes("Analytical Modelling Manager");
      
      let needsSave = false;
      
      if (hasOldWords || containsOldManager) {
        console.log("🔄 Auto-migrating hero typewriter words to the new list...");
        heroSecObj.content.typewriterWords = [
          "Analytical Modelling Specialist",
          "Product Builder",
          "Pragmatic Problem Solver",
          "AI-First Vibe Coder",
          "Agentic AI Architect"
        ];
        needsSave = true;
      }
      
      // Ensure old risk-calculator CTA links are updated to case studies since risk calculator was removed
      if (heroSecObj.content.ctaPrimaryText === 'Launch Risk Calculator') {
        heroSecObj.content.ctaPrimaryText = 'View Case Studies';
        heroSecObj.content.ctaPrimaryLink = '#projects';
        needsSave = true;
      }
      
      // Clear duplicate secondary CTA text if it matches primary (e.g. after prior migration step)
      if (heroSecObj.content.ctaPrimaryText === 'View Case Studies' && heroSecObj.content.ctaSecondaryText === 'View Case Studies') {
        console.log("🔄 Removing duplicate secondary CTA button...");
        heroSecObj.content.ctaSecondaryText = '';
        heroSecObj.content.ctaSecondaryLink = '';
        needsSave = true;
      }
      
      if (needsSave) {
        await dbService.saveSection(heroSecObj);
        dbSections = await dbService.getSections();
      }
    }
    
    // First Run: Scrape and Seed from DOM
    if (dbSections.length === 0) {
      console.log("🌱 Database sections empty. Seeding defaults from index.html...");
      
      const defaultSections = [
        {
          id: 'hero',
          type: 'hero',
          title: 'Hero Section',
          visible: true,
          order: 0,
          content: {
            badgeText: '',
            title: "Hi, I'm Vimal Sharma",
            tagline: "Expert in PySpark, Python, and Agentic AI building anomaly detection, network-based transaction monitoring, and GenAI compliance tools at scale.",
            ctaPrimaryText: 'View Case Studies',
            ctaPrimaryLink: '#projects',
            ctaSecondaryText: '',
            ctaSecondaryLink: '',
            ctaResumeText: 'Download Resume',
            profileImg: 'profile.jpg',
            typewriterWords: ["Analytical Modelling Specialist", "Product Builder", "Pragmatic Problem Solver", "AI-First Vibe Coder", "Agentic AI Architect"]
          }
        },
        {
          id: 'metrics',
          type: 'metrics',
          title: 'Key Metrics',
          visible: true,
          order: 1,
          content: {
            cards: [
              { icon: '🛡️', value: '$240K+', description: 'Annual operational savings achieved by deploying rule-based and behavioral anomaly detection models.' },
              { icon: '📈', value: '26%', description: 'Overall reduction in false-positive compliance alerts across transactional monitoring systems.' },
              { icon: '⚡', value: '80%', description: 'Entity resolution improvement using automated coldlisting thresholds via Quantexa integration.' },
              { icon: '📊', value: '1,000+', description: 'Hours automated annually, reducing data quality cycle times from 3 months down to 1 week.' }
            ]
          }
        },
        {
          id: 'about',
          type: 'about',
          title: 'About Bio',
          visible: true,
          order: 2,
          content: {
            avatarName: 'Vimal Sharma',
            avatarSub: 'Analytical Modelling Manager',
            title: 'Bridging Data Engineering & Product Strategy',
            para1: 'I am an Analytical Modelling Manager with over 3 years of experience at HSBC in AML and financial crime risk. I specialize in utilizing PySpark, Python, and Agentic AI frameworks to build anomaly detection systems, network-based transaction monitoring pipelines, and GenAI-powered investigation tools at scale.',
            para2: 'By combining deep technical skills in data engineering with strategic product thinking, I design automated risk guardrails that enable products to scale safely while drastically reducing compliance alerts and operational overhead.',
            philosophy: 'Bridge data pipelines with strategic compliance.',
            education: 'MBA in Finance (Christ University) | BA in Economics',
            certifications: 'CFA Level 1 | ICA | ISO 20022 | Lean Six Sigma Yellow Belt'
          }
        },
        {
          id: 'skills',
          type: 'skills',
          title: 'Core Skills',
          visible: true,
          order: 3,
          content: {
            lang: ["Python (Pandas, NumPy)", "PySpark & Big Data", "SQL & Database Modeling", "Scala Development", "Apache Airflow ETL", "Google Cloud Platform (GCP)"],
            risk: ["Anti-Money Laundering (AML)", "Transaction Monitoring Systems", "Financial Crime Prevention", "Quantexa Entity Resolution", "Network Graph Analytics", "Model Validation & BRDs"],
            ai: ["Prompt Engineering", "Generative AI & LLMs", "Agentic AI Frameworks", "Statistical & Rule Models", "A/B Testing & Analysis", "Design Thinking Process"]
          }
        },
        {
          id: 'experience',
          type: 'experience',
          title: 'Work Experience',
          visible: true,
          order: 4,
          content: {
            items: [
              {
                date: "May 2025 – Present",
                role: "Manager - Financial Crime Detection",
                company: "HSBC, Bangalore",
                bullets: [
                  "Saved <strong>$240K annually</strong> and reduced alerts by <strong>26%</strong> by deploying rule-based and behavioral anomaly detection models using PySpark and Scala.",
                  "Designed and tuned <strong>15+ rule-based and statistical models</strong> for AML transaction monitoring, setting risk-based thresholds leading to a <strong>20% increase</strong> in investigator efficiency.",
                  "Automated data quality monitoring (DUSE) across 4 markets, improving data quality by 40% and cutting cycle time from 3 months to 1 week.",
                  "Built GenAI prompt workflows for investigators to auto-close cases with embedded investigation summaries, deployed in production.",
                  "Improved entity resolution by <strong>80%</strong> using Quantexa with auto coldlisting thresholds.",
                  "Built ETL pipelines using Apache Airflow and PySpark to evaluate alert impact post-threshold tuning.",
                  "Used Network Graph mapping to analyze relationships between entities (people, accounts, companies) to detect hidden connections.",
                  "Led proof-of-concept (POC) evaluations of 3 Gen AI solutions for financial crime use cases, presenting findings to senior leadership."
                ]
              },
              {
                date: "Jan 2024 – Apr 2025",
                role: "Assistant Manager - Financial Crime Detection",
                company: "HSBC, Bangalore",
                bullets: [
                  "Deployed Quantexa network-based transaction monitoring across <strong>5+ HSBC markets</strong>.",
                  "Authored model documentation and business requirement documents (BRDs) approved by model validation teams and senior leadership, reducing review cycle time by <strong>25%</strong>.",
                  "Coordinated stakeholder reviews and aligned technical requirements with global compliance regulations."
                ]
              },
              {
                date: "Jun 2023 – Dec 2023",
                role: "Analyst - Compliance Product Management",
                company: "HSBC, Bangalore",
                bullets: [
                  "Built AML customer segmentation models and assessed banking infrastructure for compliance risk gaps.",
                  "Led 2-week sprint cycles across a cross-functional team of 8 (data engineers, IT, analysts, compliance SMEs), delivering 4 transaction monitoring models within a 6-month roadmap.",
                  "Facilitated daily standups, sprint reviews, and retrospectives, improving team velocity by <strong>20%</strong> over 3 quarters and maintaining a sprint completion rate of <strong>90%+</strong>."
                ]
              },
              {
                date: "May 2022 – Jul 2022",
                role: "Investment Analyst Intern",
                company: "India Accelerator, Gurugram",
                bullets: [
                  "Sourced 50+ fintech startups for investment pipelines.",
                  "Evaluated start-ups and created investment one-pagers for senior management."
                ]
              },
              {
                date: "Jan 2022",
                role: "Data Analytics Consulting Intern",
                company: "KPMG India (Virtual)",
                bullets: [
                  "Worked on data consulting datasets, analyzing patterns and presenting dashboards for business reviews."
                ]
              }
            ]
          }
        },
        {
          id: 'credentials',
          type: 'credentials',
          title: 'Education & Credentials',
          visible: true,
          order: 5,
          content: {
            tab1Title: 'Academic Journey',
            tab2Title: 'Certifications',
            tab3Title: 'Honors & Achievements',
            eduItems: [
              { period: "2021 – 2023", degree: "Master of Business Administration (MBA) - Finance", school: "Christ University, Bangalore", description: "Specialized in corporate finance, investment analysis, and mathematical business analytics." },
              { period: "2017 – 2020", degree: "Bachelor of Arts (BA Hons) - Economics", school: "Amity University, Noida", description: "Core focus on quantitative economics, econometrics, and statistical models." },
              { period: "2007 – 2017", degree: "High School Commerce", school: "St. Joseph School", description: "Concentration in business mathematics, economics, and double-entry accounting." }
            ],
            certItems: [
              { icon: '🎖️', name: 'CFA Program Level I', issuer: 'CFA Institute (Cleared)' },
              { icon: '🧠', name: 'GenAI in Risk', issuer: 'AI Compliance & Risk Innovation' },
              { icon: '🤖', name: 'AI Pair Programming', issuer: 'GitHub Copilot & Development' },
              { icon: '📈', name: 'Trading Algorithms', issuer: 'Quantitative Execution Systems' },
              { icon: '🌐', name: 'ICA Certified', issuer: 'International Compliance Assoc.' },
              { icon: '⚙️', name: 'ISO 20022', issuer: 'Global Messaging Standards' },
              { icon: '🚀', name: 'McKinsey Forward', issuer: 'Forward Program Alumnus' }
            ],
            honorItems: [
              { icon: '🏆', title: 'Chrizellenz Finance Winner', description: 'Won first place in the national-level postgraduate finance competition event.' },
              { icon: '📄', title: 'IAARHIES Excellent Paper Award', description: 'Awarded for research paper publication displaying academic excellence and statistics.' },
              { icon: '🌱', title: 'Environmental Leadership', description: "Served as President & Vice-President of the 'Green Mortals' environmental club." },
              { icon: '🥋', title: 'Karate Black Belt', description: 'Achieved 1st Dan Black Belt, showing discipline, physical control, and dedication.' },
              { icon: '🗣️', title: 'Languages', description: 'Fluent in English and Hindi; elementary working knowledge of French.' }
            ]
          }
        },

        {
          id: 'projects',
          type: 'projects',
          title: 'Featured Projects',
          visible: true,
          order: 7,
          content: {}
        },
        {
          id: 'contact',
          type: 'contact',
          title: "Let's build a resilient product",
          visible: true,
          order: 8,
          content: {
            description: "If you need assistance in analyzing product risks, modeling transaction fraud pipelines, setting up compliant launch strategies, or auditing system metrics—reach out!",
            email: 'vimal2017sharma@gmail.com',
            phone: '9205714199',
            topmate: 'https://topmate.io/imvimalsha',
            location: 'Bangalore, India'
          }
        }
      ];
      
      for (const sec of defaultSections) {
        await dbService.saveSection(sec);
      }
      dbSections = defaultSections;
    }
    
    // Clear and Render Layout
    container.innerHTML = '';
    const activeSections = dbSections.filter(s => s.visible);
    
    // Retrieve Typewriter keywords from Hero Section
    const heroSectionObj = activeSections.find(s => s.type === 'hero');
    if (heroSectionObj && heroSectionObj.content && heroSectionObj.content.typewriterWords) {
      typewriterWords = heroSectionObj.content.typewriterWords;
    }
    
    activeSections.forEach((sec, index) => {
      const html = buildSectionHtml(sec, index);
      container.insertAdjacentHTML('beforeend', html);
    });
    
    // Append static footer
    const contactSectionObj = activeSections.find(s => s.type === 'contact') || { content: {} };
    const email = contactSectionObj.content.email || 'vimal2017sharma@gmail.com';
    const topmate = contactSectionObj.content.topmate || 'https://topmate.io/imvimalsha';
    
    const footerHtml = `
      <footer class="footer">
        <div class="footer-container">
          <p>&copy; 2026 Vimal Sharma. All rights reserved. Built with precision and vanilla technologies.</p>
          <div class="footer-links">
            <a href="#hero">Top</a>
            <a href="https://github.com/vimal2017sharma" target="_blank" rel="noopener">GitHub</a>
            <a href="https://www.linkedin.com/in/imvimalsha/" target="_blank" rel="noopener">LinkedIn</a>
            <a href="${topmate}" target="_blank" rel="noopener">Topmate</a>
            <a href="#admin" id="footer-admin-link">Admin Portal</a>
          </div>
        </div>
      </footer>
    `;
    container.insertAdjacentHTML('beforeend', footerHtml);

    // Initialize all widget DOM controls
    initIntersectionObservers();
    initRiskCalculator();
    initCredentialsTabs();
    initContactForm();
    initResumeModalTriggers();
    
  } catch (err) {
    console.error("Dynamic page hydration failed:", err);
  }
}

// Helper to build HTML based on section type
function buildSectionHtml(sec, index) {
  const content = sec.content || {};
  
  switch(sec.type) {
    case 'hero':
      const isDefaultBadge = !content.badgeText || content.badgeText.includes('Available for Consultation') || content.badgeText.includes('Available for Consultations');
      const filteredBadgeText = isDefaultBadge ? '' : content.badgeText;
      return `
        <section id="${sec.id}" class="hero-section">
          <div class="hero-container">
            <div class="hero-text-content">
              <div class="badge glass-card" id="hero-badge" style="${filteredBadgeText ? '' : 'display: none;'}">
                <span class="pulse-indicator"></span>
                <span data-section-id="${sec.id}" data-field="badgeText">${escapeHTML(filteredBadgeText)}</span>
              </div>
              <h1 class="hero-title" id="hero-title">
                Hi, I'm <span class="gradient-text" data-section-id="${sec.id}" data-field="avatarName">${escapeHTML(content.avatarName || 'Vimal Sharma')}</span>
              </h1>
              <p class="hero-subtitle">
                I am an <span id="typewriter" class="typewriter-text"></span><span class="cursor">|</span>. <span data-section-id="${sec.id}" data-field="tagline">${escapeHTML(content.tagline || '')}</span>
              </p>
              <div class="hero-buttons">
                <a href="${escapeHTML(content.ctaPrimaryLink || '#projects')}" class="btn-primary" data-section-id="${sec.id}" data-field="ctaPrimaryText">${escapeHTML(content.ctaPrimaryText || 'View Case Studies')}</a>
                ${content.ctaSecondaryText ? `<a href="${escapeHTML(content.ctaSecondaryLink || '#')}" class="btn-secondary" data-section-id="${sec.id}" data-field="ctaSecondaryText">${escapeHTML(content.ctaSecondaryText)}</a>` : ''}
                <a href="resume.pdf" class="btn-secondary" id="hero-cta-resume" data-section-id="${sec.id}" data-field="ctaResumeText">${escapeHTML(content.ctaResumeText || 'Download Resume')}</a>
              </div>
            </div>
            <div class="hero-graphic-content">
              <div class="hero-avatar-container">
                <div class="hero-avatar-card glass-card">
                  <img src="${escapeHTML(content.profileImg || 'profile.jpg')}" alt="Vimal Sharma" class="hero-profile-img">
                </div>
              </div>
            </div>
          </div>
        </section>
      `;
      
    case 'metrics':
      return `
        <section id="${sec.id}" class="metrics-section">
          <div class="section-container">
            <div class="metrics-grid">
              ${(content.cards || []).map((c, idx) => `
                <div class="metric-card glass-card reveal">
                  <div class="metric-icon">${c.icon}</div>
                  <h3 data-section-id="${sec.id}" data-field="cards.value" data-index="${idx}">${escapeHTML(c.value)}</h3>
                  <p data-section-id="${sec.id}" data-field="cards.description" data-index="${idx}">${escapeHTML(c.description)}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </section>
      `;
      
    case 'about':
      return `
        <section id="${sec.id}" class="about-section">
          <div class="section-container">
            <div class="about-grid">
              <div class="about-visual reveal">
                <div class="avatar-wrapper glass-card">
                  <div class="inner-avatar-graphic">
                    <svg viewBox="0 0 200 200" class="avatar-svg" style="max-width: 150px; width: 100%;">
                      <circle cx="100" cy="100" r="80" fill="none" stroke="var(--accent-color)" stroke-width="2" stroke-dasharray="10 5" />
                      <polygon points="100,30 160,135 40,135" fill="none" stroke="var(--accent-alt)" stroke-width="2" />
                      <circle cx="100" cy="30" r="8" fill="var(--accent-color)" />
                      <circle cx="160" cy="135" r="8" fill="var(--accent-alt)" />
                      <circle cx="40" cy="135" r="8" fill="var(--accent-color)" />
                      <line x1="100" y1="100" x2="100" y2="30" stroke="var(--text-secondary)" stroke-opacity="0.5" />
                      <line x1="100" y1="100" x2="160" y2="135" stroke="var(--text-secondary)" stroke-opacity="0.5" />
                      <line x1="100" y1="100" x2="40" y2="135" stroke="var(--text-secondary)" stroke-opacity="0.5" />
                      <circle cx="100" cy="100" r="15" fill="var(--bg-primary)" stroke="var(--text-main)" stroke-width="2" />
                    </svg>
                  </div>
                  <div class="avatar-info">
                    <h5 data-section-id="${sec.id}" data-field="avatarName">${escapeHTML(content.avatarName || 'Vimal Sharma')}</h5>
                    <span data-section-id="${sec.id}" data-field="avatarSub">${escapeHTML(content.avatarSub || 'Analytical Modelling Manager')}</span>
                  </div>
                </div>
              </div>
              <div class="about-text-content reveal">
                <h2 class="section-title" data-section-id="${sec.id}" data-field="title">${escapeHTML(content.title || 'Bridging Data Engineering & Product Strategy')}</h2>
                <p data-section-id="${sec.id}" data-field="para1">${escapeHTML(content.para1 || '')}</p>
                <p data-section-id="${sec.id}" data-field="para2">${escapeHTML(content.para2 || '')}</p>
                <div class="info-details">
                  <div class="detail-item">
                    <span class="detail-label">Philosophy:</span>
                    <span class="detail-value" data-section-id="${sec.id}" data-field="philosophy">${escapeHTML(content.philosophy || '')}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Education:</span>
                    <span class="detail-value" data-section-id="${sec.id}" data-field="education">${escapeHTML(content.education || '')}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Certifications:</span>
                    <span class="detail-value" data-section-id="${sec.id}" data-field="certifications">${escapeHTML(content.certifications || '')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      `;
      
    case 'skills':
      return `
        <section id="${sec.id}" class="skills-section">
          <div class="section-container">
            <h2 class="section-title text-center reveal" data-section-id="${sec.id}" data-field="title">${escapeHTML(sec.title || 'Technical & Analytical Core Skills')}</h2>
            <p class="section-desc text-center reveal" data-section-id="${sec.id}" data-field="subtitle">${escapeHTML(sec.subtitle || '')}</p>
            <div class="skills-grid">
              <div class="skills-card glass-card reveal">
                <div class="skills-icon">⚙️</div>
                <h3>Languages & Engineering</h3>
                <ul>
                  ${(content.lang || []).map((s, idx) => `<li data-section-id="${sec.id}" data-field="lang" data-index="${idx}">${escapeHTML(s)}</li>`).join('')}
                </ul>
              </div>
              <div class="skills-card glass-card reveal">
                <div class="skills-icon">🛡️</div>
                <h3>Risk & Compliance</h3>
                <ul>
                  ${(content.risk || []).map((s, idx) => `<li data-section-id="${sec.id}" data-field="risk" data-index="${idx}">${escapeHTML(s)}</li>`).join('')}
                </ul>
              </div>
              <div class="skills-card glass-card reveal">
                <div class="skills-icon">🧠</div>
                <h3>AI & Innovation</h3>
                <ul>
                  ${(content.ai || []).map((s, idx) => `<li data-section-id="${sec.id}" data-field="ai" data-index="${idx}">${escapeHTML(s)}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        </section>
      `;
      
    case 'experience':
      return `
        <section id="${sec.id}" class="experience-section">
          <div class="section-container">
            <h2 class="section-title text-center reveal" data-section-id="${sec.id}" data-field="title">${escapeHTML(sec.title || 'Professional Experience')}</h2>
            <p class="section-desc text-center reveal" data-section-id="${sec.id}" data-field="subtitle">${escapeHTML(sec.subtitle || '')}</p>
            <div class="timeline-container">
              ${(content.items || []).map((item, idx) => `
                <div class="timeline-item reveal">
                  <div class="timeline-badge"></div>
                  <div class="timeline-card glass-card">
                    <div class="timeline-header">
                      <span class="timeline-date" data-section-id="${sec.id}" data-field="items.date" data-index="${idx}">${escapeHTML(item.date)}</span>
                      <h3 data-section-id="${sec.id}" data-field="items.role" data-index="${idx}">${escapeHTML(item.role)}</h3>
                      <span class="timeline-company" data-section-id="${sec.id}" data-field="items.company" data-index="${idx}">${escapeHTML(item.company)}</span>
                    </div>
                    <ul class="timeline-details">
                      ${(item.bullets || []).map((b, bIdx) => `<li data-section-id="${sec.id}" data-field="items.bullets" data-index="${idx}" data-bullet-index="${bIdx}">${b}</li>`).join('')}
                    </ul>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </section>
      `;
      
    case 'credentials':
      return `
        <section id="${sec.id}" class="credentials-section">
          <div class="section-container">
            <h2 class="section-title text-center reveal" data-section-id="${sec.id}" data-field="title">${escapeHTML(sec.title || 'Education & Credentials')}</h2>
            <p class="section-desc text-center reveal" data-section-id="${sec.id}" data-field="subtitle">${escapeHTML(sec.subtitle || '')}</p>
            
            <div class="credentials-tabs-container reveal">
              <button class="tab-btn active" data-tab="edu-tab-${sec.id}" data-section-id="${sec.id}" data-field="tab1Title">${escapeHTML(content.tab1Title || 'Academic Journey')}</button>
              <button class="tab-btn" data-tab="cert-tab-${sec.id}" data-section-id="${sec.id}" data-field="tab2Title">${escapeHTML(content.tab2Title || 'Certifications')}</button>
              <button class="tab-btn" data-tab="honors-tab-${sec.id}" data-section-id="${sec.id}" data-field="tab3Title">${escapeHTML(content.tab3Title || 'Honors & Achievements')}</button>
            </div>
 
            <div class="credentials-tab-content-area reveal">
              <div id="edu-tab-${sec.id}" class="tab-content active">
                <div class="edu-timeline">
                  ${(content.eduItems || []).map((item, idx) => `
                    <div class="edu-item glass-card">
                      <span class="edu-period" data-section-id="${sec.id}" data-field="eduItems.period" data-index="${idx}">${escapeHTML(item.period)}</span>
                      <h3 data-section-id="${sec.id}" data-field="eduItems.degree" data-index="${idx}">${escapeHTML(item.degree)}</h3>
                      <span class="edu-school" data-section-id="${sec.id}" data-field="eduItems.school" data-index="${idx}">${escapeHTML(item.school)}</span>
                      <p data-section-id="${sec.id}" data-field="eduItems.description" data-index="${idx}">${escapeHTML(item.description)}</p>
                    </div>
                  `).join('')}
                </div>
              </div>
 
              <div id="cert-tab-${sec.id}" class="tab-content">
                <div class="certifications-showcase">
                  ${(content.certItems || []).map((item, idx) => `
                    <div class="cert-badge-card glass-card">
                      <div class="cert-badge-icon">${item.icon || '🎖️'}</div>
                      <h4 data-section-id="${sec.id}" data-field="certItems.name" data-index="${idx}">${escapeHTML(item.name)}</h4>
                      <span data-section-id="${sec.id}" data-field="certItems.issuer" data-index="${idx}">${escapeHTML(item.issuer)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
 
              <div id="honors-tab-${sec.id}" class="tab-content">
                <div class="honors-grid">
                  ${(content.honorItems || []).map((item, idx) => `
                    <div class="honor-card glass-card">
                      <div class="honor-icon">${item.icon || '🏆'}</div>
                      <div class="honor-text">
                        <h4 data-section-id="${sec.id}" data-field="honorItems.title" data-index="${idx}">${escapeHTML(item.title)}</h4>
                        <p data-section-id="${sec.id}" data-field="honorItems.description" data-index="${idx}">${escapeHTML(item.description)}</p>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        </section>
      `;
      

      
    case 'projects':
      renderDynamicProjectsGrid(); // async populate projects grid
      return `
        <section id="${sec.id}" class="projects-section">
          <div class="section-container">
            <h2 class="section-title text-center reveal" data-section-id="${sec.id}" data-field="title">${escapeHTML(sec.title || 'Featured Projects')}</h2>
            <p class="section-desc text-center reveal" data-section-id="${sec.id}" data-field="subtitle">${escapeHTML(sec.subtitle || 'Key implementations combining engineering precision with statistical models.')}</p>
            <div class="projects-grid" id="projects-grid">
              <!-- Dynamically populated -->
            </div>
          </div>
        </section>
      `;
      
    case 'contact':
      return `
        <section id="${sec.id}" class="contact-section">
          <div class="section-container">
            <div class="contact-grid">
              <div class="contact-info reveal">
                <h2 class="section-title" data-section-id="${sec.id}" data-field="title">${escapeHTML(sec.title || 'Get In Touch')}</h2>
                <p data-section-id="${sec.id}" data-field="description">${escapeHTML(content.description || '')}</p>
                <div class="contact-details">
                  <div class="contact-item">
                    <span class="contact-icon">📧</span>
                    <div>
                      <h4>Email</h4>
                      <a href="mailto:${escapeHTML(content.email)}" data-section-id="${sec.id}" data-field="email">${escapeHTML(content.email)}</a>
                    </div>
                  </div>
                  <div class="contact-item">
                    <span class="contact-icon">📞</span>
                    <div>
                      <h4>Phone</h4>
                      <a href="tel:${escapeHTML(content.phone)}" data-section-id="${sec.id}" data-field="phone">+91 ${escapeHTML(content.phone)}</a>
                    </div>
                  </div>
                  <div class="contact-item">
                    <span class="contact-icon">🤝</span>
                    <div>
                      <h4>Topmate</h4>
                      <a href="${escapeHTML(content.topmate)}" target="_blank" rel="noopener" data-section-id="${sec.id}" data-field="topmate">${escapeHTML(content.topmate ? content.topmate.replace('https://', '') : '')}</a>
                    </div>
                  </div>
                  <div class="contact-item">
                    <span class="contact-icon">📍</span>
                    <div>
                      <h4>Based In</h4>
                      <span data-section-id="${sec.id}" data-field="location">${escapeHTML(content.location)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="contact-form-container reveal">
                <form id="contact-form" class="contact-form glass-card" action="#" method="POST">
                  <div class="form-row">
                    <div class="form-group">
                      <label for="form-name">Name</label>
                      <input type="text" id="form-name" required placeholder="Jane Doe">
                    </div>
                    <div class="form-group">
                      <label for="form-email">Email</label>
                      <input type="email" id="form-email" required placeholder="jane@company.com">
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="form-subject">Subject</label>
                    <input type="text" id="form-subject" required placeholder="Product Risk Consultation">
                  </div>
                  <div class="form-group">
                    <label for="form-message">Message</label>
                    <textarea id="form-message" rows="5" required placeholder="Detail your project or requirements here..."></textarea>
                  </div>
                  <button type="submit" id="form-submit-btn" class="btn-primary form-btn" style="cursor: pointer;">
                    <span>Send Secure Message</span>
                  </button>
                  <div id="form-feedback" class="form-feedback-message"></div>
                </form>
              </div>
            </div>
          </div>
        </section>
      `;
      
    case 'custom':
    default:
      return `
        <section id="${sec.id}" class="experience-section" style="padding: 60px 0;">
          <div class="section-container">
            <h2 class="section-title text-center reveal" data-section-id="${sec.id}" data-field="title">${escapeHTML(sec.title)}</h2>
            ${sec.subtitle ? `<p class="section-desc text-center reveal" data-section-id="${sec.id}" data-field="subtitle">${escapeHTML(sec.subtitle)}</p>` : ''}
            
            ${content.layout === 'cards' ? `
              <div class="projects-grid" style="margin-top: 32px;">
                ${(content.items || []).map((item, idx) => `
                  <div class="project-card glass-card reveal active">
                    <div class="project-content">
                      ${item.icon ? `<div style="font-size: 32px; margin-bottom:12px;">${item.icon}</div>` : ''}
                      <h3 style="margin-bottom: 8px;" data-section-id="${sec.id}" data-field="items.title" data-index="${idx}">${escapeHTML(item.title)}</h3>
                      <p style="color:var(--text-secondary); font-size:14px; line-height:1.5;" data-section-id="${sec.id}" data-field="items.text" data-index="${idx}">${escapeHTML(item.text)}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="glass-card reveal" data-section-id="${sec.id}" data-field="html" style="padding: 40px; margin-top: 32px; border-radius: 20px; line-height: 1.6; color: var(--text-main);">
                ${content.html || ''}
              </div>
            `}
          </div>
        </section>
      `;
  }
}

async function renderDynamicProjectsGrid() {
  const dbProjects = await dbService.getProjects();
  const gridContainer = document.getElementById('projects-grid');
  if (gridContainer && dbProjects.length > 0) {
    gridContainer.innerHTML = '';
    const gradients = [
      'linear-gradient(135deg, var(--accent-color), var(--accent-alt))',
      'linear-gradient(135deg, var(--accent-alt), var(--accent-color))',
      'linear-gradient(135deg, var(--accent-color), #ec4899)',
      'linear-gradient(135deg, #ec4899, var(--accent-alt))'
    ];
    
    dbProjects.forEach((proj, idx) => {
      const primaryTag = proj.primaryTag ? `<span class="project-tag">${proj.primaryTag}</span>` : '';
      const secondaryTag = proj.secondaryTag ? `<span class="project-tag alt-tag">${proj.secondaryTag}</span>` : '';
      
      const metricsHtml = (proj.metric1Val || proj.metric2Val) ? `
        <div class="project-metrics">
          ${proj.metric1Val ? `<div class="proj-metric"><span class="m-val">${proj.metric1Val}</span> <span class="m-lbl">${proj.metric1Lbl}</span></div>` : ''}
          ${proj.metric2Val ? `<div class="proj-metric"><span class="m-val">${proj.metric2Val}</span> <span class="m-lbl">${proj.metric2Lbl}</span></div>` : ''}
        </div>
      ` : '';
      
      const techSpans = proj.tech ? proj.tech.split(',').map(t => `<span>${t.trim()}</span>`).join('') : '';
      const backgroundStyle = proj.image ? `url(${proj.image})` : gradients[idx % gradients.length];
      const isCustomImage = proj.image ? 'background-size: cover; background-position: center;' : '';
      
      const cardHtml = `
        <div class="project-card glass-card reveal active">
          <div class="project-banner" style="background: ${backgroundStyle}; ${isCustomImage} min-height: 140px;">
            ${primaryTag}
            ${secondaryTag}
          </div>
          <div class="project-content" style="display: flex; flex-direction: column; height: calc(100% - 140px); justify-content: space-between;">
            <div>
              <h3 data-project-id="${proj.id}" data-field="title">${proj.title}</h3>
              <p data-project-id="${proj.id}" data-field="description">${proj.description}</p>
              ${metricsHtml}
              <div class="project-tech" data-project-id="${proj.id}" data-field="tech">
                ${techSpans}
              </div>
            </div>
            <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
              <a href="#project-detail-${proj.id}" class="btn-secondary" style="font-size: 12px; padding: 6px 14px; border-radius: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
                <span>View Details</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      `;
      gridContainer.insertAdjacentHTML('beforeend', cardHtml);
    });
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Re-hydrate the homepage when returning from the admin panel or show project detail
window.addEventListener('hashchange', () => {
  if (window.location.hash !== '#admin') {
    if (window.location.hash.startsWith('#project-detail-')) {
      const projId = window.location.hash.replace('#project-detail-', '');
      openProjectDetailModal(projId);
    } else {
      hydrateOrSeedPortfolio().then(() => {
        checkHashAndOpenProjectDetail();
        initVisualEditor();
      });
    }
  } else {
    const existingBar = document.getElementById('visual-editor-toolbar');
    if (existingBar) existingBar.remove();
  }
});

// Initialize dynamic loading and tracking
document.addEventListener('DOMContentLoaded', () => {
  hydrateOrSeedPortfolio().then(() => {
    setTimeout(runTypeEffect, 1000);
    initVisualEditor(); // Run after page hydration
    checkHashAndOpenProjectDetail();
  });
  initVisitorTracking();
});

// ==========================================================================
// VISUAL INLINE EDITOR INTERFACE
// ==========================================================================
async function initVisualEditor() {
  try {
    const user = await dbService.getCurrentUser();
    if (!user) {
      const existingBar = document.getElementById('visual-editor-toolbar');
      if (existingBar) existingBar.remove();
      return;
    }
    
    if (document.getElementById('visual-editor-toolbar')) return;
    
    // Add floating editor bar
    const bar = document.createElement('div');
    bar.id = 'visual-editor-toolbar';
    bar.className = 'visual-editor-bar glass-card';
    bar.innerHTML = `
      <span>🛠️ Visual Editor</span>
      <button id="toggle-edit-mode-btn" class="btn-secondary" style="padding: 8px 16px; border-radius: 20px; font-size:12px; cursor:pointer;">Enable Editing</button>
      <button id="save-inline-edits-btn" class="btn-primary" style="padding: 8px 16px; border-radius: 20px; font-size:12px; cursor:pointer; display:none;">Save Changes</button>
      <a href="#admin" class="btn-secondary" style="padding: 8px 16px; border-radius: 20px; font-size:12px; display:inline-block; text-decoration:none;">Go to Dashboard</a>
    `;
    document.body.appendChild(bar);
    
    let isEditing = false;
    const toggleBtn = document.getElementById('toggle-edit-mode-btn');
    const saveBtn = document.getElementById('save-inline-edits-btn');
    
    toggleBtn.addEventListener('click', () => {
      isEditing = !isEditing;
      if (isEditing) {
        document.body.classList.add('inline-editing-active');
        toggleBtn.textContent = 'Disable Editing';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
        saveBtn.style.display = 'inline-block';
        makeElementsEditable(true);
      } else {
        document.body.classList.remove('inline-editing-active');
        toggleBtn.textContent = 'Enable Editing';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');
        saveBtn.style.display = 'none';
        makeElementsEditable(false);
      }
    });
    
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      try {
        await saveInlineEdits();
        alert("Changes saved successfully!");
        window.location.reload();
      } catch (err) {
        alert("Failed to save inline changes: " + err.message);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    });
  } catch (err) {
    console.error("Failed to initialize visual editor:", err);
  }
}

function makeElementsEditable(active) {
  const elements = document.querySelectorAll('[data-section-id], [data-project-id]');
  elements.forEach(el => {
    if (el.tagName === 'A') {
      if (active) {
        el.setAttribute('data-old-href', el.getAttribute('href') || '');
        el.removeAttribute('href'); // prevent navigation
      } else {
        el.setAttribute('href', el.getAttribute('data-old-href') || '#');
      }
    }
    
    if (active) {
      el.setAttribute('contenteditable', 'true');
      el.classList.add('editable-node');
    } else {
      el.removeAttribute('contenteditable');
      el.classList.remove('editable-node');
    }
  });
}

async function saveInlineEdits() {
  const editableElements = document.querySelectorAll('[data-section-id]');
  const sectionUpdates = {};
  
  for (const el of editableElements) {
    const sectionId = el.getAttribute('data-section-id');
    const field = el.getAttribute('data-field');
    const index = el.getAttribute('data-index');
    const bulletIdx = el.getAttribute('data-bullet-index');
    
    const isBullet = field === 'items.bullets';
    const newText = isBullet ? el.innerHTML.trim() : el.innerText.trim();
    
    if (!sectionUpdates[sectionId]) {
      const sections = await dbService.getSections();
      const sec = sections.find(s => s.id === sectionId);
      if (!sec) continue;
      sectionUpdates[sectionId] = JSON.parse(JSON.stringify(sec));
    }
    
    const sec = sectionUpdates[sectionId];
    if (!sec.content) sec.content = {};
    
    if (field.includes('.')) {
      const parts = field.split('.');
      const arrayName = parts[0];
      const propName = parts[1];
      
      if (!sec.content[arrayName]) sec.content[arrayName] = [];
      const idx = parseInt(index);
      
      if (!sec.content[arrayName][idx]) sec.content[arrayName][idx] = {};
      
      if (bulletIdx !== null && bulletIdx !== undefined) {
        const bIdx = parseInt(bulletIdx);
        if (!sec.content[arrayName][idx][propName]) sec.content[arrayName][idx][propName] = [];
        sec.content[arrayName][idx][propName][bIdx] = newText;
      } else {
        sec.content[arrayName][idx][propName] = newText;
      }
    } else if (field === 'lang' || field === 'risk' || field === 'ai') {
      const idx = parseInt(index);
      if (!sec.content[field]) sec.content[field] = [];
      sec.content[field][idx] = newText;
    } else {
      sec.content[field] = newText;
    }
  }
  
  for (const secId of Object.keys(sectionUpdates)) {
    await dbService.saveSection(sectionUpdates[secId]);
  }
  
  const projectElements = document.querySelectorAll('[data-project-id]');
  const projectUpdates = {};
  for (const el of projectElements) {
    const projId = el.getAttribute('data-project-id');
    const field = el.getAttribute('data-field');
    const newText = field === 'detailHtml' ? el.innerHTML.trim() : el.innerText.trim();
    
    if (!projectUpdates[projId]) {
      const projects = await dbService.getProjects();
      const proj = projects.find(p => p.id === projId);
      if (!proj) continue;
      projectUpdates[projId] = { ...proj };
    }
    
    projectUpdates[projId][field] = newText;
  }
  
  for (const projId of Object.keys(projectUpdates)) {
    await dbService.saveProject(projectUpdates[projId]);
  }
}

async function checkHashAndOpenProjectDetail() {
  const hash = window.location.hash;
  const projectDetailModal = document.getElementById('project-detail-modal');
  if (!projectDetailModal) return;
  
  if (hash.startsWith('#project-detail-')) {
    const projId = hash.replace('#project-detail-', '');
    await openProjectDetailModal(projId);
  } else {
    projectDetailModal.style.display = 'none';
    projectDetailModal.classList.remove('active');
  }
}

async function openProjectDetailModal(projId) {
  const modal = document.getElementById('project-detail-modal');
  if (!modal) return;
  
  try {
    const projects = await dbService.getProjects();
    const proj = projects.find(p => p.id === projId);
    if (!proj) {
      modal.style.display = 'none';
      modal.classList.remove('active');
      return;
    }
    
    // Populate modal fields
    const titleEl = document.getElementById('project-detail-title');
    const tagsContainer = document.getElementById('project-detail-tags');
    const bannerEl = document.getElementById('project-detail-banner');
    const metricsEl = document.getElementById('project-detail-metrics');
    const techEl = document.getElementById('project-detail-tech');
    const bodyEl = document.getElementById('project-detail-body');
    
    if (titleEl) {
      titleEl.innerText = proj.title || 'Untitled Project';
      titleEl.setAttribute('data-project-id', proj.id);
      titleEl.setAttribute('data-field', 'title');
    }
    
    if (tagsContainer) {
      tagsContainer.innerHTML = '';
      if (proj.primaryTag) {
        tagsContainer.innerHTML += `<span class="project-tag">${escapeHTML(proj.primaryTag)}</span>`;
      }
      if (proj.secondaryTag) {
        tagsContainer.innerHTML += `<span class="project-tag alt-tag">${escapeHTML(proj.secondaryTag)}</span>`;
      }
    }
    
    if (bannerEl) {
      const gradients = [
        'linear-gradient(135deg, var(--accent-color), var(--accent-alt))',
        'linear-gradient(135deg, var(--accent-alt), var(--accent-color))',
        'linear-gradient(135deg, var(--accent-color), #ec4899)',
        'linear-gradient(135deg, #ec4899, var(--accent-alt))'
      ];
      const idxNum = parseInt(projId.replace(/[^0-9]/g, '')) || 0;
      let bg = proj.image ? `url(${proj.image})` : gradients[idxNum % gradients.length];
      bannerEl.style.backgroundImage = bg;
      if (proj.image) {
        bannerEl.style.backgroundSize = 'cover';
        bannerEl.style.backgroundPosition = 'center';
      } else {
        bannerEl.style.backgroundSize = '';
        bannerEl.style.backgroundPosition = '';
      }
    }
    
    if (metricsEl) {
      metricsEl.innerHTML = '';
      if (proj.metric1Val || proj.metric2Val) {
        if (proj.metric1Val) {
          metricsEl.innerHTML += `<div class="proj-metric"><span class="m-val">${escapeHTML(proj.metric1Val)}</span> <span class="m-lbl">${escapeHTML(proj.metric1Lbl)}</span></div>`;
        }
        if (proj.metric2Val) {
          metricsEl.innerHTML += `<div class="proj-metric"><span class="m-val">${escapeHTML(proj.metric2Val)}</span> <span class="m-lbl">${escapeHTML(proj.metric2Lbl)}</span></div>`;
        }
      }
    }
    
    if (techEl) {
      techEl.innerHTML = proj.tech ? proj.tech.split(',').map(t => `<span>${escapeHTML(t.trim())}</span>`).join('') : '';
    }
    
    if (bodyEl) {
      bodyEl.innerHTML = proj.detailHtml || '<p style="color:var(--text-secondary); font-style: italic;">No details written yet. Click "Enable Editing" in the visual editor to write about this project.</p>';
      bodyEl.setAttribute('data-project-id', proj.id);
      bodyEl.setAttribute('data-field', 'detailHtml');
    }
    
    // Set up inline editing if currently active
    const isEditing = document.body.classList.contains('inline-editing-active');
    if (isEditing) {
      if (bodyEl) {
        bodyEl.setAttribute('contenteditable', 'true');
        bodyEl.classList.add('editable-node');
      }
      if (titleEl) {
        titleEl.setAttribute('contenteditable', 'true');
        titleEl.classList.add('editable-node');
      }
    } else {
      if (bodyEl) {
        bodyEl.removeAttribute('contenteditable');
        bodyEl.classList.remove('editable-node');
      }
      if (titleEl) {
        titleEl.removeAttribute('contenteditable');
        titleEl.classList.remove('editable-node');
      }
    }
    
    // Wire up close button listeners
    const closeBtn = document.getElementById('close-project-detail-modal');
    if (closeBtn) {
      closeBtn.onclick = () => {
        window.location.hash = '#projects';
      };
    }
    modal.onclick = (e) => {
      if (e.target === modal) {
        window.location.hash = '#projects';
      }
    };
    
    modal.style.display = 'flex';
    modal.classList.add('active');
  } catch (err) {
    console.error("Failed to open project detail modal:", err);
  }
}

// ==========================================================================
// MOBILE MENU TOGGLE
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const headerElement = document.querySelector('.glass-header');

  if (mobileMenuToggle && headerElement) {
    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      headerElement.classList.toggle('mobile-open');
    });
    
    // Close mobile menu when clicking outside of the header
    document.addEventListener('click', (e) => {
      if (!headerElement.contains(e.target)) {
        headerElement.classList.remove('mobile-open');
      }
    });

    // Close menu when clicking on a nav link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        headerElement.classList.remove('mobile-open');
      });
    });
  }
});
