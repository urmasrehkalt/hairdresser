import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import BookingPage from "./pages/BookingPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<BookingPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
