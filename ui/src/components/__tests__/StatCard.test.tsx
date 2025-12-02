import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatCard from '../StatCard';
import { Activity } from 'lucide-react';

describe('StatCard Component', () => {
  it('renders title and value correctly', () => {
    render(
      <StatCard 
        title="Total Events" 
        value="1,234" 
        trend="+5%"
        trendUp={true}
        icon={Activity} 
        color="blue" 
      />
    );
    
    expect(screen.getByText('Total Events')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders positive trend correctly', () => {
    render(
      <StatCard 
        title="Stats" 
        value="100" 
        trend="+10%" 
        trendUp={true} 
        icon={Activity} 
        color="emerald" 
      />
    );
    
    expect(screen.getByText('+10%')).toBeInTheDocument();
    expect(screen.getByText('+10%')).toHaveClass('text-green-400');
  });

  it('renders negative trend correctly', () => {
    render(
      <StatCard 
        title="Stats" 
        value="100" 
        trend="-5%" 
        trendUp={false} 
        icon={Activity} 
        color="red" 
      />
    );
    
    expect(screen.getByText('-5%')).toBeInTheDocument();
    expect(screen.getByText('-5%')).toHaveClass('text-red-400');
  });
});
