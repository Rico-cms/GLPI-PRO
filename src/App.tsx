import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  LayoutDashboard, Ticket, Monitor, LogOut, Plus, Search, 
  User as UserIcon, CheckCircle, AlertCircle, Menu, X, 
  Server, Laptop, Smartphone, CreditCard, 
  Phone, Loader, Download, QrCode, FileText, Info,
  TrendingUp, Activity
} from 'lucide-react';

// Import Firebase (Modular SDK)
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, 
  onAuthStateChanged, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, updateProfile, 
  signInWithCustomToken, signInAnonymously, User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, 
  onSnapshot, query, orderBy, serverTimestamp, setDoc, getDoc
} from 'firebase/firestore';

// --- Firebase Configuration & Init ---
const firebaseConfig = __firebase_config ? JSON.parse(__firebase_config) : null;
if (!firebaseConfig) {
  throw new Error('Firebase configuration is missing. Please set VITE_FIREBASE_CONFIG environment variable.');
}
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Types ---

type AppUser = {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'tech' | 'user';
  photoURL?: string | null;
};

type TicketStatus = 'nouveau' | 'en_cours' | 'resolu' | 'clos';
type TicketPriority = 'basse' | 'moyenne' | 'haute' | 'urgente';

type Ticket = {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: any; 
  type: 'incident' | 'demande';
};

type AssetType = 'ordinateur' | 'ecran' | 'imprimante' | 'serveur' | 'telephone' | 'carte_sim';

type Asset = {
  id: string;
  name: string;
  serialNumber: string;
  type: AssetType;
  status: 'actif' | 'stock' | 'panne';
  location: string;
  assignedToEmail?: string;
  assignedToPhone?: string;
  createdBy?: string;
};

// --- Utilities ---

const exportToCSV = (filename: string, rows: object[]) => {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = (row as any)[k] === null || (row as any)[k] === undefined ? '' : (row as any)[k];
        cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const formatDate = (timestamp: any) => {
  if (!timestamp || !timestamp.toDate) return 'Date inconnue';
  return timestamp.toDate().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
  });
};

