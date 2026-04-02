import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Splash from './pages/Splash';
import Dashboard from './pages/Dashboard';
import MachineDetail from './pages/MachineDetail';
import OCRScanner from './pages/OCRScanner';
import AddRecord from './pages/AddRecord';
import AddMachine from './pages/AddMachine';
import MachineSelector from './pages/MachineSelector';
import PricePrediction from './pages/PricePrediction';
import MachinePricePrediction from './pages/MachinePricePrediction';
// 정비사 포탈
import MechanicDashboard from './pages/MechanicDashboard';
import MechanicQRScan from './pages/MechanicQRScan';
import MechanicServiceEntry from './pages/MechanicServiceEntry';
import MechanicMachineDetail from './pages/MechanicMachineDetail';

function App() {
  return (
    <Router>
      <Routes>
        {/* 농민용 포탈 */}
        <Route path="/" element={<Splash />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/machine/:id" element={<MachineDetail />} />
        <Route path="/scan" element={<OCRScanner />} />
        <Route path="/machine/:id/add-record" element={<AddRecord />} />
        <Route path="/add-machine" element={<AddMachine />} />
        <Route path="/select-machine" element={<MachineSelector />} />
        <Route path="/price-prediction" element={<PricePrediction />} />
        <Route path="/machine-price-prediction" element={<MachinePricePrediction />} />
        
        {/* 정비사용 포탈 */}
        <Route path="/mechanic/dashboard" element={<MechanicDashboard />} />
        <Route path="/mechanic/qr-scan" element={<MechanicQRScan />} />
        <Route path="/mechanic/machine/:vin" element={<MechanicMachineDetail />} />
        <Route path="/mechanic/service-entry/:vin" element={<MechanicServiceEntry />} />
      </Routes>
    </Router>
  );
}

export default App;