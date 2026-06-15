import React, { useState } from 'react';
import { Star, Send, CheckCircle2, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import { API_URL } from '../config';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';

export default function FeedbackPage() {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user?.displayName || user?.email?.split('@')[0] || 'Anonymous',
          rating,
          message,
          type: 'direct_page'
        })
      });

      if (response.ok) {
        setIsSubmitted(true);
        setTimeout(() => {
          setIsSubmitted(false);
          setRating(0);
          setMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-page-root">
      <Navbar />
      
      <main className="feedback-container">
        <div className="feedback-header">
          <h1>We value your feedback</h1>
          <p>Help us shape the future of Codefora. Your suggestions and reports go directly to our team.</p>
        </div>

        <div className="feedback-grid">
          <div className="feedback-card main-form">
            {isSubmitted ? (
              <div className="success-full">
                <CheckCircle2 size={64} className="text-green" />
                <h2>Feedback Received!</h2>
                <p>Thank you for taking the time to help us improve. We'll look into your suggestions right away.</p>
                <button className="button-dark" onClick={() => setIsSubmitted(false)}>Send another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="rating-section">
                  <label>Overall Experience</label>
                  <div className="star-rating-large">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star-btn-lg ${(hover || rating) >= star ? 'active' : ''}`}
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(star)}
                      >
                        <Star fill={(hover || rating) >= star ? 'currentColor' : 'none'} size={40} />
                      </button>
                    ))}
                  </div>
                  <span className="rating-desc">
                    {rating === 5 ? "Excellent!" : rating === 4 ? "Very Good" : rating === 3 ? "Good" : rating === 2 ? "Fair" : rating === 1 ? "Poor" : "Select a rating"}
                  </span>
                </div>

                <div className="input-field">
                  <label>Your Message</label>
                  <textarea
                    placeholder="Tell us about your experience, report a bug, or suggest a new feature..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={1000}
                  />
                  <div className="field-footer">
                    <span>Be descriptive for better results</span>
                    <span>{message.length}/1000</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="submit-btn-full" 
                  disabled={isSubmitting || rating === 0}
                >
                  {isSubmitting ? "Sending..." : (
                    <>
                      <Send size={18} /> Submit Feedback
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="info-sidebar">
            <div className="info-item">
              <div className="info-icon orange"><Sparkles size={20} /></div>
              <div>
                <h4>Feature Requests</h4>
                <p>Want a new language or tool? Let us know what you need to code better.</p>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon red"><AlertCircle size={20} /></div>
              <div>
                <h4>Report a Bug</h4>
                <p>Found something broken? Give us the details and we'll squash it.</p>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon blue"><MessageSquare size={20} /></div>
              <div>
                <h4>General Support</h4>
                <p>Have questions about how Codefora works? We're here to help.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .feedback-page-root {
          min-height: 100vh;
          background: #050505;
          color: #fff;
        }
        .feedback-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 80px 20px;
        }
        .feedback-header {
          text-align: center;
          margin-bottom: 60px;
        }
        .feedback-header h1 {
          font-size: 3rem;
          margin-bottom: 16px;
          background: linear-gradient(to bottom, #fff, #888);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .feedback-header p {
          color: #888;
          font-size: 1.1rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .feedback-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 40px;
        }

        .feedback-card {
          background: #0d0d0d;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px;
          padding: 40px;
        }

        .rating-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 40px;
        }
        .rating-section label { color: #888; font-size: 0.9rem; margin-bottom: 16px; }
        .star-rating-large { display: flex; gap: 16px; }
        .star-btn-lg {
          background: none; border: none; color: #1a1a1a; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .star-btn-lg:hover { transform: scale(1.15); color: #444; }
        .star-btn-lg.active { color: var(--primary-color); filter: drop-shadow(0 0 12px rgba(var(--primary-rgb), 0.3)); }
        .rating-desc { margin-top: 12px; font-size: 0.9rem; color: var(--primary-color); font-weight: 500; }

        .input-field { display: flex; flex-direction: column; gap: 10px; margin-bottom: 30px; }
        .input-field label { color: #aaa; font-size: 0.95rem; }
        .input-field textarea {
          background: #151515; border: 1px solid #222; border-radius: 16px;
          padding: 20px; color: #eee; min-height: 200px; resize: none; font-size: 1rem;
          transition: all 0.2s;
        }
        .input-field textarea:focus { border-color: var(--primary-color); background: #1a1a1a; outline: none; }
        .field-footer { display: flex; justify-content: space-between; font-size: 0.8rem; color: #444; }

        .submit-btn-full {
          width: 100%; padding: 18px; background: var(--primary-color); color: white;
          border: none; border-radius: 16px; font-weight: 700; font-size: 1.1rem;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          cursor: pointer; transition: all 0.3s;
        }
        .submit-btn-full:hover:not(:disabled) { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(var(--primary-rgb), 0.2); }
        .submit-btn-full:disabled { opacity: 0.3; cursor: not-allowed; }

        .info-sidebar { display: flex; flex-direction: column; gap: 24px; }
        .info-item {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.03);
          border-radius: 20px; padding: 24px; display: flex; gap: 20px;
        }
        .info-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .info-icon.orange { background: rgba(var(--primary-rgb), 0.1); color: var(--primary-color); }
        .info-icon.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .info-icon.blue { background: rgba(0, 229, 255, 0.1); color: #00E5FF; }
        .info-item h4 { margin: 0 0 4px 0; color: #fff; }
        .info-item p { margin: 0; font-size: 0.85rem; color: #666; line-height: 1.5; }

        .success-full {
          display: flex; flex-direction: column; align-items: center;
          text-align: center; padding: 60px 0;
        }
        .success-full h2 { margin: 24px 0 12px 0; }
        .success-full p { color: #666; margin-bottom: 30px; }
        .button-dark {
          background: #1a1a1a; color: #fff; border: 1px solid #333;
          padding: 10px 24px; border-radius: 8px; cursor: pointer;
        }

        @media (max-width: 850px) {
          .feedback-grid { grid-template-columns: 1fr; }
          .feedback-header h1 { font-size: 2.2rem; }
        }
      `}</style>
    </div>
  );
}
