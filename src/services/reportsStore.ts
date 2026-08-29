import type { FieldReport } from '../types/fire';

const REPORTS_STORAGE_KEY = 'firewatcher_field_reports';

export function getFieldReports(): FieldReport[] {
  try {
    const saved = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (saved) {
      const parsed: FieldReport[] = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.error('Failed to parse saved reports:', err);
  }
  return [];
}

export function saveFieldReports(reports: FieldReport[]): void {
  try {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.error('Failed to save reports:', err);
  }
}

export function clearFieldReports(): void {
  localStorage.removeItem(REPORTS_STORAGE_KEY);
}

export function addFieldReport(newReport: Omit<FieldReport, 'id' | 'createdAt' | 'verified' | 'upvotes'>): FieldReport {
  const reports = getFieldReports();
  const created: FieldReport = {
    ...newReport,
    id: `rep-user-${Date.now()}`,
    createdAt: new Date().toISOString(),
    verified: false,
    upvotes: 1,
  };
  const updated = [created, ...reports];
  saveFieldReports(updated);
  return created;
}

export function upvoteFieldReport(reportId: string): FieldReport[] {
  const reports = getFieldReports();
  const updated = reports.map((r) =>
    r.id === reportId ? { ...r, upvotes: r.upvotes + 1 } : r
  );
  saveFieldReports(updated);
  return updated;
}
