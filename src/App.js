// App.js
const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth <= 768);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

return (
  <div className={`app ${isDarkMode ? 'dark-theme' : ''}`}>
    <Sidebar 
      isOpen={isSidebarOpen} 
      toggle={() => setIsSidebarOpen(!isSidebarOpen)} 
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
      onLogout={handleLogout}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    />
    
    <div 
      className="app-main-wrapper" 
      style={{ 
        // QUAN TRỌNG: Trên mobile luôn là 0 để không bị đẩy màn hình
        marginLeft: isMobile ? '0' : (isSidebarOpen ? '280px' : '80px'),
        transition: 'margin-left 0.3s ease',
        width: '100%',
        position: 'relative'
      }}
    >
      <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <main className="main-content">
        {loading ? <div className="loading-spinner" /> : renderContent()}
      </main>

      {isMobile && <MobileFooter activeTab={activeTab} onTabChange={handleTabChange} />}
    </div>
  </div>
);
