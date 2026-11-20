import type { CertificateRecord } from '../shared/types';

export function downloadCertificatePng(cert: CertificateRecord): void {
  const width = 1600;
  const height = 1120;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clean crisp paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer obsidian architectural border
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 24;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // Inner subtle sky-blue hairline border
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 3;
  ctx.strokeRect(68, 68, width - 136, height - 136);

  // Top dark banner band
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(68, 68, width - 136, 150);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 22px sans-serif';
  ctx.fillText('KELAJAK MARKAZI · RASMIY TA’LIM AKADEMIYASI', 130, 128);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px sans-serif';
  ctx.fillText('SERTIFIKAT', 130, 184);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 22px monospace';
  ctx.fillText(`ID: ${cert.certCode}`, width - 130, 155);
  ctx.textAlign = 'left';

  // Recipient block
  ctx.fillStyle = '#64748b';
  ctx.font = '500 26px sans-serif';
  ctx.fillText('Ushbu rasmiy sertifikat quyidagi tinglovchiga taqdim etiladi:', 130, 320);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 68px sans-serif';
  ctx.fillText(cert.studentName, 130, 415);

  // Underline
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(130, 448);
  ctx.lineTo(width - 130, 448);
  ctx.stroke();

  // Course details
  ctx.fillStyle = '#475569';
  ctx.font = '500 28px sans-serif';
  ctx.fillText('O‘quv yo‘nalishi va kurs dasturi:', 130, 520);

  ctx.fillStyle = '#0284c7';
  ctx.font = '700 42px sans-serif';
  ctx.fillText(cert.courseTitle, 130, 580);

  ctx.fillStyle = '#334155';
  ctx.font = '600 28px sans-serif';
  ctx.fillText(`Akademik natija: ${cert.gradeLabel}`, 130, 650);

  // Bottom metadata row
  ctx.fillStyle = '#64748b';
  ctx.font = '500 22px sans-serif';
  ctx.fillText('Mas’ul ustoz', 130, 860);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 28px sans-serif';
  ctx.fillText(cert.teacherName, 130, 902);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 22px sans-serif';
  ctx.fillText('Berilgan sana', 640, 860);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 28px monospace';
  ctx.fillText(cert.issueDate, 640, 902);

  // Deterministic QR-style verification matrix on bottom-right
  const qrX = width - 290;
  const qrY = 770;
  const cell = 16;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(qrX - 16, qrY - 16, cell * 9 + 32, cell * 9 + 54);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(qrX - 16, qrY - 16, cell * 9 + 32, cell * 9 + 54);

  let seed = 0;
  for (let i = 0; i < cert.certCode.length; i += 1) {
    seed = (seed * 31 + cert.certCode.charCodeAt(i)) % 999983;
  }

  ctx.fillStyle = '#0f172a';
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const isCorner =
        (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
      const hashBit = ((seed + r * 17 + c * 29) % 3) === 0;
      if (isCorner || hashBit) {
        ctx.fillRect(qrX + c * cell, qrY + r * cell, cell - 2, cell - 2);
      }
    }
  }

  ctx.fillStyle = '#475569';
  ctx.font = '600 16px monospace';
  ctx.fillText(cert.certCode, qrX + 8, qrY + cell * 9 + 24);

  const link = document.createElement('a');
  link.download = `Kelajak-Markazi-Sertifikat-${cert.certCode}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
