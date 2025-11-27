/**
 * Event Leaderboard Component
 * Displays declared winners with medals and rankings
 */

import React from 'react';
import { Trophy } from 'lucide-react';
import { Event } from '../../types/models/event';
import './EventLeaderboard.css';

interface EventLeaderboardProps {
  event: Event;
}

export function EventLeaderboard({ event }: EventLeaderboardProps) {
  if (!event.leaderboard || event.leaderboard.length === 0) {
    return null;
  }

  const medals = ['🥇', '🥈', '🥉', '⭐', '⭐'];
  const placeLabels = ['1st', '2nd', '3rd', '4th', '5th'];

  // Format the announcement date
  const formatAnnouncementDate = () => {
    if (!event.winnersAnnouncedAt) return 'Recently';

    let date: Date;
    if (event.winnersAnnouncedAt instanceof Date) {
      date = event.winnersAnnouncedAt;
    } else if (typeof event.winnersAnnouncedAt === 'object' && 'toDate' in event.winnersAnnouncedAt) {
      // Handle Firestore Timestamp
      date = (event.winnersAnnouncedAt as any).toDate();
    } else {
      date = new Date();
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="event-leaderboard">
      <div className="leaderboard-header">
        <div className="header-title">
          <Trophy className="trophy-icon" />
          <h3>Competition Results</h3>
        </div>
        <p className="announcement-date">
          Winners announced on {formatAnnouncementDate()}
        </p>
      </div>

      <div className="leaderboard-container">
        {/* Top 3 Visual Podium */}
        {event.leaderboard.length >= 1 && (
          <div className="podium-section">
            <div className="podium-grid">
              {/* 2nd Place */}
              {event.leaderboard.length >= 2 && (
                <div className="podium-spot second-place">
                  <div className="podium-rank">🥈</div>
                  <div className="podium-content">
                    <div className="podium-image">
                      {event.leaderboard[1].userAvatar ? (
                        <img
                          src={event.leaderboard[1].userAvatar}
                          alt={event.leaderboard[1].userName}
                        />
                      ) : (
                        <div className="avatar-placeholder">👤</div>
                      )}
                    </div>
                    <div className="podium-info">
                      <p className="podium-name">{event.leaderboard[1].userName}</p>
                      <p className="podium-label">2nd Place</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place (Center) */}
              <div className="podium-spot first-place">
                <div className="podium-rank">🥇</div>
                <div className="podium-content">
                  <div className="podium-image">
                    {event.leaderboard[0].userAvatar ? (
                      <img
                        src={event.leaderboard[0].userAvatar}
                        alt={event.leaderboard[0].userName}
                      />
                    ) : (
                      <div className="avatar-placeholder">👤</div>
                    )}
                  </div>
                  <div className="podium-info">
                    <p className="podium-name">{event.leaderboard[0].userName}</p>
                    <p className="podium-label">1st Place</p>
                  </div>
                </div>
                <div className="winner-crown">👑</div>
              </div>

              {/* 3rd Place */}
              {event.leaderboard.length >= 3 && (
                <div className="podium-spot third-place">
                  <div className="podium-rank">🥉</div>
                  <div className="podium-content">
                    <div className="podium-image">
                      {event.leaderboard[2].userAvatar ? (
                        <img
                          src={event.leaderboard[2].userAvatar}
                          alt={event.leaderboard[2].userName}
                        />
                      ) : (
                        <div className="avatar-placeholder">👤</div>
                      )}
                    </div>
                    <div className="podium-info">
                      <p className="podium-name">{event.leaderboard[2].userName}</p>
                      <p className="podium-label">3rd Place</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Winners (4th, 5th) */}
        {event.leaderboard.length > 3 && (
          <div className="additional-winners">
            {event.leaderboard.slice(3).map((winner, index) => {
              const rank = index + 4;
              const medal = medals[rank - 1];
              const placeLabel = placeLabels[rank - 1];

              return (
                <div key={winner.userId} className="additional-winner">
                  <div className="winner-rank">
                    <span className="medal">{medal}</span>
                    <span className="place">{placeLabel}</span>
                  </div>
                  <div className="winner-avatar">
                    {winner.userAvatar ? (
                      <img src={winner.userAvatar} alt={winner.userName} />
                    ) : (
                      <div className="avatar-placeholder-small">👤</div>
                    )}
                  </div>
                  <div className="winner-name">{winner.userName}</div>
                  {winner.prize && (
                    <div className="winner-prize">{winner.prize}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Rankings List */}
        <div className="rankings-list">
          <h4>Final Rankings</h4>
          <div className="rankings-table">
            {event.leaderboard.map((winner, index) => (
              <div key={winner.userId} className="ranking-row">
                <div className="ranking-position">
                  <span className="medal-large">{medals[index]}</span>
                </div>
                <div className="ranking-info">
                  <p className="ranking-name">{winner.userName}</p>
                  {winner.prize && (
                    <p className="ranking-prize">Prize: {winner.prize}</p>
                  )}
                </div>
                <div className="ranking-label">
                  {index === 0 && 'Champion'}
                  {index === 1 && 'Runner-up'}
                  {index === 2 && 'Third Place'}
                  {index > 2 && `${placeLabels[index]} Place`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Celebration Banner */}
      <div className="leaderboard-banner">
        <p>Congratulations to all winners! 🎉</p>
      </div>
    </div>
  );
}

export default EventLeaderboard;
