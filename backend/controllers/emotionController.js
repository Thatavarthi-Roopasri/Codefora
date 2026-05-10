import { getAllEmotions, getEmotionFile, initializeEmotionsInFirestore } from '../services/emotionService.js';

export const getEmotions = async (req, res) => {
  try {
    const category = (req.query.category || 'general').toString().toLowerCase().trim();
    console.log(`[Emotions] Fetching category: ${category}`);
    const emotions = await getAllEmotions(category);
    res.json(emotions);
  } catch (error) {
    console.error('Error fetching emotions:', error);
    res.status(500).json({ error: 'Failed to fetch emotions' });
  }
};

export const getEmotionImage = async (req, res) => {
  try {
    const { emotionId } = req.params;
    const fileStream = getEmotionFile(emotionId);

    if (!fileStream) {
      return res.status(404).json({ error: 'Emotion not found' });
    }

    res.setHeader('Content-Type', 'image/png');
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error fetching emotion image:', error);
    res.status(500).json({ error: 'Failed to fetch emotion image' });
  }
};

export const initEmotions = async (req, res) => {
  try {
    const success = await initializeEmotionsInFirestore();
    if (success) {
      res.json({ message: 'Emotions initialized in Firestore', success: true });
    } else {
      res.status(500).json({ error: 'Failed to initialize emotions', success: false });
    }
  } catch (error) {
    console.error('Error initializing emotions:', error);
    res.status(500).json({ error: 'Failed to initialize emotions', success: false });
  }
};
