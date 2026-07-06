import React, { useEffect } from 'react';

export default function Toast({ id, message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [id, onClose]);

  const handleClose = () => {
    onClose(id);
  };

  return (
    <div className={`toast ${type}`} onClick={handleClose}>
      <span>{type === 'success' ? '✅' : '❌'}</span>
      <div>{message}</div>
    </div>
  );
}
