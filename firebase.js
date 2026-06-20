// ==========================================================================
// FIREBASE & LOCAL STORAGE DATABASE SERVICE
// ==========================================================================

// Check Vite environment variables
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyD9AVoujqAe77itHQdlWKscRXEuuz01dsA",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "portfolio-5f12d.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "portfolio-5f12d",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "portfolio-5f12d.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "852846969654",
  appId: env.VITE_FIREBASE_APP_ID || "1:852846969654:web:5838392d334504f8efe997",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-FVYYCHPNRV"
};

let dbMode = 'local';
let auth = null;
let db = null;

// Initialize Firebase if config is present and Firebase Compat SDK is loaded
if (firebaseConfig.apiKey && typeof firebase !== 'undefined') {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    dbMode = 'firebase';
    console.log("⚡ Firebase initialized successfully. Running in Cloud Mode.");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase:", error);
    console.log("⚠️ Falling back to Local Storage Mode.");
  }
} else {
  console.log("ℹ️ Running in Local Storage Mode (Firebase credentials missing or SDK not loaded).");
}

// ==========================================================================
// LOCAL STORAGE DATABASE IMPLEMENTATION (MIRRORS FIRESTORE BEHAVIOR)
// ==========================================================================

// Default password hash for local fallback: 'admin123'
const DEFAULT_PASSWORD_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Local helper to read/write JSON
function getLocalItem(key, defaultVal) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultVal;
}

