import PDFDocument from 'pdfkit';
import { db } from "../db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import {
  users,
  medications,
  medicationLogs,
  doseEscalations,
  weightLogs,
  bodyMeasurements,
  foodEntries,
  hungerLogs,
  dailyStreaks,
  userGoals,
  type User,
  type Medication,
  type MedicationLog,
  type DoseEscalation,
  type WeightLog,
  type BodyMeasurement,
  type HungerLog,
  type DailyStreak,
  type UserGoal,
} from "@shared/schema";

interface ReportData {
  user: User;
  medications: Medication[];
  medicationLogs: MedicationLog[];
  doseEscalations: DoseEscalation[];
  weightLogs: WeightLog[];
  bodyMeasurements: BodyMeasurement[];
  hungerLogs: HungerLog[];
  streaks: DailyStreak[];
  goals: UserGoal[];
  nutritionSummary: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    daysTracked: number;
    totalDays: number;
  };
}

interface SideEffectSummary {
  nausea: { average: number; trend: 'improving' | 'stable' | 'worsening' };
  vomiting: { average: number; trend: 'improving' | 'stable' | 'worsening' };
  diarrhea: { average: number; trend: 'improving' | 'stable' | 'worsening' };
  constipation: { average: number; trend: 'improving' | 'stable' | 'worsening' };
  heartburn: { average: number; trend: 'improving' | 'stable' | 'worsening' };
}

