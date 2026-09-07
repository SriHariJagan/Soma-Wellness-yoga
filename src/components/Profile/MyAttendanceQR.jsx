import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { useAuth } from '../../context/AuthContext.jsx';
import s from './MyAttendanceQR.module.css';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function MyAttendanceQR() {
  const { user } = useAuth();
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const qrCanvasRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/users/me/attendance-qr`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch QR');
        return res.json();
      })
      .then((data) => {
        if (mounted && data.success) {
          setQrData(data.data);
        }
      })
      .catch(() => {
        if (mounted) setError('Could not load QR code');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const generateQrCanvas = useCallback(async () => {
    if (!qrData) return null;
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, qrData.attendanceQrToken, {
      width: 280,
      margin: 2,
      color: { dark: '#183D2D', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
    return canvas;
  }, [qrData]);

  const generateDownloadCanvas = useCallback(async () => {
    const qrCanvas = await generateQrCanvas();
    if (!qrCanvas) return null;

    const qrSize = 280;
    const padding = 40;
    const logoHeight = 60;
    const textHeight = 40;
    const canvasWidth = qrSize + padding * 2;
    const canvasHeight = logoHeight + padding + qrSize + padding + textHeight + padding;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth * 2;
    canvas.height = canvasHeight * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Soma Wellness Logo/Name at top
    ctx.fillStyle = '#183D2D';
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOMA WELLNESS', canvasWidth / 2, logoHeight - 10);

    ctx.font = '14px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#2E7D5B';
    ctx.fillText('Attendance QR', canvasWidth / 2, logoHeight + 18);

    // QR Code in middle
    const qrX = padding;
    const qrY = logoHeight + padding;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // User name below QR
    ctx.fillStyle = '#183D2D';
    ctx.font = 'bold 18px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const userName = user?.name || 'Member';
    ctx.fillText(userName, canvasWidth / 2, qrY + qrSize + padding + 24);

    // Member ID
    ctx.fillStyle = '#5a6b63';
    ctx.font = '14px Inter, system-ui, sans-serif';
    const memberId = qrData.memberId || `SW-${String(user?._id || '').slice(-5).toUpperCase()}`;
    ctx.fillText(`Member ID: ${memberId}`, canvasWidth / 2, qrY + qrSize + padding + 44);

    return canvas;
  }, [qrData, user]);

  const handleDownload = async () => {
    if (!qrData) return;
    setDownloading(true);
    try {
      const canvas = await generateDownloadCanvas();
      if (canvas) {
        const link = document.createElement('a');
        link.download = `soma-wellness-attendance-qr-${user?.name?.replace(/\s/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className={s.section}>
        <h3 className={s.title}>My Attendance QR</h3>
        <div className={s.skeleton}>Loading QR…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.section}>
        <h3 className={s.title}>My Attendance QR</h3>
        <p className={s.error}>{error}</p>
      </div>
    );
  }

  if (!qrData) return null;

  return (
    <div className={s.section}>
      <h3 className={s.title}>My Attendance QR</h3>
      <div className={s.qrCard}>
        <div className={s.qrWrapper}>
          <QRCodeSVG
            value={qrData.attendanceQrToken}
            size={280}
            level="M"
            includeMargin={true}
            backgroundColor="#ffffff"
            foregroundColor="#183D2D"
          />
        </div>
        <div className={s.qrInfo}>
          <p className={s.qrHint}>Show this QR code to Soma Wellness staff when you visit the branch.</p>
          <div className={s.qrMeta}>
            <div className={s.metaRow}>
              <span className={s.metaLabel}>Member</span>
              <span className={s.metaValue}>{user?.name || '—'}</span>
            </div>
            <div className={s.metaRow}>
              <span className={s.metaLabel}>Member ID</span>
              <span className={s.metaValue}>{qrData.memberId || '—'}</span>
            </div>
          </div>
          <div className={s.qrActions}>
            <button className={s.downloadBtn} onClick={handleDownload} disabled={downloading}>
              {downloading ? 'Downloading…' : 'Download QR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}