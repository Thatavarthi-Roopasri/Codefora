import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createFirestore } from '../config/firebase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Emotions folder is at c:\Users\Roopa\Downloads\Codefora-main\codefora_emotions
// Backend is at ...Codefora-main\Codefora-main\backend
// So we go up 3 levels: services -> backend -> Codefora-main -> parent directory
const emotionsDir = path.join(__dirname, '../../frontend/assets/codefora_emotions');

// Get all emotion files
export const getAllEmotions = async () => {
  try {
    const files = fs.readdirSync(emotionsDir);
    const emotions = files
      .filter((file) => file.endsWith('.png'))
      .map((file) => {
        const name = file.replace('.png', '');
        return {
          id: name,
          name: name.replace(/_/g, ' '),
          emoji: name,
          fileName: file,
        };
      });
    return emotions;
  } catch (error) {
    console.error('Error reading emotions:', error);
    return [];
  }
};

// Get emotion file stream
export const getEmotionFile = (emotionId) => {
  const filePath = path.join(emotionsDir, `${emotionId}.png`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.createReadStream(filePath);
};

// Store emotion metadata in Firestore (for analytics or future features)
export const initializeEmotionsInFirestore = async () => {
  try {
    console.log('🔄 Initializing emotions in Firestore...');
    const db = createFirestore();
    if (!db) {
      console.warn('⚠ Firestore database not available. Emotions will not be saved to database.');
      return false;
    }

    const emotionsRef = db.collection('emotions');
    const existing = await emotionsRef.limit(1).get();
    
    if (!existing.empty) {
      console.log('✅ Emotions are already initialized in Firestore.');
      return true;
    }

    const emotions = await getAllEmotions();
    console.log(`📝 Syncing ${emotions.length} emotions to Firestore...`);
    
    for (const emotion of emotions) {
      await emotionsRef.doc(emotion.id).set(emotion, { merge: true });
    }

    console.log('✅ Emotions synchronized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing emotions in Firestore:', error);
    return false;
  }
};
