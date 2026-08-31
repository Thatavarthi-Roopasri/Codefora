import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createFirestore } from '../config/firebase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const emotionsDir = path.join(__dirname, '../../frontend/assets/codefora_emotions');
const sidersDir = path.join(__dirname, '../../frontend/assets/emotions_siders');
const loopsDir = path.join(__dirname, '../../frontend/assets/emotions_loops');
const supportedExtensions = ['.webp', '.png', '.jpg', '.jpeg'];

const toDisplayName = (fileName) => fileName
  .replace(/\.(webp|png|jpg|jpeg)$/i, '')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (character) => character.toUpperCase());

const getAvatarDetails = (category, fileName, index) => {
  if (category === 'sider' || category === 'siders') {
    const poseNumber = fileName.match(/\d+/)?.[0] || String(index + 1);
    return { name: 'Sider', pose: `Pose ${poseNumber.padStart(2, '0')}` };
  }

  if (category === 'loop' || category === 'loops') {
    return { name: 'Loop', pose: `Pose ${String(index + 1).padStart(2, '0')}` };
  }

  return { name: toDisplayName(fileName), pose: 'Emotion' };
};

const getContentType = (filePath) => {
  switch (path.extname(filePath).toLowerCase()) {
    case '.webp': return 'image/webp';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    default: return 'image/png';
  }
};

const findEmotionFile = (targetDir, requestedFileName) => {
  const fileName = path.basename(requestedFileName || '');
  const extension = path.extname(fileName).toLowerCase();
  const stem = extension ? fileName.slice(0, -extension.length) : fileName;
  const candidates = [
    path.join(targetDir, `${stem}.webp`),
    path.join(targetDir, fileName),
    ...supportedExtensions.map((candidateExtension) => path.join(targetDir, `${stem}${candidateExtension}`)),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

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

    const files = fs.readdirSync(targetDir)
      .filter((file) => supportedExtensions.includes(path.extname(file).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const emotions = files
      .map((file, index) => {
        const id = prefix + file;
        const { name, pose } = getAvatarDetails(category, file, index);
        return {
          id,
          name,
          pose,
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
export const getEmotionFile = (emotionId = '') => {
  let targetDir = emotionsDir;
  let fileName;

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

  let filePath = findEmotionFile(targetDir, fileName);
  if (!filePath) {
    // If not found in specific category, try general as fallback
    filePath = findEmotionFile(emotionsDir, fileName);
    if (!filePath) return null;
  }

  return {
    contentType: getContentType(filePath),
    stream: fs.createReadStream(filePath),
  };
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
