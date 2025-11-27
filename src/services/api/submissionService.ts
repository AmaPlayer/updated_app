/**
 * Event Submission Service
 * Handles video submission operations for events
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { eventsDb as db } from '../../lib/firebase-events';
import { EventSubmission, CreateSubmissionData, UpdateSubmissionData } from '../../types/models/submission';

class SubmissionService {
  private collectionName = 'eventSubmissions';

  /**
   * Create a new submission
   */
  async createSubmission(data: CreateSubmissionData): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        uploadedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Submission created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating submission:', error);
      throw error;
    }
  }

  /**
   * Update a submission
   */
  async updateSubmission(submissionId: string, updates: UpdateSubmissionData): Promise<void> {
    try {
      const submissionRef = doc(db, this.collectionName, submissionId);
      await updateDoc(submissionRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Submission updated:', submissionId);
    } catch (error) {
      console.error('❌ Error updating submission:', error);
      throw error;
    }
  }

  /**
   * Delete a submission
   */
  async deleteSubmission(submissionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, submissionId));
      console.log('✅ Submission deleted:', submissionId);
    } catch (error) {
      console.error('❌ Error deleting submission:', error);
      throw error;
    }
  }

  /**
   * Get all submissions for an event
   */
  async getEventSubmissions(eventId: string): Promise<EventSubmission[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('eventId', '==', eventId),
        orderBy('uploadedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const submissions: EventSubmission[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        submissions.push({
          id: doc.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate?.() || data.uploadedAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        } as EventSubmission);
      });

      console.log(`Found ${submissions.length} submissions for event ${eventId}`);
      return submissions;
    } catch (error) {
      console.error('❌ Error fetching event submissions:', error);
      throw error;
    }
  }

  /**
   * Get user's submission for a specific event
   */
  async getUserSubmissionForEvent(eventId: string, userId: string): Promise<EventSubmission | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('eventId', '==', eventId),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        uploadedAt: data.uploadedAt?.toDate?.() || data.uploadedAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      } as EventSubmission;
    } catch (error) {
      console.error('❌ Error fetching user submission:', error);
      throw error;
    }
  }

  /**
   * Get submitted submissions (not draft) for an event
   */
  async getSubmittedSubmissions(eventId: string): Promise<EventSubmission[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('eventId', '==', eventId),
        where('status', '==', 'submitted'),
        orderBy('uploadedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const submissions: EventSubmission[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        submissions.push({
          id: doc.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate?.() || data.uploadedAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        } as EventSubmission);
      });

      return submissions;
    } catch (error) {
      console.error('❌ Error fetching submitted submissions:', error);
      throw error;
    }
  }

  /**
   * Get user's submissions
   */
  async getUserSubmissions(userId: string): Promise<EventSubmission[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('uploadedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const submissions: EventSubmission[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        submissions.push({
          id: doc.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate?.() || data.uploadedAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        } as EventSubmission);
      });

      return submissions;
    } catch (error) {
      console.error('❌ Error fetching user submissions:', error);
      throw error;
    }
  }

  /**
   * Check if user has submitted for an event
   */
  async hasUserSubmitted(eventId: string, userId: string): Promise<boolean> {
    try {
      const submission = await this.getUserSubmissionForEvent(eventId, userId);
      return submission !== null && submission.status === 'submitted';
    } catch (error) {
      console.error('❌ Error checking submission status:', error);
      return false;
    }
  }

  /**
   * Update submission rank and prize (admin only)
   */
  async updateSubmissionRank(
    submissionId: string,
    rank: 1 | 2 | 3,
    prize: string
  ): Promise<void> {
    try {
      await this.updateSubmission(submissionId, {
        rank,
        prize,
      });

      console.log(`✅ Submission ${submissionId} ranked ${rank} with prize: ${prize}`);
    } catch (error) {
      console.error('❌ Error updating submission rank:', error);
      throw error;
    }
  }

  /**
   * Get submission count for an event
   */
  async getSubmissionCount(eventId: string): Promise<number> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('eventId', '==', eventId),
        where('status', '==', 'submitted')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('❌ Error getting submission count:', error);
      return 0;
    }
  }
}

export const submissionService = new SubmissionService();
export default submissionService;
