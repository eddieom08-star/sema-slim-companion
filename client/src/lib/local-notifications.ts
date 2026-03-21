import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Request notification permission from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const { display } = await LocalNotifications.checkPermissions();
  if (display === 'granted') return true;

  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
}

/**
 * Generate a stable numeric ID from a medication UUID string.
 * Local notifications require numeric IDs.
 */
function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Schedule a repeating medication reminder notification.
 */
export async function scheduleMedicationReminder(medication: {
  id: string;
  medicationType: string;
  dosage: string;
  frequency: string; // 'daily' | 'weekly'
  reminderTime: string; // 'HH:MM'
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const notifId = hashId(medication.id);
  const [hours, minutes] = medication.reminderTime.split(':').map(Number);

  const medName = medication.medicationType.charAt(0).toUpperCase() + medication.medicationType.slice(1);

  // Cancel any existing notification for this medication first
  await cancelMedicationReminder(medication.id);

  if (medication.frequency === 'daily') {
    // Schedule daily repeating notification
    await LocalNotifications.schedule({
      notifications: [{
        id: notifId,
        title: 'Medication Reminder',
        body: `Time to take your ${medication.dosage} ${medName}`,
        schedule: {
          on: { hour: hours, minute: minutes },
          repeats: true,
          allowWhileIdle: true,
        },
        sound: 'default',
        smallIcon: 'ic_stat_icon_config_sample',
        actionTypeId: 'MEDICATION_REMINDER',
      }],
    });
  } else {
    // Weekly — schedule on same weekday, recurring
    // Use `every: 'week'` with a specific day/time
    await LocalNotifications.schedule({
      notifications: [{
        id: notifId,
        title: 'Medication Reminder',
        body: `Time to take your ${medication.dosage} ${medName}`,
        schedule: {
          on: {
            hour: hours,
            minute: minutes,
            weekday: new Date().getDay() + 1, // iOS uses 1-7 (Sun-Sat)
          },
          repeats: true,
          allowWhileIdle: true,
        },
        sound: 'default',
        smallIcon: 'ic_stat_icon_config_sample',
        actionTypeId: 'MEDICATION_REMINDER',
      }],
    });
  }
}

/**
 * Cancel a scheduled reminder for a specific medication.
 */
export async function cancelMedicationReminder(medicationId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const notifId = hashId(medicationId);
  await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
}

/**
 * Reschedule all reminders from a list of medications.
 * Call on app startup to ensure reminders survive app restarts.
 */
export async function rescheduleAllReminders(medications: Array<{
  id: string;
  medicationType: string;
  dosage: string;
  frequency: string;
  reminderEnabled: boolean;
  reminderTime: string;
}>): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  for (const med of medications) {
    if (med.reminderEnabled && med.reminderTime) {
      await scheduleMedicationReminder(med);
    } else {
      await cancelMedicationReminder(med.id);
    }
  }
}
