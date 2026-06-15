import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createFirestore } from '../config/firebase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Emotions folder is at c:\Users\Roopa\Downloads\Codefora-main\codefora_emotions
// Backend is at ...Codefora-main\Codefora-main\backend
// So we go up 3 levels: services -> backend -> Codefora-main -> parent directory
const emotionsDir = path.join(__dirname, '../../frontend/assets/codefora_emotions');
const sidersDir = path.join(__dirname, '../../frontend/assets/emotions_siders');
const loopsDir = path.join(__dirname, '../../frontend/assets/emotions_loops');

// Get all emotion files
export const getAllEmotions = async (catInput = 'general') => {
  try {
    const category = String(catInput || 'general').toLowerCase().trim();
    let targetDir = emotionsDir;
    let prefix = '';

    if (category === 'sider' || category === 'siders') {
      targetDir = sidersDir;
      prefix = 'sider:';
    } else if (category === 'loop' || category === 'loops') {
      targetDir = loopsDir;
      prefix = 'loop:';
    }

    if (!fs.existsSync(targetDir)) return [];

    const files = fs.readdirSync(targetDir);
    const emotions = files
      .filter((file) => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))
      .map((file) => {
        const id = prefix + file;
        const name = file.replace(/\.(png|jpg|jpeg)$/, '').replace(/_/g, ' ');
        return {
          id,
          name: name.startsWith('icon ') ? name : name.charAt(0).toUpperCase() + name.slice(1),
          category,
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
  let targetDir = emotionsDir;
  let fileName = emotionId;

  if (emotionId.startsWith('sider:')) {
    targetDir = sidersDir;
    fileName = emotionId.replace('sider:', '');
  } else if (emotionId.startsWith('loop:')) {
    targetDir = loopsDir;
    fileName = emotionId.replace('loop:', '');
  } else {
    // Legacy support for unprefixed IDs
    fileName = emotionId.includes('.') ? emotionId : `${emotionId}.png`;
  }

  const filePath = path.join(targetDir, fileName);
  if (!fs.existsSync(filePath)) {
    // If not found in specific category, try general as fallback
    const fallbackPath = path.join(emotionsDir, fileName.includes('.') ? fileName : `${fileName}.png`);
    if (fs.existsSync(fallbackPath)) return fs.createReadStream(fallbackPath);
    return null;
  }
  return fs.createReadStream(filePath);
};

// Store emotion metadata in Firestore (for analytics or future features)
export const initializeEmotionsInFirestore = async () => {
  try {
    console.log('🔄 Initializing emotions in Firestore...');
    const db = createFirestore();
    if (!db || db.isMock) {
      console.log('No real Firestore available. Using local emotions.');
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
