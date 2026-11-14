import { useState } from 'react';
import BinList from '../components/bins/BinList';
import BinForm from '../components/bins/BinForm';
import QRCodeDisplay from '../components/bins/QRCodeDisplay';
import Modal from '../components/ui/Modal';
import { useBins, useCreateBin, useUpdateBin, useDeleteBin } from '../hooks/useBins';
import type { Bin, BinCreate, BinUpdate } from '../types';

export default function BinManagement() {
  const { data: bins = [], isLoading } = useBins();
  const createBinMutation = useCreateBin();
  const updateBinMutation = useUpdateBin();
  const deleteBinMutation = useDeleteBin();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBin, setEditingBin] = useState<Bin | null>(null);
  const [qrModalBin, setQrModalBin] = useState<Bin | null>(null);

  const handleCreateBin = async (data: BinCreate | BinUpdate) => {
    await createBinMutation.mutateAsync(data as BinCreate);
    setIsAddModalOpen(false);
  };

  const handleUpdateBin = async (data: BinCreate | BinUpdate) => {
    if (!editingBin) return;
    await updateBinMutation.mutateAsync({ id: editingBin.id, bin: data as BinUpdate });
    setEditingBin(null);
  };

  const handleDeleteBin = async (id: number) => {
    await deleteBinMutation.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Campus Bin Management</h1>
        <p className="text-xs text-text-secondary mt-1">
          Configure physical waste collection bins, manage accepted streams, and generate scannable QR signs
        </p>
      </div>

      <BinList
        bins={bins}
        onAddBin={() => setIsAddModalOpen(true)}
        onEditBin={(bin) => setEditingBin(bin)}
        onDeleteBin={handleDeleteBin}
        onViewQr={(bin) => setQrModalBin(bin)}
        isLoading={isLoading}
      />

      {/* Add Bin Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Campus Bin"
      >
        <BinForm
          onSubmit={handleCreateBin}
          onCancel={() => setIsAddModalOpen(false)}
          isSubmitting={createBinMutation.isPending}
        />
      </Modal>

      {/* Edit Bin Modal */}
      <Modal
        isOpen={!!editingBin}
        onClose={() => setEditingBin(null)}
        title={`Edit Bin: ${editingBin?.name ?? ''}`}
      >
        {editingBin && (
          <BinForm
            initialBin={editingBin}
            onSubmit={handleUpdateBin}
            onCancel={() => setEditingBin(null)}
            isSubmitting={updateBinMutation.isPending}
          />
        )}
      </Modal>

      {/* QR Code Viewer Modal */}
      <Modal
        isOpen={!!qrModalBin}
        onClose={() => setQrModalBin(null)}
        title="Bin QR Code Placard"
        maxWidth="max-w-md"
      >
        {qrModalBin && <QRCodeDisplay bin={qrModalBin} />}
      </Modal>
    </div>
  );
}
