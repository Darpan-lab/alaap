import React, { createContext, useContext, useState } from 'react';
import { X, AlertCircle, HelpCircle, Info } from 'lucide-react';

const DialogContext = createContext(null);

export const DialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert', // 'alert', 'confirm', 'prompt'
    inputValue: '',
    onConfirm: null,
    onCancel: null
  });

  const showAlert = (message, title = 'Notification') => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        title,
        message,
        type: 'alert',
        inputValue: '',
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve();
        },
        onCancel: null
      });
    });
  };

  const showConfirm = (message, title = 'Confirm Action') => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        title,
        message,
        type: 'confirm',
        inputValue: '',
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  const showPrompt = (message, defaultValue = '', title = 'Input Required') => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        title,
        message,
        type: 'prompt',
        inputValue: defaultValue,
        onConfirm: (val) => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(val);
        },
        onCancel: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(null);
        }
      });
    });
  };

  const handleConfirm = () => {
    if (dialog.type === 'prompt') {
      dialog.onConfirm?.(dialog.inputValue);
    } else {
      dialog.onConfirm?.();
    }
  };

  const handleCancel = () => {
    dialog.onCancel?.();
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {dialog.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 20000 }}>
          <div className="modal-container glass-panel animate-fade-in" style={{ maxWidth: '400px', width: '90%' }}>
            <div className="modal-header border-b" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {dialog.type === 'alert' && <Info size={18} className="text-primary" style={{ color: 'var(--primary)' }} />}
                {dialog.type === 'confirm' && <HelpCircle size={18} className="text-secondary" style={{ color: 'var(--secondary)' }} />}
                {dialog.type === 'prompt' && <AlertCircle size={18} className="text-primary" style={{ color: 'var(--primary)' }} />}
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{dialog.title}</h3>
              </div>
              <button 
                type="button" 
                className="icon-btn" 
                onClick={handleCancel || dialog.onConfirm}
                style={{ width: '28px', height: '28px' }}
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              <p style={{ margin: 0 }}>{dialog.message}</p>
              
              {dialog.type === 'prompt' && (
                <input 
                  type="text"
                  className="input-field"
                  value={dialog.inputValue}
                  onChange={(e) => setDialog(prev => ({ ...prev, inputValue: e.target.value }))}
                  style={{ marginTop: '16px', background: 'var(--bg-secondary)' }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirm();
                    if (e.key === 'Escape') handleCancel();
                  }}
                />
              )}
            </div>
            
            <div className="modal-footer border-t" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'rgba(0,0,0,0.15)' }}>
              {dialog.type !== 'alert' && (
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleCancel}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
              )}
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                onClick={handleConfirm}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                {dialog.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => useContext(DialogContext);
