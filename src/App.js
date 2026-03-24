// App.js
const isMobile = window.innerWidth <= 768;

return (
  <div className={`app ${isDarkMode ? 'dark-theme' : ''}`}>
    <Sidebar 
      isOpen={isSidebarOpen} 
      toggle={() => setIsSidebarOpen(!isSidebarOpen)} 
      // ... các props khác
    />
    
    <div 
      className="app-main-wrapper" 
      style={{ 
        // Trên máy tính: Đẩy lề trái theo Sidebar
        // Trên điện thoại: Không đẩy lề (lề = 0)
        marginLeft: isMobile ? '0' : (isSidebarOpen ? '280px' : '80px'),
        transition: 'margin-left 0.3s ease',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <main className="main-content">
        {loading ? <div className="loading-spinner"></div> : renderContent()}
      </main>

      {isMobile && <MobileFooter activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  </div>
);
