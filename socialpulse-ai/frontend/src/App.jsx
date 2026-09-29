import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { Brain, TrendingUp, Users, MessageCircle, AlertCircle, Camera, Lightbulb, Send, X } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [analytics, setAnalytics] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showConnect, setShowConnect] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Chat Agent State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Graph Timeframe State
  const [trendTimeframe, setTrendTimeframe] = useState('monthly');

  // UI Toast State (simple product-level notification)
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // Check URL for OAuth parameters
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const connectedParam = urlParams.get('connected');

    if (errorParam) {
      showToast("Error connecting account: " + errorParam, 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (connectedParam === 'true') {
      showToast("Successfully connected account!");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const fetchData = async () => {
      try {
        const [analyticsRes, accountsRes] = await Promise.all([
            fetch('http://localhost:8000/api/analytics/overview'),
            fetch('http://localhost:8000/api/accounts/')
        ]);
        const analyticsData = await analyticsRes.json();
        const accountsData = await accountsRes.json();
        
        setAnalytics(analyticsData);
        setAccounts(accountsData.accounts || []);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    setConnecting(true);
    try {
      const res = await fetch('http://localhost:8000/api/accounts/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, platform: 'instagram' })
      });
      if (!res.ok) {
        const err = await res.json();
        showToast('Failed to connect: ' + err.detail, 'error');
      } else {
        showToast('Successfully connected!');
        setShowConnect(false);
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      showToast('Error connecting: ' + err.message, 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
      if(window.confirm("Are you sure you want to disconnect your account?")) {
          showToast("Account disconnected locally.");
          setTimeout(() => window.location.reload(), 1000);
      }
  }

  // Chart Data Formatting
  const getLineChartData = () => {
      if(!analytics?.engagement_overview) return [];
      
      const dataSet = analytics.engagement_overview[trendTimeframe] || { labels: [], likes: [], comments: [] };
      const labels = dataSet.labels || [];
      const likes = dataSet.likes || [];
      const comments = dataSet.comments || [];

      return labels.map((label, idx) => ({
          name: label,
          likes: likes[idx] || 0,
          comments: comments[idx] || 0,
      }));
  };

  const lineChartData = getLineChartData();
  const pieData = analytics?.content_performance || [];

  const getIcon = (iconName) => {
      switch(iconName) {
          case 'trending-up': return <TrendingUp size={20} className="text-primary" />;
          case 'users': return <Users size={20} className="text-primary" />;
          case 'message-circle': return <MessageCircle size={20} className="text-primary" />;
          case 'alert-circle': return <AlertCircle size={20} className="text-red-500" />;
          case 'brain': return <Brain size={16} className="text-indigo-400" />;
          default: return <Lightbulb size={20} className="text-primary" />;
      }
  };

  return (
    <div className="dashboard-container">
      {/* Toast Notification */}
      {toast && (
          <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 10000, background: toast.type === 'error' ? 'var(--card-hover)' : 'rgba(34, 197, 94, 0.9)', color: 'white', padding: '1rem 1.5rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'fadeIn 0.3s ease' }}>
              {toast.type === 'error' ? <AlertCircle size={18} /> : <Brain size={18} />}
              <span>{toast.message}</span>
          </div>
      )}

      {showConnect && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '400px', position: 'relative' }}>
            <button onClick={() => setShowConnect(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            <h2 style={{ marginBottom: '1.5rem' }}>Connect Instagram</h2>
            <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Instagram Username</label>
                <input required value={username} onChange={(e) => setUsername(e.target.value)} type="text" placeholder="e.g. suhan" style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', color: 'white' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Password</label>
                <input required value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', color: 'white' }} />
              </div>
              <button disabled={connecting} type="submit" className="primary-btn" style={{ marginTop: '0.5rem' }}>
                {connecting ? 'Connecting (this takes a few seconds)...' : 'Connect Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-area" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={28} className="text-primary" />
          <span style={{ fontWeight: 700, fontSize: '1.2rem', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SocialPulse AI
          </span>
        </div>
        
        <ul className="nav-menu" style={{ flex: 1, marginTop: '2rem' }}>
          {['Overview', 'Accounts', 'Analytics', 'AI Agent', 'Settings'].map((item) => (
            <li 
              key={item} 
              className={`nav-item ${activeTab === item ? 'active' : ''}`}
              onClick={() => setActiveTab(item)}
            >
              {item}
            </li>
          ))}
        </ul>

        {/* Bottom Sidebar Connection Block */}
        <div style={{ marginTop: 'auto', background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          {accounts.length > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem' }}>
                  <Camera size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{accounts[0].platform.charAt(0).toUpperCase() + accounts[0].platform.slice(1)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }}></span>
                    Connected
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>@{accounts[0].username || accounts[0].platform_account_id}</p>
              <button onClick={handleDisconnect} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}>Disconnect</button>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1.2rem', margin: '0 auto 12px' }}>
                <Camera size={20} />
              </div>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px' }}>No Accounts</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Connect your profile</p>
              <button onClick={() => setShowConnect(true)} style={{ width: '100%', padding: '0.5rem', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: '500' }}>Connect</button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'Overview' && (
          <>
            <header className="header">
              <div>
                <h1>Welcome back! 👋</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Let's grow your Instagram with data-driven insights and AI.</p>
              </div>
              <button className="primary-btn" onClick={() => {
                  setActiveTab('AI Agent');
                  setChatInput("Generate an Instagram post caption about: ");
                  setTimeout(() => document.getElementById('chat-input-field')?.focus(), 100);
              }}>✨ Generate AI Post</button>
            </header>

            <div className="dashboard-layout">
              {/* Left/Center Column */}
              <div className="center-column">
                <div className="stats-grid">
                  <div className="glass-card">
                    <div className="stat-title">Total Posts</div>
                    <div className="stat-value">{loading ? "..." : analytics?.overview_stats?.total_posts?.value || "0"}</div>
                    <div style={{ color: '#22c55e', fontSize: '0.875rem', marginTop: '0.5rem' }}>{analytics?.overview_stats?.total_posts?.growth || "+0%"}</div>
                  </div>
                  <div className="glass-card">
                    <div className="stat-title">Total Engagement</div>
                    <div className="stat-value">{loading ? "..." : analytics?.overview_stats?.total_engagement?.value || "0"}</div>
                    <div style={{ color: '#22c55e', fontSize: '0.875rem', marginTop: '0.5rem' }}>{analytics?.overview_stats?.total_engagement?.growth || "+0%"}</div>
                  </div>
                  <div className="glass-card">
                    <div className="stat-title">Followers</div>
                    <div className="stat-value">{loading ? "..." : analytics?.overview_stats?.followers?.value || "0"}</div>
                    <div style={{ color: '#22c55e', fontSize: '0.875rem', marginTop: '0.5rem' }}>{analytics?.overview_stats?.followers?.growth || "0%"}</div>
                  </div>
                  <div className="glass-card">
                    <div className="stat-title">Avg. Reach</div>
                    <div className="stat-value">{loading ? "..." : analytics?.overview_stats?.avg_reach?.value || "0"}</div>
                    <div style={{ color: '#22c55e', fontSize: '0.875rem', marginTop: '0.5rem' }}>{analytics?.overview_stats?.avg_reach?.growth || "+0%"}</div>
                  </div>
                </div>

                <div className="glass-card" style={{ flex: 1, minHeight: '350px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Engagement Overview</h2>
                    <select value={trendTimeframe} onChange={(e) => setTrendTimeframe(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', color: 'white', outline: 'none' }}>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div style={{ width: '100%', height: '300px' }}>
                    {lineChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={lineChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                            <YAxis stroke="rgba(255,255,255,0.5)" />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                            <Line type="monotone" dataKey="likes" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey="comments" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            No data available
                        </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="glass-card">
                        <h2 style={{ marginBottom: '1.5rem' }}>Audience Insights</h2>
                        <div style={{ height: '220px' }}>
                           {analytics?.audience_insights?.top_locations?.length > 0 ? (
                               <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.audience_insights.top_locations}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="country" stroke="rgba(255,255,255,0.5)" />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        <Bar dataKey="percentage" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                               </ResponsiveContainer>
                           ) : (
                               <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Location data not available via basic API</div>
                           )}
                        </div>
                    </div>
                    <div className="glass-card">
                        <h2 style={{ marginBottom: '1.5rem' }}>Content Performance</h2>
                        <div style={{ height: '220px' }}>
                           {pieData.length > 0 ? (
                               <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    </PieChart>
                               </ResponsiveContainer>
                           ) : (
                               <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>
                           )}
                        </div>
                    </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="right-column">
                <div className="glass-card">
                  <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>✨ AI Insights & Recommendations</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {loading ? <p style={{ color: 'var(--text-muted)' }}>Analyzing your account...</p> : analytics?.ai_insights?.map((insight, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
                        <div style={{ marginTop: '4px' }}>
                            {getIcon(insight.icon)}
                        </div>
                        <div>
                            <h4 style={{ color: 'var(--text)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>{insight.title}</h4>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{insight.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card">
                  <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🧠 Hindsight Memory</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                     {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading memory...</p> : analytics?.hindsight_memory?.map((mem, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '0.75rem', borderBottom: idx !== analytics.hindsight_memory.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {getIcon(mem.icon)}
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: '1.4' }}>{mem.text}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{mem.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass-card">
                  <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>⚡ Quick Actions</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button className="primary-btn" style={{ fontSize: '0.875rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', boxShadow: 'none' }} onClick={() => setShowConnect(true)}>
                      <Camera size={16} /> Connect Account
                    </button>
                    <button className="primary-btn" style={{ fontSize: '0.875rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', boxShadow: 'none' }} onClick={() => setActiveTab('Analytics')}>
                      <TrendingUp size={16} /> View Reports
                    </button>
                    <button className="primary-btn" style={{ fontSize: '0.875rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', boxShadow: 'none' }} onClick={() => {
                        setActiveTab('AI Agent');
                        setChatInput("Give me a quick short social media tip.");
                        setTimeout(() => document.getElementById('ai-chat-send')?.click(), 100);
                    }}>
                      <Lightbulb size={16} /> Quick Tip
                    </button>
                    <button className="primary-btn" style={{ fontSize: '0.875rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', boxShadow: 'none' }} onClick={() => setActiveTab('Settings')}>
                      <AlertCircle size={16} /> Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'Accounts' && (
          <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Connected Accounts</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Manage your Instagram and Meta accounts here.</p>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
                {accounts.length > 0 ? accounts.map(acc => (
                    <div key={acc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                             <div style={{ width: '48px', height: '48px', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                <Camera size={24} />
                             </div>
                             <div>
                                 <h3 style={{ fontSize: '1.1rem' }}>@{acc.username}</h3>
                                 <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{acc.platform.charAt(0).toUpperCase() + acc.platform.slice(1)} Account</p>
                             </div>
                        </div>
                        <button className="primary-btn" onClick={handleDisconnect} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', boxShadow: 'none' }}>
                            Disconnect
                        </button>
                    </div>
                )) : (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                         <Camera size={48} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                         <h3 style={{ marginBottom: '0.5rem' }}>No accounts connected</h3>
                         <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Connect an account to start analyzing data.</p>
                         <button className="primary-btn" onClick={() => setShowConnect(true)}>Connect Account</button>
                    </div>
                )}
            </div>
          </div>
        )}

        {activeTab === 'Analytics' && (
          <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem' }}>Detailed Analytics</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Deep dive into your audience and content performance.</p>
              </div>
              <select value={trendTimeframe} onChange={(e) => setTrendTimeframe(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', color: 'white', outline: 'none' }}>
                  <option value="monthly">Monthly View</option>
                  <option value="yearly">Yearly View</option>
              </select>
            </div>
            
            <div style={{ height: '400px', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Engagement Trend</h3>
                {lineChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                        <YAxis stroke="rgba(255,255,255,0.5)" />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="likes" stroke="#6366f1" strokeWidth={3} />
                        <Line type="monotone" dataKey="comments" stroke="#a855f7" strokeWidth={3} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>
                )}
            </div>
          </div>
        )}

        {activeTab === 'AI Agent' && (
          <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '80vh', maxHeight: '800px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>AI Agent Chat</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Interact with the SocialPulse Agent directly.</p>
            
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1rem' }}>
                {chatMessages.length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center' }}>
                        <Brain size={48} className="text-primary" style={{ margin: '0 auto 1rem' }} />
                        <h3 style={{ marginBottom: '1rem' }}>Ask me anything about your account!</h3>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>I have access to your Hindsight memory, recent posts, and engagement data.</p>
                    </div>
                ) : (
                    chatMessages.map((msg, idx) => (
                        <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(255,255,255,0.05)', padding: '1rem 1.5rem', borderRadius: '16px', borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px', borderBottomLeftRadius: msg.role === 'agent' ? '4px' : '16px', maxWidth: '80%', color: 'white', whiteSpace: 'pre-wrap', lineHeight: '1.5', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                            {msg.content}
                        </div>
                    ))
                )}
                {isTyping && (
                    <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '1rem 1.5rem', borderRadius: '16px', borderBottomLeftRadius: '4px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Brain size={16} /> Agent is thinking...
                    </div>
                )}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
                <input id="chat-input-field" type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="e.g. Draft a post about summer..." style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', outline: 'none' }} onKeyDown={(e) => {
                    if(e.key === 'Enter') document.getElementById('ai-chat-send').click();
                }} />
                <button id="ai-chat-send" className="primary-btn" disabled={isTyping || !chatInput.trim()} onClick={async () => {
                    if(!chatInput.trim()) return;
                    const userMsg = chatInput;
                    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
                    setChatInput('');
                    setIsTyping(true);
                    try {
                        const res = await fetch('http://localhost:8000/api/agent/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt: userMsg, account_id: accounts[0]?.platform_account_id })
                        });
                        const data = await res.json();
                        setChatMessages(prev => [...prev, { role: 'agent', content: res.ok ? data.reply : (data.detail || 'Failed to fetch response') }]);
                    } catch (err) {
                        setChatMessages(prev => [...prev, { role: 'agent', content: 'Error: Could not connect to the agent.' }]);
                    } finally {
                        setIsTyping(false);
                    }
                }} style={{ padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Send size={18} />
                </button>
            </div>
          </div>
        )}

        {activeTab === 'Settings' && (
          <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Account Settings</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Update your preferences and API keys.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Display Name</label>
                    <input type="text" value="Suhan" readOnly style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '6px', color: 'white' }} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Theme</label>
                    <select style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '6px', color: 'white' }}>
                        <option>Dark Mode (Default)</option>
                        <option>Light Mode</option>
                    </select>
                </div>
                <button className="primary-btn" style={{ alignSelf: 'flex-start' }} onClick={() => showToast("Settings saved successfully!")}>Save Changes</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
