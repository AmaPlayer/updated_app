/**
 * Event Submission Gallery Component
 * Displays videos from other participants
 */

import React, { useState } from 'react';
import { Play, User, Award } from 'lucide-react';
import { EventSubmission } from '../../types/models/submission';
import './EventSubmissionGallery.css';

interface EventSubmissionGalleryProps {
  submissions: EventSubmission[];
  loading?: boolean;
  currentUserId?: string;
  showRanks?: boolean;
}

export function EventSubmissionGallery({
  submissions,
  loading = false,
  currentUserId,
  showRanks = false,
}: EventSubmissionGalleryProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<EventSubmission | null>(null);

  if (loading) {
    return (
      <div className="submission-gallery">
        <div className="gallery-loading">
          <div className="spinner" />
          <p>Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="submission-gallery">
        <div className="gallery-empty">
          <p>📹 No submissions yet</p>
          <p className="empty-hint">Be the first to submit!</p>
        </div>
      </div>
    );
  }

  const getMedalEmoji = (rank?: 1 | 2 | 3 | 4 | 5) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      case 4:
        return '⭐';
      case 5:
        return '⭐';
      default:
        return null;
    }
  };

  return (
    <div className="submission-gallery">
      <div className="gallery-header">
        <h4>Participant Videos ({submissions.length})</h4>
      </div>

      <div className="gallery-grid">
        {submissions.map((submission) => (
          <div
            key={submission.id}
            className={`submission-card ${
              submission.userId === currentUserId ? 'current-user' : ''
            } ${submission.rank ? 'ranked' : ''}`}
            onClick={() => setSelectedSubmission(submission)}
          >
            {/* Thumbnail with play button */}
            <div className="submission-thumbnail">
              <video
                src={submission.videoUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div className="play-overlay">
                <Play className="play-icon" />
              </div>

              {/* Rank badge */}
              {submission.rank && showRanks && (
                <div className={`rank-badge rank-${submission.rank}`}>
                  <span className="medal">{getMedalEmoji(submission.rank)}</span>
                  <span className="rank-label">{submission.prize || `Place ${submission.rank}`}</span>
                </div>
              )}

              {/* Current user badge */}
              {submission.userId === currentUserId && (
                <div className="current-user-badge">You</div>
              )}
            </div>

            {/* Submission info */}
            <div className="submission-info">
              <div className="user-info">
                {submission.userAvatar ? (
                  <img
                    src={submission.userAvatar}
                    alt={submission.userName}
                    className="user-avatar"
                  />
                ) : (
                  <div className="user-avatar-placeholder">
                    <User className="placeholder-icon" />
                  </div>
                )}
                <div className="user-details">
                  <p className="user-name">{submission.userName}</p>
                  <p className="submission-title">{submission.title}</p>
                </div>
              </div>

              {submission.rank && showRanks && (
                <div className="rank-badge-inline">
                  <Award className="award-icon" />
                  <span>{submission.prize}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Video Modal */}
      {selectedSubmission && (
        <div className="video-modal" onClick={() => setSelectedSubmission(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-button"
              onClick={() => setSelectedSubmission(null)}
            >
              ✕
            </button>

            <div className="modal-video-container">
              <video
                src={selectedSubmission.videoUrl}
                controls
                autoPlay
                className="modal-video"
              />
            </div>

            <div className="modal-info">
              <h3>{selectedSubmission.title}</h3>
              <p className="user-name">{selectedSubmission.userName}</p>
              {selectedSubmission.description && (
                <p className="description">{selectedSubmission.description}</p>
              )}
              {selectedSubmission.rank && showRanks && (
                <div className="rank-info">
                  <span className="medal">{getMedalEmoji(selectedSubmission.rank)}</span>
                  <span>{selectedSubmission.prize || `${selectedSubmission.rank}${['st', 'nd', 'rd'][selectedSubmission.rank - 1]} Place`}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventSubmissionGallery;
