import PDFDocument from 'pdfkit';
import { prisma } from '../../config/prisma.js';

/**
 * PDF Service for generating official BMSCE institutional documents.
 */

// Helper to draw horizontal line
function drawHorizontalRule(doc: PDFKit.PDFDocument, y: number) {
  doc.save()
    .strokeColor('#cbd5e1')
    .lineWidth(0.8)
    .moveTo(40, y)
    .lineTo(doc.page.width - 40, y)
    .stroke()
    .restore();
}

// Institutional Header
function drawInstitutionalHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  const pageWidth = doc.page.width;

  // Header band
  doc.rect(0, 0, pageWidth, 8).fill('#0f172a');

  doc.font('Helvetica-Bold')
    .fontSize(15)
    .fillColor('#0f172a')
    .text('B.M.S. COLLEGE OF ENGINEERING, BENGALURU-560019', 40, 24, { align: 'center' });

  doc.font('Helvetica')
    .fontSize(8.5)
    .fillColor('#64748b')
    .text('Autonomous Institute Affiliated to VTU • Approved by AICTE • Accredited by NAAC with A++ Grade', 40, 42, { align: 'center' });

  doc.font('Helvetica-Bold')
    .fontSize(9.5)
    .fillColor('#1e293b')
    .text('DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING', 40, 54, { align: 'center' });

  drawHorizontalRule(doc, 68);

  // Document Title Box
  doc.font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#0f172a')
    .text(title, 40, 76, { align: 'center' });

  doc.font('Helvetica')
    .fontSize(8.5)
    .fillColor('#475569')
    .text(subtitle, 40, 92, { align: 'center' });

  drawHorizontalRule(doc, 106);
}

// Footer with DAAB Ratification and Page Number
function drawInstitutionalFooter(doc: PDFKit.PDFDocument, verificationCode: string) {
  const bottom = doc.page.height - 35;
  drawHorizontalRule(doc, bottom - 10);

  doc.font('Helvetica')
    .fontSize(7.5)
    .fillColor('#94a3b8')
    .text(`Document Ref: ${verificationCode} • Autonomous DAAB Academic Cluster • Verified Synthetic Demo Record`, 40, bottom);

  doc.font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor('#64748b')
    .text(`Generated: ${new Date().toLocaleDateString('en-IN')} | BMSCE Smart Academic`, 40, bottom, { align: 'right' });
}

