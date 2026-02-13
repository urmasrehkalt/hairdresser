import Layout from "./components/Layout";
import BookingPage from "./pages/BookingPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <Layout>
      <BookingPage />
      <AdminPage />
    </Layout>
  );
}