export class PdfExportService {
  /**
   * Generate a healthcare provider PDF report
   */
  async generateHealthcareReport(
    userId: string,
    options: {
      period: '30days' | '60days' | '90days' | 'all';
      format: 'detailed' | 'summary';
    }
  ): Promise<Buffer> {
    // Calculate date range
    const endDate = new Date();
    let startDate: Date;

    switch (options.period) {
      case '30days':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '60days':
        startDate = new Date(endDate.getTime() - 60 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = new Date('2020-01-01'); // Effectively all time
        break;
    }

    // Fetch all data
    const reportData = await this.fetchReportData(userId, startDate, endDate);

    // Generate PDF
    return this.renderPdf(reportData, startDate, endDate, options.format);
  }

  private async fetchReportData(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ReportData> {
    const [
      userResult,
      medicationsResult,
      medicationLogsResult,
      doseEscalationsResult,
      weightLogsResult,
      bodyMeasurementsResult,
      hungerLogsResult,
      streaksResult,
      goalsResult,
      nutritionResult,
    ] = await Promise.all([
      // User
      db.select().from(users).where(eq(users.id, userId)).limit(1),

      // Medications
      db.select().from(medications).where(eq(medications.userId, userId)),

      // Medication logs in date range
      db.select()
        .from(medicationLogs)
        .where(
          and(
            eq(medicationLogs.userId, userId),
            gte(medicationLogs.takenAt, startDate),
            lte(medicationLogs.takenAt, endDate)
          )
        )
        .orderBy(desc(medicationLogs.takenAt)),

      // Dose escalations
      db.select()
        .from(doseEscalations)
        .where(eq(doseEscalations.userId, userId))
        .orderBy(desc(doseEscalations.escalationDate)),

      // Weight logs in date range
      db.select()
        .from(weightLogs)
        .where(
          and(
            eq(weightLogs.userId, userId),
            gte(weightLogs.loggedAt, startDate),
            lte(weightLogs.loggedAt, endDate)
          )
        )
        .orderBy(desc(weightLogs.loggedAt)),

      // Body measurements
      db.select()
        .from(bodyMeasurements)
        .where(eq(bodyMeasurements.userId, userId))
        .orderBy(desc(bodyMeasurements.measuredAt))
        .limit(2),

      // Hunger logs in date range
      db.select()
        .from(hungerLogs)
        .where(
          and(
            eq(hungerLogs.userId, userId),
            gte(hungerLogs.loggedAt, startDate),
            lte(hungerLogs.loggedAt, endDate)
          )
        ),

      // Streaks
      db.select().from(dailyStreaks).where(eq(dailyStreaks.userId, userId)),

      // Active goals
      db.select()
        .from(userGoals)
        .where(and(eq(userGoals.userId, userId), eq(userGoals.isActive, true))),

      // Nutrition summary
      db.select({
        avgCalories: sql<number>`COALESCE(AVG(${foodEntries.calories}), 0)`,
        avgProtein: sql<number>`COALESCE(AVG(${foodEntries.protein}), 0)`,
        avgCarbs: sql<number>`COALESCE(AVG(${foodEntries.carbs}), 0)`,
        avgFat: sql<number>`COALESCE(AVG(${foodEntries.fat}), 0)`,
        daysTracked: sql<number>`COUNT(DISTINCT DATE(${foodEntries.consumedAt}))`,
      })
        .from(foodEntries)
        .where(
          and(
            eq(foodEntries.userId, userId),
            gte(foodEntries.consumedAt, startDate),
            lte(foodEntries.consumedAt, endDate)
          )
        ),
    ]);

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      user: userResult[0]!,
      medications: medicationsResult,
      medicationLogs: medicationLogsResult,
      doseEscalations: doseEscalationsResult,
      weightLogs: weightLogsResult,
      bodyMeasurements: bodyMeasurementsResult,
      hungerLogs: hungerLogsResult,
      streaks: streaksResult,
      goals: goalsResult,
      nutritionSummary: {
        avgCalories: Number(nutritionResult[0]?.avgCalories ?? 0),
        avgProtein: Number(nutritionResult[0]?.avgProtein ?? 0),
        avgCarbs: Number(nutritionResult[0]?.avgCarbs ?? 0),
        avgFat: Number(nutritionResult[0]?.avgFat ?? 0),
        daysTracked: Number(nutritionResult[0]?.daysTracked ?? 0),
        totalDays,
      },
    };
  }

  private async renderPdf(
    data: ReportData,
    startDate: Date,
    endDate: Date,
    format: 'detailed' | 'summary'
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      this.renderHeader(doc, data, startDate, endDate);

      // Patient Information
      this.renderPatientSection(doc, data.user);

      // Medication Summary
      if (data.medications.length > 0) {
        this.renderMedicationSection(doc, data);
      }

      // Side Effects
      if (data.medicationLogs.length > 0) {
        this.renderSideEffectsSection(doc, data.medicationLogs);
      }

      // Weight Progress
      if (data.weightLogs.length > 0) {
        this.renderWeightSection(doc, data);
      }

      // Nutrition Summary
      if (data.nutritionSummary.daysTracked > 0) {
        this.renderNutritionSection(doc, data.nutritionSummary);
      }

      // Appetite Response
      if (data.hungerLogs.length > 0) {
        this.renderAppetiteSection(doc, data.hungerLogs);
      }

      // Adherence & Engagement
      this.renderAdherenceSection(doc, data);

      // Goals Progress
      if (data.goals.length > 0) {
        this.renderGoalsSection(doc, data.goals);
      }

      // Footer
      this.renderFooter(doc);

      doc.end();
    });
  }

  private renderHeader(
    doc: PDFKit.PDFDocument,
    data: ReportData,
    startDate: Date,
    endDate: Date
  ): void {
    doc.fontSize(20).font('Helvetica-Bold').text('SEMASLIM HEALTH REPORT', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Patient Progress Summary for Healthcare Provider', { align: 'center' });
    doc.moveDown(0.5);

    const dateFormat = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    doc.fontSize(10).text(`Generated: ${dateFormat(new Date())}`, { align: 'center' });
    doc.text(`Report Period: ${dateFormat(startDate)} - ${dateFormat(endDate)}`, { align: 'center' });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);
  }

  private renderPatientSection(doc: PDFKit.PDFDocument, user: User): void {
    doc.fontSize(14).font('Helvetica-Bold').text('PATIENT INFORMATION');
    doc.moveDown(0.3);

    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Not provided';
    const age = user.dateOfBirth
      ? Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;
    const dob = user.dateOfBirth
      ? new Date(user.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'Not provided';

    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${name}`, { continued: true });
    doc.text(`    DOB: ${dob}${age ? ` (${age}y)` : ''}`, { align: 'right' });

    const heightStr = user.height ? `${Math.floor(user.height / 2.54 / 12)}'${Math.round(user.height / 2.54 % 12)}" (${user.height} cm)` : 'Not provided';
    const startWeight = user.currentWeight ? `${user.currentWeight} lbs` : 'Not provided';

    doc.text(`Height: ${heightStr}`, { continued: true });
    doc.text(`    Starting Weight: ${startWeight}`, { align: 'right' });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);
  }

  private renderMedicationSection(doc: PDFKit.PDFDocument, data: ReportData): void {
    if (doc.y > 650) doc.addPage();

    doc.fontSize(14).font('Helvetica-Bold').text('MEDICATION SUMMARY');
    doc.moveDown(0.3);

    const med = data.medications[0];
    const medNames: Record<string, string> = {
      ozempic: 'Ozempic (semaglutide)',
      mounjaro: 'Mounjaro (tirzepatide)',
      wegovy: 'Wegovy (semaglutide)',
      rybelsus: 'Rybelsus (semaglutide)',
    };

    doc.fontSize(10).font('Helvetica');
    doc.text(`Medication: ${medNames[med.medicationType] || med.medicationType}`);
    doc.text(`Current Dose: ${med.dosage} ${med.frequency}`);

    const startDate = new Date(med.startDate);
    const weeks = Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    doc.text(`Treatment Duration: ${weeks} weeks`);
    doc.text(`Overall Adherence: ${med.adherenceScore || 100}%`);

    // Dose escalation history
    if (data.doseEscalations.length > 0) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Dose Escalation History:');
      doc.font('Helvetica');
      data.doseEscalations.slice(0, 5).forEach((esc) => {
        const date = new Date(esc.escalationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        doc.text(`  • ${date}: ${esc.previousDose} → ${esc.newDose}`);
      });
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);
  }

  private renderSideEffectsSection(doc: PDFKit.PDFDocument, logs: MedicationLog[]): void {
    if (doc.y > 600) doc.addPage();

    doc.fontSize(14).font('Helvetica-Bold').text('SIDE EFFECTS (Report Period)');
    doc.moveDown(0.3);

    const summary = this.calculateSideEffectSummary(logs);

    doc.fontSize(10).font('Helvetica');

    const effects = [
      { name: 'Nausea', data: summary.nausea },
      { name: 'Vomiting', data: summary.vomiting },
      { name: 'Diarrhea', data: summary.diarrhea },
      { name: 'Constipation', data: summary.constipation },
      { name: 'Heartburn', data: summary.heartburn },
    ];

    const trendSymbols: Record<string, string> = {
      improving: '↓ Improving',
      stable: '→ Stable',
      worsening: '↑ Worsening',
    };

    effects.forEach((effect) => {
      const avgStr = effect.data.average.toFixed(1);
      const trendStr = trendSymbols[effect.data.trend];
      doc.text(`${effect.name}:`.padEnd(15) + `${avgStr}/5`.padEnd(10) + trendStr);
    });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);
  }

  private renderWeightSection(doc: PDFKit.PDFDocument, data: ReportData): void {
    if (doc.y > 600) doc.addPage();

    doc.fontSize(14).font('Helvetica-Bold').text('WEIGHT PROGRESS');
    doc.moveDown(0.3);

    const sortedLogs = [...data.weightLogs].sort(
      (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
    );

    const startWeight = sortedLogs[0] ? Number(sortedLogs[0].weight) : null;
    const currentWeight = sortedLogs[sortedLogs.length - 1] ? Number(sortedLogs[sortedLogs.length - 1].weight) : null;
    const targetWeight = data.user.targetWeight ? Number(data.user.targetWeight) : null;

    doc.fontSize(10).font('Helvetica');

    if (startWeight && currentWeight) {
      const totalLost = startWeight - currentWeight;
      const percentLost = ((totalLost / startWeight) * 100).toFixed(1);
      const weeks = Math.max(1, sortedLogs.length);
      const weeklyAvg = (totalLost / weeks).toFixed(1);

      doc.text(`Starting Weight: ${startWeight.toFixed(1)} lbs`, { continued: true });
      doc.text(`    Target: ${targetWeight ? `${targetWeight.toFixed(1)} lbs` : 'Not set'}`, { align: 'right' });

      doc.text(`Current Weight: ${currentWeight.toFixed(1)} lbs`, { continued: true });
      if (targetWeight) {
        const toGoal = currentWeight - targetWeight;
        doc.text(`    To Goal: ${toGoal.toFixed(1)} lbs`, { align: 'right' });
      } else {
        doc.text('');
      }

      doc.text(`Total Lost: ${totalLost.toFixed(1)} lbs (${percentLost}% body weight)`);
      doc.text(`Weekly Average: ${weeklyAvg} lbs/week`);
    }

    // Body composition if available
    const latestMeasurement = data.bodyMeasurements[0];
    if (latestMeasurement) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Body Composition:');
      doc.font('Helvetica');
      if (latestMeasurement.bodyFat) {
        doc.text(`  • Body Fat: ${Number(latestMeasurement.bodyFat).toFixed(1)}%`);
      }
      if (latestMeasurement.muscleMass) {
        doc.text(`  • Muscle Mass: ${Number(latestMeasurement.muscleMass).toFixed(1)}%`);
      }
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);
  }

  private renderNutritionSection(
    doc: PDFKit.PDFDocument,
    summary: ReportData['nutritionSummary']
  ): void {
    if (doc.y > 650) doc.addPage();

    doc.fontSize(14).font('Helvetica-Bold').text('NUTRITION SUMMARY (Daily Averages)');
    doc.moveDown(0.3);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Calories: ${Math.round(summary.avgCalories)} kcal`);
    doc.text(`Protein: ${Math.round(summary.avgProtein)}g`);
    doc.text(`Carbs: ${Math.round(summary.avgCarbs)}g`);
    doc.text(`Fat: ${Math.round(summary.avgFat)}g`);

    const trackingPercent = ((summary.daysTracked / summary.totalDays) * 100).toFixed(0);
    doc.moveDown(0.3);
    doc.text(`Tracking Consistency: ${trackingPercent}% of days logged`);

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);
  }

  private renderAppetiteSection(doc: PDFKit.PDFDocument, logs: HungerLog[]): void {
    if (doc.y > 650) doc.addPage();

    doc.fontSize(14).font('Helvetica-Bold').text('APPETITE RESPONSE TO MEDICATION');
    doc.moveDown(0.3);

    const avgBefore = logs.reduce((sum, l) => sum + l.hungerBefore, 0) / logs.length;
    const avgAfter = logs.filter(l => l.hungerAfter).reduce((sum, l) => sum + (l.hungerAfter || 0), 0) /
      logs.filter(l => l.hungerAfter).length || 0;
    const suppression = avgBefore > 0 ? ((avgBefore - avgAfter) / avgBefore * 100) : 0;
    const avgFullness = logs.filter(l => l.fullnessDuration).reduce((sum, l) => sum + (l.fullnessDuration || 0), 0) /
      logs.filter(l => l.fullnessDuration).length || 0;

    doc.fontSize(10).font('Helvetica');
    doc.text(`Pre-meal Hunger (avg): ${avgBefore.toFixed(1)}/10`);
    doc.text(`Post-meal Hunger (avg): ${avgAfter.toFixed(1)}/10`);
    doc.text(`Appetite Suppression: ${suppression.toFixed(0)}% reduction`);
    doc.text(`Avg Fullness Duration: ${avgFullness.toFixed(1)} hours`);

    // Cravings analysis
    const cravings = logs.filter(l => l.cravingType);
    if (cravings.length > 0) {
      const cravingCounts: Record<string, number> = {};
      cravings.forEach(l => {
        if (l.cravingType) {
          cravingCounts[l.cravingType] = (cravingCounts[l.cravingType] || 0) + 1;
        }
      });
      const dominant = Object.entries(cravingCounts).sort((a, b) => b[1] - a[1])[0];
      if (dominant) {
        doc.text(`Dominant Craving Type: ${dominant[0]}`);
      }
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);
  }

  private renderAdherenceSection(doc: PDFKit.PDFDocument, data: ReportData): void {
    if (doc.y > 650) doc.addPage();

    doc.fontSize(14).font('Helvetica-Bold').text('ADHERENCE & ENGAGEMENT');
    doc.moveDown(0.3);

    doc.fontSize(10).font('Helvetica');

    // Medication adherence
    const med = data.medications[0];
    if (med) {
      doc.text(`Medication Adherence: ${med.adherenceScore || 100}%`);
    }

    // Streaks
    const trackingStreak = data.streaks.find(s => s.streakType === 'food_tracking');
    const medStreak = data.streaks.find(s => s.streakType === 'medication');

    if (trackingStreak) {
      doc.text(`Food Tracking Streak: ${trackingStreak.currentStreak} days (best: ${trackingStreak.longestStreak})`);
    }
    if (medStreak) {
      doc.text(`Medication Streak: ${medStreak.currentStreak} days (best: ${medStreak.longestStreak})`);
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);
  }

  private renderGoalsSection(doc: PDFKit.PDFDocument, goals: UserGoal[]): void {
    if (doc.y > 650) doc.addPage();

    doc.fontSize(14).font('Helvetica-Bold').text('GOALS PROGRESS');
    doc.moveDown(0.3);

    doc.fontSize(10).font('Helvetica');

    goals.slice(0, 5).forEach((goal) => {
      const progress = goal.currentValue && goal.targetValue
        ? (Number(goal.currentValue) / Number(goal.targetValue) * 100)
        : 0;
      const status = progress >= 100 ? '✓' : '◐';
      const progressStr = progress >= 100 ? 'ACHIEVED' : `${progress.toFixed(0)}% complete`;

      doc.text(`${status} ${goal.goalType.replace(/_/g, ' ')}: ${progressStr}`);
    });

    doc.moveDown(1);
  }

  private renderFooter(doc: PDFKit.PDFDocument): void {
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(8).font('Helvetica').fillColor('#666666');
    doc.text('This report was generated by SemaSlim, a patient-managed GLP-1 medication companion app.', { align: 'center' });
    doc.text('Data is self-reported and should be verified with clinical measurements.', { align: 'center' });
    doc.moveDown(0.3);
    doc.text('For questions: support@semaslim.com', { align: 'center' });
  }

  private calculateSideEffectSummary(logs: MedicationLog[]): SideEffectSummary {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

    const recent = logs.filter(l => new Date(l.takenAt) >= twoWeeksAgo);
    const previous = logs.filter(l => {
      const date = new Date(l.takenAt);
      return date >= fourWeeksAgo && date < twoWeeksAgo;
    });

    const calcEffect = (field: keyof Pick<MedicationLog, 'nausea' | 'vomiting' | 'diarrhea' | 'constipation' | 'heartburn'>) => {
      const recentAvg = recent.length > 0
        ? recent.reduce((sum, l) => sum + (l[field] || 0), 0) / recent.length
        : 0;
      const previousAvg = previous.length > 0
        ? previous.reduce((sum, l) => sum + (l[field] || 0), 0) / previous.length
        : recentAvg;

      let trend: 'improving' | 'stable' | 'worsening' = 'stable';
      if (recentAvg < previousAvg - 0.5) trend = 'improving';
      else if (recentAvg > previousAvg + 0.5) trend = 'worsening';

      return { average: recentAvg, trend };
    };

    return {
      nausea: calcEffect('nausea'),
      vomiting: calcEffect('vomiting'),
      diarrhea: calcEffect('diarrhea'),
      constipation: calcEffect('constipation'),
      heartburn: calcEffect('heartburn'),
    };
  }
}

// Export singleton instance
export const pdfExportService = new PdfExportService();