// ============================================================================
// 1. MASTER TIMETABLE PDF
// ============================================================================
export async function generateMasterTimetablePdf(): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      drawInstitutionalHeader(
        doc,
        'OFFICIAL MASTER TIMETABLE GRID — AY 2024–25 (ODD SEMESTER)',
        'Section: CSE-5B (64 Enrolled) • Primary Classroom: Room PJ-302 • Master Version: v4.2-OSD (DAAB Ratified)'
      );

      // Timetable Matrix (Landscape)
      const startX = 40;
      let startY = 118;
      const colWidths = [70, 98, 98, 50, 98, 98, 50, 98, 98];
      const headers = ['Day', 'Period 1\n08:30-09:30', 'Period 2\n09:30-10:30', 'Tea\nRecess', 'Period 3\n10:45-11:45', 'Period 4\n11:45-12:45', 'Lunch\nRecess', 'Period 5\n01:45-02:45', 'Period 6-7\n02:45-04:45'];

      // Header row
      doc.rect(startX, startY, doc.page.width - 80, 26).fill('#f1f5f9');
      let currentX = startX;
      headers.forEach((h, i) => {
        doc.font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#1e293b')
          .text(h, currentX + 3, startY + 4, { width: colWidths[i] - 6, align: 'center' });
        currentX += colWidths[i];
      });

      startY += 26;

      // Weekly Rows
      const schedule = [
        {
          day: 'MONDAY',
          p1: '22CSSPCDAA\nDr. Ramanathan\nPJ-301',
          p2: '22CSSPCDBMS\nProf. Sneha K.\nPJ-301',
          p3: '22CSSPCCNT\nDr. Rajeshwari\nPJ-301',
          p4: '22CSSPCOPS\nProf. Vikram Sen\nPJ-304',
          p56: 'DAA Lab Practicum (B1/B2)\nDr. Ramanathan / Prof. Malathi\nCS-L1 Systems Lab',
        },
        {
          day: 'TUESDAY',
          p1: '22CSSPCDBMS\nProf. Sneha K.\nPJ-302',
          p2: '22CSSPCDAA\nDr. Ramanathan\nPJ-302',
          p3: '22MASPCTFL\nDr. K. M. Rao\nPJ-302',
          p4: '22CSSPCSE\nDr. M. Nandhini\nPJ-302',
          p56: 'DBMS Practicum Lab (B1/B2)\nProf. Sneha K. & Assistants\nCS-L2 Software Lab',
        },
        {
          day: 'WEDNESDAY',
          p1: '22CSSPCCNT\nDr. Rajeshwari\nPJ-301',
          p2: '22CSSPCOPS\nProf. Vikram Sen\nPJ-301',
          p3: '22CSSPCDAA\nDr. Ramanathan\nPJ-301',
          p4: '22MASPCTFL\nDr. K. M. Rao\nPJ-301',
          p56: 'CN Packet Simulation Lab (B1)\nDr. Rajeshwari V.\nCS-L3 Network Lab',
        },
        {
          day: 'THURSDAY',
          p1: '22CSSPCOPS\nProf. Vikram Sen\nPJ-304',
          p2: '22MASPCTFL\nDr. K. M. Rao\nPJ-304',
          p3: '22CSSPCCNT\nDr. Rajeshwari\nPJ-304',
          p4: '22CSSPCSE\nDr. M. Nandhini\nPJ-304',
          p56: 'Technical Seminar & Capstone Prep\nFaculty Advisors\nSeminar Hall 2',
        },
        {
          day: 'FRIDAY',
          p1: '22CSSPCDAA\nDr. Ramanathan\nPJ-302',
          p2: '22CSSPCDBMS\nProf. Sneha K.\nPJ-302',
          p3: '22CSSPCSE\nDr. M. Nandhini\nPJ-302',
          p4: 'Remedial Tutorial\nProf. S. Malathi\nPJ-302',
          p56: 'Sports / Library / Extracurricular\nStudent Council Activity\nCampus Grounds',
        },
      ];

      schedule.forEach((row, rowIndex) => {
        const rowHeight = 44;
        const bg = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(startX, startY, doc.page.width - 80, rowHeight).fill(bg);

        // Draw cells
        let x = startX;
        // Day
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a').text(row.day, x + 4, startY + 16, { width: colWidths[0] - 8, align: 'center' });
        x += colWidths[0];
        // P1
        doc.font('Helvetica').fontSize(7).fillColor('#334155').text(row.p1, x + 3, startY + 6, { width: colWidths[1] - 6, align: 'center' });
        x += colWidths[1];
        // P2
        doc.text(row.p2, x + 3, startY + 6, { width: colWidths[2] - 6, align: 'center' });
        x += colWidths[2];
        // Tea
        doc.font('Helvetica-Oblique').fontSize(6.5).fillColor('#94a3b8').text('Tea\nBreak', x + 2, startY + 14, { width: colWidths[3] - 4, align: 'center' });
        x += colWidths[3];
        // P3
        doc.font('Helvetica').fontSize(7).fillColor('#334155').text(row.p3, x + 3, startY + 6, { width: colWidths[4] - 6, align: 'center' });
        x += colWidths[4];
        // P4
        doc.text(row.p4, x + 3, startY + 6, { width: colWidths[5] - 6, align: 'center' });
        x += colWidths[5];
        // Lunch
        doc.font('Helvetica-Oblique').fontSize(6.5).fillColor('#94a3b8').text('Lunch\nRecess', x + 2, startY + 14, { width: colWidths[6] - 4, align: 'center' });
        x += colWidths[6];
        // P5-7 Lab Block (merged span)
        const labWidth = colWidths[7] + colWidths[8];
        doc.rect(x, startY + 2, labWidth - 2, rowHeight - 4).fill('#f0fdf4');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#166534').text(row.p56, x + 6, startY + 10, { width: labWidth - 12, align: 'center' });

        drawHorizontalRule(doc, startY + rowHeight);
        startY += rowHeight;
      });

      // Course Legend & Signatures
      startY += 12;
      doc.rect(startX, startY, doc.page.width - 80, 52).fill('#f8fafc');
      doc.rect(startX, startY, doc.page.width - 80, 52).stroke('#e2e8f0');

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a').text('COURSE ALLOCATION LEGEND:', startX + 8, startY + 6);
      doc.font('Helvetica').fontSize(7).fillColor('#475569')
        .text('• 22CSSPCDAA: Design & Analysis of Algorithms (4C) — Dr. A. Ramanathan (Ext 3101)', startX + 8, startY + 18)
        .text('• 22CSSPCDBMS: Database Management Systems (4C) — Prof. Sneha K. (Ext 3102)', startX + 8, startY + 28)
        .text('• 22CSSPCCNT: Computer Networks (4C) — Dr. Rajeshwari V. (Ext 3103)', startX + 8, startY + 38)
        .text('• 22CSSPCOPS: Operating Systems (3C) — Prof. Vikram Sen (Ext 3104)', startX + 270, startY + 18)
        .text('• 22MASPCTFL: Theory of Computation (4C) — Dr. K. M. Rao (Ext 3201)', startX + 270, startY + 28)
        .text('• 22CSSPCSE: Software Engineering & Agile (3C) — Dr. M. Nandhini (Ext 3105)', startX + 270, startY + 38);

      // Sign-off boxes
      const sigY = doc.page.height - 85;
      const sigWidth = (doc.page.width - 120) / 4;

      ['Time Table Coordinator\nProf. S. Malathi', 'Class In-Charge\nDr. P. Jayashree', 'Head of Department\nDr. K. R. Suresh', 'Dean (Academic)\nDr. B. V. Ravishankar'].forEach((sig, i) => {
        const sx = 40 + i * (sigWidth + 12);
        doc.rect(sx, sigY, sigWidth, 38).stroke('#cbd5e1');
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#64748b').text('DIGITALLY APPROVED', sx + 4, sigY + 4);
        doc.font('Helvetica').fontSize(7).fillColor('#1e293b').text(sig, sx + 4, sigY + 15, { align: 'center', width: sigWidth - 8 });
      });

      drawInstitutionalFooter(doc, 'BMSCE-CSE-TT-2024-5B-v4.2');
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ============================================================================
// 2. EXAMINATION SCHEDULE PDF
// ============================================================================
export async function generateExaminationSchedulePdf(): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 40,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      drawInstitutionalHeader(
        doc,
        'CONTINUOUS INTERNAL EVALUATION (CIE-2) EXAMINATION SCHEDULE',
        'Academic Year 2024–25 (Odd Semester) • Autonomous Scheme 2022 • Document Ref: BMSCE/COE/CIE-2/2024-25'
      );

      // Examination Timetable
      const startX = 40;
      let startY = 120;
      const colWidths = [75, 80, 85, 145, 65, 65];
      const headers = ['Date & Day', 'Time Window', 'Course Code', 'Course Title', 'Venues', 'Invigilator'];

      doc.rect(startX, startY, doc.page.width - 80, 20).fill('#0f172a');
      let currentX = startX;
      headers.forEach((h, i) => {
        doc.font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#ffffff')
          .text(h, currentX + 3, startY + 6, { width: colWidths[i] - 6, align: 'center' });
        currentX += colWidths[i];
      });

      startY += 20;

      const examEvents = [
        { date: '18 Nov 2024 (Mon)', time: '09:00 - 10:30 AM', code: '22CSSPCDAA', title: 'Design & Analysis of Algorithms', venue: 'PJ-301 / 302', inv: 'Dr. Ramanathan' },
        { date: '19 Nov 2024 (Tue)', time: '09:00 - 10:30 AM', code: '22CSSPCDBMS', title: 'Database Management Systems', venue: 'PJ-301 / 302', inv: 'Prof. Sneha K.' },
        { date: '20 Nov 2024 (Wed)', time: '09:00 - 10:30 AM', code: '22CSSPCCNT', title: 'Computer Networks', venue: 'PJ-301 / 304', inv: 'Dr. Rajeshwari' },
        { date: '21 Nov 2024 (Thu)', time: '09:00 - 10:30 AM', code: '22CSSPCOPS', title: 'Operating Systems', venue: 'PJ-301 / 302', inv: 'Prof. Vikram Sen' },
        { date: '22 Nov 2024 (Fri)', time: '09:00 - 10:30 AM', code: '22MASPCTFL', title: 'Theory of Computation', venue: 'PJ-302 / 304', inv: 'Dr. K. M. Rao' },
        { date: '23 Nov 2024 (Sat)', time: '09:00 - 10:30 AM', code: '22CSSPCSE', title: 'Software Engineering & Agile', venue: 'PJ-301 / 302', inv: 'Dr. M. Nandhini' },
      ];

      examEvents.forEach((ev, i) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(startX, startY, doc.page.width - 80, 24).fill(bg);

        let x = startX;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e293b').text(ev.date, x + 3, startY + 6, { width: colWidths[0] - 6, align: 'center' });
        x += colWidths[0];
        doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(ev.time, x + 3, startY + 6, { width: colWidths[1] - 6, align: 'center' });
        x += colWidths[1];
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#4338ca').text(ev.code, x + 3, startY + 6, { width: colWidths[2] - 6, align: 'center' });
        x += colWidths[2];
        doc.font('Helvetica').fontSize(7.5).fillColor('#1e293b').text(ev.title, x + 4, startY + 6, { width: colWidths[3] - 8, align: 'left' });
        x += colWidths[3];
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#047857').text(ev.venue, x + 3, startY + 6, { width: colWidths[4] - 6, align: 'center' });
        x += colWidths[4];
        doc.font('Helvetica').fontSize(7).fillColor('#334155').text(ev.inv, x + 3, startY + 6, { width: colWidths[5] - 6, align: 'center' });

        drawHorizontalRule(doc, startY + 24);
        startY += 24;
      });

      // Examination Hall Allocation & Capacity Breakdown
      startY += 16;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('HALL SEATING ALLOCATION & CAPACITY VALIDATION', startX, startY);
      startY += 14;

      const hallAlloc = [
        { hall: 'PJ-301 (Platinum Jubilee Block, 3rd Floor)', cap: '75 Desks', alloc: '60 Students (CSE-B1/B2)', format: 'Single Desk Interleaved', util: '80%' },
        { hall: 'PJ-302 (Platinum Jubilee Block, 3rd Floor)', cap: '75 Desks', alloc: '60 Students (CSE-A1/A2)', format: 'Single Desk Interleaved', util: '80%' },
        { hall: 'PJ-304 (Platinum Jubilee Block, 3rd Floor)', cap: '75 Desks', alloc: '55 Students (Buffer)', format: 'Single Desk Interleaved', util: '73%' },
      ];

      doc.rect(startX, startY, doc.page.width - 80, 18).fill('#e2e8f0');
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#334155')
        .text('Examination Hall / Venue', startX + 6, startY + 5)
        .text('Gross Cap', startX + 220, startY + 5)
        .text('Allocated Desks', startX + 280, startY + 5)
        .text('Seating Layout', startX + 380, startY + 5)
        .text('Utilization', startX + 470, startY + 5);

      startY += 18;
      hallAlloc.forEach((h, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(startX, startY, doc.page.width - 80, 20).fill(bg);
        doc.font('Helvetica').fontSize(7).fillColor('#1e293b')
          .text(h.hall, startX + 6, startY + 5)
          .text(h.cap, startX + 220, startY + 5)
          .text(h.alloc, startX + 280, startY + 5)
          .text(h.format, startX + 380, startY + 5)
          .text(h.util, startX + 470, startY + 5);
        drawHorizontalRule(doc, startY + 20);
        startY += 20;
      });

      // Rules & Instructions
      startY += 16;
      doc.rect(startX, startY, doc.page.width - 80, 70).fill('#fffbeb');
      doc.rect(startX, startY, doc.page.width - 80, 70).stroke('#fde68a');

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#92400e').text('IMPORTANT INSTRUCTIONS TO CANDIDATES & INVIGILATORS:', startX + 10, startY + 8);
      doc.font('Helvetica').fontSize(7).fillColor('#78350f')
        .text('1. Candidates must occupy their designated interleaved desks at least 15 minutes prior to session commencement.', startX + 10, startY + 20)
        .text('2. Possession of programmable calculators, smart watches, and mobile phones inside the examination hall is strictly prohibited.', startX + 10, startY + 31)
        .text('3. VTU approved standard Mathematical Data Handbooks are permitted strictly for 22CSSPCDAA and 22MASPCTFL papers.', startX + 10, startY + 42)
        .text('4. Identity Card with valid College Registration Number (USN) must be placed on the desk for invigilator verification.', startX + 10, startY + 53);

      // Signatures
      const sigY = doc.page.height - 110;
      const sigWidth = (doc.page.width - 120) / 3;

      ['Chief Superintendent\nExaminations COE', 'Head of Department\nDr. K. R. Suresh', 'Dean (Academic Affairs)\nDr. P. Jayashree'].forEach((sig, i) => {
        const sx = 40 + i * (sigWidth + 20);
        doc.rect(sx, sigY, sigWidth, 42).stroke('#cbd5e1');
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#64748b').text('DIGITALLY RATIFIED', sx + 4, sigY + 4);
        doc.font('Helvetica').fontSize(7.5).fillColor('#1e293b').text(sig, sx + 4, sigY + 18, { align: 'center', width: sigWidth - 8 });
      });

      drawInstitutionalFooter(doc, 'BMSCE-COE-CIE2-2024-v2.1');
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ============================================================================
// 3. FACULTY WORKLOAD AUDIT REPORT PDF
// ============================================================================
export async function generateFacultyWorkloadPdf(): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 40,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      drawInstitutionalHeader(
        doc,
        'FACULTY WORKLOAD DISTRIBUTION & REGULATORY AUDIT REPORT',
        'Department of Computer Science & Engineering • AICTE & VTU Workload Ceiling Compliance (AY 2024–25)'
      );

      const startX = 40;
      let startY = 120;
      const colWidths = [150, 65, 80, 80, 70, 70];
      const headers = ['Faculty Name & Designation', 'Emp Code', 'Weekly Load', 'Daily (M-F)', 'Peak Day', 'AICTE Status'];

      doc.rect(startX, startY, doc.page.width - 80, 20).fill('#0f172a');
      let currentX = startX;
      headers.forEach((h, i) => {
        doc.font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#ffffff')
          .text(h, currentX + 3, startY + 6, { width: colWidths[i] - 6, align: 'center' });
        currentX += colWidths[i];
      });

      startY += 20;

      const facultyData = [
        { name: 'Dr. A. Ramanathan\nProfessor & Course Coord', code: 'EMP-CSE-011', load: '16.0 / 18.0h\n(13h Th + 3h Lab)', daily: '4-3-4-2-3', peak: '4.0h/day', status: 'COMPLIANT' },
        { name: 'Prof. Sneha K.\nAssistant Professor', code: 'EMP-CSE-012', load: '17.0 / 18.0h\n(14h Th + 3h Lab)', daily: '3-4-3-4-3', peak: '4.0h/day', status: 'COMPLIANT' },
        { name: 'Dr. Rajeshwari V.\nAssociate Professor', code: 'EMP-CSE-013', load: '16.0 / 18.0h\n(13h Th + 3h Lab)', daily: '4-3-3-3-3', peak: '4.0h/day', status: 'COMPLIANT' },
        { name: 'Prof. Vikram Sen\nAssistant Professor', code: 'EMP-CSE-014', load: '15.0 / 18.0h\n(15h Theory)', daily: '3-3-3-3-3', peak: '3.0h/day', status: 'COMPLIANT' },
        { name: 'Dr. K. M. Rao\nProfessor (Mathematics/TOC)', code: 'EMP-MATH-005', load: '16.0 / 18.0h\n(16h Theory)', daily: '3-4-3-3-3', peak: '4.0h/day', status: 'COMPLIANT' },
        { name: 'Dr. M. Nandhini\nAssociate Professor', code: 'EMP-CSE-016', load: '14.0 / 18.0h\n(14h Theory)', daily: '3-3-2-3-3', peak: '3.0h/day', status: 'COMPLIANT' },
        { name: 'Prof. S. Malathi\nAssociate Professor (Proxy)', code: 'EMP-CSE-017', load: '15.0 / 18.0h\n(Standby Reserve)', daily: '2-2-3-4-4', peak: '4.0h/day', status: 'PROXY STANDBY' },
        { name: 'Dr. K. R. Suresh\nHead of Department (CSE)', code: 'EMP-CSE-001', load: '8.0 / 10.0h\n(Admin Workload Cap)', daily: '2-2-2-1-1', peak: '2.0h/day', status: 'ADMIN CAP' },
      ];

      facultyData.forEach((f, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(startX, startY, doc.page.width - 80, 28).fill(bg);

        let x = startX;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a').text(f.name, x + 4, startY + 4, { width: colWidths[0] - 8 });
        x += colWidths[0];
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748b').text(f.code, x + 2, startY + 10, { width: colWidths[1] - 4, align: 'center' });
        x += colWidths[1];
        doc.font('Helvetica').fontSize(7).fillColor('#1e293b').text(f.load, x + 2, startY + 5, { width: colWidths[2] - 4, align: 'center' });
        x += colWidths[2];
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#475569').text(f.daily, x + 2, startY + 10, { width: colWidths[3] - 4, align: 'center' });
        x += colWidths[3];
        doc.font('Helvetica').fontSize(7).fillColor('#1e293b').text(f.peak, x + 2, startY + 10, { width: colWidths[4] - 4, align: 'center' });
        x += colWidths[4];
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#166534').text(f.status, x + 2, startY + 10, { width: colWidths[5] - 4, align: 'center' });

        drawHorizontalRule(doc, startY + 28);
        startY += 28;
      });

      // Compliance Summary Box
      startY += 16;
      doc.rect(startX, startY, doc.page.width - 80, 60).fill('#f0fdf4');
      doc.rect(startX, startY, doc.page.width - 80, 60).stroke('#bbf7d0');

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#166534').text('AICTE & VTU REGULATORY AUDIT CONFIRMATION:', startX + 10, startY + 8);
      doc.font('Helvetica').fontSize(7.5).fillColor('#14532d')
        .text('• Zero faculty overload violations: All full-time teaching faculty operate within the 18.0 contact hours/week threshold.', startX + 10, startY + 22)
        .text('• Daily fatigue barrier respected: Zero professors are scheduled for more than 4 formal instruction hours on any working day.', startX + 10, startY + 34)
        .text('• Departmental teaching load equilibrium: 100% of required autonomous curriculum hours are allocated with verified proxy reserves.', startX + 10, startY + 46);

      // Signatures
      const sigY = doc.page.height - 110;
      const sigWidth = (doc.page.width - 120) / 3;

      ['Workload Auditor\nDr. M. Nandhini', 'Head of Department\nDr. K. R. Suresh', 'Dean (Faculty Welfare)\nDr. P. Jayashree'].forEach((sig, i) => {
        const sx = 40 + i * (sigWidth + 20);
        doc.rect(sx, sigY, sigWidth, 42).stroke('#cbd5e1');
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#64748b').text('DIGITALLY CERTIFIED', sx + 4, sigY + 4);
        doc.font('Helvetica').fontSize(7.5).fillColor('#1e293b').text(sig, sx + 4, sigY + 18, { align: 'center', width: sigWidth - 8 });
      });

      drawInstitutionalFooter(doc, 'BMSCE-FAC-WORKLOAD-2024-v4.2');
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