function setLocalItem(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// Session helper for admin authentication state
function getSessionItem(key, defaultVal) {
  const data = sessionStorage.getItem(key);
  return data ? JSON.parse(data) : defaultVal;
}

function setSessionItem(key, val) {
  sessionStorage.setItem(key, JSON.stringify(val));
}

// Local Session Auth state
let localUserSession = getSessionItem('portfolio_local_session', null);

// ==========================================================================
// DATABASE EXPORTS (ROUTED BY dbMode)
// ==========================================================================

export const dbService = {
  getMode() {
    return dbMode;
  },

  // ------------------------------------------------------------------------
  // ABOUT CONTENT
  // ------------------------------------------------------------------------
  async getContent() {
    if (dbMode === 'firebase') {
      const doc = await db.collection('content').doc('about').get();
      return doc.exists ? doc.data() : null;
    } else {
      return getLocalItem('portfolio_content', null);
    }
  },

  async saveContent(contentData) {
    if (dbMode === 'firebase') {
      await db.collection('content').doc('about').set(contentData, { merge: true });
    } else {
      setLocalItem('portfolio_content', contentData);
    }
    return true;
  },

  // ------------------------------------------------------------------------
  // SKILLS
  // ------------------------------------------------------------------------
  async getSkills() {
    if (dbMode === 'firebase') {
      const doc = await db.collection('content').doc('skills').get();
      return doc.exists ? doc.data().list : null;
    } else {
      return getLocalItem('portfolio_skills', null);
    }
  },

  async saveSkills(skillsList) {
    if (dbMode === 'firebase') {
      await db.collection('content').doc('skills').set({ list: skillsList });
    } else {
      setLocalItem('portfolio_skills', skillsList);
    }
    return true;
  },

  // ------------------------------------------------------------------------
  // PROJECTS
  // ------------------------------------------------------------------------
  async getProjects() {
    if (dbMode === 'firebase') {
      const snapshot = await db.collection('projects').orderBy('order', 'asc').get();
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } else {
      const list = getLocalItem('portfolio_projects', []);
      return list.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  },

  async saveProject(project) {
    const projId = project.id || 'proj_' + Date.now();
    const cleanProject = { ...project, id: projId };
    
    if (dbMode === 'firebase') {
      await db.collection('projects').doc(projId).set(cleanProject, { merge: true });
    } else {
      const list = getLocalItem('portfolio_projects', []);
      const idx = list.findIndex(p => p.id === projId);
      if (idx >= 0) {
        list[idx] = cleanProject;
      } else {
        list.push(cleanProject);
      }
      setLocalItem('portfolio_projects', list);
    }
    return cleanProject;
  },

  async deleteProject(projectId) {
    if (dbMode === 'firebase') {
      await db.collection('projects').doc(projectId).delete();
    } else {
      let list = getLocalItem('portfolio_projects', []);
      list = list.filter(p => p.id !== projectId);
      setLocalItem('portfolio_projects', list);
    }
    return true;
  },

  // ------------------------------------------------------------------------
  // CONTACT SUBMISSIONS
  // ------------------------------------------------------------------------
  async getContactSubmissions() {
    if (dbMode === 'firebase') {
      const snapshot = await db.collection('contact_submissions').orderBy('timestamp', 'desc').get();
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } else {
      return getLocalItem('portfolio_contact_submissions', []);
    }
  },

  async logContactSubmission(submission) {
    const logEntry = {
      ...submission,
      timestamp: Date.now(),
      status: 'unread'
    };
    if (dbMode === 'firebase') {
      await db.collection('contact_submissions').add(logEntry);
    } else {
      const list = getLocalItem('portfolio_contact_submissions', []);
      logEntry.id = 'sub_' + Date.now();
      list.unshift(logEntry);
      setLocalItem('portfolio_contact_submissions', list);
    }
    return true;
  },

  async updateContactSubmissionStatus(id, status) {
    if (dbMode === 'firebase') {
      await db.collection('contact_submissions').doc(id).update({ status });
    } else {
      const list = getLocalItem('portfolio_contact_submissions', []);
      const idx = list.findIndex(s => s.id === id);
      if (idx >= 0) {
        list[idx].status = status;
        setLocalItem('portfolio_contact_submissions', list);
      }
    }
    return true;
  },

  // ------------------------------------------------------------------------
  // RESUME DOWNLOADS
  // ------------------------------------------------------------------------
  async getResumeDownloads() {
    if (dbMode === 'firebase') {
      const snapshot = await db.collection('resume_downloads').orderBy('timestamp', 'desc').get();
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } else {
      return getLocalItem('portfolio_resume_downloads', []);
    }
  },

  async logResumeDownload(downloadData) {
    const logEntry = {
      ...downloadData,
      timestamp: Date.now()
    };
    if (dbMode === 'firebase') {
      await db.collection('resume_downloads').add(logEntry);
    } else {
      const list = getLocalItem('portfolio_resume_downloads', []);
      logEntry.id = 'dl_' + Date.now();
      list.unshift(logEntry);
      setLocalItem('portfolio_resume_downloads', list);
    }
    return true;
  },

  // ------------------------------------------------------------------------
  // ANALYTICS & SESSIONS
  // ------------------------------------------------------------------------
  async getSessions() {
    if (dbMode === 'firebase') {
      const snapshot = await db.collection('sessions').orderBy('timestamp', 'desc').get();
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } else {
      return getLocalItem('portfolio_sessions', []);
    }
  },

  async logSession(sessionData) {
    if (dbMode === 'firebase') {
      await db.collection('sessions').doc(sessionData.sessionId).set(sessionData);
    } else {
      const list = getLocalItem('portfolio_sessions', []);
      const idx = list.findIndex(s => s.sessionId === sessionData.sessionId);
      if (idx >= 0) {
        list[idx] = sessionData;
      } else {
        list.unshift(sessionData);
      }
      setLocalItem('portfolio_sessions', list);
    }
    return true;
  },

  async updateSession(sessionId, updates) {
    if (dbMode === 'firebase') {
      await db.collection('sessions').doc(sessionId).update(updates);
    } else {
      const list = getLocalItem('portfolio_sessions', []);
      const idx = list.findIndex(s => s.sessionId === sessionId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates };
        setLocalItem('portfolio_sessions', list);
      }
    }
    return true;
  },

  // ------------------------------------------------------------------------
  // ADMIN AUTHENTICATION
  // ------------------------------------------------------------------------
  async login(email, password) {
    if (dbMode === 'firebase') {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      await this.logLoginHistory({
        email,
        timestamp: Date.now(),
        status: 'success',
        ip: 'Cloud-Geo',
        browser: navigator.userAgent
      });
      return userCredential.user;
    } else {
      // Local Auth verification
      const storedHash = localStorage.getItem('portfolio_admin_password_hash') || DEFAULT_PASSWORD_HASH;
      const inputHash = await sha256(password);
      
      const isEmailMatch = (email.trim().toLowerCase() === 'vimal2017sharma@gmail.com' || email.trim().toLowerCase() === 'admin');
      
      if (isEmailMatch && inputHash === storedHash) {
        localUserSession = {
          email,
          loginTime: Date.now(),
          token: 'local_jwt_' + Math.random().toString(36).substr(2)
        };
        setSessionItem('portfolio_local_session', localUserSession);
        
        await this.logLoginHistory({
          email,
          timestamp: Date.now(),
          status: 'success',
          ip: 'Localhost',
          browser: navigator.userAgent
        });
        
        return localUserSession;
      } else {
        await this.logLoginHistory({
          email,
          timestamp: Date.now(),
          status: 'failed',
          ip: 'Localhost',
          browser: navigator.userAgent
        });
        throw new Error("Invalid username/email or password.");
      }
    }
  },

  async logout() {
    if (dbMode === 'firebase') {
      await auth.signOut();
    } else {
      localUserSession = null;
      sessionStorage.removeItem('portfolio_local_session');
    }
    return true;
  },

  async getCurrentUser() {
    if (dbMode === 'firebase') {
      return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });
    } else {
      // Check if session has expired (30 minutes)
      if (localUserSession) {
        const thirtyMinutes = 30 * 60 * 1000;
        if (Date.now() - localUserSession.loginTime > thirtyMinutes) {
          await this.logout();
          return null;
        }
      }
      return localUserSession;
    }
  },

  async changePassword(newPassword) {
    if (dbMode === 'firebase') {
      const user = auth.currentUser;
      if (user) {
        await user.updatePassword(newPassword);
        return true;
      } else {
        throw new Error("No authenticated admin user found.");
      }
    } else {
      const newHash = await sha256(newPassword);
      localStorage.setItem('portfolio_admin_password_hash', newHash);
      
      // Update local session timestamp
      if (localUserSession) {
        localUserSession.loginTime = Date.now();
        setSessionItem('portfolio_local_session', localUserSession);
      }
      return true;
    }
  },

  // ------------------------------------------------------------------------
  // LOGIN HISTORY
  // ------------------------------------------------------------------------
  async getLoginHistory() {
    if (dbMode === 'firebase') {
      const snapshot = await db.collection('login_history').orderBy('timestamp', 'desc').limit(20).get();
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } else {
      return getLocalItem('portfolio_login_history', []);
    }
  },

  async logLoginHistory(entry) {
    if (dbMode === 'firebase') {
      await db.collection('login_history').add(entry);
    } else {
      const list = getLocalItem('portfolio_login_history', []);
      entry.id = 'lh_' + Date.now();
      list.unshift(entry);
      // Cap login history at 50 logs locally
      if (list.length > 50) list.pop();
      setLocalItem('portfolio_login_history', list);
    }
    return true;
  },

  // ------------------------------------------------------------------------
  // PAGE SECTIONS (PAGE BUILDER CMS)
  // ------------------------------------------------------------------------
  async getSections() {
    if (dbMode === 'firebase') {
      const snapshot = await db.collection('sections').orderBy('order', 'asc').get();
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } else {
      const list = getLocalItem('portfolio_sections', []);
      return list.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  },

  async saveSection(section) {
    const secId = section.id || 'sec_' + Date.now();
    const cleanSection = { ...section, id: secId };
    
    if (dbMode === 'firebase') {
      await db.collection('sections').doc(secId).set(cleanSection, { merge: true });
    } else {
      const list = getLocalItem('portfolio_sections', []);
      const idx = list.findIndex(s => s.id === secId);
      if (idx >= 0) {
        list[idx] = cleanSection;
      } else {
        list.push(cleanSection);
      }
      setLocalItem('portfolio_sections', list);
    }
    return cleanSection;
  },

  async deleteSection(sectionId) {
    if (dbMode === 'firebase') {
      await db.collection('sections').doc(sectionId).delete();
    } else {
      let list = getLocalItem('portfolio_sections', []);
      list = list.filter(s => s.id !== sectionId);
      setLocalItem('portfolio_sections', list);
    }
    return true;
  }
};
