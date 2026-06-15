import React, { useState } from 'react';
import { Star, X, Send, CheckCircle2 } from 'lucide-react';
import { API_URL } from '../config';

export default function FeedbackModal({ isOpen, onClose, username, type = 'general' }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          rating,
          message,
          type
        })
      });

      if (response.ok) {
        setIsSubmitted(true);
        setTimeout(() => {
          onClose();
          setIsSubmitted(false);
          setRating(0);
          setMessage('');
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal-content">
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        
        {isSubmitted ? (
          <div className="success-state">
            <CheckCircle2 size={48} className="text-green" />
            <h3>Thank You!</h3>
            <p>Your feedback helps us make Codefora better.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3>How was your experience?</h3>
            <p className="subtitle">
              {type === 'problem_solve' ? "Congratulations on solving the problem! " : "We'd love to hear your thoughts."}
            </p>

            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-btn ${(hover || rating) >= star ? 'active' : ''}`}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(star)}
                >
                  <Star fill={(hover || rating) >= star ? 'currentColor' : 'none'} size={32} />
                </button>
              ))}
            </div>

            <div className="textarea-group">
              <label>Suggestions or complaints?</label>
              <textarea
                placeholder="Tell us what you liked or what could be improved..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
              />
              <span className="char-count">{message.length}/500</span>
            </div>

            <button 
              type="submit" 
              className="submit-btn" 
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? "Sending..." : (
                <>
                  <Send size={18} /> Send Feedback
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .feedback-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fade-in 0.3s ease;
        }
        .feedback-modal-content {
          background: #111;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 32px;
          width: 100%;
          max-width: 450px;
          position: relative;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          transition: color 0.2s;
        }
        .close-btn:hover { color: #fff; }
        
        h3 { margin: 0 0 8px 0; color: #fff; font-size: 1.5rem; text-align: center; }
        .subtitle { color: #888; font-size: 0.95rem; text-align: center; margin-bottom: 24px; }
        
        .star-rating {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 32px;
        }
        .star-btn {
          background: none;
          border: none;
          color: #333;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .star-btn:hover { transform: scale(1.2); }
        .star-btn.active { color: #FFD700; filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.4)); }
        
        .textarea-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }
        .textarea-group label { color: #aaa; font-size: 0.9rem; font-weight: 500; }
        .textarea-group textarea {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 12px;
          color: #eee;
          min-height: 120px;
          resize: vertical;
          font-family: inherit;
        }
        .textarea-group textarea:focus { border-color: var(--primary-color); outline: none; }
        .char-count { align-self: flex-end; font-size: 0.75rem; color: #555; }
        
        .submit-btn {
          width: 100%;
          padding: 14px;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .submit-btn:hover:not(:disabled) { background: #ff8e38; transform: translateY(-2px); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }
        
        .success-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 0;
          text-align: center;
        }
        .text-green { color: #10b981; margin-bottom: 20px; }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
