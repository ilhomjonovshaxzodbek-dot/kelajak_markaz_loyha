import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import type { CenterStateSnapshot, TrialRegistration } from '../shared/types';

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

export async function loadCloudStateForSession(options: {
  isStaff: boolean;
  isAdministrator: boolean;
  emailVerified: boolean;
}): Promise<Partial<CenterStateSnapshot> | null> {
  const merged: Partial<CenterStateSnapshot> = {};
  let hasAnyCloudData = false;

  // 1. Load public non-PII catalog
  try {
    const pubSnap = await getDoc(doc(db, 'center_public', 'catalog'));
    if (pubSnap.exists()) {
      const data = pubSnap.data();
      if (Array.isArray(data.courses)) merged.courses = data.courses;
      if (Array.isArray(data.groups)) merged.groups = data.groups;
      if (Array.isArray(data.rewards)) merged.rewards = data.rewards;
      if (Array.isArray(data.telegramCommunities)) {
        merged.telegramCommunities = data.telegramCommunities;
      }
      if (Array.isArray(data.quizzes)) merged.quizzes = data.quizzes;
      if (Array.isArray(data.certificates)) merged.certificates = data.certificates;
      if (data.contactInfo && typeof data.contactInfo === 'object') {
        const ci = data.contactInfo as Record<string, unknown>;
        merged.contactInfo = {
          phones: String(ci.phones ?? ''),
          workingHours: String(ci.workingHours ?? ''),
          address: String(ci.address ?? ''),
          description: String(ci.description ?? ''),
        };
      }
      hasAnyCloudData = true;
    }
  } catch (err) {
    console.warn('Public catalog cloud read failed:', err);
  }

  // 2. If verified staff (teacher/administrator/admin), load operational state
  if (options.isStaff && options.emailVerified) {
    try {
      const opsSnap = await getDoc(doc(db, 'center_ops', 'state'));
      if (opsSnap.exists()) {
        const data = opsSnap.data();
        if (Array.isArray(data.teachers)) merged.teachers = data.teachers;
        if (Array.isArray(data.students)) merged.students = data.students;
        if (Array.isArray(data.homeworkTasks)) merged.homeworkTasks = data.homeworkTasks;
        if (Array.isArray(data.submissions)) merged.submissions = data.submissions;
        if (Array.isArray(data.registrations)) merged.registrations = data.registrations;
        if (Array.isArray(data.notifications)) merged.notifications = data.notifications;
        if (Array.isArray(data.payments)) merged.payments = data.payments;
        if (Array.isArray(data.quizAttempts)) merged.quizAttempts = data.quizAttempts;
        if (Array.isArray(data.rewardOrders)) merged.rewardOrders = data.rewardOrders;
        hasAnyCloudData = true;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'center_ops/state');
    }
  }

  // 3. If verified administrator/admin, merge any newly submitted trial_leads from Firestore
  if (options.isAdministrator && options.emailVerified) {
    try {
      const leadsSnap = await getDocs(collection(db, 'trial_leads'));
      const cloudLeads: TrialRegistration[] = [];
      leadsSnap.forEach((d) => {
        const ld = d.data();
        cloudLeads.push({
          id: ld.id as string,
          fullName: ld.fullName as string,
          phone: ld.phone as string,
          courseTitle: ld.courseTitle as string,
          preferredTime: ld.preferredTime as string,
          source: 'web',
          createdAt: 'Bulutdan sinxronlangan',
          status: (ld.status as 'new' | 'confirmed') || 'new',
        });
      });

      if (cloudLeads.length > 0) {
        const existingIds = new Set((merged.registrations ?? []).map((r) => r.id));
        const extra = cloudLeads.filter((l) => !existingIds.has(l.id));
        if (extra.length > 0) {
          merged.registrations = [...extra, ...(merged.registrations ?? [])];
          hasAnyCloudData = true;
        }
      }
    } catch (err) {
      console.warn('Trial leads sync skipped:', err);
    }
  }

  return hasAnyCloudData ? merged : null;
}

export async function persistCenterStateToCloud(
  snapshot: CenterStateSnapshot
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) return;

  const publicPayload = stripUndefined({
    courses: snapshot.courses.slice(0, 100),
    groups: snapshot.groups.slice(0, 150),
    rewards: snapshot.rewards.slice(0, 100),
    telegramCommunities: snapshot.telegramCommunities.slice(0, 60),
    quizzes: snapshot.quizzes.slice(0, 100),
    certificates: snapshot.certificates.slice(0, 300),
    contactInfo: {
      phones: (snapshot.contactInfo?.phones ?? '').slice(0, 160),
      workingHours: (snapshot.contactInfo?.workingHours ?? '').slice(0, 160),
      address: (snapshot.contactInfo?.address ?? '').slice(0, 240),
      description: (snapshot.contactInfo?.description ?? '').slice(0, 400),
    },
    updatedBy: currentUser.uid,
    updatedAt: serverTimestamp(),
  });

  const opsPayload = stripUndefined({
    teachers: snapshot.teachers.slice(0, 100),
    students: snapshot.students.slice(0, 400),
    homeworkTasks: snapshot.homeworkTasks.slice(0, 200),
    submissions: snapshot.submissions.slice(0, 300),
    registrations: snapshot.registrations.slice(0, 300),
    notifications: snapshot.notifications.slice(0, 100),
    payments: snapshot.payments.slice(0, 400),
    quizAttempts: snapshot.quizAttempts.slice(0, 400),
    rewardOrders: snapshot.rewardOrders.slice(0, 300),
    updatedBy: currentUser.uid,
    updatedAt: serverTimestamp(),
  });

  try {
    await setDoc(doc(db, 'center_public', 'catalog'), publicPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'center_public/catalog');
  }

  try {
    await setDoc(doc(db, 'center_ops', 'state'), opsPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'center_ops/state');
  }
}

export async function savePublicTrialLeadToCloud(lead: {
  id: string;
  fullName: string;
  phone: string;
  courseTitle: string;
  preferredTime: string;
}): Promise<void> {
  try {
    await setDoc(doc(db, 'trial_leads', lead.id), {
      id: lead.id,
      fullName: lead.fullName.slice(0, 120),
      phone: lead.phone.slice(0, 40),
      courseTitle: lead.courseTitle.slice(0, 160),
      preferredTime: lead.preferredTime.slice(0, 80),
      status: 'new',
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not persist trial lead to Firestore:', err);
  }
}

export async function syncTrialLeadStatusInCloud(
  leadId: string,
  action: 'confirm' | 'delete'
): Promise<void> {
  try {
    const ref = doc(db, 'trial_leads', leadId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    if (action === 'confirm') {
      await updateDoc(ref, { status: 'confirmed' });
    } else {
      await deleteDoc(ref);
    }
  } catch (err) {
    console.warn('Could not update trial lead in Firestore:', err);
  }
}

export async function loadStudentLinkFromCloud(
  uid: string
): Promise<{ studentId: string; studentName: string } | null> {
  try {
    const snap = await getDoc(doc(db, 'student_links', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      studentId: data.studentId as string,
      studentName: data.studentName as string,
    };
  } catch {
    return null;
  }
}

export async function saveStudentLinkToCloud(
  uid: string,
  studentId: string,
  studentName: string
): Promise<void> {
  try {
    await setDoc(doc(db, 'student_links', uid), {
      uid,
      studentId: studentId.slice(0, 128),
      studentName: studentName.slice(0, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `student_links/${uid}`);
  }
}
