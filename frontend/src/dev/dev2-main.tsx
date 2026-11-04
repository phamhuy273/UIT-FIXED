import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/main-layout';
import { queryClient } from '@/lib/query-client';
import { FoundationPage } from './foundation-page';
import { ComponentShowcase } from './component-showcase';
import '@/styles/foundation.css';
import './dev2.css';

const navigation = [
  { id: 'locations', label: 'Địa điểm & danh mục', icon: '▦' },
  { id: 'components', label: 'Thư viện giao diện', icon: '◇' },
];

export function Dev2Preview() {
  const [activeItem, setActiveItem] = useState('locations');
  return <MainLayout title={`Dev 2 Preview / ${navigation.find((item) => item.id === activeItem)?.label ?? ''}`}
    items={navigation} activeItem={activeItem} onNavigate={setActiveItem}>
    {activeItem === 'locations' ? <FoundationPage /> : <ComponentShowcase />}
  </MainLayout>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><QueryClientProvider client={queryClient}><Dev2Preview /></QueryClientProvider></StrictMode>,
);
