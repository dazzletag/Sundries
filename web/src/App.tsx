import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ResidentsPage from "./pages/Residents";
import VisitsPage from "./pages/Visits";
import VisitsPrintPage from "./pages/VisitsPrint";
import InvoicesPage from "./pages/Invoices";
import ConsentsPage from "./pages/Consents";
import AdminPage from "./pages/Admin";
import VendorsPage from "./pages/Vendors";
import PricesPage from "./pages/Prices";
import MiscExpensesPage from "./pages/MiscExpenses";
import { SnackbarProvider } from "notistack";

function App() {
  return (
    <SnackbarProvider maxSnack={3} preventDuplicate>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/residents" element={<ResidentsPage />} />
            <Route path="/consents" element={<ConsentsPage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/prices" element={<PricesPage />} />
            <Route path="/misc-expenses" element={<MiscExpensesPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/visits" element={<VisitsPage />} />
            <Route path="/visits/print" element={<VisitsPrintPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </SnackbarProvider>
  );
}

export default App;



