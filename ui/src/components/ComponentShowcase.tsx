import React, { useState } from 'react';
import {
  BaseCard,
  BaseButton,
  BaseTable,
  BaseInput,
  BaseModal,
  PageContainer,
  PageHeader
} from './base';
import { Search, Plus } from 'lucide-react';

interface SampleData {
  id: number;
  name: string;
  status: string;
  value: number;
}

const sampleData: SampleData[] = [
  { id: 1, name: 'Item Alpha', status: 'active', value: 42 },
  { id: 2, name: 'Item Beta', status: 'inactive', value: 87 },
  { id: 3, name: 'Item Gamma', status: 'active', value: 156 }
];

/**
 * ComponentShowcase - Demo page for all base components
 * Demonstrates usage of the new design system
 */
export default function ComponentShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'status', header: 'Status' },
    { key: 'value', header: 'Value', align: 'right' as const }
  ];

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="Design System Showcase"
        subtitle="Preview of all base components"
        actions={
          <>
            <BaseButton variant="secondary" size="sm">
              Export
            </BaseButton>
            <BaseButton variant="primary" icon={<Plus size={16} />}>
              Add Item
            </BaseButton>
          </>
        }
      />

      {/* Buttons Section */}
      <BaseCard title="Buttons" subtitle="All button variants and sizes" className="mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 items-center">
            <BaseButton variant="primary">Primary</BaseButton>
            <BaseButton variant="secondary">Secondary</BaseButton>
            <BaseButton variant="danger">Danger</BaseButton>
            <BaseButton variant="ghost">Ghost</BaseButton>
          </div>
          <div className="flex gap-3 items-center">
            <BaseButton size="sm">Small</BaseButton>
            <BaseButton size="md">Medium</BaseButton>
            <BaseButton size="lg">Large</BaseButton>
          </div>
          <div className="flex gap-3 items-center">
            <BaseButton loading>Loading...</BaseButton>
            <BaseButton disabled>Disabled</BaseButton>
            <BaseButton icon={<Search size={16} />}>With Icon</BaseButton>
          </div>
        </div>
      </BaseCard>

      {/* Cards Section */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <BaseCard title="Basic Card">
          <p>This is a standard card with title and content.</p>
        </BaseCard>
        <BaseCard title="Elevated Card" subtitle="With subtitle" elevated>
          <p>This card has elevation and a shadow effect.</p>
        </BaseCard>
      </div>

      {/* Input Section */}
      <BaseCard title="Form Inputs" className="mb-6">
        <div className="flex flex-col gap-4 max-w-md">
          <BaseInput
            label="Email Address"
            type="email"
            placeholder="user@example.com"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            helperText="We'll never share your email"
          />
          <BaseInput
            label="Search"
            icon={<Search size={16} />}
            placeholder="Search items..."
          />
          <BaseInput
            label="Error Example"
            error="This field is required"
            placeholder="Invalid input"
          />
        </div>
      </BaseCard>

      {/* Table Section */}
      <BaseCard title="Data Table" className="mb-6">
        <BaseTable
          data={sampleData}
          columns={columns}
          onRowClick={(row) => console.log('Clicked:', row)}
        />
      </BaseCard>

      {/* Modal Section */}
      <BaseCard title="Modal Dialog">
        <BaseButton onClick={() => setModalOpen(true)}>
          Open Modal
        </BaseButton>

        <BaseModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example Modal"
          size="md"
          footer={
            <>
              <BaseButton variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </BaseButton>
              <BaseButton variant="primary" onClick={() => setModalOpen(false)}>
                Confirm
              </BaseButton>
            </>
          }
        >
          <p>This is a modal dialog with header, body, and footer.</p>
          <p className="mt-4">Press ESC or click the overlay to close.</p>
        </BaseModal>
      </BaseCard>
    </PageContainer>
  );
}
