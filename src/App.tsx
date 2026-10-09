import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { BuscaCirurgia } from './pages/BuscaCirurgia';
import { Distribuicao } from './pages/Distribuicao';
import { Opme } from './pages/Opme';
import { Equipamentos } from './pages/Equipamentos';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route element={<MainLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="busca" element={<BuscaCirurgia />} />
          <Route path="distribuicao" element={<Distribuicao />} />
          <Route path="opme" element={<Opme />} />
          <Route path="cc" element={<Equipamentos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;