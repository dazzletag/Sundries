import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import DashboardPage from "./pages/Dashboard";
import ResidentsPage from "./pages/Residents";
import VisitsPage from "./pages/Visits";
import VisitsPrintPage from "./pages/VisitsPrint";
import ProvidersPage from "./pages/Providers";
import InvoicesPage from "./pages/Invoices";
import SuppliersPage from "./pages/Suppliers";
import ConsentsPage from "./pages/Consents";
import AdminPage from "./pages/Admin";
import VendorsPage from "./pages/Vendors";
import PricesPage from "./pages/Prices";
import SalesPage from "./pages/Sales";
import NewspapersPage from "./pages/Newspapers";
import { SnackbarProvider } from "notistack";

function App() {
  return (
    <SnackbarProvider maxSnack={3} preventDuplicate>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/residents" element={<ResidentsPage />} />
            <Route path="/consents" element={<ConsentsPage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/prices" element={<PricesPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/newspapers" element={<NewspapersPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/visits" element={<VisitsPage />} />
            <Route path="/visits/print" element={<VisitsPrintPage />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </SnackbarProvider>
  );
}

export default App;