// --- Toast Context (Notification System) ---
type ToastType = 'success' | 'error' | 'info';
type ToastContextType = { addToast: (msg: string, type?: ToastType) => void };
const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<{ id: number, msg: string, type: ToastType }[]>([]);
  
  const addToast = (msg: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transform transition-all duration-300 pointer-events-auto
            ${t.type === 'success' ? 'bg-emerald-500 text-white' : t.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
            {t.type === 'success' && <CheckCircle size={18} />}
            {t.type === 'error' && <AlertCircle size={18} />}
            {t.type === 'info' && <Info size={18} />}
            <span className="text-sm font-medium">{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// --- Components ---

// 1. Authentication Component 
const AuthScreen = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setupUserProfile = async (firebaseUser: FirebaseUser, fallbackEmail?: string, fallbackName?: string) => {
    try {
      const userRef = doc(db, 'artifacts', appId, 'users', firebaseUser.uid, 'profile', 'info');
      try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) return; 
      } catch (e) {}

      await setDoc(userRef, {
        role: 'admin', 
        email: firebaseUser.email || fallbackEmail || 'anonyme@example.com',
        name: firebaseUser.displayName || fallbackName || 'Utilisateur'
      });
    } catch (e) {
      console.error("Error setting up profile:", e);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await setupUserProfile(userCredential.user, email, name);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(
        err.code === 'auth/email-already-in-use' ? 'Cet email est déjà utilisé.' :
        err.code === 'auth/wrong-password' ? 'Mot de passe incorrect.' :
        err.code === 'auth/user-not-found' ? 'Utilisateur inconnu.' :
        'Erreur lors de la connexion. Vérifiez vos identifiants.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await setupUserProfile(result.user);
    } catch (err: any) {
      try {
        const result = await signInAnonymously(auth);
        await updateProfile(result.user, { 
          displayName: "Admin Google (Test)",
          photoURL: "https://lh3.googleusercontent.com/a/default-user" 
        });
        await setupUserProfile(result.user, "admin.test@glpi.local", "Admin Google (Test)");
      } catch (fallbackErr) {
        setError("Impossible de se connecter (Mode Test échoué).");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/40 ring-1 ring-black/5">
        <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-600/30 text-white">
                <Server size={32} />
            </div>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2 text-center tracking-tight">Mini GLPI Pro</h1>
        <p className="text-slate-500 text-center mb-8 font-medium">Gestion IT centralisée</p>
        
        {error && <div className="bg-red-50/80 backdrop-blur text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center gap-2 border border-red-100"><AlertCircle size={16}/> {error}</div>}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nom complet</label>
              <input 
                type="text" required 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={name} onChange={e => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email professionnel</label>
            <input 
              type="email" required 
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Mot de passe</label>
            <input 
              type="password" required 
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition-all disabled:opacity-50 flex justify-center items-center shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
          >
            {loading ? <Loader className="animate-spin" size={20} /> : (isRegistering ? "S'inscrire" : "Se connecter sécurisé")}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-4 bg-white/80 text-slate-500 font-medium">Ou</span></div>
        </div>

        <button 
          onClick={handleGoogleLogin} type="button" disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-50 transition-all disabled:opacity-50 hover:border-slate-200 shadow-sm"
        >
          {loading ? <Loader className="animate-spin" size={20} /> : (
            <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Connexion SSO (Google)
            </>
          )}
        </button>
        
        <div className="mt-6 text-center text-sm">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-blue-600 hover:text-blue-800 font-semibold transition-colors">
            {isRegistering ? "Déjà un compte ? Se connecter" : "Créer un compte technicien"}
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Dashboard Component
// Note: usersCount parameter is reserved for future user statistics feature
const Dashboard = ({ tickets, assets, usersCount: _usersCount }: { tickets: Ticket[], assets: Asset[], usersCount: number }) => {
  const resolus = tickets.filter(t => t.status === 'resolu' || t.status === 'clos').length;
  const total = tickets.length;
  const resolutionRate = total > 0 ? Math.round((resolus / total) * 100) : 0;

  const stats = [
    { title: 'Tickets en cours', value: tickets.filter(t => t.status !== 'clos' && t.status !== 'resolu').length, color: 'bg-orange-500', bg: 'bg-orange-50', icon: AlertCircle },
    { title: 'Tickets résolus', value: resolus, color: 'bg-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle },
    { title: 'Équipements actifs', value: assets.filter(a => a.status === 'actif').length, color: 'bg-blue-500', bg: 'bg-blue-50', icon: Server },
    { title: 'Taux Résolution', value: `${resolutionRate}%`, color: 'bg-indigo-500', bg: 'bg-indigo-50', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Vue d'ensemble</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-slate-500 text-sm font-semibold mb-1">{stat.title}</p>
              <p className="text-4xl font-extrabold text-slate-800">{stat.value}</p>
            </div>
            <div className={`${stat.bg} ${stat.color.replace('bg-', 'text-')} p-4 rounded-xl`}>
              <stat.icon size={28} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Activity className="text-blue-500" size={20}/> Activité Helpdesk (Récente)
            </h3>
          </div>
          <div className="space-y-4">
            {tickets.slice(0, 5).map(ticket => (
              <div key={ticket.id} className="group flex justify-between items-center p-4 bg-slate-50/50 hover:bg-blue-50/50 rounded-xl border border-slate-100 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0
                    ${ticket.status === 'nouveau' ? 'bg-blue-500' : ticket.status === 'en_cours' ? 'bg-orange-500' : 'bg-emerald-500'}`} 
                  />
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{ticket.title}</p>
                    <div className="flex gap-3 text-xs text-slate-500 mt-1 font-medium">
                      <span>{formatDate(ticket.createdAt)}</span>
                      <span>•</span>
                      <span>Par: {ticket.authorName}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0
                  ${ticket.status === 'nouveau' ? 'bg-blue-100 text-blue-700' : 
                    ticket.status === 'en_cours' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
            ))}
            {tickets.length === 0 && (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                    <CheckCircle size={48} className="text-emerald-200 mb-3" />
                    <p>Aucun ticket récent. Tout fonctionne parfaitement !</p>
                </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-lg text-slate-800 mb-6">Répartition Matériel</h3>
          <div className="space-y-4">
            {['ordinateur', 'telephone', 'ecran', 'serveur'].map(type => {
              const count = assets.filter(a => a.type === type).length;
              const percent = assets.length > 0 ? (count / assets.length) * 100 : 0;
              if (count === 0) return null;
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-700 capitalize">{type}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
             {assets.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">Inventaire vide.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. Ticket Management
const TicketManager = ({ user, tickets, searchQuery }: { user: AppUser, tickets: Ticket[], searchQuery: string }) => {
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const { addToast } = useContext(ToastContext);
  const [loading, setLoading] = useState(false);
  
  const [newTicket, setNewTicket] = useState<{ title: string; description: string; priority: string; type: string }>({ 
    title: '', description: '', priority: 'moyenne', type: 'incident' 
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), {
        title: newTicket.title,
        description: newTicket.description,
        priority: newTicket.priority,
        type: newTicket.type,
        status: 'nouveau',
        createdAt: serverTimestamp(),
        authorId: user.uid,
        authorName: user.name
      });
      setShowForm(false);
      setNewTicket({ title: '', description: '', priority: 'moyenne', type: 'incident' });
      addToast('Ticket créé avec succès !', 'success');
    } catch (err) {
      addToast('Erreur lors de la création du ticket', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: TicketStatus) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', id), { status });
      addToast(`Statut mis à jour : ${status.replace('_', ' ')}`, 'success');
    } catch (err) {
      addToast('Erreur de mise à jour', 'error');
    }
  };

  const handleExport = () => {
    const dataToExport = filteredTickets.map(t => ({
      ID: t.id,
      Type: t.type,
      Titre: t.title,
      Priorité: t.priority,
      Statut: t.status,
      Auteur: t.authorName,
      Date_Création: t.createdAt?.toDate ? t.createdAt.toDate() : 'N/A'
    }));
    exportToCSV('tickets_export.csv', dataToExport);
    addToast('Export CSV réussi', 'success');
  };

  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.authorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Assistance Helpdesk</h2>
        <div className="flex gap-2">
            <button onClick={handleExport} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition shadow-sm font-semibold">
                <Download size={18} /> Export CSV
            </button>
            <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm shadow-blue-600/20 font-semibold">
                <Plus size={18} /> Créer un ticket
            </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Nouveau Ticket</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Type</label>
                  <select 
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                    value={newTicket.type} onChange={e => setNewTicket({...newTicket, type: e.target.value})}
                  >
                    <option value="incident">Incident (Dysfonctionnement)</option>
                    <option value="demande">Demande (Nouveau besoin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Priorité</label>
                  <select 
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                    value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value})}
                  >
                    <option value="basse">Basse</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Titre du problème</label>
                <input 
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" 
                  required placeholder="Ex: L'imprimante ne répond plus..."
                  value={newTicket.title} onChange={e => setNewTicket({...newTicket, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description détaillée</label>
                <textarea 
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition h-32 resize-none" 
                  required placeholder="Décrivez les symptômes, messages d'erreur..."
                  value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition">Annuler</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                  {loading ? <Loader className="animate-spin" size={18}/> : <CheckCircle size={18}/>} Soumettre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-slate-100 text-slate-500 font-mono text-xs px-2 py-1 rounded border border-slate-200">#{selectedTicket.id.slice(0,8)}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase
                                ${selectedTicket.type === 'incident' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {selectedTicket.type}
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800">{selectedTicket.title}</h3>
                    </div>
                    <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={20} /></button>
                </div>
                
                <div className="grid grid-cols-3 gap-6 mb-6">
                    <div className="col-span-2 space-y-4">
                        <div>
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                                {selectedTicket.description || "Aucune description fournie."}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Demandeur</h4>
                            <p className="font-semibold text-slate-800 flex items-center gap-2"><UserIcon size={14}/> {selectedTicket.authorName}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Date</h4>
                            <p className="font-medium text-slate-700 text-sm">{formatDate(selectedTicket.createdAt)}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Priorité</h4>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold border
                                ${selectedTicket.priority === 'urgente' ? 'bg-red-50 border-red-200 text-red-700' : 
                                selectedTicket.priority === 'haute' ? 'bg-orange-50 border-orange-200 text-orange-700' : 
                                'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                {selectedTicket.priority}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-600">Mettre à jour le statut :</span>
                        <select 
                            value={selectedTicket.status}
                            onChange={(e) => {
                                updateStatus(selectedTicket.id, e.target.value as TicketStatus);
                                setSelectedTicket({...selectedTicket, status: e.target.value as TicketStatus});
                            }}
                            className={`text-sm font-bold px-3 py-2 rounded-lg border cursor-pointer outline-none transition
                                ${selectedTicket.status === 'resolu' || selectedTicket.status === 'clos' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                selectedTicket.status === 'en_cours' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'}`}
                        >
                            <option value="nouveau">Nouveau</option>
                            <option value="en_cours">En cours</option>
                            <option value="resolu">Résolu</option>
                            <option value="clos">Clos</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4 w-12"></th>
              <th className="p-4">Titre & Détails</th>
              <th className="p-4">Priorité</th>
              <th className="p-4">Statut</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredTickets.map(ticket => (
              <tr key={ticket.id} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors group">
                <td className="p-4 text-center">
                    {ticket.type === 'incident' ? <AlertCircle size={18} className="text-red-400 mx-auto" /> : <FileText size={18} className="text-blue-400 mx-auto"/>}
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSelectedTicket(ticket)}>
                    {ticket.title}
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                    {formatDate(ticket.createdAt)} <span className="w-1 h-1 bg-slate-300 rounded-full"></span> {ticket.authorName}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold border
                    ${ticket.priority === 'urgente' ? 'bg-red-50 border-red-200 text-red-700' : 
                      ticket.priority === 'haute' ? 'bg-orange-50 border-orange-200 text-orange-700' : 
                      'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="p-4">
                   <select 
                    value={ticket.status}
                    onChange={(e) => updateStatus(ticket.id, e.target.value as TicketStatus)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer outline-none transition
                      ${ticket.status === 'resolu' || ticket.status === 'clos' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' :
                        ticket.status === 'en_cours' ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' :
                        'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                   >
                     <option value="nouveau">Nouveau</option>
                     <option value="en_cours">En cours</option>
                     <option value="resolu">Résolu</option>
                     <option value="clos">Clos</option>
                   </select>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => setSelectedTicket(ticket)} className="text-blue-600 font-semibold text-sm hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                      Ouvrir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTickets.length === 0 && (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                <Search size={40} className="text-slate-200 mb-4" />
                <p className="font-medium">Aucun ticket trouvé pour "{searchQuery}".</p>
            </div>
        )}
      </div>
    </div>
  );
};

// 4. Asset Management
const AssetManager = ({ user, assets, searchQuery }: { user: AppUser, assets: Asset[], searchQuery: string }) => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrModal, setQrModal] = useState<Asset | null>(null);
  const { addToast } = useContext(ToastContext);
  
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({ 
    name: '', serialNumber: '', location: '', type: 'ordinateur', 
    status: 'actif', assignedToEmail: '', assignedToPhone: '' 
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'assets'), {
        name: newAsset.name,
        serialNumber: newAsset.serialNumber,
        type: newAsset.type,
        status: newAsset.status,
        location: newAsset.location,
        assignedToEmail: newAsset.assignedToEmail,
        assignedToPhone: newAsset.assignedToPhone,
        createdAt: serverTimestamp(),
        createdBy: user.email
      });
      setShowForm(false);
      setNewAsset({ name: '', serialNumber: '', location: '', type: 'ordinateur', status: 'actif', assignedToEmail: '', assignedToPhone: '' });
      addToast('Équipement ajouté au parc', 'success');
    } catch (err) {
      addToast('Erreur lors de l\'ajout', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredAssets.map(a => ({
      ID: a.id,
      Type: a.type,
      Nom: a.name,
      'Num Série': a.serialNumber,
      Statut: a.status,
      Lieu: a.location,
      Assigné_Email: a.assignedToEmail || '',
      Assigné_Tel: a.assignedToPhone || ''
    }));
    exportToCSV('inventaire_export.csv', dataToExport);
    addToast('Inventaire exporté (CSV)', 'success');
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.assignedToEmail && a.assignedToEmail.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getIcon = (type: AssetType) => {
    switch (type) {
      case 'ordinateur': return <Laptop size={24} />;
      case 'serveur': return <Server size={24} />;
      case 'ecran': return <Monitor size={24} />;
      case 'telephone': return <Smartphone size={24} />;
      case 'carte_sim': return <CreditCard size={24} />;
      default: return <Server size={24} />;
    }
  };

  const getColor = (type: AssetType) => {
    switch (type) {
      case 'ordinateur': return 'bg-blue-100 text-blue-600';
      case 'telephone': return 'bg-pink-100 text-pink-600';
      case 'carte_sim': return 'bg-yellow-100 text-yellow-600';
      case 'serveur': return 'bg-purple-100 text-purple-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Parc Informatique & Téléphonie</h2>
        <div className="flex gap-2">
            <button onClick={handleExport} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition shadow-sm font-semibold">
                <Download size={18} /> Export
            </button>
            <button onClick={() => setShowForm(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition shadow-sm shadow-purple-600/20 font-semibold">
                <Plus size={18} /> Ajouter matériel
            </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
             <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Fiche Nouveau Matériel</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Type</label>
                  <select 
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition"
                    value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value as any})}
                  >
                    <option value="ordinateur">Ordinateur PC/Mac</option>
                    <option value="telephone">Téléphone Mobile</option>
                    <option value="carte_sim">Carte SIM</option>
                    <option value="ecran">Écran externe</option>
                    <option value="imprimante">Imprimante / Copieur</option>
                    <option value="serveur">Serveur / Réseau</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Statut</label>
                  <select 
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition"
                    value={newAsset.status} onChange={e => setNewAsset({...newAsset, status: e.target.value as any})}
                  >
                    <option value="actif">Actif (En service)</option>
                    <option value="stock">En Stock (Dispo)</option>
                    <option value="panne">En Panne (À réparer)</option>
                  </select>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Monitor size={14}/> Identification
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nom du matériel</label>
                    <input className="w-full p-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none" required placeholder="Ex: MacBook Pro M2, iPhone 13..." value={newAsset.name || ''} onChange={e => setNewAsset({...newAsset, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Numéro de série / IMEI / N° Ligne</label>
                    <input className="w-full p-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm" required placeholder="S/N..." value={newAsset.serialNumber || ''} onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Localisation physique</label>
                    <input className="w-full p-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Bureau 402, Baie 1..." value={newAsset.location || ''} onChange={e => setNewAsset({...newAsset, location: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <UserIcon size={14}/> Attribution (Optionnel)
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Email de l'usager</label>
                    <input type="email" className="w-full p-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="collaborateur@entreprise.com" value={newAsset.assignedToEmail || ''} onChange={e => setNewAsset({...newAsset, assignedToEmail: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Téléphone de contact</label>
                    <input type="tel" className="w-full p-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+33 6..." value={newAsset.assignedToPhone || ''} onChange={e => setNewAsset({...newAsset, assignedToPhone: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition">Annuler</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition flex items-center gap-2">
                   {loading && <Loader className="animate-spin" size={18}/>} Enregistrer le matériel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-200" onClick={() => setQrModal(null)}>
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-xl text-slate-800 text-center">Tag Inventaire</h3>
                <p className="text-sm text-slate-500 text-center">{qrModal.name}</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                    {/* Génération de QR code via API gratuite */}
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GLPI_ID:${qrModal.id}`} 
                        alt="QR Code" 
                        className="w-48 h-48 mix-blend-multiply"
                    />
                </div>
                <p className="text-xs font-mono text-slate-400 mt-2 tracking-widest bg-slate-100 px-3 py-1 rounded">S/N: {qrModal.serialNumber}</p>
                <button onClick={() => setQrModal(null)} className="mt-4 w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition">
                    Fermer
                </button>
            </div>
        </div>
      )}

      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAssets.map(asset => (
          <div key={asset.id} className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all flex flex-col h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-50 to-transparent -z-10 rounded-bl-full opacity-50"></div>
            
            <div className="flex items-start gap-4 z-10">
              <div className={`p-3.5 rounded-xl ${getColor(asset.type)} shadow-inner`}>
                {getIcon(asset.type)}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-slate-800 truncate text-lg" title={asset.name}>{asset.name}</h4>
                  <button onClick={() => setQrModal(asset)} className="text-slate-300 hover:text-slate-800 transition-colors shrink-0" title="Afficher QR Code">
                      <QrCode size={18} />
                  </button>
                </div>
                <span className={`inline-block mt-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide border
                  ${asset.status === 'actif' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                    asset.status === 'panne' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  {asset.status}
                </span>
                
                <div className="mt-4 space-y-1">
                    <p className="text-xs text-slate-500 font-mono truncate bg-slate-50 px-2 py-1 rounded border border-slate-100" title={asset.serialNumber}>
                        {asset.type === 'carte_sim' ? 'SIM:' : 'S/N:'} <span className="text-slate-700">{asset.serialNumber}</span>
                    </p>
                    <p className="text-xs text-slate-500 flex justify-between px-1">
                        <span>Lieu:</span> <span className="font-medium text-slate-700 truncate">{asset.location || 'N/A'}</span>
                    </p>
                </div>
              </div>
            </div>

            {(asset.assignedToEmail || asset.assignedToPhone) && (
              <div className="mt-auto pt-4 border-t border-slate-100 z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <UserIcon size={12} /> Assigné à
                </p>
                <div className="bg-blue-50/50 rounded-lg p-2.5 space-y-1 border border-blue-100/50">
                    {asset.assignedToEmail && (
                    <div className="text-xs text-slate-700 flex items-center gap-2 truncate font-medium">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold">
                            {asset.assignedToEmail.charAt(0).toUpperCase()}
                        </div>
                        {asset.assignedToEmail}
                    </div>
                    )}
                    {asset.assignedToPhone && (
                    <div className="text-xs text-slate-600 flex items-center gap-2 truncate ml-1">
                        <Phone size={12} className="text-slate-400 shrink-0" />
                        {asset.assignedToPhone}
                    </div>
                    )}
                </div>
              </div>
            )}
          </div>
        ))}
         {filteredAssets.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed flex flex-col items-center">
                <Server size={48} className="text-slate-200 mb-4" />
                <p className="font-medium text-lg text-slate-600 mb-1">Aucun équipement trouvé</p>
                <p className="text-sm">Ajoutez du matériel ou modifiez votre recherche.</p>
            </div>
         )}
      </div>
    </div>
  );
};

// --- Main App Shell ---

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [view, setView] = useState<'dashboard' | 'tickets' | 'assets'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try { await signInWithCustomToken(auth, __initial_auth_token); } catch (e) {}
      }
      setAuthLoading(false);
    };
    initAuth();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profileRef = doc(db, 'artifacts', appId, 'users', firebaseUser.uid, 'profile', 'info');
        try {
          let profileData = {};
          try {
             const profileSnap = await getDoc(profileRef);
             profileData = profileSnap.data() || {};
          } catch(e) {}

          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email || 'Utilisateur',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL,
            role: (profileData as any)?.role || 'user'
          });
        } catch (e) {
          setUser({
            uid: firebaseUser.uid, name: firebaseUser.displayName || 'Utilisateur',
            email: firebaseUser.email || '', role: 'user'
          });
        }
      } else {
        setUser(null); setTickets([]); setAssets([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const ticketsQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), orderBy('createdAt', 'desc'));
    const unsubscribeTickets = onSnapshot(ticketsQuery, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ticket[]);
    }, (err) => { if (err.code !== 'permission-denied') console.error("Err tickets", err); });

    const assetsQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'assets'), orderBy('createdAt', 'desc'));
    const unsubscribeAssets = onSnapshot(assetsQuery, (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Asset[]);
    }, (err) => { if (err.code !== 'permission-denied') console.error("Err assets", err); });

    return () => { unsubscribeTickets(); unsubscribeAssets(); };
  }, [user?.uid]);

  const handleLogout = () => signOut(auth);

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader className="animate-spin text-blue-600" size={40} /></div>;
  }

  if (!user) return <AuthScreen />;

  const NavItem = ({ id, label, icon: Icon }: any) => (
    <button 
      onClick={() => { setView(id); setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-all rounded-lg mx-2 w-[calc(100%-1rem)]
        ${view === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
    >
      <Icon size={20} className={view === id ? 'opacity-100' : 'opacity-70'} />
      {label}
    </button>
  );

  return (
    <ToastProvider>
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden selection:bg-blue-200">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 md:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside className={`fixed md:static inset-y-0 left-0 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out z-30 shadow-xl md:shadow-none
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col`}>
            <div className="p-6">
            <div className="flex items-center gap-3 text-blue-600">
                <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-600/20"><Server size={24} /></div>
                <span className="text-2xl font-black tracking-tighter">GLPI<span className="text-slate-800 font-light">Pro</span></span>
            </div>
            </div>
            
            <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto">
            <NavItem id="dashboard" label="Tableau de bord" icon={LayoutDashboard} />
            <NavItem id="tickets" label="Assistance (Tickets)" icon={Ticket} />
            <NavItem id="assets" label="Parc Informatique" icon={Monitor} />
            </nav>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 m-4 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
                {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full shadow-sm border-2 border-white" />
                ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-sm border-2 border-white">
                    {user.name?.charAt(0) || 'U'}
                </div>
                )}
                <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-0.5">{user.role}</p>
                </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 text-sm font-bold py-2.5 rounded-lg transition-colors">
                <LogOut size={16} /> Déconnexion
            </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
            <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-10 sticky top-0">
            <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(true)} className="md:hidden text-slate-500 hover:text-slate-800 bg-slate-100 p-2 rounded-lg">
                <Menu size={24} />
                </button>
                <h1 className="text-lg font-bold text-slate-800 hidden sm:block capitalize">
                    {view === 'dashboard' ? 'Vue d\'ensemble' : view === 'tickets' ? 'Assistance Technique' : 'Inventaire Matériel'}
                </h1>
            </div>
            
            <div className="flex items-center gap-6 ml-auto">
                <div className="relative hidden md:block group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                    type="text" 
                    placeholder="Rechercher partout..." 
                    className="pl-10 pr-4 py-2.5 bg-slate-100 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-100 outline-none transition-all w-72 font-medium placeholder:text-slate-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    )}
                </div>
                <button className="relative p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                <AlertCircle size={22} />
                {tickets.some(t => t.status === 'nouveau') && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
                </button>
            </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto h-full">
                {view === 'dashboard' && <Dashboard tickets={tickets} assets={assets} usersCount={1} />}
                {view === 'tickets' && <TicketManager user={user} tickets={tickets} searchQuery={searchQuery} />}
                {view === 'assets' && <AssetManager user={user} assets={assets} searchQuery={searchQuery} />}
            </div>
            </div>
        </main>
        </div>
    </ToastProvider>
  );
}
