import React, { useState } from 'react';
import { BakeryProvider } from './context/BakeryContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Recipes } from './pages/Recipes';
import { Orders } from './pages/Orders';
import { Production } from './pages/Production';
import { Customers } from './pages/Customers';
import { Reports } from './pages/Reports';
import { Database } from './pages/Database';
import { AiAssistant } from './pages/AiAssistant';
import { Receivables } from './pages/Receivables';
import { TopperDesigner } from './pages/TopperDesigner';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory />;
      case 'recipes': return <Recipes />;
      case 'orders': return <Orders />;
      case 'production': return <Production />;
      case 'customers': return <Customers />;
      case 'receivables': return <Receivables />;
      case 'toppers': return <TopperDesigner />;
      case 'reports': return <Reports />;
      case 'database': return <Database />;
      case 'ai-assistant': return <AiAssistant />;
      default: return <Dashboard />;
    }
  };

  return (
    <BakeryProvider>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>
    </BakeryProvider>
  );
};

export default App;