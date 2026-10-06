import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  title = 'Confirm Deletion',
  message = 'Are you sure you want to delete this data? This action cannot be undone.',
  itemName,
  confirmText = 'Yes, Delete',
  cancelText = 'No, Cancel',
  onConfirm,
  onCancel
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay-backdrop confirm-dialog-backdrop">
      <div className="glass-panel confirm-modal-card">
        
        {/* Header Icon */}
        <div className="confirm-modal-icon-wrap">
          <div className="confirm-modal-icon-badge">
            <AlertTriangle size={26} />
          </div>
        </div>

        {/* Content */}
        <div className="confirm-modal-body">
          <h3 className="confirm-modal-title">{title}</h3>
          <p className="confirm-modal-message">{message}</p>
          {itemName && (
            <div className="confirm-modal-item-preview">
              "{itemName}"
            </div>
          )}
        </div>

        {/* Action Buttons: Yes / No */}
        <div className="confirm-modal-actions-row">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary confirm-btn-no"
            autoFocus
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-danger-solid confirm-btn-yes"
          >
            <Trash2 size={16} />
            <span>{confirmText}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
