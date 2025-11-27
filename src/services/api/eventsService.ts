// Events service for main app - connects to Firebase events-db database
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { eventsDb as db } from '../../lib/firebase-events';
import { Event, EventStatus, CompetitionStatus, LeaderboardEntry, WinnerEntry } from '../../types/models/event';
import { EventSubmission } from '../../types/models/submission';

/**
 * Events service providing business logic for event operations
 */
class EventsService {
  private collectionName: string;

  constructor() {
    this.collectionName = 'events';
  }

  /**
   * Get all active events for the main app
   */
  async getActiveEvents(): Promise<Event[]> {
    try {
      console.log('Fetching active events from Firebase...');
      
      const q = query(
        collection(db, this.collectionName),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const events: Event[] = [];
      
      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        events.push({
          id: doc.id,
          ...eventData,
          // Convert Firebase timestamps to JavaScript Date objects
          date: eventData.date,
          createdAt: eventData.createdAt?.toDate?.() || eventData.createdAt,
          updatedAt: eventData.updatedAt?.toDate?.() || eventData.updatedAt
        } as Event);
      });
      
      console.log(`Found ${events.length} active events`);
      return events;
    } catch (error) {
      console.error('Error fetching active events:', error);
      return [];
    }
  }

  /**
   * Get all events (for comprehensive display)
   */
  async getAllEvents(): Promise<Event[]> {
    try {
      console.log('Fetching all events from Firebase...');
      const startTime = performance.now();

      const q = query(
        collection(db, this.collectionName),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const events: Event[] = [];

      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        events.push({
          id: doc.id,
          ...eventData,
          // Convert Firebase timestamps
          date: eventData.date,
          createdAt: eventData.createdAt?.toDate?.() || eventData.createdAt,
          updatedAt: eventData.updatedAt?.toDate?.() || eventData.updatedAt
        } as Event);
      });

      // Sort by date (newest first for admin-created events)
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const endTime = performance.now();
      console.log(`Found ${events.length} active events in ${(endTime - startTime).toFixed(2)}ms`);
      return events;
    } catch (error) {
      console.error('Error fetching all events:', error);
      return [];
    }
  }

  /**
   * Convert admin event format to app event format
   */
  formatEventForApp(adminEvent: Event): Event {
    return {
      id: adminEvent.id,
      title: adminEvent.title,
      date: adminEvent.date,
      location: adminEvent.location,
      category: adminEvent.category || 'Event',
      description: adminEvent.description || 'No description available',
      image: adminEvent.imageUrl || 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=200&fit=crop',
      imageUrl: adminEvent.imageUrl,
      status: this.getEventStatus(adminEvent),
      participants: `${adminEvent.maxParticipants || 'Unlimited'} participants`,
      maxParticipants: adminEvent.maxParticipants,
      priority: 'medium',
      registrationUrl: adminEvent.registrationUrl,
      organizer: adminEvent.organizer || 'AmaPlayer',
      contactEmail: adminEvent.contactEmail,
      contactPhone: adminEvent.contactPhone,
      requirements: adminEvent.requirements || [],
      prizes: adminEvent.prizes || [],
      tags: adminEvent.tags || [],
      isActive: adminEvent.isActive,
      startTime: adminEvent.startTime,
      duration: adminEvent.duration,
      createdAt: adminEvent.createdAt,
      updatedAt: adminEvent.updatedAt
    };
  }

  /**
   * Determine event status based on date, time, and duration
   */
  getEventStatus(event: Event): EventStatus {
    const now = new Date();
    const eventDate = new Date(event.date);
    const todayDate = new Date();
    
    // Check if event is on the same date (ignoring time)
    const isSameDay = eventDate.toDateString() === todayDate.toDateString();
    
    // If event has start time, use it; otherwise default to 00:00
    const eventStartDate = new Date(event.date);
    if (event.startTime) {
      const [hours, minutes] = event.startTime.split(':').map(Number);
      eventStartDate.setHours(hours, minutes, 0, 0);
    }
    
    // Calculate event end time
    let eventEndDate = new Date(eventStartDate);
    if (event.duration) {
      // Duration in hours (e.g., 2.5 for 2 hours 30 minutes)
      eventEndDate.setHours(eventEndDate.getHours() + Math.floor(event.duration));
      eventEndDate.setMinutes(eventEndDate.getMinutes() + ((event.duration % 1) * 60));
    } else {
      // Default duration of 8 hours for same-day events, 2 hours for others
      const defaultDuration = isSameDay ? 8 : 2;
      eventEndDate.setHours(eventEndDate.getHours() + defaultDuration);
    }
    
    // Determine status with preference for live on same day
    if (eventDate > todayDate) {
      return 'upcoming';
    } else if (isSameDay) {
      // If it's the same day, show as live unless duration has clearly ended
      if (now > eventEndDate) {
        return 'completed';
      } else {
        return 'live';
      }
    } else if (now >= eventStartDate && now <= eventEndDate) {
      return 'live';
    } else {
      return 'completed';
    }
  }

  /**
   * Get detailed competition status for display
   */
  getCompetitionStatus(event: Event): CompetitionStatus {
    const status = this.getEventStatus(event);
    const now = new Date();
    const eventDate = new Date(event.date);
    const isSameDay = eventDate.toDateString() === now.toDateString();
    
    switch (status) {
      case 'upcoming':
        return {
          status: 'upcoming',
          displayText: 'Competition Opens Soon',
          statusClass: 'status-upcoming'
        };
      case 'live':
        if (isSameDay) {
          return {
            status: 'live',
            displayText: 'Competition Ongoing',
            statusClass: 'status-live'
          };
        } else {
          return {
            status: 'live',
            displayText: 'Competition Ongoing',
            statusClass: 'status-live'
          };
        }
      case 'completed':
      default:
        return {
          status: 'completed',
          displayText: 'Competition Ended',
          statusClass: 'status-completed'
        };
    }
  }

  /**
   * Get events by status (upcoming, live, completed)
   */
  async getEventsByStatus(status: EventStatus): Promise<Event[]> {
    try {
      const allEvents = await this.getAllEvents();
      const formattedEvents = allEvents.map(event => this.formatEventForApp(event));
      
      return formattedEvents.filter(event => event.status === status);
    } catch (error) {
      console.error(`Error fetching ${status} events:`, error);
      return [];
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(): Promise<Event[]> {
    return this.getEventsByStatus('upcoming');
  }

  /**
   * Get live events
   */
  async getLiveEvents(): Promise<Event[]> {
    return this.getEventsByStatus('live');
  }

  /**
   * Get completed events
   */
  async getCompletedEvents(): Promise<Event[]> {
    return this.getEventsByStatus('completed');
  }

  /**
   * Declare winners for an event with admin authorization
   * @param eventId - The event ID
   * @param winners - Array of winner entries with submissionId, userId, and rank
   * @param currentUserId - The admin user ID declaring winners
   * @returns Updated event with leaderboard
   */
  async declareWinners(
    eventId: string,
    winners: WinnerEntry[],
    currentUserId: string
  ): Promise<Event | null> {
    try {
      console.log(`🏆 Declaring winners for event ${eventId}...`);

      // Get the event
      const eventRef = doc(db, this.collectionName, eventId);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        console.error(`Event ${eventId} not found`);
        return null;
      }

      const event = { id: eventSnap.id, ...eventSnap.data() } as Event;

      // Fetch submission details for each winner
      const leaderboard: LeaderboardEntry[] = [];

      for (const winner of winners) {
        try {
          const submissionRef = doc(db, 'eventSubmissions', winner.submissionId);
          const submissionSnap = await getDoc(submissionRef);

          if (submissionSnap.exists()) {
            const submission = { id: submissionSnap.id, ...submissionSnap.data() } as EventSubmission;
            leaderboard.push({
              rank: winner.rank as 1 | 2 | 3 | 4 | 5,
              userId: winner.userId,
              userName: submission.userName,
              userAvatar: submission.userAvatar,
              submissionId: winner.submissionId,
              score: 0
            });
          }
        } catch (error) {
          console.error(`Error fetching submission ${winner.submissionId}:`, error);
        }
      }

      // Create batch write for atomicity
      const batch = writeBatch(db);

      // Update event with leaderboard
      batch.update(eventRef, {
        leaderboard,
        eventState: 'results_declared',
        winnersAnnouncedAt: Timestamp.now(),
        announcedBy: currentUserId
      });

      // Update each winner submission with rank
      for (const winner of winners) {
        const submissionRef = doc(db, 'eventSubmissions', winner.submissionId);
        batch.update(submissionRef, {
          rank: winner.rank
        });
      }

      // Commit batch
      await batch.commit();

      console.log(`✅ Winners declared successfully for event ${eventId}:`, {
        winnerCount: leaderboard.length,
        declaredBy: currentUserId
      });

      // Return updated event
      return {
        ...event,
        leaderboard,
        eventState: 'results_declared',
        winnersAnnouncedAt: new Date(),
        announcedBy: currentUserId
      };
    } catch (error) {
      console.error('Error declaring winners:', error);
      return null;
    }
  }

  /**
   * Update the leaderboard for an event (reranking, adding/removing winners)
   * @param eventId - The event ID
   * @param leaderboard - Updated leaderboard entries
   * @param currentUserId - The admin user ID making the update
   * @returns Updated event
   */
  async updateLeaderboard(
    eventId: string,
    leaderboard: LeaderboardEntry[],
    currentUserId: string
  ): Promise<Event | null> {
    try {
      console.log(`📊 Updating leaderboard for event ${eventId}...`);

      const eventRef = doc(db, this.collectionName, eventId);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        console.error(`Event ${eventId} not found`);
        return null;
      }

      const event = { id: eventSnap.id, ...eventSnap.data() } as Event;

      // Create batch write
      const batch = writeBatch(db);

      // Update event leaderboard
      batch.update(eventRef, {
        leaderboard,
        updatedAt: Timestamp.now()
      });

      // Update submission ranks
      for (const entry of leaderboard) {
        const submissionRef = doc(db, 'eventSubmissions', entry.submissionId);
        batch.update(submissionRef, {
          rank: entry.rank
        });
      }

      await batch.commit();

      console.log(`✅ Leaderboard updated successfully:`, {
        eventId,
        winnerCount: leaderboard.length,
        updatedBy: currentUserId
      });

      return {
        ...event,
        leaderboard,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      return null;
    }
  }

  /**
   * Get event with full leaderboard details
   * @param eventId - The event ID
   * @returns Event with populated leaderboard
   */
  async getEventWithLeaderboard(eventId: string): Promise<Event | null> {
    try {
      console.log(`📋 Fetching event with leaderboard: ${eventId}`);

      const eventRef = doc(db, this.collectionName, eventId);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        console.error(`Event ${eventId} not found`);
        return null;
      }

      const eventData = eventSnap.data();
      const event: Event = {
        id: eventSnap.id,
        ...eventData,
        createdAt: eventData.createdAt?.toDate?.() || eventData.createdAt,
        updatedAt: eventData.updatedAt?.toDate?.() || eventData.updatedAt,
        winnersAnnouncedAt: eventData.winnersAnnouncedAt?.toDate?.() || eventData.winnersAnnouncedAt
      } as Event;

      console.log(`✅ Event with leaderboard retrieved:`, {
        eventId: event.id,
        winnerCount: event.leaderboard?.length || 0
      });

      return event;
    } catch (error) {
      console.error('Error fetching event with leaderboard:', error);
      return null;
    }
  }

  /**
   * Check if user can declare winners for an event
   * Currently only admins can declare winners
   * @param userId - The user ID to check
   * @param adminIds - Array of admin user IDs (from event or app config)
   * @returns Whether user is authorized to declare winners
   */
  canDeclareWinners(userId: string, adminIds?: string[]): boolean {
    // If adminIds is provided, check if user is in the admin list
    if (adminIds && Array.isArray(adminIds)) {
      return adminIds.includes(userId);
    }

    // TODO: Implement more robust admin check
    // This could check:
    // 1. Firebase custom claims
    // 2. User document admin field
    // 3. App-level admin list from config
    // For now, return false if no admin list provided
    return false;
  }
}

export const eventsService = new EventsService();
export default eventsService;
