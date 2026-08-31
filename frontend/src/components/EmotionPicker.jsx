import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import '../styles/emotion-picker.css';

export default function EmotionPicker({ selectedEmotion, onSelectEmotion, category = 'general' }) {
  const [emotions, setEmotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const comparableId = (emotionId = '') => emotionId.replace(/\.(webp|png|jpg|jpeg)$/i, '');
  const selectedAvatar = emotions.find(
    (emotion) => comparableId(emotion.id) === comparableId(selectedEmotion),
  );

  useEffect(() => {
    const fetchEmotions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/emotions?category=${category}`);
        if (!response.ok) throw new Error('Failed to fetch emotions');
        const data = await response.json();
        setEmotions(data);
      } catch (error) {
        console.error('Error fetching emotions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmotions();
  }, [category]);

  if (loading) {
    return (
      <div className="emotion-picker-loading">
        <div className="spinner" />
        <span>Loading Codefora Emotions...</span>
      </div>
    );
  }

  return (
    <div className="emotion-picker-container" data-theme={category}>
      <div className="emotion-picker-preview" aria-live="polite">
        <div className="emotion-preview-image-wrapper">
          {selectedAvatar ? (
            <img
              src={`${API_URL}/api/emotions/${selectedAvatar.id}/image`}
              alt={selectedAvatar.name}
              className="emotion-preview-image"
            />
          ) : (
            <span className="emotion-preview-placeholder">?</span>
          )}
        </div>
        <div className="emotion-preview-copy">
          <span className="emotion-preview-label">Selected avatar</span>
          <strong>{selectedAvatar ? `Avatar ${emotions.indexOf(selectedAvatar) + 1}` : 'Choose an avatar'}</strong>
          <span>{selectedAvatar?.pose || 'Select a pose below'}</span>
        </div>
      </div>

      <div className="emotion-grid">
        {emotions.map((emotion, index) => {
          const avatarLabel = `Avatar ${index + 1}`;
          const isSelected = comparableId(selectedEmotion) === comparableId(emotion.id);

          return (
          <button
            key={emotion.id}
            type="button"
            className={`emotion-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectEmotion(emotion.id)}
            title={avatarLabel}
          >
            <div className="emotion-image-wrapper">
              <img
                src={`${API_URL}/api/emotions/${emotion.id}/image`}
                alt={avatarLabel}
                className="emotion-image"
                loading="lazy"
              />
            </div>
            <span className="emotion-name">{avatarLabel}</span>
            <span className="emotion-pose">{emotion.pose}</span>
            {isSelected && <div className="selected-badge" />}
          </button>
          );
        })}
      </div>
    </div>
  );
}
