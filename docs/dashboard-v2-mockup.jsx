import { useState } from "react";

const COLORS = {
  bg: "#F8F9FB",
  card: "#FFFFFF",
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  accent: "#10B981",
  accentLight: "#ECFDF5",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray700: "#374151",
  gray900: "#111827",
  orangeLight: "#FFF7ED",
};

const nextPosts = [
  { id: 1, title: "L'IA au service des TPE : 3 outils concrets", date: "Mar 4 mars", time: "9h00", status: "waiting", program: "Thought Leadership" },
  { id: 2, title: "Pourquoi 80% des TPE négligent LinkedIn", date: "Jeu 6 mars", time: "9h00", status: "draft", program: "Thought Leadership" },
  { id: 3, title: "Retour client : comment Dupont Conseil a doublé ses leads", date: "Mar 11 mars", time: "9h00", status: "waiting", program: "Témoignages clients" },
];

const StatusBadge = ({ status }) => {
  const map = {
    waiting: { label: "À rédiger", bg: COLORS.warningLight, color: COLORS.warning },
    draft: { label: "Brouillon", bg: "#FEF3C7", color: "#D97706" },
    approved: { label: "Validé", bg: COLORS.accentLight, color: COLORS.accent },
    published: { label: "Publié", bg: COLORS.primaryLight, color: COLORS.primary },
  };
  const s = map[status] || map.waiting;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 20, background: s.bg, color: s.color, fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
};

const KPICard = ({ label, value, sub, trend }) => (
  <div style={{
    background: COLORS.card, borderRadius: 12, padding: "18px 22px", flex: 1, minWidth: 0,
    border: `1px solid ${COLORS.gray200}`,
  }}>
    <div style={{ fontSize: 13, color: COLORS.gray500, fontWeight: 500, marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 30, fontWeight: 700, color: COLORS.gray900, letterSpacing: -1 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: COLORS.gray400, marginTop: 4 }}>{sub}</div>}
    {trend && (
      <div style={{ fontSize: 12, color: trend > 0 ? COLORS.accent : COLORS.gray400, marginTop: 4, fontWeight: 600 }}>
        {trend > 0 ? `↑ +${trend}%` : "→ stable"} vs mois dernier
      </div>
    )}
  </div>
);

const QuickAction = ({ icon, label, desc, onClick, primary }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
      background: primary ? COLORS.primary : COLORS.card,
      border: primary ? "none" : `1px solid ${COLORS.gray200}`,
      borderRadius: 12, cursor: "pointer", width: "100%", textAlign: "left",
      transition: "all 0.15s ease",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
  >
    <div style={{
      width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
      background: primary ? "rgba(255,255,255,0.2)" : COLORS.gray100, fontSize: 17, flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: primary ? "#fff" : COLORS.gray900 }}>{label}</div>
      <div style={{ fontSize: 12, color: primary ? "rgba(255,255,255,0.7)" : COLORS.gray400, marginTop: 1 }}>{desc}</div>
    </div>
  </button>
);

