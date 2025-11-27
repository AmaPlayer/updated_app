import CommentSection from '../../common/comments/CommentSection';

interface VideoCommentsProps {
  momentId: string;
  isVisible: boolean;
  onClose: () => void;
  isPostVideo?: boolean; // Flag to indicate if this is a post video
}

/**
 * VideoComments Component (Modal Wrapper)
 *
 * Displays comments for a video moment in a modal dialog.
 * Now uses the centralized CommentSection component with real-time updates.
 */
const VideoComments: React.FC<VideoCommentsProps> = ({
  momentId,
  isVisible,
  onClose,
  isPostVideo = false
}) => {
  if (!isVisible) {
    return null;
  }

  // Determine content type based on isPostVideo flag
  const contentType = isPostVideo ? ('post' as const) : ('moment' as const);

  return (
    <div
      className="video-comments-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comments-title"
      onClick={(e) => {
        // Close modal if clicking on overlay background
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="video-comments-container">
        <div className="comments-header">
          <h3 id="comments-title">Comments</h3>
          <button
            className="close-comments-btn"
            onClick={onClose}
            aria-label="Close comments dialog"
            tabIndex={0}
          >
            ×
          </button>
        </div>

        <div className="comments-content">
          {/* Centralized Real-Time Comment System */}
          <CommentSection
            contentId={momentId}
            contentType={contentType}
            className="video-modal-comments"
          />
        </div>
      </div>
    </div>
  );
};

export default VideoComments;