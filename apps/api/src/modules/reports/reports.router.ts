import { Router, Request, Response } from 'express';
import {
  generateMasterTimetablePdf,
  generateExaminationSchedulePdf,
  generateFacultyWorkloadPdf,
} from './pdf.service.js';

export const reportsRouter = Router();

/**
 * GET /api/v1/reports/timetable-pdf
 * Generates and streams official BMSCE Master Timetable PDF
 */
reportsRouter.get('/timetable-pdf', async (req: Request, res: Response) => {
  try {
    const pdfBuffer = await generateMasterTimetablePdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="BMSCE_Master_Timetable_CSE5B.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('[ReportsRouter] Timetable PDF generation failed:', error);
    res.status(500).json({ success: false, error: 'Failed to generate timetable PDF: ' + error.message });
  }
});

/**
 * GET /api/v1/reports/examination-pdf
 * Generates and streams official BMSCE CIE Examination Schedule PDF
 */
reportsRouter.get('/examination-pdf', async (req: Request, res: Response) => {
  try {
    const pdfBuffer = await generateExaminationSchedulePdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="BMSCE_CIE2_Exam_Schedule.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('[ReportsRouter] Examination PDF generation failed:', error);
    res.status(500).json({ success: false, error: 'Failed to generate examination schedule PDF: ' + error.message });
  }
});

/**
 * GET /api/v1/reports/workload-pdf
 * Generates and streams official BMSCE Faculty Workload Audit Report PDF
 */
reportsRouter.get('/workload-pdf', async (req: Request, res: Response) => {
  try {
    const pdfBuffer = await generateFacultyWorkloadPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="BMSCE_Faculty_Workload_Report.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('[ReportsRouter] Faculty Workload PDF generation failed:', error);
    res.status(500).json({ success: false, error: 'Failed to generate faculty workload PDF: ' + error.message });
  }
});

