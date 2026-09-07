import React, { useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../context/AuthContext.jsx';
import { scanQRAttendance, getBranchesForScan } from '../api/AdminServices.js';
import s from './AttendanceScanner.module.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const STATUS = {
  IDLE: 'idle',
  SCANNING: 'scanning',
  SUCCESS: 'success',
  ERROR: 'error',
  PROCESSING: 'processing',
};

export default function AttendanceScanner({ onScanComplete }) {
  const { user } = useAuth();
  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [error, setError] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(true);

  const startScanner = useCallback(async () => {
    try {
      setStatus(STATUS.SCANNING);
      setError(null);
      setLastScan(null);

      const html5Qrcode = new Html5Qrcode('qr-reader');
      html5QrcodeRef.current = html5Qrcode;

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      const camSuccess = await html5Qrcode.start(
        { facingMode: 'environment' },
        config,
        onScanSuccess,
        onScanError,
      );
      setCameraPermission(true);
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setCameraPermission(false);
        setError('Camera permission denied. Please allow camera access to scan attendance.');
      } else {
        setError('Failed to start scanner. Please ensure your camera is available.');
      }
      setStatus(STATUS.IDLE);
    }
  }, []);

  const stopScanner = useCallback(async () => {
    try {
      if (html5QrcodeRef.current) {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      }
    } catch { /* noop */ }
    setStatus(STATUS.IDLE);
  }, []);

  const onScanSuccess = async (decodedText) => {
    try {
      setStatus(STATUS.PROCESSING);
      stopScanner();

      const result = await scanQRAttendance({
        qrToken: decodedText,
        branchId: selectedBranch,
      });

      if (result.success) {
        setStatus(STATUS.SUCCESS);
        setLastScan(result.data);
        setError(null);
        onScanComplete?.(result.data);
      }
    } catch (err) {
      setStatus(STATUS.ERROR);
      setError(err.message || 'Scan failed. Please try again.');
      setLastScan(null);
      // Auto-return to scanner after a short delay for non-duplicate errors
      if (!err.message?.includes('already')) {
        setTimeout(() => {
          setStatus(STATUS.SCANNING);
        }, 1500);
      }
    }
  };

  const onScanError = (err) => {
    // Ignore - this fires repeatedly when no QR is found
  };

  const loadBranches = async () => {
    try {
      const data = await getBranchesForScan();
      if (data.success) setBranches(data.data);
    } catch { /* noop */ }
  };

  // Auto-load branches
  React.useEffect(() => {
    loadBranches();
  }, []);

  // Handle branch selection from user's branch
  React.useEffect(() => {
    if (!selectedBranch && branches.length === 1) {
      setSelectedBranch(branches[0]._id);
    }
  }, [branches, selectedBranch]);

  return (
    <div className={s.scanner}>
      <h2 className={s.title}>Scan Attendance QR</h2>

      {/* Branch Selection */}
      <div className={s.branchSelect}>
        <label className={s.label}>Branch</label>
        <select
          className={s.select}
          value={selectedBranch || ''}
          onChange={(e) => setSelectedBranch(e.target.value)}
        >
          <option value="">Select a branch</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Admin Info */}
      <div className={s.adminInfo}>
        <span>Admin: <strong>{user?.name}</strong></span>
      </div>

      {/* Camera Permission Error */}
      {!cameraPermission && (
        <div className={s.permissionError}>
          <p>Camera Permission Required</p>
          <p>Please allow camera access to scan attendance.</p>
        </div>
      )}

      {/* Error Display */}
      {error && status === STATUS.ERROR && (
        <div className={s.errorCard}>
          <p className={s.errorTitle}>QR Code Not Recognized</p>
          <p>{error}</p>
          <button className={s.retryBtn} onClick={startScanner}>Try Again</button>
        </div>
      )}

      {/* Already Marked */}
      {error && error.includes('already') && (
        <div className={s.duplicateCard}>
          <p className={s.duplicateTitle}>Attendance Already Marked</p>
          <p>{error}</p>
        </div>
      )}

      {/* Scanner */}
      <div className={s.scannerContainer}>
        <div id="qr-reader" className={s.scannerFrame} />
        {status === STATUS.IDLE && (
          <div className={s.scannerPlaceholder}>
            <p>Tap "Start Scanner" to begin</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={s.controls}>
        {status === STATUS.IDLE || status === STATUS.ERROR ? (
          <button className={s.startBtn} onClick={startScanner}>
            <span className={s.scanIcon}>📷</span> Start Scanner
          </button>
        ) : (
          <button className={s.stopBtn} onClick={stopScanner}>
            Stop Scanner
          </button>
        )}
      </div>

      {/* Success Result */}
      {status === STATUS.SUCCESS && lastScan && (
        <div className={s.successCard}>
          <div className={s.successIcon}>✓</div>
          <h3 className={s.successTitle}>Attendance Marked</h3>
          <div className={s.successDetails}>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Name</span>
              <span className={s.detailValue}>{lastScan?.user?.name}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Member ID</span>
              <span className={s.detailValue}>{lastScan?.user?.memberId}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Branch</span>
              <span className={s.detailValue}>{lastScan?.branch?.name}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Time</span>
              <span className={s.detailValue}>
                {new Date(lastScan?.scannedAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          </div>
          <button className={s.nextBtn} onClick={() => { setStatus(STATUS.IDLE); startScanner(); }}>
            Scan Next
          </button>
        </div>
      )}
    </div>
  );
}
