import { Routes, Route } from "react-router-dom";
import QuoteBuilder from "./QuoteBuilder.jsx";

export default function App() {
  return (
    <Routes>
      {/* WordPress path → always load QuoteList */}
      <Route path="*" element={<QuoteBuilder />} />

      {/* Optional internal SPA routes */}
      <Route path="/" element={<QuoteBuilder />} />
    </Routes>
  );
}