export default function Dashboard() {
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", text: "Bonjour Chris ! Vous avez 2 posts à rédiger cette semaine. On s'y met ?" }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [showChat, setShowChat] = useState(false);

  const sendMessage = () => {
    if (!inputVal.trim()) return;
    setChatMessages(prev => [...prev, { role: "user", text: inputVal }]);
    setInputVal("");
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: "assistant",
        text: "Super idée ! Pour une campagne de 4 semaines sur la transformation digitale des TPE, je vous propose 2 posts/semaine.\n\nSemaine 1 — Le constat\n• \"80% des TPE n'ont pas de stratégie digitale\"\n• \"Mon client a perdu 30% de CA en ignorant LinkedIn\"\n\nVoulez-vous que je détaille les semaines suivantes ?"
      }]);
    }, 1200);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: COLORS.bg }}>
      
      {/* ====== SIDEBAR — copie fidèle de l'existant ====== */}
      <aside style={{
        width: 230, background: COLORS.card, borderRight: `1px solid ${COLORS.gray200}`,
        padding: "20px 14px", display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingLeft: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>in</span>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.gray900 }}>PostPilot</span>
        </div>

        <button style={{
          width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
          background: COLORS.primary, color: "#fff", fontWeight: 600, fontSize: 14,
          cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          ✏️ Rédiger un post
        </button>

        {[
          { icon: "📊", label: "Tableau de bord", active: true },
          { icon: "📅", label: "Calendrier" },
          { icon: "📋", label: "Programmes" },
          { icon: "📈", label: "Analytics" },
        ].map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8,
            background: item.active ? COLORS.primaryLight : "transparent",
            color: item.active ? COLORS.primary : COLORS.gray500,
            fontWeight: item.active ? 600 : 400, fontSize: 14, cursor: "pointer", marginBottom: 2,
          }}>
            <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{item.icon}</span> {item.label}
          </div>
        ))}

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: `1px solid ${COLORS.gray200}`, paddingTop: 14 }}>
          <div style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.gray700 }}>Rocket Solution</span>
            <span style={{ fontSize: 11, background: COLORS.primaryLight, color: COLORS.primary, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>Starter</span>
          </div>
          {[
            { icon: "⚙️", label: "Paramètres" },
            { icon: "🚪", label: "Déconnexion" },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8,
              color: COLORS.gray500, fontSize: 14, cursor: "pointer",
            }}>
              <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{item.icon}</span> {item.label}
            </div>
          ))}
          <div style={{ fontSize: 11, color: COLORS.gray400, padding: "8px 12px 0" }}>mesquita.christopher@gmail.com</div>
        </div>
      </aside>

      {/* ====== MAIN ====== */}
      <main style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>
        
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.gray900, margin: 0 }}>Tableau de bord</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.gray100, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>🔔</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 12 }}>ME</div>
              <span style={{ fontSize: 13, color: COLORS.gray700 }}>mesquita.christo...</span>
            </div>
          </div>
        </div>

        {/* Company */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.gray900 }}>Rocket Solution</div>
          <div style={{ fontSize: 13, color: COLORS.gray400 }}>Assistant de communication LinkedIn</div>
        </div>

        {/* KPIs — propres, sans icônes */}
        <div style={{ display: "flex", gap: 14, marginBottom: 26 }}>
          <KPICard label="Publiés ce mois" value="0" sub="sur 8 disponibles" />
          <KPICard label="À rédiger" value="2" sub="cette semaine" />
          <KPICard label="Vues LinkedIn" value="—" sub="aucune donnée encore" />
          <KPICard label="Engagement" value="—" sub="aucune donnée encore" />
        </div>

        {/* 2 colonnes : Actions + Prochains posts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginBottom: 26 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gray900, marginBottom: 10 }}>Actions rapides</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <QuickAction icon="💬" label="Parler à mon assistant" desc="Planifier une campagne, préparer un post, avoir des idées..." onClick={() => setShowChat(true)} primary />
              <QuickAction icon="✍️" label="Rédiger un post maintenant" desc="À partir d'une idée, d'un article ou d'un document" />
              <QuickAction icon="📋" label="Créer un programme" desc="Planifier plusieurs semaines de publications" onClick={() => setShowChat(true)} />
              <QuickAction icon="🔗" label="Connecter LinkedIn" desc="Activer la publication automatique" />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gray900 }}>Prochains posts</div>
              <span style={{ fontSize: 13, color: COLORS.primary, cursor: "pointer", fontWeight: 500 }}>Voir le calendrier →</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {nextPosts.map(post => (
                <div key={post.id} style={{
                  background: COLORS.card, border: `1px solid ${COLORS.gray200}`, borderRadius: 12,
                  padding: "12px 16px", cursor: "pointer", transition: "all 0.15s ease",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.gray200; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.gray900, lineHeight: 1.4, flex: 1, marginRight: 10 }}>{post.title}</div>
                    <StatusBadge status={post.status} />
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.gray400 }}>
                    {post.date} · {post.time} — {post.program}
                  </div>
                </div>
              ))}
              <div style={{
                padding: "10px 16px", borderRadius: 12, border: `1px dashed ${COLORS.gray300}`,
                textAlign: "center", color: COLORS.gray400, fontSize: 13, cursor: "pointer",
              }}>
                + Ajouter un post hors programme
              </div>
            </div>
          </div>
        </div>

        {/* Programmes */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gray900 }}>Mes programmes</div>
            <span style={{ fontSize: 13, color: COLORS.primary, cursor: "pointer", fontWeight: 500 }}>Voir tout →</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.gray200}`, borderRadius: 14, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.accent }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.gray900 }}>Thought Leadership</span>
              </div>
              <div style={{ fontSize: 12, color: COLORS.gray500, marginBottom: 10 }}>2 posts/sem · 4 semaines</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: COLORS.gray400 }}>2/8 publiés</span>
                <span style={{ color: COLORS.accent, fontWeight: 600 }}>25%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: COLORS.gray100, marginTop: 8 }}>
                <div style={{ width: "25%", height: "100%", borderRadius: 2, background: COLORS.accent }} />
              </div>
            </div>

            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.gray200}`, borderRadius: 14, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.primary }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.gray900 }}>Témoignages clients</span>
              </div>
              <div style={{ fontSize: 12, color: COLORS.gray500, marginBottom: 10 }}>1 post/sem · 6 semaines</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: COLORS.gray400 }}>0/6 publiés</span>
                <span style={{ color: COLORS.gray400 }}>0%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: COLORS.gray100, marginTop: 8 }}>
                <div style={{ width: "0%", height: "100%", borderRadius: 2, background: COLORS.primary }} />
              </div>
            </div>

            <div
              onClick={() => setShowChat(true)}
              style={{
                border: `1.5px dashed ${COLORS.gray300}`, borderRadius: 14, padding: "16px",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "pointer", background: COLORS.gray50, minHeight: 100,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.background = COLORS.primaryLight; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.gray300; e.currentTarget.style.background = COLORS.gray50; }}
            >
              <div style={{ fontSize: 22, marginBottom: 4, color: COLORS.gray400 }}>+</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.gray700 }}>Nouveau programme</div>
              <div style={{ fontSize: 11, color: COLORS.gray400, marginTop: 2 }}>via l'assistant IA</div>
            </div>
          </div>
        </div>
      </main>

      {/* ====== CHAT DRAWER ====== */}
      {showChat && (
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
          background: COLORS.card, borderLeft: `1px solid ${COLORS.gray200}`,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column",
          zIndex: 100, animation: "slideIn 0.25s ease",
        }}>
          <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
          
          <div style={{
            padding: "18px 22px", borderBottom: `1px solid ${COLORS.gray200}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.gray900 }}>Assistant PostPilot</div>
              <div style={{ fontSize: 12, color: COLORS.gray400 }}>Votre copilote LinkedIn</div>
            </div>
            <button onClick={() => setShowChat(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: COLORS.gray400 }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%", padding: "12px 16px", borderRadius: 14,
                  background: msg.role === "user" ? COLORS.primary : COLORS.gray100,
                  color: msg.role === "user" ? "#fff" : COLORS.gray700,
                  fontSize: 13, lineHeight: 1.6,
                  borderBottomRightRadius: msg.role === "user" ? 4 : 14,
                  borderBottomLeftRadius: msg.role === "assistant" ? 4 : 14,
                  whiteSpace: "pre-line",
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {chatMessages.length === 1 && (
            <div style={{ padding: "0 22px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Créer un programme de 4 semaines", "Une idée de post pour demain", "Analyser mes performances"].map((s, i) => (
                <button key={i} onClick={() => {
                  setChatMessages(prev => [...prev, { role: "user", text: s }]);
                  setTimeout(() => {
                    setChatMessages(prev => [...prev, {
                      role: "assistant",
                      text: "Super idée ! Pour une campagne de 4 semaines sur la transformation digitale des TPE, je vous propose 2 posts/semaine.\n\nSemaine 1 — Le constat\n• \"80% des TPE n'ont pas de stratégie digitale\"\n• \"Mon client a perdu 30% de CA en ignorant LinkedIn\"\n\nVoulez-vous que je détaille les semaines suivantes ?"
                    }]);
                  }, 1200);
                }} style={{
                  padding: "7px 12px", borderRadius: 20, border: `1px solid ${COLORS.gray200}`,
                  background: COLORS.card, fontSize: 12, color: COLORS.gray700, cursor: "pointer",
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div style={{ padding: "14px 22px", borderTop: `1px solid ${COLORS.gray200}` }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, background: COLORS.gray50,
              borderRadius: 12, padding: "4px 4px 4px 14px", border: `1px solid ${COLORS.gray200}`,
            }}>
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Votre message..."
                style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 13, color: COLORS.gray700, padding: "9px 0" }}
              />
              <button
                onClick={sendMessage}
                style={{
                  width: 36, height: 36, borderRadius: 9, border: "none",
                  background: inputVal.trim() ? COLORS.primary : COLORS.gray200,
                  color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                }}
              >➤</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
