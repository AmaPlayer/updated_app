import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import NavigationBar from '../../components/layout/NavigationBar';
import FooterNav from '../../components/layout/FooterNav';
import eventsService from '../../services/api/eventsService';
import participationService from '../../services/api/participationService';
import submissionService from '../../services/api/submissionService';
import { Event, WinnerEntry } from '../../types/models/event';
import { EventSubmission } from '../../types/models/submission';
import { useEventSubmissions } from '../../hooks/useEventSubmissions';
import EventSubmissionForm from '../../components/events/EventSubmissionForm';
import EventSubmissionGallery from '../../components/events/EventSubmissionGallery';
import { WinnerSelector } from '../../components/events/WinnerSelector';
import { EventLeaderboard } from '../../components/events/EventLeaderboard';
import './Events.css';

type TabType = 'upcoming' | 'live' | 'past';

interface EventWithStatus extends Event {
  calculatedStatus: 'upcoming' | 'live' | 'completed';
}

export default function Events() {
  const { currentUser, isGuest } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventWithStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Submission modal state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [userParticipation, setUserParticipation] = useState<string | null>(null);
  const [userSubmission, setUserSubmission] = useState<EventSubmission | null>(null);

  // Winner declaration state
  const [showWinnerSelector, setShowWinnerSelector] = useState(false);
  const [declaringWinners, setDeclaringWinners] = useState(false);
  const [winnerDeclareError, setWinnerDeclareError] = useState<string>('');

  // Real-time submissions for selected event
  const { submissions: eventSubmissions, loading: submissionsLoading } = useEventSubmissions(
    selectedEvent?.id || '',
    { onlySubmitted: true }
  );

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📍 Starting to load events...');
      const startTime = performance.now();

      const allEvents = await eventsService.getAllEvents();
      const endTime = performance.now();

      console.log(`✅ Events fetched in ${(endTime - startTime).toFixed(2)}ms:`, allEvents.length);

      // Calculate status ONCE when loading
      const eventsWithStatus: EventWithStatus[] = allEvents.map(event => ({
        ...event,
        calculatedStatus: (event.status as any) || eventsService.getEventStatus(event)
      }));
      setEvents(eventsWithStatus);
      console.log('Events loaded and processed:', eventsWithStatus.length);
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleClick = (): void => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadEvents();
  };

  // Handle winner declaration
  const handleDeclareWinners = async (winners: WinnerEntry[]): Promise<void> => {
    if (!selectedEvent || !currentUser) return;

    try {
      setDeclaringWinners(true);
      setWinnerDeclareError('');

      const updatedEvent = await eventsService.declareWinners(
        selectedEvent.id!,
        winners,
        currentUser.uid
      );

      if (updatedEvent) {
        // Update the selected event and events list
        setSelectedEvent(updatedEvent);
        setEvents(events.map(e => e.id === updatedEvent.id ? { ...updatedEvent, calculatedStatus: e.calculatedStatus } : e));
        setShowWinnerSelector(false);
        console.log('✅ Winners declared successfully');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to declare winners';
      setWinnerDeclareError(errorMessage);
      console.error('Error declaring winners:', err);
    } finally {
      setDeclaringWinners(false);
    }
  };

  // Handle event button click (Interested/Join)
  const handleEventButtonClick = async (event: Event) => {
    if (isGuest()) {
      alert('Please log in to participate in events');
      return;
    }

    if (!currentUser) {
      alert('Please log in');
      return;
    }

    setSelectedEvent(event);
    setShowSubmissionModal(true);

    // Check user's participation
    try {
      const participation = await participationService.getParticipation(event.id!, currentUser.uid);
      setUserParticipation(participation?.type || null);

      // Get user's existing submission
      const submission = await submissionService.getUserSubmissionForEvent(event.id!, currentUser.uid);
      setUserSubmission(submission);

      console.log('✅ User participation:', participation?.type);
      console.log('✅ User submission:', submission?.id);
    } catch (err) {
      console.error('❌ Error loading participation:', err);
    }
  };

  // Handle submission modal close
  const handleCloseSubmissionModal = () => {
    setShowSubmissionModal(false);
    setSelectedEvent(null);
    setUserParticipation(null);
    setUserSubmission(null);
  };

  // Handle submission success
  const handleSubmissionSuccess = async (submission: EventSubmission) => {
    setUserSubmission(submission);
    console.log('✅ Submission updated:', submission.id);
  };

  // Memoize filtered events and counts
  const { eventsByTab, tabCounts } = useMemo(() => {
    const upcomingEvents = events.filter(e => e.calculatedStatus === 'upcoming');
    const liveEvents = events.filter(e => e.calculatedStatus === 'live');
    const pastEvents = events.filter(e => e.calculatedStatus === 'completed');

    const filtered = activeTab === 'upcoming' ? upcomingEvents :
                     activeTab === 'live' ? liveEvents : pastEvents;

    return {
      eventsByTab: filtered,
      tabCounts: {
        upcoming: upcomingEvents.length,
        live: liveEvents.length,
        past: pastEvents.length
      }
    };
  }, [events, activeTab]);

  return (
    <div className="events">
      <NavigationBar
        currentUser={currentUser}
        isGuest={isGuest()}
        onTitleClick={handleTitleClick}
        title="Events"
      />

      <div className="main-content events-content">
        {loading ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <div className="loading-spinner"></div>
            <p>Loading events...</p>
          </div>
        ) : error ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#ff4757'
          }}>
            <p>{error}</p>
            <button
              onClick={loadEvents}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Events Header */}
            <div className="events-header">
              <h1 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                Upcoming Events
              </h1>
              <p style={{ color: 'var(--text-secondary)', margin: '0' }}>
                Discover amazing sports events and competitions
              </p>
            </div>

            {/* Event Tabs */}
            <div className="events-tabs">
              <button
                className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming ({tabCounts.upcoming})
              </button>
              <button
                className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`}
                onClick={() => setActiveTab('live')}
              >
                Live ({tabCounts.live})
              </button>
              <button
                className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
                onClick={() => setActiveTab('past')}
              >
                Past ({tabCounts.past})
              </button>
            </div>

            {/* Events Grid */}
            <div className="events-grid">
              {eventsByTab.length === 0 ? (
                <div className="empty-events-state">
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>
                    No {activeTab} Events
                  </h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    There are currently no {activeTab} events to display.
                  </p>
                </div>
              ) : (
                eventsByTab.map((event) => {
                  const statusColor = event.calculatedStatus === 'live' ? '#ff4757' :
                                    event.calculatedStatus === 'upcoming' ? 'var(--accent-primary)' : '#2ed573';
                  const buttonText = event.calculatedStatus === 'live' ? 'Watch Live' :
                                    event.calculatedStatus === 'upcoming' ? 'Interested' : 'View Results';

                  return (
                    <div key={event.id} className="event-card">
                      <div className="event-image">
                        <img
                          src={event.imageUrl || event.image || 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=200&fit=crop'}
                          alt={event.title}
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=200&fit=crop';
                          }}
                        />
                        <div className="status-badge" style={{
                          background: statusColor,
                          color: 'white'
                        }}>
                          {event.calculatedStatus.toUpperCase()}
                        </div>
                      </div>

                      <div className="event-content">
                        <h3 className="event-title">{event.title}</h3>

                        {event.category && (
                          <div className="event-category">
                            {event.category}
                          </div>
                        )}

                        <div className="event-details">
                          <div className="event-detail">
                            <span>📅 {new Date(event.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}</span>
                          </div>
                          {event.startTime && (
                            <div className="event-detail">
                              <span>⏰ {event.startTime}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="event-detail">
                              <span>📍 {event.location}</span>
                            </div>
                          )}
                        </div>

                        {event.description && (
                          <p className="event-description">{event.description}</p>
                        )}

                        {event.maxParticipants && (
                          <div className="event-meta">
                            👥 Max {event.maxParticipants} participants
                          </div>
                        )}

                        <button
                          className="event-btn"
                          onClick={() => handleEventButtonClick(event)}
                        >
                          {buttonText}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <FooterNav />

      {/* Submission Modal */}
      {showSubmissionModal && selectedEvent && currentUser && (
        <div className="submission-modal-overlay" onClick={handleCloseSubmissionModal}>
          <div
            className="submission-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="submission-modal-header">
              <div className="modal-title-section">
                <h2>{selectedEvent.title}</h2>
                <p className="event-subtitle">{selectedEvent.category}</p>
              </div>
              <button
                className="modal-close-btn"
                onClick={handleCloseSubmissionModal}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="submission-modal-body">
              {/* Event Requirements */}
              {selectedEvent.eventRequirements && (
                <div className="event-requirements">
                  <h4>📋 Requirements</h4>
                  <p>{selectedEvent.eventRequirements.description}</p>
                  {selectedEvent.eventRequirements.criteria && (
                    <ul className="criteria-list">
                      {selectedEvent.eventRequirements.criteria.map((criterion, i) => (
                        <li key={i}>{criterion}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Winner Declaration Section for Admins */}
              {selectedEvent.eventState === 'submissions_closed' && selectedEvent.submissionDeadline && eventSubmissions.length > 0 && (
                <div style={{ paddingTop: '16px', marginTop: '16px', borderTop: '2px solid #e0e0e0' }}>
                  <button
                    onClick={() => setShowWinnerSelector(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      backgroundColor: '#fbbf24',
                      color: '#78350f',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    }}
                  >
                    🏆 Declare Winners
                  </button>
                  {winnerDeclareError && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}>
                      {winnerDeclareError}
                    </div>
                  )}
                </div>
              )}

              {/* Tabs */}
              <div className="submission-tabs">
                <button className="tab-btn active">📤 Submit Video</button>
                <button className="tab-btn">👥 Gallery ({eventSubmissions.length})</button>
              </div>

              {/* Two Column Layout */}
              <div className="submission-columns">
                {/* Left: Submission Form */}
                <div className="submission-column form-column">
                  <EventSubmissionForm
                    eventId={selectedEvent.id!}
                    userId={currentUser.uid}
                    userName={currentUser.displayName || 'Anonymous'}
                    userAvatar={currentUser.photoURL || undefined}
                    submissionDeadline={selectedEvent.submissionDeadline}
                    onSubmissionSuccess={handleSubmissionSuccess}
                    existingSubmission={userSubmission || undefined}
                  />
                </div>

                {/* Right: Gallery */}
                <div className="submission-column gallery-column">
                  <EventSubmissionGallery
                    submissions={eventSubmissions}
                    loading={submissionsLoading}
                    currentUserId={currentUser.uid}
                    showRanks={selectedEvent.eventState === 'results_declared'}
                  />
                </div>
              </div>

              {/* Leaderboard Display (when winners are declared) */}
              {selectedEvent.eventState === 'results_declared' && (
                <EventLeaderboard event={selectedEvent} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Winner Selector Modal */}
      {showWinnerSelector && selectedEvent && eventSubmissions.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ padding: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                  🏆 Declare Winners - {selectedEvent.title}
                </h3>
                <button
                  onClick={() => setShowWinnerSelector(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#9ca3af'
                  }}
                >
                  ✕
                </button>
              </div>

              <WinnerSelector
                submissions={eventSubmissions}
                winnerCount={selectedEvent.winnerCount || 3}
                onDeclareWinners={handleDeclareWinners}
                onCancel={() => setShowWinnerSelector(false)}
                loading={declaringWinners}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
