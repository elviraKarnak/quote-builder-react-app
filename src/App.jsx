import { Routes, Route } from "react-router-dom";
import QuoteList from "./QuoteList";

export default function App() {
  return (
    <Routes>
      {/* WordPress path → always load QuoteList */}
      <Route path="*" element={<QuoteList />} />

      {/* Optional internal SPA routes */}
      <Route path="/" element={<QuoteList />} />
      <Route path="/quote/:id" element={<h2>Quote Details Coming Soon</h2>} />
    </Routes>
  );
}