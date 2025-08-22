# PAPDfleetGoogle
setup to backup and save to google drive.

app would give 404 when refresh on anything other than start page.  Claude.ai instructions:

Claude.ai fixed working github pages with solution 1

Solution 1: Use HashRouter (Easiest)
Replace BrowserRouter with HashRouter in your main routing setup. This uses hash-based routing which works well with GitHub Pages:
typescript// In your main App.tsx or router setup
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/other-page" element={<OtherPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
