import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import '../styles/emotion-picker.css';

export default function EmotionPicker({ selectedEmotion, onSelectEmotion, category = 'general' }) {
  const [emotions, setEmotions] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <div className="emotion-grid">
        {emotions.map((emotion) => (
          <button
            key={emotion.id}
            type="button"
            className={`emotion-item ${selectedEmotion === emotion.id ? 'selected' : ''}`}
            onClick={() => onSelectEmotion(emotion.id)}
            title={emotion.name}
          >
            <div className="emotion-image-wrapper">
              <img
                src={`${API_URL}/api/emotions/${emotion.id}/image`}
                alt={emotion.name}
                className="emotion-image"
                loading="lazy"
              />
            </div>
            {category !== 'sider' && category !== 'loop' && (
              <span className="emotion-name">{emotion.name}</span>
            )}
            {selectedEmotion === emotion.id && <div className="selected-badge" />}
          </button>
        ))}
      </div>
    </div>
  );
}

