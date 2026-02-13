export default function Layout({ children }) {
  return (
    <div className="page">
      <header className="site-header">
        <div className="site-header-inner">
          <h1 className="site-logo">Salon 15</h1>
          <nav className="site-nav">
            <span>Juuksurisalongi iseteenindus</span>
          </nav>
        </div>
      </header>
      <main className="content">{children}</main>
      <footer className="site-footer">
        <p>&copy; 2026 Salon 15 &middot; Tööaeg E–R 09:00–18:00</p>
      </footer>
    </div>
  );
}
